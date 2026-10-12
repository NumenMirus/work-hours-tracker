---
name: Registro ore
description: Un tocco aggiunge il tempo. UI piatta, sobria, blu petrolio come unico accento.
colors:
  bg: 'oklch(1 0 0)'
  surface: 'oklch(0.975 0.005 225)'
  surface-2: 'oklch(0.955 0.008 225)'
  border: 'oklch(0.905 0.01 225)'
  border-strong: 'oklch(0.62 0.015 225)'
  ink: 'oklch(0.24 0.025 230)'
  muted: 'oklch(0.47 0.02 230)'
  primary: 'oklch(0.44 0.085 222)'
  primary-hover: 'oklch(0.38 0.08 222)'
  primary-ink: 'oklch(0.99 0.005 222)'
  primary-soft: 'oklch(0.945 0.025 222)'
  live: 'oklch(0.64 0.15 70)'
  live-soft: 'oklch(0.965 0.04 80)'
  live-text: 'oklch(0.48 0.11 65)'
  danger: 'oklch(0.52 0.18 27)'
  danger-soft: 'oklch(0.96 0.025 27)'
typography:
  total:
    fontFamily: "'Inter Variable', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: '2.25rem'
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: '-0.02em'
  title:
    fontFamily: "'Inter Variable', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: '1.125rem'
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "'Inter Variable', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Inter Variable', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: '0.875rem'
    fontWeight: 500
    lineHeight: 1.45
rounded:
  sm: '6px'
  md: '10px'
  full: '999px'
spacing:
  space-1: '4px'
  space-2: '8px'
  space-3: '12px'
  space-4: '16px'
  space-5: '24px'
  space-6: '32px'
  space-7: '48px'
  space-8: '64px'
components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.primary-ink}'
    rounded: '{rounded.sm}'
    height: '40px'
  button-primary-hover:
    backgroundColor: '{colors.primary-hover}'
  button-secondary:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.sm}'
    height: '40px'
  button-ghost:
    backgroundColor: '{colors.bg}'
    textColor: '{colors.muted}'
    rounded: '{rounded.sm}'
    height: '40px'
  quick-task:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.sm}'
    height: '52px'
  timer-panel:
    backgroundColor: '{colors.live-soft}'
    textColor: '{colors.live-text}'
    rounded: '{rounded.md}'
  toast:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.bg}'
    rounded: '{rounded.md}'
---

# Design System: Registro ore

## 1. Overview

**Creative North Star: "Il registro silenzioso"**

Un registro ore non è un cruscotto: è un quaderno di bordo che deve restare in silenzio
mentre si lavora. Questo sistema nasce da lì. Le superfici sono piatte, i bordi sono
sottili, il testo è piccolo e concreto, e l'unica cosa che si muove è il feedback di
qualcosa che è appena successo. L'utente arriva dalla scrivania o dal telefono tra un
intervento e l'altro, spesso con una mano sola: ogni elemento interattivo è grande, ogni
etichetta è in italiano e dice cosa succede se lo tocchi.

Il colore è una scelta, non un effetto. L'accento blu petrolio (`--primary`) è concesso con
parsimonia e resta sotto al 10% della superficie: si vede sulle azioni primarie, sulla
selezione e sulle durate delle task rapide. L'oro (`--live`) esiste per una cosa sola, il
timer in corso, e quando non c'è un timer in corso lo schermo non contiene nulla di ambra.
Il contrasto fra le due cose è il segnale: se vedi l'ambra, qualcosa sta contando.

Il sistema rifiuta esplicitamente il dashboard SaaS pieno di grafici, le app gamificate con
badge e streak, e il foglio Excel con le formule che si rompono. Niente modali: ogni
errore si corregge sul posto, ogni eliminazione è annullabile, ogni totale è leggibile senza
clic.

**Key Characteristics:**

- **Un tocco è un'azione completa.** La task rapida è il componente più importante dello schermo.
- **Il totale è sempre visibile e sempre vero**, e non include mai il timer in corso.
- **Piatto per default**: la profondità è un bordo da 1 px, non un'ombra.
- **Un solo accento**, e solo dove serve agire.
- **Tutte le stringhe in italiano**, brevi, senza enfasi artificiale.

