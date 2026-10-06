/* =========================================================
   Shared auth guard for every admin page except login.html.
   Include this after supabase-config.js + patient-insights-db.js.
   ========================================================= */
(function(){
  "use strict";
  if(!document.querySelector('link[data-admin-restore]')){
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/admin-restore.css";
    link.dataset.adminRestore = "";
    document.head.appendChild(link);
  }
})();

window.AdminAuth = (function(){
  "use strict";

  // Redirects to login unless a session already exists. Resolves with
  // the session once confirmed, so pages can await it before loading data.
  async function requireSession(){
    if(!window.isSupabaseConfigured || !window.isSupabaseConfigured()){
      showSetupNotice();
      throw new Error("not-configured");
    }
    const session = await window.PatientInsightsDB.getSession();
    if(!session){
      window.location.href = "login.html";
      throw new Error("not-authenticated");
    }
    return session;
  }

  function showSetupNotice(){
    document.body.innerHTML = `
      <div style="max-width:560px;margin:80px auto;padding:0 24px;font-family:Inter,sans-serif;">
        <h1 style="font-size:1.5rem;margin-bottom:12px;">Not connected to Supabase yet</h1>
        <p style="color:#6B6259;line-height:1.6;">
          This admin needs a Supabase project to store patient insights. Open
          <code>js/supabase-config.js</code> and add your project URL and anon key —
          the file has step-by-step instructions at the top. Then reload this page.
        </p>
      </div>`;
  }

  async function logout(){
    await window.PatientInsightsDB.signOut();
    window.location.href = "login.html";
  }

  return { requireSession, logout, showSetupNotice };
})();
