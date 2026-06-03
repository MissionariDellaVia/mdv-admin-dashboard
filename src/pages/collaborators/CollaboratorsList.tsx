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

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationsApi.getAll('it'),
  });
  const allSlugs = Array.from(new Set(locations.map((l) => l.slug)));

  const invite = useMutation({
    mutationFn: () => collaboratorsApi.invite(email.trim(), slugs),
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
