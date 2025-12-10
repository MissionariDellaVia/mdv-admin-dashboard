# MDV Admin - Guida Completa Setup

Questa guida ti accompagna passo-passo nella configurazione completa del progetto prima del primo avvio.

## Prerequisiti

- Node.js 18+ installato
- Account Supabase (gratuito su https://supabase.com)
- Git (opzionale)

---

## STEP 1: Creare il Progetto Supabase

1. Vai su https://supabase.com e accedi (o crea un account)
2. Clicca su **"New Project"**
3. Compila i campi:
   - **Name**: `mdv-vangelo` (o nome a piacere)
   - **Database Password**: genera una password sicura e SALVALA
   - **Region**: `Central EU (Frankfurt)` (o la regione più vicina)
4. Clicca **"Create new project"**
5. Attendi 2-3 minuti per la creazione

---

## STEP 2: Ottenere le Credenziali API

1. Nel progetto Supabase, vai su **Settings** (icona ingranaggio) > **API**
2. Copia questi valori:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIs...`

3. Apri il file `.env.local` nel progetto e sostituisci:

```env
VITE_SUPABASE_URL=https://IL-TUO-PROJECT-ID.supabase.co
VITE_SUPABASE_ANON_KEY=la-tua-anon-key-completa
```

---

## STEP 3: Eseguire gli Script SQL

Vai su **SQL Editor** nella sidebar di Supabase ed esegui questi script IN ORDINE:

### 3.1 Schema del Database

Copia e incolla tutto il contenuto di `supabase/schema.sql` e clicca **Run**.

Questo crea:
- Tabella `gospels` (testi del Vangelo)
- Tabella `gospel_daily` (contenuti giornalieri)
- Tabella `comment_sections` (sezioni di commento)
- Tabella `media` (file multimediali)
- Tabella `seeds` (versetti casuali)
- Funzione `get_random_seed()` per estrarre versetti random
- Trigger per aggiornamento automatico di `updated_at`

### 3.2 Policy RLS (Row Level Security)

Copia e incolla tutto il contenuto di `supabase/rls-policies.sql` e clicca **Run**.

Questo configura:
- Lettura pubblica per tutte le tabelle
- Scrittura solo per utenti autenticati

### 3.3 Storage per Media

Copia e incolla tutto il contenuto di `supabase/storage.sql` e clicca **Run**.

Questo crea:
- Bucket `gospel-media` per immagini/video/audio
- Policy per upload autenticato e lettura pubblica

---

## STEP 4: Creare gli Utenti Admin

1. Vai su **Authentication** > **Users**
2. Clicca **"Add user"** > **"Create new user"**
3. Crea i due utenti admin:

**Utente 1:**
- Email: `mdv-admin@example.com`
- Password: (scegli una password sicura)
- Spunta "Auto Confirm User"

**Utente 2:**
- Email: `alessandro.macri@example.com`
- Password: (scegli una password sicura)
- Spunta "Auto Confirm User"

---

## STEP 5: Inserire Dati di Test (Opzionale)

Per testare subito il sistema, esegui questo SQL nel SQL Editor:

```sql
-- Inserisci un Vangelo di esempio
INSERT INTO gospels (reference, evangelist, text) VALUES
('Mt 5,1-12', 'Matteo', 'In quel tempo, vedendo le folle, Gesù salì sul monte: si pose a sedere e si avvicinarono a lui i suoi discepoli. Si mise a parlare e insegnava loro dicendo: «Beati i poveri in spirito, perché di essi è il regno dei cieli. Beati quelli che sono nel pianto, perché saranno consolati. Beati i miti, perché avranno in eredità la terra. Beati quelli che hanno fame e sete della giustizia, perché saranno saziati. Beati i misericordiosi, perché troveranno misericordia. Beati i puri di cuore, perché vedranno Dio. Beati gli operatori di pace, perché saranno chiamati figli di Dio. Beati i perseguitati per la giustizia, perché di essi è il regno dei cieli.»');

-- Inserisci alcuni Seeds di esempio
INSERT INTO seeds (verse_text, reference, category, is_active) VALUES
('Io sono la via, la verità e la vita', 'Gv 14,6', 'Gesù', true),
('Amatevi gli uni gli altri come io ho amato voi', 'Gv 15,12', 'Amore', true),
('Non temere, solo abbi fede', 'Mc 5,36', 'Fede', true),
('Venite a me, voi tutti che siete stanchi e oppressi', 'Mt 11,28', 'Consolazione', true);

-- Crea un Gospel Daily di esempio (usa l ID del gospel appena creato)
INSERT INTO gospel_daily (date, gospel_id, saints, liturgical_season, is_published)
SELECT
  CURRENT_DATE,
  id,
  'San Francesco di Assisi',
  'Ordinario',
  false
FROM gospels
WHERE reference = 'Mt 5,1-12'
LIMIT 1;
```

---

## STEP 6: Avviare il Progetto

```bash
# Installa le dipendenze (se non già fatto)
npm install

# Avvia in modalità sviluppo
npm run dev
```

Il progetto sarà disponibile su `http://localhost:5173`

---

## Checklist Finale

Prima di testare, verifica:

- [ ] File `.env.local` configurato con URL e ANON_KEY corretti
- [ ] Script `schema.sql` eseguito con successo
- [ ] Script `rls-policies.sql` eseguito con successo
- [ ] Script `storage.sql` eseguito con successo
- [ ] Almeno un utente admin creato in Authentication
- [ ] (Opzionale) Dati di test inseriti

---

## Troubleshooting

### Errore "Missing Supabase environment variables"
- Verifica che `.env.local` esista e contenga le variabili corrette
- Riavvia il server di sviluppo dopo aver modificato `.env.local`

### Errore "Invalid API key"
- Controlla di aver copiato la chiave `anon public` completa (inizia con `eyJ...`)
- Non usare la `service_role` key nel frontend

### Errore "relation does not exist"
- Esegui prima `schema.sql` nel SQL Editor
- Verifica che lo script sia stato eseguito senza errori

### Login non funziona
- Verifica che l utente sia stato creato con "Auto Confirm User" attivo
- Controlla email e password

### Upload media fallisce
- Verifica che `storage.sql` sia stato eseguito
- Controlla che il bucket `gospel-media` esista in Storage

---

## Struttura Database

```
gospels
├── id (PK)
├── reference (es. "Mt 5,1-12")
├── evangelist (Matteo|Marco|Luca|Giovanni)
├── text (testo completo)
└── created_at, updated_at

gospel_daily
├── id (PK)
├── date (data univoca)
├── gospel_id (FK -> gospels)
├── saints (santi del giorno)
├── liturgical_season (tempo liturgico)
├── is_published (pubblicato/bozza)
└── created_at, updated_at

comment_sections
├── id (PK)
├── gospel_daily_id (FK -> gospel_daily)
├── section_type (intro|main|reflection|application|prayer|conclusion)
├── title, content, content_format
├── sort_order
└── created_at, updated_at

media
├── id (PK)
├── gospel_daily_id (FK -> gospel_daily)
├── type (image|video|audio)
├── url, storage_path
├── title, alt_text
└── created_at

seeds
├── id (PK)
├── verse_text (testo del versetto)
├── reference (riferimento biblico)
├── category (categoria)
├── is_active (attivo/non attivo)
└── created_at, updated_at
```

---

## Contatti

Per problemi o domande sul progetto, contatta il team di sviluppo.
