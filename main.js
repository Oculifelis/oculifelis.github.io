(() => {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isDesktop = () => innerWidth >= 900;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);

  root.classList.add('js');

  /* ---------- small things that need no library ---------- */

  // cover details draw in when a card is on screen
  const cards = $$('.card');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => {
      es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.3 });
    cards.forEach(c => io.observe(c));
  } else {
    cards.forEach(c => c.classList.add('in'));
  }

  let lenis = null;
  const refresh = () => { if (hasGsap) ScrollTrigger.refresh(); };

  // mobile menu
  const menu = $('#menu');
  const toggle = $('.nav__toggle');
  const setMenu = open => {
    menu.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (open) menu.removeAttribute('inert'); else menu.setAttribute('inert', '');
    if (lenis) { if (open) lenis.stop(); else lenis.start(); }
    body.style.overflow = open ? 'hidden' : '';
  };
  toggle.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
  addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('is-open')) setMenu(false); });
  addEventListener('resize', () => { if (isDesktop() && menu.classList.contains('is-open')) setMenu(false); });

  // in-page links
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      if (a.hasAttribute('data-void')) return;
      const id = a.getAttribute('href');
      const target = id === '#top' || id === '#' ? null : $(id);
      if (menu.classList.contains('is-open')) setMenu(false);
      if (lenis) lenis.scrollTo(target || 0, { duration: 1.5 });
      else if (target) target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
      else scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  /* ---------- text splitting ---------- */

  const splitChars = el => {
    const text = el.textContent;
    el.textContent = '';
    return Array.from(text).map(ch => {
      const s = document.createElement('span');
      s.className = 'ch';
      s.textContent = ch === ' ' ? ' ' : ch;
      el.appendChild(s);
      return s;
    });
  };

  const splitWords = el => {
    const out = [];
    const walk = node => {
      Array.from(node.childNodes).forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const s = document.createElement('span');
            s.className = 'w';
            s.textContent = part;
            frag.appendChild(s);
            out.push(s);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) {
          walk(n);
        }
      });
    };
    walk(el);
    return out;
  };

  const wrapRise = el => {
    const mask = document.createElement('span');
    const inner = document.createElement('span');
    mask.className = 'rise';
    inner.className = 'rise__in';
    while (el.firstChild) inner.appendChild(el.firstChild);
    mask.appendChild(inner);
    el.appendChild(mask);
    return inner;
  };

  /* ---------- no animation library: show the page as it is ---------- */

  const loader = $('.loader');
  const showNow = () => {
    if (loader) loader.remove();
    body.classList.remove('is-loading');
  };
  if (!hasGsap) { showNow(); return; }

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ---------- WebGL form behind the page ---------- */

  const NOISE = `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);
  const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;
  vec4 s1=floor(b1)*2.+1.;
  vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
  m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

  const VERT = `
uniform float uTime;
uniform float uAmp;
uniform float uFreq;
uniform float uHover;
varying vec3 vN;
varying vec3 vV;
varying vec3 vP;
varying float vD;
${NOISE}
vec3 disp(vec3 p){
  float t=uTime*.22;
  float n=snoise(p*uFreq+vec3(t,t*.7,-t*.5));
  float n2=snoise(p*uFreq*2.2+vec3(-t*1.3,t,t*.6));
  return p*(1.+(n*.84+n2*.16*(1.+uHover*2.))*uAmp*(1.+uHover*.6));
}
void main(){
  vec3 p0=normalize(position);
  vec3 up=abs(p0.y)<.99?vec3(0.,1.,0.):vec3(1.,0.,0.);
  vec3 t=normalize(cross(up,p0));
  vec3 b=cross(p0,t);
  float e=.012;
  vec3 p=disp(p0);
  vec3 pa=disp(normalize(p0+t*e));
  vec3 pb=disp(normalize(p0+b*e));
  vec3 n=normalize(cross(pa-p,pb-p));
  if(dot(n,p0)<0.) n=-n;
  vec4 mv=modelViewMatrix*vec4(p,1.);
  vN=normalize(normalMatrix*n);
  vV=-mv.xyz;
  vD=length(p)-1.;
  vP=p;
  gl_Position=projectionMatrix*mv;
}`;

  const FRAG = `
