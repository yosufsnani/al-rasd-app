/* ===== بيئة تشغيل التطبيق خارج المتصفّح =====
   تقرأ index.html، تستخرج كتل <script>، وتُشغّلها في سياق Node معزول مع
   بدائل مبسّطة لما يوفّره المتصفّح. الغرض اختبار المنطق وحده — الحفظ
   والمزامنة والحسابات وبناء الترميز — لا ما يحتاج تخطيطًا حقيقيًا
   (ارتفاعات، التصاق، صفحات الطباعة)؛ ذاك في t-layout.js بمتصفّح فعلي.

   الكتلة الأولى تُنشئ عميل Supabase من مكتبةٍ خارجية غير موجودة هنا،
   فتفشل — وهذا متوقّع ولا يمنع بقيّة التطبيق من العمل. */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const APP = path.join(__dirname, '..', 'index.html');

function el(id){
  const e = {
    id: id || '', innerHTML:'', outerHTML:'', value:'', src:'', checked:false, disabled:false,
    textContent:'', hidden:true, width:600, height:180,
    style:{ setProperty(){}, removeProperty(){} },
    dataset:{}, children:[], files:[],
    classList:{ add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    addEventListener(){}, removeEventListener(){}, dispatchEvent(){},
    appendChild(){}, removeChild(){}, remove(){}, insertBefore(){},
    setAttribute(){}, removeAttribute(){}, getAttribute(){ return null; },
    hasAttribute(){ return false; },
    focus(){}, blur(){}, click(){}, select(){}, scrollIntoView(){},
    insertAdjacentHTML(){}, closest(){ return null; },
    querySelector(){ return null; }, querySelectorAll(){ return []; },
    getBoundingClientRect(){ return { top:0,left:0,right:0,bottom:0,width:0,height:0 }; },
    toDataURL(){ return 'data:image/png;base64,AA'; },
    getContext(){
      return { lineWidth:0, lineCap:'', strokeStyle:'', fillStyle:'', font:'',
        beginPath(){}, closePath(){}, moveTo(){}, lineTo(){}, stroke(){}, fill(){},
        clearRect(){}, fillRect(){}, scale(){}, save(){}, restore(){}, translate(){},
        rotate(){}, arc(){}, quadraticCurveTo(){}, drawImage(){}, fillText(){},
        measureText(){ return { width:0 }; },
        getImageData(){ return { data:new Uint8ClampedArray(4) }; } };
    }
  };
  return e;
}

function makeSandbox(){
  const store = {};
  const listeners = {};

  const document = {
    readyState:'complete',
    body: el('body'),
    documentElement: el('html'),
    getElementById(){ return el(); },
    querySelector(){ return null; },
    querySelectorAll(){ return []; },
    createElement(){ return el(); },
    createTextNode(){ return el(); },
    addEventListener(ev, fn){ (listeners[ev] = listeners[ev] || []).push(fn); },
    removeEventListener(){},
    execCommand(){ return true; }
  };

  const sandbox = {
    console,
    document,
    setTimeout, clearTimeout, setInterval, clearInterval,
    queueMicrotask, Promise, Date, Math, JSON, Object, Array, String, Number,
    Boolean, RegExp, Error, Map, Set, WeakMap, WeakSet, Intl, parseInt, parseFloat,
    isNaN, isFinite, encodeURIComponent, decodeURIComponent, Uint8Array,
    Uint8ClampedArray, ArrayBuffer, TextEncoder, TextDecoder, URL, Blob: function(){},
    FileReader: function(){ this.readAsDataURL = function(){}; this.readAsText = function(){}; },
    MutationObserver: function(){ this.observe = function(){}; this.disconnect = function(){}; this.takeRecords = function(){ return []; }; },
    ResizeObserver: function(){ this.observe = function(){}; this.disconnect = function(){}; this.unobserve = function(){}; },
    IntersectionObserver: function(){ this.observe = function(){}; this.disconnect = function(){}; this.unobserve = function(){}; },
    requestAnimationFrame(fn){ return setTimeout(()=> fn(Date.now()), 0); },
    cancelAnimationFrame: clearTimeout,
    navigator: { onLine:true, userAgent:'node', clipboard:{ writeText(){ return Promise.resolve(); } } },
    location: { href:'file:///index.html', hash:'', search:'', reload(){} },
    localStorage: {
      getItem(k){ return Object.prototype.hasOwnProperty.call(store,k) ? store[k] : null; },
      setItem(k,v){ store[k] = String(v); },
      removeItem(k){ delete store[k]; },
      clear(){ Object.keys(store).forEach(k=> delete store[k]); },
      get length(){ return Object.keys(store).length; },
      key(i){ return Object.keys(store)[i] ?? null; }
    },
    matchMedia(){ return { matches:false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} }; },
    getComputedStyle(){ return { getPropertyValue(){ return ''; } }; },
    addEventListener(ev, fn){ (listeners[ev] = listeners[ev] || []).push(fn); },
    removeEventListener(){},
    scrollTo(){}, scrollY:0, innerWidth:430, innerHeight:860, devicePixelRatio:2,
    history: {
      _stack: [],
      pushState(st){ this._stack.push(st); },
      replaceState(st){ this._stack[this._stack.length-1] = st; },
      back(){ this._stack.pop(); sandbox.__fire('popstate', { state:null }); },
      get length(){ return this._stack.length; }
    },
    alert(){}, confirm(){ return true; }, prompt(){ return null; },
    print(){},
    /* أدوات الاختبار نفسه */
    __store: store,
    __fire(ev, e){ (listeners[ev] || []).forEach(fn=> fn(e || {})); },
    __listeners: listeners,
    __errors: []
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  return sandbox;
}

/* يُنشئ سياقًا جديدًا ويُحمّل فيه التطبيق. */
function load(){
  const html = fs.readFileSync(APP, 'utf8');
  const blocks = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map(m=> m[1]);
  const sandbox = makeSandbox();
  sandbox.__html = html;
  vm.createContext(sandbox);
  blocks.forEach((code, i)=>{
    try{ vm.runInContext(code, sandbox, { filename:'block'+(i+1)+'.js' }); }
    catch(e){ sandbox.__errors.push({ block:i+1, message:e.message }); }
  });
  return sandbox;
}

/* عدّاد نتائج مشترك بين كل الملفات. */
function suite(name){
  let pass = 0, fail = 0;
  const lines = [];
  return {
    head(t){ lines.push('  ── ' + t); },
    ok(label, cond, extra){
      if(cond){ pass++; lines.push('  ✓ ' + label); }
      else { fail++; lines.push('  ✗ ' + label + (extra ? ' — ' + extra : '')); }
      return !!cond;
    },
    skip(label, why){ lines.push('  ◌ ' + label + (why ? ' — ' + why : '')); },
    done(){
      console.log('【 ' + name + ' 】');
      lines.forEach(l=> console.log(l));
      console.log('');
      return { name, pass, fail };
    }
  };
}

/* قواعد CSS من الملف، للتحقّق مما لا يظهر إلا في الورقة. */
function cssRules(){
  const html = fs.readFileSync(APP, 'utf8');
  const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
    .map(m=> m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [...css.matchAll(/([^{}]*)\{([^{}]*)\}/g)]
    .map(m=> ({ sels: m[1].split(',').map(s=> s.trim().replace(/\s+/g,' ')), body: m[2] }));
  return {
    css,
    /* كل التعريفات لهذا المحدِّد، لا آخرها: المحدِّد نفسه قد يتكرّر في
       كتلة الطباعة بقيمٍ مضادّة، فأخذ الأخير وحده يضلّل. */
    all(sel){
      const want = sel.replace(/\s+/g,' ').trim();
      return rules.filter(r=> r.sels.includes(want)).map(r=> r.body);
    },
    has(sel, re){ return this.all(sel).some(b=> re.test(b)); }
  };
}

function appHtml(){ return fs.readFileSync(APP, 'utf8'); }

module.exports = { load, suite, cssRules, appHtml, el, APP };
