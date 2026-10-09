// Security-rule tests. They run against the local Firestore emulator, never
// the live project:  npm run test:rules
import { readFileSync } from 'node:fs';
import { test, before, after, beforeEach } from 'node:test';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc,
  collection, getDocs, query, where,
} from 'firebase/firestore';

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
after(() => env.cleanup());

// Three organizations. A has an admin, a mentor and students on two teams;
// B has an admin; "fresh" was just created by newbie, who has not joined it yet.
// multi is a mentor in A and a student in B. Plus people who belong nowhere.
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const member = (orgId, uid, data) =>
      setDoc(doc(db, `orgs/${orgId}/members/${uid}`), { uid, email: `${uid}@x.test`, team: null, ...data });
    const profile = (uid, orgs) => setDoc(doc(db, 'users', uid), { email: `${uid}@x.test`, orgs });

    await setDoc(doc(db, 'orgs/A'), { name: 'Org A', teams: [], created_by: 'adminA' });
    await setDoc(doc(db, 'orgs/B'), { name: 'Org B', teams: [], created_by: 'adminB' });
    await setDoc(doc(db, 'orgs/fresh'), { name: 'Fresh', teams: [], created_by: 'newbie' });

    await member('A', 'adminA', { role: 'admin', status: 'active' });
    await member('A', 'mentorA', { role: 'mentor', status: 'active' });
    await member('A', 'studentA', { role: 'member', team: 'Red', status: 'active' });
    await member('A', 'pendingA', { role: null, status: 'pending', requested_role: 'member' });
    await member('A', 'suspendedA', { role: 'member', team: 'Red', status: 'pending' });
    await member('B', 'adminB', { role: 'admin', status: 'active' });
    await member('A', 'multi', { role: 'mentor', status: 'active' });
    await member('B', 'multi', { role: 'member', team: 'Red', status: 'active' });

    for (const uid of ['adminA', 'mentorA', 'studentA', 'pendingA', 'suspendedA']) await profile(uid, ['A']);
    await profile('adminB', ['B']);
    await profile('multi', ['A', 'B']);
    await profile('newbie', []);
    // An account from before memberships existed: its old role sat on the account itself
    await setDoc(doc(db, 'users/legacy'), { email: 'legacy@x.test', org_id: 'A', role: 'admin', team: null, status: 'active' });

    await setDoc(doc(db, 'orgs/A/tasks/red1'), { title: 'Red task', team: 'Red' });
    await setDoc(doc(db, 'orgs/A/tasks/blue1'), { title: 'Blue task', team: 'Blue' });
    await setDoc(doc(db, 'orgs/B/tasks/b1'), { title: 'B task', team: 'Red' });
    await setDoc(doc(db, 'orgs/B/tasks/b2'), { title: 'B blue task', team: 'Blue' });
    await setDoc(doc(db, 'orgs/A/sponsors/s1'), { name: 'Sponsor', amount: 100 });
    await setDoc(doc(db, 'orgs/A/expenses/e0'), { description: 'Motors', amount: 40 });
    await setDoc(doc(db, 'orgs/A/settings/budget'), { key: 'total_budget', value: 5000 });
    await setDoc(doc(db, 'orgs/A/settings/banner'), { key: 'banner_message', value: 'Hello' });
    await setDoc(doc(db, 'orgs/B/sponsors/s1'), { name: 'B Sponsor', amount: 100 });
    await setDoc(doc(db, 'orgs/A/milestones/m1'), { name: 'Kickoff' });
    await setDoc(doc(db, 'orgs/A/wishlist/w1'), { name: 'Drill' });
  });
});

const as = (uid, verified = true) =>
  env.authenticatedContext(uid, { email: `${uid}@x.test`, email_verified: verified }).firestore();
const anon = () => env.unauthenticatedContext().firestore();

const DATA = ['tasks', 'milestones', 'mentor_tasks', 'wishlist', 'sponsors', 'expenses', 'settings'];

// ---------- Separation between organizations ----------

