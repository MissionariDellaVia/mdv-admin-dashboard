import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
      const message = err instanceof Error ? err.message : 'Errore durante il login';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-mdv-medium">
      <Card className="w-full max-w-md shadow-xl border-mdv-dark bg-mdv-cream/95">
        <CardHeader className="text-center py-8">
          <div className="mx-auto">
            <img
              src="/logo.png"
              alt="MdV Logo"
              className="w-32 h-32 object-contain mx-auto drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]"
            />
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-mdv-dark">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nome@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-mdv-light focus:border-mdv-medium focus:ring-mdv-medium"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-mdv-dark">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-mdv-light focus:border-mdv-medium focus:ring-mdv-medium"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-mdv-medium hover:bg-mdv-dark text-mdv-cream" 
              disabled={loading}
            >
              {loading ? 'Accesso in corso...' : 'Accedi'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
