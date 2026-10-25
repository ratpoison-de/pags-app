// Zugangsdaten des Supabase-Projekts (Dashboard → Project Settings → API).
// Der "anon public"-Schlüssel darf öffentlich sein: Die Tabelle ist per Row Level Security geschützt,
// jede angemeldete Person kommt nur an ihre eigenen Daten.
// Projekt: pags-lernplaner (EU, Frankfurt), Tabelle public.pags_alltag. Leere Felder = nur lokal im Browser.
window.PAGS_CONFIG = {
  supabaseUrl: 'https://nvobliagvkfissdtfmts.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52b2JsaWFndmtmaXNzZHRmbXRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4OTM5NjMsImV4cCI6MjEwODQ2OTk2M30.uaHZlXoiycEOXYaCy9YmxBdcvwC-rZ1GDBjFuKTIsTU',
  region: 'EU, Frankfurt'
};
