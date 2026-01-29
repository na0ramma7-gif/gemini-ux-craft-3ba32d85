import { useState } from 'react';
import { Portfolio, ViewType } from '@/types';
import Logo from './Logo';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Package,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Folder,
  Menu,
  X
} from 'lucide-react';

interface SidebarProps {
  open: boolean;
  view: ViewType;
  portfolios: Portfolio[];
  onNavigate: (view: ViewType) => void;
  onToggle: () => void;
  onPortfolioClick: (portfolio: Portfolio) => void;
}

const Sidebar = ({ open, view, portfolios, onNavigate, onToggle, onPortfolioClick }: SidebarProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const NavItem = ({ 
    icon: Icon, 
    label, 
    active, 
    onClick 
  }: { 
    icon: any; 
    label: string; 
    active: boolean; 
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        'menu-item w-full',
        active && 'active'
      )}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      {open && <span className="font-medium text-sm truncate">{label}</span>}
    </button>
  );

  const sidebarContent = (
    <>
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
        {open ? (
          <Logo size={36} showText={true} />
        ) : (
          <Logo size={36} showText={false} />
        )}
        <button 
          onClick={onToggle} 
          className="p-2 hover:bg-sidebar-accent rounded-lg transition-colors hidden md:flex"
        >
          {open ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <NavItem
          icon={LayoutDashboard}
          label="Dashboard"
          active={view === 'dashboard'}
          onClick={() => onNavigate('dashboard')}
        />

        {open && (
          <div className="px-3 pt-4 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Portfolios
          </div>
        )}

        {portfolios.map((portfolio) => (
          <button
            key={portfolio.id}
            onClick={() => onPortfolioClick(portfolio)}
            className={cn(
              'menu-item w-full',
              view === 'portfolio' && 'active'
            )}
          >
            <Folder className="w-5 h-5 flex-shrink-0 text-primary" />
            {open && (
              <div className="flex-1 text-left min-w-0">
                <div className="font-medium text-sm truncate">{portfolio.name}</div>
                <div className="text-xs text-muted-foreground">{portfolio.code}</div>
              </div>
            )}
          </button>
        ))}

        {open && (
          <div className="px-3 pt-4 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Management
          </div>
        )}

        <NavItem
          icon={Users}
          label="Resources"
          active={view === 'resources'}
          onClick={() => onNavigate('resources')}
        />

        <NavItem
          icon={Settings}
          label="Settings"
          active={view === 'settings'}
          onClick={() => onNavigate('settings')}
        />
      </nav>
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-card rounded-lg shadow-lg"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 overflow-hidden',
          open ? 'w-64' : 'w-20'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'md:hidden fixed left-0 top-0 h-full z-40 flex flex-col bg-sidebar border-r border-sidebar-border transition-transform duration-300 w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
};

export default Sidebar;
