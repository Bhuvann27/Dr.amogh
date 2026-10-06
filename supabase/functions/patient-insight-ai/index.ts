import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

const PRIMARY_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash'
const API_KEY = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_API_KEY') || ''

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: cors })
}

function promptFor(mode: string, notes: string, conversation: unknown[], questionCount = 0, regenerate = false) {
  const context = JSON.stringify({ notes, conversation, questionCount, regenerate })
  if (mode === 'analyze') {
    return `You are the clinical-story assistant for a General Medicine doctor's private Patient Insight editor.

Do NOT diagnose the patient and do NOT write the public story yet. Understand the doctor's case notes and decide whether there is enough information to create a compelling, accurate, de-identified patient narrative.

Extract only facts explicitly supplied. Never invent symptoms, investigations, diagnoses, treatment, results, outcomes, emotions, quotes, or demographics. The final story should help a reader recognise a similar lived experience and should feel like a doctor recounting a clinical encounter, not a disease encyclopedia or advertisement.

Ask a follow-up question ONLY when a missing detail is genuinely useful for the story. Ask ONE concrete question at a time. Good questions include duration, progression/frequency, important associated symptoms, previous investigations, what was tried, what made the case stand out, or what the doctor noticed. Never ask vague prompts such as 'Can you tell me more?' Never ask for identifying information. Do not require a full medical history. If enough narrative detail exists, return ready. Ask no more than 4 follow-up questions total.

Return ONLY valid JSON:
{
  "status": "needs_more" | "ready",
  "question": "",
  "question_reason": "",
  "known": {
    "patient_context": "",
    "main_concern": "",
    "timeline": "",
    "progression_pattern": "",
    "associated_features": "",
    "previous_evaluation": "",
    "previous_treatment": "",
    "impact_on_life": "",
    "doctor_observation": ""
  }
}

If ready, question and question_reason must be empty. Unknown fields stay empty. Never turn an inferred diagnosis into a fact.

DOCTOR INPUT:
${context}`
  }

  return `You are writing a patient-facing Patient Insight for a General Medicine doctor's website from private doctor notes.

Create a warm, specific, clinically responsible narrative that makes a reader think, 'Someone I know has experienced something like this.' Do not make it a generic disease explanation or an advertisement for what the doctor can treat.

Use only information explicitly present in the doctor's notes and conversation. Never invent facts, quotes, test results, diagnoses, medicines, improvement, recovery, emotions, family details, or outcomes. If no outcome was supplied, do not manufacture one.

The story should feel like an HPI translated into human language: who came in, what they noticed first, how it changed, what it felt like or how it affected ordinary life, what had already been tried or investigated, why they sought help, and what the doctor noticed. Preserve uncertainty.

The dialogue is conversation-style, but answers are paraphrases of supplied facts, not invented verbatim patient quotes. Avoid disease-list language, exaggerated claims, guarantees, or 'success story' language. Avoid identifying details.

Return ONLY valid JSON:
{
  "title": "short human title",
  "subtitle": "short contextual label",
  "topic": "general topic, not a diagnosis unless explicitly supplied",
  "intro": "1-3 sentence opening",
  "dialogue": [{"q":"natural question","a":"accurate paraphrase"}],
  "doctorPerspective": "short paragraph using only supplied facts",
  "relateIntro": "optional short bridge",
  "relatePoints": ["2-4 relatable experiences without diagnosing the reader"],
  "relateClose": "optional closing line",
  "actionPoints": ["optional general next steps only if supported by notes"],
  "urgent": "optional urgent-care guidance only if explicitly supplied",
  "needsDoctorReview": ["specific facts or wording the doctor should verify"]
}

Keep it concise for a phone. Usually 4-7 dialogue exchanges are enough. Prefer concrete progression over generic medical education.

DOCTOR INPUT:
${context}`
}

async function callGemini(prompt: string) {
  if (!API_KEY) throw new Error('Patient Insight AI is not configured: the Gemini API key is missing.')

  const models = [...new Set([PRIMARY_MODEL, 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'])]
  let lastProviderError = ''

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': API_KEY,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.25, responseMimeType: 'application/json' },
      }),
    })

    const data = await response.json().catch(() => ({}))
    if (response.ok) {
      const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || ''
      if (!text) throw new Error('The AI service returned an empty response.')
      try {
        return JSON.parse(text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim())
      } catch {
        throw new Error('The AI returned an invalid structured response. Please try again.')
      }
    }

    const providerMessage = data?.error?.message || `HTTP ${response.status}`
    console.error(`Gemini ${model} failed`, response.status, providerMessage)
    lastProviderError = providerMessage
    if (response.status !== 404) break
  }

  console.error('Patient Insight Gemini failure:', lastProviderError)
  if (/api key|api_key|permission|unauthenticated|invalid/i.test(lastProviderError)) {
    throw new Error('Patient Insight AI could not authenticate with Gemini. Check the Gemini API key in Supabase.')
  }
  if (/quota|rate limit|resource exhausted|429/i.test(lastProviderError)) {
    throw new Error('Patient Insight AI is temporarily rate-limited. Please try again in a little while.')
  }
  throw new Error('The AI service could not complete this request. Please try again.')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)

  try {
    const body = await req.json()
    const mode = body?.mode === 'draft' ? 'draft' : 'analyze'
    const notes = String(body?.notes || '').trim()
    if (notes.length < 20) return json({ error: 'Please provide a little more case information.' }, 400)
    if (notes.length > 30000) return json({ error: 'The case notes are too long. Please keep them below 30,000 characters.' }, 400)

    const conversation = Array.isArray(body?.conversation) ? body.conversation.slice(-12) : []
    const result = await callGemini(promptFor(mode, notes, conversation, Number(body?.questionCount || 0), !!body?.regenerate))
    return json(result)
  } catch (error) {
    console.error('Patient Insight AI error:', error)
    return json({ error: error instanceof Error ? error.message : 'Patient Insight AI failed.' }, 500)
  }
})
