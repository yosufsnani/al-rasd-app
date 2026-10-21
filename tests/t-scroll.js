/* ===== لا قفزات بعد إدخال أي قيمة =====
   كل رصدة تُعيد بناء الشاشة كلها (main.innerHTML)، وإطار الكشف صار
   مُمرِّرًا داخل مُمرِّر منذ تثبيت الترويسة. فإن ضاع موضع الإطار عاد
   المعلّم إلى أول الكشف بعد كل خانة — وهو يرصد ثلاثين طالبًا.

   الفحص يضع المُمرِّر في موضع معلوم، ينفّذ الإدخال، ثم يتأكّد أن الموضع
   لم يتحرّك. والمُمرِّر ليس واحدًا في كل العروض: في الجدول هو إطار الكشف،
   وفي البطاقات والسريع والحضور هو الصفحة نفسها — فيُقاس كلٌّ بما يُمرَّر
   به فعلًا.

   ويُضاف إليه ما يفعله المتصفّح من تلقاء نفسه: «مرِّر العنصر إلى الرؤية»
   عند التركيز أو فتح لوحة المفاتيح، وتصفير الإطار أثناء فتح نافذة. */

const path = require('path');
const { suite, APP } = require('./harness.js');

const NAMES = [];
for(let i = 1; i <= 40; i++) NAMES.push('طالب رقم ' + i + ' عبدالله الجهني');

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
  attSettings().enabled  = true;
  attDays(k).push(new Date().toISOString().slice(0,10));   // شاشة الحضور تحتاج يومًا مسجَّلًا
  STATE.activeView = 'rasd'; STATE.activeTab = k; STATE.rosterView = 'table';
  STATE.quickItem = { k:CAT_KEYS[0], gi:0 };
  render();
};

/* نطاق البحث عن عنصرٍ مرئيّ: الشاشة كلها تحت الترويسة. */
const VIS = '(r.top > 120 && r.top < 760)';

