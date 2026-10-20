/* =========================================================
   Shared auth guard for every admin page except login.html.
   Include this after supabase-config.js + patient-insights-db.js.
   ========================================================= */
(function(){
  "use strict";
  if(!document.querySelector('link[data-admin-restore]')){
    const link=document.createElement("link");link.rel="stylesheet";link.href="css/admin-restore.css";link.dataset.adminRestore="";document.head.appendChild(link);
  }
  /* Final-review safety rule: once the doctor has approved the exact version,
     any subsequent content change must force that approval to be checked again. */
  document.addEventListener("input",function(e){
    if(!e.target.closest("#app"))return;
    const final=document.getElementById("chkFinal");
    if(final&&e.target!==final){final.checked=false;const btn=document.getElementById("publishBtn");if(btn)btn.disabled=true;}
  },true);
  document.addEventListener("change",function(e){
    if(!e.target.closest("#app"))return;
    if(e.target.id==="chkFinal")return;
    const final=document.getElementById("chkFinal");
    if(final){final.checked=false;const btn=document.getElementById("publishBtn");if(btn)btn.disabled=true;}
  },true);
})();

window.AdminAuth=(function(){
  "use strict";
  async function requireSession(){
    if(!window.isSupabaseConfigured||!window.isSupabaseConfigured()){showSetupNotice();throw new Error("not-configured");}
    const session=await window.PatientInsightsDB.getSession();
    if(!session){window.location.href="login.html";throw new Error("not-authenticated");}
    return session;
  }
  function showSetupNotice(){document.body.innerHTML=`<div style="max-width:560px;margin:80px auto;padding:0 24px;font-family:Inter,sans-serif;"><h1 style="font-size:1.5rem;margin-bottom:12px;">Not connected to Supabase yet</h1><p style="color:#6B6259;line-height:1.6;">This admin needs a Supabase project to store patient insights. Open <code>js/supabase-config.js</code> and add your project URL and anon key — the file has step-by-step instructions at the top. Then reload this page.</p></div>`;}
  async function logout(){await window.PatientInsightsDB.signOut();window.location.href="login.html";}
  return {requireSession,logout,showSetupNotice};
})();
