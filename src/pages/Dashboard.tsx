import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { gospelDailyApi, gospelsApi, seedsApi, locationsApi, eventsApi, collaboratorsApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  BookOpen,
  Sprout,
  Plus,
  ArrowRight,
  Sparkles,
  Clock,
  MessageSquare,
  MapPin,
  Users
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export function Dashboard() {
  // Counts efficienti (solo HEAD request, no dati)
  const { data: gospelDailyCount = 0 } = useQuery({
    queryKey: ['gospel-daily-count'],
    queryFn: gospelDailyApi.getCount,
  });

  const { data: gospelsCount = 0 } = useQuery({
    queryKey: ['gospels-count'],
    queryFn: gospelsApi.getCount,
  });

  const { data: seedsCounts = { total: 0, active: 0 } } = useQuery({
    queryKey: ['seeds-counts'],
    queryFn: seedsApi.getCounts,
  });

  const { data: totalComments = 0 } = useQuery({
    queryKey: ['comments-count'],
    queryFn: gospelDailyApi.getTotalCommentsCount,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationsApi.getAll('it'),
  });

  const { data: eventCounts = {} } = useQuery({
    queryKey: ['event-counts'],
    queryFn: () => eventsApi.getCountsBySlug(),
  });

  const { data: collaborators = [] } = useQuery({
    queryKey: ['collaborators'],
    queryFn: () => collaboratorsApi.list(),
  });

  const attivitaCount = Object.values(eventCounts).reduce((sum, n) => sum + n, 0);

  // Solo i dati recenti per la lista (limit 5)
  const { data: recentDailies = [], isLoading: loadingDaily } = useQuery({
    queryKey: ['gospel-daily-recent'],
    queryFn: () => gospelDailyApi.getRecentWithComments(5),
  });

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brown-900">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Panoramica dei contenuti Via del Vangelo
          </p>
        </div>
        <Button asChild className="bg-brown-600 hover:bg-brown-700 shadow-sm hover:shadow-md transition-all">
          <Link to="/gospel-daily/new">
            <Plus className="mr-2 h-4 w-4" />
            Nuova Via del Vangelo
          </Link>
        </Button>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-l-4 border-l-brown-500">
          <div className="absolute inset-0 bg-gradient-to-br from-brown-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vie del Vangelo</CardTitle>
            <div className="p-2 rounded-lg bg-brown-100 text-brown-600 group-hover:scale-110 transition-transform">
              <Calendar className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-brown-900">{gospelDailyCount}</div>
            <p className="text-xs text-muted-foreground mt-2">
              <span className="text-brown-600 font-medium">{totalComments}</span> commenti totali
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vangeli</CardTitle>
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600 group-hover:scale-110 transition-transform">
              <BookOpen className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-brown-900">{gospelsCount}</div>
            <p className="text-xs text-muted-foreground mt-2">Testi disponibili nel database</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-l-4 border-l-green-500">
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Semini</CardTitle>
            <div className="p-2 rounded-lg bg-green-100 text-green-600 group-hover:scale-110 transition-transform">
              <Sprout className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-brown-900">{seedsCounts.total}</div>
            <p className="text-xs text-muted-foreground mt-2">
              <span className="text-green-600 font-medium">{seedsCounts.active}</span> attivi su {seedsCounts.total}
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-l-4 border-l-purple-500">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Commenti</CardTitle>
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600 group-hover:scale-110 transition-transform">
              <MessageSquare className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-brown-900">{totalComments}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Commenti e riflessioni scritte
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-l-4 border-l-amber-500">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Luoghi</CardTitle>
            <div className="p-2 rounded-lg bg-amber-100 text-amber-600 group-hover:scale-110 transition-transform">
              <MapPin className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-brown-900">{locations.length}</div>
            <p className="text-xs text-muted-foreground mt-2">
              <span className="text-amber-600 font-medium">{attivitaCount}</span> attività e volantini
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-l-4 border-l-teal-500">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collaboratori</CardTitle>
            <div className="p-2 rounded-lg bg-teal-100 text-teal-600 group-hover:scale-110 transition-transform">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-brown-900">{collaborators.length}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Gestiscono i luoghi assegnati
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-brown-600" />
                    Attività Recente
                  </CardTitle>
                  <CardDescription>Ultimi contenuti modificati</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild className="text-brown-600 hover:text-brown-700 hover:bg-brown-50">
                  <Link to="/gospel-daily">
                    Vedi tutti
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingDaily ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-16 bg-muted/50 animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : recentDailies.length > 0 ? (
                <div className="space-y-2">
                  {recentDailies.map((daily, index) => (
                    <motion.div
                      key={daily.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        to={`/gospel-daily/${daily.id}`}
                        className="flex items-center justify-between p-4 rounded-lg border border-transparent hover:border-brown-200 hover:bg-brown-50/50 transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-brown-100 to-brown-200 flex items-center justify-center text-brown-700 font-bold text-sm">
                            {new Date(daily.date).getDate()}
                          </div>
                          <div>
                            <p className="font-medium text-brown-900 group-hover:text-brown-700">
                              {formatDate(daily.date)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {daily.gospel?.reference || 'Vangelo non assegnato'}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brown-100 flex items-center justify-center">
                    <Calendar className="h-8 w-8 text-brown-400" />
                  </div>
                  <p className="text-muted-foreground">Nessuna via del vangelo creata</p>
                  <Button asChild className="mt-4" variant="outline">
                    <Link to="/gospel-daily/new">Crea la prima</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-sm hover:shadow-md transition-shadow h-full">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-brown-600" />
                Azioni Rapide
              </CardTitle>
              <CardDescription>Operazioni comuni</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link
                to="/gospel-daily/new"
                className="flex items-center gap-3 p-4 rounded-lg border-2 border-dashed border-brown-200 hover:border-brown-400 hover:bg-brown-50 transition-all group"
              >
                <div className="p-2 rounded-lg bg-brown-100 text-brown-600 group-hover:bg-brown-200 transition-colors">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-brown-900">Nuova Via del Vangelo</p>
                  <p className="text-xs text-muted-foreground">Crea contenuto giornaliero</p>
                </div>
              </Link>

              <Link
                to="/gospels/new"
                className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
              >
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-200 transition-colors">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-brown-900">Nuovo Vangelo</p>
                  <p className="text-xs text-muted-foreground">Aggiungi testo sacro</p>
                </div>
              </Link>

              <Link
                to="/seeds/new"
                className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50/50 transition-all group"
              >
                <div className="p-2 rounded-lg bg-green-100 text-green-600 group-hover:bg-green-200 transition-colors">
                  <Sprout className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-brown-900">Nuovo Semino</p>
                  <p className="text-xs text-muted-foreground">Aggiungi versetto</p>
                </div>
              </Link>

              <Link
                to="/collaboratori"
                className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-teal-300 hover:bg-teal-50/50 transition-all group"
              >
                <div className="p-2 rounded-lg bg-teal-100 text-teal-600 group-hover:bg-teal-200 transition-colors">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-brown-900">Invita collaboratore</p>
                  <p className="text-xs text-muted-foreground">Assegna luoghi a un aiutante</p>
                </div>
              </Link>

              <div className="pt-4 border-t mt-4">
                <p className="text-xs text-muted-foreground mb-3">Vai alle sezioni</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild className="hover:bg-brown-50">
                    <Link to="/gospels">Vangeli</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild className="hover:bg-brown-50">
                    <Link to="/gospel-daily">Via del Vangelo</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild className="hover:bg-brown-50">
                    <Link to="/seeds">Semini</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild className="hover:bg-brown-50">
                    <Link to="/locations">Luoghi</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild className="hover:bg-brown-50">
                    <Link to="/collaboratori">Collaboratori</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