test('an org admin cannot read or write any of another org\'s data', async () => {
  const db = as('adminA');
  for (const c of DATA) {
    await assertFails(getDocs(collection(db, `orgs/B/${c}`)));
    await assertFails(getDoc(doc(db, `orgs/B/${c}/x`)));
    await assertFails(setDoc(doc(db, `orgs/B/${c}/x`), { team: 'Red' }));
    await assertFails(deleteDoc(doc(db, `orgs/B/${c}/x`)));
  }
  await assertFails(updateDoc(doc(db, 'orgs/B/tasks/b1'), { title: 'hacked' }));
});

test('mentors and students cannot reach another org either', async () => {
  for (const uid of ['mentorA', 'studentA']) {
    await assertFails(getDocs(collection(as(uid), 'orgs/B/tasks')));
    await assertFails(setDoc(doc(as(uid), 'orgs/B/tasks/x'), { team: 'Red' }));
    await assertFails(getDoc(doc(as(uid), 'orgs/B/sponsors/s1')));
  }
});

test('members can read their own org\'s data', async () => {
  // Money (sponsors, expenses, the budget in settings) has its own tests below
  const everyday = ['tasks', 'milestones', 'mentor_tasks', 'wishlist'];
  for (const uid of ['adminA', 'mentorA', 'studentA']) {
    for (const c of everyday) {
      await assertSucceeds(getDocs(collection(as(uid), `orgs/A/${c}`)));
    }
  }
  for (const c of DATA) await assertSucceeds(getDocs(collection(as('adminA'), `orgs/A/${c}`)));
});

test('the old top-level collections are closed to everyone', async () => {
  for (const uid of ['adminA', 'studentA', 'legacy']) {
    await assertFails(getDocs(collection(as(uid), 'tasks')));
    await assertFails(setDoc(doc(as(uid), 'tasks/x'), { team: 'Red' }));
    await assertFails(getDocs(collection(as(uid), 'sponsors')));
  }
});

test('nobody can list organizations; anyone signed in can open one by id', async () => {
  await assertFails(getDocs(collection(as('adminA'), 'orgs')));
  await assertSucceeds(getDoc(doc(as('newbie'), 'orgs/A')));
  await assertFails(getDoc(doc(anon(), 'orgs/A')));
});

// ---------- People who are not approved ----------

test('signed-out, unverified, pending and suspended people see no org data', async () => {
  await assertFails(getDocs(collection(anon(), 'orgs/A/tasks')));
  await assertFails(getDocs(collection(as('adminA', false), 'orgs/A/tasks')));
  for (const uid of ['pendingA', 'suspendedA', 'newbie', 'legacy', 'adminB']) {
    await assertFails(getDocs(collection(as(uid), 'orgs/A/tasks')));
    await assertFails(setDoc(doc(as(uid), 'orgs/A/wishlist/x'), { name: 'x' }));
  }
});

// ---------- Roles inside an organization ----------

test('students edit only their own team\'s tasks', async () => {
  const db = as('studentA');
  await assertSucceeds(setDoc(doc(db, 'orgs/A/tasks/new'), { title: 't', team: 'Red' }));
  await assertSucceeds(updateDoc(doc(db, 'orgs/A/tasks/red1'), { title: 'edited' }));
  await assertFails(setDoc(doc(db, 'orgs/A/tasks/new2'), { title: 't', team: 'Blue' }));
  await assertFails(updateDoc(doc(db, 'orgs/A/tasks/blue1'), { title: 'edited' }));
  await assertFails(updateDoc(doc(db, 'orgs/A/tasks/blue1'), { team: 'Red' }));
  await assertFails(updateDoc(doc(db, 'orgs/A/tasks/red1'), { team: 'Blue' }));
  await assertFails(deleteDoc(doc(db, 'orgs/A/tasks/blue1')));
  await assertSucceeds(deleteDoc(doc(db, 'orgs/A/tasks/red1')));
});

test('mentors edit any team\'s tasks and milestones, but not finances', async () => {
  const db = as('mentorA');
  await assertSucceeds(updateDoc(doc(db, 'orgs/A/tasks/blue1'), { title: 'edited' }));
  await assertSucceeds(setDoc(doc(db, 'orgs/A/milestones/m2'), { name: 'Regional' }));
  await assertFails(setDoc(doc(db, 'orgs/A/sponsors/s2'), { name: 'x' }));
  await assertFails(setDoc(doc(db, 'orgs/A/expenses/e1'), { amount: 1 }));
  await assertFails(setDoc(doc(db, 'orgs/A/settings/x'), { key: 'k', value: 1 }));
});

