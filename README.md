# Toldos Live — Cloudflare version

A private family site: everyone finds themselves in the tree, then fills in what's missing —
Hebrew birthdays, photos, city, phone and email, spouse and children. It shows upcoming birthdays,
anniversaries and yahrzeits, has a "Who's this?" photo quiz, and prints a family book and a
birthday calendar as PDF. Hebrew and English.

**It's free, and can be used for any non-commercial use** (see [License](#license)).

It runs on one free [Cloudflare](https://cloudflare.com) account: the site, the database and the
photos. It starts with an invented family, the Rosenfelds (35 people; nobody in it is real, and their portraits are AI-generated), which you
replace with your own.

**Try the demo: https://toldos-live.netlify.app** (password: `toldos`) — an invented family,
running entirely in your browser. Nothing you change there is saved anywhere else; "Start over" at
the bottom of a page puts it back. The demo's password is only there to show what it's like: your
real site opens with a password you choose and share with your family, checked on the server.
(Build a demo of your own with `npm run build:demo`: plain files for any static host.)

This repository (`toldos-live-cloudflare`) is the version for Cloudflare. A version for Netlify
with a Neon database may follow as a separate repository.

## The easy way: let Claude Code set it up

You don't need to know how any of this works. Setting this site up is also a good first project
for getting to know [Claude Code](https://claude.com/claude-code), an AI assistant that works in
your terminal:

1. Download this repository and open its folder in Claude Code.
2. Say something like:

   > Read the README and set this site up on my Cloudflare account, step by step. Tell me what
   > each step does, and ask me before anything that costs money. Then help me replace the sample
   > family with my own top couple.

Claude runs the commands below for you, explains them, and stops where it needs you (logging in
to Cloudflare, choosing the family password). The rest of this page is the same steps by hand.

## Try it first (nothing to set up)

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev
```

Open the address it prints. This is a preview of the page only: it starts from
`data/family.json`, needs no password, and keeps changes in that browser.

To run the real thing on your computer (the server, database and photo storage, all local, still
no account needed):

```bash
cp .dev.vars.example .dev.vars
npm run db:local     # once: creates the local database with the sample family
npm run cf:dev
```

The password is the one in `.dev.vars`.

## Put it online

1. Create a Cloudflare account and log in from the terminal: `npx wrangler login`
2. Create the database: `npx wrangler d1 create family-tree`
   Copy the `database_id` it prints into `wrangler.jsonc`.
3. Create the photo storage: `npx wrangler r2 bucket create family-tree`
   (Cloudflare may ask you to turn on R2 in the dashboard first.)
4. Create the tables and the sample family: `npm run db:remote`
   Run it once; it fails if the tables already exist.
5. Publish: `npm run deploy`
   The first time, Cloudflare asks you to choose a `workers.dev` name; the site is then at
   `family-tree.<that name>.workers.dev`.
6. Set the password the family types to get in, and a long random text that signs logins
   (never shared; e.g. from `openssl rand -base64 32`):

   ```bash
   npx wrangler secret put APP_PASSWORD
   npx wrangler secret put SESSION_SECRET
   ```

Your own address: add a domain to the Worker in the Cloudflare dashboard (Settings → Domains &
Routes). Nothing in the code needs the address.

## Make it yours

- **Family name and first language**: `server/lib/families.mjs` (the one entry there).
- **Your own family instead of the sample**: skip `db/seed.sql` and start from a top couple —
  the couple everyone in the tree descends from. In `db/seed.sql`, keep only two people and one
  couple with `is_root` = 1, with your names; everyone else is added in the app. The top of the
  tree is only ever changed in the database: the app has no "add parents" button, on purpose.
- **Link preview picture** (what WhatsApp shows for a shared link): put a 1200×630 image in
  `public/` and name it in `families.mjs` as `og`.
- **The app admin**: `ADMIN` in `families.mjs` is a person in the tree. Exporting a branch is off
  for everyone; the app offers to ask the admin on WhatsApp, who turns it on for that person:
  `npx wrangler d1 execute DB --remote --command "UPDATE people SET can_export = 1 WHERE id = '<person id>'"`
- **Someone who has passed away** is marked in the database, not in the app:
  `UPDATE people SET deceased = 1 WHERE id = '<id>'` (the id is in the address of their page).
- **`complete: true`** in `families.mjs`, once all the top couple's children are in: nobody can
  then be added as their child by mistake.
- **An Events tab** linking to a family calendar: build with `VITE_CALENDAR_URL` set.

## How it's built

- **The page**: plain JavaScript built with Vite (`src/main.js`; `src/i18n.js` has every text in
  both languages; `src/hebrew.js` does Hebrew dates through `@hebcal/core`).
- **The server**: one Cloudflare Worker. `worker/index.mjs` routes `/api/…` to the functions in
  `server/functions/` (`tree.mjs` is the main one). Login is one family password and a signed
  cookie that lasts 90 days (`server/lib/auth.mjs`).
- **The data**: Cloudflare D1 (SQLite), through `server/lib/db.mjs`. The tree is built from
  couples: a person's `parents` is the couple they were born to. Tables: `people`, `couples`,
  `edits` (who filled in what) and `photos` (extra pictures); see `db/schema.sql`.
- **Photos and backups**: one Cloudflare R2 bucket, through `server/lib/store.mjs`. Photos are
  shrunk in the browser before upload. Every night the whole database is saved there as a JSON
  file (the last 30 are kept); `/api/backups` lists them.
- **Who is who**: after the password, each device says which person in the tree it is. That is
  trusted, not verified — this is built for a family that shares one password.

## Limits to know about

Cloudflare's free plan allows about 5 million database rows read a day and 10 ms of processing
per request. A family of a few hundred people is far inside both. A tree of a thousand or more
people has not been measured on the free plan; the paid plan ($5 a month) lifts both limits.

## License

It's free, and can be used for any non-commercial use: setting it up for your own family,
changing it as you like, and sharing it with other families on the same terms. The terms are the
[PolyForm Noncommercial License 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0)
(`LICENSE.md`), with the notice in `NOTICE`.

**Commercial use is not allowed without permission** — for example selling it, hosting it for
families as a paid service, or building it into a product. If you see a business opportunity in
it, write to Kadmonim Studio at mendye@gmail.com and we can talk.

Not built yet, for anyone extending their own copy: a second copy of the photos (a nightly
mirror), undoing an edit from the saved `old`/`new` values in `edits`, and restoring a nightly
backup file into the database.
