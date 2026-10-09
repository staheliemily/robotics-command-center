import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bot,
  Clock,
  Edit2,
  Check,
  X,
  DollarSign,
  Wallet,
  Receipt,
  Users,
  Circle,
  CheckCircle2,
} from 'lucide-react';
import AppHeader from '../components/layout/AppHeader';
import { useTasks } from '../hooks/useTasks';
import { useUsers } from '../hooks/useUsers';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import TeamCard from '../components/dashboard/TeamCard';
import MentorTasksSection from '../components/dashboard/MentorTasksSection';
import SponsorGrid from '../components/finance/SponsorGrid';
import BudgetGrid from '../components/finance/BudgetGrid';
import ExpenseList from '../components/finance/ExpenseList';
import { useAuth } from '../context/AuthContext';
import { useBannerMessage, useUpdateBannerMessage } from '../hooks/useSettings';
import { cn } from '../lib/utils';
import { useTeams } from '../hooks/useTeams';

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
      <div className="flex items-center gap-3 rounded-lg bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 px-4 py-3">
        <Clock className="h-5 w-5 text-surface-500 dark:text-surface-400 flex-shrink-0" />

        {isEditing ? (
          <div className="flex flex-1 items-center gap-2">
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="Enter announcement..."
              className="flex-1 bg-surface-100 dark:bg-surface-700 border-surface-300 dark:border-surface-600"
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
            <span className="flex-1 text-surface-800 dark:text-surface-200">
              {message || 'Click edit to add an announcement'}
            </span>
            {isAdmin && (
              <Button size="icon" variant="ghost" onClick={handleEdit} className="h-8 w-8 text-surface-500 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white">
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
        <h2 className="text-xl font-bold text-surface-900 dark:text-white">{title}</h2>
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

// Shown to an admin until the organization has teams, people and a first task
function GettingStarted({ hasTeams }) {
  const { user } = useAuth();
  const { data: tasks = [] } = useTasks();
  const { data: people = [] } = useUsers();

  const steps = [
    {
      done: hasTeams,
      title: 'Add your teams',
      detail: 'Name each team and mark it FTC or FRC.',
      to: '/users',
      action: 'Add teams',
    },
    {
      done: people.some(p => p.id !== user?.uid),
      title: 'Invite your students and mentors',
      detail: 'Copy an invite link and send it to them. You approve each person as they join.',
      to: '/users',
      action: 'Get invite link',
    },
    {
      done: tasks.length > 0,
      title: 'Add your first task',
      detail: hasTeams ? 'Use the Add button on a team below.' : 'Available once you have a team.',
    },
  ];

  if (steps.every(step => step.done)) return null;

  const nextStep = steps.find(step => !step.done);

  return (
    <div className="mb-8 rounded-lg border border-primary-500/30 bg-primary-500/5 p-4 sm:p-6">
      <h2 className="text-lg font-bold text-surface-900 dark:text-white">Let's get you set up</h2>
      <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">Three steps and your group is ready to go.</p>

      <ol className="mt-4 space-y-3">
        {steps.map((step) => (
          <li key={step.title} className="flex items-start gap-3">
            {step.done ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
            ) : (
              <Circle className="mt-0.5 h-5 w-5 flex-shrink-0 text-surface-500" />
            )}
            {/* Button sits beside the text on wide screens and under it on phones */}
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className={cn('font-medium', step.done ? 'text-surface-500 line-through' : 'text-surface-900 dark:text-surface-100')}>
                  {step.title}
                </p>
                {!step.done && <p className="text-sm text-surface-500 dark:text-surface-400">{step.detail}</p>}
              </div>
              {!step.done && step.to && (
                <Link to={step.to} className="flex-shrink-0">
                  <Button size="sm" variant={step === nextStep ? 'default' : 'outline'} className={step === nextStep ? '' : 'border-surface-200 dark:border-surface-700'}>
                    {step.action}
                  </Button>
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function Dashboard() {
  const { isAdmin, canSeeMoney, org, myTeams, viewTeam, setViewTeam } = useAuth();

  const { teams, teamNames, teamsIn } = useTeams();

  // People on specific teams choose between those; everyone else can pick any team
  const ownTeams = myTeams.filter(t => teamNames.includes(t));
  const teamChoices = ownTeams.length > 0 ? ownTeams : teamNames;
  const showTeam = (t) => !viewTeam || t.name === viewTeam;
  const ftcTeams = teamsIn('FTC').filter(showTeam);
  const frcTeams = teamsIn('FRC').filter(showTeam);

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
      <AppHeader />

      {/* Main Content */}
      <main className="py-6">
        {/* Announcement Banner */}
        <AnnouncementBanner />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {isAdmin && <GettingStarted hasTeams={teams.length > 0} />}

          {teams.length === 0 ? (
            !isAdmin && (
              <div className="mb-10 rounded-lg border border-dashed border-surface-200 dark:border-surface-700 p-8 text-center text-surface-500 dark:text-surface-400">
                <p className="font-medium text-surface-800 dark:text-surface-200">Welcome to {org?.name}</p>
                <p className="mt-1 text-sm">Your admin hasn't added any teams yet. Tasks will show up here once they do.</p>
              </div>
            )
          ) : (
            <div className="mb-6 flex items-center gap-2">
              <label htmlFor="view-team" className="text-sm text-surface-500 dark:text-surface-400">Viewing</label>
              <select
                id="view-team"
                value={viewTeam || ''}
                onChange={(e) => setViewTeam(e.target.value || null)}
                className="rounded-md border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-3 py-1.5 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">All teams</option>
                {teamChoices.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          )}

          {/* FTC Teams Section */}
          {ftcTeams.length > 0 && (
            <CategorySection
              title="FTC Teams"
              icon={Bot}
              iconColor="bg-orange-500"
              teams={ftcTeams}
              category="FTC"
            />
          )}

          {/* FRC Teams Section */}
          {frcTeams.length > 0 && (
            <CategorySection
              title="FRC Teams"
              icon={Bot}
              iconColor="bg-red-600"
              teams={frcTeams}
              category="FRC"
            />
          )}

          {/* Business Section - only for those the organization lets see money */}
          {canSeeMoney && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-green-600">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-surface-900 dark:text-white">Business & Finance</h2>
            </div>

            {/* Budget Overview */}
            <div className="rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800/50 mb-4">
              <div className="flex items-center gap-2 p-4 border-b border-surface-200 dark:border-surface-700">
                <Wallet className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                <h3 className="font-semibold text-surface-900 dark:text-white">Budget Overview</h3>
              </div>
              <BudgetGrid />
            </div>

            {/* Sponsors and Expenses Grid */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Sponsors */}
              <div className="rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800/50">
                <div className="flex items-center gap-2 p-4 border-b border-surface-200 dark:border-surface-700">
                  <DollarSign className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                  <h3 className="font-semibold text-surface-900 dark:text-white">Sponsors</h3>
                </div>
                <SponsorGrid />
              </div>

              {/* Expenses */}
              <div className="rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800/50">
                <div className="flex items-center gap-2 p-4 border-b border-surface-200 dark:border-surface-700">
                  <Receipt className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                  <h3 className="font-semibold text-surface-900 dark:text-white">Expenses</h3>
                </div>
                <ExpenseList />
              </div>
            </div>
          </div>
          )}

          {/* Mentor Tasks Section */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-violet-600">
                <Users className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-surface-900 dark:text-white">Mentor Tasks</h2>
            </div>
            <MentorTasksSection />
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
