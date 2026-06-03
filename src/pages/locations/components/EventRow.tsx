import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Trash2,
  Image as ImageIcon,
  FileText,
  Pencil,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import type { ActivityEvent } from '@/lib/types';
import { EventForm } from './EventForm';

/** Single event row in the events list, with edit / reorder / publish / delete. */
export function EventRow({
  event,
  slug,
  lang,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  event: ActivityEvent;
  slug: string;
  lang: string;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const togglePublish = useMutation({
    mutationFn: () => eventsApi.update(event.id, { is_published: !event.is_published }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events', slug, lang] }),
    onError: (e: Error) => toast({ title: 'Errore', description: e.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: () => eventsApi.delete(event.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', slug, lang] });
      toast({ title: 'Eliminato', variant: 'success' });
    },
    onError: (e: Error) => toast({ title: 'Errore', description: e.message, variant: 'destructive' }),
  });

  if (editing) {
    return (
      <EventForm
        slug={slug}
        lang={lang}
        type={event.type}
        event={event}
        onClose={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="flex items-center gap-3 border rounded-lg p-3">
      {/* Reorder */}
      <div className="flex flex-col shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          disabled={!canMoveUp}
          onClick={onMoveUp}
          aria-label="Sposta su"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          disabled={!canMoveDown}
          onClick={onMoveDown}
          aria-label="Sposta giù"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      {/* Thumbnail / icon */}
      {event.image ? (
        <Dialog>
          <DialogTrigger asChild>
            <img
              src={event.image}
              alt=""
              className="h-12 w-12 object-cover rounded border shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
            />
          </DialogTrigger>
          <DialogContent className="max-w-3xl flex items-center justify-center bg-black/90 border-0 p-4">
            <img src={event.image} alt="" className="max-h-[80vh] w-auto mx-auto object-contain" />
          </DialogContent>
        </Dialog>
      ) : (
        <div className="h-12 w-12 flex items-center justify-center bg-muted rounded border shrink-0">
          {event.type === 'flyer' ? (
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          ) : (
            <FileText className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      )}

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
              event.type === 'flyer'
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-green-50 border-green-300 text-green-700'
            }`}
          >
            {event.type === 'flyer' ? 'Volantino' : 'Evento'}
          </span>
          {event.lang === null && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border bg-purple-50 border-purple-300 text-purple-700">
              tutte le lingue
            </span>
          )}
          <span className="text-sm font-medium truncate">
            {event.title ?? <span className="text-muted-foreground italic">senza titolo</span>}
          </span>
        </div>
        {event.event_date && (
          <p className="text-xs text-muted-foreground mt-0.5">{event.event_date}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <Switch
          checked={event.is_published}
          onCheckedChange={() => togglePublish.mutate()}
          aria-label="Pubblicato"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setEditing(true)}
          aria-label="Modifica"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={remove.isPending}
          onClick={() => {
            if (confirm('Eliminare questo evento?')) remove.mutate();
          }}
          aria-label="Elimina"
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    </div>
  );
}
