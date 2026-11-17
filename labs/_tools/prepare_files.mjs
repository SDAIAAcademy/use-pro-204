// Writes the Sanam Car Rental file pack (labs/files/) and the trainer's reference files
// (labs/solutions/reference/, labs/solutions/*.md).
//
//     node labs/_tools/prepare_files.mjs
//
// Deterministic: no clock, no network, no random number. Every key is computed from the same
// tables that write the files, so a file and its key cannot drift apart. Everything about Sanam,
// Rasin, Durub and the state of Nawara is fictional.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { page, csv, mdTable, docx, esc } from './lib.mjs';
import * as P from './portal.mjs';
import * as C from './contract.mjs';
import * as F from './casefile.mjs';

const LABS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILES = path.join(LABS, 'files');
const SOL = path.join(LABS, 'solutions');
const REF = path.join(SOL, 'reference');

let written = 0;
function write(base, rel, data) {
  const file = path.join(base, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof data === 'string' ? data.replace(/\r\n/g, '\n') : data);
  written++;
}
for (const dir of [FILES, REF]) fs.rmSync(dir, { recursive: true, force: true });
const json = v => JSON.stringify(v, null, 2) + '\n';
const ps = list => list.map(t => `<p>${esc(t)}</p>`).join('\n');
const table = (head, rows) => `<div class="scroll"><table>\n<tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr>\n${rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('\n')}\n</table></div>`;

// ------------------------------------------------------------------ the case and the handling card
write(FILES, 'case/case_brief.html', page('ملخص الحالة: سنام ورصين', `
<h1>ملخص الحالة: شركة سنام لتأجير السيارات</h1>
<p>سنام شركة افتراضية لتأجير السيارات، مقرها الرياض ولها 64 فرعًا. تريد أن تنقل الحجوزات وعقود التأجير وبيانات تتبع المركبات إلى منصة سحابية يقدمها المورّد «رصين لخدمات البيانات».</p>
<p>رصين شركة مساهمة مرخصة في مدينة ميناء نوارة بدولة نوارة، <b>خارج المنطقة المالية الحرة</b>. نوارة دولة افتراضية، وقوانينها وأحكام محاكمها في هذا المقرر مختلقة كلها.</p>
<p>أنت <b>نجود كايد</b>، مستشارة قانونية في الإدارة القانونية بسنام. يعمل معك المساعد «قسطاس»، وهو نموذج مفتوح الأوزان على خوادم الشركة.</p>
<h2>من في الحالة</h2>
${table(['الاسم', 'الدور'], [['منيرة الراشد', 'المستشارة العامة'], ['ليث القويز', 'كبير المستشارين القانونيين، يقود التعاقد مع رصين'], ['جوري المشعل', 'مسؤولة الامتثال وحماية البيانات الشخصية'], ['نايف الطويم', 'مدير المشتريات'], ['شاكر الجريان', 'مدير أمن المعلومات'], ['أواب زهدي', 'مدير الحسابات في رصين'], ['مثنى السليمان', 'محامٍ من خارج الشركة، يمثلها في نزاع دروب'], ['متعب الفلاح', 'مالك «دروب لصيانة الأساطيل»'], ['لبيب نهار', 'مشرف أسطول المنطقة الغربية، شاهد في النزاع']])}
<h2>ما تعمل عليه في يومين</h2>
<ol>
<li>مذكرة بحث كتبها قسطاس عن قانون نوارة، فيها عشرة مراجع.</li>
<li>اتفاقية معالجة البيانات مع رصين: المسودة الأولى التي أعدتها سنام، والثانية التي أعادتها رصين، ودليل المواقف التعاقدية.</li>
<li>سجل التزامات من أربع مواد في اللائحة التنفيذية لنظام حماية البيانات الشخصية. هذا هو النص الحقيقي الوحيد في المقرر، وتقرؤه في موقعه الرسمي.</li>
<li>اثنا عشر مستندًا من نزاع سنام مع متعهد الصيانة «دروب».</li>
</ol>
<p class="stamp">قبل أن يدخل أي مستند أي أداة: قرار تعامل مكتوب على <a href="handling_card.html">بطاقة التعامل</a>.</p>`));

write(FILES, 'case/handling_card.html', page('بطاقة التعامل مع المستندات', `
<h1>بطاقة التعامل مع المستندات: الإدارة القانونية في سنام</h1>
<p>ثلاثة أسئلة عن كل مستند قبل أن يدخل أي أداة: ما مستوى سريته؟ هل هو مشمول بامتياز السرية المهنية؟ هل فيه بيانات شخصية، وهل هي حساسة؟</p>
<h2>مستويات السرية</h2>
<p>${F.LEVELS.map(esc).join(' · ')}</p>
<h2>الأدوات، من الأشد إلى الأوسع</h2>
${table(['الأداة', 'ما هي'], F.TOOLS.map(t => [t, F.TOOL_NOTES[t]]))}
<h2>القواعد</h2>
<ol>${F.CARD_RULES.map(r => `<li>${esc(r)}</li>`).join('')}</ol>
<h2>الترميز والحجب</h2>
${table(['الإجراء', 'معناه'], F.REDACTION_TERMS)}
<p class="s">هذه بطاقة شركة افتراضية. في جهتك تُكتب البطاقة على سياسة جهتك في تصنيف البيانات وعلى ما تعتمده من أدوات.</p>`));

