// Zugangsdaten des Supabase-Projekts (Dashboard → Project Settings → API).
// Der "anon public"-Schlüssel darf öffentlich sein: Die Tabelle ist per Row Level Security geschützt,
// jede angemeldete Person kommt nur an ihre eigenen Daten.
// Solange die Felder leer sind, speichert die App nur lokal im Browser.
window.PAGS_CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  region: 'EU, Frankfurt'
};
