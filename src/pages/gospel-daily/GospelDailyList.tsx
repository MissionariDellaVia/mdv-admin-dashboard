import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { gospelDailyApi } from '@/lib/api';
import type { GospelDaily } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Pagination } from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDate } from '@/lib/utils';
import { Plus, Pencil, Trash2, Search, Calendar, Loader2, MessageSquare, Sparkles } from 'lucide-react';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// Helper to strip HTML and truncate text
function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function truncate(text: string, maxLength: number): string {
  const stripped = stripHtml(text);
  if (stripped.length <= maxLength) return stripped;
  return stripped.substring(0, maxLength) + '...';
}

// Extract comments from gospel daily
function getComments(daily: GospelDaily): { main: string; extra: string } {
  const sections = daily.comment_sections || [];
  const main = sections.find(c => c.section_type === 'main')?.content || '';
  const extra = sections.find(c => c.section_type === 'reflection' || c.section_type === 'application')?.content || '';
  return { main, extra };
}

export function GospelDailyList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Debounce search per evitare troppe chiamate API
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Query paginata server-side
  const { data, isLoading } = useQuery({
    queryKey: ['gospel-daily', currentPage, pageSize, debouncedSearch],
    queryFn: () => gospelDailyApi.getPaginated(currentPage, pageSize, debouncedSearch),
  });

  const gospelDailies = data?.data || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const deleteMutation = useMutation({
    mutationFn: gospelDailyApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gospel-daily'] });
      toast({ title: 'Successo', description: 'Via del Vangelo eliminata', variant: 'success' });
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
    },
  });

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset alla prima pagina quando si cerca
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-mdv-darkest">Via del Vangelo</h1>
            <p className="text-muted-foreground mt-1">
              {totalCount} contenuti totali
            </p>
          </div>
          <Button asChild className="bg-brown-600 hover:bg-brown-700 shadow-sm hover:shadow-md transition-all">
            <Link to="/gospel-daily/new">
              <Plus className="mr-2 h-4 w-4" />
              Nuovo Commento
            </Link>
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca per santi o testi sacri..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 transition-shadow focus:shadow-md"
          />
        </div>

        {/* Table */}
        <Card className="overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-brown-50/50">
                  <TableHead className="font-semibold w-[160px]">Data</TableHead>
                  <TableHead className="font-semibold w-[120px]">Vangelo</TableHead>
                  <TableHead className="font-semibold w-[150px]">Santi</TableHead>
                  <TableHead className="font-semibold">Commento</TableHead>
                  <TableHead className="font-semibold">Riflessione</TableHead>
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
                ) : gospelDailies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      {searchTerm ? 'Nessun risultato trovato' : 'Nessun contenuto presente'}
                    </TableCell>
                  </TableRow>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {gospelDailies.map((daily, index) => {
                      const { main, extra } = getComments(daily);
                      const hasMain = main.length > 0;
                      const hasExtra = extra.length > 0;

                      return (
                        <motion.tr
                          key={daily.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.2, delay: index * 0.02 }}
                          className="group hover:bg-brown-50/50 transition-colors cursor-pointer relative"
                          onClick={() => window.location.href = `/gospel-daily/${daily.id}`}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-md bg-brown-100 text-brown-600 group-hover:bg-brown-200 transition-colors">
                                <Calendar className="h-4 w-4" />
                              </div>
                              <span className="text-sm whitespace-nowrap">{formatDate(daily.date)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium text-brown-700">
                              {daily.gospel?.reference || '-'}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[150px]">
                            <p className="truncate text-sm text-muted-foreground">{daily.saints || '-'}</p>
                          </TableCell>
                          <TableCell className="max-w-[220px]">
                            {hasMain ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1.5 cursor-help">
                                    <MessageSquare className="h-3.5 w-3.5 text-brown-500 shrink-0" />
                                    <span className="text-sm text-muted-foreground truncate">
                                      {truncate(main, 50)}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="max-w-[300px]">
                                  <p className="text-sm">{truncate(main, 200)}</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-sm text-muted-foreground/50 italic">Nessun commento</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[220px]">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                {hasExtra ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-1.5 cursor-help">
                                        <Sparkles className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                                        <span className="text-sm text-muted-foreground truncate">
                                          {truncate(extra, 50)}
                                        </span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="max-w-[300px]">
                                      <p className="text-sm">{truncate(extra, 200)}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                ) : (
                                  <span className="text-sm text-muted-foreground/50 italic">-</span>
                                )}
                              </div>
                              {/* Azioni su hover */}
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  asChild
                                  className="h-7 w-7 hover:bg-brown-100"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Link to={`/gospel-daily/${daily.id}`}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Link>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteId(daily.id);
                                  }}
                                  className="h-7 w-7 text-destructive hover:bg-red-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalCount > 0 && (
            <div className="border-t">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={totalCount}
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
                Sei sicuro di voler eliminare questa via del vangelo? I commenti e i media associati verranno eliminati.
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
    </TooltipProvider>
  );
}
