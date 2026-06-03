import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, LockKeyhole, LogIn, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthField } from '@/components/auth/AuthField';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Bentornato" subtitle="Accedi all'area di gestione dei contenuti">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <AuthField
          id="email" label="Email" icon={Mail} type="email"
          value={email} onChange={setEmail}
          placeholder="nome@example.com" autoComplete="email"
        />
        <AuthField
          id="password" label="Password" icon={LockKeyhole} type="password"
          value={password} onChange={setPassword}
          autoComplete="current-password"
        />

        <Button
          type="submit"
          disabled={loading}
          className="mt-2 h-11 w-full bg-mdv-medium text-base font-medium text-mdv-cream shadow-lg
                     shadow-brown-900/25 transition-all hover:-translate-y-0.5 hover:bg-mdv-dark"
        >
          {loading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Accesso in corso...</>
          ) : (
            <><LogIn className="mr-2 h-4 w-4" />Accedi</>
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
