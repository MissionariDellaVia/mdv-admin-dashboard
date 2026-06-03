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
  Users,
  BarChart3,
  CheckCircle2,
  CalendarDays
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

  // Insights queries
  const { data: commentedCount = 0 } = useQuery({
    queryKey: ['gospel-daily-commented'],
    queryFn: gospelDailyApi.getCommentedCount,
  });

  const { data: coverage = { covered: 0, total: 30 } } = useQuery({
    queryKey: ['gospel-daily-upcoming-coverage'],
    queryFn: () => gospelDailyApi.getUpcomingCoverage(30),
  });

  const { data: monthlyBuckets = [] } = useQuery({
    queryKey: ['gospel-daily-monthly'],
    queryFn: () => gospelDailyApi.getMonthlyCounts(6),
  });

  const attivitaCount = Object.values(eventCounts).reduce((sum, n) => sum + n, 0);

  // Solo i dati recenti per la lista (limit 5)
  const { data: recentDailies = [], isLoading: loadingDaily } = useQuery({
    queryKey: ['gospel-daily-recent'],
    queryFn: () => gospelDailyApi.getRecentWithComments(5),
  });

  // Bar chart helpers
  const maxCount = Math.max(1, ...monthlyBuckets.map(b => b.count));
  const toComplete = Math.max(0, gospelDailyCount - commentedCount);

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
        <Button asChild className="bg-gold-500 hover:bg-gold-400 text-white shadow-sm hover:shadow-md transition-all">
          <Link to="/gospel-daily/new">
            <Plus className="mr-2 h-4 w-4" />
            Nuova Via del Vangelo
          </Link>
        </Button>
      </motion.div>

      {/* Stats Grid — cards are now nav links */}
      <motion.div variants={itemVariants} className="grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">

        {/* Vie del Vangelo */}
        <Link to="/gospel-daily" className="group cursor-pointer">
          <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300 border-l-4 border-l-brown-500 h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-brown-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Vie del Vangelo</CardTitle>
              <div className="flex items-center gap-1">
                <div className="p-1.5 rounded-lg bg-brown-100 text-brown-600 group-hover:scale-110 transition-transform">
                  <Calendar className="h-4 w-4" />
                </div>
                <ArrowRight className="h-3 w-3 text-brown-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brown-900">{gospelDailyCount}</div>
              <p className="text-[11px] leading-tight text-muted-foreground mt-1 line-clamp-1">
                <span className="text-brown-600 font-medium">{totalComments}</span> commenti totali
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Vangeli */}
        <Link to="/gospels" className="group cursor-pointer">
          <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500 h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Vangeli</CardTitle>
              <div className="flex items-center gap-1">
                <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600 group-hover:scale-110 transition-transform">
                  <BookOpen className="h-4 w-4" />
                </div>
                <ArrowRight className="h-3 w-3 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brown-900">{gospelsCount}</div>
              <p className="text-[11px] leading-tight text-muted-foreground mt-1 line-clamp-1">Testi disponibili nel database</p>
            </CardContent>
          </Card>
        </Link>

        {/* Semini */}
        <Link to="/seeds" className="group cursor-pointer">
          <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300 border-l-4 border-l-green-500 h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Semini</CardTitle>
              <div className="flex items-center gap-1">
                <div className="p-1.5 rounded-lg bg-green-100 text-green-600 group-hover:scale-110 transition-transform">
                  <Sprout className="h-4 w-4" />
                </div>
                <ArrowRight className="h-3 w-3 text-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brown-900">{seedsCounts.total}</div>
              <p className="text-[11px] leading-tight text-muted-foreground mt-1 line-clamp-1">
                <span className="text-green-600 font-medium">{seedsCounts.active}</span> attivi su {seedsCounts.total}
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Commenti */}
        <Link to="/gospel-daily" className="group cursor-pointer">
          <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300 border-l-4 border-l-purple-500 h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Commenti</CardTitle>
              <div className="flex items-center gap-1">
                <div className="p-1.5 rounded-lg bg-purple-100 text-purple-600 group-hover:scale-110 transition-transform">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <ArrowRight className="h-3 w-3 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brown-900">{totalComments}</div>
              <p className="text-[11px] leading-tight text-muted-foreground mt-1 line-clamp-1">
                Commenti e riflessioni scritte
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Luoghi */}
        <Link to="/locations" className="group cursor-pointer">
          <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300 border-l-4 border-l-amber-500 h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Luoghi</CardTitle>
              <div className="flex items-center gap-1">
                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600 group-hover:scale-110 transition-transform">
                  <MapPin className="h-4 w-4" />
                </div>
                <ArrowRight className="h-3 w-3 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brown-900">{locations.length}</div>
              <p className="text-[11px] leading-tight text-muted-foreground mt-1 line-clamp-1">
                <span className="text-amber-600 font-medium">{attivitaCount}</span> attività e volantini
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Collaboratori */}
        <Link to="/collaboratori" className="group cursor-pointer">
          <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300 border-l-4 border-l-teal-500 h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Collaboratori</CardTitle>
              <div className="flex items-center gap-1">
                <div className="p-1.5 rounded-lg bg-teal-100 text-teal-600 group-hover:scale-110 transition-transform">
                  <Users className="h-4 w-4" />
                </div>
                <ArrowRight className="h-3 w-3 text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brown-900">{collaborators.length}</div>
              <p className="text-[11px] leading-tight text-muted-foreground mt-1 line-clamp-1">
                Gestiscono i luoghi assegnati
              </p>
            </CardContent>
          </Card>
        </Link>
      </motion.div>

      {/* Insights Row */}
      <motion.div variants={itemVariants} className="grid gap-6 lg:grid-cols-3">

        {/* Frequency bar chart — lg:col-span-2 */}
        <Card className="shadow-sm hover:shadow-md transition-shadow lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-brown-600" />
              Pubblicazioni · ultimi 6 mesi
            </CardTitle>
            <CardDescription>Frequenza di pubblicazione mensile</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-2 h-40 pt-2">
              {monthlyBuckets.map((bucket) => {
                const heightPct = Math.max(4, Math.round((bucket.count / maxCount) * 100));
                const monthLabel = new Date(bucket.month + '-01').toLocaleDateString('it-IT', { month: 'short' });
                return (
                  <div key={bucket.month} className="flex flex-col items-center gap-1 flex-1 h-full justify-end">
                    <span className="text-xs font-semibold text-brown-700 leading-none">
                      {bucket.count > 0 ? bucket.count : ''}
                    </span>
                    <div className="w-full flex items-end justify-center" style={{ height: '100px' }}>
                      <motion.div
                        className="w-full rounded-t-md bg-gradient-to-t from-brown-400 to-brown-600"
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPct}%` }}
                        transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
                        style={{ minHeight: '4px' }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground capitalize">{monthLabel}</span>
                  </div>
                );
              })}
              {monthlyBuckets.length === 0 && (
                <p className="text-sm text-muted-foreground m-auto">Nessun dato disponibile</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Two stacked insight cards — lg:col-span-1 */}
        <div className="space-y-6 lg:col-span-1">

          {/* Card 1 — Giornate da completare */}
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="h-5 w-5 text-brown-600" />
                Giornate da completare
              </CardTitle>
              <CardDescription>Via del Vangelo senza commento principale</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className={`text-5xl font-bold text-center py-1 ${toComplete === 0 ? 'text-green-600' : 'text-amber-700'}`}>
                {toComplete}
              </div>

              {/* Progress bar (completed ratio) */}
              <div className="w-full h-2.5 bg-brown-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-brown-400 to-brown-600 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round((commentedCount / Math.max(1, gospelDailyCount)) * 100)}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>

              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-brown-800">{commentedCount}</span>{' '}
                di{' '}
                <span className="font-medium text-brown-800">{gospelDailyCount}</span>{' '}
                Via del Vangelo con commento
              </p>
              <p className="text-xs text-muted-foreground">
                Una Via del Vangelo è completa con almeno un commento.
              </p>
            </CardContent>
          </Card>

          {/* Card 2 — Copertura calendario */}
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-5 w-5 text-brown-600" />
                Copertura · prossimi 30 giorni
              </CardTitle>
              <CardDescription>Giorni con una Via del Vangelo programmata</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-center py-1">
                <span className="text-5xl font-bold text-brown-900">{coverage.covered}</span>
                <span className="text-lg font-medium text-muted-foreground ml-1">su {coverage.total} giorni</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2.5 bg-brown-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-brown-400 to-brown-600 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round((coverage.covered / Math.max(1, coverage.total)) * 100)}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>

              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-brown-800">{coverage.total - coverage.covered}</span>{' '}
                giorni ancora senza Via del Vangelo
              </p>
            </CardContent>
          </Card>

        </div>
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
            </CardContent>
          </Card>
        </motion.div>
      </div>

    </motion.div>
  );
}
