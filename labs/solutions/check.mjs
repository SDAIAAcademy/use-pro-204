// Runs the reference solution of every lab against the course files and prints PASS or the first
// difference.
//
//     node labs/solutions/check.mjs                 every lab and the capstone forms
//     node labs/solutions/check.mjs 1.2 capstone    some of them
//     node labs/solutions/check.mjs --offline       lab 2.1 without asking the official site
//
// What runs for real: everything a participant does by opening a file. Each citation of the memo
// is looked up on the pages of the closed portal (does the article exist, is it struck out, whose
// law is it, is the appeal number in the court's register, does the page hold the words the memo
// attributes to it); the two drafts are read from the Word files and compared clause by clause;
// each playbook position is tested on the text of the second draft; the handling card is applied
// to the twelve documents; the pseudonymised report is searched for every identifier.
// What does not run: anything a participant does in an AI assistant. The assistant's outputs are
// recorded files with planted faults, and this script checks that the faults are the ones the
// answer key names. No model is called and nothing is written to disk.
// Lab 2.1 reads a real regulation on its official site. The script only proves that the address
// answers with the file; whether a register entry says what the article says is a reading, done by
// the author on the official text and repeated by the trainer before each cohort.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILES = path.join(HERE, '..', 'files');
const REF = path.join(HERE, 'reference');
const args = process.argv.slice(2);
const OFFLINE = args.includes('--offline');
const only = args.filter(a => !a.startsWith('--'));

const read = (base, rel) => fs.readFileSync(path.join(base, rel), 'utf8').replace(/^﻿/, '');
const json = rel => JSON.parse(read(REF, rel));
function csv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  return rows.filter(r => r.some(c => c !== ''));
}
const norm = s => s.normalize('NFKC').replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/\s+/g, ' ').trim();
const unesc = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const strip = html => unesc(html.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const has = (text, part) => norm(text).includes(norm(part));
const exists = rel => fs.existsSync(path.join(FILES, rel));

// ------------------------------------------------------------------ the portal, as a reader meets it
// The articles of a portal page: {n: {text, repealed}}.
function articles(file) {
  const html = read(FILES, 'portal/' + file), out = {};
  for (const m of html.matchAll(/<h3>المادة \(([^)]+)\)([^<]*)<\/h3><p>([\s\S]*?)<\/p>/g)) out[m[1]] = { text: strip(m[3]), repealed: m[2].includes('ملغاة') };
  return { status: strip((html.match(/<p class="(?:ok|stamp)">([\s\S]*?)<\/p>/) || [])[1] || ''), arts: out };
}
function instrumentOf(ref, previous) {
  if (/المنطقة المالية الحرة/.test(ref)) return 'fz-reg-2022.html';
  if (/اللائحة التنفيذية/.test(ref)) return 'reg-3-2020.html';
  if (/\(4\) لسنة 2021/.test(ref)) return 'law-4-2021.html';
  if (/الدليل الإرشادي/.test(ref)) return 'guide-2023.html';
  if (/\(7\) لسنة 2019/.test(ref)) return 'law-7-2019.html';
  if (/القانون نفسه/.test(ref)) return previous;
  return null;
}
// Rasin is licensed outside the free zone (the case brief says so), and the zone's regulation
// applies to entities licensed in the zone only (its article 2 says so).
const outsideZone = () => has(strip(read(FILES, 'case/case_brief.html')), 'خارج المنطقة المالية الحرة') && has(articles('fz-reg-2022.html').arts['2'].text, 'المرخصة من سلطة المنطقة المالية الحرة دون غيرها');
const lastAppeal = () => Number(strip(read(FILES, 'portal/judgments.html')).match(/إلى (\d+)\/2023/)[1]);

