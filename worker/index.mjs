// The Cloudflare Worker: everything the server does.
// - /api/… goes to the functions in server/functions.
// - The page itself (index.html) is named for the family and marked with the visitor's country
//   (<html data-country="US">): the app starts in English in the US until someone picks a language.
// - The app manifest (installing the site as an app) gets the family's name.
// - Every night the whole database is saved as a file (server/functions/backup.mjs).
// Everything else (scripts, styles, icons) is served by Cloudflare straight from dist/ and never
// reaches this file (wrangler.jsonc: run_worker_first).
import login from '../server/functions/login.mjs';
import logout from '../server/functions/logout.mjs';
import me from '../server/functions/me.mjs';
import tree from '../server/functions/tree.mjs';
import photos from '../server/functions/photos.mjs';
import gallery from '../server/functions/gallery.mjs';
import exportBranch from '../server/functions/export.mjs';
import backups from '../server/functions/backups.mjs';
import { backup } from '../server/functions/backup.mjs';
import { familyOfHost } from '../server/lib/families.mjs';

// [pattern, function]: the first that matches handles the request. `:id` is passed as params.id.
const ROUTES = [
  ['/api/login', login], ['/api/logout', logout], ['/api/me', me],
  ['/api/tree', tree], ['/api/people', tree], ['/api/people/:id', tree], ['/api/people/:id/archive', tree],
  ['/api/couples', tree], ['/api/couples/:id', tree],
  ['/api/people/:id/gallery', gallery], ['/api/gallery/:id', gallery],
  ['/api/photos/:id', photos], ['/api/family-photos/:id', photos],
  ['/api/export/:id', exportBranch],
  ['/api/backups', backups],
].map(([path, fn]) => [new RegExp(`^${path.replace(':id', '([^/]+)')}$`), fn]);

async function page(req, env) {
  const url = new URL(req.url);
  const family = familyOfHost(url.hostname);
  const en = family.lang === 'en';
  const res = await env.ASSETS.fetch(req);
  if (url.pathname === '/site.webmanifest' && res.ok) {
    const m = await res.json();
    Object.assign(m, { name: en ? `${family.en} Family Tree` : `עץ משפחת ${family.he}`, short_name: en ? family.en : family.he, lang: family.lang, dir: en ? 'ltr' : 'rtl' });
    return new Response(JSON.stringify(m, null, 2), { headers: { 'content-type': 'application/manifest+json; charset=utf-8', 'cache-control': 'no-cache' } });
  }
  if (!(res.headers.get('content-type') ?? '').includes('text/html')) return res;
  // index.html names no family: put this one's name in the title and the link preview, and its
  // own preview image when it has one (families.mjs `og`, a file in public/).
  let html = await res.text();
  const attr = (v) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const set = (key, value) => { html = html.replace(new RegExp(`(<meta (?:property|name)="${key}" content=")[^"]*(")`), `$1${attr(value)}$2`); };
  const heName = `עץ משפחת ${family.he}`, enName = `${family.en} Family Tree`;
  const title = family.preview?.title ?? (en ? `${enName} · ${heName}` : `${heName} · ${enName}`);
  set('og:title', title);
  set('og:site_name', family.preview?.site ?? (en ? enName : heName));
  set('apple-mobile-web-app-title', family.preview?.site ?? (en ? family.en : family.he));
  if (family.preview?.description) { set('description', family.preview.description); set('og:description', family.preview.description); }
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${attr(title)}</title>`);
  const og = [`<meta property="og:url" content="${url.origin}/" />`, `<meta property="og:locale" content="${en ? 'en_US' : 'he_IL'}" />`];
  if (family.og) og.push(`<meta property="og:image" content="${url.origin}/${family.og}" />`, '<meta name="twitter:card" content="summary_large_image" />');
  html = html.replace('</head>', `  ${og.join('\n  ')}\n</head>`);
  if (family.og) html = html.replace('<meta name="twitter:card" content="summary" />\n', '');
  if (en) html = html.replace('<html lang="he" dir="rtl">', '<html lang="en" dir="ltr">');
  const country = /^[A-Z]{2}$/.test(req.cf?.country ?? '') ? req.cf.country : '';
  html = html.replace(/<html /, `<html data-country="${country}" `);
  const headers = new Headers(res.headers);
  headers.set('cache-control', 'no-cache');   // the page differs by country
  headers.delete('content-length');
  headers.delete('etag');
  return new Response(html, { status: res.status, headers });
}

export default {
  async fetch(req, env) {
    const { pathname } = new URL(req.url);
    if (pathname.startsWith('/api/')) {
      for (const [pattern, fn] of ROUTES) {
        const m = pathname.match(pattern);
        if (m) {
          try { return await fn(req, { params: { id: m[1] } }); }
          catch (e) { console.error(e); return Response.json({ error: 'server error' }, { status: 500 }); }
        }
      }
      return Response.json({ error: 'not found' }, { status: 404 });
    }
    return page(req, env);
  },
  async scheduled(event, env, ctx) {
    try {
      const r = await backup();
      console.log('backup saved', r.key, JSON.stringify(r.counts));
    } catch (e) { console.error('backup failed', e?.stack ?? e); throw e; }
  },
};