// ------------------------------------------------------------------ lab 1.1: the portal
const home = '<a href="index.html">فهرس البوابة</a>';
const portalPage = (title, inner, opt = {}) => page(title, inner, { bar: P.PORTAL_BAR, home, ...opt });
const artHtml = a => `<div class="cl"${a.status === 'repealed' ? ' style="opacity:.75"' : ''}><h3>المادة (${esc(a.n)})${a.title ? ': ' + esc(a.title) : ''}${a.status === 'repealed' ? ' · ملغاة' : ''}</h3><p>${a.status === 'repealed' ? '<s>' + esc(a.text) + '</s>' : esc(a.text)}</p>${a.note ? `<p class="stamp">${esc(a.note)}</p>` : ''}</div>`;
const instrument = (x, cls = 'ok') => portalPage(x.title, `<p class="site">${esc(P.PORTAL_NAME)}</p>\n<h1>${esc(x.title)}</h1>\n<p class="${cls}">${esc(x.status)}</p>\n${x.arts.map(artHtml).join('\n')}`);
write(FILES, 'portal/' + P.LAW7.file, instrument(P.LAW7));
write(FILES, 'portal/' + P.LAW12.file, instrument(P.LAW12));
write(FILES, 'portal/' + P.REG3.file, instrument(P.REG3));
write(FILES, 'portal/' + P.LAW4.file, instrument(P.LAW4));
write(FILES, 'portal/' + P.FZ.file, instrument(P.FZ, 'stamp'));
write(FILES, 'portal/' + P.GUIDE.file, instrument(P.GUIDE, 'stamp'));
// the law as enacted: article 9 with the old period, article 14 in force, no article 14 bis
const enacted = P.LAW7.arts.filter(a => a.n !== '14 مكررًا').map(a => a.n === '9' ? { n: a.n, title: a.title, text: 'يشعر المعالج المتحكم بكل حادثة اختراق للبيانات الشخصية خلال مدة لا تتجاوز خمسة أيام عمل من وقت علمه بها.' } : { n: a.n, title: a.title, text: a.text });
write(FILES, 'portal/law-7-2019-original.html', instrument({ title: 'قانون حماية البيانات الشخصية رقم (7) لسنة 2019: النص كما صدر', status: P.LAW7_ORIGINAL_NOTE, arts: enacted }, 'stamp'));
for (const j of P.JUDGMENTS) write(FILES, 'portal/' + j.file, portalPage(`${j.court}: ${j.no}`, `<p class="site">${esc(P.PORTAL_NAME)} · الأحكام المنشورة</p>\n<h1>${esc(j.court)}، رقم ${esc(j.no)}</h1>\n<p class="meta">الموضوع: ${esc(j.subject)}</p>\n<h2>الوقائع</h2>\n<p>${esc(j.facts)}</p>\n<h2>المبدأ الذي قررته المحكمة</h2>\n<p>${esc(j.holding)}</p>`));
write(FILES, 'portal/judgments.html', portalPage('الأحكام المنشورة', `<p class="site">${esc(P.PORTAL_NAME)}</p>\n<h1>الأحكام المنشورة في حماية البيانات وخدمات المعالجة</h1>\n<ul>${P.JUDGMENTS.map(j => `<li><a href="${j.file}">${esc(j.court)}، رقم ${esc(j.no)}</a>: ${esc(j.subject)}</li>`).join('')}</ul>\n<p class="stamp">${esc(P.COURT_REGISTER_NOTE)}</p>\n<p class="s">تنشر البوابة كل حكم نهائي في هذا الباب. ما لا تجده هنا لم يُنشر، أو لم يصدر.</p>`));
write(FILES, 'portal/' + P.EN.file, page(P.EN.title, `<p class="site">Nawara Legislation Portal</p>\n<h1>${esc(P.EN.title)}</h1>\n<p class="stamp">${esc(P.EN.banner)}</p>\n${P.EN.arts.map(([h, t]) => `<div class="cl"><h3>${esc(h)}</h3><p>${esc(t)}</p></div>`).join('\n')}`, { bar: P.PORTAL_BAR, home, lang: 'en' }));
write(FILES, 'portal/about.html', portalPage('عن البوابة: أي نص يُعتمد', `<p class="site">${esc(P.PORTAL_NAME)}</p>\n<h1>عن البوابة: أي نص يُعتمد</h1>\n<ul>${P.ABOUT.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`));
const link = (file, text) => `<li><a href="${file}">${esc(text)}</a></li>`;
write(FILES, 'portal/index.html', page(P.PORTAL_NAME, `<p class="site">${esc(P.PORTAL_NAME)}</p>
<h1>فهرس التشريعات والأحكام</h1>
<h2>القوانين</h2><ul>${link(P.LAW7.file, P.LAW7.title)}${link('law-7-2019-original.html', 'قانون حماية البيانات الشخصية رقم (7) لسنة 2019: النص كما صدر (صفحة تاريخية)')}${link(P.LAW12.file, P.LAW12.title)}${link(P.LAW4.file, P.LAW4.title)}</ul>
<h2>اللوائح</h2><ul>${link(P.REG3.file, P.REG3.title)}</ul>
<h2>أنظمة المنطقة المالية الحرة</h2><ul>${link(P.FZ.file, P.FZ.title)}</ul>
<h2>الأحكام المنشورة</h2><ul>${link('judgments.html', 'قائمة الأحكام وسجل الطعون')}</ul>
<h2>الأدلة الإرشادية</h2><ul>${link(P.GUIDE.file, P.GUIDE.title)}</ul>
<h2>ترجمات غير رسمية</h2><ul>${link(P.EN.file, P.EN.title)}</ul>
<h2>عن البوابة</h2><ul>${link('about.html', 'أي نص يُعتمد: النص الموحد، والصفحات التاريخية، والترجمات')}</ul>`, { bar: P.PORTAL_BAR }));

write(FILES, 'memo/qistas_memo.html', page('مذكرة قسطاس: قانون نوارة ومعالجة رصين', `
<h1>مذكرة بحث: قانون نوارة ومعالجة رصين لبيانات عملاء سنام</h1>
<p class="meta">أعدها المساعد «قسطاس» بطلب من الإدارة القانونية · مسودة لم تُراجع</p>
<h2>السؤال</h2><p>${esc(P.MEMO_QUESTION)}</p>
<h2>الخلاصة</h2><p>${esc(P.MEMO_SUMMARY)}</p>
<h2>الأسانيد</h2>
<ol>${P.CITES.map(c => `<li>${esc(c.claim)} <b>[${esc(c.ref)}]</b></li>`).join('\n')}</ol>
<p class="s">عدد المراجع: ${P.CITES.length}.</p>`));
write(FILES, 'memo/requests.html', page('الطلبان المسجلان', `
<h1>طلبان مسجلان عن الموضوع نفسه</h1>
<p>النموذج واحد، والبوابة واحدة، والقانون واحد. الذي اختلف هو صياغة الطلب.</p>
<h2>الطلب الأول: الذي جاءت منه المذكرة</h2>
<blockquote>${esc(P.REQUEST_LEADING)}</blockquote>
<p><b>خلاصة الجواب:</b> ${esc(P.MEMO_SUMMARY)}</p>
<h2>الطلب الثاني: صياغة محايدة</h2>
<blockquote>${esc(P.REQUEST_NEUTRAL)}</blockquote>
<p><b>الجواب:</b></p>
<ol>${P.NEUTRAL_ANSWER.map(t => `<li>${esc(t)}</li>`).join('')}</ol>
<p class="s">الجواب الثاني يُتحقق من مراجعه كما يُتحقق من الأول: الصياغة المحايدة تقلل المجاراة، ولا تغني عن فتح المصدر.</p>`));
const CHECK_HEAD = ['#', 'المرجع كما في المذكرة', 'ما نسبته المذكرة إليه', 'الصفحة التي فتحتها في البوابة', 'موجود ونافذ ومن الاختصاص الصحيح؟', 'يقول ما نُسب إليه؟', 'الحكم: سليم أو معيب', 'نوع العيب', 'التصحيح'];
write(FILES, 'start/check_table.csv', csv([CHECK_HEAD, ...P.CITES.map(c => [c.id, c.ref, c.claim, '', '', '', '', '', '']), [], ['أنواع العيب', P.FAULT_TYPES.join(' / ')], ['تخميني قبل الفحص: عدد المعيب', '']]));
write(REF, 'D1_1_check_table.csv', csv([CHECK_HEAD, ...P.CITES.map(c => [c.id, c.ref, c.claim, 'portal/' + c.page, c.fault && c.fault !== 'مبدأ قضائي محرَّف' ? 'لا' : 'نعم', c.fault ? 'لا' : 'نعم', c.fault ? 'معيب' : 'سليم', c.fault || '', c.fix])]));
write(REF, 'D1_1_key.json', json(P.CITES.map(c => ({ id: c.id, page: c.page, fault: c.fault }))));

