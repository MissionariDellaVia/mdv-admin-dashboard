import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { locationsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, MapPin } from 'lucide-react';

const LANGS = ['it', 'en', 'es', 'fr', 'pl', 'pt'];

export function LocationList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [lang, setLang] = useState('it');

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['locations', lang],
    queryFn: () => locationsApi.getAll(lang),
  });

  const del = useMutation({
    mutationFn: (id: number) => locationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast({ title: 'Eliminato', description: 'Luogo eliminato' });
    },
    onError: (e: Error) => toast({ title: 'Errore', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-brown-900">Luoghi</h1>
          <p className="text-muted-foreground mt-1">Santuari, attività e info ricorrenti</p>
        </div>
        <Button onClick={() => navigate('/locations/new')} className="bg-brown-600 hover:bg-brown-700">
          <Plus className="mr-2 h-4 w-4" /> Nuovo Luogo
        </Button>
      </div>

      <div className="flex gap-2">
        {LANGS.map((l) => (
          <Button key={l} variant={l === lang ? 'default' : 'outline'} size="sm" onClick={() => setLang(l)}>
            {l.toUpperCase()}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Caricamento...</p>
      ) : locations.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Nessun luogo per "{lang}".</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {locations.map((loc) => (
            <Card key={loc.id} className="shadow-sm">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-brown-600" />
                  <div>
                    <p className="font-semibold text-brown-900">{loc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {loc.slug} · {loc.location_info?.length ?? 0} info{loc.is_published ? '' : ' · bozza'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => navigate(`/locations/${loc.id}`)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Eliminare "${loc.name}"?`)) del.mutate(loc.id); }}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
