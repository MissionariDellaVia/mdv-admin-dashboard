# Ruoli di supporto (collaboratori) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere un ruolo "collaboratore" che può modificare attività/eventi e info statiche solo nei luoghi assegnati, senza regressioni per gli admin (frati/suore) né per l'app pubblica.

**Architecture:** L'autorizzazione vive nelle RLS Postgres (helper `is_admin()` / `can_edit_location(slug)`); gli utenti esistenti vengono seedati come `admin` per zero regressioni. Un'unica edge function admin crea i collaboratori con password temporanea (cambio obbligatorio al primo accesso). Il frontend legge il ruolo da `profiles` e condiziona sidebar, routing e i tab di `LocationEdit`.

**Tech Stack:** Supabase (Postgres + RLS + Auth + Edge Functions Deno), React 19 + Vite + TypeScript, TanStack Query, React Hook Form + Zod, Vitest.

**Spec di riferimento:** `docs/superpowers/specs/2026-06-03-collaboratori-ruoli-supporto-design.md`

---

## File Structure

**Nuovi file**
- `supabase/migrations/20260603_roles_collaborators.sql` — tabelle, helper, seed admin
- `supabase/migrations/20260603_roles_rls.sql` — riscrittura policy di scrittura
- `supabase/functions/admin-invite/index.ts` — sorgente edge function (provisioning)
- `supabase/functions-ready/admin-invite.ts` — artefatto flat da incollare nel dashboard
- `src/lib/api.collaborators.test.ts` — test API layer collaboratori
- `src/pages/ChangePassword.tsx` — pagina cambio password obbligatorio
- `src/pages/collaborators/CollaboratorsList.tsx` — pagina admin elenco + invito

**File modificati**
- `src/lib/types.ts` — tipi `Profile`, `Collaborator`
- `src/lib/api.ts` — `profilesApi`, `collaboratorsApi`
- `src/hooks/useAuth.ts` — espone `role`, `isAdmin`, `allowedSlugs`, `mustChangePassword`, `refreshProfile`
- `src/App.tsx` — guardia cambio-password + route-gating per ruolo
- `src/components/layout/Sidebar.tsx` — voci condizionate al ruolo
- `src/pages/locations/LocationList.tsx` — filtro per `allowedSlugs`, nascondi azioni admin
- `src/pages/locations/LocationEdit.tsx` — tab "Dati del luogo" in sola lettura per collaboratore

---

## Task 1: Migration — tabelle, helper, seed admin

**Files:**
- Create: `supabase/migrations/20260603_roles_collaborators.sql`

- [ ] **Step 1: Scrivere la migration**

```sql
-- Ruoli collaboratori: profiles + mappa luoghi + helper RLS. Idempotente.
-- Eseguire nel SQL Editor di Supabase (o supabase db push).

CREATE TABLE IF NOT EXISTS profiles (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role                 TEXT NOT NULL DEFAULT 'collaborator'
                         CHECK (role IN ('admin','collaborator')),
  email                TEXT,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS location_editors (
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_slug VARCHAR(120) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, location_slug)
);

CREATE INDEX IF NOT EXISTS idx_location_editors_user ON location_editors(user_id);

-- Helper usati dalle RLS. SECURITY DEFINER: evitano ricorsione di RLS su profiles.
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

-- Il collaboratore azzera il proprio flag al primo cambio password (no escalation:
-- non tocca direttamente la tabella, quindi non può cambiarsi il ruolo).
CREATE OR REPLACE FUNCTION complete_password_change() RETURNS VOID
  LANGUAGE sql SECURITY DEFINER AS $$
    UPDATE profiles SET must_change_password = false WHERE id = auth.uid();
  $$;

-- ANTI-REGRESSIONE: tutti gli utenti già esistenti diventano admin.
INSERT INTO profiles (id, role, email)
  SELECT id, 'admin', email FROM auth.users
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_editors ENABLE ROW LEVEL SECURITY;

-- profiles: ognuno legge la propria riga; gli admin leggono tutto; scrive solo admin.
DROP POLICY IF EXISTS "profiles self read" ON profiles;
CREATE POLICY "profiles self read" ON profiles FOR SELECT
  USING (id = auth.uid() OR is_admin());
DROP POLICY IF EXISTS "profiles admin write" ON profiles;
CREATE POLICY "profiles admin write" ON profiles FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- location_editors: il collaboratore legge le proprie righe; gli admin tutto; scrive solo admin.
DROP POLICY IF EXISTS "location_editors self read" ON location_editors;
CREATE POLICY "location_editors self read" ON location_editors FOR SELECT
  USING (user_id = auth.uid() OR is_admin());
DROP POLICY IF EXISTS "location_editors admin write" ON location_editors;
CREATE POLICY "location_editors admin write" ON location_editors FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());
```

- [ ] **Step 2: Eseguire la migration in Supabase**

Incollare il contenuto nel SQL Editor di Supabase (progetto `lagtepdgehbjmvnlzggb`) ed eseguire.
Atteso: esecuzione senza errori.

- [ ] **Step 3: Verificare il seed admin**

