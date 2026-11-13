// Files (photos and the nightly database backups): one Cloudflare R2 bucket, bound to the Worker as
// FILES (wrangler.jsonc). A "store" is a folder in it: getStore('photos') keeps "photos/<key>".
// Each file can carry a small note (`metadata`, e.g. the image type), kept as R2 custom metadata.
import { env } from 'cloudflare:workers';

const meta = (o) => { try { return JSON.parse(o.customMetadata?.meta ?? '{}'); } catch { return {}; } };

export function getStore(name) {
  const path = (key) => `${name}/${key}`;
  return {
    async get(key, { type } = {}) {
      const o = await env.FILES.get(path(key));
      return o ? (type === 'json' ? o.json() : type === 'arrayBuffer' ? o.arrayBuffer() : o.text()) : null;
    },
    async getWithMetadata(key) {
      const o = await env.FILES.get(path(key));
      return o ? { data: await o.arrayBuffer(), metadata: meta(o), etag: o.etag } : null;
    },
    async getMetadata(key) {
      const o = await env.FILES.head(path(key));
      return o ? { metadata: meta(o), etag: o.etag } : null;
    },
    async set(key, data, { metadata = {} } = {}) {
      await env.FILES.put(path(key), data, { customMetadata: { meta: JSON.stringify(metadata) } });
    },
    async delete(key) { await env.FILES.delete(path(key)); },
    async list({ prefix = '' } = {}) {
      const blobs = [];
      let cursor;
      do {
        const page = await env.FILES.list({ prefix: path(prefix), cursor });
        for (const o of page.objects) blobs.push({ key: o.key.slice(name.length + 1), etag: o.etag });
        cursor = page.truncated ? page.cursor : undefined;
      } while (cursor);
      return { blobs };
    },
  };
}
