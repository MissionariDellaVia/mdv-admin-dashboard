# Design — Restyling sezione Luoghi / Attività

**Data:** 2026-06-03
**Branch:** develop
**Autore:** alessandro.macri (con Claude)

## Obiettivo

Rendere la gestione dei contenuti di un luogo (dati, info, attività) fluida e a
prova di utente non tecnico, eliminando 6 attriti individuati nell'analisi UX.
Gli eventi restano legati al luogo (FK `location_slug`): nessuno sgancio dal
contesto.

## Attriti individuati (analisi precedente)

1. Multilingua = ricompilazione manuale ×6 dei campi non testuali.
2. Eventi testuali non modificabili (solo crea/elimina).
3. HTML grezzo in Info statiche e corpo eventi.
4. Nessun avviso di modifiche non salvate al cambio lingua/tab.
5. Nessun riordino di volantini/eventi (`position` in DB ma senza UI).
6. Funzionalità definite ma invisibili (`cover_image`, `location_info.images`).

## 1. Refactor strutturale (prerequisito)

`LocationEdit.tsx` (744 righe, 4 componenti inline) viola la convenzione del
progetto (un componente per file, ~300 righe max). Estrazione in
`src/pages/locations/components/`:

- `EmailsRepeater.tsx`
- `EventForm.tsx` (ex `AddEventForm`, esteso per create **e** edit)
- `EventRow.tsx`
- `EventsTab.tsx`

`LocationEdit.tsx` resta contenitore (form + tabs + lingua + save). Step
behavior-preserving: solo spostamento.

## 2. Edit eventi/volantini (fix #2)

- `EventRow`: icona matita -> apre `EventForm` in modalità modifica precompilato.
- `EventForm` accetta `event?: ActivityEvent`: presente -> `eventsApi.update`,
  altrimenti `create`.
- Volantino in edit: mostra immagine attuale + opzione "Sostituisci immagine"
  (se non toccata, resta quella).

## 3. Tiptap al posto dell'HTML grezzo (fix #3)

- Info statiche -> `<RichTextEditor content={infoBody} onChange={setInfoBody} />`.
- Corpo evento testuale -> stesso editor in `EventForm`.
- Salva sempre HTML: dati esistenti compatibili, nessuna migrazione.

## 4. Copia tra lingue (fix #1)

- In edit, quando la lingua selezionata non esiste ancora -> selettore
  "Copia dati da [IT v]" + pulsante.
- Precompila tutti i campi dalla lingua sorgente (base da tradurre), slug
  escluso (resta fisso). L'utente traduce nome/intro/testi.

## 5. Avviso modifiche non salvate (fix #4)

- Stato "dirty" da react-hook-form `isDirty` + flag su `emails`/`infoBody`.
- Cambio lingua / cambio tab / uscita con modifiche pendenti -> `confirm()`.
  Niente librerie aggiuntive.

## 6. Riordino volantini/eventi (fix #5)

- `EventRow`: frecce su/giù che scambiano `position` con la riga adiacente
  (via `eventsApi.update`). Più robusto del drag-drop.
- Ambito: solo eventi (il carosello pubblico li ordina per `position`).

## 7. Attività prominenti + spiegazioni (richiesta utente + fix #9)

- Tab "Attività" non più disabilitato. In "nuovo luogo": empty-state
  esplicativo con CTA "Salva prima il luogo per aggiungere attività".
- Riquadro-legenda in testa al tab:
  - **Volantini** = immagini, valgono per tutte le lingue, carosello.
  - **Eventi testuali** = testo, specifici per lingua.
- `LocationList`: badge col numero di attività per card (conteggio aggregato
  per slug).

## 8. Esposizione `location_info.images` (fix #6, parziale)

- Uploader multi-immagine sul blocco Info statiche, riusa
  `locationsApi.uploadImage`.
- Nota: nel blocco unico (position 0) lo slot immagine pubblico è preso dai
  volantini quando presenti (`locations-shape.ts:37`); le immagini info
  emergono solo in assenza di volantini. Valore condizionale, ma il campo è
  consumato dallo shape pubblico -> esposizione coerente.

## Fuori scope (motivato)

- **`cover_image`**: non consumato dallo shape pubblico (`locations-shape.ts`).
  Nessun uploader (salverebbe immagini mai mostrate). Se richiesto, va prima
  cablato nell'edge function -- task separato.
- **Multi-blocco info**: lo shape pubblico supporta N sezioni, l'admin ne
  espone una. Espansione futura, non in questa iterazione.

## Testing

- Estendo `api.locations.test.ts`: `eventsApi.update`, riordino.
- `npx tsc --noEmit` + `npm run lint` verdi.
- Flusso manuale: crea luogo -> copia in EN -> aggiungi volantino -> aggiungi
  evento testuale (Tiptap) -> modifica -> riordina -> cambio lingua con avviso.

## Validazione

Build pulita + flusso manuale completo senza regressioni sui dati esistenti.
