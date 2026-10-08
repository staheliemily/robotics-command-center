// Stored role value -> label shown on screen. Students are stored as
// "member", which is the name the security rules use.
export const ROLE_LABELS = {
  admin: 'Admin',
  mentor: 'Mentor',
  member: 'Student',
};

export const CATEGORIES = ['FTC', 'FRC'];

// Teams are coloured by their position in the organization's list
const TEAM_COLORS = ['blue', 'green', 'orange', 'red', 'purple', 'yellow'];

export function teamColor(index) {
  return TEAM_COLORS[index % TEAM_COLORS.length];
}

// Roles someone can be invited as, keyed by the word used in the invite link
export const INVITE_ROLES = {
  student: 'member',
  mentor: 'mentor',
};

const INVITE_KEY = 'pending_invite';

// Build a link that carries the organization, role and team(s) being offered
export function buildInviteLink(orgId, role, teams) {
  const params = new URLSearchParams();
  params.set('org', orgId);
  params.set('invite', Object.keys(INVITE_ROLES).find(k => INVITE_ROLES[k] === role));
  teams.forEach(t => params.append('team', t));
  return `${window.location.origin}/join?${params.toString()}`;
}

// Read an invite out of the URL. Team names are only a suggestion to the
// admin, who sees them checked against the organization's real teams.
export function parseInvite(searchParams) {
  const org = searchParams.get('org');
  const role = INVITE_ROLES[searchParams.get('invite')];
  if (!org || !role) return null;
  const teams = searchParams.getAll('team').slice(0, 20).map(t => t.slice(0, 100));
  return { org, role, teams: role === 'member' ? teams.slice(0, 1) : teams };
}

// The invite has to survive the sign-up round trip, so it is kept for the tab session
export function saveInvite(invite) {
  try {
    sessionStorage.setItem(INVITE_KEY, JSON.stringify(invite));
  } catch (e) {
    // Sign-up still works without it; they can open the link again afterwards
  }
}

export function peekInvite() {
  try {
    const raw = sessionStorage.getItem(INVITE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function takeInvite() {
  const invite = peekInvite();
  try {
    sessionStorage.removeItem(INVITE_KEY);
  } catch (e) {
    // Nothing to clear
  }
  return invite;
}
