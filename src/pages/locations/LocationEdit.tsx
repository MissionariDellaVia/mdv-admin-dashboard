import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { locationsApi, locationInfoApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RichTextEditor } from '@/components/editors/RichTextEditor';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Globe, Upload, X, Copy } from 'lucide-react';
import type { Location, LocationEmail } from '@/lib/types';
import { EmailsRepeater } from './components/EmailsRepeater';
import { EventsTab } from './components/EventsTab';

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_LANGS = ['it', 'en', 'es', 'fr', 'pl', 'pt'] as const;

// Stable empty reference: avoids React #185 (infinite render loop) when the query
// is disabled (new mode → data undefined) and a fresh `[]` would change each render.
const EMPTY_ROWS: Location[] = [];

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
  const [infoImages, setInfoImages] = useState<string[]>([]);
  const [copySource, setCopySource] = useState('');
  const [uploadingInfo, setUploadingInfo] = useState(false);
  // Tracks unsaved edits in the non-RHF controlled bits (emails / info body / info images).
  const [extraDirty, setExtraDirty] = useState(false);

  // ── Fetch all language rows for this slug (edit mode) ──────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['location', slugParam],
    queryFn: () => locationsApi.getBySlug(slugParam!),
    enabled: isEdit,
  });
  const locationRows = data ?? EMPTY_ROWS;

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
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { is_published: true },
  });

  const isPublished = watch('is_published');
  const slugValue = watch('slug');
  const dirty = isDirty || extraDirty;

  // ── Populate form when selectedLang or locationRows changes ───────────────
  useEffect(() => {
    const row = langMap.get(selectedLang);
    if (row) {
      reset({
        name: row.name,
        slug: row.slug,
        city: row.city ?? '',
        address: row.address ?? '',
        latitude: row.latitude ?? null,
        longitude: row.longitude ?? null,
        phone: row.phone ?? '',
        intro: row.intro ?? '',
        is_published: row.is_published,
      });
      setEmails(Array.isArray(row.emails) ? row.emails : []);
      setInfoBody(row.location_info?.[0]?.body ?? '');
      setInfoImages(row.location_info?.[0]?.images ?? []);
    } else if (isEdit) {
      // Language not yet created: keep slug fixed, blank the rest.
      reset({
        name: '',
        slug: locationRows[0]?.slug ?? '',
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
      setInfoImages([]);
    } else {
      // New mode.
      reset({ is_published: true });
      setEmails([]);
      setInfoBody('');
      setInfoImages([]);
    }
    setExtraDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLang, locationRows]);

  // ── Unsaved-changes guard ──────────────────────────────────────────────────
  const confirmIfDirty = () =>
    !dirty || window.confirm('Hai modifiche non salvate in questa lingua. Continuare e perderle?');

  const switchLang = (l: string) => {
    if (l === selectedLang) return;
    if (confirmIfDirty()) setSelectedLang(l);
  };

  const goToList = () => {
    if (confirmIfDirty()) navigate('/locations');
  };

  // ── Copy all fields from another language (base for translation) ───────────
  const sourceLangs = Array.from(presentLangs);
  const effectiveSource = copySource || sourceLangs[0];

  const handleCopyFrom = () => {
    const src = langMap.get(effectiveSource);
    if (!src) return;
    setValue('name', src.name, { shouldDirty: true });
    setValue('city', src.city ?? '', { shouldDirty: true });
    setValue('address', src.address ?? '', { shouldDirty: true });
    setValue('latitude', src.latitude ?? null, { shouldDirty: true });
    setValue('longitude', src.longitude ?? null, { shouldDirty: true });
    setValue('phone', src.phone ?? '', { shouldDirty: true });
    setValue('intro', src.intro ?? '', { shouldDirty: true });
    setValue('is_published', src.is_published, { shouldDirty: true });
    setEmails(Array.isArray(src.emails) ? src.emails : []);
    setInfoBody(src.location_info?.[0]?.body ?? '');
    setInfoImages(src.location_info?.[0]?.images ?? []);
    setExtraDirty(true);
    toast({
      title: 'Dati copiati',
      description: `Copiati da "${effectiveSource.toUpperCase()}". Traduci i testi e salva.`,
    });
  };

  // ── Info images upload ──────────────────────────────────────────────────────
  const handleInfoImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!slugValue) {
      toast({ title: 'Errore', description: 'Inserisci prima lo slug', variant: 'destructive' });
      return;
    }
    setUploadingInfo(true);
    try {
      const url = await locationsApi.uploadImage(file, slugValue);
      setInfoImages((prev) => [...prev, url]);
      setExtraDirty(true);
    } catch (err) {
      toast({ title: 'Errore', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setUploadingInfo(false);
    }
  };

  const removeInfoImage = (url: string) => {
    setInfoImages((prev) => prev.filter((u) => u !== url));
    setExtraDirty(true);
  };

  // ── Save mutation ─────────────────────────────────────────────────────────
  const save = useMutation({
    mutationFn: async (formData: FormData) => {
      const exists = langMap.get(selectedLang);
      const payload = {
        name: formData.name,
        slug: formData.slug,
        lang: selectedLang,
        city: formData.city ?? null,
        address: formData.address ?? null,
        latitude: formData.latitude ?? null,
        longitude: formData.longitude ?? null,
        phone: formData.phone ?? null,
        intro: formData.intro ?? null,
        is_published: formData.is_published ?? true,
        emails,
      };
      const loc = exists
        ? await locationsApi.update(exists.id, payload)
        : await locationsApi.create(payload);

      // Save the single "info statica" row (body + images).
      const existingInfo = exists?.location_info?.[0];
      if (existingInfo) {
        await locationInfoApi.update(existingInfo.id, { body: infoBody, images: infoImages });
      } else {
        await locationInfoApi.create(loc.id, { body: infoBody, images: infoImages, position: 0 });
      }
      return loc;
    },
    onSuccess: (loc) => {
      setExtraDirty(false);
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['location', loc.slug] });
      toast({ title: 'Salvato', description: `Lingua "${selectedLang}" salvata` });
      if (!isEdit) {
        // New mode: navigate to the edit page so the user can add more languages/events.
        navigate('/locations/' + loc.slug);
      }
      // Edit mode: stay on page — user switches language to fill other translations.
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={goToList}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-brown-900">{pageTitle}</h1>
          {isEdit && <p className="text-sm text-muted-foreground">{slugParam}</p>}
        </div>
      </div>

      {/* ── Language selector ── */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Lingua</span>
        </div>
        {isEdit ? (
          <>
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
                    onClick={() => switchLang(l)}
                  >
                    {l.toUpperCase()}
                    {exists && !active && (
                      <span className="ml-1 h-1.5 w-1.5 rounded-full bg-brown-500 inline-block" />
                    )}
                  </Button>
                );
              })}
            </div>
            {!presentLangs.has(selectedLang) && (
              <div className="mt-1 space-y-2">
                <p className="text-xs text-amber-600">
                  Questa lingua non esiste ancora — verrà creata al salvataggio.
                </p>
                {sourceLangs.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Copia dati da</span>
                    <select
                      value={effectiveSource}
                      onChange={(e) => setCopySource(e.target.value)}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {sourceLangs.map((l) => (
                        <option key={l} value={l}>
                          {l.toUpperCase()}
                        </option>
                      ))}
                    </select>
                    <Button type="button" size="sm" variant="outline" onClick={handleCopyFrom}>
                      <Copy className="mr-1 h-3.5 w-3.5" /> Copia
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <select
            value={selectedLang}
            onChange={(e) => setSelectedLang(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {ALL_LANGS.map((l) => (
              <option key={l} value={l}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* ── Tabs + form ── */}
      <form onSubmit={handleSubmit((d) => save.mutate(d))}>
        <Tabs defaultValue="dati">
          <TabsList>
            <TabsTrigger value="dati">Dati del luogo</TabsTrigger>
            <TabsTrigger value="info">Info statiche</TabsTrigger>
            <TabsTrigger value="attivita">Attività</TabsTrigger>
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
                    onCheckedChange={(v) => setValue('is_published', v, { shouldDirty: true })}
                  />
                  <Label className="cursor-pointer">Pubblicato</Label>
                </div>

                {/* Emails / Contacts */}
                <div className="space-y-2">
                  <Label>Contatti email</Label>
                  <EmailsRepeater
                    emails={emails}
                    onChange={(v) => {
                      setEmails(v);
                      setExtraDirty(true);
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab 2: Info statiche ── */}
          <TabsContent value="info">
            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-1.5">
                  <Label>Orari e info ricorrenti</Label>
                  <p className="text-xs text-muted-foreground">
                    Es. orari delle messe, recapiti, indicazioni. Usa l'editor per grassetto,
                    elenchi e link.
                  </p>
                  <RichTextEditor
                    content={infoBody}
                    onChange={(v) => {
                      setInfoBody(v);
                      setExtraDirty(true);
                    }}
                  />
                </div>

                {/* Info images */}
                <div className="space-y-2">
                  <Label>Immagini info (opzionale)</Label>
                  <p className="text-xs text-muted-foreground">
                    Mostrate nell'app pubblica accanto al testo, quando il luogo non ha volantini.
                  </p>
                  {infoImages.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {infoImages.map((url) => (
                        <div key={url} className="relative">
                          <img
                            src={url}
                            alt=""
                            className="h-20 w-20 object-cover rounded border"
                          />
                          <button
                            type="button"
                            onClick={() => removeInfoImage(url)}
                            className="absolute -top-2 -right-2 bg-white rounded-full border shadow p-0.5 hover:bg-red-50"
                            aria-label="Rimuovi immagine"
                          >
                            <X className="h-3.5 w-3.5 text-red-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="inline-flex items-center gap-2 text-sm cursor-pointer text-brown-700">
                    <Upload className="h-4 w-4" />
                    {uploadingInfo ? 'Caricamento...' : 'Aggiungi immagine'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingInfo}
                      onChange={handleInfoImageUpload}
                    />
                  </label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab 3: Attività (events) ── */}
          <TabsContent value="attivita">
            <Card>
              <CardContent className="pt-6">
                {isEdit ? (
                  <EventsTab slug={slugParam!} lang={selectedLang} />
                ) : (
                  <div className="space-y-3 text-sm">
                    <div className="flex gap-3 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                      <div className="space-y-1">
                        <p>
                          <span className="font-semibold text-blue-700">Volantini</span> — immagini
                          in carosello, valide per tutte le lingue.
                        </p>
                        <p>
                          <span className="font-semibold text-green-700">Eventi testuali</span> —
                          testo descrittivo, specifici per lingua.
                        </p>
                      </div>
                    </div>
                    <p className="text-muted-foreground">
                      Salva prima il luogo (tab <strong>Dati del luogo</strong>) per aggiungere
                      volantini ed eventi.
                    </p>
                  </div>
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
          <Button type="button" variant="outline" onClick={goToList}>
            Torna alla lista
          </Button>
        </div>
      </form>
    </div>
  );
}
