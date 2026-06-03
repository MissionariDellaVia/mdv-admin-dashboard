import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LockKeyhole, ShieldCheck, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { profilesApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthField } from '@/components/auth/AuthField';

export function ChangePassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();

  const longEnough = password.length >= 8;
  const matches = confirm.length > 0 && password === confirm;
  const canSubmit = longEnough && matches && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!longEnough) { setError('La password deve avere almeno 8 caratteri'); return; }
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
    <AuthLayout
      title="Imposta la password"
      eyebrow="Primo accesso"
      subtitle="Per sicurezza, scegli una password personale prima di continuare."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <AuthField
          id="password" label="Nuova password" icon={LockKeyhole} type="password"
          value={password} onChange={setPassword} autoComplete="new-password"
        />
        <AuthField
          id="confirm" label="Conferma password" icon={ShieldCheck} type="password"
          value={confirm} onChange={setConfirm} autoComplete="new-password"
        />

        {/* Indizi di validazione, discreti */}
        <ul className="space-y-1 text-xs">
          <Hint ok={longEnough}>Almeno 8 caratteri</Hint>
          <Hint ok={matches}>Le due password coincidono</Hint>
        </ul>

        <Button
          type="submit"
          disabled={!canSubmit}
          className="mt-1 h-11 w-full bg-brown-600 text-base font-medium text-mdv-cream shadow-lg
                     shadow-brown-900/25 transition-all hover:-translate-y-0.5 hover:bg-brown-700
                     disabled:translate-y-0 disabled:opacity-60"
        >
          {loading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvataggio...</>
          ) : (
            'Salva e continua'
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}

function Hint({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className={`flex items-center gap-1.5 transition-colors ${ok ? 'text-green-700' : 'text-brown-400'}`}>
      <Check className={`h-3.5 w-3.5 ${ok ? 'opacity-100' : 'opacity-40'}`} />
      {children}
    </li>
  );
}
