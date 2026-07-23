# Architecture

## Runtime

MaxDock is a browser-native HTML/CSS/JavaScript application. GitHub Pages serves static files; there is no Node application server, package manifest, transpiler, bundler, or build step.

The browser uses Supabase for:

- Auth and session persistence
- Postgres tables protected by row-level security
- Security-definer RPCs for booking, scheduling, administration, reports, preferences, capacity, and MIS imports
- Live refresh through three-minute appointment queries on operational views, with explicit immediate refresh actions on Dashboard and Queue
- `maxdock-invite-user` for privileged account administration and public username-to-email login resolution
- `maxdock-ai-brief` for privacy-filtered aggregate operational analysis, with a rules-based fallback when no OpenAI key is configured

## Browser flow

`index.html` redirects or routes into authentication and the role-appropriate landing page. `maxdock-integration.js` connects the retained original interface to the database layer in `maxdock-db.js`. Page-specific controllers handle Queue, Reports, Admin/User Management, Data Integration, My Appointments, and password flows.

Roles and RLS determine which locations and actions are visible. The browser is untrusted: authorization must remain enforced in Supabase policies/RPCs/Edge Functions, not only by hiding controls.

## Mirrored web roots

The same browser-facing release exists twice:

- Repository root: historical/source publishing surface
- `db04/`: active GitHub Pages application path

Every change to a shared HTML, CSS, JavaScript, image, release note, or release SQL file must preserve the corresponding pair. `db04/` also contains a few historical-only files; do not delete those merely to force a symmetric tree.

## Interface layering

DB70 / PR #59 remains the production reference. The DB71 candidate consolidates the previously additive CSS cascade into `maxdock.css` and the remaining compatibility behavior into `maxdock-layout-discipline.js`. Future visual work must edit an existing file; do not create new release-numbered CSS or JavaScript patch layers.

## Data boundaries

- Passwords live only in Supabase Auth.
- The service-role key is available only inside Supabase Edge Functions.
- Browser code uses a publishable key and relies on RLS/RPC authorization.
- MIS browser settings store non-secret metadata only. A future live MIS bridge requires server-side credentials and approved network access.
- AI context is aggregate-only and excludes names, emails, references, appointment notes, and typed form values.
