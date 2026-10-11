/* ===== قياسٌ في متصفّح حقيقي =====
   ما لا يُعرف إلا بالتخطيط الفعلي: هل يُقصّ اسم؟ هل تثبت الترويسة؟ كم
   صفحة يخرج الكشف؟ هل يقفز المعلّم لأعلى بعد كل رصدة؟ الفحص النصّي على
   ورقة الأنماط لا يجيب عن هذه — القياس وحده يجيب.

   يحتاج Playwright ومتصفّحًا. إن لم يوجدا تُتخطّى هذه المجموعة بوضوح
   ولا تُسقط بقيّة الفحوص. */

const path = require('path');
const { suite, APP } = require('./harness.js');

const NAMES = [
  'احمد فرحان محمد الشمري','أسامه مطيران ناير العتيبي','أنس سليم فريج الحبيشي',
  'أنس محمد فالح الجهني','باسم عاتق مسعد الجميلي','بسام أحمد محمد الجهني',
  'حاتم مناور نور المطيري','ريان عبدالهادي عبدالله الحربي','سامي سعيد محمد الزهراني',
  'سامي عبدالرحمن بن ناصر الدوسري','سلطان فايز حضيري الشمراني','سلطان منصور نور الصاعدي',
  'سياف زارع حميد الحربي','عاصم عبدالله عايش الشهري','عبد الله محمد سلام الزهراني',
  'عبدالعزيز عبدالرحمن ثامر القحطاني','عطاالله حماد عطاالله الحارثي','عمران بن ياسر بن احمد الغامدي',
  'عمار عبدالله عواد الجهني','عمار ناجي عتيق الجهني','عمر ضيف الله عاتق الحربي',
  'فارس ماجد حميد الجهني','متعب حميد حمدان الحربي','محمد حمدي حمدان الزهراني',
  'محمد عمر احمد محمد العتيبي','نايف حامد عطوي الحربي','هتان عبدالهادي عبدالحميد السلمي',
  'ياسر عبدالله أحمد الجهني','يامن محمد سليم الوقاص','يحيى سامي سيف الجهني'
];

function findPlaywright(){
  for(const m of ['playwright','playwright-core']){
    try{ return require(m); }catch(e){}
  }
  for(const base of ['/opt/node22/lib/node_modules', '/usr/lib/node_modules', '/usr/local/lib/node_modules']){
    try{ return require(path.join(base, 'playwright')); }catch(e){}
  }
  return null;
}

/* يُحمّل التطبيق ببيانات معلومة. الشبكة محجوبة في بيئة الاختبار فلا
   تكتمل الإقلاعة من السحابة — نُقلع الحالة يدويًا كما تُقلع بعد الدخول. */
const SEED = (names)=>{
  applyLoadedState(normalizeLoadedState(freshState()));
  SAVE_ENABLED = false;
  const k = SECTION_KEYS[0];
  /* الشعبة الافتراضية خمسون صفًّا، والصفوف الفارغة تُطبع لتُملأ باليد.
     المشهد المقصود هنا شعبةٌ من ثلاثين فنقصّها إليهم. */
  STATE.sections[k].length = names.length;
  names.forEach((n,i)=>{ STATE.sections[k][i].name = n; });
  STATE.letterhead = { l1:'المملكة العربية السعودية', l2:'وزارة التعليم', l3:'متوسطة أم القرى', logo:'' };
  STATE.meta[k] = Object.assign(STATE.meta[k] || {}, { subject:'علوم', grade:'الثالث المتوسط / ٥',
    term:'الفصل الدراسي الأول', year:'١٤٤٨هـ', teacher:'معلّم المادة', principal:'مدير المدرسة' });
  STATE.activeView = 'rasd'; STATE.activeTab = k; STATE.rosterView = 'table';
  STATE.quickItem = { k:CAT_KEYS[0], gi:0 };
  render();
};

