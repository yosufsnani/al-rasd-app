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

  /* بطاقة التحليل: تقارن الاختبارين بعضهما، لا الفصل بأرشيفه — وتُسمّي من
     انخفض، فالعدد وحده لا يُتابَع به طالب. */
  t.head('بطاقة «اختبارا الفترتين» في التحليل');
  run1(`
    applyLoadedState(normalizeLoadedState(freshState()));
    var KA = SECTION_KEYS[0];
    STATE.sections[KA].length = 4;
    ['أ','ب','ج','د'].forEach(function(n,i){ STATE.sections[KA][i].name = 'طالب '+n; });
    examSettings().enabled = true;
    var EMPTY_HTML = renderAnalysis();
    setExamScore(STATE.sections[KA][0], 0, 20); setExamScore(STATE.sections[KA][0], 1, 10);
    setExamScore(STATE.sections[KA][1], 0, 10); setExamScore(STATE.sections[KA][1], 1, 18);
    setExamScore(STATE.sections[KA][2], 0, 15);
    var ON_HTML = renderAnalysis();
    var MOVERS = JSON.parse(JSON.stringify(examMovers()));
    /* الإطفاء لا يمحو الدرجات، فالبطاقة هي التي يجب أن تختفي. */
    examSettings().enabled = false;
    var OFF_HTML = renderAnalysis();
    examSettings().enabled = true;
  `);
  const title = 'اختبارا الفترتين';
  t.ok('لا تظهر قبل رصد أي درجة', run1('EMPTY_HTML').indexOf(title) < 0);
  const onHtml = run1('ON_HTML');
  t.ok('وتظهر بعد الرصد', onHtml.indexOf(title) >= 0);
  t.ok('وتختفي بإطفاء الميزة ولو بقيت الدرجات', run1('OFF_HTML').indexOf(title) < 0);
  /* «الفترة الأولى» ترد في الجدول أيضًا، فالفحص داخل الرسمة وحدها. */
  const svg = (onHtml.slice(onHtml.indexOf(title)).match(/<svg[\s\S]*?<\/svg>/) || [''])[0];
  t.ok('وتُسمّي الفترتين في مفتاح الرسم',
       svg.indexOf('>الفترة الأولى<') >= 0 && svg.indexOf('>الفترة الثانية<') >= 0,
       svg ? 'المفتاح: ' + (svg.match(/>الفترة[^<]*</g) || []).join(' ') : 'لا رسمة');
  /* الرسمة نفسها تخدم بطاقة الأرشيف، فتسميتها الأصلية يجب أن تبقى لها. */
  const plain = run1("svgGroupedBars(['شعبة 1'], [50], [60], {})");
  t.ok('ومفتاح بطاقة الأرشيف لم يتغيّر',
       plain.indexOf('>الفترة السابقة<') >= 0 && plain.indexOf('>الفترة الحالية<') >= 0);
  t.ok('والمتوسط يُعرض منسوبًا للعظمى', /15 من 20/.test(onHtml), 'متوسط ٣ درجات: ٢٠ و١٠ و١٥');

  const movers = run1('MOVERS');
  t.ok('من رُصدت له فترة واحدة لا يُقارَن', movers.length === 2, JSON.stringify(movers.map(m=> m.name)));
  t.ok('والترتيب يبدأ بالأشدّ انخفاضًا', movers[0].name === 'طالب أ' && movers[0].delta === -10,
       JSON.stringify(movers[0]));
  t.ok('والمتحسّن في الطرف الآخر', movers[1].delta === 8);
  t.ok('والمنخفض يُسمّى في البطاقة',
       onHtml.indexOf('الأكثر انخفاضًا') >= 0 && onHtml.indexOf('20 ← 10') >= 0);
  t.ok('والمتحسّن كذلك', onHtml.indexOf('الأكثر تحسّنًا') >= 0 && onHtml.indexOf('10 ← 18') >= 0);
  t.ok('والفرق بالدرجات حين تتساوى العظمى', /▼ 10 درجة/.test(onHtml));

  /* ١٥ من ٢٠ ثم ٣٠ من ٤٠ ليست ارتفاعًا بـ١٥ درجة — هي ثبات. */
  run1(`
    examSettings().max[1] = 40;
    setExamScore(STATE.sections[SECTION_KEYS[0]][0], 0, 15);
    setExamScore(STATE.sections[SECTION_KEYS[0]][0], 1, 30);
    var MIX = JSON.parse(JSON.stringify(examMovers()));
    var MIX_HTML = renderAnalysis();
  `);
  const mix = run1('MIX').find(m=> m.name === 'طالب أ');
  t.ok('واختلاف العظمى يُقاس بالنقاط المئوية لا بالدرجات', mix.delta === 0 && mix.pctDelta === 0,
       JSON.stringify(mix));
  t.ok('والوحدة تُسمّى في البطاقة', /نقطة مئوية/.test(run1('MIX_HTML')));
  run1('examSettings().max[1] = 20;');

  t.head('الطباعة: الحصّة تُؤخذ من البنود لا تُضاف للعرض');
  t.ok('عمود الفترة له عرض مصرَّح', css.has('col.col-exam', /width\s*:\s*2\.2%/));
  t.ok('وحصّة البنود متغيّرة', css.has('col.col-data', /--data-share/));
  t.ok('وتُخصم عند التفعيل', /--data-share:\$\{examEnabled\(\) \? '53\.1%' : '57\.5%'\}/.test(h),
       '٥٧٫٥ − (٢ × ٢٫٢) = ٥٣٫١');

  return t.done();
};
