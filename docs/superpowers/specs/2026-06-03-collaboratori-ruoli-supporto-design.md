# Design — Ruoli di supporto (collaboratori) per la gestione dei luoghi

**Data:** 2026-06-03
**Stato:** approvato (design), in attesa di piano di implementazione
**Contesto:** introdurre il primo sistema di ruoli/permessi del progetto.

## Obiettivo

Oggi ogni utente loggato è `authenticated` e può fare **tutto** su tutto (RLS basate
solo su `auth.role() = 'authenticated'`). Vogliamo un secondo ruolo, **collaboratore**,
che aiuti frati e suore (gli **admin**) a mantenere le attività **solo nei luoghi a cui
è autorizzato**.

Un collaboratore, sui **soli luoghi assegnati**, può modificare:
- **Attività** — eventi testuali + volantini (`events`)
- **Info statiche** — orari/info ricorrenti + immagini (`location_info`)

È **escluso** da: anagrafica del luogo (nome, slug, indirizzo, contatti, lat/lng,
pubblicazione), creazione/eliminazione luoghi, e tutto il resto (vangeli, semi, media).
Vede e raggiunge **solo** la sezione "Luoghi", filtrata ai luoghi assegnati.

## Principio di sicurezza

L'isolamento "il collaboratore tocca solo i suoi luoghi" **vive nelle RLS del database**,
non nella UI. La UI nasconde solo ciò che non è permesso (cosmetico); la barriera reale è
nel DB, così resta valida anche bypassando il frontend dalla console del browser.

## 1. Modello dati (1 migration idempotente)

```sql
-- Ruolo applicativo per utente
CREATE TABLE IF NOT EXISTS profiles (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role                 TEXT NOT NULL DEFAULT 'collaborator'
                         CHECK (role IN ('admin','collaborator')),
  email                TEXT,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Mappa collaboratore -> luoghi autorizzati (molti-a-molti)
CREATE TABLE IF NOT EXISTS location_editors (
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_slug VARCHAR(120) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, location_slug)
);
```

### Funzioni helper (`SECURITY DEFINER`)

Usate dalle RLS; `SECURITY DEFINER` per evitare ricorsione di RLS quando leggono `profiles`.

```sql
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN
  LANGUAGE sql SECURITY DEFINER STABLE AS $$
    SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
  $$;

CREATE OR REPLACE FUNCTION can_edit_location(slug TEXT) RETURNS BOOLEAN
  LANGUAGE sql SECURITY DEFINER STABLE AS $$
    SELECT is_admin()
        OR EXISTS (SELECT 1 FROM location_editors
                   WHERE user_id = auth.uid() AND location_slug = slug);
  $$;
```

### Passo anti-regressione (CRITICO)

Nella stessa migration, **tutti gli utenti già esistenti diventano admin**, così frati/suore
mantengono accesso pieno identico a oggi:

```sql
INSERT INTO profiles (id, role, email)
  SELECT id, 'admin', email FROM auth.users
  ON CONFLICT (id) DO NOTHING;
```

## 2. RLS riscritte

Le **SELECT pubbliche restano invariate** (app pubblica + mobile + edge `locations` non
cambiano). Si toccano solo le scritture.

| Tabella | INSERT / UPDATE / DELETE |
|---|---|
| `events` | `can_edit_location(location_slug)` |
| `location_info` | `EXISTS (SELECT 1 FROM locations l WHERE l.id = location_info.location_id AND can_edit_location(l.slug))` |
| `locations` | `is_admin()` |
| `gospels`, `gospel_daily`, `comment_sections`, `media`, `seeds` | `is_admin()` |

`profiles` / `location_editors`:
- SELECT: la propria riga, oppure tutte se `is_admin()`
- INSERT/UPDATE/DELETE: `is_admin()` (con un'eccezione controllata: vedi cambio password)

**Storage `location-media`**: l'upload resta `auth.role() = 'authenticated'` (i collaboratori
devono caricare immagini di volantini/info). Tradeoff accettato: i file contano solo quando
agganciati a un evento/info che il collaboratore già possiede. Restringere per-luogo è
rimandato (YAGNI).

## 3. Provisioning — edge function admin `admin-invite`

