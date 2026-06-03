import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { collaboratorsApi, locationsApi } from '@/lib/api';
import type { Collaborator } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus, Pencil, KeyRound, Trash2, Loader2, Search, Copy, Check, TriangleAlert } from 'lucide-react';

export function CollaboratorsList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [slugs, setSlugs] = useState<string[]>([]);
  const [editing, setEditing] = useState<Collaborator | null>(null);
  const [editSlugs, setEditSlugs] = useState<string[]>([]);
  const [resetTarget, setResetTarget] = useState<Collaborator | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Collaborator | null>(null);
  const [tempPwd, setTempPwd] = useState<{ email: string; pwd: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: collaborators = [], isLoading } = useQuery({
    queryKey: ['collaborators'],
    queryFn: () => collaboratorsApi.list(),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationsApi.getAll('it'),
  });
  const allSlugs = useMemo(() => Array.from(new Set(locations.map((l) => l.slug))), [locations]);

  const filtered = useMemo(() => {
    if (!searchTerm) return collaborators;
    const term = searchTerm.toLowerCase();
    return collaborators.filter((c) => c.email?.toLowerCase().includes(term));
  }, [collaborators, searchTerm]);

  const showTempPwd = (email: string, pwd: string) => {
    setCopied(false);
    setTempPwd({ email, pwd });
  };

  const invite = useMutation({
    mutationFn: () => collaboratorsApi.invite(email.trim(), slugs),
    onSuccess: (res) => {
      showTempPwd(res.email, res.tempPassword);
      setEmail(''); setSlugs([]); setInviteOpen(false);
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
    },
    onError: (e: Error) => toast({ title: 'Errore', description: e.message, variant: 'destructive' }),
  });

  const resetPwd = useMutation({
    mutationFn: (userId: string) => collaboratorsApi.resetPassword(userId),
    onSuccess: (res) => {
      showTempPwd(res.email, res.tempPassword);
      setResetTarget(null);
    },
    onError: (e: Error) => toast({ title: 'Errore', description: e.message, variant: 'destructive' }),
  });

  const del = useMutation({
    mutationFn: (userId: string) => collaboratorsApi.delete(userId),
    onSuccess: () => {
      toast({ title: 'Collaboratore rimosso' });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
    },
    onError: (e: Error) => toast({ title: 'Errore', description: e.message, variant: 'destructive' }),
  });

  const saveAssign = useMutation({
    mutationFn: ({ id, next }: { id: string; next: string[] }) => collaboratorsApi.setAssignments(id, next),
    onSuccess: () => {
      toast({ title: 'Assegnazioni aggiornate' });
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
    },
    onError: (e: Error) => toast({ title: 'Errore', description: e.message, variant: 'destructive' }),
  });

  const toggle = (list: string[], slug: string) =>
    list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug];

  const openEdit = (c: Collaborator) => { setEditing(c); setEditSlugs(c.slugs); };

  const copyPwd = async () => {
    if (!tempPwd) return;
    await navigator.clipboard.writeText(tempPwd.pwd);
    setCopied(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brown-900 flex items-center gap-2">
            <Users className="h-7 w-7" /> Collaboratori
          </h1>
          <p className="text-muted-foreground mt-1">
            {collaborators.length} {collaborators.length === 1 ? 'persona' : 'persone'} che gestiscono i luoghi assegnati
          </p>
        </div>
        <Button onClick={() => { setEmail(''); setSlugs([]); setInviteOpen(true); }}
          className="bg-brown-600 hover:bg-brown-700 shadow-sm hover:shadow-md transition-all">
          <Plus className="mr-2 h-4 w-4" /> Invita
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cerca per email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 transition-shadow focus:shadow-md"
        />
      </div>

      {/* Table */}
      <Card className="overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-brown-50/50">
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Luoghi assegnati</TableHead>
              <TableHead className="text-right font-semibold">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="h-32">
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-brown-600" />
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                  {searchTerm ? 'Nessun risultato trovato' : 'Nessun collaboratore.'}
                </TableCell>
              </TableRow>
            ) : (
              <AnimatePresence mode="popLayout">
                {filtered.map((c, index) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                    className="group hover:bg-brown-50/50 transition-colors"
                  >
                    <TableCell className="font-medium text-brown-900">{c.email}</TableCell>
                    <TableCell>
                      {c.slugs.length === 0 ? (
                        <span className="text-muted-foreground">-</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {c.slugs.map((slug) => (
                            <span key={slug}
                              className="px-2 py-0.5 rounded-md text-xs font-medium bg-brown-100 text-brown-700">
                              {slug}
                            </span>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-brown-100"
                          title="Modifica luoghi" onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-amber-50"
                          title="Reset password" onClick={() => setResetTarget(c)}>
                          <KeyRound className="h-4 w-4 text-amber-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50"
                          title="Rimuovi collaboratore" onClick={() => setDeleteTarget(c)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invita collaboratore</DialogTitle>
            <DialogDescription>
              Crea un account e i luoghi che potrà gestire. Riceverai una password temporanea da comunicargli.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="c-email">Email del collaboratore</Label>
              <Input id="c-email" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="nome@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Luoghi assegnati</Label>
              <div className="flex flex-wrap gap-2">
                {allSlugs.map((slug) => (
                  <button key={slug} type="button" onClick={() => setSlugs((p) => toggle(p, slug))}
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
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Annulla</Button>
            <Button onClick={() => invite.mutate()}
              disabled={invite.isPending || !email || slugs.length === 0}
              className="bg-brown-600 hover:bg-brown-700">
              {invite.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creazione...</>) : 'Crea collaboratore'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit assignments dialog */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Luoghi di {editing?.email}</DialogTitle>
            <DialogDescription>Seleziona i luoghi che questo collaboratore può gestire.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {allSlugs.map((slug) => (
              <button key={slug} type="button" onClick={() => setEditSlugs((p) => toggle(p, slug))}
                className={`text-xs px-2 py-1 rounded border ${
                  editSlugs.includes(slug)
                    ? 'bg-brown-600 text-white border-brown-600'
                    : 'border-muted-foreground/30'
                }`}>
                {slug}
              </button>
            ))}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditing(null)}>Annulla</Button>
            <Button onClick={() => editing && saveAssign.mutate({ id: editing.id, next: editSlugs })}
              disabled={saveAssign.isPending}
              className="bg-brown-600 hover:bg-brown-700">
              {saveAssign.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvataggio...</>) : 'Salva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset confirm dialog */}
      <Dialog open={resetTarget !== null} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reimposta la password?</DialogTitle>
            <DialogDescription>
              Verrà generata una nuova password temporanea per <strong>{resetTarget?.email}</strong>.
              Quella precedente smetterà di funzionare.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setResetTarget(null)}>Annulla</Button>
            <Button onClick={() => resetTarget && resetPwd.mutate(resetTarget.id)}
              disabled={resetPwd.isPending}
              className="bg-amber-600 hover:bg-amber-700">
              {resetPwd.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generazione...</>) : 'Genera nuova password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rimuovere il collaboratore?</DialogTitle>
            <DialogDescription>
              <strong>{deleteTarget?.email}</strong> perderà l'accesso e verrà eliminato insieme alle sue
              assegnazioni. L'azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annulla</Button>
            <Button variant="destructive"
              onClick={() => deleteTarget && del.mutate(deleteTarget.id)}
              disabled={del.isPending}>
              {del.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Rimozione...</>) : 'Elimina'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Temporary password modal — explicit save warning, cannot be dismissed by click-outside/Esc */}
      <Dialog open={tempPwd !== null} onOpenChange={() => { /* solo il bottone chiude */ }}>
        <DialogContent
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className="[&>button]:hidden"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <TriangleAlert className="h-5 w-5" /> Salva la password temporanea
            </DialogTitle>
            <DialogDescription>
              Account: <strong>{tempPwd?.email}</strong>. Questa password viene mostrata <strong>una sola volta</strong>:
              copiala e comunicala ora al collaboratore. Se la chiudi senza salvarla <strong>andrà persa</strong> e
              dovrai generarne una nuova con «Reset password». Al primo accesso gli verrà chiesto di cambiarla.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2">
            <code className="font-mono text-base flex-1 break-all">{tempPwd?.pwd}</code>
            <Button variant="outline" size="sm" onClick={copyPwd}>
              {copied ? (<><Check className="mr-1.5 h-4 w-4 text-green-600" />Copiata</>) : (<><Copy className="mr-1.5 h-4 w-4" />Copia</>)}
            </Button>
          </div>

          <DialogFooter>
            <Button onClick={() => setTempPwd(null)} className="bg-brown-600 hover:bg-brown-700">
              Ho salvato la password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