test('students cannot change milestones or finances; every role can use the wishlist', async () => {
  const db = as('studentA');
  await assertFails(setDoc(doc(db, 'orgs/A/milestones/m2'), { name: 'x' }));
  await assertFails(updateDoc(doc(db, 'orgs/A/sponsors/s1'), { amount: 0 }));
  await assertSucceeds(addDoc(collection(db, 'orgs/A/wishlist'), { name: 'Saw' }));
  await assertSucceeds(addDoc(collection(db, 'orgs/A/mentor_tasks'), { title: 'Ask' }));
});

test('admins manage finances and settings in their own org', async () => {
  const db = as('adminA');
  await assertSucceeds(setDoc(doc(db, 'orgs/A/sponsors/s2'), { name: 'x' }));
  await assertSucceeds(setDoc(doc(db, 'orgs/A/expenses/e1'), { amount: 1 }));
  await assertSucceeds(addDoc(collection(db, 'orgs/A/settings'), { key: 'k', value: 1 }));
});

// ---------- One account in several organizations ----------

test('someone in two organizations has each one\'s role there and nowhere else', async () => {
  const db = as('multi');
  // Mentor in A: any team's tasks, and milestones
  await assertSucceeds(updateDoc(doc(db, 'orgs/A/tasks/blue1'), { title: 'edited' }));
  await assertSucceeds(setDoc(doc(db, 'orgs/A/milestones/m2'), { name: 'Regional' }));
  // Student on Red in B: only that team's tasks, no milestones
  await assertSucceeds(getDocs(collection(db, 'orgs/B/tasks')));
  await assertSucceeds(updateDoc(doc(db, 'orgs/B/tasks/b1'), { title: 'edited' }));
  await assertFails(updateDoc(doc(db, 'orgs/B/tasks/b2'), { title: 'edited' }));
  await assertFails(setDoc(doc(db, 'orgs/B/milestones/m1'), { name: 'x' }));
  // Admin in neither
  await assertFails(setDoc(doc(db, 'orgs/A/sponsors/s2'), { name: 'x' }));
  await assertFails(getDocs(collection(db, 'orgs/B/members')));
  // And still nothing in an organization they are not in
  await assertFails(getDocs(collection(db, 'orgs/fresh/tasks')));
});

test('an admin of one organization can also ask to join another, and waits like anyone else', async () => {
  const db = as('adminA');
  await assertSucceeds(setDoc(doc(db, 'orgs/B/members/adminA'), {
    uid: 'adminA', email: 'adminA@x.test', status: 'pending', role: null, team: null, requested_role: 'mentor',
  }));
  await assertFails(getDocs(collection(db, 'orgs/B/tasks')));
  await assertFails(updateDoc(doc(db, 'orgs/B/members/adminA'), { status: 'active', role: 'admin' }));
  // Approved by B's admin, they get B's data with the role B gave them
  await assertSucceeds(updateDoc(doc(as('adminB'), 'orgs/B/members/adminA'), { status: 'active', role: 'mentor' }));
  await assertSucceeds(getDocs(collection(db, 'orgs/B/tasks')));
  await assertFails(setDoc(doc(db, 'orgs/B/sponsors/s2'), { name: 'x' }));
  // And they are still the admin of A
  await assertSucceeds(setDoc(doc(db, 'orgs/A/sponsors/s2'), { name: 'x' }));
});

// ---------- Joining and roles ----------

const request = (uid, extra = {}) => ({ uid, email: `${uid}@x.test`, status: 'pending', role: null, team: null, ...extra });

test('a join request can only be pending, with no role or team, in your own name', async () => {
  const mine = (data) => setDoc(doc(as('newbie'), 'orgs/A/members/newbie'), data);
  await assertFails(mine(request('newbie', { status: 'active' })));
  await assertFails(mine(request('newbie', { role: 'admin' })));
  await assertFails(mine(request('newbie', { role: 'member' })));
  await assertFails(mine(request('newbie', { team: 'Red' })));
  await assertFails(mine(request('newbie', { email: 'adminA@x.test' })));
  await assertFails(setDoc(doc(as('newbie'), 'orgs/A/members/someoneElse'), request('someoneElse')));
  await assertFails(setDoc(doc(as('newbie'), 'orgs/nowhere/members/newbie'), request('newbie')));
  await assertFails(setDoc(doc(anon(), 'orgs/A/members/newbie'), request('newbie')));
  await assertSucceeds(mine(request('newbie', { requested_role: 'member', requested_teams: ['Red'] })));
  await assertFails(getDocs(collection(as('newbie'), 'orgs/A/tasks')));
});