## 2. Colors

Neutri leggermente tinti verso il petrolio (hue ~225-230) con un unico accento freddo e
desaturato; l'ambra è riservata al timer e non è mai decorativa.

### Primary

- **Petrolio** (`--primary` chiaro `oklch(0.44 0.085 222)` / scuro `oklch(0.74 0.085 215)`): pulsanti primari, testo del totale secondario, durata `+20 min` sulle task rapide, testo dell'azione dentro il toast. Mai come sfondo di grandi superfici.
- **Petrolio hover** (`--primary-hover`): stato hover dei pulsanti primari, un gradino più profondo in chiaro e più luminoso in scuro.
- **Petrolio tenue** (`--primary-soft`): sfondo di feedback "aggiunto" sulle task rapide e di `:hover` non distruttivo. Non testo.
- **Inchiostro su petrolio** (`--primary-ink`): testo dei pulsanti primari. Sempre ≥4.5:1 contro `--primary`.

### Neutral

- **Fondo** (`--bg`): la pagina. Chiaro `oklch(1 0 0)` puro, scuro `oklch(0.17 0.01 230)`.
- **Superficie** (`--surface`): pulsanti secondari, task rapide, righe di elenco.
- **Superficie 2** (`--surface-2`): stati hover e righe alternate di form, un gradino sotto `--surface`.
- **Bordo** (`--border`): separatori da 1 px fra righe. Decorativo, non portatore di significato.
- **Bordo marcato** (`--border-strong`): il bordo delle task rapide e dei controlli che devono leggersi come premibili. Adeguato a ≥3:1 contro la superficie.
- **Inchiostro** (`--ink`): testo corrente e superficie del toast.
- **Silenzioso** (`--muted`): didascalie, unità, conteggi secondari. Adeguato a ≥4.5:1 su `--bg`, `--surface` e `--surface-2`.

### Live (solo timer in corso)

- **Ambra** (`--live`): pallino della pillola e bordo del pannello timer. Nessun altro uso in tutta l'interfaccia.
- **Ambra tenue** (`--live-soft`): sfondo del pannello del timer in corso.
- **Testo ambra** (`--live-text`): testo e numeri dentro il pannello timer, inclusi gli avvisi sulla durata misurata.

### Danger (solo azioni distruttive)

- **Rosso** (`--danger`): testo e bordo dei pulsanti di eliminazione e degli errori inline.
- **Rosso tenue** (`--danger-soft`): sfondo del pulsante danger in hover/active e degli errori inline.

### Named Rules

**The One Ink Rule.** Il petrolio compare solo su azioni primarie, elementi selezionati e le
durate delle task rapide, e resta sotto al 10% della superficie visibile. Se il petrolio
inizia a decorare, smette di significare "questa è l'azione".

**The Live Amber Rule.** L'ambra esiste solo per il timer in corso. Nessun'altra
occorrenza nell'interfaccia: nessun badge, nessun bordo, nessun link. Quando il timer è
fermo, lo schermo è senza ambra.

**The Flat Ledger Rule.** Niente ombre, salvo il toast. La profondità è un bordo da 1 px
e il contrasto tonale tra `--bg` e `--surface`.

## 3. Typography

**Display Font:** nessuno. Non esiste un display in questo prodotto.
**Body Font:** Inter Variable (con `system-ui, -apple-system, 'Segoe UI', sans-serif`)
**Label/Mono Font:** nessuno. Le cifre usano `font-variant-numeric: tabular-nums` nella
stessa Inter, non un font a parte.

**Character:** una sola famiglia, un solo sistema di pesi (400/500/600). La scala è fissa in
rem, non fluida: l'utente guarda lo stesso schermo a distanze e densità diverse, e una
headline che si comprime da sola aggiunge solo incertezza.

### Hierarchy

