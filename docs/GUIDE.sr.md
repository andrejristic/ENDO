# PSE IDE — Vodič (srpski)

Poređano od najvažnijeg ka manje bitnom.

---

## 1. Šta je PSE IDE (najvažnije)

Editor koda sa AI asistentom **Endo** kome **granice nisu naknadna misao nego arhitektura**.
Kernel (PSE — Partial Self-Extension) tretira tvoje dobro kao *unutrašnju koherenciju*
agenta, ne kao spoljašnju nagradu koju može da izigra. Uz to ide **Guardian** koji ti
kaže **ko te može gledati/slušati pre nego što instaliraš bilo koju ekstenziju**.

## 2. Dva puta — šta je „PSE-vođeno" a šta nije

- **Put 1 (PSE-vođeno):** kad asistent Endo radi kroz naš model sloj (Claude/Mistral/Groq
  ili lokalni GGUF). Tada važe sve garancije: theta, kapija, Seldon, channel-guard.
  Svaki takav izlaz nosi **ljubičastu značku „PSE-vođeno"**.
- **Put 2 (treća strana):** kad kodiraš tuđom ekstenzijom. PSE ne ulazi u tuđu crnu
  kutiju — samo je Guardian skenira. Takav izlaz nosi **sivu značku „treća strana
  (skenirana, ne vođena)"**. Uvek znaš šta gledaš.

## 3. Theta — zdravlje agenta (srce kernela)

Theta je koliko je agent okrenut ka „drugom".
- **Prema tebi (čoveku): uvek 30 ±5.** Ne mrda.
- **Prema stvarima (fajlovi/alati): [15–45] po nužnosti akcije** — nužno = 15
  (odlučno), opciono = 45 (obazrivo). Što više radi zadatak, theta bliža sidru; što
  više zastranjuje, dalje.
- **Theta panel (dugme θ):** svaki aktivni agent ima ikonicu. Klik → graf theta/vreme.
  **Zeleno = sve kul, crveno = odlutao**, uz predlog šta da ubaciš u chat da ga vratiš.

## 4. Dve ose — brzina vs. staje-li-kod-tebe

- **Osa 1 (nužnost) → theta:** koliko odlučno agent radi.
- **Osa 2 (posledica) → kapija:** ako je akcija **nepovratna ili izlazi napolje**
  (brisanje, `push`, deploy, slanje podataka), agent **staje i pita tebe**, bez obzira
  koliko je nužna. Možeš da pred-odobriš kategoriju po repou; ali `push`/`deploy`/
  brisanje/slanje-napolje **uvek pitaju**.

## 5. Guardian skener ekstenzija (zašto postoji IDE)

Pri instalaciji sa Open VSX-a ili iz `.vsix` fajla, dobiješ **privacy label**:
- **Ko prima tvoje podatke** (imenovani: Microsoft, Sentry… + nepoznati domeni)
- **Šta može da vidi** (šta kucaš, terminal, env, kredencijali…)
- **Šta može da uradi** (shell komande, remote loader…)
- Nivo: **BENIGN / ELEVATED / CRITICAL**. Obfuskacija je sama po sebi crveni signal.
- Uvek postoji **„Instaliraj svejedno"** — ti odlučuješ (uz malu šalu ako je CRITICAL).

## 6. Modeli (Put 1)

Podešavanja → uneseš ključ (Claude/Mistral/Groq) **i/ili** putanju do lokalnog
llama.cpp (`llama-server`). Ako uneseš oba: **online → API, offline → GGUF**,
automatski, uvek promenljivo u meniju. Ključevi idu u **OS keychain**, po **profilu**
(npr. „posao"/„lično"). Tool-calling radi native gde postoji, inače kroz fallback.

## 7. Memorija projekta (Organelle)

Agent trajno pamti **razumevanje** projekta (arhitektura, konvencije, komande,
ispravke) — nikad sirove fajlove ni tajne. Ništa ne postaje trajno **bez tvoje
potvrde** („Zapamtiti ovo? Da/Ne"). Živi u app-data; menijem se može izbaciti u repo
(na tvojoj mašini ili online, uz putanju i kredencijale).

## 8. Terminal i tabovi

Terminal je **na dugme** (Prikaz → Terminal, `Ctrl+T`): otvara donji panel. Prednost
**tabovima** nad gomilom prozora.

## 9. Jezik

Dugme **SR/EN** (dole levo) ili meni Jezik. Sve u GUI-ju je ili srpski ili engleski,
nikad izmešano.

## 10. Napomena o fazama (najmanje bitno sada)

Ova verzija (Faza 0) je Electron+Monaco. **Izvršavanje** tuđih VSCode ekstenzija i
runtime praćenje njihovog saobraćaja dolaze u Fazi 1 (Theia). Guardian skener,
asistent Endo i sve PSE garancije rade već sada.
