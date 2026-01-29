import { useState } from 'react';
import { Portfolio, ViewType } from '@/types';
import Logo from './Logo';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import {
  LayoutDashboard,
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
  const { t, isRTL } = useApp();

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
      <div className="p-3 sm:p-4 border-b border-sidebar-border flex items-center justify-between">
        {open ? (
          <Logo size={32} showText={true} />
        ) : (
          <Logo size={32} showText={false} />
        )}
        <button 
          onClick={onToggle} 
          className="p-2 hover:bg-sidebar-accent rounded-lg transition-colors hidden md:flex"
        >
          {isRTL ? (
            open ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />
          ) : (
            open ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 p-2 sm:p-3 space-y-1 overflow-y-auto">
        <NavItem
          icon={LayoutDashboard}
          label={t('dashboard')}
          active={view === 'dashboard'}
          onClick={() => {
            onNavigate('dashboard');
            setMobileOpen(false);
          }}
        />

        {open && (
          <div className="px-3 pt-4 pb-2 text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t('portfolios')}
          </div>
        )}

        {portfolios.map((portfolio) => (
          <button
            key={portfolio.id}
            onClick={() => {
              onPortfolioClick(portfolio);
              setMobileOpen(false);
            }}
            className={cn(
              'menu-item w-full',
              view === 'portfolio' && 'active'
            )}
          >
            <Folder className="w-5 h-5 flex-shrink-0 text-primary" />
            {open && (
              <div className="flex-1 text-start min-w-0">
                <div className="font-medium text-sm truncate">{portfolio.name}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground">{portfolio.code}</div>
              </div>
            )}
          </button>
        ))}

        {open && (
          <div className="px-3 pt-4 pb-2 text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t('management')}
          </div>
        )}

        <NavItem
          icon={Users}
          label={t('resources')}
          active={view === 'resources'}
          onClick={() => {
            onNavigate('resources');
            setMobileOpen(false);
          }}
        />

        <NavItem
          icon={Settings}
          label={t('settings')}
          active={view === 'settings'}
          onClick={() => {
            onNavigate('settings');
            setMobileOpen(false);
          }}
        />
      </nav>
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-3 start-3 z-50 p-2 bg-card rounded-lg shadow-lg"
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
          'hidden md:flex flex-col bg-sidebar border-e border-sidebar-border transition-all duration-300 overflow-hidden',
          open ? 'w-56 lg:w-64' : 'w-16 lg:w-20'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'md:hidden fixed start-0 top-0 h-full z-40 flex flex-col bg-sidebar border-e border-sidebar-border transition-transform duration-300 w-56 sm:w-64',
          mobileOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
};

export default Sidebar;