- **Totale** (600, 2.25rem, 1.1, `-0.02em`): il totale del giorno, nell'header della giornata. `--text-2xl` (1.75rem) sotto i 960 px. Sempre `.num`.
- **Titolo** (600, 1.125rem, 1.4): nomi delle sezioni ("Task rapide", "Registrazioni", "Timer") e titoli di gruppo. Mai maiuscoletto, mai con tracking.
- **Corpo** (400, 1rem, 1.5): attività delle registrazioni, testo corrente.
- **Etichetta** (500, 0.8125rem–0.875rem): nomi dei pulsanti, didascalie, unità delle durate. Le durate nei pulsanti delle task rapide sono 600 e `--primary`.

### Named Rules

**The Ledger Numerals Rule.** Ogni quantità che può cambiare sotto gli occhi dell'utente
(totale del giorno, durate, orologio del timer) usa `tabular-nums`. Le cifre non devono
scorrere quando il numero si allunga.

**The No Caps Rule.** Nessun testo maiuscoletto con tracking, in nessuna parte. Le
dimensioni si creano con peso e grandezza, non con il maiuscolo.

## 4. Elevation

Questo sistema è piatto. Non usa ombre per creare profondità: le superfici sono
distinte dal contrasto tonale (`--bg` contro `--surface`, `--surface` contro `--surface-2`)
e da un bordo da 1 px. L'unica ombra dell'interfaccia è quella del toast, che galleggia
soprove tutto e deve staccarsi senza bisogno di un bordo.

### Shadow Vocabulary

- **Toast** (`box-shadow: 0 4px 8px oklch(0 0 0 / 0.18)`): solo sul toast, che è invertito (`--ink` su `--bg`) e senza bordo.

### Named Rules

**The Flat Ledger Rule.** Superfici piatte a riposo, un bordo da 1 px come confine
principale. L'ombra è riservata all'unico elemento che non appartiene al documento: il
toast. Nessun'altra coppia "bordo + ombra morbida" sulla stessa superficie.

## 5. Components

### Buttons

- **Shape:** raggio 6 px (`--radius-sm`), altezza 40 px; con `(pointer: coarse)` minimo 44 px.
- **Primary:** `--primary` su `--primary-ink`, padding `0 16px`, peso 500. È il colore pieno dell'interfaccia e va usato una volta per schermata.
- **Hover / Focus:** hover `--primary-hover` con transizione `--dur-fast` su `background-color` e `transform: translateY(-1px)`; active `translateY(0)`. Focus: `outline: 2px solid var(--primary)` con `outline-offset: 2px`, mai rimosso. Disabled: `opacity: 0.55`, `cursor: not-allowed`, niente hover.
- **Secondary:** `--surface` con bordo 1 px `--border-strong`, testo `--ink`. Hover: `--surface-2`.
- **Ghost:** senza bordo e senza riempimento, testo `--muted`. Hover: `--surface-2`, testo `--ink`.
- **Danger:** `--danger` su `--primary-ink` per l'eliminazione; hover `--danger` con filtro di luminosità ridotta, o `--danger-soft` per la variante di testo.

### Task rapida (componente firma)

- **Shape:** raggio 8 px, altezza minima 52 px, bordo 1 px `--border-strong`, sfondo `--surface`. Non è un `button` con handler: è un `form` con `method="POST"` e `use:enhance`, perché l'azione è un'invio e deve funzionare anche senza JavaScript.
- **Content:** nome dell'attività a peso 500 in `--ink`, e sotto la durata `+20 min` a peso 600 in `--primary` con cifre tabulari.
- **Feedback:** al successo la durata viene sostituita per 1 s da un'icona Check e dalla parola "Aggiunto", con sfondo `--primary-soft`. Solo feedback: nessuna animazione di ingresso, nessuna pulsazione.
- **States:** mai disabilitata durante l'invio. Ogni tocco è una registrazione distinta, e disabilitare l'interfaccia durante il salvataggio farebbe perdere un tocco.

### Chips (pillola del timer)

- **Style:** `--live-soft` con bordo 1 px `--live`, raggio `--radius-full`, testo `--ink` e pallino ambra statico `--live`.
- **State:** compare solo se c'è un timer in corso; porta l'orologio e un link all'ancora `#timer`.

