/* =========================================================
   Patient Insights — Supabase data access.
   Shared by the public site (read-only, published rows) and the
   admin app (full read/write, behind login). Every function here
   fails soft: if Supabase isn't configured yet or a request fails,
   callers get an empty result / thrown error they can catch —
   nothing here should ever crash the page it's used on.
   ========================================================= */
window.PatientInsightsDB = (function(){
  "use strict";

  let client = null;
  function getClient(){
    if(client) return client;
    if(!window.isSupabaseConfigured || !window.isSupabaseConfigured()) return null;
    if(!window.supabase || !window.supabase.createClient) return null;
    client = window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);
    return client;
  }

  // DB row (snake_case) -> the shape stories.js / stories-data.js already use
  function toStoryShape(row){
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      subtitle: row.subtitle,
      intro: row.intro,
      topic: row.topic || "",
      dialogue: row.dialogue || [],
      relateIntro: row.relate_intro,
      relatePoints: row.relate_points || [],
      relateClose: row.relate_close,
      actionPoints: row.action_points || [],
      urgent: row.urgent,
      urgentReviewed: !!row.urgent_reviewed,
      status: row.status,
      consentConfirmed: !!row.consent_confirmed,
      identifiersRemoved: !!row.identifiers_removed,
      privacyReviewed: !!row.privacy_reviewed,
      noIdentifyingDetails: !!row.no_identifying_details,
      medicalReviewed: !!row.medical_reviewed,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      publishedAt: row.published_at,
    };
  }

  // the shape the editor works with -> DB row (snake_case) for insert/update
  function toRow(story){
    const row = {
      slug: story.slug,
      title: story.title || "",
      subtitle: story.subtitle || "",
      intro: story.intro || "",
      topic: story.topic || "",
      dialogue: story.dialogue || [],
      relate_intro: story.relateIntro || "",
      relate_points: story.relatePoints || [],
      relate_close: story.relateClose || "",
      action_points: story.actionPoints || [],
      urgent: story.urgent || "",
      urgent_reviewed: !!story.urgentReviewed,
      consent_confirmed: !!story.consentConfirmed,
      identifiers_removed: !!story.identifiersRemoved,
      privacy_reviewed: !!story.privacyReviewed,
      no_identifying_details: !!story.noIdentifyingDetails,
      medical_reviewed: !!story.medicalReviewed,
      status: story.status || "draft",
    };
    if(story.id) row.id = story.id;
    return row;
  }

  function slugify(title){
    const base = (title || "story")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "story";
    return `${base}-${Math.random().toString(36).slice(2, 7)}`;
  }

  // ---- public, read-only -----------------------------------------
  async function fetchPublished(){
    const c = getClient();
    if(!c) return [];
    try {
      const { data, error } = await c
        .from("patient_insights")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: true });
      if(error || !data) return [];
      return data.map(toStoryShape);
    } catch(e){
      return [];
    }
  }

  // ---- admin, requires an authenticated session -------------------
  async function signIn(email, password){
    const c = getClient();
    if(!c) throw new Error("Supabase isn't configured yet. Add your project URL and anon key to js/supabase-config.js.");
    const { data, error } = await c.auth.signInWithPassword({ email, password });
    if(error) throw error;
    return data.session;
  }

  async function signOut(){
    const c = getClient();
    if(!c) return;
    await c.auth.signOut();
  }

  async function getSession(){
    const c = getClient();
    if(!c) return null;
    const { data } = await c.auth.getSession();
    return data.session;
  }

  function onAuthChange(cb){
    const c = getClient();
    if(!c) return;
    c.auth.onAuthStateChange((_event, session) => cb(session));
  }

  async function listAll(){
    const c = getClient();
    if(!c) throw new Error("Not connected to Supabase.");
    const { data, error } = await c
      .from("patient_insights")
      .select("*")
      .order("updated_at", { ascending: false });
    if(error) throw error;
    return (data || []).map(toStoryShape);
  }

  async function getById(id){
    const c = getClient();
    if(!c) throw new Error("Not connected to Supabase.");
    const { data, error } = await c.from("patient_insights").select("*").eq("id", id).single();
    if(error) throw error;
    return toStoryShape(data);
  }

  async function save(story){
    const c = getClient();
    if(!c) throw new Error("Not connected to Supabase.");
    if(!story.slug) story.slug = slugify(story.title);
    const row = toRow(story);
    const { data, error } = await c.from("patient_insights").upsert(row).select().single();
    if(error) throw error;
    return toStoryShape(data);
  }

  async function setStatus(id, status){
    const c = getClient();
    if(!c) throw new Error("Not connected to Supabase.");
    const { data, error } = await c.from("patient_insights").update({ status }).eq("id", id).select().single();
    if(error) throw error;
    return toStoryShape(data);
  }

  async function duplicate(id){
    const original = await getById(id);
    const copy = Object.assign({}, original);
    delete copy.id;
    copy.title = original.title ? `${original.title} (copy)` : "Untitled (copy)";
    copy.slug = slugify(original.slug || original.title);
    copy.status = "draft";
    delete copy.publishedAt;
    return save(copy);
  }

  async function remove(id){
    const c = getClient();
    if(!c) throw new Error("Not connected to Supabase.");
    const { error } = await c.from("patient_insights").delete().eq("id", id);
    if(error) throw error;
  }

  return {
    fetchPublished, signIn, signOut, getSession, onAuthChange,
    listAll, getById, save, setStatus, duplicate, remove, slugify,
  };
})();
