import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { locationsApi, eventsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Pencil, Trash2, MapPin, Sparkles } from 'lucide-react';
import type { Location } from '@/lib/types';

/** Group a flat list of Location rows (one per lang) into a map keyed by slug. */
function groupBySlug(rows: Location[]): Map<string, Location[]> {
  const map = new Map<string, Location[]>();
  for (const row of rows) {
    const group = map.get(row.slug) ?? [];
    group.push(row);
    map.set(row.slug, group);
  }
  return map;
}

export function LocationList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all rows (all languages) at once; dedupe client-side.
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationsApi.getAll(),
  });

  // Event counts per slug, for the "attività" badge on each card.
  const { data: eventCounts = {} } = useQuery({
    queryKey: ['event-counts'],
    queryFn: () => eventsApi.getCountsBySlug(),
  });

  const del = useMutation({
    mutationFn: async (ids: number[]) => {
      for (const id of ids) await locationsApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast({ title: 'Eliminato', description: 'Luogo e tutte le lingue eliminate' });
    },
    onError: (e: Error) => toast({ title: 'Errore', description: e.message, variant: 'destructive' }),
  });

  const handleDelete = (slug: string, group: Location[]) => {
    if (confirm(`Eliminare il luogo "${slug}" e tutte le sue lingue?`)) {
      del.mutate(group.map((r) => r.id));
    }
  };

  const { isAdmin, allowedSlugs } = useAuth();

  const groups = groupBySlug(rows);

  const visibleEntries = Array.from(groups.entries()).filter(
    ([slug]) => isAdmin || allowedSlugs.includes(slug),
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-brown-900">Luoghi</h1>
          <p className="text-muted-foreground mt-1">Santuari, attività e info ricorrenti</p>
        </div>
        {isAdmin && (
          <Button onClick={() => navigate('/locations/new')} className="bg-gold-500 hover:bg-gold-400 text-white">
            <Plus className="mr-2 h-4 w-4" /> Nuovo Luogo
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Caricamento...</p>
      ) : visibleEntries.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nessun luogo trovato.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {visibleEntries.map(([slug, group]) => {
            // Use the Italian row name if available, otherwise the first one.
            const display = group.find((r) => r.lang === 'it') ?? group[0];
            const activityCount = eventCounts[slug] ?? 0;

            return (
              <Card
                key={slug}
                className="shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/locations/${slug}`)}
              >
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-brown-600 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-brown-900">{display.name}</p>
                        {activityCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-brown-100 text-brown-700">
                            <Sparkles className="h-3 w-3" />
                            {activityCount} attività
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {slug}{display.is_published ? '' : ' · bozza'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/locations/${slug}`)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={del.isPending}
                        onClick={() => handleDelete(slug, group)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
