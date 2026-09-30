/* =========================================================
   Supabase connection config — already wired up to the live
   "dr-amogh-website" Supabase project (ap-south-1).

   The schema (supabase/schema.sql) has been applied and the two
   existing patient stories are seeded and published.

   One thing still needed: create Dr. Amogh's admin login —
   Supabase dashboard -> Authentication -> Users -> Add user
   (email + password). That's the only account this site needs.
   Also turn OFF "Enable email signups" under Authentication ->
   Providers so no one else can self-register.

   The anon key below is safe to expose in frontend code by design —
   it can only do what the Row Level Security policies in
   supabase/schema.sql allow. Never put a service_role key here.
   ========================================================= */
window.SUPABASE_CONFIG = {
  url: "https://fihukvazoelknudqfnvc.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpaHVrdmF6b2Vsa251ZHFmbnZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0NTg3NjAsImV4cCI6MjEwNjAzNDc2MH0.H9CszCRLSACAScxnONYdnPaF3E06DMnRzvmGFci8vlM",
};

window.isSupabaseConfigured = function(){
  const c = window.SUPABASE_CONFIG;
  return !!(c && c.url && c.anonKey && !c.url.startsWith("YOUR_") && !c.anonKey.startsWith("YOUR_"));
};
