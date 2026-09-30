(function(){
  "use strict";

  const toggle = document.getElementById("assistantToggle");
  const panel = document.getElementById("assistantPanel");
  const close = document.getElementById("assistantClose");
  const form = document.getElementById("assistantForm");
  const input = document.getElementById("assistantInput");
  const messages = document.getElementById("assistantMessages");
  const suggestions = document.getElementById("assistantSuggestions");

  if(!toggle || !panel || !form || !input || !messages) return;

  const endpoint = window.SUPABASE_CONFIG
    ? window.SUPABASE_CONFIG.url + "/functions/v1/site-assistant"
    : "";

  const history = [];

  const add = (text, who) => {
    const el = document.createElement("div");
    el.className = "assistant-msg " + who;
    el.textContent = text;
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
    return el;
  };

  const localAnswer = (q) => {
    const x = q.toLowerCase();
    if(/book|appointment|consult/.test(x)){
      return "You can use the Online Consultation section or call 7406886226 for clinic information.";
    }
    if(/where|location|hospital|address|mandya/.test(x)){
      return "The website lists Dr. Amogh at Arogya Hospital, Mandya. Use the Visit section for directions.";
    }
    if(/treat|care|condition|disease|special/.test(x)){
      return "The website lists common General Medicine concerns including infections, headaches and dizziness, diabetes, blood pressure, digestive and liver concerns, respiratory problems and chronic health conditions. It also notes that this is not a complete list.";
    }
    if(/about|qualification|degree|experience/.test(x)){
      return "The website currently lists Dr. Amogh G as MBBS, MD General Medicine, with 10+ years of experience, at Arogya Hospital, Mandya.";
    }
    if(/story|insight|article/.test(x)){
      return "Patient Stories and Insights contain patient-friendly information published through the website.";
    }
    if(/symptom|diagnos|medicine|tablet|pain|fever|cough|dizz/.test(x)){
      return "I can explain information published on this website, but I can't diagnose you or recommend a personal treatment. If symptoms are sudden or severe, seek immediate medical attention.";
    }
    return "I can help with Dr. Amogh's qualifications, areas of care, patient stories, consultations, contact details and the hospital information.";
  };

  async function answer(q){
    add(q, "user");
    input.value = "";

    const loading = add("Thinking…", "bot");
    loading.setAttribute("aria-live", "polite");

    try {
      const previousHistory = history.slice(-6);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q, history: previousHistory }),
      });

      const data = await response.json().catch(() => ({}));
      if(!response.ok) throw new Error(data.error || "Assistant unavailable.");

      loading.textContent = data.answer || localAnswer(q);
      history.push({ role: "user", text: q });
      history.push({ role: "model", text: loading.textContent });
    } catch(e){
      loading.textContent = localAnswer(q);
    }

    messages.scrollTop = messages.scrollHeight;
  }

  toggle.addEventListener("click", () => {
    const open = panel.hidden;
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    if(open) input.focus();
  });

  close.addEventListener("click", () => {
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if(q) answer(q);
  });

  if(suggestions){
    suggestions.addEventListener("click", (e) => {
      const button = e.target.closest("button");
      if(button) answer(button.textContent.trim());
    });
  }
})();