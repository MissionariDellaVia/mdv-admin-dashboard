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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Plus, Trash2, Upload } from 'lucide-react';
import type { LocationInfo } from '@/lib/types';

const schema = z.object({
  name: z.string().min(1, 'Nome richiesto'),
  slug: z.string().min(1, 'Slug richiesto').regex(/^[a-z0-9-]+$/, 'Solo minuscole, numeri e trattini'),
  lang: z.string().min(2),
  address: z.string().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  intro: z.string().optional(),
  is_published: z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

export function LocationEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!id;
  const [infos, setInfos] = useState<Array<Partial<LocationInfo>>>([]);

  const { data: location } = useQuery({
    queryKey: ['location', id],
    queryFn: () => locationsApi.getById(Number(id)),
    enabled: isEdit,
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { lang: 'it', is_published: true },
  });
  const isPublished = watch('is_published');

  useEffect(() => {
    if (location) {
      setValue('name', location.name);
      setValue('slug', location.slug);
      setValue('lang', location.lang);
      setValue('address', location.address || '');
      setValue('latitude', location.latitude);
      setValue('longitude', location.longitude);
      setValue('intro', location.intro || '');
      setValue('is_published', location.is_published);
      setInfos((location.location_info || []).slice().sort((a, b) => a.position - b.position));
    }
  }, [location, setValue]);

  const save = useMutation({
    mutationFn: async (data: FormData) => {
      const loc = isEdit ? await locationsApi.update(Number(id), data) : await locationsApi.create(data);
      const existing = location?.location_info || [];
      for (const e of existing) await locationInfoApi.delete(e.id);
      for (let i = 0; i < infos.length; i++) {
        await locationInfoApi.create(loc.id, {
          title: infos[i].title ?? null, body: infos[i].body ?? '', images: infos[i].images ?? [], position: i,
        });
      }
      return loc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast({ title: 'Salvato', description: 'Luogo salvato' });
      navigate('/locations');
    },
    onError: (e: Error) => toast({ title: 'Errore', description: e.message, variant: 'destructive' }),
  });

  const addInfo = () => setInfos((p) => [...p, { title: '', body: '', images: [] }]);
  const removeInfo = (i: number) => setInfos((p) => p.filter((_, idx) => idx !== i));
  const setInfoField = (i: number, field: 'title' | 'body', val: string) =>
    setInfos((p) => p.map((info, idx) => (idx === i ? { ...info, [field]: val } : info)));

  const uploadToInfo = async (i: number, file: File) => {
    try {
      const slug = watch('slug') || 'misc';
      const url = await locationsApi.uploadImage(file, slug);
      setInfos((p) => p.map((info, idx) => (idx === i ? { ...info, images: [...(info.images || []), url] } : info)));
      toast({ title: 'Caricata', description: 'Immagine caricata' });
    } catch (e) {
      toast({ title: 'Errore upload', description: (e as Error).message, variant: 'destructive' });
    }
  };
  const removeImage = (i: number, url: string) =>
    setInfos((p) => p.map((info, idx) => (idx === i ? { ...info, images: (info.images || []).filter((u) => u !== url) } : info)));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/locations')}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-3xl font-bold text-brown-900">{isEdit ? 'Modifica' : 'Nuovo'} Luogo</h1>
      </div>

      <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-6 max-w-3xl">
        <Card>
          <CardHeader><CardTitle>Dati del luogo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" {...register('name')} placeholder="Es. Santuario Madonna della Catena" />
              {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input id="slug" {...register('slug')} placeholder="madonna-dc" />
                {errors.slug && <p className="text-red-500 text-sm">{errors.slug.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lang">Lingua *</Label>
                <Input id="lang" {...register('lang')} placeholder="it" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Indirizzo</Label>
              <Input id="address" {...register('address')} placeholder="Cassano all'Ionio (CS)" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitudine</Label>
                <Input id="latitude" type="number" step="any" {...register('latitude', { setValueAs: (v) => (v === '' || v === null || v === undefined ? null : Number(v)) })} placeholder="39.79" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitudine</Label>
                <Input id="longitude" type="number" step="any" {...register('longitude', { setValueAs: (v) => (v === '' || v === null || v === undefined ? null : Number(v)) })} placeholder="16.32" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="intro">Introduzione</Label>
              <Textarea id="intro" {...register('intro')} rows={3} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={isPublished} onCheckedChange={(v) => setValue('is_published', v)} />
              <Label className="cursor-pointer">Pubblicato</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Info / Sezioni</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addInfo}><Plus className="mr-1 h-4 w-4" /> Aggiungi</Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {infos.length === 0 && <p className="text-sm text-muted-foreground">Nessuna sezione.</p>}
            {infos.map((info, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Sezione {i + 1}</span>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeInfo(i)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </div>
                <Input value={info.title || ''} onChange={(e) => setInfoField(i, 'title', e.target.value)} placeholder="Titolo (opzionale)" />
                <Textarea value={info.body || ''} onChange={(e) => setInfoField(i, 'body', e.target.value)} rows={5} placeholder="Contenuto HTML (es. <ul><li>...</li></ul>)" />
                <div className="flex flex-wrap gap-2">
                  {(info.images || []).map((url) => (
                    <div key={url} className="relative">
                      <img src={url} alt="" className="h-16 w-16 object-cover rounded border" />
                      <button type="button" onClick={() => removeImage(i, url)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs">×</button>
                    </div>
                  ))}
                </div>
                <label className="inline-flex items-center gap-2 text-sm cursor-pointer text-brown-700">
                  <Upload className="h-4 w-4" /> Carica immagine
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadToInfo(i, f); e.target.value = ''; }} />
                </label>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={save.isPending} className="bg-brown-600 hover:bg-brown-700">
            <Save className="mr-2 h-4 w-4" /> {save.isPending ? 'Salvataggio...' : 'Salva'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/locations')}>Annulla</Button>
        </div>
      </form>
    </div>
  );
}
