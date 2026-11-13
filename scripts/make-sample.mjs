// Writes the invented family the site starts with: db/seed.sql (for the database) and data/family.json (for the
// local preview and the demo). Nobody here is a real person; their portraits in public/people/ are
// AI-generated. Run: node scripts/make-sample.mjs
import { createHash } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';

const id = (label) => { const h = createHash('sha1').update(`sample:${label}`).digest('hex'); return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`; };
const people = [], couples = [];
let n = 0;
const CITIES = ['Jerusalem', 'Brooklyn, NY', 'London', 'Melbourne', 'Tzfat', 'Miami, FL'];
function person(en, he, sex, last, year, extra = {}) {
  n++;
  const adult = year < 5766;
  const p = {
    id: id(`${en}-${last[0]}-${year}`), he_first: he, he_full: he, en_first: en, he_last: last[1], en_last: last[0], sex,
    h_day: (n * 7) % 29 + 1, h_month: (n * 5) % 12 + 1, h_year: year, deceased: false, parents: null,
    city: adult ? CITIES[n % CITIES.length] : null,
    phone: adult ? `1-555-01${String(n).padStart(2, '0')}` : null,
    email: adult ? `${en.toLowerCase().replace(/\s/g, '')}${n}@example.com` : null,
    ...extra,
  };
  people.push(p);
  return p;
}
function couple(a, b, year, root = false) {
  const c = { id: id(`couple-${a.id}`), a: a.id, b: b.id, root, w_day: (n * 3) % 28 + 1, w_month: (n * 4) % 12 + 1, w_year: year };
  couples.push(c);
  return c;
}
const FAMILY = ['Rosenfeld', 'רוזנפלד'];
// The top couple.
const top = couple(
  person('Avraham', 'אברהם', 'm', FAMILY, 5700, { deceased: true, d_day: 12, d_month: 9, d_year: 5778, city: null, phone: null, email: null }),
  person('Sarah', 'שרה', 'f', FAMILY, 5703, { maiden: 'Schwartz' }), 5723, true);
// Their children, each with a spouse and children: [name, he, sex, spouse, spouse he, surname, year, wife's maiden name, kids]
const branches = [
  ['Yitzchak', 'יצחק', 'm', 'Rivka', 'רבקה', FAMILY, 5725, 'Levin', [['Yaakov', 'יעקב', 'm'], ['Leah', 'לאה', 'f'], ['Dovid', 'דוד', 'm'], ['Chana', 'חנה', 'f']]],
  ['Miriam', 'מרים', 'f', 'Aharon', 'אהרן', ['Katz', 'כץ'], 5727, null, [['Moshe', 'משה', 'm'], ['Devorah', 'דבורה', 'f'], ['Yosef', 'יוסף', 'm']]],
  ['Shmuel', 'שמואל', 'm', 'Esther', 'אסתר', FAMILY, 5730, 'Goldstein', [['Binyamin', 'בנימין', 'm'], ['Rochel', 'רחל', 'f'], ['Levi', 'לוי', 'm'], ['Dina', 'דינה', 'f'], ['Shimon', 'שמעון', 'm']]],
  ['Bracha', 'ברכה', 'f', 'Eliyahu', 'אליהו', ['Weiss', 'וייס'], 5734, null, [['Naftali', 'נפתלי', 'm'], ['Malka', 'מלכה', 'f']]],
];
// The eldest grandson's wife and children, in the first two branches.
const GRAND = {
  Yitzchak: ['Chaya', 'חיה', 'Segal', [['Chaim', 'חיים', 'm'], ['Shoshana', 'שושנה', 'f'], ['Yehuda', 'יהודה', 'm']]],
  Miriam: ['Sheindy', 'שיינדי', 'Friedlander', [['Mendel', 'מענדל', 'm'], ['Raizel', 'רייזל', 'f'], ['Zalman', 'זלמן', 'm']]],
};
for (const [en, he, sex, sEn, sHe, last, year, wifeMaiden, kids] of branches) {
  const child = person(en, he, sex, last, year, { parents: top.id, maiden: sex === 'f' ? FAMILY[0] : null });
  const spouse = person(sEn, sHe, sex === 'm' ? 'f' : 'm', last, year + 1, sex === 'm' ? { maiden: wifeMaiden } : {});
  const c = couple(child, spouse, year + 22);
  kids.forEach(([kEn, kHe, kSex], i) => {
    const kid = person(kEn, kHe, kSex, last, year + 24 + i * 2, { parents: c.id });
    // The eldest of the first two branches is married with children of their own.
    if (i === 0 && year < 5730) {
      const [spEn, spHe, spMaiden, grand] = GRAND[en];
      const sp = person(spEn, spHe, 'f', last, year + 25, { maiden: spMaiden });
      const kc = couple(kid, sp, year + 46);
      grand.forEach(([gEn, gHe, gSex], j) => person(gEn, gHe, gSex, last, year + 48 + j * 2, { parents: kc.id }));
    }
  });
}

const q = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? v : typeof v === 'boolean' ? Number(v) : `'${String(v).replace(/'/g, "''")}'`);
const PCOLS = ['id', 'he_first', 'he_full', 'en_first', 'he_last', 'en_last', 'sex', 'maiden', 'h_day', 'h_month', 'h_year', 'd_day', 'd_month', 'd_year', 'deceased', 'city', 'phone', 'email'];
const CCOLS = ['id', 'a', 'b', 'w_day', 'w_month', 'w_year'];
const lines = [
  '-- The invented sample family (scripts/make-sample.mjs writes this file). Nobody here is a real person.',
  ...people.map((p) => `INSERT INTO people (${PCOLS.join(', ')}) VALUES (${PCOLS.map((k) => q(p[k])).join(', ')});`),
  ...couples.map((c) => `INSERT INTO couples (${CCOLS.join(', ')}, is_root) VALUES (${CCOLS.map((k) => q(c[k])).join(', ')}, ${Number(c.root)});`),
  ...people.filter((p) => p.parents).map((p) => `UPDATE people SET parents = ${q(p.parents)} WHERE id = ${q(p.id)};`),
];
writeFileSync(new URL('../db/seed.sql', import.meta.url), `${lines.join('\n')}\n`);
writeFileSync(new URL('../data/family.json', import.meta.url), `${JSON.stringify({ people: people.map((p) => ({ ...p, photo: existsSync(new URL(`../public/people/${p.id}.jpg`, import.meta.url)) ? `/people/${p.id}.jpg` : null })), couples, edits: [] }, null, 1)}\n`);
console.log(`${people.length} people, ${couples.length} couples; first child: ${people[2].en_first} ${people[2].id}`);
