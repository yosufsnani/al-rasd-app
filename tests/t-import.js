/* ===== استيراد درجات الاختبار =====
   البيانات هنا شكل ملف المعلّم الحقيقي: اسمٌ كتبه الطالب بنفسه في عمود،
   واسمٌ رباعي في آخر، وصفوف إحصاء في الأسفل، وطالبٌ سلّم مرتين. أخطر ما
   في الميزة أن تُسند درجةً لطالبٍ آخر، أو أن تكتب شيئًا قبل أن يعتمد
   المعلّم. كلاهما يُفحص هنا في متصفّحٍ حقيقي لأن الشاشة كلها DOM. */

const path = require('path');
const { suite, APP } = require('./harness.js');

/* كشف الشعبة كما هو في التطبيق (٣٠ اسمًا). */
const ROSTER = [
  'ابراهيم عبدالله عبيدالله المشعلي','احمد سعد جزى القاضي','الوليد خالد مرزوق الرفاعي',
  'بتال عبدالمجيد حمود العلوني','بندر عابد الجهني','تميم علي سلامة الجهني',
  'ثامر منير عواده الرفاعي','جواد لافي سعيدان الجهني','حازم محمد العلوني',
  'حسين مرجي الخلوي','راشد طلال راشد العنمي','زايد احمد عايد المرواني',
  'زياد سليمان سمران المشعلي','صفوان متعب الميلبي','عبد العزيز سالم مسلم الحجوري',
  'عبد العزيز فريج مبيريك الجهني','عبدالله حميد مصلح الجهني','عبدالله سعود عبدالله القبساني',
  'عمر نور حسين نزير','فراس احمد عبيان الجهني','فيصل عبد الله عايد الجهني',
  'ماهر سعد العنمي','محمد حجيج عياد العلوني','محمد حماد محمد الجهني',
  'محمد سعود محمد العيسي','محمد منصور الجهني','منصور عايد الرفاعي',
  'مهند يوسف رابح العمري','هتان عبدالله مسعد العلوني','هيثم جاسر محمد الجهني'
];

/* صفوف الملف: [الاسم كما كتبه الطالب, الرباعي إن وُجد, الدرجة, التاريخ].
   ثمانية منها لا تُطابق حرفيًا، وواحد مكرّر بمحاولتين. */
const FILE_ROWS = [
  ['منصور عايد الرفاعي','منصور عايد الرفاعي',20,'٣/٥/١٤٤٨'],
  ['تميم علي سلامة الجهني','تميم علي سلامة الجهني',20,'٢/٥/١٤٤٨'],
  ['مهند يوسف رابح العمري','',20,'٢/٥/١٤٤٨'],
  ['فراس احمد عبيان الجهني','',20,'٢/٥/١٤٤٨'],
  ['حسين مرجي الخلوي','',20,'٢/٥/١٤٤٨'],
  ['عبدالله حميد مصلح الجهني','',20,'٢/٥/١٤٤٨'],
  ['فيصل عبد الله عايد الجهني','',20,'٢/٥/١٤٤٨'],
  ['احمد سعد جزى القاضي','',20,'٢/٥/١٤٤٨'],
  ['هتان عبدالله العلوني','',20,'٢/٥/١٤٤٨'],
  ['عمر نور حسين نزير حسين إحسان الدين','',20,'٢/٥/١٤٤٨'],
  ['راشد طلال راشد العنمي','',19,'٤/٥/١٤٤٨'],
  ['عبدالله سعود عبدالله القبساني','',19,'٣/٥/١٤٤٨'],
  ['محمد منصور الجهني','',19,'٣/٥/١٤٤٨'],
  ['حسين مرجي الخلوي','',19,'٣/٥/١٤٤٨'],
  ['حازم محمد العلوني','',19,'٣/٥/١٤٤٨'],
  ['ثامر منير عواده الرفاعي','',19,'٢/٥/١٤٤٨'],
  ['عبد العزيز فريج مبيريك الجهني','',19,'٢/٥/١٤٤٨'],
  ['هيثم جاسر محمد الجهني','',19,'٢/٥/١٤٤٨'],
  ['محمد سعود بن محمد قاطي العيسي','',19,'٢/٥/١٤٤٨'],
  ['محمد حجبج عياد العلوني الجهني','',19,'٢/٥/١٤٤٨'],
  ['ماهر سعد العنمي','',18,'٣/٥/١٤٤٨'],
  ['الوليد خالد مرزوق الرفاعي','',18,'٣/٥/١٤٤٨'],
  ['صفوان متعب الميلبي','',18,'٢/٥/١٤٤٨'],
  ['بتال عبدالمجيد حمود العلوني','',18,'٢/٥/١٤٤٨'],
  ['زياد سليمان سمران المشعلي','',18,'٢/٥/١٤٤٨'],
  ['زايد احمد عايد المرواني','',18,'٢/٥/١٤٤٨'],
  ['محمد حماد الجهني','',18,'٢/٥/١٤٤٨'],
  ['بندر عابد الجهني','',17,'٢/٥/١٤٤٨'],
  ['جواد لافي سعيدان حمد محمد الرديهي','',17,'٢/٥/١٤٤٨'],
  ['عبد العزيز سالم مسلم الحجوري','',15,'٢/٥/١٤٤٨'],
  ['ابراهيم عبدالله عبيدالله المشعلي','',13,'٢/٥/١٤٤٨']
];