// ------------------------------------------------------------------ lab 1.2: the agreement
const D1 = C.draft('v1'), D2 = C.draft('v2');
const draftHtml = (d, label) => page(`${C.TITLE}: ${label}`, d.paragraphs.map(p => p.style === 'title' ? `<h1>${esc(p.text)}</h1>` : p.style === 'h1' ? `<h2>${esc(p.text)}</h2>` : `<p class="cl">${esc(p.text)}</p>`).join('\n'));
write(FILES, 'contract/dpa_v1.html', draftHtml(D1, 'المسودة الأولى'));
write(FILES, 'contract/dpa_v2.html', draftHtml(D2, 'المسودة الثانية'));
write(FILES, 'contract/dpa_v1.docx', docx(D1.paragraphs));
write(FILES, 'contract/dpa_v2.docx', docx(D2.paragraphs));
const words = d => d.paragraphs.map(p => p.text).join(' ').split(/\s+/).filter(Boolean).length;

write(FILES, 'contract/playbook.html', page('دليل المواقف التعاقدية: عقود معالجة البيانات', `
<h1>دليل المواقف التعاقدية: عقود معالجة البيانات مع المورّدين</h1>
<p class="meta">الإدارة القانونية في سنام · داخلي</p>
<p>لكل موضوع ثلاثة مواقف: <b>المفضل</b> الذي نبدأ به، و<b>البديل الاحتياطي</b> الذي نقبله بموافقة، و<b>الخط الأحمر</b> الذي لا نقبله إلا بقرار مسبب من المستشارة العامة. والموضوع الذي يطلبه الدليل ولا تجده في المسودة <b>بند ناقص</b>.</p>
${table(['#', 'الموضوع', 'المفضل', 'البديل الاحتياطي', 'الخط الأحمر'], C.PLAYBOOK.map(p => [p.id, p.topic, p.preferred, p.fallback, p.red]))}
<h2>من يوافق</h2>
${table(['النتيجة', 'الحكم', 'صاحب الموافقة'], C.APPROVAL)}`));

const noted = Object.entries(C.COVER_NOTE_ITEMS);
write(FILES, 'contract/cover_note.html', page('رسالة رصين المرافقة للمسودة الثانية', `
<h1>رسالة المورّد المرافقة للمسودة الثانية</h1>
<p class="meta">من: أواب زهدي، رصين لخدمات البيانات · إلى: ليث القويز</p>
<p>${esc(C.COVER_NOTE_INTRO)}</p>
<ol>${noted.map(([, t]) => `<li>${esc(t)}</li>`).join('')}</ol>
<p>${esc(C.COVER_NOTE_CLOSING)}</p>`));

const topic = id => C.PLAYBOOK.find(p => p.id === id).topic;
// the number the recorded run wrote: one article too low where the run is planted to be wrong
const claimed = r => { const no = D2.number[r.k]; if (!r.shift) return no; const [a, b] = no.split('.'); return `${Number(a) + r.shift}.${b}`; };
write(FILES, 'contract/qistas_review_run.html', page('جلسة مسجلة: مراجعة قسطاس للمسودة الثانية', `
<h1>جلسة مسجلة: مراجعة قسطاس للمسودة الثانية وفق الدليل</h1>
<p class="meta">تُستعمل حين لا يتاح مساعد في القاعة، وللمقارنة بما أعاده مساعدك · مخرج لم يُراجع</p>
${table(['#', 'البند', 'الموضوع', 'التصنيف', 'الملاحظة'], C.RUN_REVIEW.map((r, i) => [i + 1, claimed(r), topic(r.p), r.cls, r.note]))}
<p>${esc(C.RUN_REVIEW_CLOSING)}</p>`));
write(FILES, 'contract/qistas_compare_run.html', page('جلسة مسجلة: قسطاس يقارن المسودتين', `
<h1>جلسة مسجلة: ما الذي تغيّر بين المسودتين؟</h1>
<p class="meta">أُعطي المساعد نص المسودتين وسُئل عما تغيّر · مخرج لم يُراجع</p>
<ol>${C.RUN_COMPARE.found.map(k => `<li>البند ${esc(D2.number[k] || D1.number[k])}: ${esc(C.CHANGES[k].what)}.</li>`).join('')}<li>${esc(C.RUN_COMPARE.invented)}</li></ol>
<p>${esc(C.RUN_COMPARE.closing)}</p>`));