test('nobody can promote or approve themselves', async () => {
  for (const uid of ['pendingA', 'suspendedA', 'studentA', 'mentorA']) {
    const mine = doc(as(uid), `orgs/A/members/${uid}`);
    await assertFails(updateDoc(mine, { status: 'active' }));
    await assertFails(updateDoc(mine, { role: 'admin' }));
    await assertFails(updateDoc(mine, { role: 'admin', status: 'active' }));
    await assertFails(setDoc(mine, { uid, email: `${uid}@x.test`, status: 'active', role: 'admin', team: null }));
  }
  // An approved student cannot switch teams by themselves
  await assertFails(updateDoc(doc(as('studentA'), 'orgs/A/members/studentA'), { team: 'Blue' }));
});

test('a suspended member cannot wipe their record and come back', async () => {
  const mine = doc(as('suspendedA'), 'orgs/A/members/suspendedA');
  await assertFails(deleteDoc(mine));
  await assertFails(updateDoc(mine, { role: null }));
  await assertFails(getDocs(collection(as('suspendedA'), 'orgs/A/tasks')));
});

test('nobody can make themselves admin of an org someone else created', async () => {
  const claim = (uid) => ({ uid, email: `${uid}@x.test`, role: 'admin', status: 'active', team: null });
  await assertFails(setDoc(doc(as('newbie'), 'orgs/B/members/newbie'), claim('newbie')));
  await assertFails(setDoc(doc(as('adminA'), 'orgs/B/members/adminA'), claim('adminA')));
  await assertFails(setDoc(doc(as('legacy'), 'orgs/A/members/legacy'), claim('legacy')));
});

test('creating an organization makes you its admin', async () => {
  const db = as('newbie');
  const claim = { uid: 'newbie', email: 'newbie@x.test', role: 'admin', status: 'active', team: null };
  await assertFails(setDoc(doc(as('newbie', false), 'orgs/fresh/members/newbie'), claim));
  await assertSucceeds(setDoc(doc(db, 'orgs/fresh/members/newbie'), claim));
  await assertSucceeds(setDoc(doc(db, 'orgs/fresh/tasks/t1'), { title: 't', team: 'Any' }));
  await assertFails(getDocs(collection(db, 'orgs/A/tasks')));
});

test('an organization must be created in your own name, with a verified email', async () => {
  await assertSucceeds(addDoc(collection(as('newbie'), 'orgs'), { name: 'Mine', teams: [], created_by: 'newbie' }));
  await assertFails(addDoc(collection(as('newbie'), 'orgs'), { name: 'Mine', teams: [], created_by: 'adminA' }));
  await assertFails(addDoc(collection(as('newbie', false), 'orgs'), { name: 'Mine', teams: [], created_by: 'newbie' }));
  await assertFails(addDoc(collection(as('newbie'), 'orgs'), { name: '', teams: [], created_by: 'newbie' }));
});

test('an old account\'s role on the account itself no longer grants anything', async () => {
  const db = as('legacy');
  await assertFails(getDocs(collection(db, 'orgs/A/tasks')));
  await assertFails(getDocs(collection(db, 'orgs/A/members')));
  // It can ask to come back, and waits for approval like anyone else
  await assertSucceeds(setDoc(doc(db, 'orgs/A/members/legacy'), request('legacy', { requested_role: 'admin' })));
  await assertFails(getDocs(collection(db, 'orgs/A/tasks')));
});

test('someone can withdraw their own unanswered request', async () => {
  const db = as('newbie');
  await assertSucceeds(setDoc(doc(db, 'orgs/A/members/newbie'), request('newbie')));
  await assertSucceeds(updateDoc(doc(db, 'orgs/A/members/newbie'), { requested_role: 'mentor' }));
  await assertSucceeds(deleteDoc(doc(db, 'orgs/A/members/newbie')));
  await assertFails(deleteDoc(doc(as('studentA'), 'orgs/A/members/mentorA')));
});