module.exports = async function run(){
  const t = suite('لا قفزات بعد الإدخال');
  const pw = findPlaywright();
  if(!pw){
    t.skip('كل فحوص القفزات', 'Playwright غير مثبّت — ثبّته بـ npm i -D playwright');
    return t.done();
  }
  let browser;
  try{
    browser = await pw.chromium.launch({
      executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
    });
  }catch(e){
    try{ browser = await pw.chromium.launch(); }
    catch(e2){ t.skip('كل فحوص القفزات', 'تعذّر تشغيل المتصفّح: ' + e2.message.split('\n')[0]); return t.done(); }
  }
  const ctx = await browser.newContext({ viewport:{ width:430, height:860 },
                                         isMobile:true, hasTouch:true, deviceScaleFactor:3 });
  const p = await ctx.newPage();
  await p.goto('file://' + APP);
  await p.waitForFunction(()=> typeof freshState === 'function', null, { timeout:15000 });
  await p.evaluate(SEED, NAMES);
  await p.waitForTimeout(250);

  const WRAP = 700;
  /* في الجدول المُمرِّر هو الإطار والصفحة ساكنة قرب أعلاها؛ أما في العروض
     التي تُمرَّر بالصفحة فأول صفٍّ فيها يقع تحت الشريطين، فلا بدّ من نزولٍ
     أبعد حتى يصير في الشاشة أصلًا. */
  /* يُمرَّر الإطار كما يُمرّره المعلّم: سحبٌ بالإصبع ثم تمرير — فالتطبيق
     يميّز سحب المعلّم من تمرير المتصفّح، والفحص يجب أن يضعه في الحالة
     الأولى لا أن يلتفّ عليها. */
  const place = (v)=> p.evaluate(({w,v})=>{
    const el = document.querySelector('.grid-wrap');
    if(el && el.clientHeight > 0){
      el.dispatchEvent(new TouchEvent('touchmove', { bubbles:true, cancelable:true }));
      el.scrollTop = w;
    }
    window.scrollTo(0, v);
  }, { w:WRAP, v });
  /* تُقرأ القيمة بعد إطارين لأن المتصفّح يُسوّي التمرير عند حدود الإطار
     لا فورًا. و live تقول أيُمرَّر الإطار فعلًا أم أن الصفحة هي المُمرِّر. */
  const read = ()=> p.evaluate(()=> new Promise(res=> requestAnimationFrame(()=> requestAnimationFrame(()=>{
    const el = document.querySelector('.grid-wrap');
    const live = !!(el && el.clientHeight > 0 && el.scrollHeight > el.clientHeight + 4);
    res({ wrap: el ? Math.round(el.scrollTop) : -1, win: Math.round(window.scrollY), live });
  }))));

  async function after(action, win){
    const v = win === undefined ? 150 : win;
    await place(v);
    await p.waitForTimeout(120);
    const start = await read();
    const ok = await p.evaluate(action);
    await p.waitForTimeout(350);
    return { pos: await read(), start, ok, win:v };
  }
  /* يُقاس المُمرِّر الفعلي: الإطار إن كان يُمرَّر، وإلا الصفحة. */
  const steady = (r, label)=>{
    if(r.ok === false){ t.skip(label, 'لم يُعثر على العنصر'); return; }
    const inner = r.start.live;
    const got  = inner ? r.pos.wrap : r.pos.win;
    const want = inner ? WRAP : r.start.win;
    t.ok(label, Math.abs(got - want) <= 2,
         (inner ? 'الإطار ' : 'الصفحة ') + got + ' (المنتظر ' + want + ')');
  };

  /* ١ — جدول الرصد: الرموز، والدرجة، ومسحها، والاسم. */
  t.head('جدول الرصد');
  steady(await after(()=>{
    const c = [...document.querySelectorAll('td.cell[data-key]')].find(e=>{
      const r = e.getBoundingClientRect(); return r.top > 0 && r.top < 850; });
    if(!c) return false;
    c.click();
    const opt = document.querySelector('.sym-menu .sym-opt:nth-child(3)');
    if(!opt) return false;
    opt.click(); return true;
  }), 'رصد خانة بقائمة الرموز');

  steady(await after(()=>{
    const c = [...document.querySelectorAll('td.exam-c')].find(e=>{
      const r = e.getBoundingClientRect(); return r.top > 0 && r.top < 850; });
    if(!c) return false;
    c.click();
    const inp = document.getElementById('exam-val');
    if(!inp) return false;
    inp.value = '17';
    document.getElementById('exam-save').click(); return true;
  }), 'إدخال درجة اختبار');

  steady(await after(()=>{
    const c = [...document.querySelectorAll('td.exam-c')].find(e=>{
      const r = e.getBoundingClientRect(); return r.top > 0 && r.top < 850; });
    if(!c) return false;
    c.click();
    const b = document.getElementById('exam-clear');
    if(!b) return false;
    b.click(); return true;
  }), 'مسح درجة اختبار');

  steady(await after(()=>{
    const a = [...document.querySelectorAll('.name-arrow')].find(e=>{
      const r = e.getBoundingClientRect(); return r.top > 0 && r.top < 850; });
    if(!a) return false;
    a.click();
    const opt = document.querySelector('.sym-menu [data-act="rename"]');
    if(!opt) return false;
    opt.click();
    const inp = document.querySelector('#dialog-holder input');
    if(!inp) return false;
    inp.value = 'اسمٌ جديد للطالب';
    const save = [...document.querySelectorAll('#dialog-holder button')].find(b=> /حفظ|اعتمد|تم/.test(b.textContent));
    if(!save) return false;
    save.click(); return true;
  }), 'تعديل اسم طالب');

  /* ٢ — بقيّة طرق العرض. */
  t.head('بقيّة طرق العرض');
  for(const [mode, label, act] of [
    ['cards', 'بطاقات: رصد خانة', ()=>{
      const card = [...document.querySelectorAll('.stu-top')].find(e=>{
        const r = e.getBoundingClientRect(); return r.top > 0 && r.top < 850; });
      if(!card) return false;
      card.click();
      const c = document.querySelector('.stu-card.open .cg-cell');
      if(!c) return false;
      c.click();
      const opt = document.querySelector('.sym-menu .sym-opt:nth-child(3)');
      if(opt) opt.click();
      return true;
    }],
    ['quick', 'سريع: رصد طالب', ()=>{
      const b = [...document.querySelectorAll('[data-quick-set]')].find(e=>{
        const r = e.getBoundingClientRect(); return r.top > 0 && r.top < 850; });
      if(!b) return false;
      b.click(); return true;
    }],
    ['attendance', 'الحضور: تغيير حالة', ()=>{
      const b = [...document.querySelectorAll('[data-att-set]')].find(e=>{
        const r = e.getBoundingClientRect(); return r.top > 0 && r.top < 850; });
      if(!b) return false;
      b.click(); return true;
    }]
  ]){
    await p.evaluate((m)=>{ STATE.rosterView = m; render(); }, mode);
    await p.waitForTimeout(250);
    steady(await after(act, 900), label);
  }
  await p.evaluate(()=>{ STATE.rosterView = 'table'; render(); });
  await p.waitForTimeout(200);

  /* ٣ — ما يفعله المتصفّح من تلقاء نفسه.
     «مرِّر العنصر إلى الرؤية» داخل مُمرِّرين متداخلين يُصفّر الداخلي ويُمرّر
     الصفحة بدلًا منه — وهذا بعينه ما يراه المعلّم: الكشف يقفز إلى أوّله.
     يستدعيه المتصفّح عند التركيز على حقل وعند فتح لوحة مفاتيح الجوال. */
  t.head('أخطار المتصفّح نفسه');
  /* التمرير هنا يأتي بعد أن يهدأ إصبع المعلّم، كما يأتي في الواقع: يرصد
     خانةً، ثم يطلب المتصفّح بعد حينٍ أن يُظهر عنصرًا. */
  const siv = await after(async ()=>{
    await new Promise(r=> setTimeout(r, 1700));
    const c = [...document.querySelectorAll('td.cell[data-key]')].find(e=>{
      const r = e.getBoundingClientRect(); return r.top > 0 && r.top < 850; });
    if(!c) return false;
    c.scrollIntoView({ block:'center' });
    return true;
  });
  t.ok('«مرِّر إلى الرؤية» لا يُصفّر الإطار', siv.pos.wrap > WRAP - 200,
       'الإطار ' + siv.pos.wrap + ' بعد أن كان ' + WRAP);

  steady(await after(()=>{
    const c = [...document.querySelectorAll('td.exam-c')].find(e=>{
      const r = e.getBoundingClientRect(); return r.top > 0 && r.top < 850; });
    if(!c) return false;
    c.click();
    /* ما تفعله لوحة المفاتيح حين تفتح فوق نافذةٍ مفتوحة. */
    const w = document.querySelector('.grid-wrap');
    if(w) w.scrollTop = 0;
    document.getElementById('exam-val').value = '12';
    document.getElementById('exam-save').click();
    return true;
  }), 'تصفير الإطار أثناء النافذة يُستدرك عند إغلاقها');

  /* التخطيط لا يكتمل دائمًا لحظة إسناد scrollTop بعد innerHTML، فتقصّه
     المتصفّحات إلى ما تعرفه من ارتفاع — ومن هنا تكون القفزة متقطّعة. */
  steady(await after(()=>{
    render();
    const w = document.querySelector('.grid-wrap');
    if(!w) return false;
    w.scrollTop = 0;   // كأنّ الاستعادة قُصَّت لتخطيطٍ لم يكتمل
    return true;
  }), 'واستعادة الموضع تُعاد بعد اكتمال التخطيط');

  /* لمسة الرصد ليست سحبًا. وهذا هو جوهر التمييز: المعلّم يلمس الخانة،
     ثم تفتح لوحة المفاتيح بعد جزءٍ من الثانية فتُمرّر من تلقائها. لو عُدَّت
     اللمسة إذنًا لمرّ عبث المتصفّح باسم المعلّم. */
  const tapThen = await p.evaluate(()=> new Promise(res=>{
    const w = document.querySelector('.grid-wrap');
    w.dispatchEvent(new TouchEvent('touchmove', { bubbles:true }));
    w.scrollTop = 700;
    setTimeout(()=>{                      // هدأ الإصبع
      const c = [...document.querySelectorAll('td.cell[data-key]')][20];
      c.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true }));
      c.dispatchEvent(new TouchEvent('touchstart', { bubbles:true }));
      setTimeout(()=>{                    // لوحة المفاتيح تُمرّر بعد اللمسة
        w.scrollTop = 0;
        setTimeout(()=> res({ y:Math.round(w.scrollTop) }), 320);
      }, 150);
    }, 1700);
  }));
  t.ok('لمسة الخانة لا تُعدّ إذنًا بتمرير المتصفّح',
       Math.abs(tapThen.y - 700) <= 2, 'الإطار ' + tapThen.y);

  /* ولوحة المفاتيح تُغلق بعد النافذة لا معها، فتُمرّر مرّةً أخيرة والجسد
     قد تحرّر — وهذه هي التي يلتقطها حفظ النافذة لا المراقب. */
  const afterKbd = await p.evaluate(()=> new Promise(res=>{
    const w = document.querySelector('.grid-wrap');
    w.dispatchEvent(new TouchEvent('touchmove', { bubbles:true }));
    w.scrollTop = 700;
    setTimeout(()=>{
      const c = [...document.querySelectorAll('td.exam-c')][10];
      c.click();
      setTimeout(()=>{
        document.getElementById('exam-val').value = '9';
        document.getElementById('exam-save').click();
        setTimeout(()=>{ w.scrollTop = 0; }, 60);   // إغلاق لوحة المفاتيح
        setTimeout(()=> res({ y:Math.round(document.querySelector('.grid-wrap').scrollTop) }), 600);
      }, 1700);
    }, 60);
  }));
  t.ok('وتمريرها بعد إغلاق النافذة يُستدرك',
       Math.abs(afterKbd.y - 700) <= 2, 'الإطار ' + afterKbd.y);

  /* ٣٫٥ — والحارس لا يمنع المعلّم: تمريرةٌ ثانية إلى موضعٍ آخر تثبت. */
  t.head('تمرير المعلّم يبقى حرًّا');
  const free = await p.evaluate(()=> new Promise(res=>{
    const w = document.querySelector('.grid-wrap');
    const go = (y)=>{ w.dispatchEvent(new TouchEvent('touchmove', { bubbles:true })); w.scrollTop = y; };
    go(300);
    setTimeout(()=>{ go(1100); setTimeout(()=> res({ y:Math.round(w.scrollTop) }), 500); }, 400);
  }));
  t.ok('التمرير إلى موضعٍ جديد يثبت ولا يُردّ', Math.abs(free.y - 1100) <= 2, 'الإطار ' + free.y);

  /* وبتمريرٍ يصنعه المتصفّح نفسه لا الفحص: عجلةٌ فوق الإطار. هذا أوثق ما
     يُطمئن أن الحارس لا يخنق المعلّم — فالحدث هنا حقيقي من أوّله. */
  await p.evaluate(()=>{ const w = document.querySelector('.grid-wrap');
    w.scrollTop = 0;
    window.scrollTo(0, window.scrollY + w.getBoundingClientRect().top - 90); });
  await p.waitForTimeout(300);
  const spot = await p.evaluate(()=>{ const r = document.querySelector('.grid-wrap').getBoundingClientRect();
    return { x:Math.round(r.x + r.width/2), y:Math.round(r.y + Math.min(r.height, 760) * 0.4) }; });
  await p.mouse.move(spot.x, spot.y);
  for(let i = 0; i < 6; i++){ await p.mouse.wheel(0, 120); await p.waitForTimeout(40); }
  await p.waitForTimeout(600);
  const wheeled = await p.evaluate(()=> Math.round(document.querySelector('.grid-wrap').scrollTop));
  t.ok('عجلة حقيقية تُمرّر الإطار', wheeled > 100, 'الإطار ' + wheeled);
  const marked = await p.evaluate(()=>{
    const c = [...document.querySelectorAll('td.cell[data-key]')].find(e=>{
      const r = e.getBoundingClientRect(); return r.top > 300 && r.top < 600; });
    if(!c) return false;
    c.click();
    const o = document.querySelector('.sym-menu .sym-opt:nth-child(3)');
    if(o) o.click();
    return true;
  });
  await p.waitForTimeout(500);
  const held = await p.evaluate(()=> Math.round(document.querySelector('.grid-wrap').scrollTop));
  if(!marked) t.skip('والرصد بعدها لا يُحرّكه', 'لم يُعثر على خانة');
  else t.ok('والرصد بعدها لا يُحرّكه', Math.abs(held - wheeled) <= 2,
            'الإطار ' + held + ' بعد أن كان ' + wheeled);

  /* ٤ — تبويب المتابعة: الصفحة هي المُمرِّر هناك. */
  t.head('تبويب المتابعة');
  await p.evaluate(()=>{
    const k = SECTION_KEYS[0];
    /* من يحتاج متابعة حتى تمتلئ الشاشة بما يُدخل فيه. */
    for(let i = 0; i < 6; i++) for(let g = 0; g < 8; g++) STATE.sections[k][i].p[g] = '❌';
    STATE.activeView = 'archive'; render();
  });
  await p.waitForTimeout(300);
  const r = await p.evaluate(()=> new Promise(res=>{
    if(document.body.scrollHeight <= window.innerHeight + 40) return res({ skip:'الصفحة أقصر من الشاشة' });
    window.scrollTo(0, 260);
    requestAnimationFrame(()=>{
      const btn = [...document.querySelectorAll('#main button')].find(b=> /تسجيل تواصل/.test(b.textContent));
      if(!btn) return res({ skip:'لا عناصر إدخال في هذا التبويب' });
      btn.click();
      requestAnimationFrame(()=>{
        const save = [...document.querySelectorAll('#dialog-holder button')]
          .find(b=> /حفظ|تم|اعتمد/.test(b.textContent));
        if(!save) return res({ skip:'لم تُفتح نافذة التواصل' });
        save.click();
        setTimeout(()=> res({ win:Math.round(window.scrollY) }), 400);
      });
    });
  }));
  if(r.skip) t.skip('تغيير قيمة في المتابعة', r.skip);
  else t.ok('تسجيل تواصل لا يُرجع الصفحة لأعلى',
            Math.abs(r.win - 260) <= 2, 'الصفحة ' + r.win + ' (المنتظر 260)');

  await ctx.close();
  await browser.close();
  return t.done();
};