const diff = C.diff();
const where = k => D2.number[k] ? `${D2.number[k]} في المسودة الثانية` : `${D1.number[k]} في المسودة الأولى (حُذف)`;
const notedWord = v => v === true ? 'نعم' : v === 'partial' ? 'جزئيًّا' : 'لا';
const CMP_HEAD = ['#', 'موضع التغيير', 'نوعه: معدَّل أو محذوف أو مضاف', 'ما الذي تغيّر', 'ذكرته رسالة المورّد؟', 'يُحال إلى'];
write(FILES, 'start/comparison_report.csv', csv([CMP_HEAD, ...Array.from({ length: 16 }, (_, i) => [i + 1, '', '', '', '', ''])]));
write(REF, 'D1_2_comparison_report.csv', csv([CMP_HEAD, ...diff.map((d, i) => [i + 1, where(d.k), d.kind, C.CHANGES[d.k].what, notedWord(C.CHANGES[d.k].noted), C.CHANGES[d.k].to])]));
const ISS_HEAD = ['الموقف في الدليل', 'الموضوع', 'البند في المسودة الثانية', 'النتيجة: مطابق أو بديل احتياطي أو خط أحمر أو بند ناقص', 'نص البند أو ما ينقص', 'صاحب الموافقة'];
write(FILES, 'start/issues_list.csv', csv([ISS_HEAD, ...C.PLAYBOOK.map(p => [p.id, p.topic, '', '', '', ''])]));
const approver = s => C.APPROVAL.find(a => a[0] === s)[2];
const issueRows = C.PLAYBOOK.map(p => [p.id, p.topic, p.status === 'بند ناقص' ? 'لا يوجد' : D2.number[p.at], p.status, p.status === 'بند ناقص' ? (p.at ? `كان في المسودة الأولى برقم ${D1.number[p.at]} وحُذف` : 'لم يرد في أي من المسودتين') : D2.clauses.find(c => c.k === p.at).text, approver(p.status)]);
write(REF, 'D1_2_issues_list.csv', csv([ISS_HEAD, ...issueRows]));
const count = s => C.PLAYBOOK.filter(p => p.status === s).length;
const runReal = C.RUN_REVIEW.filter(r => C.PLAYBOOK.find(p => p.id === r.p).status !== 'مطابق');
const issues = C.PLAYBOOK.filter(p => p.status !== 'مطابق');
const missedByRun = issues.filter(p => !runReal.some(r => r.p === p.id)).map(p => p.id);
const cmpMissed = diff.filter(d => !C.RUN_COMPARE.found.includes(d.k)).map(d => d.k);
const facts12 = {
  words_v1: words(D1), words_v2: words(D2), positions: C.PLAYBOOK.length,
  compliant: count('مطابق'), fallback: count('بديل احتياطي'), red: count('خط أحمر'), missing: count('بند ناقص'), issues: issues.length,
  changes: diff.length, changes_modified: diff.filter(d => d.kind === 'معدَّل').length, changes_deleted: diff.filter(d => d.kind === 'محذوف').length, changes_added: diff.filter(d => d.kind === 'مضاف').length,
  changes_noted: diff.filter(d => C.CHANGES[d.k].noted === true).length, changes_partial: diff.filter(d => C.CHANGES[d.k].noted === 'partial').length, changes_silent: diff.filter(d => C.CHANGES[d.k].noted === false).length,
  run_rows: C.RUN_REVIEW.length, run_real: runReal.length, run_invented: C.RUN_REVIEW.length - runReal.length, run_missed: missedByRun,
  run_wrong_class: C.RUN_REVIEW.filter(r => r.fault && r.fault.startsWith('تصنيف')).map(r => r.p), run_wrong_number: C.RUN_REVIEW.filter(r => r.shift).map(r => ({ p: r.p, wrote: claimed(r), real: D2.number[r.k] })),
  compare_found: C.RUN_COMPARE.found.length, compare_missed: cmpMissed.map(k => D2.number[k] || D1.number[k] + ' (محذوف)'), compare_invented: 1,
};
write(REF, 'D1_2_facts.json', json(facts12));
write(REF, 'D1_2_numbers.json', json({ v1: D1.number, v2: D2.number }));

// ------------------------------------------------------------------ lab 2.1: the register
const REG_HEAD = ['#', 'المادة/الفقرة', 'الجهة الملزَمة', 'الالتزام', 'المهلة أو المحفِّز', 'تحققتُ منه في النص الرسمي؟ (نعم، مع الصفحة)', 'المسؤول في سنام', 'الضابط', 'الدليل'];
write(FILES, 'start/register_template.csv', csv([['المصدر الذي فتحته:', '', 'تاريخ الاطلاع:', ''], REG_HEAD, ...Array.from({ length: 18 }, (_, i) => [i + 1, '', '', '', '', '', '', '', ''])]));
write(FILES, 'register/qistas_register_draft.csv', csv([['مسودة سجل كتبها المساعد قسطاس · لم تُراجع'], REG_HEAD.slice(0, 5).concat(['تحققتُ منه في النص الرسمي؟', 'الحكم: صحيح أو معيب، وما العيب']), ...F.DRAFT.map(d => [d.n, d.ref, d.who, d.what, d.when, '', '']), [], [F.DRAFT_CLOSING]]));
write(FILES, 'register/roles_and_controls.html', page('ورقة الأدوار والضوابط القائمة في سنام', `
<h1>ورقة الأدوار والضوابط القائمة</h1>
<p class="meta">الامتثال وحماية البيانات في سنام · داخلي</p>
<h2>الأدوار</h2>
${table(['الجهة', 'المسؤول', 'ما تتولاه'], F.ROLES)}
<h2>الضوابط القائمة</h2>
${table(['الرمز', 'الضابط'], Object.entries(F.CONTROLS))}
<p class="s">الضابط إجراء أو أداة قائمة تضمن تنفيذ الالتزام. والدليل هو ما تعرضه على مراجع ليصدّق أن الضابط عمل.</p>`));
write(REF, 'D2_1_register.csv', csv([['المصدر:', F.REGULATION.name, F.REGULATION.url], REG_HEAD, ...F.REGISTER.map(r => [r.id, r.ref, r.who, r.what, r.when, 'نعم', r.owner, `${r.control}: ${F.CONTROLS[r.control]}`, r.evidence])]));
write(REF, 'D2_1_draft_key.csv', csv([['#', 'المادة/الفقرة كما كتبها المساعد', 'الحكم', 'العيب', 'البند المرجعي'], ...F.DRAFT.map(d => [d.n, d.ref, d.fault ? 'معيب' : 'صحيح', d.fault || '', d.of || 'لا مقابل له']), [], ['التزامات فاتت المسودة', F.REGISTER.filter(r => !F.DRAFT.some(d => d.of === r.id)).map(r => `${r.id} (${r.ref})`).join('، ')]]));
const el17 = F.ELEMENTS_17.map(([letter, what, k]) => [letter, what, k && D2.number[k] ? D2.number[k] : 'لا يوجد', !k ? 'ناقص: لا بند في أي من المسودتين' : !D2.number[k] ? `ناقص: كان البند ${D1.number[k]} وحُذف` : k === 'A4.a' ? 'موجود اسمًا: إحالة إلى موقع المورّد لا تحدد أحدًا' : 'موجود']);
write(REF, 'D2_1_elements_17.csv', csv([['العنصر', 'ما يطلبه', 'البند في المسودة الثانية', 'الحكم'], ...el17]));

