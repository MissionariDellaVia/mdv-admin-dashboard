import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Image as ImageIcon, FileText, Info } from 'lucide-react';
import type { ActivityEvent } from '@/lib/types';
import { EventRow } from './EventRow';
import { EventForm } from './EventForm';

/** Tab "Attività" — flyers + text events for this (slug, lang). */
export function EventsTab({ slug, lang }: { slug: string; lang: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState<'flyer' | 'text' | null>(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', slug, lang],
    queryFn: () => eventsApi.getForLocation(slug, lang),
    enabled: !!slug,
  });

  // Persist a new order by writing sequential positions (robust even when legacy
  // rows all share position 0).
  const reorder = useMutation({
    mutationFn: async (ordered: ActivityEvent[]) => {
      for (let i = 0; i < ordered.length; i++) {
        if (ordered[i].position !== i) await eventsApi.update(ordered[i].id, { position: i });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events', slug, lang] }),
    onError: (e: Error) => toast({ title: 'Errore', description: e.message, variant: 'destructive' }),
  });

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= events.length) return;
    const next = [...events];
    [next[index], next[j]] = [next[j], next[index]];
    reorder.mutate(next);
  };

  return (
    <div className="space-y-4">
      {/* Legend: explains the two content types */}
      <div className="flex gap-3 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
        <Info className="h-4 w-4 shrink-0 text-brown-600 mt-0.5" />
        <div className="space-y-1">
          <p>
            <span className="font-semibold text-blue-700">Volantini</span> — immagini mostrate in
            carosello, valgono per <strong>tutte le lingue</strong>.
          </p>
          <p>
            <span className="font-semibold text-green-700">Eventi testuali</span> — testo
            descrittivo, <strong>specifici per la lingua</strong> selezionata ({lang.toUpperCase()}).
          </p>
          <p>Usa le frecce a sinistra per ordinare; l'ordine vale anche nell'app pubblica.</p>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Caricamento...</p>}
      {!isLoading && events.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nessuna attività ancora. Aggiungi un volantino o un evento testuale qui sotto.
        </p>
      )}

      <div className="space-y-2">
        {events.map((ev, i) => (
          <EventRow
            key={ev.id}
            event={ev}
            slug={slug}
            lang={lang}
            canMoveUp={i > 0}
            canMoveDown={i < events.length - 1}
            onMoveUp={() => move(i, -1)}
            onMoveDown={() => move(i, 1)}
          />
        ))}
      </div>

      {adding ? (
        <EventForm slug={slug} lang={lang} type={adding} onClose={() => setAdding(null)} />
      ) : (
        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setAdding('flyer')}>
            <ImageIcon className="mr-1 h-4 w-4" /> Aggiungi Volantino
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setAdding('text')}>
            <FileText className="mr-1 h-4 w-4" /> Aggiungi Evento testuale
          </Button>
        </div>
      )}
    </div>
  );
}