test('admins approve and manage only their own org\'s people', async () => {
  const db = as('adminA');
  await assertSucceeds(updateDoc(doc(db, 'orgs/A/members/pendingA'), { status: 'active', role: 'member', team: 'Red' }));
  await assertSucceeds(updateDoc(doc(db, 'orgs/A/members/studentA'), { status: 'pending' }));
  await assertSucceeds(deleteDoc(doc(db, 'orgs/A/members/suspendedA')));
  await assertFails(updateDoc(doc(db, 'orgs/B/members/adminB'), { role: 'member' }));
  await assertFails(updateDoc(doc(db, 'orgs/B/members/multi'), { role: 'admin' }));
  await assertFails(setDoc(doc(db, 'orgs/A/members/newbie'), { uid: 'newbie', email: 'newbie@x.test', status: 'active', role: 'member', team: null }));
  await assertFails(deleteDoc(doc(db, 'orgs/B/members/adminB')));
  // Mentors and students do not manage people
  await assertFails(updateDoc(doc(as('mentorA'), 'orgs/A/members/pendingA'), { status: 'active', role: 'member' }));
});

test('an organization can have several admins, each with the full job', async () => {
  // The first admin promotes a mentor
  await assertSucceeds(updateDoc(doc(as('adminA'), 'orgs/A/members/mentorA'), { role: 'admin', team: null, teams: [] }));
  const second = as('mentorA');
  await assertSucceeds(getDocs(collection(second, 'orgs/A/members')));
  await assertSucceeds(updateDoc(doc(second, 'orgs/A/members/pendingA'), { status: 'active', role: 'member', team: 'Red' }));
  await assertSucceeds(updateDoc(doc(second, 'orgs/A'), { name: 'Org A renamed' }));
  await assertSucceeds(setDoc(doc(second, 'orgs/A/sponsors/s2'), { name: 'New sponsor', amount: 50 }));
  // They can make a third admin too
  await assertSucceeds(updateDoc(doc(second, 'orgs/A/members/studentA'), { role: 'admin', team: null }));
  // Being an admin of A still means nothing in B
  await assertFails(getDocs(collection(second, 'orgs/B/members')));
  await assertFails(updateDoc(doc(second, 'orgs/B'), { name: 'taken' }));
});

test('an admin who is made a mentor again loses the admin job, even the founder', async () => {
  await assertSucceeds(updateDoc(doc(as('adminA'), 'orgs/A/members/mentorA'), { role: 'admin' }));
  // The second admin steps the founder down
  await assertSucceeds(updateDoc(doc(as('mentorA'), 'orgs/A/members/adminA'), { role: 'mentor' }));
  const founder = as('adminA');
  await assertFails(getDocs(collection(founder, 'orgs/A/members')));
  await assertFails(updateDoc(doc(founder, 'orgs/A/members/pendingA'), { status: 'active', role: 'member' }));
  await assertFails(updateDoc(doc(founder, 'orgs/A/members/adminA'), { role: 'admin' }));
  await assertFails(setDoc(doc(founder, 'orgs/A/members/adminA'), { uid: 'adminA', email: 'adminA@x.test', role: 'admin', status: 'active', team: null }));
  // They are still a mentor, and the organization still has an admin
  await assertSucceeds(getDocs(collection(founder, 'orgs/A/tasks')));
  await assertSucceeds(getDocs(collection(as('mentorA'), 'orgs/A/members')));
});

// ---------- Who sees the money ----------

const budget = (db, orgId = 'A') => getDocs(query(collection(db, `orgs/${orgId}/settings`), where('key', '==', 'total_budget')));
const banner = (db, orgId = 'A') => getDocs(query(collection(db, `orgs/${orgId}/settings`), where('key', '==', 'banner_message')));
const seesMoney = async (uid) => {
  await assertSucceeds(getDocs(collection(as(uid), 'orgs/A/sponsors')));
  await assertSucceeds(getDocs(collection(as(uid), 'orgs/A/expenses')));
  await assertSucceeds(budget(as(uid)));
};
const seesNoMoney = async (uid) => {
  await assertFails(getDocs(collection(as(uid), 'orgs/A/sponsors')));
  await assertFails(getDoc(doc(as(uid), 'orgs/A/sponsors/s1')));
  await assertFails(getDocs(collection(as(uid), 'orgs/A/expenses')));
  await assertFails(budget(as(uid)));
};

