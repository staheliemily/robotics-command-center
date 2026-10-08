# Robotics Command Center

A dashboard for running FTC and FRC robotics teams: task tracking (list, calendar and Gantt views), mentor tasks, a wishlist, and budget, expense and sponsor reports.

Built with React (Create React App), Tailwind CSS, and Firebase (Auth, Firestore, Hosting).

## How it is organized

Any group can sign up and run itself. Nothing about a particular club is built in.

- **Organizations.** Someone signs up, creates an organization, and becomes its admin. Each organization has its own teams, tasks, milestones, mentor tasks, wishlist, sponsors, expenses and settings, stored under `orgs/{orgId}/...`. One organization cannot see or change another's.
- **Teams.** The admin adds teams on the People page (`/users`) and marks each as FTC or FRC.
- **Joining.** The admin copies an invite link from the People page. Whoever opens it signs up (or signs in) and shows up in the admin's list as pending, with the offered role and team filled in. They see nothing until the admin approves them.
- **Roles.** Admin, Mentor, and Student (stored as `member`). A student is on one team; a mentor can be on several and picks which one to view on the dashboard.

| Data | Student | Mentor | Admin |
| --- | --- | --- | --- |
| Tasks | read all; add, edit, delete own team's | full | full |
| Milestones | read | full | full |
| Mentor tasks, wishlist | full | full | full |
| Sponsors, expenses, settings | read | read | full |
| People and teams | own profile only | own profile only | everyone in the organization |

An account belongs to one organization at a time.

## Run locally

```bash
npm install
npm start
```

Opens at http://localhost:3000. If that port is taken, pick another: `PORT=3005 npm start`.

`npm start` runs in **demo mode**: any email and password signs you in as the admin of a demo organization, and everything is stored in the browser's local storage. It starts empty and never touches the live database.

## Connect Firebase

The live project's config is in `.env.production.local`, which is not committed and is only used by `npm run build`. To create it, copy `.env.example` and fill in the values from Firebase Console > Project Settings > Your apps > Web app. The project needs the Email/Password and Google sign-in providers enabled and a Firestore database.

To run the dev server against a real Firebase project instead of demo mode, put the same values in `.env.development.local`.

## Security rules

`firestore.rules` is what enforces the separation between organizations and the role table above; the screens only mirror it. The rules have their own tests, which run against a local emulator and need Java:

```bash
npm run test:rules
```

## Test and build

```bash
npm test
npm run build
```

## Deploy

The site is served from **hawksop.com** on Firebase Hosting (project `maupcoop`), which also provides sign-in and the database. The `.env.production.local` values are baked in at build time.

1. **Rules.** Publish `firestore.rules` to the Firebase project, either by pasting it into Firebase Console > Firestore > Rules, or with `firebase deploy --only firestore:rules`.
2. **Site.** Build and deploy:

   ```bash
   npm run build
   npx firebase-tools deploy --only hosting --project maupcoop
   ```

The rules and the site have to go out together: the site expects these rules, and the rules expect this site.

### Domain

- DNS for hawksop.com is managed at GoDaddy: an `A` record for `@` pointing at Firebase Hosting, plus the `TXT` record Firebase asks for when the domain is connected (Firebase Console > Hosting > Add custom domain).
- `hawksop.com` is listed under Firebase Console > Authentication > Settings > Authorized domains, and is the auth domain in `.env.production.local`. Google sign-in fails without both.
- Firebase's built-in addresses (`maupcoop.web.app`, `maupcoop.firebaseapp.com`) stay on; `src/index.js` redirects them to hawksop.com.