/* الملف كما تقرأه SheetJS: ترويسة، ثم الصفوف، ثم ستّة صفوف إحصاء. */
function buildAOA(max){
  const aoa = [['م','اسم الطالب','اسم الطالب رباعيا','البريد','الدرجة','من','','','','التاريخ']];
  FILE_ROWS.forEach((r,i)=> aoa.push([i+1, r[0], r[1], 'x@y.z', r[2], max, '', '', '', r[3]]));
  [['عدد الطلاب', FILE_ROWS.length], ['المتوسط', 18.6], ['أعلى درجة', 20],
   ['أدنى درجة', 13], ['عدد الناجحين', 31], ['عدد الراسبين', 0]]
    .forEach(st=> aoa.push(['', st[0], '', '', '', '', '', '', '', '']));
  return aoa;
}

function findPlaywright(){
  for(const m of ['playwright','playwright-core']){
    try{ return require(m); }catch(e){}
  }
  for(const base of ['/opt/node22/lib/node_modules', '/usr/lib/node_modules', '/usr/local/lib/node_modules']){
    try{ return require(path.join(base, 'playwright')); }catch(e){}
  }
  return null;
}

const SEED = (names)=>{
  applyLoadedState(normalizeLoadedState(freshState()));
  SAVE_ENABLED = false;
  const k = SECTION_KEYS[0];
  STATE.sections[k].length = names.length;
  names.forEach((n,i)=>{ STATE.sections[k][i].name = n; });
  examSettings().enabled = true;
  STATE.activeView = 'rasd'; STATE.activeTab = k; STATE.rosterView = 'table';
  render();
};

