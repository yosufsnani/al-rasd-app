/* ===== ما لا يظهر إلا على الشاشة أو الورقة =====
   فخاخٌ وقعنا فيها فعلًا: قاعدة تنسيقٍ واحدة تُفسد ورقةً كاملة أو تجعل
   زرَّ المحو يبدو كزرّ التأكيد. المقارنة هنا نصّية على ورقة الأنماط —
   سريعة، وتكفي لحراسة القاعدة نفسها. أمّا القياس الحقيقي (الارتفاعات،
   الالتصاق، عدد الصفحات) ففي t-layout.js بمتصفّح فعلي. */

const vm = require('vm');
const { load, suite, cssRules, appHtml } = require('./harness.js');

module.exports = async function run(){
  const t = suite('التنسيق: الشاشة والورقة');
  const css = cssRules();
  const h = appHtml();
  const s = load();

  /* ١ — الاسم الرباعي لا يُقصّ. القصّ من الآخر يأكل اسم العائلة، وهو
     أكثر ما يميّز الطالب. */
  t.head('اسم الطالب يظهر كاملًا');
  [['td.name-c .name-text','الجدول'], ['.qe-name','سريع'], ['.stu-top .s-nm','البطاقات']].forEach(([sel, ar])=>{
    t.ok(ar + ': يلتفّ ولا يُمنع', css.has(sel, /white-space\s*:\s*normal/), sel);
    t.ok('  وله حدّ أسطر وصندوقٌ يسمح به',
         css.has(sel, /-webkit-line-clamp\s*:\s*[23]/) && css.has(sel, /display\s*:\s*-webkit-box/));
  });
  t.ok('«سريع» ثلاثة أسطر لضيق مساحته (١٠٥ بكسل)', css.has('.qe-name', /-webkit-line-clamp\s*:\s*3/));
  t.ok('والعمود يتّسع على الشاشات العريضة',
       /@media \(min-width:820px\)\s*\{\s*[^}]*th\.name-h[^{]*\{[^}]*min-width\s*:\s*240px/.test(css.css.replace(/\s+/g,' ')));

  /* ٢ — ترويسة الرصد ثابتة، وموضع صفّ الأرقام مربوطٌ بارتفاع صفّ الفئات. */
  t.head('ترويسة الرصد ثابتة');
  t.ok('الجدول في إطارٍ له ارتفاع أقصى', css.has('.grid-wrap', /max-height/));
  t.ok('max-height لا height (الشعبة القليلة تبقى بحجمها)', !css.has('.grid-wrap', /(^|;)\s*height\s*:/));
  t.ok('صفّ الفئات لاصق عند الحافة', css.has('.grid-wrap table.grid thead tr.grp th', /top\s*:\s*0/));
  t.ok('وصفّ الأرقام تحته بمقدار ارتفاعه', css.has('.grid-wrap table.grid thead tr.sub th', /top\s*:\s*var\(--grp-h\)/));
  t.ok('والمقدار معرَّف للعرضين', css.has('.grid-wrap table.grid', /--grp-h\s*:\s*34px/) &&
       /max-width:640px\)\s*\{\s*\.grid-wrap table\.grid\{\s*--grp-h\s*:\s*30px/.test(css.css.replace(/\s+/g,' ')));
  t.ok('والإطار لجدول الرصد وحده لا لكل الجداول', !css.has('.table-wrap', /max-height/));

  /* ٣ — الطباعة تفتح الإطار. بلا هذا يُقصّ الكشف عند أول صفحة. */
  t.head('الطباعة تفتح ما تغلقه الشاشة');
  t.ok('الإطار بلا سقف على الورق', css.has('.grid-wrap', /max-height\s*:\s*none/));
  /* المحدِّدات الثلاثة في قاعدة واحدة، ويُسأل عن كلٍّ منها وحده. */
  ['table.grid thead tr.grp th','table.grid thead tr.sub th','table.grid thead th.g-idx'].forEach(sel=>{
    t.ok('  ' + sel.replace('table.grid thead ','') + ' يعود ساكنًا', css.has(sel, /position\s*:\s*static/));
  });

  /* ٤ — فخّ ارتفاع السطر: بكسل في الصفّ = ٣٠ بكسلًا في شعبةٍ من ثلاثين،
     وهي وحدها دفعت الكشف إلى صفحة ثانية. */
  t.head('وزن الصفّ على الورق');
  t.ok('الطباعة تُعيد ارتفاع السطر إلى normal', css.has('td.name-c .name-text', /line-height\s*:\s*normal/));
  t.ok('وتُلغي حشو الاسم (٤ بكسل × ٣٠ طالبًا)', css.has('td.name-c .name-wrap', /padding\s*:\s*0\b/));
  t.ok('والشاشة تحتفظ بالحشو للإصبع', css.has('td.name-c .name-wrap', /padding\s*:\s*4px/));
  t.ok('وعمود الاسم ١٣٪ على الورق', css.has('col.col-name', /width\s*:\s*13%/));
  t.ok('وأعمدة البنود ٥٧٫٥٪ (المجموع كما كان)', css.has('col.col-data', /57\.5%/));

  /* ٥ — زرّ يمحو عمل المعلّم يجب ألّا يبدو كزرّ التأكيد. */
  t.head('أزرار النوافذ');
  t.ok('زرّ الإلغاء بمظهر ثانوي', css.has('.warn-modal button.btn-cancel', /background\s*:\s*#fff/));
  t.ok('وزرّ المحو بمظهر تحذيري', css.has('.warn-modal button.btn-danger', /color\s*:\s*#b91c1c/));
  t.ok('و«اعتمد نسخة الجهاز الآخر» يستعمله', /class="btn-danger" id="cf-take-remote"/.test(h));
  t.ok('ونصّه يقول ما يفعل', /يمحو ما هنا/.test(h));

  /* ٦ — عنصر يُخفى بـ hidden وله display في الورقة: التنسيق يغلب
     المتصفّح فيبقى ظاهرًا. وقع هذا ثلاث مرات. */
  t.head('كل ما يُخفى بـ hidden محروس');
  const toggled = [...h.matchAll(/class="([a-z0-9\- ]*?)"[^>]*\shidden\b/g)]
    .flatMap(m=> m[1].split(' ')).filter(Boolean);
  const uniq = [...new Set(toggled)];
  uniq.forEach(cls=>{
    const hasDisplay = css.has('.'+cls, /display\s*:/);
    if(!hasDisplay){ t.ok('.'+cls+' بلا display فلا يحتاج حارسًا', true); return; }
    t.ok('.'+cls+' له حارس [hidden]', css.has('.'+cls+'[hidden]', /display\s*:\s*none/),
         'يبقى ظاهرًا رغم hidden');
  });

  /* ٧ — تمرير الجدول يُسترجع في المحورين. بلا العمودي يقفز المعلّم إلى
     أول الكشف بعد كل خانة يرصدها. */
  /* كان هنا فحصان يقرآن نصّ restoreTableScrolls بحثًا عن scrollLeft و
     scrollTop. وجود الكلمة في الشيفرة لا يعني أن الموضع يُستعاد فعلًا،
     وقد مرّا بينما كان المعلّم يقفز حقًّا. القياس الحقيقي في t-scroll.js. */

  return t.done();
};