// ------------------------------------------------------------------ lab 2.2: the dispute file
write(FILES, 'matter/summary.html', page('ملخص النزاع: سنام ودروب', `<h1>ملخص النزاع: سنام ضد دروب لصيانة الأساطيل</h1>\n<p>${esc(F.MATTER_SUMMARY)}</p>\n<h2>مستندات الملف</h2>\n<ol>${F.DOCS.map(d => `<li><a href="${d.id}.html">${d.id}: ${esc(d.title)}</a></li>`).join('')}</ol>\n<p class="stamp">هذا المختبر دون أي مساعد: لا يدخل أي مستند من هذه أي أداة. أنت تقرر ما كان سيُسمح به.</p>`));
for (const d of F.DOCS) write(FILES, `matter/${d.id}.html`, page(`${d.id}: ${d.title}`, `<p class="meta">ملف النزاع مع دروب · المستند ${d.id}</p>\n<h1>${esc(d.title)}</h1>\n${ps(d.body)}`, { home: '<a href="summary.html">ملخص النزاع</a>' }));
write(FILES, 'matter/pseudonym_table.html', page('جدول مفاتيح الترميز: المستند D05', `<h1>جدول مفاتيح الترميز للمستند D05</h1>\n<p class="stamp">هذا الجدول يبقى في ملف القضية وحده، ولا يدخل الأداة مع المستند المرمَّز.</p>\n${table(['المعرِّف في الأصل', 'الرمز'], F.PSEUDO)}`, { home: '<a href="summary.html">ملخص النزاع</a>' }));
const HAND_HEAD = ['المستند', 'العنوان', 'مستوى السرية', 'امتياز السرية المهنية: نعم أو لا أو مشكوك', 'بيانات شخصية: لا أو شخصية أو حساسة', 'أعلى أداة مسموحة', 'ما يلزم قبلها: لا شيء أو ترميز أو حجب', 'إحالة إلى المستشارة العامة؟'];
write(FILES, 'start/handling_decisions.csv', csv([HAND_HEAD, ...F.DOCS.map(d => [d.id, d.title, '', '', '', '', '', ''])]));
const decisions = F.DOCS.map(d => ({ id: d.id, level: d.level, priv: d.priv, pd: d.pd, third: d.third, ...F.decide(d) }));
write(REF, 'D2_2_decisions.json', json(decisions));
write(REF, 'D2_2_decisions.csv', csv([HAND_HEAD.concat(['القاعدة', 'السبب']), ...F.DOCS.map((d, i) => [d.id, d.title, d.level, d.priv, d.pd, decisions[i].tool, decisions[i].before, decisions[i].escalate ? 'نعم' : 'لا', decisions[i].rule, d.why])]));
const d05 = F.DOCS.find(d => d.id === 'D05');
const pseudo = t => F.PSEUDO.reduce((s, [a, b]) => s.split(a).join(b), t);
write(REF, 'D2_2_D05_pseudonymised.md', `# المستند D05 بعد الترميز\n\n${d05.body.map(pseudo).join('\n\n')}\n`);

