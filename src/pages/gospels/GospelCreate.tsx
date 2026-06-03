import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { gospelsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { useEffect } from 'react';

const schema = z.object({
  reference: z.string().min(1, 'Riferimento richiesto'),
  evangelist: z.enum(['Matteo', 'Marco', 'Luca', 'Giovanni']),
  text: z.string().min(1, 'Testo richiesto'),
});

type FormData = z.infer<typeof schema>;

export function GospelCreate() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const { data: gospel, isLoading } = useQuery({
    queryKey: ['gospel', id],
    queryFn: () => gospelsApi.getById(Number(id)),
    enabled: isEdit,
  });

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      reference: '',
      evangelist: undefined,
      text: '',
    },
  });

  useEffect(() => {
    if (gospel) {
      reset({
        reference: gospel.reference,
        evangelist: gospel.evangelist,
        text: gospel.text,
      });
    }
  }, [gospel, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => isEdit ? gospelsApi.update(Number(id), data) : gospelsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gospels'] });
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: ['gospel', id] });
      }
      toast({ title: 'Successo', description: isEdit ? 'Vangelo aggiornato' : 'Vangelo creato' });
      navigate('/gospels');
    },
    onError: (error: Error) => { toast({ title: 'Errore', description: error.message, variant: 'destructive' }); },
  });

  if (isEdit && isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-brown-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/gospels')} className="hover:bg-brown-100 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-mdv-darkest">{isEdit ? 'Modifica' : 'Nuovo'} Vangelo</h1>
          <p className="text-muted-foreground mt-1">{isEdit ? 'Modifica il testo' : 'Aggiungi un nuovo testo'}</p>
        </div>
      </div>
      <form onSubmit={handleSubmit(data => mutation.mutate(data))} className="space-y-6 max-w-3xl mx-auto">
        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader><CardTitle>Informazioni Vangelo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reference">Riferimento *</Label>
              <Input
                id="reference"
                {...register('reference')}
                placeholder="Es. Mt 5,1-12"
                className={`transition-all duration-200 ${errors.reference ? 'border-red-500 focus:ring-red-500' : 'focus:ring-brown-500'}`}
              />
              {errors.reference && <p className="text-red-500 text-sm">{errors.reference.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Evangelista *</Label>
              <Controller
                name="evangelist"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className={`transition-all duration-200 ${errors.evangelist ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder="Seleziona evangelista" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Matteo">Matteo</SelectItem>
                      <SelectItem value="Marco">Marco</SelectItem>
                      <SelectItem value="Luca">Luca</SelectItem>
                      <SelectItem value="Giovanni">Giovanni</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.evangelist && <p className="text-red-500 text-sm">{errors.evangelist.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="text">Testo *</Label>
              <Textarea
                id="text"
                {...register('text')}
                rows={12}
                placeholder="Inserisci il testo del vangelo..."
                className={`transition-all duration-200 resize-none ${errors.text ? 'border-red-500 focus:ring-red-500' : 'focus:ring-brown-500'}`}
              />
              {errors.text && <p className="text-red-500 text-sm">{errors.text.message}</p>}
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-center gap-3">
          <Button type="submit" disabled={mutation.isPending} className="bg-brown-600 hover:bg-brown-700 transition-colors">
            {mutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvataggio...</>
            ) : (
              <><Save className="mr-2 h-4 w-4" />Salva</>
            )}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/gospels')} className="hover:bg-brown-50 transition-colors">
            Annulla
          </Button>
        </div>
      </form>
    </div>
  );
}
