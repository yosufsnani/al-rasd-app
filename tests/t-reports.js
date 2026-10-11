/* ===== التقارير التي تخرج من التطبيق إلى غيره =====
   ورقة تذهب إلى المرشد أو ولي الأمر لا تُراجَع قبل إرسالها، فرقمٌ خاطئ
   فيها يُبنى عليه قرار. هذه الفحوص تقارن ما تطبعه الورقة بما رُصد فعلًا. */

const vm = require('vm');
const { load, suite } = require('./harness.js');

module.exports = async function run(){
  const t = suite('تقارير الإحالة وولي الأمر');
  const s = load();

  /* رصدٌ معلوم العدد: ٧ لم تُسلَّم، ٤ متأخرة، ٩ كاملة. */
  const setup = `
    applyLoadedState(normalizeLoadedState(freshState())); CURRENT_UID='u1'; SAVE_ENABLED=false;
    var K = SECTION_KEYS[0], ROW = STATE.sections[K][0];
    ROW.name = 'سلطان فايز حضيري الشمراني';
    for(var i=0;i<7;i++) ROW.p[i] = '❌';
    for(var i=0;i<4;i++) ROW.h[i] = '⏰';
    for(var i=0;i<9;i++) ROW.t[i] = '✔️';
    var IND = computeReferralIndicators(ROW);
  `;
  vm.runInContext(setup, s);
  const ind = vm.runInContext('JSON.parse(JSON.stringify(IND))', s);

  t.head('المؤشّرات تُحسب من الرصد لا من تقدير');
  t.ok('عدد ما لم يُسلَّم = ٧', ind.missCount === 7, String(ind.missCount));
  t.ok('عدد المتأخر = ٤', ind.lateCount === 4, String(ind.lateCount));
  t.ok('والمرصود = ٢٠ (٧+٤+٩)', ind.assessedCount === 20, String(ind.assessedCount));

  /* ورقة الإحالة: كانت تعرض التأخيرات ولا تعرض عدم التسليم — وهو أقوى
     ما يحمله التقرير، إذ يتدخّل المرشد للمهمّة التي لم تصل أصلًا. */
  t.head('ورقة الإحالة إلى المرشد');
  const sheet = vm.runInContext(`referralSheetHtml({
    includeStats:true, assessedCount:IND.assessedCount, lateCount:IND.lateCount,
    missCount:IND.missCount, ratioPct:IND.ratioPct, worstLabel:IND.worstLabel,
    studentName:ROW.name, section:K, subject:'علوم', teacher:'معلّم',
    recipientLabel:'المرشد الطلابي', term:'الأول', reasonLow:true, reasonLate:false,
    reasonBoth:false, reasonOther:false, tasks:[], note:'—'
  })`, s);
  const txt = (h)=> h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  t.ok('تطبع «مهام لم تُسلَّم: ٧»', /مهام لم تُسلَّم:\s*7/.test(txt(sheet)));
  t.ok('وتطبع «مهام سُلّمت متأخرة: ٤»', /مهام سُلّمت متأخرة:\s*4/.test(txt(sheet)));
  t.ok('وتطبع المرصود ونسبة الإنجاز', /عدد المهام المرصودة:\s*20/.test(txt(sheet)) && /نسبة الإنجاز/.test(txt(sheet)));

  /* الإحالات المؤرشفة تُطبع بالدالة نفسها، والقديمة لا تحمل الحقل الجديد. */
  t.head('إحالة قديمة من الأرشيف');
  const old = vm.runInContext(`referralSheetHtml({
    includeStats:true, assessedCount:12, lateCount:3, ratioPct:40, worstLabel:'الواجبات',
    studentName:'طالب', section:'شعبة 1', subject:'علوم', teacher:'معلّم',
    recipientLabel:'المرشد الطلابي', term:'الأول', reasonLow:true, reasonLate:false,
    reasonBoth:false, reasonOther:false, tasks:[], note:'—'
  })`, s);
  t.ok('لا تطبع undefined', old.indexOf('undefined') < 0);
  t.ok('ويُحذف السطر بدل أن يُطبع فارغًا', !/لم تُسلَّم/.test(txt(old)));
  t.ok('وبقيّة الورقة كما كانت', /عدد المهام المرصودة:\s*12/.test(txt(old)));

  /* ورقة ولي الأمر: المصطلح نفسه، فلا يختلف الاسمان بين ورقتين من
     التطبيق نفسه ويظنّهما القارئ شيئين. */
  t.head('ورقة ولي الأمر');
  const pTxt = txt(vm.runInContext('parentReportHtml(buildParentReportData(K,0))', s));
  t.ok('تعرض عدم التسليم بالعدد نفسه', /مرات عدم التسليم:\s*7/.test(pTxt), 'لا يطابق الإحالة');
  t.ok('وتعرض التأخير بالعدد نفسه', /مرات التأخر في التسليم:\s*4/.test(pTxt));

  /* المؤشّر صفرٌ حين لا رصد: ورقةٌ تقول «٠ لم تُسلَّم» أصدق من ورقةٍ
     تقول «—» ثم يُقرأ الفراغ على أنه لا مشكلة. */
  t.head('طالب بلا رصد');
  vm.runInContext(`
    var R2 = STATE.sections[K][1];
    var IND2 = computeReferralIndicators(R2);
  `, s);
  const ind2 = vm.runInContext('JSON.parse(JSON.stringify(IND2))', s);
  t.ok('كل العدادات صفر', ind2.missCount === 0 && ind2.lateCount === 0 && ind2.assessedCount === 0,
       JSON.stringify(ind2));

  return t.done();
};
