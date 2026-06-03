import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { locationsApi, locationInfoApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { RichTextEditor } from '@/components/editors/RichTextEditor';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Upload, X } from 'lucide-react';
import type { Location, LocationEmail } from '@/lib/types';
import { EmailsRepeater } from './components/EmailsRepeater';
import { EventsTab } from './components/EventsTab';

// ─── Constants ────────────────────────────────────────────────────────────────

// Le location si gestiscono solo in italiano: le altre lingue sono tradotte
// automaticamente dall'edge function. Vedi docs/superpowers/specs.
const LANG = 'it';

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

  const { isAdmin, allowedSlugs, loading: authLoading } = useAuth();
  const canEditAnagrafica = isAdmin; // i collaboratori vedono i Dati in sola lettura

  const [emails, setEmails] = useState<LocationEmail[]>([]);
  const [infoBody, setInfoBody] = useState('');
  const [infoImages, setInfoImages] = useState<string[]>([]);
  const [uploadingInfo, setUploadingInfo] = useState(false);
  // Tracks unsaved edits in the non-RHF controlled bits (emails / info body / info images).
  const [extraDirty, setExtraDirty] = useState(false);
  const [tab, setTab] = useState<'dati' | 'info' | 'attivita'>('dati');

  // ── Fetch the location rows for this slug (edit mode) ──────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['location', slugParam],
    queryFn: () => locationsApi.getBySlug(slugParam!),
    enabled: isEdit,
  });
  const locationRows = data ?? EMPTY_ROWS;
  const itRow = locationRows.find((r) => r.lang === LANG);

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

  // ── Populate form from the IT row ──────────────────────────────────────────
  useEffect(() => {
    if (itRow) {
      reset({
        name: itRow.name,
        slug: itRow.slug,
        city: itRow.city ?? '',
        address: itRow.address ?? '',
        latitude: itRow.latitude ?? null,
        longitude: itRow.longitude ?? null,
        phone: itRow.phone ?? '',
        intro: itRow.intro ?? '',
        is_published: itRow.is_published,
      });
      setEmails(Array.isArray(itRow.emails) ? itRow.emails : []);
      setInfoBody(itRow.location_info?.[0]?.body ?? '');
      setInfoImages(itRow.location_info?.[0]?.images ?? []);
    } else if (isEdit) {
      // Slug exists but has no IT row yet (legacy): keep slug, blank the rest.
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
      reset({ is_published: true });
      setEmails([]);
      setInfoBody('');
      setInfoImages([]);
    }
    setExtraDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationRows]);

  // ── Foreign-slug guard: collaborators can only access their allowed slugs ──
  useEffect(() => {
    if (!authLoading && !isAdmin && isEdit && slugParam && !allowedSlugs.includes(slugParam)) {
      navigate('/locations');
    }
  }, [authLoading, isAdmin, allowedSlugs, isEdit, slugParam, navigate]);

  // ── Unsaved-changes guard ──────────────────────────────────────────────────
  const goToList = () => {
    if (!dirty || window.confirm('Hai modifiche non salvate. Uscire e perderle?')) {
      navigate('/locations');
    }
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
      const uploadedUrl = await locationsApi.uploadImage(file, slugValue);
      setInfoImages((prev) => [...prev, uploadedUrl]);
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
      let loc = itRow;
      if (canEditAnagrafica) {
        const payload = {
          name: formData.name,
          slug: formData.slug,
          lang: LANG,
          city: formData.city ?? null,
          address: formData.address ?? null,
          latitude: formData.latitude ?? null,
          longitude: formData.longitude ?? null,
          phone: formData.phone ?? null,
          intro: formData.intro ?? null,
          is_published: formData.is_published ?? true,
          emails,
        };
        loc = itRow
          ? await locationsApi.update(itRow.id, payload)
          : await locationsApi.create(payload);
      }
      if (!loc) throw new Error('Luogo non trovato');

      // Save the single "info statica" row (body + images).
      const existingInfo = itRow?.location_info?.[0];
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
      toast({ title: 'Salvato' });
      if (!isEdit) navigate('/locations/' + loc.slug);
    },
    onError: (e: Error) =>
      toast({ title: 'Errore', description: e.message, variant: 'destructive' }),
  });

  const pageTitle = isEdit ? (itRow?.name ?? slugParam ?? 'Modifica Luogo') : 'Nuovo Luogo';

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

      {/* Le altre lingue sono tradotte automaticamente: qui si compila solo l'italiano. */}
      <p className="text-xs text-muted-foreground">
        Compila i contenuti in <strong>italiano</strong>. Le altre lingue vengono tradotte
        automaticamente quando l'app pubblica le richiede.
      </p>

      {/* ── Tabs + form ── */}
      <form onSubmit={handleSubmit((d) => save.mutate(d))}>
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="h-auto gap-1 rounded-full bg-brown-100/70 p-1">
            {([
              { value: 'dati', label: 'Dati del luogo' },
              { value: 'info', label: 'Info statiche' },
              { value: 'attivita', label: 'Attività' },
            ] as const).map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="relative rounded-full px-4 py-1.5 text-sm font-medium text-brown-500 transition-colors hover:text-brown-700 data-[state=active]:bg-transparent data-[state=active]:text-brown-800 data-[state=active]:shadow-none"
              >
                {tab === t.value && (
                  <motion.span
                    layoutId="loc-tab-pill"
                    className="absolute inset-0 rounded-full bg-white shadow-sm ring-1 ring-brown-200/60"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative z-10">{t.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Tab 1: Dati ── */}
          <TabsContent value="dati" className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
            <Card>
              <CardContent className="space-y-4 pt-6">
                {/* Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    {...register('name')}
                    placeholder="Es. Santuario Madonna della Catena"
                    disabled={!canEditAnagrafica}
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
                      disabled={isEdit || !canEditAnagrafica}
                      className={isEdit || !canEditAnagrafica ? 'bg-muted cursor-not-allowed' : ''}
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
                      disabled={!canEditAnagrafica}
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
                    disabled={!canEditAnagrafica}
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
                      disabled={!canEditAnagrafica}
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
                      disabled={!canEditAnagrafica}
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Telefono</Label>
                  <Input id="phone" {...register('phone')} placeholder="+39 0983 123456" disabled={!canEditAnagrafica} />
                </div>

                {/* Intro */}
                <div className="space-y-1.5">
                  <Label htmlFor="intro">Introduzione</Label>
                  <Textarea
                    id="intro"
                    {...register('intro')}
                    rows={3}
                    placeholder="Breve descrizione del luogo..."
                    disabled={!canEditAnagrafica}
                  />
                </div>

                {/* Published */}
                <div className="flex items-center gap-3">
                  <Switch
                    checked={isPublished ?? true}
                    onCheckedChange={(v) => setValue('is_published', v, { shouldDirty: true })}
                    disabled={!canEditAnagrafica}
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
                    disabled={!canEditAnagrafica}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab 2: Info statiche ── */}
          <TabsContent value="info" className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
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
          <TabsContent value="attivita" className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
            <Card>
              <CardContent className="pt-6">
                {isEdit ? (
                  <EventsTab slug={slugParam!} lang={LANG} />
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
                          testo descrittivo (tradotto automaticamente nelle altre lingue).
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
            className="bg-gold-500 hover:bg-gold-400 text-white"
          >
            <Save className="mr-2 h-4 w-4" />
            {save.isPending ? 'Salvataggio...' : 'Salva'}
          </Button>
          <Button type="button" variant="outline" onClick={goToList}>
            Torna alla lista
          </Button>
        </div>
      </form>
    </div>
  );
}
