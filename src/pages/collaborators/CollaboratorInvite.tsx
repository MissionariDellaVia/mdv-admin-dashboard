import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { collaboratorsApi, locationsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Copy, Check, TriangleAlert, UserPlus } from 'lucide-react';

export function CollaboratorInvite() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [slugs, setSlugs] = useState<string[]>([]);
  const [result, setResult] = useState<{ email: string; pwd: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationsApi.getAll('it'),
  });
  const allSlugs = Array.from(new Set(locations.map((l) => l.slug)));

  const invite = useMutation({
    mutationFn: () => collaboratorsApi.invite(email.trim(), slugs, displayName.trim() || undefined),
    onSuccess: (res) => {
      setResult({ email: res.email, pwd: res.tempPassword });
      setCopied(false);
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
    },
    onError: (e: Error) => toast({ title: 'Errore', description: e.message, variant: 'destructive' }),
  });

  const toggleSlug = (slug: string) =>
    setSlugs((prev) => prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]);

  const copyPwd = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.pwd);
    setCopied(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/collaboratori')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-mdv-darkest flex items-center gap-2">
            <UserPlus className="h-7 w-7" /> Invita collaboratore
          </h1>
          <p className="text-muted-foreground mt-1">
            Crea un account e scegli i luoghi che potrà gestire.
          </p>
        </div>
      </div>

      {result ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center gap-2 text-amber-700 font-semibold">
                <TriangleAlert className="h-5 w-5" /> Salva la password temporanea
              </div>
              <p className="text-sm text-muted-foreground">
                Account creato per <strong>{result.email}</strong>. Questa password è mostrata
                <strong> una sola volta</strong>: copiala e comunicala al collaboratore. Al primo
                accesso gli verrà chiesto di cambiarla.
              </p>
              <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2">
                <code className="font-mono text-base flex-1 break-all">{result.pwd}</code>
                <Button variant="outline" size="sm" onClick={copyPwd}>
                  {copied ? (<><Check className="mr-1.5 h-4 w-4 text-green-600" />Copiata</>) : (<><Copy className="mr-1.5 h-4 w-4" />Copia</>)}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => navigate('/collaboratori')} className="bg-brown-600 hover:bg-brown-700">
                  Torna ai collaboratori
                </Button>
                <Button variant="outline" onClick={() => { setResult(null); setEmail(''); setSlugs([]); setDisplayName(''); }}>
                  Invita un altro
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-1.5">
                <Label htmlFor="c-name">Nome visualizzato <span className="text-muted-foreground font-normal">(opzionale)</span></Label>
                <Input id="c-name" value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)} placeholder="Es. Fra Marco" />
              </div>
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
              <div className="flex gap-2 pt-2">
                <Button onClick={() => invite.mutate()}
                  disabled={invite.isPending || !email || slugs.length === 0}
                  className="bg-brown-600 hover:bg-brown-700">
                  {invite.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creazione...</>) : 'Crea collaboratore'}
                </Button>
                <Button variant="outline" onClick={() => navigate('/collaboratori')}>Annulla</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