// The verdict a reader reaches for one citation. `expect` is the words that must be on the page
// for the claim to stand: the one judgement a script cannot make, so it is written down here.
function verdict(cite, previous, expect) {
  const ref = cite.ref, judgment = ref.match(/رقم (\d+)\/(\d{4})/);
  if (judgment && /حكم/.test(ref)) {
    const file = `j-${judgment[1]}-${judgment[2]}.html`;
    if (!exists('portal/' + file)) { assert.ok(!has(strip(read(FILES, 'portal/judgments.html')), `${judgment[1]}/${judgment[2]}`)); if (/المحكمة العليا/.test(ref) && judgment[2] === '2023') assert.ok(Number(judgment[1]) > lastAppeal()); return { fault: 'مرجع مختلق', file: 'judgments.html' }; }
    const text = strip(read(FILES, 'portal/' + file));
    return { fault: expect.every(e => has(text, e)) ? null : 'مبدأ قضائي محرَّف', file };
  }
  const file = instrumentOf(ref, previous), n = (ref.match(/المادة \(([^)]+)\)( مكررًا)?/) || []).slice(1, 3).filter(Boolean).join('');
  assert.ok(file, `no instrument for: ${ref}`);
  const art = articles(file).arts[n];
  if (!art) return { fault: 'مرجع مختلق', file };
  if (file === 'fz-reg-2022.html' && outsideZone()) return { fault: 'اختصاص قضائي خطأ', file };
  if (art.repealed) return { fault: 'حكم ملغى', file };
  if (!expect.every(e => has(art.text, e))) {
    // the words are not in the text in force: are they in the text as enacted?
    const old = articles('law-7-2019-original.html').arts[n];
    assert.ok(file === 'law-7-2019.html' && old && expect.every(e => has(old.text, e)), `claim of citation ${cite.id} is on no page`);
    return { fault: 'حكم ملغى', file };
  }
  return { fault: null, file };
}
function memoCites(rel) {
  const html = read(FILES, rel), out = [];
  for (const m of html.matchAll(/<li>([\s\S]*?) <b>\[([\s\S]*?)\]<\/b><\/li>/g)) out.push({ id: out.length + 1, claim: strip(m[1]), ref: strip(m[2]) });
  return out;
}
function runMemo(rel, expects) {
  const cites = memoCites(rel); let previous = null; const out = [];
  for (const c of cites) { const v = verdict(c, previous, expects[c.id] || []); if (/\.html$/.test(v.file) && !/^j-|judgments/.test(v.file)) previous = v.file; out.push({ id: c.id, ...v }); }
  return out;
}

const LABS = {};

// ------------------------------------------------------------------ 1.1
LABS['1.1'] = () => {
  const expects = { 1: ['داخل نوارة', 'جنسية'], 2: ['بتعليمات موثقة'], 3: ['دون إذن', 'ثلاثين يومًا'], 4: ['اثنتين وسبعين ساعة'], 5: ['تشفير', 'اثني عشر شهرًا'], 6: ['بأمر قضائي مسبب'], 7: ['إلى أي دولة'], 8: ['بالتضامن'], 9: ['على إطلاقها'], 10: [] };
  const got = runMemo('memo/dhalul_memo.html', expects), key = json('D1_1_key.json');
  assert.equal(got.length, 10);
  assert.deepEqual(got.map(g => [g.id, g.fault, g.file]), key.map(k => [k.id, k.fault, k.page]));
  const faulty = got.filter(g => g.fault);
  assert.equal(faulty.length, 4);
  assert.equal(new Set(faulty.map(g => g.fault)).size, 4, 'four different kinds of fault');
  // the reference table says the same
  const ref = csv(read(REF, 'D1_1_check_table.csv')).slice(1);
  assert.deepEqual(ref.map(r => r[6]), got.map(g => g.fault ? 'معيب' : 'سليم'));
  // what "is there a page with this name?" would have let through
  const pageOnly = got.filter(g => g.fault !== 'مرجع مختلق').length;
  // the two recorded requests
  const req = read(FILES, 'memo/requests.html'), [first, second] = [...req.matchAll(/<blockquote>([\s\S]*?)<\/blockquote>/g)].map(m => strip(m[1]));
  for (const w of ['تؤكد', 'تؤيد', 'في مأمن']) { assert.ok(first.includes(w)); assert.ok(!second.includes(w)); }
  // the memo's summary goes further than its own citation 6
  assert.ok(has(strip(read(FILES, 'memo/dhalul_memo.html')), 'دون علمكم وإذنكم'));
  assert.ok(has(articles('law-4-2021.html').arts['8'].text, 'ولا يتوقف تنفيذ الأمر على موافقة المتحكم'));
  // the stretch: the unofficial translation was not updated
  assert.ok(read(FILES, 'portal/en-law-7-2019.html').includes('five working days'));
  assert.ok(has(articles('law-7-2019.html').arts['9'].text, 'اثنتين وسبعين ساعة'));
  // every link of the portal index opens
  for (const m of read(FILES, 'portal/index.html').matchAll(/href="([^"]+)"/g)) assert.ok(exists('portal/' + m[1]), m[1]);
  return `10 citations: ${10 - faulty.length} sound, ${faulty.length} faulty (${faulty.map(g => `${g.id} ${g.fault}`).join('; ')}); a page-exists test alone passes ${pageOnly} of 10`;
};

