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
