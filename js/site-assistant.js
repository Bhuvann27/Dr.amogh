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

  const scrollToSection = (id) => {
    const target = document.getElementById(id);
    if(!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    closeAssistant();
  };

  const addAction = (label, target) => {
    const wrap = document.createElement("div");
    wrap.className = "assistant-msg bot assistant-action-wrap";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "assistant-action";
    button.textContent = label;
    button.addEventListener("click", () => scrollToSection(target));
    wrap.appendChild(button);
    messages.appendChild(wrap);
  };

  const localAnswer = (q) => {
    const x = q.toLowerCase();
    if(/book|appointment|consult/.test(x)){
      return "You can book an online consultation from the Consultation section. Choose a date and then an available time before entering your details.";
    }
    if(/where|location|hospital|address|mandya|timing|time|open/.test(x)){
      return "Dr. Amogh is listed at Pragati Hospital, General Hospital Road, Ashok Nagar, Mandya. The Visit section has the hospital address and directions.";
    }
    if(/treat|care|condition|disease|special|diabet|sugar|pressure|liver|digest|acidity|headache|dizz|fever|infection|cough|breath/.test(x)){
      return "The website lists General Medicine concerns including infections, headaches and dizziness, diabetes and blood pressure, digestive and liver concerns, respiratory problems, and chronic health conditions. It is not a complete list.";
    }
    if(/about|qualification|degree|experience|doctor/.test(x)){
      return "Dr. Amogh G is listed as MBBS, MD General Medicine, with 12+ years of experience, at Pragati Hospital, Mandya.";
    }
    if(/story|stories|insight|article/.test(x)){
      return "You can read the patient stories and health insights directly on the website. The stories are shared anonymously.";
    }
    if(/symptom|diagnos|medicine|tablet|pain|fever|cough|dizz/.test(x)){
      return "I can explain information published on this website, but I can't diagnose you or recommend a personal treatment. If symptoms are sudden or severe, seek immediate medical attention.";
    }
    return "I can help with Dr. Amogh's qualifications, areas of care, patient stories, online consultations, clinic information and general website questions.";
  };

  const actionForQuestion = (q) => {
    const x = q.toLowerCase();
    if(/book|appointment|consult/.test(x)) return ["Go to online consultation", "consult"];
    if(/where|location|hospital|address|mandya|timing|time|open/.test(x)) return ["Open clinic information", "visit"];
    if(/treat|care|condition|disease|special|diabet|sugar|pressure|liver|digest|acidity|headache|dizz|fever|infection|cough|breath/.test(x)) return ["See areas of care", "care"];
    if(/about|qualification|degree|experience|doctor/.test(x)) return ["Learn about Dr. Amogh", "about"];
    if(/story|stories|insight|article/.test(x)) return ["Read patient stories", "stories"];
    return null;
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

    const action = actionForQuestion(q);
    if(action) addAction(action[0], action[1]);
    messages.scrollTop = messages.scrollHeight;
  }

  let closeTimer = null;

  function openAssistant(){
    clearTimeout(closeTimer);
    panel.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    requestAnimationFrame(() => {
      document.getElementById("siteAssistant")?.classList.add("is-open", "chat-open");
      input.focus();
    });
  }

  function closeAssistant(){
    const root = document.getElementById("siteAssistant");
    root?.classList.remove("is-open", "chat-open");
    toggle.setAttribute("aria-expanded", "false");
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => { panel.hidden = true; }, 240);
  }

  toggle.addEventListener("click", () => {
    if(panel.hidden) openAssistant();
    else closeAssistant();
  });

  close.addEventListener("click", closeAssistant);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if(q) answer(q);
  });

  if(suggestions){
    suggestions.addEventListener("click", (e) => {
      const button = e.target.closest("button");
      if(!button) return;
      const action = button.dataset.action;
      if(action === "question"){
        input.focus();
        return;
      }
      const questionMap = {
        consult: "How do I book an online consultation?",
        care: "What does Dr. Amogh treat?",
        visit: "Where is the hospital and what are the clinic details?",
        stories: "Show me the patient stories and insights.",
        about: "Tell me about Dr. Amogh."
      };
      if(action && questionMap[action]) answer(questionMap[action]);
    });
  }
})();