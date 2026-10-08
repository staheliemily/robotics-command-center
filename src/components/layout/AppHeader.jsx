import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Bot,
  BarChart3,
  LogOut,
  Settings,
  ListTodo,
  Heart,
  Home,
  Users,
  UserCog,
  Moon,
  Sun,
  ChevronDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { cn, getInitials } from '../../lib/utils';
import { ROLE_LABELS } from '../../lib/teams';

const NAV_LINKS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/tasks', label: 'Tasks', icon: ListTodo },
  { to: '/wishlist', label: 'Wishlist', icon: Heart },
  { to: '/mentor-tasks', label: 'Mentors', icon: Users },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
];

// The one top bar every signed-in page uses, so it looks the same everywhere
export function AppHeader() {
  const navigate = useNavigate();
  const { user, logout, isAdmin, isDemo, org, role, setRole } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleAdminMode = () => {
    setRole(isAdmin ? 'viewer' : 'admin');
    window.location.reload();
  };

  return (
    <header className="sticky top-0 z-40 flex-shrink-0 border-b border-surface-800 bg-surface-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 sm:h-16 items-center justify-between gap-3">
          {/* Logo & Title */}
          <Link to="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-600">
              <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <span className="truncate text-base sm:text-lg font-bold text-white">{org?.name || 'Robotics HQ'}</span>
          </Link>

          {/* Page links - in the bar on larger screens */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-surface-800 hover:text-white',
                  isActive ? 'bg-surface-800 text-white' : 'text-surface-300'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Account menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex flex-shrink-0 items-center gap-2 rounded-full p-1 pr-2 text-surface-300 hover:bg-surface-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Account menu"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-xs font-semibold text-white">
                  {getInitials(user?.displayName || user?.email) || '?'}
                </span>
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>
                <p className="truncate font-medium">{user?.displayName || user?.email}</p>
                <p className="truncate text-xs font-normal text-surface-500">
                  {user?.email} · {ROLE_LABELS[role] || 'Viewer'}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isAdmin && (
                <DropdownMenuItem onSelect={() => navigate('/users')}>
                  <UserCog className="mr-2 h-4 w-4" />
                  People and teams
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={toggleTheme}>
                {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </DropdownMenuItem>
              {isDemo && (
                <DropdownMenuItem onSelect={toggleAdminMode}>
                  <Settings className="mr-2 h-4 w-4" />
                  Demo: switch to {isAdmin ? 'viewer' : 'admin'}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Page links - their own row on phones */}
      <nav className="grid grid-cols-5 border-t border-surface-800 md:hidden">
        {NAV_LINKS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => cn(
              'flex flex-col items-center gap-1 py-2 text-xs font-medium active:bg-surface-800',
              isActive ? 'text-white' : 'text-surface-400'
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

// Page name on the left, that page's buttons on the right
export function PageHeading({ icon: Icon, iconClassName = 'bg-primary-600', title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className={cn('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg', iconClassName)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-surface-900 dark:text-surface-100">{title}</h1>
          {subtitle && <p className="text-xs text-surface-500">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

export default AppHeader;
