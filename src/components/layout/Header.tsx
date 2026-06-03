import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu, LogOut, User, ChevronDown, ShieldCheck, Users } from 'lucide-react';
import { Sidebar } from './Sidebar';

export function Header() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isAdmin = role === 'admin';
  const roleLabel = isAdmin
    ? 'Amministratore'
    : role === 'collaborator'
      ? 'Collaboratore'
      : null;
  const RoleIcon = isAdmin ? ShieldCheck : Users;

  return (
    <>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 h-auto py-1.5 pl-1.5 pr-2 rounded-full hover:bg-brown-50"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brown-500 to-brown-700 flex items-center justify-center text-white shadow-sm">
                <User className="w-4 h-4" />
              </div>
              <span className="hidden sm:inline text-sm text-brown-900 max-w-[200px] truncate">
                {user?.email}
              </span>
              <ChevronDown className="hidden sm:inline h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 p-0 overflow-hidden">
            {/* Account header */}
            <div className="flex items-center gap-3 p-3 bg-brown-50/70">
              <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-brown-500 to-brown-700 flex items-center justify-center text-white shadow-sm">
                <User className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-brown-900 truncate">{user?.email}</p>
                {roleLabel && (
                  <span
                    className={`inline-flex items-center gap-1 mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      isAdmin ? 'bg-amber-100 text-amber-700' : 'bg-teal-100 text-teal-700'
                    }`}
                  >
                    <RoleIcon className="h-3 w-3" />
                    {roleLabel}
                  </span>
                )}
              </div>
            </div>

            <DropdownMenuSeparator className="my-0" />

            <div className="p-1">
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Esci
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
    </>
  );
}
