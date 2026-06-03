import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { seedsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save } from 'lucide-react';
import { useEffect } from 'react';

const schema = z.object({
  verse_text: z.string().min(1, 'Testo versetto richiesto'),
  reference: z.string().optional(),
  category: z.string().optional(),
  is_active: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

export function SeedCreate() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const { data: seed } = useQuery({
    queryKey: ['seed', id],
    queryFn: () => seedsApi.getById(Number(id)),
    enabled: isEdit,
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { is_active: true },
  });

  const isActive = watch('is_active');

  useEffect(() => {
    if (seed) {
      setValue('verse_text', seed.verse_text);
      setValue('reference', seed.reference || '');
      setValue('category', seed.category || '');
      setValue('is_active', seed.is_active);
    }
  }, [seed, setValue]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => isEdit ? seedsApi.update(Number(id), data) : seedsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seeds'] });
      toast({ title: 'Successo', description: isEdit ? 'Semino aggiornato' : 'Semino creato' });
      navigate('/seeds');
    },
    onError: (error: Error) => { toast({ title: 'Errore', description: error.message, variant: 'destructive' }); },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/seeds')}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-3xl font-bold text-mdv-darkest">{isEdit ? 'Modifica' : 'Nuovo'} Semino</h1>
          <p className="text-muted-foreground mt-1">{isEdit ? 'Modifica il versetto' : 'Aggiungi un nuovo versetto'}</p>
        </div>
      </div>
      <form onSubmit={handleSubmit(data => mutation.mutate(data))} className="space-y-6 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader><CardTitle>Informazioni Semino</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verse_text">Testo Versetto *</Label>
                <Textarea
                  id="verse_text"
                  {...register('verse_text')}
                  rows={6}
                  placeholder="Inserisci il testo del versetto..."
                  className={`transition-all duration-200 resize-none ${errors.verse_text ? 'border-red-500 focus:ring-red-500' : 'focus:ring-brown-500'}`}
                />
                {errors.verse_text && <p className="text-red-500 text-sm">{errors.verse_text.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference">Riferimento</Label>
                <Input
                  id="reference"
                  {...register('reference')}
                  placeholder="Es. Gv 14,6"
                  className="transition-all duration-200 focus:ring-brown-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  {...register('category')}
                  placeholder="Es. Comandamenti, Beatitudini..."
                  className="transition-all duration-200 focus:ring-brown-500"
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Switch checked={isActive} onCheckedChange={v => setValue('is_active', v)} />
                <Label className="cursor-pointer">Attivo</Label>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex justify-center gap-4"
        >
          <Button type="submit" disabled={mutation.isPending} className="bg-brown-600 hover:bg-brown-700 transition-colors">
            <Save className="mr-2 h-4 w-4" />{mutation.isPending ? 'Salvataggio...' : 'Salva'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/seeds')} className="hover:bg-brown-50 transition-colors">Annulla</Button>
        </motion.div>
      </form>
    </motion.div>
  );
}