module.exports = async function run(){
  const t = suite('استيراد الدرجات');
  const pw = findPlaywright();
  if(!pw){
    t.skip('كل فحوص الاستيراد', 'Playwright غير مثبّت — ثبّته بـ npm i -D playwright');
    return t.done();
  }
  let browser;
  try{
    browser = await pw.chromium.launch({
      executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
    });
  }catch(e){
    try{ browser = await pw.chromium.launch(); }
    catch(e2){ t.skip('كل فحوص الاستيراد', 'تعذّر تشغيل المتصفّح: ' + e2.message.split('\n')[0]); return t.done(); }
  }
  const url = 'file://' + APP;

  async function open(max){
    const p = await browser.newPage({ viewport:{ width:430, height:880 } });
    await p.goto(url);
    await p.waitForFunction(()=> typeof freshState === 'function', null, { timeout:15000 });
    await p.evaluate(SEED, ROSTER);
    await p.evaluate((aoa)=>{
      window.__parsed = examParseAOA(aoa);
      showExamReviewDialog(SECTION_KEYS[0], 0, window.__parsed);
    }, buildAOA(max));
    await p.waitForTimeout(150);
    return p;
  }
  const scores = (p)=> p.evaluate(()=>
    STATE.sections[SECTION_KEYS[0]].map(r=> examScore(r, 0)));

  /* ١ — القراءة: الإحصاء يُهمل، والدرجة العظمى والتاريخ يُقرآن. */
  t.head('قراءة الملف');
  let p = await open(20);
  const parsed = await p.evaluate(()=> ({
    n: window.__parsed.rows.length, ignored: window.__parsed.ignored,
    max: window.__parsed.max, err: window.__parsed.error,
    when: window.__parsed.rows[0].when, four: window.__parsed.rows[0].four
  }));
  t.ok('كل صفوف الطلاب قُرئت', parsed.n === FILE_ROWS.length, parsed.n + ' من ' + FILE_ROWS.length);
  t.ok('وصفوف الإحصاء أُهملت', parsed.ignored === 6, String(parsed.ignored));
  t.ok('والدرجة العظمى من عمود «من»', parsed.max === 20, String(parsed.max));
  t.ok('والتاريخ يُقرأ (به تُميَّز المحاولتان)', parsed.when === '٣/٥/١٤٤٨', parsed.when);
  t.ok('والاسم الرباعي يُقرأ', parsed.four === 'منصور عايد الرفاعي');
  t.ok('ولا خطأ', parsed.err === null, String(parsed.err));

  /* ٢ — العقد المعلن: لا تُكتب درجة قبل «اعتمد». */
  t.head('لا شيء يُكتب قبل الاعتماد');
  t.ok('الشاشة مفتوحة', await p.evaluate(()=> !!document.getElementById('xi-body')));
  let sc = await scores(p);
  t.ok('كل الخانات فارغة ما دامت الشاشة مفتوحة',
       sc.every(v=> v === null), sc.filter(v=> v !== null).length + ' مرصودة');

  /* ٣ — تقسيم الصفوف. المكرّر مدخلٌ واحد لا اثنان. */
  t.head('تقسيم الصفوف');
  const groups = await p.evaluate(()=> ({
    review: document.querySelectorAll('#xi-body .xi-row').length,
    autos: document.querySelectorAll('#xi-body .xi-autolist div').length,
    att: document.querySelectorAll('#xi-body [data-att]').length,
    counts: [...document.querySelectorAll('#xi-body .xi-grp-h')].map(h=> h.textContent.trim()),
    attOpts: [...(document.querySelector('#xi-body [data-att]') || {options:[]}).options].map(o=> o.text),
    attSel: (document.querySelector('#xi-body [data-att]') || {}).value
  }));
  /* ٣١ صفًّا لثلاثين طالبًا: ٢٣ تطابقت حرفيًا، ٦ كتبها الطالب ناقصة أو
     بخطأ، وطالبٌ سلّم مرتين فصار مدخلًا واحدًا. */
  t.ok('٧ مدخلات للمراجعة: ٦ ناقصة + مكرّرٌ واحد', groups.review === 7,
       groups.review + ' — ' + JSON.stringify(groups.counts));
  t.ok('و٢٣ طوبقت تلقائيًا', groups.autos > 0 && /٢٣|23/.test(groups.counts[1] || ''), groups.counts[1]);
  t.ok('ومجموعة «يحتاج تأكيدك» تعلن العدد نفسه', /٧|7/.test(groups.counts[0] || ''), groups.counts[0]);
  t.ok('والمكرّر مدخلٌ واحد بقائمة محاولات', groups.att === 1, String(groups.att));
  t.ok('والمحاولتان ظاهرتان بتاريخيهما', groups.attOpts.length === 2 &&
       /٢\/٥/.test(groups.attOpts.join('|')) && /٣\/٥/.test(groups.attOpts.join('|')),
       JSON.stringify(groups.attOpts));
  t.ok('والأعلى هي الافتراضية', Number(groups.attSel) === 20, groups.attSel);

  /* ٤ — «اعتمد» يكتب، ولا يكتب لمن ليس في الملف. */
  t.head('الاعتماد');
  await p.evaluate(()=> document.getElementById('xi-go').click());
  await p.waitForTimeout(150);
  sc = await scores(p);
  const byName = {}; ROSTER.forEach((n,i)=> byName[n] = sc[i]);
  t.ok('٣٠ درجة رُصدت (المكرّر طالب واحد)', sc.filter(v=> v !== null).length === 30,
       String(sc.filter(v=> v !== null).length));
  t.ok('والنافذة أُغلقت', await p.evaluate(()=> !document.getElementById('xi-body')));
  t.ok('الاسم الحرفي أخذ درجته', byName['منصور عايد الرفاعي'] === 20, String(byName['منصور عايد الرفاعي']));
  t.ok('والناقص «هتان عبدالله العلوني» ذهب لصاحبه',
       byName['هتان عبدالله مسعد العلوني'] === 20, String(byName['هتان عبدالله مسعد العلوني']));
  t.ok('والمكرّر أخذ الأعلى لا الأخيرة', byName['حسين مرجي الخلوي'] === 20, String(byName['حسين مرجي الخلوي']));
  t.ok('والمخطأ إملائيًا «محمد حجبج» لصاحبه لا للجهني',
       byName['محمد حجيج عياد العلوني'] === 19, String(byName['محمد حجيج عياد العلوني']));
  t.ok('و«محمد حماد الجهني» لم يُخلط بـ«محمد منصور الجهني»',
       byName['محمد حماد محمد الجهني'] === 18 && byName['محمد منصور الجهني'] === 19,
       byName['محمد حماد محمد الجهني'] + '/' + byName['محمد منصور الجهني']);
  /* الرصد لا يُفسد أعمال السنة. */
  t.ok('ولم تُمسّ خانات الرصد', await p.evaluate(()=>
    STATE.sections[SECTION_KEYS[0]].every(r=> r.p.every(v=> v === SYMS[0]))));
  await p.close();

  /* ٥ — «تجاهل» يمنع الكتابة لذلك الصف وحده. */
  t.head('«تجاهل هذا الصف»');
  p = await open(20);
  const off = await p.evaluate(()=>{
    const s = document.querySelector('#xi-body [data-tgt]');
    const typed = s.closest('.xi-row').querySelector('.xi-typed').textContent;
    s.value = 'skip'; s.dispatchEvent(new Event('change'));
    return { typed, label: document.getElementById('xi-go').textContent.trim(),
             off: !!document.querySelector('#xi-body .xi-row.off') };
  });
  t.ok('الصف يُعلَّم متجاهلًا', off.off);
  t.ok('والعدّاد ينزل إلى ٢٩', /٢٩|29/.test(off.label), off.label);
  await p.evaluate(()=> document.getElementById('xi-go').click());
  await p.waitForTimeout(150);
  sc = await scores(p);
  t.ok('و٢٩ فقط رُصدت', sc.filter(v=> v !== null).length === 29, String(sc.filter(v=> v !== null).length));
  t.ok('وبقي المتجاهَل فارغًا لا صفرًا',
       sc[ROSTER.indexOf('هتان عبدالله مسعد العلوني')] === null ||
       sc[ROSTER.indexOf('عمر نور حسين نزير')] === null);
  await p.close();

  /* ٦ — تغيير الوجهة: الدرجة تتبع اختيار المعلّم لا اقتراحنا. */
  t.head('تصحيح المطابقة باليد');
  p = await open(20);
  const moved = await p.evaluate(()=>{
    const s = document.querySelector('#xi-body [data-tgt]');
    const before = s.value;
    const target = STATE.sections[SECTION_KEYS[0]].findIndex(r=> r.name === 'عمر نور حسين نزير');
    s.value = String(target); s.dispatchEvent(new Event('change'));
    document.getElementById('xi-go').click();
    return { before, target };
  });
  await p.waitForTimeout(150);
  sc = await scores(p);
  t.ok('الاقتراح كان غير ما اختاره المعلّم', String(moved.before) !== String(moved.target));
  t.ok('والدرجة ذهبت لمن اختاره هو', sc[moved.target] === 20, String(sc[moved.target]));
  t.ok('ولم تُترك عند الاقتراح', sc[Number(moved.before)] === null ||
       Number(moved.before) === moved.target, String(sc[Number(moved.before)]));
  await p.close();

  /* ٧ — تحذير التضارب: صفّان لطالبٍ واحد يعني درجةً ضائعة. */
  t.head('تحذير صفّين لطالب واحد');
  p = await open(20);
  const clash = await p.evaluate(()=>{
    const sels = [...document.querySelectorAll('#xi-body [data-tgt]')];
    const target = STATE.sections[SECTION_KEYS[0]].findIndex(r=> r.name === 'منصور عايد الرفاعي');
    sels[0].value = String(target); sels[0].dispatchEvent(new Event('change'));
    return document.getElementById('xi-body').textContent;
  });
  t.ok('الشاشة تُسمّي الطالب المتضارب',
       /أكثر من صفٍّ يشير/.test(clash) && clash.indexOf('منصور عايد الرفاعي') >= 0);
  await p.close();

  /* ٨ — ملفٌ من ٣٠ وعمودٌ من ٢٠: يُنبَّه ويُقصّ، ولا يُكتب ٣٠. */
  t.head('اختلاف الدرجة العظمى');
  p = await open(30);
  const warn = await p.evaluate(()=> document.querySelector('.xi-chip.warn') ?
    document.querySelector('.xi-chip.warn').textContent : '');
  t.ok('تحذيرٌ ظاهر قبل الاعتماد', /٣٠|30/.test(warn) && /٢٠|20/.test(warn), warn || '(لا تحذير)');
  await p.evaluate(()=> document.getElementById('xi-go').click());
  await p.waitForTimeout(150);
  sc = await scores(p);
  t.ok('ولا درجة تتجاوز العظمى', sc.filter(v=> v !== null).every(v=> v <= 20),
       JSON.stringify(sc.filter(v=> v !== null && v > 20)));
  await p.close();

  /* ٩ — من ليس في الملف يُعرض ويبقى فارغًا. */
  t.head('من لا درجة له');
  p = await browser.newPage({ viewport:{ width:430, height:880 } });
  await p.goto(url);
  await p.waitForFunction(()=> typeof freshState === 'function', null, { timeout:15000 });
  await p.evaluate(SEED, ROSTER);
  const miss = await p.evaluate(()=>{
    showExamReviewDialog(SECTION_KEYS[0], 0, examParsePaste('منصور عايد الرفاعي 20\nحازم محمد العلوني 15'));
    const txt = document.getElementById('xi-body').textContent;
    document.getElementById('xi-go').click();
    return txt;
  });
  await p.waitForTimeout(150);
  sc = await scores(p);
  t.ok('٢٨ اسمًا معروضون بلا درجة', /٢٨|28/.test(miss), miss.slice(0, 0) || 'العدد غير ظاهر');
  t.ok('والنص يقول صريحًا إنها لا تُحسب صفرًا', /لا تُحسب صفرًا/.test(miss));
  t.ok('وبقيت خاناتهم فارغة بعد الاعتماد', sc.filter(v=> v !== null).length === 2,
       String(sc.filter(v=> v !== null).length));
  t.ok('واللصق رصد الاثنين', sc[ROSTER.indexOf('منصور عايد الرفاعي')] === 20 &&
       sc[ROSTER.indexOf('حازم محمد العلوني')] === 15);

  /* ١٠ — التراجع: عملية جماعية بلا رجعة خطر. */
  t.head('التراجع');
  const undone = await p.evaluate(()=>{
    const btn = document.getElementById('toast-undo');
    if(!btn) return null;
    btn.click();
    return STATE.sections[SECTION_KEYS[0]].map(r=> examScore(r, 0));
  });
  t.ok('زرّ التراجع معروض بعد الاعتماد', undone !== null);
  if(undone) t.ok('والتراجع يمحو الدرجات المستوردة', undone.every(v=> v === null),
                  JSON.stringify(undone.filter(v=> v !== null)));
  await p.close();

  await browser.close();
  return t.done();
};
