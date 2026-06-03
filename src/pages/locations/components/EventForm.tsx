import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { locationsApi, eventsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/editors/RichTextEditor';
import { useToast } from '@/hooks/use-toast';
import { Upload } from 'lucide-react';
import type { ActivityEvent, ActivityEventFormData, EventType } from '@/lib/types';

/**
 * Inline form to create OR edit a flyer / text event.
 * Pass `event` to edit an existing one; omit it to create a new one of `type`.
 */
export function EventForm({
  slug,
  lang,
  type,
  event,
  onClose,
}: {
  slug: string;
  lang: string;
  type: EventType;
  event?: ActivityEvent;
  onClose: () => void;
}) {
  const isEdit = !!event;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState(event?.title ?? '');
  const [body, setBody] = useState(event?.body ?? '');
  const [eventDate, setEventDate] = useState(event?.event_date ?? '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(event?.image ?? null);
  const [saving, setSaving] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setImageFile(f);
      setImagePreview(URL.createObjectURL(f));
    }
    e.target.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let imageUrl: string | null = event?.image ?? null;
      if (type === 'flyer') {
        if (imageFile) {
          imageUrl = await locationsApi.uploadImage(imageFile, slug);
        } else if (!isEdit) {
          toast({
            title: 'Errore',
            description: "Seleziona un'immagine per il volantino",
            variant: 'destructive',
          });
          setSaving(false);
          return;
        }
      }

      const payload: ActivityEventFormData = {
        location_slug: slug,
        type,
        // Flyers apply to all languages (lang = null); text events are per-language.
        lang: type === 'flyer' ? null : lang,
        title: title || null,
        body: type === 'text' ? body || null : null,
        image: type === 'flyer' ? imageUrl : null,
        event_date: eventDate || null,
        is_published: event?.is_published ?? true,
      };

      if (isEdit) {
        await eventsApi.update(event.id, payload);
      } else {
        await eventsApi.create(payload);
      }

      queryClient.invalidateQueries({ queryKey: ['events', slug, lang] });
      toast({
        title: 'Salvato',
        description: type === 'flyer' ? 'Volantino salvato' : 'Evento salvato',
      });
      onClose();
    } catch (e) {
      toast({ title: 'Errore', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const heading =
    (isEdit ? 'Modifica ' : 'Nuovo ') + (type === 'flyer' ? 'Volantino' : 'Evento testuale');

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
      <p className="text-sm font-semibold">{heading}</p>

      {type === 'flyer' && (
        <div className="space-y-2">
          <Label>Immagine {isEdit ? '' : '*'}</Label>
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer text-brown-700">
            <Upload className="h-4 w-4" />
            {imageFile ? imageFile.name : isEdit ? 'Sostituisci immagine' : 'Seleziona immagine'}
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>
          {imagePreview && (
            <img src={imagePreview} alt="preview" className="h-24 object-cover rounded border" />
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label>Titolo (opzionale)</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titolo..." />
      </div>

      {type === 'text' && (
        <div className="space-y-2">
          <Label>Contenuto</Label>
          <RichTextEditor content={body} onChange={setBody} />
        </div>
      )}

      <div className="space-y-2">
        <Label>Data evento (opzionale)</Label>
        <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={saving}
          onClick={handleSave}
          className="bg-brown-600 hover:bg-brown-700"
        >
          {saving ? 'Salvando...' : 'Salva'}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Annulla
        </Button>
      </div>
    </div>
  );
}