### Cards / Containers

- **Corner Style:** 10 px (`--radius-md`) per l'elenco delle registrazioni e per il pannello del timer; le sezioni della pagina non sono card, sono gruppi di contenuto con spazio.
- **Background:** `--bg` per la pagina, `--surface` per le superfici interattive.
- **Shadow Strategy:** nessuna (vedi sezione 4).
- **Border:** 1 px `--border` per i contenitori, `--border-strong` per quelli interattivi.
- **Internal Padding:** `--space-4` (16 px) orizzontale, `--space-3` (12 px) verticale.

### Inputs / Fields

- **Style:** altezza 40 px, raggio 6 px, sfondo `--surface`, bordo 1 px `--border-strong`, testo `--ink` a `1rem` (niente sotto i 16 px, che su iOS zooma al focus).
- **Focus:** bordo `--primary` e `outline` da 2 px con offset 2 px.
- **Error:** bordo `--danger`, messaggio sotto il campo in `--danger` collegato con `aria-describedby` e `aria-invalid` sull'input.
- **Disabled:** `opacity: 0.55`.
- Il campo durata accetta testo libero (`20`, `1:30`, `1h30`), ha `inputmode="text"` e placeholder "es. 20, 1:30, 1h".

### Navigation

- **Style:** header non sticky, nome del prodotto a sinistra, link di sezione ("Giornata", "Gestione") con `aria-current="page"` sul corrente, `Esci` come bottone ghost in un form. Sotto i 960 px l'header della giornata è l'unico elemento sticky.
- Il tema chiaro/scuro segue il sistema (`prefers-color-scheme`), non c'è un interruttore: chi usa il tool sa già se è notte.

### Toast

- **Invertito:** sfondo `--ink`, testo `--bg`, unica ombra del sistema.
- **Comportamento:** un solo toast alla volta, auto-chiusura a 6 s, pausa su hover e su focus, `role="status"` con `aria-live="polite"` in un contenitore sempre montato.
- **Azione:** quando c'è, è un piccolo form POST (Annulla, Ripristina) con etichetta sottolineata a peso 600, mai un'icona senza testo.
- Entrata con `fly y: 8` su `--dur`, niente animazioni decorative.

## 6. Do's and Don'ts

### Do:

- **Do** usare il petrolio solo su azioni primarie, selezione e durate delle task rapide, e restare sotto il 10% della superficie.
- **Do** mantenere il totale del giorno sempre visibile, e non includere mai il timer in corso nel totale.
- **Do** usare `tabular-nums` per ogni quantità che cambia sotto gli occhi dell'utente.
- **Do** usare bordi da 1 px e contrasto tonale per la profondità; l'ombra solo sul toast.
- **Do** correggere gli errori sul posto, inline, e rendere ogni eliminazione annullabile da un toast.
- **Do** mantenere target touch ≥44 px con `(pointer: coarse)` e focus visibile da 2 px su ogni elemento interattivo.
- **Do** azzerare tutte le durate di transizione e animazione sotto `prefers-reduced-motion: reduce`.

### Don't:

- **Don't** costruire dashboard SaaS tipo Toggl o Harvest piene di grafici: qui si registra e si legge un totale, non si esplora.
- **Don't** fare app gamificate e colorate, con badge, streak o congratulazioni: il totale è un dato, non un premio.
- **Don't** diventare un foglio Excel: niente colonne larghe, niente formule, niente celle da riallineare.
- **Don't** usare `border-left` o `border-right` spessi più di 1 px come striscia colorata: si usa un bordo completo o uno sfondo tenue.
- **Don't** usare gradient text (`background-clip: text` con gradiente): l'enfasi si ottiene con peso e dimensione.
- **Don't** usare l'ambra per niente che non sia il timer in corso.
- **Don't** aprire modali per confermare o correggere: esistono solo azioni inline in due passi.
- **Don't** mostrare heading in maiuscoletto con tracking, né numerare le sezioni (01, 02, 03).
- **Don't** disabilitare i pulsanti durante l'invio di un form: ogni tocco è una registrazione e non deve andare perso.