module.exports = async function run(){
  const t = suite('القياس في متصفّح');
  const pw = findPlaywright();
  if(!pw){
    t.skip('كل فحوص المتصفّح', 'Playwright غير مثبّت — ثبّته بـ npm i -D playwright');
    return t.done();
  }
  let browser;
  try{
    browser = await pw.chromium.launch({
      executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
    });
  }catch(e){
    try{ browser = await pw.chromium.launch(); }
    catch(e2){ t.skip('كل فحوص المتصفّح', 'تعذّر تشغيل المتصفّح: ' + e2.message.split('\n')[0]); return t.done(); }
  }
  const url = 'file://' + APP;

  async function open(width, height){
    const p = await browser.newPage({ viewport:{ width, height } });
    await p.goto(url);
    await p.waitForFunction(()=> typeof freshState === 'function', null, { timeout:15000 });
    await p.evaluate(SEED, NAMES);
    await p.waitForTimeout(250);
    return p;
  }

  /* ١ — لا اسم يُقصّ، في كل عرض وكل وضع. */
  t.head('الأسماء كاملة في كل عرض');
  for(const [w, label] of [[390,'جوال ٣٩٠'], [430,'جوال ٤٣٠'], [1024,'تابلت ١٠٢٤']]){
    const p = await open(w, 880);
    for(const [mode, sel, ar] of [['table','td.name-c .name-text','جدول'],
                                  ['cards','.stu-top .s-nm','بطاقات'],
                                  ['quick','.qe-name','سريع']]){
      await p.evaluate((m)=>{ STATE.rosterView = m; render(); }, mode);
      await p.waitForTimeout(150);
      const cut = await p.evaluate((sl)=>{
        const els = [...document.querySelectorAll(sl)].filter(e=> e.clientWidth > 0);
        if(!els.length) return -1;
        return els.filter(e=> e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1).length;
      }, sel);
      if(cut < 0) t.skip(label + ' · ' + ar, 'لا عناصر أسماء ظاهرة');
      else t.ok(label + ' · ' + ar + ': لا اسم مقصوص', cut === 0, cut + ' مقصوص');
    }
    await p.close();
  }

  /* ٢ — الترويسة تثبت، والعمود الأفقي يبقى ثابتًا معها. */
  t.head('ترويسة الرصد أثناء النزول');
  for(const [w, h] of [[390,820], [1024,768]]){
    const p = await open(w, h);
    const r = await p.evaluate(()=>{
      const wrap = document.querySelector('.grid-wrap');
      wrap.scrollTop = 800; wrap.scrollLeft = -300;
      return new Promise(res=> requestAnimationFrame(()=> requestAnimationFrame(()=>{
        const wb = wrap.getBoundingClientRect();
        const grp = document.querySelector('thead tr.grp th:not([rowspan])').getBoundingClientRect();
        const sub = document.querySelector('thead tr.sub th').getBoundingClientRect();
        const nm  = document.querySelector('td.name-c').getBoundingClientRect();
        res({ grpTop:Math.round(grp.top - wb.top), grpH:Math.round(grp.height),
              subTop:Math.round(sub.top - wb.top), nameRight:Math.round(wb.right - nm.right),
              scrolled:Math.round(wrap.scrollTop),
              grpPos:getComputedStyle(document.querySelector('thead tr.grp th:not([rowspan])')).position });
      })));
    });
    /* القيمة المطلقة لا «أصغر من»: الصفّ الذي انزلق خارج الإطار قيمته
       سالبة كبيرة، و«أصغر من ١» تقبلها — وهذا ما أخفى عطلًا في الفحص. */
    t.ok(w + 'px: صفّ الفئات عند الحافة', Math.abs(r.grpTop) <= 1, 'عند ' + r.grpTop);
    t.ok('  وهو لاصق فعلًا لا ساكنًا', r.grpPos === 'sticky', r.grpPos);
    t.ok('  وصفّ الأرقام تحته مباشرة', Math.abs(r.subTop - r.grpH) <= 1, r.subTop + ' مقابل ' + r.grpH);
    t.ok('  وعمود الاسم ما زال ثابتًا أفقيًا', r.nameRight >= 0 && r.nameRight <= 40, String(r.nameRight));
    await p.close();
  }

  /* ٣ — رصدةٌ في منتصف الكشف لا تُعيد المعلّم إلى أوّله. */
  t.head('الرصد لا يُقفز بالمعلّم');
  {
    const p = await open(390, 820);
    await p.evaluate(()=>{ const w = document.querySelector('.grid-wrap'); w.scrollTop = 700; w.scrollLeft = -400; });
    await p.waitForTimeout(200);
    const before = await p.evaluate(()=>{ const w = document.querySelector('.grid-wrap'); return { y:w.scrollTop, x:w.scrollLeft }; });
    await p.evaluate(()=>{ const k = STATE.activeTab; STATE.sections[k][19].p[3] = '✔️'; persistState(); render(); });
    await p.waitForTimeout(300);
    const after = await p.evaluate(()=>{ const w = document.querySelector('.grid-wrap'); return { y:w.scrollTop, x:w.scrollLeft }; });
    t.ok('الموضع العمودي كما كان', Math.abs(after.y - before.y) <= 2, before.y + ' ← ' + after.y);
    t.ok('والأفقي كذلك', Math.abs(after.x - before.x) <= 2, before.x + ' ← ' + after.x);
    await p.close();
  }

  /* ٤ — الكشف المطبوع: صفحة واحدة لثلاثين طالبًا، بلا قصّ ولا اسمٍ ناقص.
     A4 عرضية ٢٩٧مم بهامش ٦مم ⇒ القابل للطباعة ٢٨٥×١٩٨مم = 1077×748px. */
  t.head('الكشف المطبوع');
  {
    const p = await open(1077, 800);
    await p.emulateMedia({ media:'print' });
    await p.waitForTimeout(300);
    const r = await p.evaluate(()=>{
      const names = [...document.querySelectorAll('td.name-c .name-text')];
      const wrap = document.querySelector('.grid-wrap');
      const rows = [...document.querySelectorAll('table.grid tbody tr')];
      return { cut: names.filter(e=> e.scrollWidth > e.clientWidth + 1).length,
               total: names.length,
               overflow: getComputedStyle(wrap).overflowY,
               maxH: getComputedStyle(wrap).maxHeight,
               lastBottom: Math.round(rows[rows.length-1].getBoundingClientRect().bottom),
               docH: Math.round(document.body.scrollHeight) };
    });
    t.ok('الإطار مفتوح على الورق', r.overflow === 'visible' && r.maxH === 'none', r.overflow + '/' + r.maxH);
    t.ok('لا اسم مقصوص', r.cut === 0, r.cut + ' من ' + r.total);
    t.ok('والمحتوى داخل الصفحة (٧٤٨px)', r.docH <= 748, r.docH + 'px');
    const pdf = await p.pdf({ preferCSSPageSize:true });
    const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    t.ok('صفحة واحدة لثلاثين طالبًا', pages === 1, pages + ' صفحة');
    await p.close();
  }

  await browser.close();
  return t.done();
};