Eseguire nel SQL Editor:
```sql
SELECT role, count(*) FROM profiles GROUP BY role;
```
Atteso: una riga `admin` con count = numero utenti esistenti, nessun `collaborator`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260603_roles_collaborators.sql
git commit -m "feat(db): profiles + location_editors + helper RLS, seed admin"
```

---

## Task 2: Migration — riscrittura RLS di scrittura

**Files:**
- Create: `supabase/migrations/20260603_roles_rls.sql`

Sostituisce le policy di scrittura `auth.role() = 'authenticated'` con `is_admin()` /
`can_edit_location(...)`. **Le SELECT restano invariate** (app pubblica intatta).

- [ ] **Step 1: Scrivere la migration**

```sql
-- Riscrittura policy di SCRITTURA per il modello a ruoli. Idempotente.
-- Le SELECT pubbliche NON vengono toccate (app pubblica + mobile invariate).

-- ── events: scrivibili da chi può editare quel luogo ──
DROP POLICY IF EXISTS "Events are insertable by authenticated users" ON events;
DROP POLICY IF EXISTS "Events are updatable by authenticated users" ON events;
DROP POLICY IF EXISTS "Events are deletable by authenticated users" ON events;
CREATE POLICY "events editable by location editors" ON events FOR INSERT
  WITH CHECK (can_edit_location(location_slug));
CREATE POLICY "events updatable by location editors" ON events FOR UPDATE
  USING (can_edit_location(location_slug)) WITH CHECK (can_edit_location(location_slug));
CREATE POLICY "events deletable by location editors" ON events FOR DELETE
  USING (can_edit_location(location_slug));

-- ── location_info: tramite il luogo collegato (location_id -> locations.slug) ──
DROP POLICY IF EXISTS "Location info are insertable by authenticated users" ON location_info;
DROP POLICY IF EXISTS "Location info are updatable by authenticated users" ON location_info;
DROP POLICY IF EXISTS "Location info are deletable by authenticated users" ON location_info;
CREATE POLICY "location_info editable by location editors" ON location_info FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM locations l
                      WHERE l.id = location_info.location_id AND can_edit_location(l.slug)));
CREATE POLICY "location_info updatable by location editors" ON location_info FOR UPDATE
  USING (EXISTS (SELECT 1 FROM locations l
                 WHERE l.id = location_info.location_id AND can_edit_location(l.slug)))
  WITH CHECK (EXISTS (SELECT 1 FROM locations l
                      WHERE l.id = location_info.location_id AND can_edit_location(l.slug)));
CREATE POLICY "location_info deletable by location editors" ON location_info FOR DELETE
  USING (EXISTS (SELECT 1 FROM locations l
                 WHERE l.id = location_info.location_id AND can_edit_location(l.slug)));

-- ── locations (anagrafica): solo admin ──
DROP POLICY IF EXISTS "Locations are insertable by authenticated users" ON locations;
DROP POLICY IF EXISTS "Locations are updatable by authenticated users" ON locations;
DROP POLICY IF EXISTS "Locations are deletable by authenticated users" ON locations;
CREATE POLICY "locations admin insert" ON locations FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "locations admin update" ON locations FOR UPDATE USING (is_admin());
CREATE POLICY "locations admin delete" ON locations FOR DELETE USING (is_admin());

-- ── contenuti non-luogo: solo admin ──
DROP POLICY IF EXISTS "Gospels are insertable by authenticated users" ON gospels;
DROP POLICY IF EXISTS "Gospels are updatable by authenticated users" ON gospels;
DROP POLICY IF EXISTS "Gospels are deletable by authenticated users" ON gospels;
CREATE POLICY "gospels admin insert" ON gospels FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "gospels admin update" ON gospels FOR UPDATE USING (is_admin());
CREATE POLICY "gospels admin delete" ON gospels FOR DELETE USING (is_admin());

DROP POLICY IF EXISTS "Gospel_daily are insertable by authenticated users" ON gospel_daily;
DROP POLICY IF EXISTS "Gospel_daily are updatable by authenticated users" ON gospel_daily;
DROP POLICY IF EXISTS "Gospel_daily are deletable by authenticated users" ON gospel_daily;
CREATE POLICY "gospel_daily admin insert" ON gospel_daily FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "gospel_daily admin update" ON gospel_daily FOR UPDATE USING (is_admin());
CREATE POLICY "gospel_daily admin delete" ON gospel_daily FOR DELETE USING (is_admin());

DROP POLICY IF EXISTS "Comment sections are insertable by authenticated users" ON comment_sections;
DROP POLICY IF EXISTS "Comment sections are updatable by authenticated users" ON comment_sections;
DROP POLICY IF EXISTS "Comment sections are deletable by authenticated users" ON comment_sections;
CREATE POLICY "comment_sections admin insert" ON comment_sections FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "comment_sections admin update" ON comment_sections FOR UPDATE USING (is_admin());
CREATE POLICY "comment_sections admin delete" ON comment_sections FOR DELETE USING (is_admin());

DROP POLICY IF EXISTS "Media are insertable by authenticated users" ON media;
DROP POLICY IF EXISTS "Media are updatable by authenticated users" ON media;
DROP POLICY IF EXISTS "Media are deletable by authenticated users" ON media;
CREATE POLICY "media admin insert" ON media FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "media admin update" ON media FOR UPDATE USING (is_admin());
CREATE POLICY "media admin delete" ON media FOR DELETE USING (is_admin());

