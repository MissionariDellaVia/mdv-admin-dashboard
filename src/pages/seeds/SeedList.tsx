import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { seedsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Pagination } from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Search, Sprout, Loader2 } from 'lucide-react';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function SeedList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: seeds = [], isLoading } = useQuery({
    queryKey: ['seeds'],
    queryFn: seedsApi.getAll,
  });

  const deleteMutation = useMutation({
    mutationFn: seedsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seeds'] });
      toast({ title: 'Successo', description: 'Semino eliminato' });
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => seedsApi.toggleActive(id, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seeds'] });
      toast({ title: 'Successo', description: 'Stato aggiornato' });
    },
  });

  const filtered = useMemo(() => {
    if (!searchTerm) return seeds;
    const term = searchTerm.toLowerCase();
    return seeds.filter(s =>
      s.verse_text.toLowerCase().includes(term) ||
      s.reference?.toLowerCase().includes(term) ||
      s.category?.toLowerCase().includes(term)
    );
  }, [seeds, searchTerm]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const activeCount = seeds.filter(s => s.is_active).length;

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
          <h1 className="text-3xl font-bold text-brown-900">Semini</h1>
          <p className="text-muted-foreground mt-1">
            {seeds.length} versetti totali &middot; {activeCount} attivi
          </p>
        </div>
        <Button asChild className="bg-brown-600 hover:bg-brown-700 shadow-sm hover:shadow-md transition-all">
          <Link to="/seeds/new">
            <Plus className="mr-2 h-4 w-4" />
            Nuovo Semino
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cerca per versetto, riferimento o categoria..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 transition-shadow focus:shadow-md"
        />
      </div>

      {/* Table */}
      <Card className="overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-brown-50/50">
              <TableHead className="font-semibold">Versetto</TableHead>
              <TableHead className="font-semibold">Riferimento</TableHead>
              <TableHead className="font-semibold">Categoria</TableHead>
              <TableHead className="font-semibold">Attivo</TableHead>
              <TableHead className="text-right font-semibold">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32">
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-brown-600" />
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  {searchTerm ? 'Nessun risultato trovato' : 'Nessun semino presente'}
                </TableCell>
              </TableRow>
            ) : (
              <AnimatePresence mode="popLayout">
                {paginatedData.map((seed, index) => (
                  <motion.tr
                    key={seed.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                    className="group hover:bg-brown-50/50 transition-colors"
                  >
                    <TableCell className="font-medium max-w-[350px]">
                      <div className="flex items-start gap-2">
                        <div className="p-1.5 rounded-md bg-green-100 text-green-600 group-hover:bg-green-200 transition-colors shrink-0 mt-0.5">
                          <Sprout className="h-4 w-4" />
                        </div>
                        <p className="line-clamp-2">{seed.verse_text}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {seed.reference ? (
                        <span className="px-2 py-1 rounded-md text-xs font-medium bg-brown-100 text-brown-700">
                          {seed.reference}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {seed.category ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {seed.category}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={seed.is_active}
                        onCheckedChange={(active) => toggleMutation.mutate({ id: seed.id, active })}
                        className="data-[state=checked]:bg-green-600"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" asChild className="h-8 w-8 hover:bg-brown-100">
                          <Link to={`/seeds/${seed.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(seed.id)}
                          className="h-8 w-8 text-destructive hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="border-t">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filtered.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={handlePageSizeChange}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
            />
          </div>
        )}
      </Card>

      {/* Delete Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma eliminazione</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare questo semino? Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Eliminazione...</>
              ) : (
                'Elimina'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
