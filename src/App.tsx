import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { GospelDailyList } from '@/pages/gospel-daily/GospelDailyList';
import { GospelDailyCreate } from '@/pages/gospel-daily/GospelDailyCreate';
import { GospelDailyEdit } from '@/pages/gospel-daily/GospelDailyEdit';
import { GospelList } from '@/pages/gospels/GospelList';
import { GospelCreate } from '@/pages/gospels/GospelCreate';
import { SeedList } from '@/pages/seeds/SeedList';
import { SeedCreate } from '@/pages/seeds/SeedCreate';
import { LocationList } from '@/pages/locations/LocationList';
import { LocationEdit } from '@/pages/locations/LocationEdit';
import { ChangePassword } from '@/pages/ChangePassword';
import { Toaster } from '@/components/ui/toaster';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

function ProtectedRoute() {
  const { user, loading, mustChangePassword } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brown-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-brown-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-brown-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (mustChangePassword) return <Navigate to="/cambio-password" replace />;

  return <Outlet />;
}

function PublicRoute() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  return <Outlet />;
}

function RequireUser({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
          </Route>

          <Route
            path="/cambio-password"
            element={<RequireUser><ChangePassword /></RequireUser>}
          />

          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/gospel-daily" element={<GospelDailyList />} />
              <Route path="/gospel-daily/new" element={<GospelDailyCreate />} />
              <Route path="/gospel-daily/:id" element={<GospelDailyEdit />} />
              <Route path="/gospels" element={<GospelList />} />
              <Route path="/gospels/new" element={<GospelCreate />} />
              <Route path="/gospels/:id" element={<GospelCreate />} />
              <Route path="/seeds" element={<SeedList />} />
              <Route path="/seeds/new" element={<SeedCreate />} />
              <Route path="/seeds/:id" element={<SeedCreate />} />
              <Route path="/locations" element={<LocationList />} />
              <Route path="/locations/new" element={<LocationEdit />} />
              <Route path="/locations/:slug" element={<LocationEdit />} />
            </Route>
          </Route>
        </Routes>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