DROP POLICY IF EXISTS "Seeds are insertable by authenticated users" ON seeds;
DROP POLICY IF EXISTS "Seeds are updatable by authenticated users" ON seeds;
DROP POLICY IF EXISTS "Seeds are deletable by authenticated users" ON seeds;
CREATE POLICY "seeds admin insert" ON seeds FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "seeds admin update" ON seeds FOR UPDATE USING (is_admin());
CREATE POLICY "seeds admin delete" ON seeds FOR DELETE USING (is_admin());
```

- [ ] **Step 2: Eseguire la migration in Supabase**

Incollare nel SQL Editor ed eseguire. Atteso: nessun errore.

- [ ] **Step 3: Verifica manuale (smoke test admin)**

Con il tuo utente admin loggato nell'app esistente, modifica un evento e un vangelo.
Atteso: salvataggi funzionanti come prima (gli admin bypassano via `is_admin()`).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260603_roles_rls.sql
git commit -m "feat(db): RLS scrittura per ruolo (admin / collaboratore per-luogo)"
```

---

## Task 3: Edge function `admin-invite` (provisioning)

**Files:**
- Create: `supabase/functions/admin-invite/index.ts`
- Create: `supabase/functions-ready/admin-invite.ts`

La function: verifica che il chiamante sia admin, crea l'utente con password temporanea
(`email_confirm: true`), inserisce `profiles(role='collaborator', must_change_password=true)`
e le righe `location_editors`, e ritorna la password temporanea.

- [ ] **Step 1: Scrivere il sorgente strutturato** (`supabase/functions/admin-invite/index.ts`)

```ts
// admin-invite — crea un collaboratore (solo admin). Ritorna la password temporanea.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Password temporanea leggibile: 12 char alfanumerici (no caratteri ambigui).
function tempPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    // 1. Identifica il chiamante dal suo JWT.
    const authHeader = req.headers.get("Authorization") ?? "";
    const caller = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: callerUser } } = await caller.auth.getUser();
    if (!callerUser) return json({ error: "Non autenticato" }, 401);

    const admin = createClient(url, serviceKey);

    // 2. Verifica che il chiamante sia admin.
    const { data: callerProfile } = await admin
      .from("profiles").select("role").eq("id", callerUser.id).single();
    if (callerProfile?.role !== "admin") return json({ error: "Solo gli admin" }, 403);

    // 3. Valida l'input.
    const { email, slugs } = await req.json() as { email?: string; slugs?: string[] };
    if (!email || !Array.isArray(slugs) || slugs.length === 0) {
      return json({ error: "email e almeno un luogo sono richiesti" }, 400);
    }

    // 4. Crea l'utente già attivo con password temporanea.
    const password = tempPassword();
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
    });
    if (createErr || !created.user) {
      return json({ error: createErr?.message ?? "Creazione utente fallita" }, 400);
    }
    const newId = created.user.id;

    // 5. Profilo collaboratore + assegnazioni luoghi.
    await admin.from("profiles").upsert(
      { id: newId, role: "collaborator", email, must_change_password: true },
      { onConflict: "id" },
    );
    await admin.from("location_editors").upsert(
      slugs.map((s) => ({ user_id: newId, location_slug: s })),
      { onConflict: "user_id,location_slug" },
    );

    return json({ id: newId, email, tempPassword: password });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
```

- [ ] **Step 2: Scrivere l'artefatto flat** (`supabase/functions-ready/admin-invite.ts`)

Identico al sorgente ma **senza import da `_shared/`**: incolla `corsHeaders` inline.
Copia il file dello Step 1 e sostituisci la riga `import { corsHeaders } ...` con:

```ts
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
```
(Il resto del corpo — `tempPassword` e tutto il blocco `serve(...)` — è identico allo Step 1.)

- [ ] **Step 3: Deploy della function**

Nel dashboard Supabase → Edge Functions → crea/aggiorna `admin-invite` incollando
`supabase/functions-ready/admin-invite.ts`. Verifica che il secret
`SUPABASE_SERVICE_ROLE_KEY` sia disponibile (iniettato di default).

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/admin-invite/index.ts supabase/functions-ready/admin-invite.ts
git commit -m "feat(edge): admin-invite crea collaboratore con password temporanea"
```

---

## Task 4: Tipi + API layer collaboratori

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/api.ts`
- Test: `src/lib/api.collaborators.test.ts`

- [ ] **Step 1: Aggiungere i tipi** (`src/lib/types.ts`, in fondo al file)

```ts
export type UserRole = 'admin' | 'collaborator';

export interface Profile {
  id: string;
  role: UserRole;
  email: string | null;
  must_change_password: boolean;
}

export interface Collaborator {
  id: string;
  email: string | null;
  slugs: string[];
}
```

- [ ] **Step 2: Scrivere il test API** (`src/lib/api.collaborators.test.ts`)

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
const mockInvoke = vi.fn();
const mockGetUser = vi.fn();

