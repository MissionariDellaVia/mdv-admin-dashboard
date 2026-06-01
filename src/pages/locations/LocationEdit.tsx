import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { locationsApi, locationInfoApi, eventsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Upload,
  Globe,
  Image as ImageIcon,
  FileText,
} from 'lucide-react';
import type { LocationEmail, ContactType, ActivityEvent, ActivityEventFormData } from '@/lib/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_LANGS = ['it', 'en', 'es', 'fr', 'pl', 'pt'] as const;

// ─── Zod schema for tab-1 fields ──────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, 'Nome richiesto'),
  slug: z
    .string()
    .min(1, 'Slug richiesto')
    .regex(/^[a-z0-9-]+$/, 'Solo minuscole, numeri e trattini'),
  city: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  phone: z.string().optional(),
  intro: z.string().optional(),
  is_published: z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Small repeater for email contacts (frate / suora). */
function EmailsRepeater({
  emails,
  onChange,
}: {
  emails: LocationEmail[];
  onChange: (v: LocationEmail[]) => void;
}) {
  const add = () => onChange([...emails, { type: 'frate', email: '' }]);
  const remove = (i: number) => onChange(emails.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<LocationEmail>) =>
    onChange(emails.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));

  return (
    <div className="space-y-3">
      {emails.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <select
            value={entry.type}
            onChange={(e) => update(i, { type: e.target.value as ContactType })}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="frate">Frate</option>
            <option value="suora">Suora</option>
          </select>
          <Input
            type="email"
            placeholder="email@example.com"
            value={entry.email}
            onChange={(e) => update(i, { email: e.target.value })}
            className="flex-1"
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="mr-1 h-4 w-4" /> Aggiungi contatto
      </Button>
    </div>
  );
}

