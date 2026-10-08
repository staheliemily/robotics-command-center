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

// Two organizations. A has an admin, a mentor and students on two teams;
// B has an admin. Plus people who belong nowhere yet.
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const person = (uid, data) => setDoc(doc(db, 'users', uid), { email: `${uid}@x.test`, team: null, ...data });

    await setDoc(doc(db, 'orgs/A'), { name: 'Org A', teams: [], created_by: 'adminA' });
    await setDoc(doc(db, 'orgs/B'), { name: 'Org B', teams: [], created_by: 'adminB' });
    await setDoc(doc(db, 'orgs/fresh'), { name: 'Fresh', teams: [], created_by: 'newbie' });

    await person('adminA', { org_id: 'A', role: 'admin', status: 'active' });
    await person('mentorA', { org_id: 'A', role: 'mentor', status: 'active' });
    await person('studentA', { org_id: 'A', role: 'member', team: 'Red', status: 'active' });
    await person('pendingA', { org_id: 'A', role: null, status: 'pending' });
    await person('suspendedA', { org_id: 'A', role: 'member', team: 'Red', status: 'pending' });
    await person('adminB', { org_id: 'B', role: 'admin', status: 'active' });
    await person('newbie', { org_id: null, role: null, status: 'pending' });
    // An account from before organizations existed: active, but no org_id field at all
    await setDoc(doc(db, 'users/legacy'), { email: 'legacy@x.test', role: 'admin', team: null, status: 'active' });

    await setDoc(doc(db, 'orgs/A/tasks/red1'), { title: 'Red task', team: 'Red' });
    await setDoc(doc(db, 'orgs/A/tasks/blue1'), { title: 'Blue task', team: 'Blue' });
    await setDoc(doc(db, 'orgs/B/tasks/b1'), { title: 'B task', team: 'Red' });
    await setDoc(doc(db, 'orgs/A/sponsors/s1'), { name: 'Sponsor', amount: 100 });
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
  for (const uid of ['adminA', 'mentorA', 'studentA']) {
    for (const c of DATA) {
      await assertSucceeds(getDocs(collection(as(uid), `orgs/A/${c}`)));
    }
  }
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
  for (const uid of ['pendingA', 'suspendedA', 'newbie', 'legacy']) {
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

// ---------- Accounts ----------

test('a new account can only be created as pending with no role or team', async () => {
  const mine = (data) => setDoc(doc(as('fresh1'), 'users/fresh1'), data);
  await assertFails(mine({ status: 'active', role: null, team: null, org_id: 'A' }));
  await assertFails(mine({ status: 'pending', role: 'admin', team: null, org_id: 'A' }));
  await assertFails(mine({ status: 'pending', role: null, team: 'Red', org_id: 'A' }));
  await assertFails(setDoc(doc(as('fresh1'), 'users/someoneElse'), { status: 'pending', role: null, team: null }));
  await assertSucceeds(mine({ status: 'pending', role: null, team: null, org_id: 'A', requested_role: 'member' }));
});

test('nobody can promote or approve themselves', async () => {
  for (const uid of ['pendingA', 'suspendedA', 'studentA', 'mentorA', 'newbie']) {
    await assertFails(updateDoc(doc(as(uid), `users/${uid}`), { status: 'active' }));
    await assertFails(updateDoc(doc(as(uid), `users/${uid}`), { role: 'admin' }));
    await assertFails(updateDoc(doc(as(uid), `users/${uid}`), { role: 'admin', status: 'active', org_id: 'A' }));
  }
  // An approved student cannot switch teams or organizations by themselves
  await assertFails(updateDoc(doc(as('studentA'), 'users/studentA'), { team: 'Blue' }));
  await assertFails(updateDoc(doc(as('studentA'), 'users/studentA'), { org_id: 'B' }));
});

test('nobody can make themselves admin of an org someone else created', async () => {
  const claim = { org_id: 'B', role: 'admin', status: 'active', team: null };
  await assertFails(updateDoc(doc(as('newbie'), 'users/newbie'), claim));
  await assertFails(updateDoc(doc(as('legacy'), 'users/legacy'), claim));
  await assertFails(updateDoc(doc(as('pendingA'), 'users/pendingA'), claim));
});

test('creating an organization makes you its admin', async () => {
  const db = as('newbie');
  await assertSucceeds(updateDoc(doc(db, 'users/newbie'), { org_id: 'fresh', role: 'admin', status: 'active', team: null }));
  await assertSucceeds(setDoc(doc(db, 'orgs/fresh/tasks/t1'), { title: 't', team: 'Any' }));
  await assertFails(getDocs(collection(db, 'orgs/A/tasks')));
});

test('an organization must be created in your own name, with a verified email', async () => {
  await assertSucceeds(addDoc(collection(as('newbie'), 'orgs'), { name: 'Mine', teams: [], created_by: 'newbie' }));
  await assertFails(addDoc(collection(as('newbie'), 'orgs'), { name: 'Mine', teams: [], created_by: 'adminA' }));
  await assertFails(addDoc(collection(as('newbie', false), 'orgs'), { name: 'Mine', teams: [], created_by: 'newbie' }));
  await assertFails(addDoc(collection(as('newbie'), 'orgs'), { name: '', teams: [], created_by: 'newbie' }));
});

test('an account from before organizations can start one and keep working', async () => {
  const db = as('legacy');
  const created = await assertSucceeds(addDoc(collection(db, 'orgs'), { name: 'Old club', teams: [], created_by: 'legacy' }));
  await assertSucceeds(updateDoc(doc(db, 'users/legacy'), { org_id: created.id, role: 'admin', status: 'active', team: null }));
  await assertSucceeds(getDocs(collection(db, `orgs/${created.id}/tasks`)));
});

test('someone unplaced can ask to join an org and withdraw, staying pending', async () => {
  const db = as('newbie');
  await assertSucceeds(updateDoc(doc(db, 'users/newbie'), { org_id: 'A', status: 'pending', role: null, team: null, requested_role: 'member' }));
  await assertFails(getDocs(collection(db, 'orgs/A/tasks')));
  await assertSucceeds(updateDoc(doc(db, 'users/newbie'), { org_id: null, status: 'pending', role: null, team: null }));
});

test('admins approve and manage only their own org\'s people', async () => {
  const db = as('adminA');
  await assertSucceeds(updateDoc(doc(db, 'users/pendingA'), { status: 'active', role: 'member', team: 'Red' }));
  await assertSucceeds(updateDoc(doc(db, 'users/studentA'), { status: 'pending' }));
  await assertFails(updateDoc(doc(db, 'users/adminB'), { role: 'member' }));
  await assertFails(updateDoc(doc(db, 'users/newbie'), { org_id: 'A', status: 'active', role: 'member' }));
  await assertFails(updateDoc(doc(db, 'users/studentA'), { org_id: 'B' }));
  await assertFails(deleteDoc(doc(db, 'users/adminB')));
});

test('admins list only their own org\'s people; others cannot list at all', async () => {
  const people = (uid, orgId) => getDocs(query(collection(as(uid), 'users'), where('org_id', '==', orgId)));
  const own = await assertSucceeds(people('adminA', 'A'));
  if (own.size !== 5) throw new Error(`expected 5 people in org A, got ${own.size}`);
  await assertFails(people('adminA', 'B'));
  await assertFails(getDocs(collection(as('adminA'), 'users')));
  await assertFails(people('mentorA', 'A'));
  await assertFails(people('studentA', 'A'));
  await assertFails(getDoc(doc(as('studentA'), 'users/adminA')));
  await assertSucceeds(getDoc(doc(as('studentA'), 'users/studentA')));
});

test('only an org\'s admin can change it, and never who created it', async () => {
  await assertSucceeds(updateDoc(doc(as('adminA'), 'orgs/A'), { teams: [{ name: 'Red', category: 'FTC' }] }));
  await assertFails(updateDoc(doc(as('adminA'), 'orgs/A'), { created_by: 'mentorA' }));
  await assertFails(updateDoc(doc(as('adminA'), 'orgs/B'), { name: 'taken' }));
  await assertFails(updateDoc(doc(as('mentorA'), 'orgs/A'), { name: 'x' }));
  await assertFails(deleteDoc(doc(as('adminA'), 'orgs/A')));
});
