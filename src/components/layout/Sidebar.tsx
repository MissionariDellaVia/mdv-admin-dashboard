import { NavLink } from 'react-router-dom';
import {
  BookOpen,
  Calendar,
  Sprout,
  LayoutDashboard,
  X,
  MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Via del Vangelo', href: '/gospel-daily', icon: Calendar },
  { name: 'Vangeli', href: '/gospels', icon: BookOpen },
  { name: 'Semini', href: '/seeds', icon: Sprout },
  { name: 'Luoghi', href: '/locations', icon: MapPin },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-mdv-dark transform transition-transform duration-200 lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between h-20 px-6">
          <div className="flex items-center justify-center flex-1">
            <img
              src="/logo.png"
              alt="MdV Logo"
              className="w-16 h-16 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)] transition-transform hover:scale-105"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-mdv-cream hover:bg-mdv-medium absolute right-4"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3">
          <ul className="space-y-1">
            {navigation.map((item) => (
              <li key={item.name}>
                <NavLink
                  to={item.href}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-mdv-medium text-mdv-cream" 
                      : "text-mdv-cream/70 hover:bg-mdv-medium hover:text-mdv-cream"
                  )}
                  onClick={onClose}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-mdv-darkest">
          <p className="text-xs text-mdv-gray text-center">
            Via del Vangelo v1.0
          </p>
        </div>
      </div>
    </>
  );
}
