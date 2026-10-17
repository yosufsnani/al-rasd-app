/* ===== درجات اختبارات الفترتين =====
   عمودان رقميّان في كشفٍ كلّه رموز. أخطر ما فيهما أن يُخلطا بأعمال السنة:
   المجموع النهائي وعلم «يحتاج متابعة» يجب ألّا يتحرّكا بدرجة اختبار. */

const vm = require('vm');
const { load, suite, cssRules, appHtml } = require('./harness.js');

module.exports = async function run(){
  const t = suite('درجات الفترتين');
  const s = load();
  const css = cssRules();
  const h = appHtml();

  const setup = `
    applyLoadedState(normalizeLoadedState(freshState()));
    CURRENT_UID='u1'; SAVE_ENABLED=false;
    var K = SECTION_KEYS[0], R = STATE.sections[K][0];
    R.name = 'طالب الاختبار';
  `;
  vm.runInContext(setup, s);
  const run1 = (code)=> vm.runInContext(code, s);

  t.head('القيم: غير المرصود ليس صفرًا');
  t.ok('الخانة تبدأ فارغة لا صفرًا', run1('examScore(R,0)') === null);
  t.ok('والحالات القديمة بلا الحقل لا تنكسر', run1('examScore({name:"قديم"},0)') === null);
  run1('setExamScore(R,0,18)');
  t.ok('تُكتب الدرجة', run1('examScore(R,0)') === 18);
  run1('setExamScore(R,0,"")');
  t.ok('والمسح يعيدها فارغة لا صفرًا', run1('examScore(R,0)') === null);
  run1('setExamScore(R,0,0)');
  t.ok('والصفر يُحفظ صفرًا (رسب لا غياب)', run1('examScore(R,0)') === 0);
  run1('setExamScore(R,1,99)');
  t.ok('وما فوق العظمى يُقصّ إليها', run1('examScore(R,1)') === 20, String(run1('examScore(R,1)')));
  run1('setExamScore(R,1,-5)');
  t.ok('والسالب يُرفع للصفر', run1('examScore(R,1)') === 0);
  run1('setExamScore(R,1,"نص")');
  t.ok('والنصّ لا يُفسد المحفوظ', run1('examScore(R,1)') === 0);

  /* هذا الفحص هو سبب وجود الميزة على هذه الصورة: لو دخلت الدرجة في
     المجموع لتغيّر المستوى وعلم المتابعة، وتغيّر من يُحال إلى المرشد. */
  t.head('لا تمسّ المجموع ولا المتابعة');
  run1(`
    var R2 = STATE.sections[K][1]; R2.name = 'طالب المقارنة';
    for(var g=0; g<5; g++) R2.p[g] = '✔️';
    var CALC_BEFORE = JSON.stringify(studentCalc(R2));
    var FLAG_BEFORE = needsFollowUpList().length;
    setExamScore(R2, 0, 20); setExamScore(R2, 1, 20);
    var CALC_AFTER = JSON.stringify(studentCalc(R2));
    var FLAG_AFTER = needsFollowUpList().length;
  `);
  t.ok('المجموع النهائي لم يتغيّر', run1('CALC_BEFORE') === run1('CALC_AFTER'));
  t.ok('وقائمة «يحتاج متابعة» لم تتغيّر', run1('FLAG_BEFORE') === run1('FLAG_AFTER'));

  t.head('الإعدادات');
  t.ok('مطفأة في البداية', run1('(applyLoadedState(normalizeLoadedState(freshState())), examEnabled())') === false);
  run1('examSettings().max[0] = 15;');
  t.ok('الدرجة العظمى تُضبط', run1('examMax(0)') === 15);
  run1('examSettings().max[0] = 0; var M = examMax(0);');
  t.ok('وقيمة فاسدة تعود للافتراضي', run1('M') === 20, String(run1('M')));
  run1('examSettings().names[1] = "اختبار منتصف الفصل";');
  t.ok('والاسم يُغيَّر', run1('examName(1)') === 'اختبار منتصف الفصل');

  t.head('الإحصاء لا يحسب من لم يُرصد له');
  run1(`
    applyLoadedState(normalizeLoadedState(freshState()));
    var KK = SECTION_KEYS[0];
    STATE.sections[KK].length = 4;
    ['أ','ب','ج','د'].forEach(function(n,i){ STATE.sections[KK][i].name = 'طالب '+n; });
    setExamScore(STATE.sections[KK][0], 0, 20);
    setExamScore(STATE.sections[KK][1], 0, 10);
    setExamScore(STATE.sections[KK][2], 0, 0);
    var ST = examStats(KK, 0);
  `);
  const st = run1('JSON.parse(JSON.stringify(ST))');
  t.ok('يعدّ المرصود وحده', st.n === 3 && st.total === 4, JSON.stringify(st));
  t.ok('والمتوسط من المرصود لا من الجميع', st.avg === 10, String(st.avg));
  t.ok('والصفر يدخل الحساب', st.min === 0);
  t.ok('وأعلى درجة صحيحة', st.max === 20);

  t.head('العمودان في الكشف');
  run1('examSettings().enabled = true; STATE.activeView="rasd"; STATE.activeTab=SECTION_KEYS[0];');
  const head = run1('colGroupHeader()');
  t.ok('ترويسة لكل فترة', (head.match(/class="g-exam"/g) || []).length === 2);
  t.ok('وعمودان في colgroup', (head.match(/class="col-exam"/g) || []).length === 2);
  const rows = run1('renderSectionRows(SECTION_KEYS[0])');
  t.ok('وخليّتان لكل طالب', (rows.match(/class="exam-c/g) || []).length === 8, '٤ طلاب × ٢');
  t.ok('والفارغة مُعلَّمة', rows.indexOf('exam-empty') >= 0);
  run1('examSettings().enabled = false;');
  t.ok('والإطفاء يُخفي العمودين', (run1('colGroupHeader()').match(/g-exam/g) || []).length === 0);
  t.ok('ولا يمحو درجة', run1('examScore(STATE.sections[SECTION_KEYS[0]][0],0)') === 20);

  t.head('الطباعة: الحصّة تُؤخذ من البنود لا تُضاف للعرض');
  t.ok('عمود الفترة له عرض مصرَّح', css.has('col.col-exam', /width\s*:\s*2\.2%/));
  t.ok('وحصّة البنود متغيّرة', css.has('col.col-data', /--data-share/));
  t.ok('وتُخصم عند التفعيل', /--data-share:\$\{examEnabled\(\) \? '53\.1%' : '57\.5%'\}/.test(h),
       '٥٧٫٥ − (٢ × ٢٫٢) = ٥٣٫١');

  return t.done();
};