/** Inline event form for adding a flyer or a text event. */
function AddEventForm({
  slug,
  lang,
  type,
  onClose,
}: {
  slug: string;
  lang: string;
  type: 'flyer' | 'text';
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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
      let imageUrl: string | null = null;
      if (type === 'flyer') {
        if (!imageFile) {
          toast({ title: 'Errore', description: 'Seleziona un\'immagine per il volantino', variant: 'destructive' });
          setSaving(false);
          return;
        }
        imageUrl = await locationsApi.uploadImage(imageFile, slug);
      }
      const payload: ActivityEventFormData = {
        location_slug: slug,
        type,
        lang: type === 'flyer' ? null : lang,
        title: title || null,
        body: type === 'text' ? (body || null) : null,
        image: imageUrl,
        event_date: eventDate || null,
        is_published: true,
      };
      await eventsApi.create(payload);
      queryClient.invalidateQueries({ queryKey: ['events', slug, lang] });
      toast({ title: 'Salvato', description: type === 'flyer' ? 'Volantino aggiunto' : 'Evento aggiunto' });
      onClose();
    } catch (e) {
      toast({ title: 'Errore', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
      <p className="text-sm font-semibold">
        {type === 'flyer' ? 'Nuovo Volantino' : 'Nuovo Evento testuale'}
      </p>
      {type === 'flyer' && (
        <div className="space-y-2">
          <Label>Immagine *</Label>
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer text-brown-700">
            <Upload className="h-4 w-4" />
            {imageFile ? imageFile.name : 'Seleziona immagine'}
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
          <Label>Contenuto HTML</Label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="<p>...</p>"
          />
        </div>
      )}
      <div className="space-y-2">
        <Label>Data evento (opzionale)</Label>
        <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={saving} onClick={handleSave} className="bg-brown-600 hover:bg-brown-700">
          {saving ? 'Salvando...' : 'Salva'}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Annulla
        </Button>
      </div>
    </div>
  );
}

/** Single event row in the events list. */
function EventRow({ event, slug, lang }: { event: ActivityEvent; slug: string; lang: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const togglePublish = useMutation({
    mutationFn: () => eventsApi.update(event.id, { is_published: !event.is_published }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events', slug, lang] }),
    onError: (e: Error) => toast({ title: 'Errore', description: e.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: () => eventsApi.delete(event.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', slug, lang] });
      toast({ title: 'Eliminato' });
    },
    onError: (e: Error) => toast({ title: 'Errore', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="flex items-center gap-3 border rounded-lg p-3">
      {event.image && (
        <img src={event.image} alt="" className="h-12 w-12 object-cover rounded border shrink-0" />
      )}
      {!event.image && (
        <div className="h-12 w-12 flex items-center justify-center bg-muted rounded border shrink-0">
          {event.type === 'flyer' ? (
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          ) : (
            <FileText className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      )}
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
          disabled={remove.isPending}
          onClick={() => {
            if (confirm('Eliminare questo evento?')) remove.mutate();
          }}
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    </div>
  );
}

/** Tab 3 — Events for this (slug, lang). */
function EventsTab({ slug, lang }: { slug: string; lang: string }) {
  const [adding, setAdding] = useState<'flyer' | 'text' | null>(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', slug, lang],
    queryFn: () => eventsApi.getForLocation(slug, lang),
    enabled: !!slug,
  });

  return (
    <div className="space-y-4">
      {isLoading && <p className="text-sm text-muted-foreground">Caricamento...</p>}
      {!isLoading && events.length === 0 && (
        <p className="text-sm text-muted-foreground">Nessun evento o volantino.</p>
      )}
      <div className="space-y-2">
        {events.map((ev) => (
          <EventRow key={ev.id} event={ev} slug={slug} lang={lang} />
        ))}
      </div>

      {adding ? (
        <AddEventForm
          slug={slug}
          lang={lang}
          type={adding}
          onClose={() => setAdding(null)}
        />
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

// ─── Main component ───────────────────────────────────────────────────────────

export function LocationEdit() {
  const { slug: slugParam } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isEdit = !!slugParam;
  const [selectedLang, setSelectedLang] = useState<string>('it');
  const [emails, setEmails] = useState<LocationEmail[]>([]);
  const [infoBody, setInfoBody] = useState('');

  // ── Fetch all language rows for this slug (edit mode) ──────────────────────
  const { data: locationRows = [], isLoading } = useQuery({
    queryKey: ['location', slugParam],
    queryFn: () => locationsApi.getBySlug(slugParam!),
    enabled: isEdit,
  });

  // Build a map lang → Location row.
  const langMap = new Map(locationRows.map((r) => [r.lang, r]));
  const presentLangs = new Set(langMap.keys());

  // ── Form (react-hook-form + zod for tab-1 fields) ─────────────────────────
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { is_published: true },
  });

  const isPublished = watch('is_published');
  const slugValue = watch('slug');

  // ── Populate form when selectedLang or locationRows changes ───────────────
  useEffect(() => {
    const row = langMap.get(selectedLang);
    if (row) {
      setValue('name', row.name);
      setValue('slug', row.slug);
      setValue('city', row.city ?? '');
      setValue('address', row.address ?? '');
      setValue('latitude', row.latitude ?? null);
      setValue('longitude', row.longitude ?? null);
      setValue('phone', row.phone ?? '');
      setValue('intro', row.intro ?? '');
      setValue('is_published', row.is_published);
      setEmails(Array.isArray(row.emails) ? row.emails : []);
      setInfoBody(row.location_info?.[0]?.body ?? '');
    } else if (isEdit) {
      // Language not yet created: keep slug fixed, blank the rest
      const firstRow = locationRows[0];
      reset({
        name: '',
        slug: firstRow?.slug ?? '',
        city: '',
        address: '',
        latitude: null,
        longitude: null,
        phone: '',
        intro: '',
        is_published: true,
      });
      setEmails([]);
      setInfoBody('');
    } else {
      // New mode
      reset({ is_published: true });
      setEmails([]);
      setInfoBody('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLang, locationRows]);

  // ── Save mutation ─────────────────────────────────────────────────────────
  const save = useMutation({
    mutationFn: async (data: FormData) => {
      const exists = langMap.get(selectedLang);
      const payload = {
        name: data.name,
        slug: data.slug,
        lang: selectedLang,
        city: data.city ?? null,
        address: data.address ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        phone: data.phone ?? null,
        intro: data.intro ?? null,
        is_published: data.is_published ?? true,
        emails,
      };
      const loc = exists
        ? await locationsApi.update(exists.id, payload)
        : await locationsApi.create(payload);

      // Save the single "info statica" row.
      const existingInfo = exists?.location_info?.[0];
      if (existingInfo) {
        await locationInfoApi.update(existingInfo.id, { body: infoBody });
      } else {
        await locationInfoApi.create(loc.id, { body: infoBody, position: 0 });
      }
      return loc;
    },
    onSuccess: (loc) => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['location', loc.slug] });
      toast({ title: 'Salvato', description: `Lingua "${selectedLang}" salvata` });
      // Stay on page — user switches language to fill other translations.
    },
    onError: (e: Error) =>
      toast({ title: 'Errore', description: e.message, variant: 'destructive' }),
  });

  // ── Display title ─────────────────────────────────────────────────────────
  const pageTitle = isEdit
    ? (langMap.get(selectedLang)?.name ?? slugParam ?? 'Modifica Luogo')
    : 'Nuovo Luogo';

  if (isEdit && isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-8 text-center text-muted-foreground">
        Caricamento...
      </div>
    );
  }

  // The slug to use for events tab (in new mode we use the typed slug value).
  const activeSlug = isEdit ? slugParam! : slugValue ?? '';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/locations')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-brown-900">{pageTitle}</h1>
          {isEdit && (
            <p className="text-sm text-muted-foreground">{slugParam}</p>
          )}
        </div>
      </div>

      {/* ── Language selector ── */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Lingua</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {ALL_LANGS.map((l) => {
            const exists = presentLangs.has(l);
            const active = l === selectedLang;
            return (
              <Button
                key={l}
                type="button"
                size="sm"
                variant={active ? 'default' : 'outline'}
                className={
                  active
                    ? 'bg-brown-600 hover:bg-brown-700 text-white'
                    : exists
                    ? 'border-brown-400 text-brown-700'
                    : 'text-muted-foreground'
                }
                onClick={() => setSelectedLang(l)}
              >
                {l.toUpperCase()}
                {exists && !active && (
                  <span className="ml-1 h-1.5 w-1.5 rounded-full bg-brown-500 inline-block" />
                )}
              </Button>
            );
          })}
        </div>
        {isEdit && !presentLangs.has(selectedLang) && (
          <p className="text-xs text-amber-600 mt-1">
            Questa lingua non esiste ancora — verrà creata al salvataggio.
          </p>
        )}
      </div>

      {/* ── Tabs + form ── */}
      <form onSubmit={handleSubmit((d) => save.mutate(d))}>
        <Tabs defaultValue="dati">
          <TabsList>
            <TabsTrigger value="dati">Dati del luogo</TabsTrigger>
            <TabsTrigger value="info">Info statiche</TabsTrigger>
            <TabsTrigger value="attivita" disabled={!activeSlug}>
              Attività
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Dati ── */}
          <TabsContent value="dati">
            <Card>
              <CardContent className="space-y-4 pt-6">
                {/* Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    {...register('name')}
                    placeholder="Es. Santuario Madonna della Catena"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs">{errors.name.message}</p>
                  )}
                </div>

                {/* Slug + City */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="slug">Slug *</Label>
                    <Input
                      id="slug"
                      {...register('slug')}
                      placeholder="madonna-dc"
                      readOnly={isEdit}
                      disabled={isEdit}
                      className={isEdit ? 'bg-muted cursor-not-allowed' : ''}
                    />
                    {errors.slug && (
                      <p className="text-red-500 text-xs">{errors.slug.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="city">Città</Label>
                    <Input
                      id="city"
                      {...register('city')}
                      placeholder="Es. Cassano all'Ionio"
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-1.5">
                  <Label htmlFor="address">Indirizzo</Label>
                  <Textarea
                    id="address"
                    {...register('address')}
                    rows={2}
                    placeholder="Via Roma 1, 87011 Cassano all'Ionio (CS)"
                  />
                </div>

                {/* Lat / Lng */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="latitude">Latitudine</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      {...register('latitude', {
                        setValueAs: (v) =>
                          v === '' || v === null || v === undefined ? null : Number(v),
                      })}
                      placeholder="39.7917"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="longitude">Longitudine</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      {...register('longitude', {
                        setValueAs: (v) =>
                          v === '' || v === null || v === undefined ? null : Number(v),
                      })}
                      placeholder="16.3221"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Telefono</Label>
                  <Input id="phone" {...register('phone')} placeholder="+39 0983 123456" />
                </div>

                {/* Intro */}
                <div className="space-y-1.5">
                  <Label htmlFor="intro">Introduzione</Label>
                  <Textarea
                    id="intro"
                    {...register('intro')}
                    rows={3}
                    placeholder="Breve descrizione del luogo..."
                  />
                </div>

                {/* Published */}
                <div className="flex items-center gap-3">
                  <Switch
                    checked={isPublished ?? true}
                    onCheckedChange={(v) => setValue('is_published', v)}
                  />
                  <Label className="cursor-pointer">Pubblicato</Label>
                </div>

                {/* Emails / Contacts */}
                <div className="space-y-2">
                  <Label>Contatti email</Label>
                  <EmailsRepeater emails={emails} onChange={setEmails} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab 2: Info statiche ── */}
          <TabsContent value="info">
            <Card>
              <CardContent className="space-y-3 pt-6">
                <div className="space-y-1.5">
                  <Label htmlFor="infoBody">Orari e info ricorrenti (HTML)</Label>
                  <p className="text-xs text-muted-foreground">
                    Es. <code>&lt;ul&gt;&lt;li&gt;&lt;strong&gt;Santa Messa&lt;/strong&gt; ...&lt;/li&gt;&lt;/ul&gt;</code>
                  </p>
                  <Textarea
                    id="infoBody"
                    value={infoBody}
                    onChange={(e) => setInfoBody(e.target.value)}
                    rows={8}
                    placeholder="<ul><li><strong>Santa Messa</strong> – Dom. 10:00</li></ul>"
                    className="font-mono text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab 3: Attività (events) ── */}
          <TabsContent value="attivita">
            <Card>
              <CardContent className="pt-6">
                {activeSlug ? (
                  <EventsTab slug={activeSlug} lang={selectedLang} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Inserisci uno slug per gestire le attività.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ── Actions ── */}
        <div className="flex gap-3 mt-6">
          <Button
            type="submit"
            disabled={save.isPending}
            className="bg-brown-600 hover:bg-brown-700"
          >
            <Save className="mr-2 h-4 w-4" />
            {save.isPending ? 'Salvataggio...' : `Salva "${selectedLang.toUpperCase()}"`}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/locations')}>
            Torna alla lista
          </Button>
        </div>
      </form>
    </div>
  );
}
