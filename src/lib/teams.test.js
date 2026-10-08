import {
  buildInviteLink, parseInvite, saveInvite, peekInvite, takeInvite, teamColor, ROLE_LABELS,
} from './teams';

const paramsOf = (link) => new URL(link).searchParams;

beforeEach(() => sessionStorage.clear());

test('students are stored as "member" but shown as Student', () => {
  expect(ROLE_LABELS.member).toBe('Student');
});

test('an invite link round-trips the organization, role and teams', () => {
  const link = buildInviteLink('org123', 'mentor', ['Rovers', 'Gear Heads']);
  expect(link).toContain('/join?');
  expect(parseInvite(paramsOf(link))).toEqual({ org: 'org123', role: 'mentor', teams: ['Rovers', 'Gear Heads'] });
});

test('a student invite carries the word "student" and at most one team', () => {
  const link = buildInviteLink('org123', 'member', ['Rovers']);
  expect(paramsOf(link).get('invite')).toBe('student');
  const parsed = parseInvite(new URLSearchParams('org=org123&invite=student&team=Rovers&team=Extra'));
  expect(parsed).toEqual({ org: 'org123', role: 'member', teams: ['Rovers'] });
});

test('a link cannot invite someone as an admin, or without an organization', () => {
  expect(parseInvite(new URLSearchParams('org=org123&invite=admin'))).toBeNull();
  expect(parseInvite(new URLSearchParams('org=org123'))).toBeNull();
  expect(parseInvite(new URLSearchParams('invite=mentor'))).toBeNull();
  expect(parseInvite(new URLSearchParams(''))).toBeNull();
});

test('oversized invite links are trimmed', () => {
  const params = new URLSearchParams('org=o&invite=mentor');
  for (let i = 0; i < 50; i++) params.append('team', 'x'.repeat(500));
  const parsed = parseInvite(params);
  expect(parsed.teams).toHaveLength(20);
  expect(parsed.teams[0]).toHaveLength(100);
});

test('a saved invite can be looked at, and is gone once taken', () => {
  const invite = { org: 'o', role: 'mentor', teams: [] };
  expect(peekInvite()).toBeNull();
  saveInvite(invite);
  expect(peekInvite()).toEqual(invite);
  expect(takeInvite()).toEqual(invite);
  expect(peekInvite()).toBeNull();
  expect(takeInvite()).toBeNull();
});

test('team colours repeat once the palette runs out', () => {
  expect(teamColor(0)).toBe(teamColor(6));
  expect(teamColor(0)).not.toBe(teamColor(1));
});