// ------------------------------------------------------------------ the capstone
const memoPage = (m) => page(`المسار أ، النموذج ${m.form}: مذكرة قصيرة`, `<h1>المسار أ · النموذج ${m.form}: مذكرة قصيرة بستة مراجع</h1>\n<p class="meta">أعدها المساعد «قسطاس» · مخرج لم يُراجع · المراجع كلها إلى <a href="../portal/index.html">بوابة تشريعات نوارة</a></p>\n<h2>السؤال</h2><p>${esc(m.question)}</p>\n<h2>الأسانيد</h2>\n<ol>${m.cites.map(c => `<li>${esc(c.claim)} <b>[${esc(c.ref)}]</b></li>`).join('')}</ol>\n<p>المطلوب: لكل مرجع حكم (سليم أو معيب)، ونوع العيب، والتصحيح. سجّل وقت البدء ووقت الانتهاء.</p>`);
for (const m of P.SHORT_MEMOS) write(FILES, `capstone/track_a_form${m.form}.html`, memoPage(m));
const ndaClauses = f => { const out = [...F.NDA_BASE.map(([h, t]) => [h, t])]; for (const p of F.NDA_POSITIONS) { const s = f.state[p.id]; if (s === 'بند ناقص') continue; out.push([p.topic, p.text[s]]); } out.push(['النفاذ', 'تنفذ هذه الاتفاقية من تاريخ توقيعها من الطرفين.']); return out; };
for (const f of F.NDA_FORMS) write(FILES, `capstone/track_b_form${f.form}.html`, page(`المسار ب، النموذج ${f.form}: اتفاقية عدم إفصاح`, `<h1>المسار ب · النموذج ${f.form}: اتفاقية عدم إفصاح</h1>\n<p class="meta">وردت من: ${esc(f.other)} · تُراجع وفق <a href="track_b_playbook.html">الدليل المصغر</a></p>\n${ndaClauses(f).map(([h, t], i) => `<p class="cl"><b>${i + 1}. ${esc(h)}:</b> ${esc(t)}</p>`).join('\n')}\n<p>المطلوب: لكل موقف في الدليل نتيجة (مطابق، بديل احتياطي، خط أحمر، بند ناقص) ورقم البند. سجّل وقت البدء ووقت الانتهاء.</p>`));
write(FILES, 'capstone/track_b_playbook.html', page('الدليل المصغر: اتفاقيات عدم الإفصاح', `<h1>الدليل المصغر: اتفاقيات عدم الإفصاح</h1>\n${table(['#', 'الموضوع', 'المفضل', 'البديل الاحتياطي', 'الخط الأحمر'], F.NDA_POSITIONS.map(p => [p.id, p.topic, p.preferred, p.fallback, p.red]))}\n<p>الموضوع الذي يطلبه الدليل ولا تجده في الاتفاقية بند ناقص.</p>`));
const ndaNo = (f, id) => { const i = ndaClauses(f).findIndex(([h]) => h === F.NDA_POSITIONS.find(p => p.id === id).topic); return i < 0 ? 'لا يوجد' : String(i + 1); };
const keyA = m => m.cites.map(c => [c.id, c.ref, c.fault ? 'معيب' : 'سليم', c.fault || '', c.fix]);
const keyB = f => F.NDA_POSITIONS.map(p => [p.id, p.topic, f.state[p.id], ndaNo(f, p.id)]);
const keyPage = `<h1>مفتاح النموذج 1 للمسارين</h1>\n<p class="stamp">افتحه بعد أن تنهي تنفيذ خط الأساس وتسجّل وقتك، لا قبل ذلك.</p>\n<h2>المسار أ · النموذج 1</h2>\n${table(['#', 'المرجع', 'الحكم', 'نوع العيب', 'التصحيح'], keyA(P.SHORT_MEMOS[0]))}\n<h2>المسار ب · النموذج 1</h2>\n${table(['الموقف', 'الموضوع', 'النتيجة', 'رقم البند'], keyB(F.NDA_FORMS[0]))}\n<h2>كيف تعدّ أخطاءك</h2>\n<ul><li><b>فائت:</b> عيب أو مسألة في المفتاح لم تسجّلها.</li><li><b>معلَّم خطأً:</b> سليم أو مطابق عددته معيبًا، أو تصنيف غير تصنيف المفتاح.</li><li><b>مرجع لم يُتحقق منه:</b> حكم كتبته دون أن تفتح مصدره. يُعد خطأ ولو أصاب.</li></ul>`;
write(FILES, 'capstone/form1_keys.html', page('مفتاح النموذج 1', keyPage));
for (const n of [2, 3]) {
  const m = P.SHORT_MEMOS[n - 1], f = F.NDA_FORMS[n - 1], ra = P.SHORT_MEMO_RUNS[n], rb = F.NDA_RUNS[n];
  write(FILES, `capstone/recorded_runs_form${n}.html`, page(`جلسات مسجلة: النموذج ${n}`, `<h1>جلسات مسجلة للنموذج ${n}</h1>\n<p class="meta">تُستعمل حين لا يتاح مساعد في القاعة · مخرج لم يُراجع</p>\n<h2>المسار أ</h2>\n<p>قال المساعد إن المراجع المعيبة هي: ${ra.flagged.join(' و')}. وقال إن الباقي سليم.</p>\n<h2>المسار ب</h2>\n<p>قال المساعد إن المواقف التي فيها مسألة هي: ${rb.flagged.join(' و')}. وقال إن الباقي مطابق.</p>`));
}
write(REF, 'capstone_keys.json', json({ A: P.SHORT_MEMOS.map(m => ({ form: m.form, faulty: m.cites.filter(c => c.fault).map(c => ({ id: c.id, fault: c.fault })) })), B: F.NDA_FORMS.map(f => ({ form: f.form, state: f.state })), runs: { A: P.SHORT_MEMO_RUNS, B: F.NDA_RUNS } }));
write(FILES, 'capstone/prework_guide.html', page('العمل التحضيري: خط الأساس', `
<h1>العمل التحضيري: خط الأساس</h1>
<p>تسعون دقيقة قبل اليوم الأول، دون أي مساعد ذكي. ما تقيسه هنا هو ما ستقارن به في المشروع الختامي.</p>
<ol>
<li><b>اقرأ الحالة</b> (20 دقيقة): <a href="../case/case_brief.html">ملخص الحالة</a> و<a href="../case/handling_card.html">بطاقة التعامل</a>.</li>
<li><b>اختر مسارًا واحدًا</b> (5 دقائق): المسار أ، التحقق من مراجع مذكرة قصيرة على <a href="../portal/index.html">بوابة تشريعات نوارة</a>؛ أو المسار ب، مراجعة اتفاقية عدم إفصاح وفق <a href="track_b_playbook.html">دليل مصغر</a>. اختر الأقرب إلى مهمة تتكرر في عملك.</li>
<li><b>نفّذ النموذج 1 بيدك</b> (حتى 40 دقيقة): <a href="track_a_form1.html">المسار أ · النموذج 1</a> أو <a href="track_b_form1.html">المسار ب · النموذج 1</a>. سجّل دقيقة البدء ودقيقة الانتهاء.</li>
<li><b>صحّح بالمفتاح</b> (10 دقائق): <a href="form1_keys.html">مفتاح النموذج 1</a>. عدّ الفائت، والمعلَّم خطأً.</li>
<li><b>املأ السطر الأول</b> من <a href="../start/measurement_log.csv" download>سجل القياس</a> (5 دقائق)، واكتب في سطرين أين ذهب وقتك.</li>
<li><b>اكتب مهمتك</b> (10 دقائق): مهمة قانونية واحدة تتكرر في عملك وتشبه المسار الذي اخترته، بوصف عام لا يذكر عميلًا ولا ملفًّا.</li>
</ol>
<p class="stamp">لا يدخل أي أداة مستند من عملك، لا في العمل التحضيري ولا في اليومين.</p>`));
write(FILES, 'start/measurement_log.csv', csv([['التنفيذ', 'المسار والنموذج', 'الأداة', 'الدقائق', 'الفائت', 'المعلَّم خطأً', 'مراجع لم يُتحقق منها', 'ملاحظة: أين ذهب الوقت، وما الذي تغيّر'], ['خط الأساس (العمل التحضيري، دون مساعد)', '', 'لا أداة', '', '', '', '', ''], ['التنفيذ الأول بمساعدة الذكاء الاصطناعي', '', '', '', '', '', '', ''], ['التنفيذ الثاني بعد التعديل', '', '', '', '', '', '', '']]));
write(FILES, 'capstone/redesign_card.html', page('بطاقة إعادة التصميم', `<h1>بطاقة إعادة التصميم</h1>\n<p class="meta">صفحة واحدة تدافع عنها في المراجعة المباشرة</p>\n${table(['الخانة', 'ما تكتبه فيها'], F.CARD_FIELDS)}\n<p class="stamp">شرط النجاح: لا مرجع قانوني في أي مخرج تسلّمه لم تتحقق منه في مصدره.</p>`));