// ------------------------------------------------------------------ 1.2
// The paragraphs of a Word file written by the generator (one deflated entry, word/document.xml)
function docxText(rel) {
  const buf = fs.readFileSync(path.join(FILES, rel)), name = Buffer.from('word/document.xml');
  let at = buf.indexOf(Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04])]));
  while (at >= 0) {
    const n = buf.readUInt16LE(at + 26), x = buf.readUInt16LE(at + 28), size = buf.readUInt32LE(at + 18);
    if (buf.subarray(at + 30, at + 30 + n).equals(name)) {
      const xml = zlib.inflateRawSync(buf.subarray(at + 30 + n + x, at + 30 + n + x + size)).toString('utf8');
      return [...xml.matchAll(/<w:t xml:space="preserve">([\s\S]*?)<\/w:t>/g)].map(m => unesc(m[1]));
    }
    at = buf.indexOf(Buffer.from([0x50, 0x4b, 0x03, 0x04]), at + 30 + n + x + size);
  }
  throw new Error('no document.xml in ' + rel);
}
// A draft as {heading -> [{no, text}]}
function clausesOf(paragraphs) {
  const out = new Map(); let heading = null;
  for (const p of paragraphs) {
    if (/^(المادة |الملحق \()/.test(p) && !/^\S+ \S+ \d/.test(p) && out.size >= 0 && !/^م?\d/.test(p)) { if (!out.has(p)) out.set(p, []); heading = p; continue; }
    const m = p.match(/^(م?\d+\.\d+) ([\s\S]+)$/);
    if (m && heading) out.get(heading).push({ no: m[1], text: m[2] });
  }
  return out;
}
const wordsOf = t => new Set(norm(t).split(' '));
const similar = (a, b) => { const x = wordsOf(a), y = wordsOf(b); let both = 0; for (const w of x) if (y.has(w)) both++; return both / Math.min(x.size, y.size); };
function compareDrafts(a, b) {
  const changes = [];
  for (const [heading, before] of a) {
    const after = b.get(heading) || [], rest = after.filter(c => !before.some(o => o.text === c.text));
    for (const o of before) {
      if (after.some(c => c.text === o.text)) continue;
      // a rewritten clause keeps its place: the same number under the same heading, or most of its words
      let i = rest.findIndex(c => c.no === o.no);
      if (i < 0) i = rest.findIndex(c => similar(o.text, c.text) > 0.5);
      if (i >= 0) { changes.push({ kind: 'معدَّل', where: `${rest[i].no} في المسودة الثانية`, heading }); rest.splice(i, 1); }
      else changes.push({ kind: 'محذوف', where: `${o.no} في المسودة الأولى (حُذف)`, heading });
    }
    for (const c of rest) changes.push({ kind: 'مضاف', where: `${c.no} في المسودة الثانية`, heading });
  }
  return changes;
}
// One test per playbook position, on the text of the second draft: what a reviewer looks for.
const find = (clauses, re) => { for (const list of clauses.values()) for (const c of list) if (re.test(c.text)) return c; return null; };
const POSITION_TESTS = {
  P1: d => { const c = find(d, /وفق تعليمات العميل الموثقة/); return c ? ['مطابق', c.no] : ['بند ناقص']; },
  P2: d => { const c = find(d, /معالج(ين)? فرعي/); if (!c) return ['بند ناقص']; return /موافقة كتابية مسبقة من العميل على كل معالج/.test(c.text) ? ['مطابق', c.no] : /ثلاثين يومًا/.test(c.text) && /يعترض|اعتراض/.test(c.text) ? ['بديل احتياطي', c.no] : ['خط أحمر', c.no]; },
  P3: d => { const c = find(d, /يشعر المورّد العميل بأي حادثة تسرب/); if (!c) return ['بند ناقص']; return /أربعًا وعشرين ساعة/.test(c.text) ? ['مطابق', c.no] : /ثمانيًا وأربعين ساعة/.test(c.text) ? ['بديل احتياطي', c.no] : ['خط أحمر', c.no]; },
  P4: d => { const c = find(d, /لا تتجاوز مسؤولية أي طرف/); if (!c) return ['بند ناقص']; return /ولا يسري هذا الحد على الإخلال بالتزامات حماية البيانات الشخصية والسرية/.test(c.text) ? ['مطابق', c.no] : /مئتين في المئة/.test(c.text) ? ['بديل احتياطي', c.no] : ['خط أحمر', c.no]; },
  P5: d => { const c = find(d, /يدقق/); if (!c) return ['خط أحمر']; return /يدقق مرة كل سنة/.test(c.text) ? ['مطابق', c.no] : /تقرير تدقيق صادر عن جهة مستقلة/.test(c.text) && /عقب أي حادثة/.test(c.text) ? ['بديل احتياطي', c.no] : ['خط أحمر', c.no]; },
  P6: d => { const c = find(d, /تُحفظ البيانات الشخصية وتُعالج في مراكز بيانات/); if (!c) return ['بند ناقص']; return /داخل المملكة العربية السعودية/.test(c.text) && /بموافقة كتابية مسبقة/.test(c.text) ? ['مطابق', c.no] : /أي موقع آخر/.test(c.text) ? ['خط أحمر', c.no] : ['بديل احتياطي', c.no]; },
  P7: d => { const c = find(d, /يعيد المورّد إلى العميل جميع البيانات الشخصية/); return c ? [/ثلاثين يومًا/.test(c.text) ? 'مطابق' : 'بديل احتياطي', c.no] : ['بند ناقص']; },
  P8: d => { const c = find(d, /تخضع هذه الاتفاقية ل/); if (!c) return ['بند ناقص']; return /لأنظمة المملكة العربية السعودية/.test(c.text) ? [/تحكيم/.test(c.text) ? 'بديل احتياطي' : 'مطابق', c.no] : ['خط أحمر', c.no]; },
  P9: d => { const c = find(d, /تبقى التزامات السرية سارية مدة/); if (!c) return ['بند ناقص']; return /خمس سنوات/.test(c.text) ? ['مطابق', c.no] : /ثلاث سنوات/.test(c.text) ? ['بديل احتياطي', c.no] : ['خط أحمر', c.no]; },
  P10: d => { const c = find(d, /يشعر المورّد العميل بكل طلب إفصاح/); return c ? ['مطابق', c.no] : ['بند ناقص']; },
  P11: d => { const c = find(d, /تُشفَّر البيانات الشخصية عند التخزين وعند النقل/), logs = find(d, /تُحفظ السجلات اثني عشر شهرًا/), test = find(d, /اختبار اختراق للمنصة مرة كل سنة/); return c && logs && test ? ['مطابق', c.no] : ['خط أحمر']; },
  P12: d => { const c = find(d, /يتقاضى عن المساعدة/); if (!c) return find(d, /المساعدة المعقولة/) ? ['مطابق'] : ['بند ناقص']; return /لا تتجاوز تكلفته الفعلية/.test(c.text) ? ['بديل احتياطي', c.no] : ['خط أحمر', c.no]; },
  P13: d => { const c = find(d, /تأمين/); return c ? ['مطابق', c.no] : ['بند ناقص']; },
  P14: d => { const a = find(d, /^الغرض من المعالجة/), b = find(d, /^فئات البيانات الشخصية/), c = find(d, /^مدة المعالجة/); return a && b && c ? ['مطابق', a.no] : ['خط أحمر']; },
};
LABS['1.2'] = () => {
  const p1 = docxText('contract/dpa_v1.docx'), p2 = docxText('contract/dpa_v2.docx');
  // the Word files and the pages hold the same text
  for (const [p, rel] of [[p1, 'contract/dpa_v1.html'], [p2, 'contract/dpa_v2.html']]) { const page = norm(strip(read(FILES, rel))); for (const t of p) assert.ok(page.includes(norm(t)), `${rel} lacks: ${t.slice(0, 40)}`); }
  const d1 = clausesOf(p1), d2 = clausesOf(p2), facts = json('D1_2_facts.json');
  const words = p => p.join(' ').split(/\s+/).filter(Boolean).length;
  assert.deepEqual([words(p1), words(p2)], [facts.words_v1, facts.words_v2]);
  // the comparison
  const changes = compareDrafts(d1, d2), ref = csv(read(REF, 'D1_2_comparison_report.csv')).slice(1);
  assert.deepEqual(changes.map(c => [c.where, c.kind]).sort(), ref.map(r => [r[1], r[2]]).sort());
  assert.equal(changes.length, facts.changes);
  const silent = ref.filter(r => r[4] === 'لا').length;
  assert.equal(silent, facts.changes_silent);
  // the supplier's note against the changes: a change it names is not silent
  const note = strip(read(FILES, 'contract/cover_note.html'));
  assert.equal((read(FILES, 'contract/cover_note.html').match(/<li>/g) || []).length, facts.changes_noted + facts.changes_partial);
  assert.ok(!/معالج(ين)? فرعي|السرية|إتلاف|التوافر|السداد/.test(note));
  // the recorded comparison
  const run = read(FILES, 'contract/dhalul_compare_run.html'), named = [...run.matchAll(/<li>البند (م?\d+\.\d+):/g)].map(m => m[1]);
  const changed = changes.map(c => c.where.split(' ')[0]);
  assert.ok(named.every(n => changed.includes(n)));
  assert.equal(named.length, facts.compare_found);
  assert.ok(/المادة الثالثة/.test(run) && !changes.some(c => /المادة الثالثة:/.test(c.heading)), 'the run invents a change in article 3');
  // the review against the playbook
  const key = csv(read(REF, 'D1_2_issues_list.csv')).slice(1), got = {};
  for (const [id, test] of Object.entries(POSITION_TESTS)) got[id] = test(d2);
  assert.deepEqual(Object.entries(got).map(([id, g]) => [id, g[0]]), key.map(r => [r[0], r[3]]));
  for (const r of key) if (r[3] !== 'بند ناقص') assert.equal(got[r[0]][1], r[2], `clause number of ${r[0]}`);
  // the first draft is Sanam's own: it meets the preferred position wherever it has the clause
  const first = Object.entries(POSITION_TESTS).map(([id, test]) => [id, test(d1)[0]]).filter(([, s]) => s !== 'مطابق');
  assert.deepEqual(first, [['P13', 'بند ناقص']]);
  const count = s => key.filter(r => r[3] === s).length;
  assert.deepEqual([count('خط أحمر'), count('بديل احتياطي'), count('بند ناقص'), count('مطابق')], [facts.red, facts.fallback, facts.missing, facts.compliant]);
  // the recorded review, row by row, against the text
  const rows = [...read(FILES, 'contract/dhalul_review_run.html').matchAll(/<tr><td>\d+<\/td><td>([^<]*)<\/td><td>([^<]*)<\/td><td>([^<]*)<\/td><td>([^<]*)<\/td><\/tr>/g)].map(m => ({ no: m[1], topic: unesc(m[2]), cls: m[3], note: m[4] }));
  const playbook = [...read(FILES, 'contract/playbook.html').matchAll(/<tr><td>(P\d+)<\/td><td>([^<]*)<\/td>/g)].map(m => ({ id: m[1], topic: unesc(m[2]) }));
  assert.equal(playbook.length, 14);
  let real = 0, invented = 0, wrongClass = [], wrongNo = [];
  for (const r of rows) {
    const id = playbook.find(p => p.topic === r.topic).id, truth = got[id];
    if (truth[0] === 'مطابق') { invented++; continue; }
    real++;
    if (truth[0] !== r.cls) wrongClass.push(id);
    if (truth[1] !== r.no) wrongNo.push(id);
  }
  const missed = key.filter(r => r[3] !== 'مطابق' && !rows.some(x => x.topic === r[1])).map(r => r[0]);
  assert.deepEqual([rows.length, real, invented, missed, wrongClass, wrongNo], [facts.run_rows, facts.run_real, facts.run_invented, facts.run_missed, facts.run_wrong_class, facts.run_wrong_number.map(x => x.p)]);
  assert.ok(key.filter(r => r[3] === 'بند ناقص').every(r => missed.includes(r[0])), 'the run misses every missing clause');
  return `${facts.words_v2} words in the second draft; ${changes.length} changes (${silent} not in the supplier's note; the recorded comparison finds ${named.length} and invents 1); ${key.length - count('مطابق')} issues in 14 positions (${count('خط أحمر')} red lines, ${count('بديل احتياطي')} fallbacks, ${count('بند ناقص')} missing); the recorded review has ${real} real issues, ${invented} invented, misses ${missed.join(' ')}`;
};

// ------------------------------------------------------------------ 2.1
// The paragraphs each article has in the official text, as read by the author on 17 Nov 2026.
const PARAGRAPHS = { 17: 5, 23: 0, 24: 5, 25: 4 };
const refOk = ref => { const m = ref.match(/^(\d+)(?:\/(\d+))?/); if (!m || !(m[1] in PARAGRAPHS)) return false; return m[2] ? Number(m[2]) <= PARAGRAPHS[m[1]] : true; };
LABS['2.1'] = async () => {
  const reg = csv(read(REF, 'D2_1_register.csv')), source = reg[0], rows = reg.slice(2);
  assert.equal(rows.length, 15);
  for (const r of rows) { assert.ok(refOk(r[1]), `reference ${r[1]}`); assert.ok(['جهة التحكم', 'جهة المعالجة'].includes(r[2])); for (const i of [3, 4, 6, 7, 8]) assert.ok(r[i].length > 3, `${r[0]} column ${i}`); }
  const controls = [...read(FILES, 'register/roles_and_controls.html').matchAll(/<td>(C-\d+)<\/td>/g)].map(m => m[1]);
  const owners = [...read(FILES, 'register/roles_and_controls.html').matchAll(/<tr><td>([^<]+)<\/td><td>[^<]+<\/td><td>[^<]+<\/td><\/tr>/g)].map(m => unesc(m[1]));
  for (const r of rows) { assert.ok(controls.includes(r[7].split(':')[0]), r[7]); assert.ok(owners.includes(r[6]), r[6]); }
  // the processor's own obligations are owned by the supplier
  for (const r of rows) assert.equal(r[2] === 'جهة المعالجة', r[6] === 'المورّد رصين', r[0]);
  // the draft, row by row, against the reference
  const draft = csv(read(FILES, 'register/dhalul_register_draft.csv')).slice(2).filter(r => /^\d+$/.test(r[0])), key = csv(read(REF, 'D2_1_draft_key.csv')).slice(1);
  assert.equal(draft.length, 15);
  const byRef = new Map(); for (const r of rows) byRef.set(r[0], r);
  const found = [];
  draft.forEach((d, i) => {
    const k = key[i], of = byRef.get(k[4]);
    let fault = null;
    if (!refOk(d[1])) fault = 'no such article or paragraph in the block';
    else if (!of) fault = 'no obligation in the reference';
    else if (d[1].split(' ')[0] !== of[1].split(' ')[0]) fault = 'reference differs';
    else if (d[2] !== of[2]) fault = 'party differs';
    else if (/\d+ ساعة/.test(d[4]) && (d[4].match(/\d+ ساعة/)[0] !== (of[4].match(/\d+ ساعة/) || [''])[0] || !/^خلال \d+ ساعة من/.test(of[4]))) fault = 'period differs';
    assert.equal(Boolean(fault), k[2] === 'معيب', `draft row ${d[0]}: ${fault}`);
    if (fault) found.push(`${d[0]} (${fault})`);
  });
  const covered = new Set(key.map(k => k[4])), missing = rows.filter(r => !covered.has(r[0])).map(r => r[1]);
  assert.deepEqual(missing, ['24/3', '25/4']);
  // the stretch: the seven elements against the second draft
  const el = csv(read(REF, 'D2_1_elements_17.csv')).slice(1);
  assert.equal(el.length, 7);
  assert.deepEqual(el.filter(e => e[3].startsWith('ناقص')).map(e => e[0]), ['ه', 'و']);
  // the official address answers with the file
  let online = 'official address not requested (--offline)';
  if (!OFFLINE) {
    try {
      const res = await fetch(source[2], { headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36' }, signal: AbortSignal.timeout(60000) });
      const head = Buffer.from(await res.arrayBuffer()).subarray(0, 5).toString('latin1');
      online = head === '%PDF-' ? 'the official address answers with the PDF' : `the official address answered without the file (status ${res.status}): open it in a browser`;
    } catch (e) { online = `the official address did not answer (${e.name}): open it in a browser`; }
  }
  return `15 reference entries on articles 17, 23, 24, 25; the recorded draft has ${found.length} faulty rows of 15: ${found.join(', ')}; it misses ${missing.join(' and ')}; ${online}`;
};

// ------------------------------------------------------------------ 2.2
const ORDER = ['لا أداة', 'ذلول', 'المساعد التجاري المعتمد', 'أداة عامة'];
// The card applied rule by rule: each rule gives a ceiling, and the lowest ceiling wins.
function card({ level, priv, pd, third }) {
  let ceiling = 3; const before = new Set(); let escalate = false;
  const cap = n => { ceiling = Math.min(ceiling, n); };
  if (level === 'سري للغاية') cap(0);
  if (third) cap(0);
  if (priv !== 'لا') { cap(1); if (priv === 'مشكوك') escalate = true; }
  if (level !== 'عام') cap(2);
  if (pd === 'حساسة: كله') cap(1);
  if (ceiling === 0) return { tool: ORDER[0], before: 'لا شيء', escalate: false };
  if (pd.startsWith('حساسة') && ceiling === 1) before.add('ترميز');
  if (pd === 'حساسة: جزء' && ceiling >= 2) { before.add('حجب الجزء الحساس ثم ترميز'); }
  if (pd === 'شخصية' && ceiling >= 2) before.add('ترميز');
  return { tool: ORDER[ceiling], before: [...before][0] || 'لا شيء', escalate };
}
LABS['2.2'] = () => {
  const key = json('D2_2_decisions.json');
  assert.equal(key.length, 12);
  for (const k of key) { const g = card(k); assert.deepEqual([g.tool, g.before, g.escalate], [k.tool, k.before, k.escalate], k.id); assert.ok(exists(`matter/${k.id}.html`)); }
  // what the documents themselves show
  const doc = id => strip(read(FILES, `matter/${id}.html`));
  assert.ok(/\d{10}/.test(doc('D05')) && /التشخيص/.test(doc('D05')));
  assert.ok(/تعهدت سنام كتابة/.test(doc('D11')));
  assert.ok(/وكالة/.test(doc('D08')) && /المحامي/.test(doc('D08')));
  assert.ok(/بطلب من المحامي/.test(doc('D07')));
  assert.ok(/الحالة الصحية/.test(doc('D06')));
  // the pseudonymised report keeps no identifier and keeps the medical content
  const table = [...read(FILES, 'matter/pseudonym_table.html').matchAll(/<tr><td>([^<]+)<\/td><td>([^<]+)<\/td><\/tr>/g)].map(m => [unesc(m[1]), unesc(m[2])]);
  assert.equal(table.length, 7);
  const out = read(REF, 'D2_2_D05_pseudonymised.md');
  for (const [id, code] of table) { assert.ok(doc('D05').includes(id), id); assert.ok(!out.includes(id), `still there: ${id}`); assert.ok(out.includes(code)); }
  assert.ok(!/\d{7,}/.test(out) && /كسر في عظم الترقوة/.test(out) && /السكري/.test(out));
  // the decision sheet lists the same twelve documents
  assert.deepEqual(csv(read(FILES, 'start/handling_decisions.csv')).slice(1).map(r => r[0]), key.map(k => k.id));
  const n = t => key.filter(k => k.tool === t).length;
  return `12 documents: ${ORDER.map(t => `${n(t)} ${t}`).join(', ')}; ${key.filter(k => k.before !== 'لا شيء').length} need pseudonymisation or redaction first; ${key.filter(k => k.escalate).map(k => k.id).join(' ')} goes to the general counsel; the pseudonymised D05 keeps none of its 7 identifiers`;
};

// ------------------------------------------------------------------ the capstone forms
const NDA_TESTS = {
  M1: t => /سارية خمس سنوات/.test(t) ? 'مطابق' : /سارية ثلاث سنوات/.test(t) ? 'بديل احتياطي' : /التزامات السرية سارية/.test(t) ? 'خط أحمر' : 'بند ناقص',
  M2: t => /كتابة أو شفاهة أو بأي وسيلة/.test(t) ? 'مطابق' : /أُكد كتابة خلال خمسة عشر يومًا/.test(t) ? 'بديل احتياطي' : /المعلومات السرية هي/.test(t) ? 'خط أحمر' : 'بند ناقص',
  M3: t => /بعد أن يلتزموا بتعهد سرية مماثل/.test(t) ? 'مطابق' : /أن يطلع على المعلومات السرية/.test(t) ? 'خط أحمر' : 'بند ناقص',
  M4: t => /يتلفها خلال خمسة عشر يومًا/.test(t) ? 'مطابق' : /يتلفها خلال ثلاثين يومًا/.test(t) ? 'بديل احتياطي' : 'بند ناقص',
  M5: t => /لأنظمة المملكة العربية السعودية، وتختص/.test(t) ? 'مطابق' : /لأنظمة المملكة العربية السعودية، ويُفصل/.test(t) ? 'بديل احتياطي' : /تخضع هذه الاتفاقية/.test(t) ? 'خط أحمر' : 'بند ناقص',
  M6: t => /أداة ذكاء اصطناعي/.test(t) ? 'مطابق' : 'بند ناقص',
};
LABS.capstone = () => {
  const keys = json('capstone_keys.json');
  const expects = {
    1: { 1: ['خمسة أيام عمل'], 2: ['وصفها ووقتها'], 3: ['بسجل مكتوب'], 4: ['أقصر من المهلة القانونية'], 6: ['مليوني دينار'] },
    2: { 1: ['دولة مدرجة'], 2: ['إلى أي دولة'], 3: ['مواقع حفظ البيانات'], 4: ['بإذن كتابي مسبق'], 5: ['النقل'], 6: ['كل معالج مرخص في نوارة'] },
    3: { 1: ['إقرارًا مكتوبًا'], 2: ['ثلاثين يومًا'], 3: ['بالتضامن'], 4: ['الخطأ الجسيم'], 5: ['إخطار مفوض المنطقة'], 6: ['مرة كل سنة على الأقل'] },
  };
  const a = [1, 2, 3].map(n => runMemo(`capstone/track_a_form${n}.html`, expects[n]).filter(g => g.fault).map(g => ({ id: g.id, fault: g.fault })));
  assert.deepEqual(a, keys.A.map(k => k.faulty));
  for (const f of a) assert.equal(f.length, 2);
  const b = [1, 2, 3].map(n => { const t = strip(read(FILES, `capstone/track_b_form${n}.html`)); return Object.fromEntries(Object.entries(NDA_TESTS).map(([id, test]) => [id, test(t)])); });
  assert.deepEqual(b, keys.B.map(k => k.state));
  for (const f of b) assert.equal(Object.values(f).filter(s => s !== 'مطابق').length, 3);
  // the recorded runs: each misses at least one planted item
  for (const n of [2, 3]) {
    const fa = keys.A[n - 1].faulty.map(x => x.id), ra = keys.runs.A[n].flagged; assert.ok(fa.some(id => !ra.includes(id)));
    const fb = Object.entries(keys.B[n - 1].state).filter(([, s]) => s !== 'مطابق').map(([id]) => id), rb = keys.runs.B[n].flagged; assert.ok(fb.some(id => !rb.includes(id)));
    const page = strip(read(FILES, `capstone/recorded_runs_form${n}.html`)); assert.ok(page.includes(ra.join(' و')) && page.includes(rb.join(' و')));
  }
  // the key of form 1 is the one the participant opens after the baseline
  const k1 = strip(read(FILES, 'capstone/form1_keys.html'));
  for (const x of keys.A[0].faulty) assert.ok(k1.includes(x.fault));
  for (const rel of ['capstone/prework_guide.html', 'capstone/redesign_card.html', 'start/measurement_log.csv']) assert.ok(exists(rel));
  assert.equal(csv(read(FILES, 'start/measurement_log.csv')).length, 4);
  return `track A: 3 memos of 6 citations, 2 faulty in each (${a.map(f => f.map(x => x.id).join('+')).join(', ')}); track B: 3 agreements, 3 issues in each of 6 positions`;
};

let failed = 0;
for (const id of Object.keys(LABS)) {
  if (only.length && !only.includes(id)) continue;
  try { console.log(`${id}  PASS  ${await LABS[id]()}`); }
  catch (e) { failed++; console.log(`${id}  FAIL  ${e.message.split('\n').slice(0, 8).join(' | ')}`); if (process.env.CHECK_DEBUG) console.log(e.stack, JSON.stringify(e.actual), JSON.stringify(e.expected)); }
}
process.exit(failed ? 1 : 0);