Solo la **creazione dell'utente** richiede la service-role key → una sola function.

Flusso:
1. Verifica che il **chiamante sia admin** (legge il JWT del chiamante → controlla `profiles.role`).
2. Genera una **password temporanea** e crea l'utente già attivo:
   `auth.admin.createUser({ email, password: tempPwd, email_confirm: true })`.
3. Inserisce `profiles(role='collaborator', must_change_password=true)`.
4. Inserisce le righe `location_editors` per i luoghi scelti.
5. Ritorna la **password temporanea** all'admin (mostrata una volta nella UI), che la comunica
   al collaboratore a voce/WhatsApp.

> Nessuna dipendenza da SMTP. Se in futuro si configura un SMTP affidabile, passare al flusso
> a invito email è banale (`inviteUserByEmail` al posto di `createUser`) — non ci si lega a nulla.

Le **modifiche successive** alle assegnazioni (aggiungi/togli luogo) e la revoca sono
**scritture dirette in tabella** dalla UI admin (permesse dalle RLS `is_admin()`); non
richiedono la function. La function serve solo a creare/eliminare l'utente auth.

## 4. Cambio password obbligatorio al primo accesso

- `profiles.must_change_password = true` viene impostato alla creazione del collaboratore.
- Dopo il login, `useAuth` legge il flag; se `true`, l'app **forza** una pagina
  "Imposta nuova password" prima di qualsiasi altra schermata.
- Il salvataggio chiama `supabase.auth.updateUser({ password })` e poi azzera il flag
  (`must_change_password = false`).
- RLS dedicata: un utente può aggiornare **solo la propria** riga `profiles` limitatamente al
  passaggio del flag a `false` (lo cambia il proprietario; il ruolo resta scrivibile solo da admin).

## 5. Frontend

- **`useAuth`** esteso → espone `role`, `isAdmin`, `allowedSlugs` (da `location_editors`),
  `mustChangePassword`.
- **Guardia globale**: se `mustChangePassword`, redirect forzato a `/cambio-password`.
- **Routing/sidebar**: il collaboratore vede e raggiunge **solo "Luoghi"**. Vangeli, semi,
  "Nuovo Luogo", "Collaboratori" → nascosti e con redirect difensivo a `/locations`.
- **`LocationList`**: per il collaboratore mostra solo gli slug in `allowedSlugs`; niente
  pulsante "Nuovo Luogo" né cestino.
- **`LocationEdit`**: per il collaboratore il tab **"Dati del luogo" è in sola lettura**
  (campi `disabled`, niente salvataggio dell'anagrafica né toggle di pubblicazione); i tab
  **"Info statiche"** e **"Attività"** restano pienamente modificabili.
- **Nuova pagina admin `/collaboratori`**: elenco collaboratori, "Invita" (email + selezione
  luoghi → mostra la password temporanea una volta), modifica assegnazioni, revoca.

## 6. Impatto e regressioni

| Area | Esito | Motivo |
|---|---|---|
| Frati/suore (admin) | 🟢 invariato | seed automatico a `admin` nella migration |
| Webapp + mobile pubblici | 🟢 invariato | SELECT pubbliche ed edge `locations` non toccate |
| RLS scrittura | 🟠 più restrittive | ma gli admin bypassano tutto via `is_admin()` |

Sforzo: **medio**, concentrato — 1 migration, 1 edge function, `useAuth`+routing,
2 pagine ritoccate (`LocationList`, `LocationEdit`), 1 pagina nuova (`/collaboratori`),
1 pagina cambio password.

## 7. Note di deploy

- La migration va eseguita nel SQL Editor di Supabase (idempotente).
- La edge function `admin-invite` segue la doppia rappresentazione del progetto:
  `supabase/functions/admin-invite/index.ts` (sorgente) +
  `supabase/functions-ready/admin-invite.ts` (flat, da incollare nel dashboard).
- Frontend in produzione via push su `main` (Vercel). Vedi memory `deploy-workflow`.

## Fuori scope (YAGNI)

- Invito via email/magic link (rimandato finché non serve SMTP affidabile).
- Restrizione upload storage per singolo luogo.
- Ruoli oltre i due previsti (admin / collaboratore).
- Audit log delle modifiche dei collaboratori.
