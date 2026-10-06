(function(){
  "use strict";

  const toggle = document.getElementById("assistantToggle");
  const panel = document.getElementById("assistantPanel");
  const close = document.getElementById("assistantClose");
  const form = document.getElementById("assistantForm");
  const input = document.getElementById("assistantInput");
  const messages = document.getElementById("assistantMessages");
  const suggestions = document.getElementById("assistantSuggestions");
  const root = document.getElementById("siteAssistant");

  if(!toggle || !panel || !form || !input || !messages) return;

  /* Keep the assistant self-contained so this refinement does not disturb the
     site's existing mobile layout, hero, booking flow, or other sections. */
  const style = document.createElement("style");
  style.textContent = `
    .site-assistant .assistant-panel{
      position:fixed!important;
      display:flex!important;
      flex-direction:column!important;
      right:max(12px,env(safe-area-inset-right,0px))!important;
      bottom:auto!important;
      top:calc(env(safe-area-inset-top,0px) + 78px)!important;
      width:min(400px,calc(100vw - 24px))!important;
      height:min(680px,calc(100dvh - 100px))!important;
      max-height:calc(100dvh - 100px)!important;
      overflow:hidden!important;
      border-radius:20px!important;
      z-index:10000!important;
      transform:none!important;
    }
    .site-assistant .assistant-head{
      flex:0 0 auto!important;
      min-height:62px!important;
    }
    .site-assistant .assistant-messages{
      flex:1 1 auto!important;
      min-height:0!important;
      overflow-y:auto!important;
      overflow-x:hidden!important;
      overscroll-behavior:contain;
      -webkit-overflow-scrolling:touch;
      padding:18px!important;
      scroll-behavior:smooth;
    }
    .site-assistant .assistant-suggestions{
      flex:0 0 auto!important;
      display:flex!important;
      flex-wrap:nowrap!important;
      gap:8px!important;
      max-width:100%!important;
      overflow-x:auto!important;
      overflow-y:hidden!important;
      padding:8px 14px 10px!important;
      margin:0!important;
      scrollbar-width:none;
      -webkit-overflow-scrolling:touch;
      border-top:1px solid rgba(23,19,15,.08);
    }
    .site-assistant .assistant-suggestions::-webkit-scrollbar{display:none;}
    .site-assistant .assistant-suggestions button{
      flex:0 0 auto!important;
      white-space:nowrap!important;
      min-height:38px!important;
      padding:8px 13px!important;
      border-radius:999px!important;
      font-size:.78rem!important;
      line-height:1.15!important;
    }
    .site-assistant.has-conversation .assistant-suggestions{
      display:none!important;
    }
    .site-assistant .assistant-form{
      flex:0 0 auto!important;
      min-width:0!important;
    }
    .site-assistant .assistant-form input{
      min-width:0!important;
    }
    .site-assistant .assistant-action-wrap{
      background:transparent!important;
      padding:0!important;
      margin:8px 0 2px!important;
      border:0!important;
    }
    .site-assistant .assistant-action{
      max-width:100%;
      padding:9px 13px;
      border:1px solid rgba(242,84,12,.3);
      border-radius:999px;
      background:rgba(242,84,12,.06);
      color:var(--orange-deep);
      font:inherit;
      font-size:.78rem;
      font-weight:700;
      line-height:1.2;
      cursor:pointer;
    }
    @media(max-width:640px){
      .site-assistant{
        position:fixed!important;
        right:0!important;
        bottom:0!important;
        width:100%!important;
        height:0!important;
        z-index:10000!important;
        pointer-events:none!important;
      }
      .site-assistant .assistant-toggle{
        position:fixed!important;
        right:20px!important;
        bottom:calc(env(safe-area-inset-bottom,0px) + 132px)!important;
        width:56px!important;
        height:56px!important;
        margin:0!important;
        z-index:10002!important;
        pointer-events:auto!important;
      }
      .site-assistant .assistant-panel{
        position:fixed!important;
        left:14px!important;
        right:14px!important;
        top:auto!important;
        bottom:calc(env(safe-area-inset-bottom,0px) + 204px)!important;
        width:auto!important;
        height:min(620px,60dvh)!important;
        max-height:calc(100dvh - 260px)!important;
        min-height:430px!important;
        border-radius:22px!important;
        transform:none!important;
        z-index:10001!important;
        margin:0!important;
      }
      .site-assistant .assistant-head{
        min-height:60px!important;
        padding:14px 18px!important;
      }
      .site-assistant .assistant-messages{
        padding:14px!important;
      }
      .site-assistant .assistant-form{
        padding-bottom:max(10px,env(safe-area-inset-bottom,0px))!important;
      }
    }
  `;
  document.head.appendChild(style);

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
      return "You can book an online consultation from the Consultation section. It is listed as a 15-minute consultation for ₹1,200. Choose a date and available time before entering your details.";
    }
    if(/where|location|hospital|address|mandya|timing|time|open/.test(x)){
      return "Dr. Amogh G is listed at Pragati Hospital, Mandya. The Visit section contains the hospital information and directions shown on this website.";
    }
    if(/stomach|abdominal|abdomen|belly|gastric|acidity|indigestion|constipat|diarrh|loose motion|vomit/.test(x)){
      return "Stomach or abdominal pain can have several causes, including indigestion or reflux, constipation, infection, or other gastrointestinal problems. The cause cannot be determined safely from a chat alone, so persistent or recurring pain is worth discussing with a doctor. Seek urgent medical care if the pain is severe or worsening, or if there is repeated vomiting, blood or black stool, fainting, marked abdominal swelling, or high fever.";
    }
    if(/headache|migraine|dizz|gidd|weak|fatigue|tired/.test(x)){
      return "Headache, dizziness and weakness can have many causes, from dehydration or an acute illness to migraine, anaemia, blood-pressure or metabolic problems. The website lists these among the concerns assessed in General Medicine. If symptoms are sudden, severe, associated with fainting, confusion, weakness on one side, chest pain or difficulty breathing, seek urgent medical care.";
    }
    if(/fever|infection|cold|flu|cough|breath|breathing/.test(x)){
      return "Fever, cough and breathing symptoms can occur with infections and several other conditions. The website includes fever and infections and respiratory concerns among its areas of care. Persistent or worsening symptoms should be assessed clinically, and sudden severe breathing difficulty or other severe symptoms need urgent medical attention.";
    }
    if(/treat|care|condition|disease|special|diabet|sugar|pressure|blood pressure|liver|digest|respiratory/.test(x)){
      return "The website lists General Medicine care for fever and infections; headache, dizziness and weakness; blood sugar, blood pressure and metabolic health; digestive and liver concerns; and respiratory and other concerns. Examples include diabetes, hypertension, acidity or reflux, diarrhoeal illnesses, fatty liver disease, asthma and COPD. This is not a complete list.";
    }
    if(/about|qualification|degree|experience|doctor/.test(x)){
      return "Dr. Amogh G is listed as MBBS, MD General Medicine, with 12+ years of clinical experience at Pragati Hospital, Mandya.";
    }
    if(/story|stories|insight|article/.test(x)){
      return "The Patient Stories section shares anonymous patient experiences, and the Insights section provides health information. You can open the stories directly from the website and read them at your own pace.";
    }
    if(/symptom|diagnos|medicine|tablet|drug|dose|treatment|pain/.test(x)){
      return "I can give general health information and explain what the website covers, but I cannot diagnose you or choose a personal medicine or dose from a chat. Tell me the symptom, how long it has been happening, and any important associated symptoms, and I can explain the general possibilities and warning signs.";
    }
    return "I can help with Dr. Amogh's qualifications, areas of care, consultations, hospital information, patient stories, or general health information. Ask me a specific question and I’ll answer that question directly.";
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
    root?.classList.add("has-conversation");
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
      root?.classList.add("is-open", "chat-open");
      input.focus();
      messages.scrollTop = messages.scrollHeight;
    });
  }

  function closeAssistant(){
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