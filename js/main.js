/* Project Name — interactions. Vanilla JS, no dependencies. */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const isDesktopScene = () => innerWidth > 900 && !(innerHeight <= 560 && innerWidth > innerHeight);

  /* ---------- Intro ---------- */
  function startHero() { root.classList.add('hero-ready'); }
  (function intro() {
    const el = $('#intro');
    if (!root.classList.contains('intro-on') || !el) { startHero(); return; }
    const count = $('#intro-count'), line = $('#intro-line'), heroImg = $('.hero-slide img');
    const start = performance.now();
    let done = false;
    function finish() {
      if (done) return;
      done = true;
      count.textContent = '100';
      line.style.transform = 'scaleX(1)';
      el.classList.add('is-leaving');
      try { sessionStorage.setItem('sky-intro', '1'); } catch (e) { }
      setTimeout(startHero, 350);
      setTimeout(() => { root.classList.remove('intro-on'); el.remove(); }, 1150);
    }
    (function tick(now) {
      if (done) return;
      const t = now - start;
      const p = Math.min(99, Math.round((1 - Math.exp(-t / 700)) * 100));
      count.textContent = String(p).padStart(2, '0');
      line.style.transform = 'scaleX(' + p / 100 + ')';
      if ((t > 2100 && heroImg.complete) || t > 3400) finish();
      else requestAnimationFrame(tick);
    })(start);
  })();

  /* ---------- Dialogs ---------- */
  let lastTrigger = null;
  function openDialog(d, trigger) {
    lastTrigger = trigger || document.activeElement;
    document.body.classList.add('dialog-open');
    d.showModal();
  }
  $$('dialog').forEach(d => {
    $$('[data-close]', d).forEach(b => b.addEventListener('click', () => d.close()));
    d.addEventListener('click', e => {
      if (e.target !== d) return;
      const r = d.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom || d.id === 'lightbox') d.close();
    });
    d.addEventListener('close', () => {
      if (!$$('dialog[open]').length) document.body.classList.remove('dialog-open');
      $('.menu-toggle').setAttribute('aria-expanded', 'false');
      lastTrigger && lastTrigger.focus({ preventScroll: true });
    });
  });

  const enquiry = $('#enquiry-modal');
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-enquire]');
    if (!t) return;
    if ($('#menu').open) $('#menu').close();
    openDialog(enquiry, t);
  });

  /* ---------- Menu ---------- */
  const menu = $('#menu');
  const menuLinks = $$('.menu-links a');
  menuLinks.forEach((a, i) => a.style.setProperty('--i', i));
  $('.menu-toggle').addEventListener('click', e => {
    e.currentTarget.setAttribute('aria-expanded', 'true');
    openDialog(menu, e.currentTarget);
  });
  menuLinks.forEach(a => {
    a.addEventListener('click', () => { lastTrigger = null; menu.close(); });
    const preview = () => {
      const img = $('#menu-preview');
      if (img.getAttribute('src') === a.dataset.preview) return;
      img.classList.add('is-swapping');
      setTimeout(() => { img.src = a.dataset.preview; img.classList.remove('is-swapping'); }, 220);
      $('#menu-preview-num').textContent = $('span', a).textContent;
      $('#menu-preview-cap').textContent = a.dataset.caption;
    };
    a.addEventListener('mouseenter', preview);
    a.addEventListener('focus', preview);
  });

  /* ---------- Hero slider ---------- */
  const hero = $('#home');
  const slides = $$('.hero-slide'), dots = $$('[data-slide]');
  let slide = 0, slideTimer;
  function loadSlideImage(img) {
    img.loading = 'eager';
    if (img.dataset.srcset) {
      img.srcset = img.dataset.srcset;
      delete img.dataset.srcset;
    }
    if (img.dataset.src) {
      img.src = img.dataset.src;
      delete img.dataset.src;
    }
    return img.decode().then(() => true, () => false);
  }
  let slideRequest = 0;
  async function setSlide(i) {
    const next = (i + slides.length) % slides.length;
    const request = ++slideRequest;
    if (next === slide) return;
    const loaded = await loadSlideImage($('img', slides[next]));
    if (request !== slideRequest) return;
    if (!loaded) { queueSlide(); return; }
    slides.forEach(s => s.classList.remove('is-prev', 'is-entering'));
    slides[slide].classList.add('is-prev');
    slides[slide].classList.remove('is-active');
    slide = next;
    const s = slides[slide], img = $('img', s);
    img.loading = 'eager';
    s.classList.add('is-active', 'is-entering');
    // restart Ken Burns
    img.style.animation = 'none'; void img.offsetWidth; img.style.animation = '';
    dots.forEach((d, k) => {
      d.classList.toggle('is-active', k === slide);
      d.setAttribute('aria-pressed', String(k === slide));
    });
    $('#hero-num').textContent = String(slide + 1).padStart(2, '0');
    queueSlide();
  }
  function queueSlide() {
    clearTimeout(slideTimer);
    if (!reduced) slideTimer = setTimeout(() => {
      if (document.hidden || hero.classList.contains('is-paused')) queueSlide();
      else setSlide(slide + 1);
    }, 7000);
  }
  dots.forEach(d => d.addEventListener('click', () => setSlide(+d.dataset.slide)));
  // Warm only the next slide after the initial banner has painted.
  const firstHeroImage = $('img', slides[0]);
  function warmNextSlide() {
    setTimeout(() => {
      const warm = () => loadSlideImage($('img', slides[(slide + 1) % slides.length]));
      if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 1500 });
      else warm();
    }, 3500);
  }
  if (firstHeroImage.complete) warmNextSlide();
  else firstHeroImage.addEventListener('load', warmNextSlide, { once: true });
  (function swipe() {
    let x0 = null, y0 = 0;
    const v = $('.hero-visual');
    v.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    v.addEventListener('touchend', e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) setSlide(slide + (dx < 0 ? 1 : -1));
      x0 = null;
    }, { passive: true });
  })();
  queueSlide();

  /* ---------- Floor plans ---------- */
  const plans = [
    { src: 'images/floorplans/tower-a.webp', tower: 'Tower A', label: 'Tower A', area: '2,581 sq. ft.', units: '01 & 02', type: '3 BHK', alt: 'Tower A, units 01 and 02, 2,581 sq. ft. 3 BHK floor plan' },
    { src: 'images/floorplans/tower-b.webp', tower: 'Tower B', label: 'Tower B', area: '1,758 sq. ft.', units: '01, 09 & 11', type: '3 BHK', alt: 'Tower B, units 01, 09 and 11, 1,758 sq. ft. 3 BHK floor plan' },
    { src: 'images/floorplans/tower-c.webp', tower: 'Tower C', label: 'Tower C', area: '3,060 sq. ft.', units: '01 & 02', type: '3.5 BHK', alt: 'Tower C, units 01 and 02, 3,060 sq. ft. 3.5 BHK floor plan' },
    { src: 'images/floorplans/master-plan.webp', tower: 'Master Plan', area: '8 acres', units: '3 towers', type: '3 & 3.5 BHK', alt: 'Project Name master plan with towers, clubhouse and landscaped spaces' }
  ];
  const tabs = $$('[data-plan]'), indicator = $('.plan-indicator'), planImg = $('#plan-img');
  let planIndex = 0;
  function moveIndicator() {
    const t = tabs[planIndex];
    indicator.style.width = t.offsetWidth + 'px';
    indicator.style.transform = 'translateX(' + t.offsetLeft + 'px)';
  }
  function setPlan(i) {
    planIndex = i;
    const p = plans[i], master = i === 3;
    tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
    $('#plan-panel').setAttribute('aria-labelledby', 'plan-tab-' + i);
    planImg.classList.add('is-swapping');
    setTimeout(() => { planImg.src = p.src; planImg.alt = p.alt; }, 200);
    planImg.onload = () => planImg.classList.remove('is-swapping');
    $('#plan-title').textContent = master ? 'One connected community' : p.tower + ' / ' + p.type;
    $('#plan-description').textContent = master ? 'Explore the arrangement of the towers, clubhouse and landscaped spaces.' : 'Explore the residence layout and unit details for ' + p.label + '.';
    $('#plan-key-1').textContent = master ? 'Development' : 'Total area';
    $('#plan-key-2').textContent = master ? 'Community' : 'Units';
    $('#plan-area').textContent = p.area;
    $('#plan-units').textContent = p.units;
    $('#plan-type').textContent = p.type;
    moveIndicator();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => setPlan(i));
    t.addEventListener('keydown', e => {
      const map = { ArrowRight: 1, ArrowLeft: -1 };
      let n;
      if (e.key in map) n = (i + map[e.key] + tabs.length) % tabs.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = tabs.length - 1;
      else return;
      e.preventDefault(); setPlan(n); tabs[n].focus();
    });
  });
  moveIndicator();
  addEventListener('resize', moveIndicator);
  document.fonts && document.fonts.ready.then(moveIndicator);

  /* ---------- Gallery ---------- */
  const track = $('#gallery-track'), cards = $$('.g-card', track);
  const galleryItems = cards.map(c => {
    const img = $('img', c);
    return { src: img.dataset.full, alt: img.alt, caption: img.alt + ' — ' + $('em', c).textContent };
  });
  function cardIndex() {
    let best = 0, dist = Infinity;
    cards.forEach((c, i) => {
      const d = Math.abs(c.offsetLeft - cards[0].offsetLeft - track.scrollLeft);
      if (d < dist) { dist = d; best = i; }
    });
    return best;
  }
  function scrollToCard(i) {
    i = clamp(i, 0, cards.length - 1);
    track.scrollTo({ left: cards[i].offsetLeft - cards[0].offsetLeft, behavior: reduced ? 'auto' : 'smooth' });
  }
  $('#gallery-prev').addEventListener('click', () => scrollToCard(cardIndex() - 1));
  $('#gallery-next').addEventListener('click', () => scrollToCard(cardIndex() + 1));
  track.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); scrollToCard(cardIndex() + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); scrollToCard(cardIndex() - 1); }
  });
  function galleryProgress() {
    const max = track.scrollWidth - track.clientWidth;
    $('#gallery-bar').style.width = (max > 0 ? (track.scrollLeft / max) * 100 : 100) + '%';
    const atEnd = max - track.scrollLeft < 4;
    $('#gallery-current').textContent = String((atEnd ? cards.length - 1 : cardIndex()) + 1).padStart(2, '0');
  }
  track.addEventListener('scroll', () => requestAnimationFrame(galleryProgress), { passive: true });
  galleryProgress();

  // Mouse drag-to-scroll (touch already scrolls natively).
  (function drag() {
    let down = false, moved = false, startX = 0, startLeft = 0, lastX = 0, velocity = 0, lastT = 0;
    track.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = false; startX = lastX = e.clientX; startLeft = track.scrollLeft; lastT = performance.now(); velocity = 0;
    });
    addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 6) { moved = true; track.classList.add('is-dragging'); }
      if (moved) {
        track.scrollLeft = startLeft - dx;
        const now = performance.now();
        velocity = (e.clientX - lastX) / Math.max(1, now - lastT);
        lastX = e.clientX; lastT = now;
      }
    });
    addEventListener('pointerup', () => {
      if (!down) return;
      down = false;
      if (!moved) return;
      // small momentum glide, then let scroll-snap settle
      let v = velocity * 16;
      (function glide() {
        if (Math.abs(v) > .5) { track.scrollLeft -= v; v *= .92; requestAnimationFrame(glide); }
        else track.classList.remove('is-dragging');
      })();
    });
    track.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  })();

  /* ---------- Lightbox ---------- */
  const lightbox = $('#lightbox'), lbImg = $('#lightbox-image');
  let lbMode = 'gallery', lbIndex = 0;
  function renderLightbox() {
    const list = lbMode === 'plan' ? plans : galleryItems;
    lbIndex = (lbIndex + list.length) % list.length;
    const it = list[lbIndex];
    lbImg.src = it.src; lbImg.alt = it.alt;
    $('#lightbox-caption').textContent = it.caption || it.alt;
  }
  $$('[data-gallery]').forEach(b => b.addEventListener('click', () => {
    lbMode = 'gallery'; lbIndex = +b.dataset.gallery; renderLightbox(); openDialog(lightbox, b);
  }));
  $('#plan-zoom').addEventListener('click', e => {
    lbMode = 'plan'; lbIndex = planIndex; renderLightbox(); openDialog(lightbox, e.currentTarget);
  });
  $('#lightbox-prev').addEventListener('click', () => { lbIndex--; renderLightbox(); });
  $('#lightbox-next').addEventListener('click', () => { lbIndex++; renderLightbox(); });
  lightbox.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { lbIndex++; renderLightbox(); }
    if (e.key === 'ArrowLeft') { lbIndex--; renderLightbox(); }
  });
  (function lbSwipe() {
    let x0 = null;
    const m = $('.lightbox-media');
    m.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    m.addEventListener('touchend', e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) { lbIndex += dx < 0 ? 1 : -1; renderLightbox(); }
      x0 = null;
    }, { passive: true });
  })();

  /* ---------- Project Name clock ---------- */
  const day = $('#day'), dayStage = $('.day-stage'), dayBtns = $$('[data-day]'), dayCopy = $('.day-copy');
  let dayPhase = 0, dayCur = 0, dayTarget = 0, dayRaf = 0;
  const pad = n => String(n).padStart(2, '0');
  function setPhase(i) {
    if (i === dayPhase) return;
    dayPhase = i;
    dayStage.dataset.phase = i;
    dayBtns.forEach((b, k) => { b.classList.toggle('is-active', k === i); b.setAttribute('aria-pressed', String(k === i)); });
    const b = dayBtns[i];
    $('#day-copy-title').textContent = b.dataset.title;
    $('#day-copy-text').textContent = b.dataset.copy;
    $('#day-label').textContent = b.lastChild.textContent.trim();
    dayCopy.classList.remove('swap'); void dayCopy.offsetWidth; dayCopy.classList.add('swap');
  }
  function renderDay(p) {
    day.style.setProperty('--day', p.toFixed(4));
    const mins = Math.round((6 + p * 18) * 60) % 1440;
    $('#day-time').textContent = pad(mins / 60 | 0) + ':' + pad(mins % 60);
    setPhase(Math.round(p * 3));
  }
  function dayLoop() {
    dayCur += (dayTarget - dayCur) * .1;
    if (Math.abs(dayTarget - dayCur) < .0005) dayCur = dayTarget;
    renderDay(dayCur);
    dayRaf = dayCur === dayTarget ? 0 : requestAnimationFrame(dayLoop);
  }
  function animateDayTo(p) {
    dayTarget = p;
    if (reduced) { dayCur = p; renderDay(p); return; }
    if (!dayRaf) dayRaf = requestAnimationFrame(dayLoop);
  }
  function sectionProgress(el) {
    const r = el.getBoundingClientRect();
    return clamp(-r.top / Math.max(1, el.offsetHeight - innerHeight));
  }
  dayBtns.forEach((b, i) => b.addEventListener('click', () => {
    if (!isDesktopScene()) { animateDayTo(i / 3); return; }
    const top = scrollY + day.getBoundingClientRect().top + (day.offsetHeight - innerHeight) * (.04 + .92 * i / 3);
    scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
  }));

  /* ---------- Amenities ---------- */
  const scenes = $$('.amenity-scene'), steps = $$('[data-amenity]'), amenityScroll = $('.amenity-scroll');
  const amenityText = [
    'Let the day slow down at the sky lounge infinity pool and sun deck.',
    'Start strong in a light-filled gymnasium that opens onto the gardens.',
    'Make room for unhurried moments across palm-lined lawns, pergolas and a reflecting pond.',
    'Dim the lights and settle in. A private mini theatre for movie nights that feel like an occasion.'
  ];
  let amenity = -1, amenitiesNearViewport = false;
  // Keep below-the-fold scenes from competing with the first hero image.
  if ('IntersectionObserver' in window) {
    const amenityLoader = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      amenitiesNearViewport = true;
      scenes.forEach((scene, k) => { if (k <= amenity + 1) $('img', scene).loading = 'eager'; });
      amenityLoader.disconnect();
    }, { rootMargin: '600px' });
    amenityLoader.observe(amenityScroll);
  } else amenitiesNearViewport = true;
  function setAmenity(i) {
    if (i === amenity) return;
    amenity = i;
    scenes.forEach((s, k) => {
      s.classList.toggle('is-shown', k <= i);
      s.classList.toggle('is-active', k === i);
      if (amenitiesNearViewport && k <= i + 1) $('img', s).loading = 'eager';
    });
    steps.forEach((s, k) => { s.classList.toggle('is-active', k === i); s.setAttribute('aria-pressed', String(k === i)); });
    $('#amenity-description').textContent = amenityText[i];
    $('.amenity-progress span').style.width = (i + 1) * 25 + '%';
  }
  steps.forEach((s, i) => s.addEventListener('click', () => {
    if (!isDesktopScene()) { setAmenity(i); return; }
    const top = scrollY + amenityScroll.getBoundingClientRect().top + (amenityScroll.offsetHeight - innerHeight) * (i + .5) / 4;
    scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
  }));
  setAmenity(0);

  /* ---------- Scroll-driven bits ---------- */
  const header = $('#site-header'), progressBar = $('.scroll-progress span');
  const navLinks = $$('.header-nav a'), sections = $$('main > section');
  const parallax = $$('[data-parallax]');
  let lastY = scrollY, ticking = false;
  function onScroll() {
    const y = scrollY;
    header.classList.toggle('is-scrolled', y > 40);
    header.classList.toggle('is-hidden', y > lastY && y > innerHeight * .8 && !document.body.classList.contains('dialog-open'));
    lastY = y;
    const max = document.documentElement.scrollHeight - innerHeight;
    progressBar.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';

    const current = sections.filter(s => s.getBoundingClientRect().top < innerHeight * .4).pop();
    const id = current ? current.id : '';
    navLinks.concat(menuLinks).forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + id));

    hero.classList.toggle('is-paused', y > innerHeight);

    if (isDesktopScene()) {
      if (!reduced) animateDayTo(clamp((sectionProgress(day) - .04) / .92));
      setAmenity(Math.min(3, Math.floor(sectionProgress(amenityScroll) * 4)));
      if (!reduced) parallax.forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > innerHeight + 200) return;
        const offset = (r.top + r.height / 2 - innerHeight / 2) * parseFloat(el.dataset.parallax);
        el.style.translate = '0 ' + offset.toFixed(1) + 'px';
      });
    }
    ticking = false;
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Reveal + counters ---------- */
  function countUp(el) {
    const end = +el.dataset.count, t0 = performance.now(), dur = 1600;
    (function step(now) {
      const p = clamp((now - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(end * e);
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }
  if ('IntersectionObserver' in window && !reduced) {
    root.classList.add('motion');
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('in-view');
      const c = $('[data-count]', en.target);
      if (c) countUp(c);
      io.unobserve(en.target);
    }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
    $$('.reveal, .reveal-img, .split').forEach(el => {
      const group = el.parentElement;
      const siblings = $$(':scope > .reveal', group);
      if (siblings.length > 1) el.style.transitionDelay = Math.min(siblings.indexOf(el), 5) * 90 + 'ms';
      io.observe(el);
    });
  } else {
    $$('[data-count]').forEach(el => { el.textContent = el.dataset.count; });
  }

  /* ---------- Pointer niceties (desktop only) ---------- */
  if (!finePointer || reduced) return;

  // Magnetic buttons
  $$('.magnetic').forEach(el => {
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
      el.style.transform = 'translate(' + x * .22 + 'px,' + y * .32 + 'px)';
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  });

  // Price card tilt + spotlight
  $$('.tilt').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      card.style.transform = 'rotateX(' + ((.5 - py) * 6).toFixed(2) + 'deg) rotateY(' + ((px - .5) * 6).toFixed(2) + 'deg)';
      card.style.setProperty('--mx', px * 100 + '%');
      card.style.setProperty('--my', py * 100 + '%');
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });

  // Custom cursor: a dot that tracks exactly, a ring that follows with easing.
  const cursor = $('.cursor'), ring = $('.cursor-ring'), dot = $('.cursor-dot'), label = $('.cursor-label');
  root.classList.add('has-cursor');
  let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, seen = false;
  cursor.classList.add('is-out');
  addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
    if (!seen) { seen = true; rx = mx; ry = my; cursor.classList.remove('is-out'); }
  }, { passive: true });
  (function follow() {
    rx += (mx - rx) * .17; ry += (my - ry) * .17;
    ring.style.transform = 'translate3d(' + rx.toFixed(2) + 'px,' + ry.toFixed(2) + 'px,0)';
    requestAnimationFrame(follow);
  })();
  document.addEventListener('mouseover', e => {
    const t = e.target;
    const field = t.closest('input, textarea, .iti__country-list');
    const labelled = !field && t.closest('[data-cursor]');
    const interactive = !field && !labelled && t.closest('a, button, [role="tab"], label, .amenity-list li');
    cursor.classList.toggle('is-text', !!field);
    cursor.classList.toggle('is-label', !!labelled);
    cursor.classList.toggle('is-hover', !!interactive);
    if (labelled) label.textContent = labelled.dataset.cursor;
  });
  document.addEventListener('mouseleave', () => cursor.classList.add('is-out'));
  document.addEventListener('mouseenter', () => cursor.classList.remove('is-out'));
  addEventListener('mousedown', () => cursor.classList.add('is-down'));
  addEventListener('mouseup', () => cursor.classList.remove('is-down'));
})();
