import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { gospelDailyApi, gospelsApi, commentSectionsApi, mediaApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RichTextEditor } from "@/components/editors/RichTextEditor";
import { GospelSelector } from "@/components/forms/GospelSelector";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Plus, Trash2, Video, Loader2, BookOpen, Users, Sparkles } from "lucide-react";

const schema = z.object({
  date: z.string().min(1, "Data richiesta"),
  gospel_id: z.number().min(1, "Seleziona un vangelo"),
  saints: z.string().min(1, "Santo del giorno richiesto"),
  liturgical_season: z.string().optional(),
  sacred_texts: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function GospelDailyCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [mainComment, setMainComment] = useState("");
  const [extraComment, setExtraComment] = useState("");
  const [videoUrls, setVideoUrls] = useState<string[]>([""]);
  const [selectedGospelId, setSelectedGospelId] = useState<number>(0);

  const { data: gospels = [] } = useQuery({
    queryKey: ["gospels"],
    queryFn: gospelsApi.getAll,
  });

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { gospel_id: 0 }
  });

  const handleGospelChange = (gospelId: number) => {
    setSelectedGospelId(gospelId);
    setValue("gospel_id", gospelId);
  };

  const addVideoUrl = () => setVideoUrls([...videoUrls, ""]);
  const removeVideoUrl = (index: number) => setVideoUrls(videoUrls.filter((_, i) => i !== index));
  const updateVideoUrl = (index: number, value: string) => {
    const newUrls = [...videoUrls];
    newUrls[index] = value;
    setVideoUrls(newUrls);
  };

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const daily = await gospelDailyApi.create(data);

      if (mainComment.trim()) {
        await commentSectionsApi.create(daily.id, {
          section_type: "main",
          title: "Commento",
          content: mainComment,
          content_format: "html",
          sort_order: 0,
        });
      }

      if (extraComment.trim()) {
        await commentSectionsApi.create(daily.id, {
          section_type: "reflection",
          title: "Riflessione",
          content: extraComment,
          content_format: "html",
          sort_order: 1,
        });
      }

      for (const url of videoUrls.filter(u => u.trim())) {
        await mediaApi.create(daily.id, { type: "video", url: url.trim(), title: "Video" });
      }

      return daily;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gospel-daily"] });
      toast({ title: "Successo", description: "Via del Vangelo creata" });
      navigate("/gospel-daily");
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/gospel-daily")}
          className="hover:bg-brown-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-brown-900">Nuova Via del Vangelo</h1>
          <p className="text-muted-foreground mt-1">Crea un nuovo contenuto giornaliero</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(data => createMutation.mutate(data))} className="space-y-6">
        {/* Info Base + Vangelo */}
        <div className="grid gap-6 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="shadow-sm hover:shadow-md transition-shadow h-full">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-brown-800">
                  <Users className="h-5 w-5" />
                  Informazioni Base
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Data *</Label>
                  <Input
                    id="date"
                    type="date"
                    {...register("date")}
                    className={`transition-all ${errors.date ? "border-red-500" : ""}`}
                  />
                  {errors.date && <p className="text-red-500 text-sm">{errors.date.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="saints">Santo del Giorno *</Label>
                  <Input
                    id="saints"
                    {...register("saints")}
                    placeholder="Es. San Giovanni Battista"
                    className={`transition-all ${errors.saints ? "border-red-500" : ""}`}
                  />
                  {errors.saints && <p className="text-red-500 text-sm">{errors.saints.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="liturgical_season">Stagione Liturgica</Label>
                  <Input
                    id="liturgical_season"
                    {...register("liturgical_season")}
                    placeholder="Es. II Domenica di Avvento"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sacred_texts">Testi Sacri di Riferimento</Label>
                  <Textarea
                    id="sacred_texts"
                    {...register("sacred_texts")}
                    placeholder="Es. Is 40,1-11; Sal 84; 2Pt 3,8-14"
                    rows={2}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Inserisci i riferimenti alle letture del giorno
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="shadow-sm hover:shadow-md transition-shadow h-full">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-brown-800">
                  <BookOpen className="h-5 w-5" />
                  Selezione Vangelo *
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GospelSelector
                  gospels={gospels}
                  value={selectedGospelId}
                  onChange={handleGospelChange}
                  error={errors.gospel_id?.message}
                />
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Commento Principale */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-brown-800">
                <Sparkles className="h-5 w-5" />
                Commento Principale
              </CardTitle>
              <CardDescription>
                Il commento principale che accompagna il vangelo del giorno
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RichTextEditor content={mainComment} onChange={setMainComment} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Riflessione Extra */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <CardTitle className="text-brown-800">Riflessione / Contenuto Extra</CardTitle>
              <CardDescription>
                Una riflessione aggiuntiva o contenuto supplementare (opzionale)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RichTextEditor content={extraComment} onChange={setExtraComment} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Video Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-brown-800">
                <Video className="h-5 w-5" />
                Link Video
              </CardTitle>
              <CardDescription>
                Aggiungi link a video YouTube (opzionale)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {videoUrls.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={url}
                    onChange={(e) => updateVideoUrl(index, e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="flex-1"
                  />
                  {videoUrls.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeVideoUrl(index)}
                      className="text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addVideoUrl}
                className="hover:bg-brown-50"
              >
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi Video
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="flex gap-3 pt-4"
        >
          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="bg-gold-500 hover:bg-gold-400 text-white shadow-sm hover:shadow-md transition-all"
          >
            {createMutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvataggio...</>
            ) : (
              <><Save className="mr-2 h-4 w-4" />Salva Bozza</>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/gospel-daily")}
            className="hover:bg-brown-50"
          >
            Annulla
          </Button>
        </motion.div>
      </form>
    </motion.div>
  );
}