test('unless an organization says otherwise, only its admins see sponsors, expenses and the budget', async () => {
  await seesMoney('adminA');
  await seesNoMoney('mentorA');
  await seesNoMoney('studentA');
  // The announcement is not money and stays open to every member
  await assertSucceeds(banner(as('mentorA')));
  await assertSucceeds(banner(as('studentA')));
});

test('an admin can open the money to mentors, or to everyone, and close it again', async () => {
  const org = doc(as('adminA'), 'orgs/A');
  await assertSucceeds(updateDoc(org, { finance_visibility: 'mentors' }));
  await seesMoney('mentorA');
  await seesNoMoney('studentA');

  await assertSucceeds(updateDoc(org, { finance_visibility: 'everyone' }));
  await seesMoney('mentorA');
  await seesMoney('studentA');

  await assertSucceeds(updateDoc(org, { finance_visibility: 'admins' }));
  await seesNoMoney('mentorA');
  await seesNoMoney('studentA');
});

test('seeing the money never means changing it, and never reaches another organization', async () => {
  await updateDoc(doc(as('adminA'), 'orgs/A'), { finance_visibility: 'everyone' });
  for (const uid of ['mentorA', 'studentA']) {
    await assertFails(setDoc(doc(as(uid), 'orgs/A/sponsors/s9'), { name: 'x', amount: 1 }));
    await assertFails(updateDoc(doc(as(uid), 'orgs/A/sponsors/s1'), { amount: 0 }));
    await assertFails(addDoc(collection(as(uid), 'orgs/A/settings'), { key: 'total_budget', value: 1 }));
    // Nor can they change who sees it
    await assertFails(updateDoc(doc(as(uid), 'orgs/A'), { finance_visibility: 'admins' }));
  }
  // People waiting or suspended in A, and members of B, still see none of it
  for (const uid of ['pendingA', 'suspendedA', 'adminB']) await seesNoMoney(uid);
});

test('admins list only their own org\'s people; others cannot list at all', async () => {
  const people = (uid, orgId) => getDocs(collection(as(uid), `orgs/${orgId}/members`));
  const own = await assertSucceeds(people('adminA', 'A'));
  if (own.size !== 6) throw new Error(`expected 6 people in org A, got ${own.size}`);
  await assertFails(people('adminA', 'B'));
  await assertFails(people('mentorA', 'A'));
  await assertFails(people('studentA', 'A'));
  await assertFails(getDoc(doc(as('studentA'), 'orgs/A/members/adminA')));
  await assertSucceeds(getDoc(doc(as('studentA'), 'orgs/A/members/studentA')));
});

test('a profile is private to its owner and cannot be listed', async () => {
  await assertSucceeds(getDoc(doc(as('studentA'), 'users/studentA')));
  await assertSucceeds(updateDoc(doc(as('studentA'), 'users/studentA'), { orgs: ['A', 'B'] }));
  await assertFails(getDoc(doc(as('studentA'), 'users/adminA')));
  await assertFails(getDoc(doc(as('adminA'), 'users/studentA')));
  await assertFails(updateDoc(doc(as('adminA'), 'users/studentA'), { orgs: [] }));
  await assertFails(getDocs(collection(as('adminA'), 'users')));
  await assertFails(deleteDoc(doc(as('studentA'), 'users/studentA')));
  // Listing an organization on your profile does not get you into it
  await assertFails(getDocs(collection(as('studentA'), 'orgs/B/tasks')));
});

test('only an org\'s admin can change it, and never who created it', async () => {
  await assertSucceeds(updateDoc(doc(as('adminA'), 'orgs/A'), { teams: [{ name: 'Red', category: 'FTC' }] }));
  await assertFails(updateDoc(doc(as('adminA'), 'orgs/A'), { created_by: 'mentorA' }));
  await assertFails(updateDoc(doc(as('adminA'), 'orgs/B'), { name: 'taken' }));
  await assertFails(updateDoc(doc(as('mentorA'), 'orgs/A'), { name: 'x' }));
  await assertFails(deleteDoc(doc(as('adminA'), 'orgs/A')));
});
