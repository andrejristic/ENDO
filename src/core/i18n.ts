/** Bilingual UI strings (Q: SR/EN toggle). Everything in the GUI is spoken in one
 *  language or the other — never mixed. Default: Serbian. */
export type Lang = 'sr' | 'en';

type Dict = Record<string, { sr: string; en: string }>;

export const STRINGS: Dict = {
  app_title:        { sr: 'PSE IDE', en: 'PSE IDE' },
  menu_file:        { sr: 'Fajl', en: 'File' },
  menu_view:        { sr: 'Prikaz', en: 'View' },
  menu_terminal:    { sr: 'Terminal', en: 'Terminal' },
  menu_extensions:  { sr: 'Ekstenzije', en: 'Extensions' },
  menu_settings:    { sr: 'Podešavanja', en: 'Settings' },
  toggle_terminal:  { sr: 'Terminal', en: 'Terminal' },
  panel_chat:       { sr: 'Endo', en: 'Endo' },
  panel_theta:      { sr: 'Theta', en: 'Theta' },
  panel_memory:     { sr: 'Memorija projekta', en: 'Project memory' },
  lang_toggle:      { sr: 'SR / EN', en: 'SR / EN' },
  provenance_pse:   { sr: 'PSE-vođeno', en: 'PSE-governed' },
  provenance_third: { sr: 'treća strana (skenirana, ne vođena)', en: 'third-party (screened, not governed)' },
  gate_title:       { sr: 'Potrebna potvrda', en: 'Approval needed' },
  gate_approve:     { sr: 'Odobri', en: 'Approve' },
  gate_reject:      { sr: 'Odbij', en: 'Reject' },
  gate_edit:        { sr: 'Uredi', en: 'Edit' },
  gate_always:      { sr: 'Uvek dozvoli u ovom repou', en: 'Always allow in this repo' },
  theta_ok:         { sr: 'Sve je u redu', en: 'All good' },
  theta_bad:        { sr: 'Theta je odlutala — predlozi za povratak:', en: 'Theta has drifted — suggestions to recover:' },
  scan_install:     { sr: 'Instaliraj svejedno', en: 'Install anyway' },
  scan_cancel:      { sr: 'Otkaži', en: 'Cancel' },
  scan_details:     { sr: 'Detalji', en: 'Details' },
  scan_receives:    { sr: 'Ko prima tvoje podatke', en: 'Who receives your data' },
  scan_cansee:      { sr: 'Može da vidi', en: 'Can see' },
  scan_cando:       { sr: 'Može da uradi', en: 'Can do' },
  scan_joke:        { sr: 'Ako ti se komp raspadne — nije do nas. 🙂', en: 'If your machine falls apart — not on us. 🙂' },
  memory_confirm:   { sr: 'Zapamtiti ovo trajno o projektu?', en: 'Remember this permanently about the project?' },
  yes:              { sr: 'Da', en: 'Yes' },
  no:               { sr: 'Ne', en: 'No' },
  inj_alert:        { sr: 'Moguć prompt injection — šta da radim s tim?', en: 'Possible prompt injection — what should I do with it?' },
  guide:            { sr: 'Vodič', en: 'Guide' },
  // activity bar titles
  act_explorer:     { sr: 'Fajlovi', en: 'Explorer' },
  act_chat:         { sr: 'Endo', en: 'Endo' },
  act_theta:        { sr: 'Theta', en: 'Theta' },
  act_extensions:   { sr: 'Ekstenzije', en: 'Extensions' },
  act_memory:       { sr: 'Memorija', en: 'Memory' },
  act_settings:     { sr: 'Podešavanja', en: 'Settings' },
  act_lang:         { sr: 'Jezik: SR/EN', en: 'Language: SR/EN' },
  // explorer / chat / settings / extensions
  explorer_open:    { sr: 'Otvori folder (Ctrl+O)', en: 'Open folder (Ctrl+O)' },
  chat_placeholder: { sr: 'Pitaj Endo…', en: 'Ask Endo…' },
  ext_placeholder:  { sr: 'Pretraži Open VSX…', en: 'Search Open VSX…' },
  ext_note:         { sr: 'Skeniranje radi. Pokretanje tuđih ekstenzija stiže u Fazi 1.', en: 'Scanning works. Running third-party extensions arrives in Phase 1.' },
  set_profile:      { sr: 'Profil', en: 'Profile' },
  set_key:          { sr: 'ključ', en: 'key' },
  set_provider:     { sr: 'Provajder', en: 'Provider' },
  set_auto:         { sr: 'auto (online→API, offline→GGUF)', en: 'auto (online→API, offline→GGUF)' },
  set_save:         { sr: 'Sačuvaj', en: 'Save' },
  saved:            { sr: 'Sačuvano', en: 'Saved' },
  why:              { sr: 'Zašto', en: 'Why' },
};

export function t(key: string, lang: Lang): string {
  const e = STRINGS[key];
  return e ? e[lang] : key;
}
