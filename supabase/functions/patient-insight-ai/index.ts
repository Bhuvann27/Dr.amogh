import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

const MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash'
const API_KEY = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_API_KEY') || ''

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: cors })
}

function promptFor(mode: string, notes: string, conversation: unknown[], questionCount = 0, regenerate = false) {
  const context = JSON.stringify({ notes, conversation, questionCount, regenerate })
  if (mode === 'analyze') {
    return `You are the clinical-story assistant for a General Medicine doctor's private Patient Insight editor.

Your job is NOT to diagnose the patient and NOT to write the public story yet. First understand the doctor's case notes and decide whether there is enough information to create a compelling, accurate, de-identified patient narrative.

The doctor may speak naturally for several minutes. Extract only facts explicitly supplied. Never invent a symptom, investigation, diagnosis, treatment, result, outcome, emotion, quote, or demographic detail.

The final public story should help a reader recognise a similar lived experience. It should feel like a doctor thoughtfully recounting a clinical encounter, not like a disease encyclopedia or an advertisement.

Ask a follow-up question ONLY when a missing detail is genuinely useful for the story. Ask ONE question at a time. Questions must be concrete and directly answerable from the doctor's memory, for example: duration of each episode, progression/frequency, important associated symptom, previous investigation result, what had already been tried, what made the case stand out, or what the doctor noticed. Never ask vague prompts such as 'Can you tell me more?' Do not ask for identifying information.

Do not require a full medical history. If enough narrative detail exists, return ready. Do not ask more than 4 follow-up questions total. If a detail is unknown or the doctor skips it, work around it.

Return ONLY valid JSON with this exact shape:
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

If status is ready, question and question_reason must be empty. If a field is unknown, leave it empty. Never turn an inferred diagnosis into a fact.

DOCTOR INPUT:
${context}`
  }

  return `You are writing a patient-facing Patient Insight for a General Medicine doctor's website from private doctor notes.

Create a warm, specific, clinically responsible narrative that makes a reader think, 'Someone I know has experienced something like this.' Do not make it a generic explanation of a disease and do not turn it into an advertisement for what the doctor can treat.

Use only information explicitly present in the doctor's notes and conversation. Never invent facts, quotes, test results, diagnoses, medicines, improvement, recovery, emotions, family details, or outcomes. If the doctor did not provide an outcome, do not manufacture a happy ending.

The story should feel like an HPI translated into human language: who came in, what they noticed first, how it changed over time, what it felt like or how it affected ordinary life, what they had already tried or investigated, why they sought further help, and what the doctor noticed or understood. Preserve uncertainty when the doctor expressed uncertainty.

You may turn factual patient-reported information into natural narrative language, but do not use quotation marks for words the doctor did not explicitly report as quotations. The dialogue section should be 'conversation-style' questions and answers, but answers are paraphrased from supplied facts, not invented verbatim patient quotes.

Avoid disease-list language, exaggerated claims, guarantees, 'success story' language, and phrases like 'finally cured' unless the doctor explicitly supplied that outcome. Avoid identifying details. Do not include the patient's exact age unless it is supplied and genuinely useful to the story; prefer broad age wording when possible.

Return ONLY valid JSON:
{
  "title": "short human title, preferably in the patient's lived-language",
  "subtitle": "short contextual label",
  "topic": "general topic, not a diagnosis unless explicitly supplied",
  "intro": "1-3 sentence opening",
  "dialogue": [{"q":"natural question","a":"accurate paraphrase"}],
  "doctorPerspective": "short paragraph describing what stood out to the doctor, using only supplied facts",
  "relateIntro": "optional short bridge",
  "relatePoints": ["2-4 relatable experiences stated without diagnosing the reader"],
  "relateClose": "optional closing line",
  "actionPoints": ["optional general next steps only if supported by the doctor's notes"],
  "urgent": "optional urgent-care guidance only if the doctor explicitly supplied it",
  "needsDoctorReview": ["specific facts or wording the doctor should verify"]
}

Keep the story concise enough to read comfortably on a phone. Usually 4-7 dialogue exchanges are enough. Prefer concrete details and progression over generic medical education.

DOCTOR INPUT:
${context}`
}

async function callGemini(prompt: string) {
  if (!API_KEY) throw new Error('Gemini API key is not configured for Patient Insight AI.')
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(API_KEY)}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.25, responseMimeType: 'application/json' } }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error('The AI service could not complete this request. Please try again.')
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || ''
  if (!text) throw new Error('The AI service returned an empty response.')
  try { return JSON.parse(text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()) }
  catch { throw new Error('The AI returned an invalid draft. Please try again.') }
}

export default {
  async fetch(req: Request) {
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
      console.error(error)
      return json({ error: error instanceof Error ? error.message : 'Patient Insight AI failed.' }, 500)
    }
  },
}
