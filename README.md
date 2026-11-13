# Toldos Live — Cloudflare version

A private family site: everyone finds themselves in the tree, then fills in what's missing —
Hebrew birthdays, photos, city, phone and email, spouse and children. It shows upcoming birthdays,
anniversaries and yahrzeits, has a "Who's this?" photo quiz, and prints a family book and a
birthday calendar as PDF. Hebrew and English.

**It's free, and can be used for any non-commercial use** (see [License](#license)).

**The easiest way to set it up: give this page's link to your AI coding tool** (such as
[Claude Code](https://claude.com/claude-code)) and ask it to set the site up for you. It reads
these instructions, does the steps, and asks you only for what it needs.

It runs on one free [Cloudflare](https://cloudflare.com) account: the site, the database and the
photos. It starts with an invented family, the Rosenfelds (42 people; nobody in it is real, and their portraits are AI-generated), which you
replace with your own.

**Try the demo: https://toldos-live.netlify.app** (password: `toldos`) — an invented family,
running entirely in your browser. Nothing you change there is saved anywhere else; "Start over" at
the bottom of a page puts it back. The demo's password is only there to show what it's like: your
real site opens with a password you choose and share with your family, checked on the server.
(Build a demo of your own with `npm run build:demo`: plain files for any static host.)

## Which version?

This is the **Cloudflare version**. The same site comes in two versions, with the same screens and
features and the same demo. They differ only in where it runs and the kind of database underneath:

| | [Cloudflare version](https://github.com/kadmonim/toldos-live-cloudflare) | [Netlify version](https://github.com/kadmonim/toldos-live-netlify) |
|---|---|---|
| Runs on | Cloudflare (a Worker) | Netlify (Functions) |
| Database | D1: SQLite, Cloudflare's own | Postgres: Netlify's own database, or your own Neon |
| Photos | R2 storage | Netlify Blobs |
| Accounts needed | One (Cloudflare) | Netlify, plus Neon if you choose it |
| Cost | Free; [$5 a month](https://www.cloudflare.com/plans/developer-platform/) lifts the free limits, for a very big family | Free with a Netlify badge on the site; [$9 a month](https://www.netlify.com/pricing) (Personal) without it |
| Looking at the data | Cloudflare's console and `wrangler` commands | Any Postgres tool; with Neon, its console, branches and point-in-time restore |
| Changing the tables | Edit and run SQL by hand | Numbered migration files, applied by Netlify on each deploy |

Pick the one whose service you'd rather have an account with. If you already have a Netlify or a
Cloudflare account, use that one: this is just one more site on it, with no extra fee (on a paid
Netlify plan, no badge either). Starting fresh and want one free account for everything, with no
badge: Cloudflare.
SQLite and Postgres are different databases, so switching versions later means copying the data
across (an AI assistant can do that with you); choosing well at the start saves that.

## First: your own copy

Everything starts with your own copy of this repository, in your own GitHub account
([a free account](https://github.com/signup) is enough). Your family's name and settings will go
into it, so make it **private**:

1. At the top of this repository's page on GitHub, press **Use this template → Create a new
   repository**.
2. Give it a name (e.g. `our-family-tree`), choose **Private**, and create it.
3. Get it onto your computer: `git clone https://github.com/<you>/<name>.git` (or GitHub's
   **Code → Download ZIP**).

Your copy is yours: changes you make there stay there. This repository doesn't change it.
(The family's details themselves are never in the code: they're in the database.)

## The easy way: let your AI set it up

You don't need to know how any of this works. Give your AI coding tool (Claude Code, or any other)
the link to this page and say something like:

> Set up this family tree site for me on Cloudflare: https://github.com/kadmonim/toldos-live-cloudflare

It makes your own copy, sets up the account side, asks you for the family password and your
family's top couple, and explains what it's doing as it goes. Ask it anything along the way, or
later ("add my wife's family", "how do I bring in my cousin's export?"): it's all in this README.

It's also a good first project for getting to know an AI coding tool. The rest of this page is
the same steps by hand.

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

Run these in the folder of [your own copy](#first-your-own-copy), after `npm install`:

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
- **Your own family instead of the invented one**: skip `db/seed.sql` and start from a top
  couple (see [Choosing the top couple](#choosing-the-top-couple)). In `db/seed.sql`, keep only two people and one
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

## Choosing the top couple

Everything starts from one couple at the top: the site shows them, all their descendants, and
those descendants' husbands and wives. Nothing else is needed to decide who belongs.

- **Your grandparents** are the usual choice: the site then holds your parents, uncles and aunts,
  and all your first cousins and their families. That's a family that knows each other.
- **Your great-grandparents** bring in your parents' cousins and their families: a much bigger
  tree, and many people who don't know each other well.
- **Your parents** give a small tree: you, your brothers and sisters, and their families.

Pick the highest couple whose whole family you'd want on one site. Do it at the start: the app has
no "add parents" button, on purpose, so the top is only ever changed in the database.

## More than one family

Everyone has more than one family: your father's side, your mother's side, and once you're
married, your husband's or wife's side. One installation can serve them all, each as its own site
with its own address and password, from the same database:

- **Each family is a top couple.** Your father's parents are one, your mother's parents another.
  Your parents are in both: in the first as a child, in the second as a husband or wife.
- **A married couple belongs to both their families.** Your household (you, your spouse, your
  children) shows on your side's site and on your spouse's side's site, and it's the same record:
  a birthday or photo filled in on one site shows on the other.
- **Each site shows only its own family.** Someone on your wife's family's site sees her family,
  not yours.

To add a family:

1. **Put in its top couple**, and connect the person who links the two trees to them. For example,
   to add Chaya Rosenfeld's side (she was born Segal), insert her parents as a couple and set her
   `parents` to that couple:

   ```sql
   INSERT INTO people (id, he_first, en_first, he_last, en_last, sex) VALUES
     ('<new id 1>', 'משה', 'Moshe', 'סגל', 'Segal', 'm'),
     ('<new id 2>', 'רחל', 'Rochel', 'סגל', 'Segal', 'f');
   INSERT INTO couples (id, a, b) VALUES ('<new couple id>', '<new id 1>', '<new id 2>');
   UPDATE people SET parents = '<new couple id>' WHERE id = '<Chaya''s id>';
   ```

   (`npx wrangler d1 execute DB --remote --command "…"`; ids are any new UUIDs, e.g. from
   `node -e "console.log(crypto.randomUUID())"`.)
2. **Add the family to `server/lib/families.mjs`**: its `key`, its names, its first language, the
   new couple's id as `root`, and its address in `hosts`.
3. **Give it an address.** A free `workers.dev` address can show only one family, so the others
   need a domain. Two ways to go about it:
   - **A domain for each family**: `rosenfeld.app` for one side, `segal.app` for the other. Each
     family gets a short address of its own name.
   - **One domain, a subdomain for each family**: buy one, like `ourfamily.app`, and use
     `rosenfeld.ourfamily.app`, `segal.ourfamily.app`, and so on. One domain to pay for, and as
     many families as you like.

   You can buy the domain in the Cloudflare dashboard (Domain Registration), or anywhere else.
   Then, under the Worker's **Settings → Domains & Routes**, add each address, and put it in that family's `hosts` in `families.mjs`.
4. **Its own password** (optional): `npx wrangler secret put APP_PASSWORD_SEGAL` (the key in
   capitals). Without it, the family uses the shared `APP_PASSWORD`. A login on one family's site
   doesn't open another's.
5. `npm run deploy`

The family then grows from its site: brothers, sisters, husbands, wives and children are all added
in the app. Claude Code can do all of these steps with you: tell it which family to add and who
connects it to the tree.

## Sharing a branch with another family tree

Families overlap. Your household belongs to your side and to your wife's side, and the other side
may run its own family tree site (this one or another installation). Rather than typing the same
people twice, one tree can take a branch from the other, and keep it up to date.
(When both families are on the same site, as in [More than one family](#more-than-one-family),
they already share the same records and there's nothing to keep in sync.)

**Exporting a branch.** At the bottom of a married person's page: **Export this branch**. It
gives one zip with that couple, everyone descended from them, their husbands and wives, and when
each detail was last changed. You can export your own household, or a couple you or your husband
or wife descend from; never the top couple, which would be the whole tree. Three sizes:

- **Just the information**: a few KB, no pictures. The one to use for regular updates.
- **With pictures**: the photos as the site shows them.
- **With full-quality pictures**: also the originals, for printing.

Exporting is off for everyone until the app admin turns it on for a person (it's their family's
details, phone numbers included). The link offers to ask the admin on WhatsApp; the admin turns it
on in the database: `npx wrangler d1 execute DB --remote --command "UPDATE people SET can_export = 1 WHERE id = '<person id>'"`

**Bringing it into your tree.** There's no import button: give the zip to your AI coding tool
(such as Claude Code), opened in your site's folder, and say:

> Follow IMPORT.md in this zip to update my site's database.

The zip's `IMPORT.md` tells it to go carefully. It backs up your database first, then compares
the export with your tree, person by person and detail by detail:

- **People you don't have yet**: a new baby, a new son-in-law. Offered as additions.
- **Details filled in on one side only**: a birthday, a phone number, a city that the other tree
  has and yours is missing. Offered as fill-ins.
- **Details that differ**: a corrected birthday, a new phone number or email, a name spelled
  differently. Both trees record when each detail was last changed, so it says which side is
  newer and recommends that one.
- **Photos**: someone who has a photo there and none here, or a newer one there. (An export of
  "just the information" only reports these; an export with pictures can bring them over.)
- **People only in your tree** are listed and left alone.

It writes all of this as an HTML page (`import-preview.html`). You check it, and nothing changes
until you approve; additions need a clear yes, by name. It never deletes anything.

**Keeping two trees in sync.** Do it again whenever there's news: export "just the information"
from the other tree, give it to your AI tool, approve what's newer. It works both ways: each side
exports the shared branch and the other takes what's newer. To keep the shared branch in sync
with one tree only, edit it there and let the other side import.

**Start the second tree from an export.** Everyone keeps the same id in both trees, so later
updates find each person exactly. Two trees built separately have different ids for the same
people; the AI then looks for likely matches by name and birthday and asks you about each one,
which works but takes more care.

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