vi.mock('./supabase', () => ({
  supabase: {
    from: (...a: unknown[]) => mockFrom(...a),
    functions: { invoke: (...a: unknown[]) => mockInvoke(...a) },
    auth: { getUser: () => mockGetUser() },
  },
}));

import { collaboratorsApi } from './api';

beforeEach(() => { vi.clearAllMocks(); });

describe('collaboratorsApi.invite', () => {
  it('invoca la edge function admin-invite e ritorna i dati', async () => {
    mockInvoke.mockResolvedValue({ data: { id: 'u1', email: 'x@y.it', tempPassword: 'abc' }, error: null });

    const result = await collaboratorsApi.invite('x@y.it', ['madonna-dc']);

    expect(mockInvoke).toHaveBeenCalledWith('admin-invite', { body: { email: 'x@y.it', slugs: ['madonna-dc'] } });
    expect(result).toEqual({ id: 'u1', email: 'x@y.it', tempPassword: 'abc' });
  });

  it('propaga l errore della function', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new Error('Solo gli admin') });
    await expect(collaboratorsApi.invite('x@y.it', ['a'])).rejects.toThrow('Solo gli admin');
  });
});

describe('collaboratorsApi.setAssignments', () => {
  it('cancella le assegnazioni esistenti e reinserisce le nuove', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ delete: mockDelete, insert: mockInsert });

    await collaboratorsApi.setAssignments('u1', ['a', 'b']);

    expect(mockFrom).toHaveBeenCalledWith('location_editors');
    expect(mockEq).toHaveBeenCalledWith('user_id', 'u1');
    expect(mockInsert).toHaveBeenCalledWith([
      { user_id: 'u1', location_slug: 'a' },
      { user_id: 'u1', location_slug: 'b' },
    ]);
  });
});
```

- [ ] **Step 3: Eseguire il test (deve fallire)**

Run: `npm run test -- api.collaborators`
Atteso: FAIL — `collaboratorsApi` non esiste.

- [ ] **Step 4: Implementare l'API** (`src/lib/api.ts`, in fondo al file)

```ts
// PROFILES / COLLABORATORS API
export const profilesApi = {
  async getMine() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('profiles').select('id, role, email, must_change_password')
      .eq('id', user.id).single();
    if (error) throw error;
    return data as Profile;
  },

  async completePasswordChange() {
    const { error } = await supabase.rpc('complete_password_change');
    if (error) throw error;
  },
};

export const collaboratorsApi = {
  // Crea un collaboratore via edge function admin; ritorna la password temporanea.
  async invite(email: string, slugs: string[]) {
    const { data, error } = await supabase.functions.invoke('admin-invite', {
      body: { email, slugs },
    });
    if (error) throw error;
    return data as { id: string; email: string; tempPassword: string };
  },

  // Elenca i collaboratori con i loro luoghi.
  async list(): Promise<Collaborator[]> {
    const { data: profs, error } = await supabase
      .from('profiles').select('id, email').eq('role', 'collaborator');
    if (error) throw error;
    const { data: links, error: linkErr } = await supabase
      .from('location_editors').select('user_id, location_slug');
    if (linkErr) throw linkErr;
    const bySlug: Record<string, string[]> = {};
    for (const l of (links ?? []) as { user_id: string; location_slug: string }[]) {
      (bySlug[l.user_id] ??= []).push(l.location_slug);
    }
    return (profs ?? []).map((p: { id: string; email: string | null }) => ({
      id: p.id, email: p.email, slugs: bySlug[p.id] ?? [],
    }));
  },

  // Reimposta l'elenco dei luoghi di un collaboratore (delete + reinsert).
  async setAssignments(userId: string, slugs: string[]) {
    const { error: delErr } = await supabase
      .from('location_editors').delete().eq('user_id', userId);
    if (delErr) throw delErr;
    if (slugs.length) {
      const { error: insErr } = await supabase
        .from('location_editors').insert(slugs.map((s) => ({ user_id: userId, location_slug: s })));
      if (insErr) throw insErr;
    }
  },
};
```

Aggiungere `Profile` e `Collaborator` all'import dei tipi in cima a `src/lib/api.ts`:
```ts
  ActivityEvent,
  ActivityEventFormData,
  Profile,
  Collaborator
} from './types';
```

- [ ] **Step 5: Eseguire il test (deve passare)**

Run: `npm run test -- api.collaborators`
Atteso: PASS (tutti i test verdi).

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/api.ts src/lib/api.collaborators.test.ts
git commit -m "feat(api): profilesApi + collaboratorsApi (invite, list, assignments)"
```

---

## Task 5: Estendere `useAuth` con ruolo e luoghi

**Files:**
- Modify: `src/hooks/useAuth.ts`

- [ ] **Step 1: Riscrivere `useAuth`**

