(function(){
  "use strict";
  const toggle=document.getElementById("assistantToggle"),panel=document.getElementById("assistantPanel"),close=document.getElementById("assistantClose"),form=document.getElementById("assistantForm"),input=document.getElementById("assistantInput"),messages=document.getElementById("assistantMessages"),suggestions=document.getElementById("assistantSuggestions");
  if(!toggle||!panel) return;
  const add=(text,who)=>{
    const el=document.createElement("div"); el.className="assistant-msg "+who; el.textContent=text; messages.appendChild(el); messages.scrollTop=messages.scrollHeight;
  };
  const localAnswer=(q)=>{
    const x=q.toLowerCase();
    if(/book|appointment|consult/.test(x)) return "You can request an online consultation from the Consult section, or call 7406886226 for clinic information.";
    if(/where|location|hospital|address|mandya/.test(x)) return "Dr. Amogh is listed at Arogya Hospital, Mandya. Use the Visit section for the map and directions.";
    if(/treat|care|condition|disease|special/.test(x)) return "The Areas of Care section lists common General Medicine concerns such as fever and infections, headaches and dizziness, diabetes, blood pressure, digestive concerns, respiratory problems and chronic health conditions. It is not a complete list.";
    if(/about|qualification|degree|experience/.test(x)) return "Dr. Amogh G is listed as MBBS, MD General Medicine, with 10+ years of experience, at Arogya Hospital, Mandya.";
    if(/story|insight|article/.test(x)) return "Patient Stories and Insights contain patient-friendly information shared through the website. Published patient stories are reviewed before publication.";
    if(/symptom|diagnos|medicine|tablet|pain|fever|cough|dizz/.test(x)) return "I can explain information published on this website, but I cannot diagnose you or recommend a personal treatment. For sudden or severe symptoms, seek appropriate medical care.";
    return "I can help with Dr. Amogh's qualifications, common areas of care, patient stories, consultations, contact details and the hospital location.";
  };
  const answer=async(q)=>{
    add(q,"user");
    input.value="";
    add(localAnswer(q),"bot");
  };
  toggle.addEventListener("click",()=>{const open=panel.hidden; panel.hidden=!open; toggle.setAttribute("aria-expanded",String(open)); if(open) input.focus();});
  close.addEventListener("click",()=>{panel.hidden=true;toggle.setAttribute("aria-expanded","false");});
  form.addEventListener("submit",e=>{e.preventDefault();const q=input.value.trim();if(q)answer(q);});
  suggestions.addEventListener("click",e=>{const b=e.target.closest("button");if(b)answer(b.textContent);});
})();