precision highp float;
uniform vec3 uA;
uniform vec3 uB;
uniform vec3 uC;
uniform float uTime;
uniform float uGloss;
varying vec3 vN;
varying vec3 vV;
varying vec3 vP;
varying float vD;
void main(){
  vec3 n=normalize(vN);
  vec3 v=normalize(vV);
  vec3 l=normalize(vec3(.5,.8,.6));
  float fres=pow(1.-clamp(dot(n,v),0.,1.),2.4);
  float band=smoothstep(-.7,.8,n.y*.85+vD*1.3+sin(vP.x*1.6+uTime*.3)*.18);
  vec3 col=mix(uB,uA,band);
  col=mix(col,uC,fres*.9);
  col*=mix(.72,1.12,dot(n,l)*.5+.5);
  vec3 h=normalize(l+v);
  col+=pow(max(dot(n,h),0.),48.)*uGloss;
  gl_FragColor=vec4(col,1.);
}`;

  const PALETTES = {
    vivid: ['#cb4b16', '#d33682', '#b58900'],
    pearl: ['#104d66', '#0f5a5c', '#1b6f8f'],
    night: ['#cb4b16', '#6c71c4', '#b58900']
  };

  // x and y are fractions of half the viewport, s is the radius as a fraction of the short half-side
  const STATES = {
    hero:     { d: { x: 0.1, y: -0.03, s: 0.74 },  m: { x: 0.18, y: 0.1, s: 0.8 },    p: 'vivid', amp: 0.27 },
    work:     { d: { x: 0, y: 0, s: 0 },           m: { x: 0, y: 0, s: 0 },           p: 'night', amp: 0.3 },
    about:    { d: { x: 0.94, y: 0.12, s: 0.95 },  m: { x: 1.0, y: -0.35, s: 0.9 },   p: 'pearl', amp: 0.24 },
    praise:   { d: { x: 0.96, y: 0.4, s: 0.75 },   m: { x: 1.0, y: 0.5, s: 0.85 },    p: 'pearl', amp: 0.24 },
    contact:  { d: { x: 0.42, y: 0.2, s: 0.6 },   m: { x: 0.55, y: 0.34, s: 0.5 },   p: 'night', amp: 0.34 }
  };

  const initGL = () => {
    const canvas = $('#gl');
    if (!window.THREE || !canvas) return null;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    } catch (e) { return null; }

    const small = !isDesktop();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    cam.position.z = 6;
    const halfTan = Math.tan(THREE.MathUtils.degToRad(35 / 2)) * 6;
    let halfW = 1, halfH = 1;

    const uniforms = {
      uTime: { value: 0 }, uAmp: { value: 0.3 }, uFreq: { value: 0.82 }, uHover: { value: 0 }, uGloss: { value: 0.35 },
      uA: { value: new THREE.Color(PALETTES.vivid[0]) },
      uB: { value: new THREE.Color(PALETTES.vivid[1]) },
      uC: { value: new THREE.Color(PALETTES.vivid[2]) }
    };
    const blob = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1, small ? 26 : 52),
      new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG })
    );

    const lineMat = new THREE.LineBasicMaterial({ color: 0x93a1a1, transparent: true, opacity: 0.42 });
    const ring = r => {
      const pts = [];
      for (let i = 0; i < 160; i++) { const a = i / 160 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0)); }
      return new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), lineMat);
    };
    const ringA = ring(1.56);
    const ringB = ring(1.86);
    ringA.rotation.set(1.18, 0.35, 0);
    ringB.rotation.set(1.42, -0.5, 0);
    const sat = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 16), new THREE.MeshBasicMaterial({ color: 0xb58900 }));
    ringA.add(sat);

    const group = new THREE.Group();
    group.add(blob, ringA, ringB);
    scene.add(group);

    const st = { x: 0, y: 0, s: 0 };
    const ptr = { x: 0, y: 0, tx: 0, ty: 0, lx: 0, ly: 0, speed: 0 };
    let current = 'hero', entered = false, cleared = false;

    const size = () => {
      const w = canvas.clientWidth || innerWidth;
      const h = canvas.clientHeight || innerHeight;
      renderer.setSize(w, h, false);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
      halfH = halfTan;
      halfW = halfTan * cam.aspect;
    };
    size();
    let lastW = innerWidth;
    addEventListener('resize', () => {
      size();
      if ((lastW >= 900) !== (innerWidth >= 900) && entered) go(current, root.classList.contains('dark'), true);
      lastW = innerWidth;
    });

    if (fine) {
      addEventListener('pointermove', e => {
        ptr.tx = e.clientX / innerWidth * 2 - 1;
        ptr.ty = e.clientY / innerHeight * 2 - 1;
        const dx = e.clientX - ptr.lx, dy = e.clientY - ptr.ly;
        ptr.lx = e.clientX; ptr.ly = e.clientY;
        ptr.speed = Math.min(1, ptr.speed + Math.hypot(dx, dy) / 900);
      }, { passive: true });
    }

    function go(name, dark, force) {
      const cfg = STATES[name] || STATES.hero;
      if (name === current && !force && entered) return;
      current = name;
      const t = isDesktop() ? cfg.d : cfg.m;
      const pal = PALETTES[cfg.p];
      const tint = new THREE.Color(dark ? '#eee8d5' : '#93a1a1');
      gsap.to(lineMat.color, { r: tint.r, g: tint.g, b: tint.b, duration: 0.9, overwrite: true });
      if (!entered) return;
      // a hidden form jumps to its next spot before it grows back
      if (st.s < 0.02 && t.s > 0) { st.x = t.x; st.y = t.y; }
      gsap.to(st, { x: t.x, y: t.y, s: t.s, duration: reduce ? 0.01 : 1.5, ease: 'expo.out', overwrite: true });
      gsap.to(uniforms.uAmp, { value: cfg.amp, duration: 1.2, overwrite: true });
      [uniforms.uA, uniforms.uB, uniforms.uC].forEach((u, i) => {
        const c = new THREE.Color(pal[i]);
        gsap.to(u.value, { r: c.r, g: c.g, b: c.b, duration: 1.1, overwrite: true });
      });
    }

    function enter() {
      entered = true;
      const cfg = STATES[current] || STATES.hero;
      const t = isDesktop() ? cfg.d : cfg.m;
      const pal = PALETTES[cfg.p];
      [uniforms.uA, uniforms.uB, uniforms.uC].forEach((u, i) => u.value.set(pal[i]));
      st.x = t.x; st.y = t.y; st.s = 0;
      gsap.to(st, { s: t.s, duration: reduce ? 0.01 : 2, ease: 'expo.out' });
    }

    gsap.ticker.add(time => {
      if (document.hidden) return;
      const k = st.s * Math.min(halfW, halfH);
      if (k < 0.004) {
        if (!cleared) { renderer.clear(); cleared = true; }
        return;
      }
      cleared = false;
      ptr.x += (ptr.tx - ptr.x) * 0.05;
      ptr.y += (ptr.ty - ptr.y) * 0.05;
      ptr.speed *= 0.95;
      uniforms.uHover.value += (ptr.speed - uniforms.uHover.value) * 0.08;
      uniforms.uTime.value = time * (reduce ? 0.2 : 1);

      group.position.set(st.x * halfW + ptr.x * 0.1, st.y * halfH - ptr.y * 0.1, 0);
      group.scale.setScalar(k);
      blob.rotation.y = time * 0.1 + window.scrollY * 0.0012 + ptr.x * 0.5;
      blob.rotation.x = ptr.y * 0.3;
      ringA.rotation.z = time * 0.12;
      ringB.rotation.z = -time * 0.08;
      const a = time * 0.5;
      sat.position.set(Math.cos(a) * 1.56, Math.sin(a) * 1.56, 0);
      renderer.render(scene, cam);
    });

    return { go, enter };
  };

  let gl = null;
  try { gl = initGL(); } catch (e) { gl = null; }

  /* ---------- smooth scroll ---------- */

  if (window.Lenis && !reduce) {
    try {
      lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, autoRaf: false });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
      lenis.stop();
    } catch (e) { lenis = null; }
  }

  /* ---------- which section is on screen: theme, nav, form ---------- */

  const secs = $$('[data-sec]');
  const navLinks = $$('.nav__links a');
  let cur = null;
  const track = () => {
    const line = innerHeight * 0.55;
    let active = secs[0];
    secs.forEach(s => {
      const zone = s.parentElement.classList.contains('pin-spacer') ? s.parentElement : s;
      if (zone.getBoundingClientRect().top <= line) active = s;
    });
    if (active === cur) return;
    cur = active;
    const dark = active.dataset.theme === 'dark';
    root.classList.toggle('dark', dark);
    if (gl) gl.go(active.dataset.sec, dark);
    navLinks.forEach(l => l.classList.toggle('is-active', l.getAttribute('href') === '#' + active.id));
  };
  const navEl = $('.nav');
  let lastY = scrollY;
  const navDir = () => {
    const y = scrollY;
    if (Math.abs(y - lastY) < 6) return;
    const away = y > lastY && y > innerHeight * 0.6 && !$('.menu').classList.contains('is-open');
    navEl.classList.toggle('is-away', away);
    lastY = y;
  };
  let queued = false;
  const queueTrack = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; track(); navDir(); });
  };
  addEventListener('scroll', queueTrack, { passive: true });
  addEventListener('resize', queueTrack);
  ScrollTrigger.addEventListener('refresh', queueTrack);

  /* ---------- scroll scenes ---------- */

  const heroChars = $$('.hero__title [data-split]').map(splitChars).flat();
  const rises = $$('[data-rise]').map(el => ({ el, inner: wrapRise(el) }));

  const mm = gsap.matchMedia();

  // work: pinned sideways gallery on wide screens
  mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
    root.classList.add('hscroll');
    const work = $('.work');
    const trackEl = $('.work__track');
    const bar = $('.work__progress i');
    const dist = () => Math.max(0, trackEl.scrollWidth - innerWidth);
    const tween = gsap.to(trackEl, {
      x: () => -dist(),
      ease: 'none',
      scrollTrigger: {
        trigger: work,
        start: 'top top',
        end: () => '+=' + dist(),
        pin: true,
        scrub: 0.6,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        refreshPriority: 1,
        onUpdate: self => { gsap.set(bar, { scaleX: self.progress }); }
      }
    });
    $$('.card__mock').forEach(m => {
      gsap.fromTo(m, { xPercent: -5 }, {
        xPercent: 5, ease: 'none',
        scrollTrigger: { trigger: m.closest('.card'), containerAnimation: tween, start: 'left right', end: 'right left', scrub: true }
      });
    });
    return () => {
      root.classList.remove('hscroll');
      gsap.set(trackEl, { clearProps: 'transform' });
      gsap.set($$('.card__mock'), { clearProps: 'transform' });
    };
  });

  if (!reduce) {
    // hero title drifts apart on the way out
    gsap.to('.hero__title .line:first-child .word', {
      xPercent: -9, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });
    gsap.to('.hero__title .line--r .word', {
      xPercent: 9, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });

    // marquee
    const mq = gsap.to('.marquee__inner', { xPercent: -50, duration: 30, ease: 'none', repeat: -1 });
    const settle = gsap.quickTo(mq, 'timeScale', { duration: 0.8, ease: 'power2.out' });
    ScrollTrigger.create({
      onUpdate: self => {
        const v = self.getVelocity();
        mq.timeScale(1 + Math.min(Math.abs(v) / 300, 6));
        settle(1);
      }
    });

    // stacked cards rise in on narrow screens
    mm.add('(max-width: 899px)', () => {
      cards.forEach(c => {
        gsap.from(c, { y: 50, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: c, start: 'top 88%', once: true } });
      });
    });

    // headings
    rises.forEach(({ el, inner }, i) => {
      const inContact = !!el.closest('.contact__title');
      gsap.from(inner, {
        yPercent: 112, duration: 1.3, ease: 'expo.out', delay: inContact ? i % 2 * 0.1 : 0,
        scrollTrigger: { trigger: el, start: 'top 90%', once: true }
      });
    });

    // about statement lights up word by word
    $$('[data-words]').forEach(el => {
      const words = splitWords(el);
      gsap.fromTo(words, { opacity: 0.14 }, {
        opacity: 1, ease: 'none', stagger: 0.1,
        scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 48%', scrub: true }
      });
    });

    // simple fade-ups
    $$('[data-reveal]').forEach(el => {
      gsap.from(el, { y: 44, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });
    gsap.from('.bigbtn', {
      scale: 0, duration: 1.2, ease: 'expo.out',
      scrollTrigger: { trigger: '.contact__mid', start: 'top 75%', once: true }
    });

    // numbers count up
    $$('[data-num]').forEach(el => {
      const raw = el.dataset.num;
      const end = parseFloat(raw);
      const dec = (raw.split('.')[1] || '').length;
      const o = { v: 0 };
      el.textContent = (0).toFixed(dec);
      gsap.to(o, {
        v: end, duration: 1.8, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 92%', once: true },
        onUpdate: () => { el.textContent = o.v.toFixed(dec); }
      });
    });
  }

  /* ---------- pointer: cursor and magnets ---------- */

  if (fine && !reduce) {
    const cursor = $('.cursor');
    const label = $('.cursor__label');
    root.classList.add('has-cursor');
    cursor.classList.add('is-hidden');
    addEventListener('pointermove', () => cursor.classList.remove('is-hidden'), { once: true, passive: true });
    gsap.set(cursor, { x: innerWidth / 2, y: innerHeight / 2 });
    const cx = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3.out' });
    const cy = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3.out' });
    addEventListener('pointermove', e => { cx(e.clientX); cy(e.clientY); }, { passive: true });
    document.addEventListener('pointerover', e => {
      const t = e.target.closest ? e.target.closest('[data-cursor-hide], [data-cursor], a, button') : null;
      const hide = !!t && t.hasAttribute('data-cursor-hide');
      const text = t && !hide ? t.getAttribute('data-cursor') : null;
      cursor.classList.toggle('is-hidden', hide);
      cursor.classList.toggle('is-label', !!text);
      cursor.classList.toggle('is-link', !!t && !hide && !text);
      if (text) label.textContent = text;
    });
    document.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));
    document.addEventListener('pointerenter', () => cursor.classList.remove('is-hidden'));

    $$('.magnetic').forEach(el => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.7, ease: 'power3.out' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.7, ease: 'power3.out' });
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.35);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.35);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  /* ---------- loader and intro ---------- */

  const begin = () => {
    body.classList.remove('is-loading');
    if (lenis) lenis.start();
    ScrollTrigger.refresh();
    track();
  };

  if (reduce) {
    showNow();
    begin();
    if (gl) gl.enter();
  } else {
    const count = $('[data-count]');
    const o = { v: 0 };
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to(o, {
      v: 100, duration: 1.7, ease: 'power2.inOut',
      onUpdate: () => { count.textContent = String(Math.round(o.v)).padStart(3, '0'); }
    })
      .to('.loader__bar i', { scaleX: 1, duration: 1.7, ease: 'power2.inOut' }, 0)
      .to('.loader__count span', { yPercent: -105, duration: 0.7, ease: 'expo.in' }, '+=0.15')
      .to('.loader__top, .loader__bar', { opacity: 0, duration: 0.4, ease: 'none' }, '<')
      .to(loader, { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, '-=0.15')
      .add(() => { begin(); if (gl) gl.enter(); }, '-=0.75')
      .from(heroChars, { yPercent: 118, duration: 1.4, stagger: 0.045 }, '-=0.7')
      .from('.nav > *', { y: -24, opacity: 0, duration: 1, stagger: 0.07 }, '<0.2')
      .from('[data-in]', { y: 28, opacity: 0, duration: 1.1, stagger: 0.08 }, '<0.1')
      .add(() => { loader.remove(); });
  }

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  addEventListener('load', () => ScrollTrigger.refresh());
})();