// ------------------------------------------------------------------ the trainer's pages
const sol = (name, body) => write(SOL, name, body);
const faulty = P.CITES.filter(c => c.fault);
sol('D1_1_verify_authorities.md', `# الحل المرجعي: المختبر 1.1 التحقق من مراجع مذكرة قسطاس

نقطة البداية: \`files/memo/qistas_memo.html\` و\`files/memo/requests.html\` و\`files/portal/index.html\` و\`files/start/check_table.csv\`. التحقق بالكود: \`node labs/solutions/check.mjs 1.1\`.

قرار التعامل: المذكرة وطلب البحث سريان (فيهما اسم المورّد وموقف سنام التفاوضي)، ولا امتياز ولا بيانات شخصية: أعلى أداة «المساعد التجاري المعتمد»، وفي المقرر نعمل بقسطاس.

${mdTable(['#', 'المرجع', 'الحكم', 'نوع العيب', 'التصحيح'], P.CITES.map(c => [c.id, c.ref, c.fault ? 'معيب' : 'سليم', c.fault || '', c.fix]))}
السليم ${P.CITES.length - faulty.length} من ${P.CITES.length}، والمعيب ${faulty.length}: ${faulty.map(c => `${c.id} (${c.fault})`).join('، ')}.

لو اكتفينا بسؤال «هل توجد صفحة بهذا الاسم في البوابة؟» لمرّ ${P.CITES.filter(c => c.fault !== 'مرجع مختلق').length} من ${P.CITES.length}: المادة الملغاة لها صفحة، ونظام المنطقة الحرة له صفحة، والحكم المحرَّف موجود برقمه.

السؤال الإيحائي: الطلب الأول فيه «${P.LEADING_MARKERS.join('»، «')}»، وخلاصته «نعم» بلا تحفظ. الطلب الثاني يسأل عما يفرضه القانون وعما يخالف مصلحة العميل أولًا، وجوابه يذكر الإذن المسبق، وقيد النقل، والأمر القضائي الذي لا يتوقف على موافقة العميل. خلاصة المذكرة («لا تستطيع السلطات الاطلاع دون علمكم وإذنكم») لا يسندها المرجع 6 نفسه: المادة (8) تقول إن التنفيذ لا يتوقف على موافقة المتحكم.

التمرين الإضافي: الترجمة الإنجليزية غير الرسمية للمادة (9) تقول خمسة أيام عمل، والنص الموحد يقول 72 ساعة. يُستشهد بالنص العربي الموحد: الترجمة غير رسمية ولم تُحدَّث بعد قانون 2024.
`);
sol('D1_2_playbook_review.md', `# الحل المرجعي: المختبر 1.2 قائمة المسائل وتقرير المقارنة

نقطة البداية: \`files/contract/\` (المسودتان بصيغتي docx و html، والدليل، ورسالة المورّد، والجلستان المسجلتان) و\`files/start/issues_list.csv\` و\`files/start/comparison_report.csv\`. التحقق بالكود: \`node labs/solutions/check.mjs 1.2\`.

قرار التعامل: المسودتان والدليل سرية (موقف تفاوضي)، ولا بيانات شخصية ولا امتياز: «المساعد التجاري المعتمد» على الأكثر، وفي المقرر نعمل بقسطاس.

## تقرير المقارنة: ${facts12.changes} تغييرًا

${mdTable(['#', 'الموضع', 'النوع', 'ما الذي تغيّر', 'ذكرته الرسالة؟', 'يُحال إلى'], diff.map((d, i) => [i + 1, where(d.k), d.kind, C.CHANGES[d.k].what, notedWord(C.CHANGES[d.k].noted), C.CHANGES[d.k].to]))}
${facts12.changes_modified} معدَّلة، و${facts12.changes_deleted} محذوفة، و${facts12.changes_added} مضاف. ذكرت رسالة المورّد ${facts12.changes_noted} منها بوضوح، و${facts12.changes_partial} جزئيًّا، وسكتت عن ${facts12.changes_silent}.

الجلسة المسجلة للمقارنة: وجد المساعد ${facts12.compare_found} تغييرات من ${facts12.changes}، وفاته ${facts12.compare_missed.length}: ${facts12.compare_missed.join('، ')}. واختلق تغييرًا في المادة الثالثة لم يقع. وكل ما فاته من البنود التي سكتت عنها الرسالة.

## قائمة المسائل: ${facts12.issues} مسألة في ${facts12.positions} موقفًا

${mdTable(['الموقف', 'الموضوع', 'البند', 'النتيجة', 'صاحب الموافقة'], issueRows.map(r => [r[0], r[1], r[2], r[3], r[5]]))}
${facts12.red} خطوط حمراء، و${facts12.fallback} بدائل احتياطية، و${facts12.missing} بنود ناقصة، و${facts12.compliant} مطابقة.

الجلسة المسجلة للمراجعة: ${facts12.run_rows} صفوف، منها ${facts12.run_real} مسائل حقيقية و${facts12.run_invented} مختلقة (التشفير منصوص عليه في الملحق 3). فاته ${facts12.run_missed.length}: ${facts12.run_missed.join('، ')}، ومنها البنود الناقصة الثلاثة كلها. صنّف ${facts12.run_wrong_class.join('، ')} خطًّا أحمر وهو بديل احتياطي. وكتب رقم بند المسؤولية ${facts12.run_wrong_number.map(x => `${x.wrote} وهو ${x.real}`).join('، ')}.

سطر التصعيد: إلى المستشارة العامة أربعة خطوط حمراء وثلاثة بنود ناقصة؛ وإلى كبير المستشارين أربعة بدائل احتياطية؛ وإلى المشتريات مهلة السداد ونسبة التوافر.
`);
sol('D2_1_obligations_register.md', `# الحل المرجعي: المختبر 2.1 سجل التزامات من أربع مواد

نقطة البداية: النص الرسمي للائحة في موقع سدايا (${F.REGULATION.url})، و\`files/register/qistas_register_draft.csv\` و\`files/register/roles_and_controls.html\` و\`files/start/register_template.csv\`. التحقق بالكود: \`node labs/solutions/check.mjs 2.1\`.

اللائحة ليست مقسمة إلى فصول، فأُخذت منها المواد 17 و23 و24 و25: اختيار جهة المعالجة، وأمن المعلومات، والإشعار بحوادث التسرب، وتقويم الأثر. صيغت الالتزامات هنا بكلمات المقرر بعد قراءة النص، والمرجع دائمًا هو النص العربي المنشور: افتحه قبل كل دفعة، فاللوائح تُعدَّل.

## السجل المرجعي: ${F.REGISTER.length} بندًا

${mdTable(['#', 'المادة/الفقرة', 'الجهة الملزَمة', 'الالتزام', 'المهلة أو المحفِّز', 'المسؤول', 'الضابط', 'الدليل'], F.REGISTER.map(r => [r.id, r.ref, r.who, r.what, r.when, r.owner, r.control, r.evidence]))}
## مسودة المساعد: ${F.DRAFT.length} صفًّا، ${F.DRAFT.filter(d => d.fault).length} معيبة

${mdTable(['#', 'كتب المساعد', 'العيب'], F.DRAFT.filter(d => d.fault).map(d => [d.n, `${d.ref}: ${d.what}، ${d.when}`, d.fault]))}
وفات المسودة التزامان: ${F.REGISTER.filter(r => !F.DRAFT.some(d => d.of === r.id)).map(r => `${r.id} (${r.ref})`).join(' و')}. وختم المساعد بقوله إنه راجع كل بند على النص.

الفقرة 4 من المادة 17 ليست التزامًا: هي أثر يترتب على المخالفة. تدخل السجل ملاحظةً عند البند R03 لا بندًا مستقلًّا.

## التمرين الإضافي: عناصر الاتفاق السبعة في المسودة الثانية

${mdTable(['العنصر', 'ما يطلبه', 'البند', 'الحكم'], el17)}
## النسختان العربية والإنجليزية في المادة 17

للمدرب، ولمن ينهي المختبر مبكرًا. المرجع النص العربي، وفي المادة 17 موضعان تختلف فيهما الترجمة الإنجليزية المنشورة في موقع سدايا عنه:

- **الفقرة 1، العنصر (و).** النص العربي: «عدم اشتراط حصول جهة المعالجة على موافقة مسبقة **من جهة التحكم** على الإفصاح الوجوبي عن البيانات الشخصية بموجب الأنظمة المعمول بها في المملكة، على أن تقوم جهة المعالجة بإشعار جهة التحكم بذلك الإفصاح». الترجمة الإنجليزية تجعل الموافقة موافقة صاحب البيانات: «Not requiring the Data Subject's prior consent for mandatory Disclosure». فمن قرأ الإنجليزية ظن أن العنصر عن صاحب البيانات، والعربي عن العلاقة بين جهة التحكم وجهة المعالجة. والشق المشترك بين النسختين إشعار جهة التحكم بالإفصاح، وهو ما حذفته المسودة الثانية مع البند 13.2.
- **الفقرة 2.** النص العربي يوجب الإشعار إذا خالفت **تعليمات جهة التحكم** الأنظمة المعمول بها في المملكة. الترجمة الإنجليزية تجعله عند «violation of the Controller's instructions or any applicable laws»، أي عند مخالفة التعليمات أو الأنظمة. البند R04 مكتوب على النص العربي.

قُرئت الترجمة الإنجليزية في نسخة محفوظة من الملف المنشور في موقع سدايا؛ وعنوانها رفض الطلب الآلي عند المراجعة في 17 نوفمبر 2026. تأكد منها في الموقع قبل الدفعة.
`);
sol('D2_2_document_handling.md', `# الحل المرجعي: المختبر 2.2 قرارات التعامل مع اثني عشر مستندًا

نقطة البداية: \`files/matter/summary.html\` والمستندات D01 إلى D12، و\`files/case/handling_card.html\` و\`files/start/handling_decisions.csv\`. المختبر دون أي مساعد. التحقق بالكود: \`node labs/solutions/check.mjs 2.2\`.

${mdTable(['المستند', 'السرية', 'الامتياز', 'البيانات الشخصية', 'أعلى أداة', 'قبلها', 'إحالة', 'القاعدة', 'السبب'], F.DOCS.map((d, i) => [d.id, d.level, d.priv, d.pd, decisions[i].tool, decisions[i].before, decisions[i].escalate ? 'نعم' : 'لا', decisions[i].rule, d.why]))}
التوزيع: ${F.TOOLS.map(t => `${t}: ${decisions.filter(d => d.tool === t).length}`).join('، ')}.

الترميز: المستند D05 بعد تطبيق جدول المفاتيح في \`reference/D2_2_D05_pseudonymised.md\`. يبقى فيه التشخيص والسوابق المرضية: الترميز يخفي من هو المريض، ولا يجعل البيانات غير حساسة، ولذلك لا يتجاوز «قسطاس».

سطر الإفصاح المرجعي: ${F.DISCLOSURE_LINE}
`);
sol('capstone.md', `# مفاتيح المشروع الختامي

مساران، ولكل مسار ثلاثة نماذج متكافئة: النموذج 1 لخط الأساس في العمل التحضيري (مفتاحه في \`files/capstone/form1_keys.html\`)، والنموذجان 2 و3 للتنفيذين بمساعدة الذكاء الاصطناعي. اعرض مفتاح كل نموذج بعد انتهاء تنفيذه. التحقق بالكود: \`node labs/solutions/check.mjs capstone\`.

## المسار أ: مذكرة قصيرة بستة مراجع

${P.SHORT_MEMOS.map(m => `### النموذج ${m.form}\n\n${mdTable(['#', 'المرجع', 'الحكم', 'نوع العيب', 'التصحيح'], keyA(m))}`).join('\n')}
## المسار ب: اتفاقية عدم إفصاح وفق الدليل المصغر

${F.NDA_FORMS.map(f => `### النموذج ${f.form}\n\n${mdTable(['الموقف', 'الموضوع', 'النتيجة', 'رقم البند'], keyB(f))}`).join('\n')}
## الجلسات المسجلة

- المسار أ، النموذج 2: ${P.SHORT_MEMO_RUNS[2].note}
- المسار أ، النموذج 3: ${P.SHORT_MEMO_RUNS[3].note}
- المسار ب، النموذج 2: ${F.NDA_RUNS[2].note}
- المسار ب، النموذج 3: ${F.NDA_RUNS[3].note}

## المراجعة المباشرة

يختار المراجع بندين من سجل المشارك (المختبر 2.1)، ويفتح المشارك النص الرسمي ويشير إلى المادة والفقرة. من لم يكمل سجله يأخذ \`reference/D2_1_register.csv\`، ويُسأل عن بندين منه.
`);
sol('answer_key.md', `# مفتاح ما زُرع في ملفات سنام

كل ما يأتي مولّد من \`labs/_tools/\`، والفحص \`node labs/solutions/check.mjs\` يعيد حسابه من الملفات.

| المختبر | الملف | المزروع | الأعداد المتوقعة |
|---|---|---|---|
| 1.1 | \`memo/qistas_memo.html\` | ${faulty.map(c => `${c.id}: ${c.fault}`).join('؛ ')} | ${P.CITES.length - faulty.length} سليمة و${faulty.length} معيبة |
| 1.1 | \`memo/requests.html\` | سؤال إيحائي وخلاصة تجاريه | خلاصة لا يسندها المرجع 6 |
| 1.1 | \`portal/en-law-7-2019.html\` | ترجمة غير رسمية لم تُحدَّث | المادة 9: خمسة أيام عمل بدل 72 ساعة |
| 1.2 | \`contract/dpa_v2\` | ${facts12.red} خطوط حمراء، ${facts12.fallback} بدائل احتياطية، ${facts12.missing} بنود ناقصة | ${facts12.issues} مسألة في ${facts12.positions} موقفًا |
| 1.2 | المسودتان | ${facts12.changes} تغييرًا، سكتت الرسالة عن ${facts12.changes_silent} | ${facts12.words_v1} كلمة في الأولى و${facts12.words_v2} في الثانية |
| 1.2 | الجلستان المسجلتان | مسألة مختلقة، وتصنيف خطأ، ورقم بند خطأ، وتغيير مختلق | فات المراجعةَ ${facts12.run_missed.length} وفات المقارنةَ ${facts12.compare_missed.length} |
| 2.1 | \`register/qistas_register_draft.csv\` | ${F.DRAFT.filter(d => d.fault).length} صفوف معيبة والتزامان فائتان | السجل المرجعي ${F.REGISTER.length} بندًا |
| 2.2 | \`matter/D01\` إلى \`D12\` | امتياز مشكوك فيه (D08)، ومستند الخصم بتعهد (D11)، وجزء حساس يُحجب (D06) | ${F.TOOLS.map(t => `${t} ${decisions.filter(d => d.tool === t).length}`).join('، ')} |
| الختامي | \`capstone/\` | عيبان في كل مذكرة، وثلاث مسائل في كل اتفاقية | ثلاثة نماذج متكافئة لكل مسار |
`);

console.log(`wrote ${written} files; agreement: ${facts12.words_v1} words (v1), ${facts12.words_v2} words (v2); ${facts12.changes} changes; ${facts12.issues} issues`);