```ts
import { useEffect, useState, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthProfile {
  role: 'admin' | 'collaborator';
  mustChangePassword: boolean;
  allowedSlugs: string[];
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (u: User | null) => {
    if (!u) { setProfile(null); return; }
    const { data: prof } = await supabase
      .from('profiles').select('role, must_change_password').eq('id', u.id).single();
    let allowedSlugs: string[] = [];
    if (prof?.role === 'collaborator') {
      const { data: rows } = await supabase
        .from('location_editors').select('location_slug').eq('user_id', u.id);
      allowedSlugs = (rows ?? []).map((r: { location_slug: string }) => r.location_slug);
    }
    setProfile({
      role: prof?.role ?? 'collaborator',
      mustChangePassword: prof?.must_change_password ?? false,
      allowedSlugs,
    });
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      await loadProfile(u);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      await loadProfile(u);
    });
    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  return {
    user,
    loading,
    role: profile?.role ?? null,
    isAdmin: profile?.role === 'admin',
    allowedSlugs: profile?.allowedSlugs ?? [],
    mustChangePassword: profile?.mustChangePassword ?? false,
    signIn,
    signOut,
    refreshProfile: () => loadProfile(user),
  };
}
```

- [ ] **Step 2: Verificare la compilazione**

Run: `npx tsc --noEmit`
Atteso: nessun errore di tipo nuovo introdotto da questo file.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useAuth.ts
git commit -m "feat(auth): useAuth espone role, isAdmin, allowedSlugs, mustChangePassword"
```

---

## Task 6: Pagina cambio password + guardia globale

**Files:**
- Create: `src/pages/ChangePassword.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Creare la pagina** (`src/pages/ChangePassword.tsx`)

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { profilesApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function ChangePassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('La password deve avere almeno 8 caratteri'); return; }
    if (password !== confirm) { setError('Le password non coincidono'); return; }
    setLoading(true);
    try {
      const { error: updErr } = await supabase.auth.updateUser({ password });
      if (updErr) throw updErr;
      await profilesApi.completePasswordChange();
      await refreshProfile();
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-mdv-medium">
      <Card className="w-full max-w-md shadow-xl bg-mdv-cream/95">
        <CardHeader className="text-center py-6">
          <h1 className="text-xl font-bold text-mdv-dark">Imposta una nuova password</h1>
          <p className="text-sm text-mdv-dark/70 mt-1">
            Per sicurezza, scegli una password personale prima di continuare.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-mdv-dark">Nuova password</Label>
              <Input id="password" type="password" value={password}
                onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-mdv-dark">Conferma password</Label>
              <Input id="confirm" type="password" value={confirm}
                onChange={(e) => setConfirm(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full bg-mdv-medium hover:bg-mdv-dark text-mdv-cream"
              disabled={loading}>
              {loading ? 'Salvataggio...' : 'Salva e continua'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Aggiungere la guardia e la route in `App.tsx`**

Importa la pagina (con gli altri import di pagina):
```tsx
import { ChangePassword } from '@/pages/ChangePassword';
```

Sostituisci la funzione `ProtectedRoute` con questa versione (aggiunge il redirect forzato):
```tsx
function ProtectedRoute() {
  const { user, loading, mustChangePassword } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brown-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-brown-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-brown-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (mustChangePassword) return <Navigate to="/cambio-password" replace />;

  return <Outlet />;
}
```

Aggiungi questo wrapper sopra la funzione `App` (accanto a `ProtectedRoute`): la pagina
cambio-password deve essere raggiungibile mentre `mustChangePassword` è true, quindi richiede
solo l'utente loggato e NON passa da `ProtectedRoute`.
```tsx
function RequireUser({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

Aggiungi la route subito dopo il blocco `<Route element={<PublicRoute />}>...</Route>`:
```tsx
          <Route
            path="/cambio-password"
            element={<RequireUser><ChangePassword /></RequireUser>}
          />
```

- [ ] **Step 3: Verificare la compilazione**

Run: `npx tsc --noEmit`
Atteso: nessun errore.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ChangePassword.tsx src/App.tsx
git commit -m "feat(auth): cambio password obbligatorio al primo accesso"
```

---

## Task 7: Sidebar + route-gating per ruolo

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Condizionare le voci della Sidebar**

In `src/components/layout/Sidebar.tsx`, aggiungi l'icona `Users` all'import lucide e
`useAuth`:
```tsx
import {
  BookOpen, Calendar, Sprout, LayoutDashboard, X, MapPin, Users
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
```

Sostituisci la costante `navigation` con (aggiunge il flag `adminOnly`):
```tsx
const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, adminOnly: true },
  { name: 'Via del Vangelo', href: '/gospel-daily', icon: Calendar, adminOnly: true },
  { name: 'Vangeli', href: '/gospels', icon: BookOpen, adminOnly: true },
  { name: 'Semini', href: '/seeds', icon: Sprout, adminOnly: true },
  { name: 'Luoghi', href: '/locations', icon: MapPin, adminOnly: false },
  { name: 'Collaboratori', href: '/collaboratori', icon: Users, adminOnly: true },
];
```

Dentro `Sidebar`, prima del `return`, filtra:
```tsx
  const { isAdmin } = useAuth();
  const visibleNav = navigation.filter((item) => isAdmin || !item.adminOnly);
```

E nel JSX usa `visibleNav` al posto di `navigation`:
```tsx
            {visibleNav.map((item) => (
```

- [ ] **Step 2: Route-gating in `App.tsx`**

Aggiungi un componente `AdminOnly` (accanto a `ProtectedRoute`) che reindirizza i
collaboratori a `/locations`:
```tsx
function AdminOnly() {
  const { isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isAdmin) return <Navigate to="/locations" replace />;
  return <Outlet />;
}
```

Importa la pagina collaboratori (con gli altri import di pagina):
```tsx
import { CollaboratorsList } from '@/pages/collaborators/CollaboratorsList';
```

Avvolgi le route admin-only dentro `<Route element={<AdminOnly />}>`. Il blocco rotte
protette diventa:
```tsx
          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route element={<AdminOnly />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/gospel-daily" element={<GospelDailyList />} />
                <Route path="/gospel-daily/new" element={<GospelDailyCreate />} />
                <Route path="/gospel-daily/:id" element={<GospelDailyEdit />} />
                <Route path="/gospels" element={<GospelList />} />
                <Route path="/gospels/new" element={<GospelCreate />} />
                <Route path="/gospels/:id" element={<GospelCreate />} />
                <Route path="/seeds" element={<SeedList />} />
                <Route path="/seeds/new" element={<SeedCreate />} />
                <Route path="/seeds/:id" element={<SeedCreate />} />
                <Route path="/locations/new" element={<LocationEdit />} />
                <Route path="/collaboratori" element={<CollaboratorsList />} />
              </Route>
              <Route path="/locations" element={<LocationList />} />
              <Route path="/locations/:slug" element={<LocationEdit />} />
            </Route>
          </Route>
```

Nota: `/locations` e `/locations/:slug` restano **fuori** da `AdminOnly` (accessibili al
collaboratore); `/locations/new` è admin-only.

> ⚠️ Ordine route React Router v7: `/locations/new` deve restare **prima** di
> `/locations/:slug`, altrimenti "new" verrebbe interpretato come uno slug. Nel blocco sopra
> `/locations/new` (dentro AdminOnly) precede già `/locations/:slug`.

- [ ] **Step 3: Verificare la compilazione**

Run: `npx tsc --noEmit`
Atteso: nessun errore. (Esegui questo task DOPO il Task 10, oppure crea prima un placeholder
`CollaboratorsList` che esporta un componente vuoto, così l'import risolve.)

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Sidebar.tsx src/App.tsx
git commit -m "feat(auth): sidebar e route gating per ruolo"
```

---

## Task 8: `LocationList` consapevole del ruolo

**Files:**
- Modify: `src/pages/locations/LocationList.tsx`

- [ ] **Step 1: Filtrare i luoghi e nascondere le azioni admin**

Aggiungi l'import:
```tsx
import { useAuth } from '@/hooks/useAuth';
```
In cima al componente, dopo gli altri hook:
```tsx
  const { isAdmin, allowedSlugs } = useAuth();
```

Dopo `const groups = groupBySlug(rows);`, filtra per i collaboratori:
```tsx
  const visibleEntries = Array.from(groups.entries()).filter(
    ([slug]) => isAdmin || allowedSlugs.includes(slug),
  );
```

Sostituisci `Array.from(groups.entries()).map(...)` con `visibleEntries.map(...)` e
la condizione `groups.size === 0` con `visibleEntries.length === 0`.

Nascondi il pulsante "Nuovo Luogo" ai collaboratori — avvolgi il bottone nell'header:
```tsx
        {isAdmin && (
          <Button onClick={() => navigate('/locations/new')} className="bg-brown-600 hover:bg-brown-700">
            <Plus className="mr-2 h-4 w-4" /> Nuovo Luogo
          </Button>
        )}
```

Nascondi il cestino ai collaboratori — avvolgi il bottone delete:
```tsx
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={del.isPending}
                        onClick={() => handleDelete(slug, group)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
```

- [ ] **Step 2: Verificare la compilazione**

Run: `npx tsc --noEmit`
Atteso: nessun errore.

- [ ] **Step 3: Commit**

```bash
git add src/pages/locations/LocationList.tsx
git commit -m "feat(locations): lista filtrata e azioni admin nascoste ai collaboratori"
```

---

## Task 9: `LocationEdit` — tab "Dati del luogo" in sola lettura

**Files:**
- Modify: `src/pages/locations/LocationEdit.tsx`
- Modify: `src/pages/locations/components/EmailsRepeater.tsx`

Per il collaboratore: i campi del tab "Dati" sono `disabled`, niente toggle pubblicazione,
e il salvataggio salta la scrittura su `locations`. I tab "Info statiche" e "Attività"
restano modificabili e salvabili.

- [ ] **Step 1: Leggere il ruolo nel componente**

Aggiungi l'import:
```tsx
import { useAuth } from '@/hooks/useAuth';
```
Dopo gli altri hook nel componente:
```tsx
  const { isAdmin } = useAuth();
  const canEditAnagrafica = isAdmin; // i collaboratori vedono i Dati in sola lettura
```

- [ ] **Step 2: Disabilitare i campi del tab "Dati"**

Aggiungi `disabled={!canEditAnagrafica}` a tutti gli `<Input>`/`<Textarea>` del tab "Dati"
(`name`, `slug`, `city`, `address`, `latitude`, `longitude`, `phone`, `intro`). Nota: `slug`
ha già `disabled={isEdit}` — sostituiscilo con `disabled={isEdit || !canEditAnagrafica}`.
Per lo Switch di pubblicazione:
```tsx
                  <Switch
                    checked={isPublished ?? true}
                    disabled={!canEditAnagrafica}
                    onCheckedChange={(v) => setValue('is_published', v, { shouldDirty: true })}
                  />
```
Per `EmailsRepeater`, passa la prop:
```tsx
                  <EmailsRepeater
                    emails={emails}
                    disabled={!canEditAnagrafica}
                    onChange={(v) => { setEmails(v); setExtraDirty(true); }}
                  />
```

- [ ] **Step 3: Aggiungere la prop `disabled` a `EmailsRepeater`**

In `src/pages/locations/components/EmailsRepeater.tsx`, aggiungi `disabled?: boolean` alle
props e applicalo agli input e ai bottoni add/remove (es. `disabled={disabled}` su ogni
`<Input>`, `<Button>` e `<select>` del componente). Quando `disabled` è true l'utente vede i
contatti ma non può modificarli.

- [ ] **Step 4: Salvataggio anagrafica solo per admin**

Modifica la `mutationFn` di `save` per saltare la scrittura su `locations` quando non si è
admin (il collaboratore salva solo le Info statiche; gli eventi sono già salvati dentro
`EventsTab`):
```tsx
    mutationFn: async (formData: FormData) => {
      let loc = itRow;
      if (canEditAnagrafica) {
        const payload = {
          name: formData.name,
          slug: formData.slug,
          lang: LANG,
          city: formData.city ?? null,
          address: formData.address ?? null,
          latitude: formData.latitude ?? null,
          longitude: formData.longitude ?? null,
          phone: formData.phone ?? null,
          intro: formData.intro ?? null,
          is_published: formData.is_published ?? true,
          emails,
        };
        loc = itRow
          ? await locationsApi.update(itRow.id, payload)
          : await locationsApi.create(payload);
      }
      if (!loc) throw new Error('Luogo non trovato');

      const existingInfo = itRow?.location_info?.[0];
      if (existingInfo) {
        await locationInfoApi.update(existingInfo.id, { body: infoBody, images: infoImages });
      } else {
        await locationInfoApi.create(loc.id, { body: infoBody, images: infoImages, position: 0 });
      }
      return loc;
    },
```

Il bottone "Salva" del form resta visibile a tutti: per il collaboratore salva solo le Info
statiche (la scrittura su `locations` è saltata sopra).

- [ ] **Step 5: Verificare la compilazione e i test**

Run: `npx tsc --noEmit && npm run test`
Atteso: nessun errore di tipo; test verdi.

- [ ] **Step 6: Commit**

```bash
git add src/pages/locations/LocationEdit.tsx src/pages/locations/components/EmailsRepeater.tsx
git commit -m "feat(locations): tab Dati in sola lettura per i collaboratori"
```

---

## Task 10: Pagina admin "Collaboratori"

**Files:**
- Create: `src/pages/collaborators/CollaboratorsList.tsx`

Elenco collaboratori + form di invito (email + selezione luoghi) che mostra la password
temporanea una volta; modifica assegnazioni inline.

- [ ] **Step 1: Creare la pagina** (`src/pages/collaborators/CollaboratorsList.tsx`)

```tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collaboratorsApi, locationsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus } from 'lucide-react';

export function CollaboratorsList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState('');
  const [slugs, setSlugs] = useState<string[]>([]);
  const [tempPwd, setTempPwd] = useState<{ email: string; pwd: string } | null>(null);

  const { data: collaborators = [] } = useQuery({
    queryKey: ['collaborators'],
    queryFn: () => collaboratorsApi.list(),
  });

  // Tutti i luoghi (IT) per la multi-selezione.
  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationsApi.getAll(),
  });
  const allSlugs = Array.from(new Set(locations.map((l) => l.slug)));

  const invite = useMutation({
    mutationFn: () => collaboratorsApi.invite(email, slugs),
    onSuccess: (res) => {
      setTempPwd({ email: res.email, pwd: res.tempPassword });
      setEmail(''); setSlugs([]); setAdding(false);
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
    },
    onError: (e: Error) => toast({ title: 'Errore', description: e.message, variant: 'destructive' }),
  });

  const saveAssign = useMutation({
    mutationFn: ({ id, next }: { id: string; next: string[] }) =>
      collaboratorsApi.setAssignments(id, next),
    onSuccess: () => {
      toast({ title: 'Assegnazioni aggiornate' });
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
    },
    onError: (e: Error) => toast({ title: 'Errore', description: e.message, variant: 'destructive' }),
  });

  const toggleSlug = (slug: string) =>
    setSlugs((prev) => prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-brown-900 flex items-center gap-2">
            <Users className="h-7 w-7" /> Collaboratori
          </h1>
          <p className="text-muted-foreground mt-1">
            Persone che gestiscono attività e info nei luoghi assegnati
          </p>
        </div>
        {!adding && (
          <Button onClick={() => setAdding(true)} className="bg-brown-600 hover:bg-brown-700">
            <Plus className="mr-2 h-4 w-4" /> Invita
          </Button>
        )}
      </div>

      {tempPwd && (
        <Alert>
          <AlertDescription>
            Collaboratore creato per <strong>{tempPwd.email}</strong>. Password temporanea:{' '}
            <code className="font-mono bg-muted px-1.5 py-0.5 rounded">{tempPwd.pwd}</code>.
            Comunicagliela: gli verrà chiesto di cambiarla al primo accesso.{' '}
            <button className="underline" onClick={() => setTempPwd(null)}>Ho capito</button>
          </AlertDescription>
        </Alert>
      )}

      {adding && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-1.5">
              <Label htmlFor="c-email">Email del collaboratore</Label>
              <Input id="c-email" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="nome@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Luoghi assegnati</Label>
              <div className="flex flex-wrap gap-2">
                {allSlugs.map((slug) => (
                  <button key={slug} type="button" onClick={() => toggleSlug(slug)}
                    className={`text-xs px-2 py-1 rounded border ${
                      slugs.includes(slug)
                        ? 'bg-brown-600 text-white border-brown-600'
                        : 'border-muted-foreground/30'
                    }`}>
                    {slug}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => invite.mutate()}
                disabled={invite.isPending || !email || slugs.length === 0}
                className="bg-brown-600 hover:bg-brown-700">
                {invite.isPending ? 'Creazione...' : 'Crea collaboratore'}
              </Button>
              <Button variant="ghost" onClick={() => { setAdding(false); setEmail(''); setSlugs([]); }}>
                Annulla
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {collaborators.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">
            Nessun collaboratore.
          </CardContent></Card>
        ) : (
          collaborators.map((c) => (
            <Card key={c.id}>
              <CardContent className="py-4 space-y-2">
                <p className="font-semibold text-brown-900">{c.email}</p>
                <div className="flex flex-wrap gap-2">
                  {allSlugs.map((slug) => {
                    const has = c.slugs.includes(slug);
                    return (
                      <button key={slug} type="button"
                        onClick={() => saveAssign.mutate({
                          id: c.id,
                          next: has ? c.slugs.filter((s) => s !== slug) : [...c.slugs, slug],
                        })}
                        className={`text-xs px-2 py-1 rounded border ${
                          has ? 'bg-brown-600 text-white border-brown-600' : 'border-muted-foreground/30'
                        }`}>
                        {slug}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificare compilazione e build**

Run: `npx tsc --noEmit && npm run build`
Atteso: build OK.

- [ ] **Step 3: Commit**

```bash
git add src/pages/collaborators/CollaboratorsList.tsx
git commit -m "feat(collaborators): pagina admin elenco + invito + assegnazioni"
```

---

## Task 11: Verifica end-to-end e deploy

- [ ] **Step 1: Test manuale collaboratore**

1. Da admin, vai su `/collaboratori`, invita un'email di test assegnando 1 luogo. Annota la password temporanea.
2. Logout. Login con l'email di test + password temporanea.
3. Atteso: redirect forzato a `/cambio-password`. Imposta una nuova password.
4. Atteso: vedi solo "Luoghi" in sidebar, e solo il luogo assegnato in lista.
5. Apri il luogo: "Dati del luogo" in sola lettura; "Info statiche" e "Attività" modificabili e salvabili.
6. Atteso (negativo): nella console del browser prova `supabase.from('events').insert(...)` con un `location_slug` NON assegnato → errore RLS.

- [ ] **Step 2: Test manuale admin (no regressioni)**

Login con un utente admin esistente: tutte le sezioni visibili e modificabili come prima.

- [ ] **Step 3: Deploy**

```bash
git checkout main && git merge develop --ff-only && git push origin main
git tag v1.2.0 && git push origin v1.2.0
git checkout develop
```
La edge function `admin-invite` è già stata incollata nel dashboard al Task 3. Vercel
builda al push su `main`. Vedi memory `deploy-workflow`.

---

## Self-review (note)

- **Copertura spec**: tabelle+helper (Task 1), RLS (Task 2), provisioning password temporanea
  (Task 3), API (Task 4), ruolo in `useAuth` (Task 5), cambio password obbligatorio (Task 6),
  sidebar/routing (Task 7), lista filtrata (Task 8), Dati in sola lettura (Task 9), UI admin
  collaboratori (Task 10), E2E+deploy (Task 11). Tutte le sezioni della spec hanno un task.
- **Sicurezza**: l'isolamento è nelle RLS (Task 2), non solo nella UI; lo Step 1.6 del Task 11
  verifica esplicitamente il blocco via console.
- **Anti-regressione**: seed admin (Task 1), SELECT pubbliche non toccate (Task 2), smoke test
  admin (Task 2 Step 3 + Task 11 Step 2).
- **Ordine route**: `/locations/new` resta prima di `/locations/:slug` (Task 7, nota).
- **Coerenza tipi/nomi**: `is_admin()`, `can_edit_location()`, `complete_password_change()`
  usati identici tra migration, edge function, API e `useAuth`; `collaboratorsApi.invite/list/
  setAssignments` e `profilesApi.getMine/completePasswordChange` coerenti tra test e
  implementazione.
```
