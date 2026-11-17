// Helpers of the file-pack generator: a page of the pack, a spreadsheet file, a Word file.
// Nothing here reads a clock or the network, so the same sources give the same bytes.
import zlib from 'node:zlib';

export const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const CSS = `body{font-family:"IBM Plex Sans Arabic","Segoe UI",Tahoma,sans-serif;max-width:48rem;margin:0 auto;padding:1rem;line-height:1.85;color:#1e2a36;background:#fbfaf7}
.bar{font-size:.85rem;background:#eef2f4;border:1px solid #d5dde2;border-radius:.4rem;padding:.4rem .8rem;display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap}
.site{color:#0f766e;font-weight:700;margin:1.2rem 0 0}h1{font-size:1.45rem;line-height:1.5;margin:.3rem 0 1rem}h2{font-size:1.12rem;margin:1.4rem 0 .3rem}h3{font-size:1rem;margin:1rem 0 .2rem}
.meta{color:#5b6773;font-size:.9rem}.stamp{border:1px solid #b45309;color:#7c2d12;background:#fff7ed;padding:.4rem .7rem;border-radius:.3rem;font-size:.92rem}
.ok{border:1px solid #0f766e;color:#134e4a;background:#f0fdfa;padding:.4rem .7rem;border-radius:.3rem;font-size:.92rem}
table{border-collapse:collapse;width:100%;font-size:.95rem}td,th{border:1px solid #cfd8dc;padding:.35rem .5rem;text-align:start;vertical-align:top}th{background:#eef2f4}
li{margin:.3rem 0}.s{font-size:.82rem;color:#5b6773}.cl{margin:.5rem 0}.cl b{color:#0b3954}.ltr{direction:ltr;unicode-bidi:isolate;display:inline-block}
.scroll{overflow-x:auto}blockquote{margin:.6rem 0;padding:.3rem .9rem;border-inline-start:4px solid #94a3b8;background:#f1f5f9}`;

// One standalone page of the pack. `bar` is the line that says which world the page belongs to.
export function page(title, inner, { bar = 'ملف تدريبي اصطناعي · شركة سنام لتأجير السيارات', home = '', lang = 'ar' } = {}) {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><style>${CSS}</style></head>
<body>
<div class="bar" lang="ar" dir="rtl"><span>${esc(bar)}</span>${home}</div>
${inner}
</body>
</html>
`;
}

// A spreadsheet opens a UTF-8 file with Arabic correctly only when it starts with a byte order mark
export const csv = rows => '﻿' + rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n') + '\n';

export function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

export const mdTable = (head, rows) => `| ${head.join(' | ')} |\n|${head.map(() => '---').join('|')}|\n${rows.map(r => `| ${r.join(' | ')} |`).join('\n')}\n`;

// ------------------------------------------------------------------ a minimal Word file
// Paragraphs only: {style: 'title' | 'h1' | 'h2' | 'p', text, brk}. Right to left, Arabic;
// brk starts the paragraph on a new page.
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xFFFFFFFF; for (const b of buf) c = CRC[(c ^ b) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

function zip(files) {
  const parts = [], central = []; let offset = 0;
  for (const [name, text] of files) {
    const raw = Buffer.from(text, 'utf8'), data = zlib.deflateRawSync(raw, { level: 9 }), nm = Buffer.from(name, 'utf8'), crc = crc32(raw);
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0); head.writeUInt16LE(20, 4); head.writeUInt16LE(0x0800, 6); head.writeUInt16LE(8, 8);
    head.writeUInt16LE(0, 10); head.writeUInt16LE(0x5B21, 12); // a fixed date: 1 Sep 2025
    head.writeUInt32LE(crc, 14); head.writeUInt32LE(data.length, 18); head.writeUInt32LE(raw.length, 22); head.writeUInt16LE(nm.length, 26);
    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0); cen.writeUInt16LE(20, 4); cen.writeUInt16LE(20, 6); cen.writeUInt16LE(0x0800, 8); cen.writeUInt16LE(8, 10);
    cen.writeUInt16LE(0, 12); cen.writeUInt16LE(0x5B21, 14); cen.writeUInt32LE(crc, 16); cen.writeUInt32LE(data.length, 20); cen.writeUInt32LE(raw.length, 24);
    cen.writeUInt16LE(nm.length, 28); cen.writeUInt32LE(offset, 42);
    parts.push(head, nm, data); central.push(cen, nm); offset += 30 + nm.length + data.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, cd, end]);
}

export function docx(paragraphs) {
  const size = { title: 36, h1: 30, h2: 28, p: 28 };
  const para = ({ style = 'p', text, brk }) => {
    const bold = style === 'p' ? '' : '<w:b/><w:bCs/>';
    const jc = style === 'title' ? '<w:jc w:val="center"/>' : '';
    const space = style === 'p' ? '<w:spacing w:after="200" w:line="480" w:lineRule="auto"/>' : '<w:spacing w:before="320" w:after="200" w:line="480" w:lineRule="auto"/>';
    return `<w:p><w:pPr>${brk ? '<w:pageBreakBefore/>' : ''}<w:bidi/>${space}${jc}</w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>${bold}<w:sz w:val="${size[style]}"/><w:szCs w:val="${size[style]}"/><w:rtl/></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
  };
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs.map(para).join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1701" w:right="1701" w:bottom="1701" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/><w:bidi/></w:sectPr></w:body></w:document>`;
  return zip([
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
    ['word/document.xml', doc],
  ]);
}

// Arabic as compared in the checks: diacritics and tatweel removed, alef, teh marbuta and alef maqsura folded
export const norm = s => s.normalize('NFKC').replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/\s+/g, ' ').trim().toLowerCase();
export const strip = html => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ');
