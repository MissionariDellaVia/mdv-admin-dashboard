import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { gospelsApi, gospelDailyApi } from '@/lib/api';
import type { GospelDaily } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pagination } from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDate } from '@/lib/utils';
import { Plus, Pencil, Trash2, Search, BookOpen, Loader2, MessageSquare, ChevronLeft, ChevronRight, Calendar, User } from 'lucide-react';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// Helper to strip HTML
function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

export function GospelList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [commentsModal, setCommentsModal] = useState<{ gospelId: number; reference: string } | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Debounce search per evitare troppe chiamate API
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Query paginata server-side per gospels
  const { data, isLoading } = useQuery({
    queryKey: ['gospels', currentPage, pageSize, debouncedSearch],
    queryFn: () => gospelsApi.getPaginated(currentPage, pageSize, debouncedSearch),
  });

  const gospels = data?.data || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Fetch gospel_daily per conteggio commenti (manteniamo getAll qui, dataset più leggero)
  const { data: gospelDailies = [] } = useQuery({
    queryKey: ['gospel-daily-all'],
    queryFn: gospelDailyApi.getAll,
  });

  // Raggruppa gospel_daily per gospel_id
  const commentsByGospel = useMemo(() => {
    const map = new Map<number, GospelDaily[]>();
    gospelDailies.forEach(daily => {
      const existing = map.get(daily.gospel_id) || [];
      existing.push(daily);
      map.set(daily.gospel_id, existing);
    });
    return map;
  }, [gospelDailies]);

  // Commenti per il vangelo selezionato nella modale
  const selectedGospelComments = useMemo(() => {
    if (!commentsModal) return [];
    return commentsByGospel.get(commentsModal.gospelId) || [];
  }, [commentsModal, commentsByGospel]);

  const deleteMutation = useMutation({
    mutationFn: gospelsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gospels'] });
      toast({ title: 'Successo', description: 'Vangelo eliminato' });
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
    },
  });

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const openCommentsModal = (gospelId: number, reference: string) => {
    setCommentsModal({ gospelId, reference });
    setCarouselIndex(0);
  };

  const closeCommentsModal = () => {
    setCommentsModal(null);
    setCarouselIndex(0);
  };

  const nextComment = () => {
    if (carouselIndex < selectedGospelComments.length - 1) {
      setCarouselIndex(carouselIndex + 1);
    }
  };

  const prevComment = () => {
    if (carouselIndex > 0) {
      setCarouselIndex(carouselIndex - 1);
    }
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
          <h1 className="text-3xl font-bold text-brown-900">Vangeli</h1>
          <p className="text-muted-foreground mt-1">
            {totalCount} testi disponibili
          </p>
        </div>
        <Button asChild className="bg-brown-600 hover:bg-brown-700 shadow-sm hover:shadow-md transition-all">
          <Link to="/gospels/new">
            <Plus className="mr-2 h-4 w-4" />
            Nuovo Vangelo
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cerca per riferimento, evangelista o testo..."
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
              <TableHead className="font-semibold">Riferimento</TableHead>
              <TableHead className="font-semibold">Evangelista</TableHead>
              <TableHead className="font-semibold">Testo</TableHead>
              <TableHead className="font-semibold w-[100px] text-center">Commenti</TableHead>
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
            ) : gospels.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  {searchTerm ? 'Nessun risultato trovato' : 'Nessun vangelo presente'}
                </TableCell>
              </TableRow>
            ) : (
              <AnimatePresence mode="popLayout">
                {gospels.map((gospel, index) => (
                  <motion.tr
                    key={gospel.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                    className="group hover:bg-brown-50/50 transition-colors"
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-brown-100 text-brown-600 group-hover:bg-brown-200 transition-colors">
                          <BookOpen className="h-4 w-4" />
                        </div>
                        <span>{gospel.reference}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-brown-100 text-brown-700">
                        {gospel.evangelist}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[400px]">
                      <p className="truncate text-muted-foreground">{gospel.text}</p>
                    </TableCell>
                    <TableCell className="text-center">
                      {(() => {
                        const count = commentsByGospel.get(gospel.id)?.length || 0;
                        return count > 0 ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openCommentsModal(gospel.id, gospel.reference)}
                            className="gap-1.5 text-brown-600 hover:text-brown-700 hover:bg-brown-100"
                          >
                            <MessageSquare className="h-4 w-4" />
                            <span className="font-medium">{count}</span>
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground/50">-</span>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" asChild className="h-8 w-8 hover:bg-brown-100">
                          <Link to={`/gospels/${gospel.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(gospel.id)}
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
              Sei sicuro di voler eliminare questo vangelo? Questa azione non può essere annullata.
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

      {/* Comments Carousel Modal */}
      <Dialog open={commentsModal !== null} onOpenChange={closeCommentsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-brown-600" />
              Commenti per {commentsModal?.reference}
            </DialogTitle>
            <DialogDescription>
              {selectedGospelComments.length} {selectedGospelComments.length === 1 ? 'commento' : 'commenti'} trovati
            </DialogDescription>
          </DialogHeader>

          {selectedGospelComments.length > 0 && (
            <div className="space-y-4">
              {/* Carousel Navigation */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={prevComment}
                  disabled={carouselIndex === 0}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {carouselIndex + 1} di {selectedGospelComments.length}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={nextComment}
                  disabled={carouselIndex === selectedGospelComments.length - 1}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Comment Card */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={carouselIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {(() => {
                    const daily = selectedGospelComments[carouselIndex];
                    const sections = daily.comment_sections || [];
                    const mainComment = sections.find(s => s.section_type === 'main');
                    const reflectionComment = sections.find(s => s.section_type === 'reflection' || s.section_type === 'application');

                    return (
                      <>
                        {/* Meta Info */}
                        <div className="flex flex-wrap items-center gap-4 p-3 rounded-lg bg-brown-50">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-brown-500" />
                            <span className="font-medium">{formatDate(daily.date)}</span>
                          </div>
                          {daily.saints && (
                            <div className="flex items-center gap-2 text-sm">
                              <User className="h-4 w-4 text-brown-500" />
                              <span className="text-muted-foreground">{daily.saints}</span>
                            </div>
                          )}
                        </div>

                        {/* Main Comment */}
                        {mainComment && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-brown-700 flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" />
                              Commento Principale
                            </h4>
                            <div className="p-4 rounded-lg border bg-white max-h-[200px] overflow-y-auto">
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {stripHtml(mainComment.content)}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Reflection */}
                        {reflectionComment && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-purple-700 flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" />
                              Riflessione
                            </h4>
                            <div className="p-4 rounded-lg border border-purple-100 bg-purple-50/30 max-h-[200px] overflow-y-auto">
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {stripHtml(reflectionComment.content)}
                              </p>
                            </div>
                          </div>
                        )}

                        {!mainComment && !reflectionComment && (
                          <div className="text-center py-8 text-muted-foreground">
                            Nessun commento per questa data
                          </div>
                        )}

                        {/* Link to edit */}
                        <div className="flex justify-end pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="text-brown-600 hover:text-brown-700"
                          >
                            <Link to={`/gospel-daily/${daily.id}`}>
                              <Pencil className="h-3.5 w-3.5 mr-1.5" />
                              Modifica
                            </Link>
                          </Button>
                        </div>
                      </>
                    );
                  })()}
                </motion.div>
              </AnimatePresence>

              {/* Dots Navigation */}
              {selectedGospelComments.length > 1 && (
                <div className="flex justify-center gap-1.5 pt-2">
                  {selectedGospelComments.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCarouselIndex(idx)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        idx === carouselIndex
                          ? 'bg-brown-600 w-4'
                          : 'bg-brown-200 hover:bg-brown-300'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
