import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { teamColor } from '../lib/teams';

// The signed-in user's organization's teams, in the shapes the screens need
export function useTeams() {
  const { org } = useAuth();

  return useMemo(() => {
    const teams = (org?.teams || []).map((t, i) => ({ ...t, color: teamColor(i) }));
    return {
      teams,
      teamNames: teams.map(t => t.name),
      teamsIn: (category) => teams.filter(t => t.category === category),
      namesIn: (category) => teams.filter(t => t.category === category).map(t => t.name),
    };
  }, [org]);
}

export default useTeams;
