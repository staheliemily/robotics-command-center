import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bot,
  BarChart3,
  LogOut,
  RefreshCw,
  Clock,
  Edit2,
  Check,
  X,
  Settings,
  DollarSign,
  Wallet,
  Receipt,
  ListTodo,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import ThemeToggle from '../components/dashboard/ThemeToggle';
import TeamCard from '../components/dashboard/TeamCard';
import SponsorGrid from '../components/finance/SponsorGrid';
import BudgetGrid from '../components/finance/BudgetGrid';
import ExpenseList from '../components/finance/ExpenseList';
import { useAuth } from '../context/AuthContext';
import { useBannerMessage, useUpdateBannerMessage } from '../hooks/useSettings';
import firestoreClient from '../api/firestoreClient';
import { cn } from '../lib/utils';

// FTC Teams configuration
const FTC_TEAMS = [
  { name: 'Unhatched Plan', color: 'blue' },
  { name: 'Weight on Our Shoulders', color: 'green' },
];

// FRC Teams configuration
const FRC_TEAMS = [
  { name: 'Icarus Innovated', color: 'orange' },
  { name: 'New Hawks', color: 'red' },
];

function AnnouncementBanner() {
  const { data: message, isLoading } = useBannerMessage();
  const { updateBanner } = useUpdateBannerMessage();
  const { isAdmin } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const handleEdit = () => {
    setEditValue(message || '');
    setIsEditing(true);
  };

  const handleSave = () => {
    updateBanner(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue('');
  };

  if (isLoading) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-8">
      <div className="flex items-center gap-3 rounded-lg bg-surface-800 border border-surface-700 px-4 py-3">
        <Clock className="h-5 w-5 text-surface-400 flex-shrink-0" />

        {isEditing ? (
          <div className="flex flex-1 items-center gap-2">
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="Enter announcement..."
              className="flex-1 bg-surface-700 border-surface-600"
              autoFocus
            />
            <Button size="icon" variant="ghost" onClick={handleSave} className="h-8 w-8 text-green-500 hover:text-green-400">
              <Check className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={handleCancel} className="h-8 w-8 text-red-500 hover:text-red-400">
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <span className="flex-1 text-surface-200">
              {message || 'Click edit to add an announcement'}
            </span>
            {isAdmin && (
              <Button size="icon" variant="ghost" onClick={handleEdit} className="h-8 w-8 text-surface-400 hover:text-white">
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CategorySection({ title, icon: Icon, teams, category, iconColor }) {
  return (
    <div className="mb-10">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={cn("p-2 rounded-lg", iconColor)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
      </div>

      {/* Team Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {teams.map(team => (
          <TeamCard
            key={team.name}
            teamName={team.name}
            category={category}
            color={team.color}
          />
        ))}
      </div>
    </div>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const { user, logout, isAdmin, setRole } = useAuth();

  // Initialize sample data on first load
  useEffect(() => {
    firestoreClient.initializeSampleData();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const toggleAdminMode = () => {
    setRole(isAdmin ? 'viewer' : 'admin');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-surface-900">
      {/* Header */}
      <header className="border-b border-surface-800 bg-surface-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 sm:h-16 items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary-600">
                <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-sm sm:text-lg font-bold text-white">Robotics HQ</h1>
                <p className="hidden sm:block text-xs text-surface-400">Team schedules, tasks & budget tracking</p>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Admin Toggle - Icon only on mobile */}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAdminMode}
                className="text-xs border-surface-700 hover:bg-surface-800 px-2 sm:px-3"
              >
                <Settings className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">{isAdmin ? 'Admin' : 'Viewer'}</span>
              </Button>

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Refresh - Icon only on mobile */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="border-surface-700 hover:bg-surface-800 px-2 sm:px-3"
              >
                <RefreshCw className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>

              {/* Task Tracking Link - Icon only on mobile */}
              <Link to="/tasks">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-surface-700 hover:bg-surface-800 px-2 sm:px-3"
                >
                  <ListTodo className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Tasks</span>
                </Button>
              </Link>

              {/* Reports Link - Icon only on mobile */}
              <Link to="/reports">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-surface-700 hover:bg-surface-800 px-2 sm:px-3"
                >
                  <BarChart3 className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Reports</span>
                </Button>
              </Link>

              {/* Logout */}
              <Button variant="ghost" size="icon" onClick={handleLogout} className="text-surface-400 hover:text-white h-8 w-8 sm:h-9 sm:w-9">
                <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-6">
        {/* Announcement Banner */}
        <AnnouncementBanner />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* FTC Teams Section */}
          <CategorySection
            title="FTC Teams"
            icon={Bot}
            iconColor="bg-orange-500"
            teams={FTC_TEAMS}
            category="FTC"
          />

          {/* FRC Teams Section */}
          <CategorySection
            title="FRC Teams"
            icon={Bot}
            iconColor="bg-red-600"
            teams={FRC_TEAMS}
            category="FRC"
          />

          {/* Business Section */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-green-600">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Business & Finance</h2>
            </div>

            {/* Budget Overview */}
            <div className="rounded-lg border border-surface-700 bg-surface-800/50 mb-4">
              <div className="flex items-center gap-2 p-4 border-b border-surface-700">
                <Wallet className="h-5 w-5 text-surface-400" />
                <h3 className="font-semibold text-white">Budget Overview</h3>
              </div>
              <BudgetGrid />
            </div>

            {/* Sponsors and Expenses Grid */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Sponsors */}
              <div className="rounded-lg border border-surface-700 bg-surface-800/50">
                <div className="flex items-center gap-2 p-4 border-b border-surface-700">
                  <DollarSign className="h-5 w-5 text-surface-400" />
                  <h3 className="font-semibold text-white">Sponsors</h3>
                </div>
                <SponsorGrid />
              </div>

              {/* Expenses */}
              <div className="rounded-lg border border-surface-700 bg-surface-800/50">
                <div className="flex items-center gap-2 p-4 border-b border-surface-700">
                  <Receipt className="h-5 w-5 text-surface-400" />
                  <h3 className="font-semibold text-white">Expenses</h3>
                </div>
                <ExpenseList />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
