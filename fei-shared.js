/* ============================================================
   FEI shared behavior — vpw sync, Lenis/GSAP, animation
   vocabulary, chrome init + established module mechanisms.
   All inits are element-guarded; pages without a module's DOM
   skip it. Extracted from index.html 29 Jul 2026.
   ============================================================ */
/* ============================================================
   CORE: Lenis smooth scroll + GSAP ScrollTrigger integration
   ============================================================ */
gsap.registerPlugin(ScrollTrigger);

/* keep --vpw = true layout width (100vw includes the scrollbar; this doesn't) */
function setVPW() {
  document.documentElement.style.setProperty('--vpw', document.documentElement.clientWidth + 'px');
}
setVPW();
window.addEventListener('resize', setVPW);

const lenis = new Lenis({
  duration: 1.1,
  easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true
});
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add(time => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

/* ============================================================
   ANIMATION UTILITIES
   ------------------------------------------------------------
   slide-fade : opacity 0 -> 1, y 40 -> 0, ease-out to slow stop
   stagger    : [data-sf-group] children with [data-sf] run
                one-at-a-time, whole build <= 1s
   tick-up    : [data-tick] counts 0 -> value (handles $213B,
                47 yrs, 630+, 195 style strings)
   ============================================================ */
const SF = { duration: 0.7, y: 40, ease: 'power3.out' };

function initSlideFades(scope = document) {
  // standalone slide-fade elements (not inside a group)
  scope.querySelectorAll('[data-sf]:not([data-sf-group] [data-sf])').forEach(el => {
    gsap.to(el, {
      opacity: 1, y: 0, duration: SF.duration, ease: SF.ease,
      scrollTrigger: { trigger: el, start: 'top 85%', once: true }
    });
  });
  // stagger groups
  scope.querySelectorAll('[data-sf-group]').forEach(group => {
    const items = group.querySelectorAll('[data-sf]');
    if (!items.length) return;
    const total = Math.min(1, 0.55 + items.length * 0.08);      // whole build <= 1s
    const each = items.length > 1 ? (total - 0.55) / (items.length - 1) : 0;
    gsap.to(items, {
      opacity: 1, y: 0, duration: 0.55, ease: SF.ease, stagger: each,
      scrollTrigger: { trigger: group, start: 'top 85%', once: true }
    });
  });
}

function initTickUps(scope = document) {
  scope.querySelectorAll('[data-tick]').forEach(el => {
    const raw = el.dataset.tick ?? el.textContent.trim();
    // split into prefix / number / suffix  e.g. "$213B" "47 yrs" "630+"
    const m = raw.match(/^([^0-9]*)([\d,.]+)(.*)$/);
    if (!m) return;
    const [, pre, numStr, suf] = m;
    const target = parseFloat(numStr.replace(/,/g, ''));
    const decimals = (numStr.split('.')[1] || '').length;
    const obj = { v: 0 };
    el.textContent = pre + (0).toFixed(decimals) + suf;
    gsap.to(obj, {
      v: target, duration: 1.1, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      onUpdate() {
        let s = obj.v.toFixed(decimals);
        if (numStr.includes(',')) s = Number(s).toLocaleString('en-US');
        el.textContent = pre + s + suf;
      }
    });
  });
}

/* ============================================================
   PRODUCT TICKER — auto-advancing trending funds
   ============================================================ */
const PT_FUNDS = [
  { name: 'First Eagle Global Fund Class A',                tick: 'SGENX', nav: '$81.75', chg: '+0.03%', ytd: '+6.95%' },
  { name: 'First Eagle Overseas Fund Class A',              tick: 'SGOVX', nav: '$31.30', chg: '+0.25%', ytd: '+6.95%' },
  { name: 'First Eagle High Yield Municipal Fund',          tick: 'FEHAX', nav: '$7.98',  chg: '+0.16%', ytd: '+6.95%' },
  { name: 'First Eagle Small Cap Opportunity Fund',         tick: 'FESAX', nav: '$14.27', chg: '+0.74%', ytd: '+6.95%' },
  { name: 'First Eagle Gold Fund Class A',                  tick: 'SGGDX', nav: '$45.95', chg: '-0.43%', ytd: '+6.95%' },
  { name: 'First Eagle Global Income Builder Fund Class A', tick: 'FEBAX', nav: '$15.67', chg: '+0.05%', ytd: '+6.95%' }
];

function initProductTicker() {
  const fundEl   = document.getElementById('pt-bar-fund');
  if (!fundEl) return;

  const pauseBtn = document.getElementById('pt-pause');
  const prevBtn  = document.getElementById('pt-prev');
  const nextBtn  = document.getElementById('pt-next');

  const DWELL = 3000;
  const mod = i => ((i % PT_FUNDS.length) + PT_FUNDS.length) % PT_FUNDS.length;
  let idx = 0, paused = false, elapsed = 0, lastTs = null;

  const ARROW_SVG = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M5.5 5.5L8 3L10.5 5.5"/><path d="M8 3V13"/></svg>`;

  function render(i) {
    const f = PT_FUNDS[mod(i)];
    const isDown = f.chg.startsWith('-');
    const chgNum = f.chg.replace(/^[+-]/, '');
    fundEl.innerHTML = `
      <span class="pt-bar-name">${f.name}</span>
      <span class="pt-bar-fsep"></span>
      <span class="pt-bar-ticker">${f.tick}</span>
      <span class="pt-bar-nav">${f.nav}</span>
      <span class="pt-bar-chg${isDown ? ' down' : ''}">
        (<span class="chg-arrow">${ARROW_SVG}</span>${chgNum})
      </span>`;
  }

  function goTo(i, dir) {
    idx = mod(i);
    elapsed = 0;
    gsap.to(fundEl, { opacity: 0, x: dir * -12, duration: 0.2, ease: 'power2.in', onComplete() {
      render(idx);
      gsap.fromTo(fundEl, { opacity: 0, x: dir * 12 }, { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' });
    }});
  }

  render(0);

  function step(ts) {
    if (lastTs !== null && !paused && !document.hidden) elapsed += ts - lastTs;
    lastTs = ts;
    if (elapsed >= DWELL) goTo(idx + 1, 1);
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);

  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.classList.toggle('is-paused', paused);
  });
  prevBtn.addEventListener('click', () => goTo(idx - 1, -1));
  nextBtn.addEventListener('click', () => goTo(idx + 1, 1));
}

/* ============================================================
   OUR FUNDS — investor-profile filter (Goal / Time / Risk)
   Funds are scored against the selected profile (goal x2, risk,
   horizon) and the top 3 shown. The comp's default trio is
   pinned for the Growth / Long-Term / High landing state.
   ============================================================ */
const OF_FUNDS = [
  { t:'SGENX', n:'First Eagle Global Fund Class A', d:'Global value investing with a margin of safety. US and international equities, plus cash and gold as a buffer.', g:['growth','balanced'], r:'mod', h:'long' },
  { t:'FESAX', n:'First Eagle Small Cap Opportunity Fund', d:'Undervalued small-cap companies with a catalyst for change. Built for investors who can look past the noise.', g:['growth'], r:'high', h:'long' },
  { t:'SGGDX', n:'First Eagle Gold Fund', d:'Gold and precious metals as a strategic position, not a trade. A hedge against inflation and market stress.', g:['preservation'], r:'high', h:'long' },
  { t:'SGOVX', n:'First Eagle Overseas Fund Class A', d:'International value across developed and emerging markets, with a persistent focus on downside protection.', g:['growth','balanced'], r:'mod', h:'long' },
  { t:'FEVAX', n:'First Eagle U.S. Value Fund Class A', d:'Domestic businesses with durable advantages, bought at a discount to intrinsic value and held with patience.', g:['growth'], r:'mod', h:'long' },
  { t:'DHSCX', n:'Diamond Hill Small Cap Fund', d:'Valuation-driven small cap investing from the Diamond Hill team, managed with strict capacity discipline.', g:['growth'], r:'high', h:'xlong' },
  { t:'FEBAX', n:'First Eagle Global Income Builder Fund', d:'A flexible mix of income-producing equities and bonds, designed to pay you while you wait.', g:['income','balanced'], r:'mod', h:'med' },
  { t:'FEFAX', n:'First Eagle Fund of America', d:'A concentrated, event-aware portfolio of US businesses undergoing positive corporate change.', g:['growth'], r:'high', h:'med' },
  { t:'DHMAX', n:'Diamond Hill Small-Mid Cap Fund', d:'Intrinsic value investing across small and mid caps, with room to let winners compound.', g:['growth'], r:'high', h:'xlong' },
  { t:'FDUAX', n:'First Eagle Short Duration High Yield Municipal Fund', d:'Tax-exempt income with a shorter duration profile, built for rate-sensitive allocations.', g:['income','preservation'], r:'low', h:'short' },
  { t:'FEHAX', n:'First Eagle High Yield Municipal Fund', d:'Research-driven high yield municipal credit, targeting tax-exempt income across market cycles.', g:['income'], r:'mod', h:'med' },
  { t:'FECRX', n:'First Eagle Credit Opportunities Fund', d:'Institutional alternative credit in an interval fund structure, managed by the Napier Park team.', g:['income'], r:'mod', h:'med' },
  { t:'FERAX', n:'First Eagle Global Real Assets Fund', d:'Real assets across gold, energy, infrastructure and materials as a hedge against inflation.', g:['preservation','balanced'], r:'mod', h:'long' },
  { t:'SMA',   n:'First Eagle Global Value SMA', d:'The flagship global value strategy in a separately managed account for personalized portfolios.', g:['balanced','growth'], r:'mod', h:'xlong' },
  { t:'FERIX', n:'First Eagle Real Assets Interval Fund', d:'Income-oriented real asset exposure in an interval structure with periodic liquidity.', g:['income','preservation'], r:'mod', h:'long' }
];

function initFundFilter() {
  const wrap = document.getElementById('of-cards');
  if (!wrap) return;
  const goalSel = document.getElementById('of-goal');
  const timeSel = document.getElementById('of-time');
  const riskSel = document.getElementById('of-risk');

  const NEXT_H = { short:'med', med:'long', long:'xlong', xlong:'long' };

  function pick() {
    const goal = goalSel.value, time = timeSel.value, risk = riskSel.value;
    // comp's landing state shows the flagship trio
    if (goal === 'growth' && time === 'long' && risk === 'high') {
      return ['SGENX','FESAX','SGGDX'].map(t => OF_FUNDS.find(f => f.t === t));
    }
    return OF_FUNDS
      .map(f => {
        let s = 0;
        if (f.g.includes(goal)) s += 2;
        if (f.r === risk) s += 1;
        if (f.h === time) s += 1;
        else if (NEXT_H[time] === f.h || NEXT_H[f.h] === time) s += 0.5;
        return { f, s };
      })
      .sort((a, b) => b.s - a.s)
      .slice(0, 3)
      .map(x => x.f);
  }

  function render(animate) {
    wrap.innerHTML = pick().map(f => `
      <div class="fund-card">
        <div class="fund-card-copy">
          <div>
            <p class="fund-ticker">${f.t}</p>
            <p class="fund-name">${f.n}</p>
          </div>
          <p class="fund-desc">${f.d}</p>
        </div>
        <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16h20M18 6l10 10-10 10"/></svg>
      </div>`).join('');
    if (animate) {
      gsap.fromTo(wrap.children, { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', stagger: 0.09 });
    }
  }

  [goalSel, timeSel, riskSel].forEach(s => s.addEventListener('change', () => render(true)));
  render(false);
}

/* ============================================================
   NAVIGATION SHEET
   ------------------------------------------------------------
   L1 tap slides a steel-blue sheet in from the right (~72% of
   the page width, below the 132px header). Lists stagger in,
   the editorial brief slide-fades, motion is quick and snappy.
   Investments = 3 headed columns; other L1s = L2 rail + panel.
   ============================================================ */
const NAV = {
  'investments': {
    title: 'Investments',
    cta: 'View all funds',
    cols: [
      { h: 'By Vehicle', items: ['Mutual Funds', 'ETFs', 'Interval Funds', 'SMAs', 'CITs', 'BDCs'] },
      { h: 'By Asset Class', items: ['Global Equity', 'US Equity', 'Real Assets', 'Multi-Asset', 'Alternative Credit', 'Real Estate Debt'] },
      { h: 'By Goal', items: ['Capital Preservation', 'Capital Appreciation', 'Income Generation'] }
    ],
    brief: {
      img: 'assets/img/nav-img-road.png', eyebrow: null,
      title: 'We don’t predict the future.<br>We prepare for it.',
      body: 'Real, absolute returns through a philosophy that puts downside first.',
      cta: 'Explore our philosophy'
    }
  },
  'insights': {
    title: 'Insights',
    l2: [
      {
        label: 'Bird’s Eye View',
        panel: { desc: 'Timely market insights, thoughtful perspectives, and expert commentary — our commitment to providing modern investment solutions to modern challenges.',
          cols: [{ h: 'Blog', rows: ['Read the Bird’s Eye View', 'Subscribe'] }] }
      },
      {
        label: 'Explore Insights',
        panel: { cols: [
          { h: 'Theme', items: ['Market Outlook', 'Fund Updates', 'Investment Ideas', 'Alternative Credit', 'Municipal Credit', 'Gold & Real Assets', 'Retirement & DC Plans', 'Practice Building', 'Diamond Hill'] },
          { h: 'Asset Class', items: ['Global Equity', 'US Equity', 'International Equity', 'Municipal Fixed Income', 'Core Fixed Income', 'Alternative Credit', 'Gold', 'Real Assets', 'Multi-Asset'] }
        ]}
      }
    ],
    brief: {
      img: 'assets/img/nav-img-road.png', eyebrow: 'Latest Insight',
      title: 'Navigating Uncertainty: A Mid-Year Market Outlook',
      body: 'Where conviction meets the road ahead — our teams on positioning for the second half.',
      cta: 'Read Insight'
    }
  },
  'resources': {
    title: 'Resources',
    l2: [
      {
        label: 'First Eagle Academy',
        panel: { cols: [{ h: null, rows: ['About First Eagle Academy', 'Practice Management', 'High Net Worth Acquisition', 'Succession Planning', 'Behavioral Finance', 'Earn CE Credit Online', 'Alternative Credit Education'] }] }
      },
      {
        label: 'Client Servicing',
        panel: { cols: [{ h: null, rows: ['Account Services', 'Forms & Applications', 'Tax Center', 'FAQs'] }] }
      },
      { label: 'Retirement Solutions', href: 'retirement.html', panel: null }
    ],
    brief: {
      img: 'assets/img/nav-img-people.png', eyebrow: 'First Eagle Academy',
      title: 'Markets Get Emotional. Your Clients Do Not Have To.',
      body: 'A program built to help advisors keep clients rational and long-term-minded when markets get shaky.',
      cta: 'Explore behavioral finance'
    }
  },
  'who-we-are': {
    title: 'Who We Are',
    l2: [
      { label: 'About First Eagle', panel: { cols: [{ h: 'About First Eagle', rows: ['Overview|about.html', 'Investment Culture', 'Engagement and Inclusion', 'Corporate Social Responsibility', 'Responsible Investing (ESG)'] }] } },
      { label: 'Capabilities', panel: { cols: [{ h: 'Capabilities', rows: ['Municipal Credit', 'Gold', 'Interval Funds', 'ETF Investing', 'Retirement Solutions'] }] } },
      { label: 'Our Clients', panel: { cols: [{ h: 'Our Clients', rows: ['Consultants', 'Corporate Pensions', 'Defined Contributions', 'Endowments and Foundations', 'Family Offices', 'Insurance', 'Public Pensions', 'Sovereign Wealth Funds', 'Taft Hartley Plans'] }] } },
      { label: 'Leadership', panel: { cols: [{ h: 'Leadership', rows: ['Senior Leadership', 'Corporate & Infrastructure Leadership', 'Client Team'] }] } },
      { label: 'Investment Teams', panel: { cols: [{ h: 'Investment Teams', rows: ['First Eagle Global Value', 'First Eagle Small Cap', 'First Eagle Municipal Credit', 'Napier Park', 'Diamond Hill'] }] } },
      { label: 'Press and Media', panel: null },
      { label: 'Careers', panel: null },
      { label: 'Contact Us', panel: null }
    ],
    brief: {
      img: 'assets/img/nav-img-people.png', eyebrow: 'Our Philosophy',
      title: 'A Margin of Safety Approach',
      body: 'How we think about risk, resilience and long-term value across every strategy we manage.',
      cta: 'Learn More'
    }
  }
};

function initNavSheet() {
  const sheet = document.getElementById('nav-sheet');
  const body = document.getElementById('sheet-body');
  const overlay = document.getElementById('nav-overlay');
  const l1Buttons = [...document.querySelectorAll('.hdr-l1 button[data-l1]')];
  let openKey = null;

  const chevR = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3l5 5-5 5"/></svg>';
  const arrOut = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 14L14 6M8 6h6v6"/></svg>';

  function colsHTML(cols, useRows) {
    return `<div class="sheet-cols">` + cols.map(c => `
      <div class="sheet-col">
        ${c.h ? `<h5>${c.h}</h5>` : ''}
        <ul class="${c.rows ? 'rows' : ''}">
          ${(c.items || c.rows).map(i => {
            const [label, href] = i.split('|');
            return `<li><a href="${href || '#'}">${label}</a></li>`;
          }).join('')}
        </ul>
      </div>`).join('') + `</div>`;
  }

  function render(key, l2Index = 0) {
    const d = NAV[key];
    let main;
    if (d.cols) {
      main = colsHTML(d.cols);
    } else {
      const sel = d.l2[l2Index];
      main = `
        <div class="sheet-rail" data-anim>
          ${d.l2.map((item, i) => item.href
            ? `<a href="${item.href}" class="sheet-rail-link">${item.label}</a>`
            : `<button data-l2="${i}" class="${i === l2Index ? 'sel' : ''}">${item.label}${item.panel ? chevR : ''}</button>`
          ).join('')}
        </div>
        <div class="sheet-panel" data-anim>
          ${sel.panel ? (sel.panel.desc ? `<p class="panel-desc">${sel.panel.desc}</p>` : '') + colsHTML(sel.panel.cols) : ''}
        </div>`;
      main = `<div class="sheet-main">${main}</div>`;
    }
    body.innerHTML = `
      <div>
        <div class="sheet-head" data-anim>
          <p class="sheet-title">${d.title}</p>
          ${d.cta ? `<a class="sheet-cta" href="#">${d.cta}${arrOut}</a>` : ''}
        </div>
        <div style="height:64px"></div>
        ${d.cols ? `<div data-anim>${main}</div>` : main}
      </div>
      <div class="sheet-brief" data-anim>
        <div class="sheet-brief-img"><img src="${d.brief.img}" alt="" onerror="this.remove()"></div>
        <div class="sheet-brief-copy">
          ${d.brief.eyebrow ? `<p class="eyebrow">${d.brief.eyebrow}</p>` : ''}
          <div>
            <p class="sheet-brief-title">${d.brief.title}</p>
            <p class="sheet-brief-body" style="margin-top:8px;">${d.brief.body}</p>
          </div>
          <a class="sheet-brief-cta" href="#">${d.brief.cta}${arrOut}</a>
        </div>
      </div>`;
    // L2 rail interaction
    body.querySelectorAll('[data-l2]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!NAV[key].l2[+btn.dataset.l2].panel) return;
        render(key, +btn.dataset.l2);
        animateIn(true);
      });
    });
  }

  function animateIn(panelOnly = false) {
    const targets = panelOnly
      ? body.querySelectorAll('.sheet-panel a, .sheet-panel h5, .panel-desc')
      : body.querySelectorAll('[data-anim]');
    if (panelOnly) {
      gsap.fromTo(targets, { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power3.out', stagger: 0.025 });
    } else {
      gsap.fromTo(targets, { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out', stagger: 0.06, delay: 0.12 });
    }
  }

  function open(key) {
    if (openKey === key) return close();
    const wasOpen = !!openKey;
    openKey = key;
    l1Buttons.forEach(b => b.classList.toggle('open', b.dataset.l1 === key));
    render(key);
    sheet.setAttribute('aria-hidden', 'false');
    overlay.classList.add('open');
    lenis.stop();
    if (wasOpen) { animateIn(); return; }        // already out — just swap content
    gsap.to(sheet, { x: '0%', duration: 0.45, ease: 'power4.out' });
    animateIn();
  }

  function close() {
    if (!openKey) return;
    openKey = null;
    l1Buttons.forEach(b => b.classList.remove('open'));
    overlay.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
    lenis.start();
    gsap.to(sheet, { x: '102%', duration: 0.35, ease: 'power3.in' });
  }

  gsap.set(sheet, { x: '102%' });
  l1Buttons.forEach(b => b.addEventListener('click', () => open(b.dataset.l1)));
  document.getElementById('sheet-close').addEventListener('click', close);
  overlay.addEventListener('click', close);
  window.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  // Real navigation links (e.g. "Overview" -> about.html) close the sheet
  // first, then navigate once the close animation finishes — instead of
  // the page unloading mid-slide while the sheet is still open.
  body.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href === '#') return;
    e.preventDefault();
    close();
    setTimeout(() => { window.location.href = href; }, 600);
  });
}

/* ============================================================
   FADE-ONLY REVEAL  ([data-fade])
   ============================================================ */
function initFades(scope = document) {
  scope.querySelectorAll('[data-fade]').forEach(el => {
    gsap.to(el, {
      opacity: 1, duration: 0.9, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true }
    });
  });
}

/* ============================================================
   MARKET VIEWS — infinite video carousel
   ------------------------------------------------------------
   The left-most (active) card never scrolls: on "next" the
   upcoming card slides left and takes over the active slot,
   covering the old card, which is then removed. On "prev" the
   active card slides back out to slot 1, revealing the previous
   item beneath it. Videos repeat infinitely (modular index).
   ============================================================ */
const MV_ITEMS = [
  {
    img: 'assets/img/mv-video-1.png', imgDs: 'assets/img/mv-video-ds-1.png', date: 'May 21, 2026', dur: '4:59',
    title: 'Distilling Signal from Noise.',
    speaker: 'Christian Heck',
    body: ' discusses how the Global Value team assesses monetary policy’s real-economy impact and why AI’s productivity gains may emerge more gradually than expected.'
  },
  {
    img: 'assets/img/mv-video-2.png', imgDs: 'assets/img/mv-video-ds-2.png', date: 'May 21, 2026', dur: '4:41',
    title: 'How Scarcity Is Reasserting the Strategic Value of Real Assets.',
    speaker: 'Matthew McLennan',
    body: ' explains why supply constraints in energy, materials and land are re-pricing real assets and what that means for long-duration portfolios.'
  },
  {
    img: 'assets/img/mv-video-3.png', imgDs: 'assets/img/mv-video-ds-3.png', date: 'May 21, 2026', dur: '4:59',
    title: 'Muni Resilience Amid Market Turbulence.',
    speaker: 'John Miller',
    body: ' looks at how high-grade municipal credit has held its footing through rate volatility and where selective opportunity remains.'
  }
];

function initMarketViews() {
  const track = document.getElementById('mv-carousel');
  if (!track) return;
  const BUFFER = 5;                       // rendered slots 0..BUFFER
  let firstIndex = 0;                     // item index of the active (slot 0) card
  let animating = false;
  const mod = i => ((i % MV_ITEMS.length) + MV_ITEMS.length) % MV_ITEMS.length;

  function step() {
    const vpw = document.documentElement.clientWidth;         // same basis as --vpw
    const inner = Math.min(vpw, 1680) - 160;   // matches --max-w (1520 inner)
    const colw = (inner - 11 * 32) / 12;
    const cardW = Math.max(3 * colw + 2 * 32, 296);           // card min-width 296
    return cardW + 32;                                        // gap is always exactly 32
  }

  function makeCard(itemIdx, slot, isActive = slot === 0) {
    const it = MV_ITEMS[mod(itemIdx)];
    const el = document.createElement('article');
    el.className = 'mv-card' + (isActive ? ' active' : '');
    el.dataset.slot = slot;
    el.innerHTML = `
      <div class="mv-frame">
        <img class="mv-still mv-still--color" src="${it.img}" alt="" onerror="this.remove()">
        <img class="mv-still mv-still--ds" src="${it.imgDs}" alt="" onerror="this.remove()">
        <div class="mv-vignette"></div>
        <div class="mv-date"><p class="eyebrow">${it.date}</p></div>
        <button class="mv-play"><span>${it.dur}</span>
          <svg viewBox="0 0 11 12"><path d="M0 0 L11 6 L0 12 Z" fill="currentColor"/></svg>
        </button>
      </div>
      <div class="mv-desc">
        <p class="mv-card-title">${it.title}</p>
        <p class="mv-card-body"><span class="speaker">${it.speaker}</span>${it.body}</p>
      </div>`;
    gsap.set(el, { x: slot * step(), zIndex: slot === 0 ? 1 : 2 });
    track.appendChild(el);
    return el;
  }

  // initial render
  for (let s = 0; s <= BUFFER; s++) makeCard(firstIndex + s, s);

  function cards() { return [...track.querySelectorAll('.mv-card')]; }

  /* step indicators — one dot per unique item (infinite loop wraps) */
  const dotsWrap = document.getElementById('mv-dots');
  MV_ITEMS.forEach(() => {
    const d = document.createElement('span');
    d.className = 'mv-dot';
    dotsWrap.appendChild(d);
  });
  function updateDots() {
    [...dotsWrap.children].forEach((d, i) => d.classList.toggle('active', i === mod(firstIndex)));
  }
  updateDots();

  function next(dur = 0.65) {
    if (animating) return; animating = true;
    firstIndex = mod(firstIndex + 1);
    updateDots();
    const all = cards();                          // snapshot BEFORE adding the buffer card
    const dying = all.find(c => +c.dataset.slot === 0);
    dying.classList.remove('active');
    dying.style.zIndex = 0;                       // stays put, gets covered
    const movers = all.filter(c => +c.dataset.slot >= 1);
    let incoming = null;
    const tl = gsap.timeline({ onComplete() {
      if (incoming) incoming.classList.add('active');  // full color only on arrival
      dying.remove(); animating = false;
      mvPump();                                   // play any queued clicks
    }});
    // cross-dissolve: old card fades across the full slide as the new card covers it
    tl.to(dying, { opacity: 0, duration: dur, ease: 'power3.inOut' }, 0);
    movers.forEach(c => {
      const newSlot = +c.dataset.slot - 1;
      c.dataset.slot = newSlot;
      if (newSlot === 0) incoming = c;
      tl.to(c, { x: newSlot * step(), duration: dur, ease: 'power3.inOut' }, 0);
    });
    makeCard(firstIndex + BUFFER, BUFFER);        // fresh card straight to its final slot
  }

  function prev(dur = 0.65) {
    if (animating) return; animating = true;
    firstIndex = mod(firstIndex - 1);
    updateDots();
    // reveal card: placed beneath the active card, desaturated until fully revealed
    const reveal = makeCard(firstIndex, 0, false);
    reveal.style.zIndex = 0;
    const movers = cards().filter(c => c !== reveal);
    const tl = gsap.timeline({ onComplete() {
      cards().filter(k => +k.dataset.slot > BUFFER).forEach(k => k.remove());
      reveal.classList.add('active');                  // full color only on arrival
      reveal.style.zIndex = 1;
      animating = false;
      mvPump();                                   // play any queued clicks
    }});
    movers.forEach(c => {
      const newSlot = +c.dataset.slot + 1;
      c.dataset.slot = newSlot;
      if (newSlot === 1) c.classList.remove('active');  // desaturates as it departs
      tl.to(c, { x: newSlot * step(), duration: dur, ease: 'power3.inOut' }, 0);
    });
  }

  /* click queue: rapid clicks bank up and play back-to-back — queued
     steps run faster so the carousel catches up with the user's intent */
  const mvQueue = [];
  function mvPump() {
    if (animating || !mvQueue.length) return;
    const dir = mvQueue.shift();
    const dur = mvQueue.length ? 0.35 : 0.65;
    dir > 0 ? next(dur) : prev(dur);
  }
  document.getElementById('mv-next').addEventListener('click', () => { mvQueue.push(1); mvPump(); });
  document.getElementById('mv-prev').addEventListener('click', () => { mvQueue.push(-1); mvPump(); });

  /* auto-scroll every 3s; hovering the carousel (or arrows) pauses it */
  let mvHover = false;
  [track, document.querySelector('.mv-arrows')].forEach(el => {
    el.addEventListener('mouseenter', () => mvHover = true);
    el.addEventListener('mouseleave', () => mvHover = false);
  });
  setInterval(() => {
    if (!mvHover && !animating && !mvQueue.length && !document.hidden) next();
  }, 3000);

  /* Adaptive vertical layout — keeps the 1440 design rhythm at any width:
     buttons/dots clear the tallest card (frame + title + expanded body),
     subscribe keeps its 129px rhythm under the buttons, height follows. */
  function layoutMV() {
    const section = document.getElementById('market-views');
    const arrows = section.querySelector('.mv-arrows');
    const sub = section.querySelector('.mv-subscribe');
    const cardW = step() - 32;
    const frameH = cardW * 474 / 296;
    // tallest card = worst-case expanded text; measuring all rendered
    // cards keeps the row fixed (no jumping as the active card changes)
    const maxCardH = Math.max(frameH, ...cards().map(c => c.offsetHeight));
    const arrowsTop = 106 + maxCardH + 24;      // 24px below the expanded text
    const subTop = arrowsTop + 40 + 113 + 16;   // breathing room above subscribe
    arrows.style.top = arrowsTop + 'px';
    sub.style.top = subTop + 'px';
    section.style.height = (subTop + sub.offsetHeight + 71) + 'px';
    ScrollTrigger.refresh();
  }
  layoutMV();
  window.addEventListener('load', layoutMV);   // re-measure once fonts are in

  window.addEventListener('resize', () => {
    cards().forEach(c => gsap.set(c, { x: (+c.dataset.slot) * step() }));
    layoutMV();
  });

  /* subscribe consent: button stays disabled until the box is checked */
  const consent = document.getElementById('mv-consent');
  const subBtn = document.getElementById('mv-sub-btn');
  if (consent && subBtn) {
    consent.addEventListener('change', () => { subBtn.disabled = !consent.checked; });
  }
}

/* ============================================================
   SMALL CAP VIEWS — same video carousel as Market Views,
   wired to #rt-smallcap with sc- prefixed element IDs.
   ============================================================ */
function initSmallCapViews() {
  const track = document.getElementById('sc-carousel');
  if (!track) return;
  const BUFFER = 5;
  let firstIndex = 0;
  let animating = false;
  const mod = i => ((i % MV_ITEMS.length) + MV_ITEMS.length) % MV_ITEMS.length;

  function step() {
    const vpw = document.documentElement.clientWidth;
    const inner = Math.min(vpw, 1680) - 160;
    const colw = (inner - 11 * 32) / 12;
    const cardW = Math.max(3 * colw + 2 * 32, 296);
    return cardW + 32;
  }

  function makeCard(itemIdx, slot, isActive = slot === 0) {
    const it = MV_ITEMS[mod(itemIdx)];
    const el = document.createElement('article');
    el.className = 'mv-card' + (isActive ? ' active' : '');
    el.dataset.slot = slot;
    el.innerHTML = `
      <div class="mv-frame">
        <img class="mv-still mv-still--color" src="${it.img}" alt="" onerror="this.remove()">
        <img class="mv-still mv-still--ds" src="${it.imgDs}" alt="" onerror="this.remove()">
        <div class="mv-vignette"></div>
        <div class="mv-date"><p class="eyebrow">${it.date}</p></div>
        <button class="mv-play"><span>${it.dur}</span>
          <svg viewBox="0 0 11 12"><path d="M0 0 L11 6 L0 12 Z" fill="currentColor"/></svg>
        </button>
      </div>
      <div class="mv-desc">
        <p class="mv-card-title">${it.title}</p>
        <p class="mv-card-body"><span class="speaker">${it.speaker}</span>${it.body}</p>
      </div>`;
    gsap.set(el, { x: slot * step(), zIndex: slot === 0 ? 1 : 2 });
    track.appendChild(el);
    return el;
  }

  for (let s = 0; s <= BUFFER; s++) makeCard(firstIndex + s, s);

  function cards() { return [...track.querySelectorAll('.mv-card')]; }

  const dotsWrap = document.getElementById('sc-dots');
  MV_ITEMS.forEach(() => {
    const d = document.createElement('span');
    d.className = 'mv-dot';
    dotsWrap.appendChild(d);
  });
  function updateDots() {
    [...dotsWrap.children].forEach((d, i) => d.classList.toggle('active', i === mod(firstIndex)));
  }
  updateDots();

  function scNext(dur = 0.65) {
    if (animating) return; animating = true;
    firstIndex = mod(firstIndex + 1);
    updateDots();
    const all = cards();
    const dying = all.find(c => +c.dataset.slot === 0);
    dying.classList.remove('active');
    dying.style.zIndex = 0;
    const movers = all.filter(c => +c.dataset.slot >= 1);
    let incoming = null;
    const tl = gsap.timeline({ onComplete() {
      if (incoming) incoming.classList.add('active');
      dying.remove(); animating = false;
      scPump();
    }});
    tl.to(dying, { opacity: 0, duration: dur, ease: 'power3.inOut' }, 0);
    movers.forEach(c => {
      const newSlot = +c.dataset.slot - 1;
      c.dataset.slot = newSlot;
      if (newSlot === 0) incoming = c;
      tl.to(c, { x: newSlot * step(), duration: dur, ease: 'power3.inOut' }, 0);
    });
    makeCard(firstIndex + BUFFER, BUFFER);
  }

  function scPrev(dur = 0.65) {
    if (animating) return; animating = true;
    firstIndex = mod(firstIndex - 1);
    updateDots();
    const reveal = makeCard(firstIndex, 0, false);
    reveal.style.zIndex = 0;
    const movers = cards().filter(c => c !== reveal);
    const tl = gsap.timeline({ onComplete() {
      cards().filter(k => +k.dataset.slot > BUFFER).forEach(k => k.remove());
      reveal.classList.add('active');
      reveal.style.zIndex = 1;
      animating = false;
      scPump();
    }});
    movers.forEach(c => {
      const newSlot = +c.dataset.slot + 1;
      c.dataset.slot = newSlot;
      if (newSlot === 1) c.classList.remove('active');
      tl.to(c, { x: newSlot * step(), duration: dur, ease: 'power3.inOut' }, 0);
    });
  }

  const scQueue = [];
  function scPump() {
    if (animating || !scQueue.length) return;
    const dir = scQueue.shift();
    const dur = scQueue.length ? 0.35 : 0.65;
    dir > 0 ? scNext(dur) : scPrev(dur);
  }
  document.getElementById('sc-next').addEventListener('click', () => { scQueue.push(1); scPump(); });
  document.getElementById('sc-prev').addEventListener('click', () => { scQueue.push(-1); scPump(); });

  let scHover = false;
  const scSection = document.getElementById('rt-smallcap');
  [track, scSection && scSection.querySelector('.mv-arrows')].forEach(el => {
    if (!el) return;
    el.addEventListener('mouseenter', () => scHover = true);
    el.addEventListener('mouseleave', () => scHover = false);
  });
  setInterval(() => {
    if (!scHover && !animating && !scQueue.length && !document.hidden) scNext();
  }, 3000);

  function layoutSC() {
    const section = document.getElementById('rt-smallcap');
    if (!section) return;
    const arrows = section.querySelector('.mv-arrows');
    const cardW = step() - 32;
    const frameH = cardW * 474 / 296;
    const maxCardH = Math.max(frameH, ...cards().map(c => c.offsetHeight));
    const arrowsTop = 106 + maxCardH + 24;
    arrows.style.top = arrowsTop + 'px';
    section.style.height = (arrowsTop + 40 + 80) + 'px';
    ScrollTrigger.refresh();
  }
  layoutSC();
  window.addEventListener('load', layoutSC);
  window.addEventListener('resize', () => {
    cards().forEach(c => gsap.set(c, { x: (+c.dataset.slot) * step() }));
    layoutSC();
  });
}

/* ============================================================
   RECENT INSIGHTS — filtered panel slider (Sprint-1 1594:39821)
   ------------------------------------------------------------
   Category tabs reload the panels (staggered). All items render
   side by side; the active panel expands via flex-grow while the
   rest collapse to 77px thumbnails. Thumbnails are clickable;
   arrows step the active index. Auto-advances every 4s; hover
   pauses.
   ============================================================ */
const RI4_CATS = [
  { label: 'Market Outlook', items: [
    { img: 'assets/img/insight-card-5.png', tag: 'Equities', date: '14 Jul 2026',
      title: 'Strains Beneath the Exuberance',
      desc: 'Markets are rallying while savings run thin and AI spending outpaces the dot-com peak. What we’re watching.',
      portrait: 'assets/img/matthew-mclennan.png', name: 'Matthew McLennan, CFA', role: 'Head of Global Value' },
    { img: 'assets/img/insight-card-3.png', tag: 'Equities', date: '07 Jul 2026',
      title: 'The Long Road to AI-Driven Productivity',
      desc: 'Why AI’s biggest productivity gains may take decades, not years, and what history says about the gap.',
      portrait: 'assets/img/christian-heck.png', name: 'Christian Heck, CFA', role: 'Deputy Head of Global Value and Portfolio Manager' },
    { img: 'assets/img/insight-card-4.png', tag: 'Market Outlook', date: '30 Jun 2026',
      title: 'Reading the Cycle in a Late-Stage Market',
      desc: 'Where discipline pays off when valuations stretch and the crowd stops asking questions.',
      portrait: 'assets/img/julien-albertini.png', name: 'Julien Albertini', role: 'Deputy Head of Global Value' }
  ]},
  { label: 'Alternative Credit', items: [
    { img: 'assets/img/insight-card-2.png', tag: 'Fixed Income', date: '09 Jul 2026',
      title: 'Taxable Fixed Income Markets Update: June 2026',
      desc: 'June’s fixed income recap: rate volatility, a hawkish new Fed chair, and spreads holding near historic lows.',
      portrait: 'assets/img/douglas-gimple.png', name: 'Douglas Gimple', role: 'Client Portfolio Manager' },
    { img: 'assets/img/insight-hero-1.png', tag: 'Alternative Credit', date: '02 Jul 2026',
      title: 'Private Credit’s Next Chapter: Discipline Over Yield',
      desc: 'Why underwriting standards, not headline yields, will separate managers in the next credit cycle.',
      portrait: 'assets/img/jim-obrien.png', name: 'Jim O’Brien', role: 'Managing Principal, Napier Park' },
    { img: 'assets/img/insight-hero-4.png', tag: 'Alternative Credit', date: '24 Jun 2026',
      title: 'CLOs Without the Mystery',
      desc: 'A plain-English tour of collateralized loan obligations and where they fit in an income allocation.',
      portrait: 'assets/img/jon-dorfman.png', name: 'Jon Dorfman', role: 'Managing Principal, Napier Park' }
  ]},
  { label: 'Municipal Credit', items: [
    { img: 'assets/img/insight-hero-3.png', tag: 'Municipal Credit', date: '02 Jul 2026',
      title: 'Muni Resilience Amid Market Turbulence',
      desc: 'How high-grade municipal credit has held its footing through rate volatility, and where opportunity remains.',
      portrait: 'assets/img/john-miller.png', name: 'John Miller', role: 'Head and Chief Investment Officer' },
    { img: 'assets/img/insight-card-2.png', tag: 'Municipal Credit', date: '26 Jun 2026',
      title: 'Short Duration, Long Discipline',
      desc: 'High yield munis with a shorter fuse: managing rate sensitivity without giving up tax-exempt carry.',
      portrait: 'assets/img/john-miller.png', name: 'John Miller', role: 'Head and Chief Investment Officer' },
    { img: 'assets/img/insight-hero-1.png', tag: 'Municipal Credit', date: '18 Jun 2026',
      title: 'The Case for Tax-Exempt Carry',
      desc: 'Why after-tax income still favors municipal credit for high-bracket clients, even late in the cycle.',
      portrait: 'assets/img/douglas-gimple.png', name: 'Douglas Gimple', role: 'Client Portfolio Manager' }
  ]},
  { label: 'Gold & Real Asset', items: [
    { img: 'assets/img/insight-hero-2.png', tag: 'Real Assets', date: '08 Jul 2026',
      title: 'Where Scarcity Meets Opportunity in Real Assets',
      desc: 'Supply constraints in energy, materials and land are re-pricing real assets. What that means for portfolios.',
      portrait: 'assets/img/matthew-mclennan.png', name: 'Matthew McLennan, CFA', role: 'Head of Global Value' },
    { img: 'assets/img/insight-hero-4.png', tag: 'Gold', date: '27 Jun 2026',
      title: 'Gold’s Strategic Role When Correlations Break',
      desc: 'Why we hold gold as a potential hedge, not a trade — and what it did the last four times markets cracked.',
      portrait: 'assets/img/julien-albertini.png', name: 'Julien Albertini', role: 'Deputy Head of Global Value' },
    { img: 'assets/img/insight-card-1.png', tag: 'Real Assets', date: '20 Jun 2026',
      title: 'Real Assets as an Inflation Anchor',
      desc: 'Infrastructure, commodities and gold as ballast when purchasing power is the risk that matters.',
      portrait: 'assets/img/christian-heck.png', name: 'Christian Heck, CFA', role: 'Deputy Head of Global Value and Portfolio Manager' }
  ]}
];

function initInsightsDeck4() {
  const slider = document.getElementById('ri4-slider');
  const tabsEl = document.getElementById('ri4-tabs');
  if (!slider || !tabsEl) return;
  let cat = 0, active = 0;
  const items = () => RI4_CATS[cat].items;
  const mod = i => ((i % items().length) + items().length) % items().length;

  /* tabs */
  RI4_CATS.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'ri4-tab' + (i === 0 ? ' active' : '');
    b.textContent = c.label;
    b.addEventListener('click', () => {
      if (i === cat) return;
      cat = i; active = 0;
      [...tabsEl.children].forEach((t, k) => t.classList.toggle('active', k === i));
      render(true);
    });
    tabsEl.appendChild(b);
  });

  function makePanel(it, i) {
    const el = document.createElement('article');
    el.className = 'ri4-panel' + (i === active ? ' expanded' : '');
    el.innerHTML = `
      <img class="ri4-bg" src="${it.img}" alt="" onerror="this.remove()">
      <div class="ri4-scrim"></div>
      <div class="ri4-darken"></div>
      <div class="ri4-tagchip">
        <span class="insight-tag">${it.tag}</span>
        <span class="ri4-date-chip">${it.date}</span>
      </div>
      <div class="ri4-info">
        <div class="ri4-copy">
          <p class="ri4-headline">${it.title}</p>
          <p class="ri4-desc">${it.desc}</p>
        </div>
        <div class="ri4-byrow">
          <div class="ri4-byline">
            <div class="insight-portrait"><img src="${it.portrait}" alt="" onerror="this.remove()"></div>
            <div class="insight-author">
              <p class="name">${it.name}</p>
              <p class="role">${it.role} &bull; First Eagle</p>
            </div>
          </div>
          <a class="btn btn--outline" href="#">Read Insight
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8h12M9 3l5 5-5 5"/></svg>
          </a>
        </div>
      </div>`;
    el.addEventListener('click', () => {
      if (!el.classList.contains('expanded')) setActive(i);
    });
    return el;
  }

  function render(stagger) {
    slider.innerHTML = '';
    items().forEach((it, i) => slider.appendChild(makePanel(it, i)));
    if (stagger) {
      gsap.fromTo(slider.children, { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.08, clearProps: 'transform' });
    }
  }

  function setActive(i) {
    active = mod(i);
    [...slider.children].forEach((p, k) => p.classList.toggle('expanded', k === active));
  }

  document.getElementById('ri4-next').addEventListener('click', () => setActive(active + 1));
  document.getElementById('ri4-prev').addEventListener('click', () => setActive(active - 1));

  let hover = false;
  [slider, document.querySelector('.ri4-arrows'), tabsEl].forEach(el => {
    el.addEventListener('mouseenter', () => hover = true);
    el.addEventListener('mouseleave', () => hover = false);
  });
  setInterval(() => {
    if (!hover && !document.hidden) setActive(active + 1);
  }, 4000);

  render(false);
}

/* ============================================================
   RETIREMENT INSIGHTS — tab-free version of the panel slider
   Uses the Market Outlook items from RI4_CATS[0].
   ============================================================ */
function initRtInsights() {
  const slider = document.getElementById('ri4-rt-slider');
  if (!slider) return;
  const items = RI4_CATS[0].items;
  const mod = i => ((i % items.length) + items.length) % items.length;
  let active = 0;

  function makePanel(it, i) {
    const el = document.createElement('article');
    el.className = 'ri4-panel' + (i === active ? ' expanded' : '');
    el.innerHTML = `
      <img class="ri4-bg" src="${it.img}" alt="" onerror="this.remove()">
      <div class="ri4-scrim"></div>
      <div class="ri4-darken"></div>
      <div class="ri4-tagchip">
        <span class="insight-tag">${it.tag}</span>
        <span class="ri4-date-chip">${it.date}</span>
      </div>
      <div class="ri4-info">
        <div class="ri4-copy">
          <p class="ri4-headline">${it.title}</p>
          <p class="ri4-desc">${it.desc}</p>
        </div>
        <div class="ri4-byrow">
          <div class="ri4-byline">
            <div class="insight-portrait"><img src="${it.portrait}" alt="" onerror="this.remove()"></div>
            <div class="insight-author">
              <p class="name">${it.name}</p>
              <p class="role">${it.role} &bull; First Eagle</p>
            </div>
          </div>
          <a class="btn btn--outline" href="#">Read Insight
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8h12M9 3l5 5-5 5"/></svg>
          </a>
        </div>
      </div>`;
    el.addEventListener('click', () => { if (!el.classList.contains('expanded')) setActive(i); });
    return el;
  }

  function render() {
    slider.innerHTML = '';
    items.forEach((it, i) => slider.appendChild(makePanel(it, i)));
  }

  function setActive(i) {
    active = mod(i);
    [...slider.children].forEach((p, k) => p.classList.toggle('expanded', k === active));
  }

  document.getElementById('ri4-rt-next').addEventListener('click', () => setActive(active + 1));
  document.getElementById('ri4-rt-prev').addEventListener('click', () => setActive(active - 1));

  let hover = false;
  [slider, document.querySelector('.ri4-arrows')].forEach(el => {
    if (!el) return;
    el.addEventListener('mouseenter', () => hover = true);
    el.addEventListener('mouseleave', () => hover = false);
  });
  setInterval(() => { if (!hover && !document.hidden) setActive(active + 1); }, 4000);

  render();
}

/* ============================================================
   TEAMS — infinite card carousel (standard track, no pinned slot)
   Cards are (gl-step − gutter) wide so their edges ride the same
   grid rhythm as the rest of the page. Anchored so a card's left
   edge sits at the side margin, with the previous card peeking in
   from the left viewport edge.
   ============================================================ */
const TEAM_ITEMS = [
  {
    banner: 'assets/img/team-small-cap.png',
    name: 'First Eagle Small Cap Team',
    desc: 'Opportunistic value in overlooked smaller companies, targeting underappreciated earnings recovery.',
    heads: [{ img: 'assets/img/bill-hench.png', name: 'Bill Hench', role: 'Head of Small Cap Team and Portfolio Manager' }]
  },
  {
    banner: 'assets/img/team-global-value.png',
    name: 'First Eagle Global Value Team',
    desc: 'Capital preservation first, through durable businesses bought with a margin of safety.',
    heads: [
      { img: 'assets/img/matthew-mclennan.png', name: 'Matthew McLennan, CFA', role: 'Head of Global Value' },
      { img: 'assets/img/julien-albertini.png', name: 'Julien Albertini', role: 'Deputy Head of Global Value' }
    ]
  },
  {
    banner: 'assets/img/team-muni.png',
    name: 'High Yield Municipal Credit Team',
    desc: 'Research-driven high yield municipal investing across market cycles, built by veteran muni specialists.',
    heads: [{ img: 'assets/img/john-miller.png', name: 'John Miller', role: 'Head and Chief Investment Officer' }]
  },
  {
    banner: 'assets/img/team-diamond-hill.png',
    name: 'Diamond Hill',
    desc: 'Valuation-driven US and international equity, long-short, and fixed income, managed with capacity discipline.',
    heads: [{ img: 'assets/img/heather-brilliant.png', name: 'Heather Brilliant', role: 'Chief Operating Officer' }]
  },
  {
    banner: 'assets/img/team-napier-park.png',
    name: 'Napier Park',
    desc: 'Institutional alternative credit across credit funds, CLOs, and real assets.',
    heads: [
      { img: 'assets/img/jim-obrien.png', name: 'Jim O’Brien', role: 'Managing Principal' },
      { img: 'assets/img/jon-dorfman.png', name: 'Jon Dorfman', role: 'Managing Principal' }
    ]
  }
];

function initTeams() {
  const track = document.getElementById('tm-carousel');
  if (!track) return;
  const N = TEAM_ITEMS.length;
  let first = 0;                       // leftmost fully-visible card index (finite, no wrap)

  const vpw = () => document.documentElement.clientWidth;
  const CARD_W = 320, CARD_GAP = 8;    // Sprint-1 fixed card width + gap
  const STEP = CARD_W + CARD_GAP;
  const TOTAL_W = N * STEP - CARD_GAP;            // full row width, all five cards
  const edge = () => Math.max(0, (vpw() - 1680) / 2);   // matches --max-w (1520 inner)
  const startX = () => edge() + 80;               // side margin
  const viewW = () => vpw() - 2 * startX();       // usable width between margins
  // static once all five fit from the left margin to the viewport edge
  // (carousels may bleed right) — crosses over around vpw 1744
  const isStatic = () => TOTAL_W <= vpw() - startX();
  const maxShift = () => Math.max(0, TOTAL_W - viewW());  // card 5 stops at the right margin
  const fMax = () => Math.ceil(maxShift() / STEP);        // last reachable "first" index

  function makeCard(it) {
    const el = document.createElement('article');
    el.className = 'team-card';
    const company = it.name.startsWith('First Eagle') ? 'First Eagle' : it.name;
    el.innerHTML = `
      <div class="team-front">
        <div class="team-banner"><img src="${it.banner}" alt="" onerror="this.remove()"></div>
        <div class="team-content">
          <div class="team-copy">
            <p class="team-name">${it.name}</p>
            <p class="team-desc">${it.desc}</p>
          </div>
          <svg class="team-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16M13 5l7 7-7 7"/></svg>
        </div>
      </div>
      <div class="team-back">
        <p class="team-back-desc">${it.desc}</p>
        <div class="team-heads">
          ${it.heads.map(h => `
            <div class="insight-byline">
              <div class="insight-portrait"><img src="${h.img}" alt="" onerror="this.remove()"></div>
              <div class="insight-author">
                <p class="name">${h.name}</p>
                <p class="role">${h.role} &bull; ${company}</p>
              </div>
            </div>`).join('')}
        </div>
      </div>`;
    track.appendChild(el);
    return el;
  }

  function cards() { return [...track.querySelectorAll('.team-card')]; }

  /* stepper dots — one per team; "current" = the card at the side margin (slot 1) */
  const tmDots = document.getElementById('tm-dots');
  TEAM_ITEMS.forEach(() => {
    const d = document.createElement('span');
    d.className = 'mv-dot';
    tmDots.appendChild(d);
  });
  function updateTmDots() {
    [...tmDots.children].forEach((d, i) => d.classList.toggle('active', i === first));
  }

  const prevBtn = document.getElementById('tm-prev');
  const nextBtn = document.getElementById('tm-next');
  const arrowsRow = document.querySelector('#teams .tm-arrows');

  /* place all five cards for the current mode:
     static (all fit) — row starts at the margin, controls hidden;
     finite carousel — shift by `first` steps, clamped so card 5
     parks at the right margin; arrows disable at the ends */
  function position(animate) {
    const shift = isStatic() ? 0 : Math.min(first * STEP, maxShift());
    cards().forEach((c, i) => {
      const x = startX() + i * STEP - shift;
      (animate ? gsap.to : gsap.set)(c, { x, duration: 0.6, ease: 'power3.inOut' });
    });
    arrowsRow.style.display = isStatic() ? 'none' : 'flex';
    prevBtn.disabled = first <= 0;
    nextBtn.disabled = first >= fMax();
    updateTmDots();
  }

  function go(dir) {
    const f = Math.max(0, Math.min(fMax(), first + dir));
    if (f === first) return;
    first = f;
    position(true);
  }

  function render() {
    track.innerHTML = '';
    TEAM_ITEMS.forEach(makeCard);
    position(false);
    layoutTeams();
  }

  /* fixed 360px cards (front/back are absolute layers, so height can't
     derive from content); adaptive carousel top (84px below the header
     block, per the comp's rhythm); paddles+dots 24px below the cards */
  function layoutTeams() {
    const section = document.getElementById('teams');
    const headerH = section.querySelector('.tm-header').offsetHeight;
    const top = 90 + headerH + 84;
    track.style.top = top + 'px';
    const h = 360;
    track.style.height = h + 'px';
    const arrowsTop = top + h + 24;
    section.querySelector('.tm-arrows').style.top = arrowsTop + 'px';
    // no controls row to reserve space for in static mode
    section.style.height = (arrowsTop + (isStatic() ? 0 : 40) + 64) + 'px';
    ScrollTrigger.refresh();
  }

  nextBtn.addEventListener('click', () => go(1));
  prevBtn.addEventListener('click', () => go(-1));
  window.addEventListener('resize', () => {
    first = Math.max(0, Math.min(fMax(), first));  // re-clamp for the new width
    position(false);
    layoutTeams();
  });
  window.addEventListener('load', layoutTeams);
  render();
}

/* ============================================================
   WHY FEI — vertical infinite testimonial carousel
   Three visible slots (faded/active/faded) + offscreen buffers.
   Arrows advance one testimonial; clicks queue like the others.
   ============================================================ */
const WF_ITEMS = [
  {
    quote: '“I can explain their philosophy to a client in two sentences, and it still holds up when the client’s engineer son-in-law starts asking questions.”',
    cite: 'Senior Wealth Advisor, Regional Broker-Dealer'
  },
  {
    quote: '“When markets fell apart in 2022, First Eagle was the one holding I never had to apologize for.”',
    cite: 'Financial Advisor, Independent RIA'
  },
  {
    quote: '“Their downside discipline is the reason my retirees stayed invested through two drawdowns.”',
    cite: 'Financial Planner, Bank Trust Department'
  }
];

function initWhyFei() {
  const track = document.getElementById('wf-carousel');
  if (!track) return;
  const SLOT_Y = { '-1': -420, 0: -55, 1: 259, 2: 608, 3: 980 };  // 1 = active
  let first = 0;                        // item index of slot 0 (top)
  let animating = false;
  const mod = i => ((i % WF_ITEMS.length) + WF_ITEMS.length) % WF_ITEMS.length;

  function makeQuote(itemIdx, slot) {
    const it = WF_ITEMS[mod(itemIdx)];
    const el = document.createElement('figure');
    el.className = 'wf-quote' + (slot === 1 ? ' active' : '');
    el.dataset.slot = slot;
    el.innerHTML = `<blockquote>${it.quote}</blockquote><cite>${it.cite}</cite>`;
    gsap.set(el, { y: SLOT_Y[slot] });
    track.appendChild(el);
    return el;
  }
  const quotes = () => [...track.querySelectorAll('.wf-quote')];

  for (let s = 0; s <= 2; s++) makeQuote(first + s, s);

  function slide(dir, dur = 0.6) {      // +1: advance (moves up), -1: back
    if (animating) return; animating = true;
    first = mod(first + dir);
    if (dir > 0) makeQuote(first + 2, 3);
    else makeQuote(first, -1);
    const tl = gsap.timeline({ onComplete() {
      quotes().filter(q => +q.dataset.slot < 0 || +q.dataset.slot > 2).forEach(q => q.remove());
      animating = false;
      wfPump();
    }});
    quotes().forEach(q => {
      const ns = +q.dataset.slot - dir;
      q.dataset.slot = ns;
      q.classList.toggle('active', ns === 1);
      tl.to(q, { y: SLOT_Y[ns] ?? (ns < 0 ? -420 : 980), duration: dur, ease: 'power3.inOut' }, 0);
    });
  }

  const wfQueue = [];
  function wfPump() {
    if (animating || !wfQueue.length) return;
    slide(wfQueue.shift(), wfQueue.length ? 0.32 : 0.6);
  }
  document.getElementById('wf-next').addEventListener('click', () => { wfQueue.push(1); wfPump(); });
  document.getElementById('wf-prev').addEventListener('click', () => { wfQueue.push(-1); wfPump(); });

  /* auto-scroll every 3s; hovering the testimonial area (or arrows) pauses it */
  let wfHover = false;
  [track, document.querySelector('.wf-arrows')].forEach(el => {
    el.addEventListener('mouseenter', () => wfHover = true);
    el.addEventListener('mouseleave', () => wfHover = false);
  });
  setInterval(() => {
    if (!wfHover && !animating && !wfQueue.length && !document.hidden) slide(1);
  }, 3000);
}

/* ============================================================
   SHARED TOPO BACKGROUND — undulating contour engine
   ------------------------------------------------------------
   Ported from the fei-concept-v2 prototype (canvas 2D, no
   three.js): a scalar field of Gaussian hills + a time-driven
   sine warp, contoured by marching squares and projected with
   a tilting camera. Formations morph as the user scrolls
   through the shared-background modules; pointer movement adds
   subtle yaw/pitch. Fade + blur ramp in near the funds video.
   ============================================================ */
function initTopoBackground() {
  const canvas = document.getElementById('topo-bg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const H = (x, y, a, rx, ry) => ({ x, y, a, rx, ry });
  const Z = H(0, 0, 0, 3, 3);

  /* formations share nearly the same terrain field — the sequence is driven
     by camera movement (pitch/yOff/yaw) rather than the hills morphing */
  const BASE_HILLS = [ H(-3.4,-1.2, 1.7, 3.4, 2.8), H(3.6, 1.3, 1.3, 3.1, 3.5),
                        H(0.3, 2.9,-1.0, 4.2, 2.6), H(5.2,-2.6, 0.7, 2.6, 2.4), Z, Z ];
  const FORMATIONS = [
    { f: { hills: BASE_HILLS, warp: 0.04, flow: 0.02, tilt: 0.05 }, cam: { deg: 11, yOff: 320, yaw: 0 } },
    { f: { hills: BASE_HILLS, warp: 0.035, flow: 0.018, tilt: 0.04 }, cam: { deg: 65, yOff: 380, yaw: -0.5236 } },
  ];

  const CELL = 10, WORLD_H = 12, WORLD_W = 20, OVER = 0.4;   // WORLD_W: x-units across the full width
  let W = 0, Hgt = 0, DPR = 1, cols = 0, rows = 0, wpp = 1, wppX = 1, OX = 0, OY = 0;
  let FOCAL = 1350;   // set in resize(): scales with width so the field renders full-bleed
  let field = new Float32Array(0);
  let warpedX = new Float32Array(0), warpedY = new Float32Array(0), detailF = new Float32Array(0), maskF = new Float32Array(0);

  /* seeded value-noise fBm — the terrain texture (static: it shapes the
     lines without adding motion) */
  const nseed = (() => { let a = 90210 >>> 0; return () => (a = (a * 1664525 + 1013904223) >>> 0) / 4294967296; })();
  const NN = 256, NMASK = 255, nvals = new Float32Array(NN * NN);
  for (let i = 0; i < nvals.length; i++) nvals[i] = nseed();
  const nfade = t => t * t * (3 - 2 * t);
  function vnoise(x, y) {
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    const ix0 = x0 & NMASK, iy0 = y0 & NMASK, ix1 = (x0 + 1) & NMASK, iy1 = (y0 + 1) & NMASK;
    const v00 = nvals[iy0 * NN + ix0], v10 = nvals[iy0 * NN + ix1];
    const v01 = nvals[iy1 * NN + ix0], v11 = nvals[iy1 * NN + ix1];
    const ux = nfade(fx), uy = nfade(fy);
    const a = v00 + (v10 - v00) * ux, b = v01 + (v11 - v01) * ux;
    return a + (b - a) * uy;
  }
  function fbm(x, y, oc) {
    let amp = 1, f = 1, s = 0, n = 0;
    for (let o = 0; o < oc; o++) { s += amp * vnoise(x * f, y * f); n += amp; amp *= 0.5; f *= 2; }
    return s / n - 0.5;
  }

  const LEVELS = [];
  for (let L = -1.4; L <= 3.05; L += 0.09) LEVELS.push(L);
  const PEAK_LEVEL = 1.55;
  const LINE_COLOR = 'rgba(147,174,193,0.16)';
  const PEAK_COLOR = 'rgba(0,104,252,0.31)';
  const ACCENT_COLOR = 'rgba(0,238,255,0.18)';   // accent cyan index contours
  const ACCENT_LEVELS = new Set([19, 34]);        // two lines thread through in cyan

  function resize() {
    W = window.innerWidth; Hgt = window.innerHeight;
    if (!W || !Hgt) return;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(Hgt * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = Hgt + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    OX = Math.round(W * OVER);
    OY = Math.round(Hgt * OVER);
    cols = Math.ceil((W + 2 * OX) / CELL);
    rows = Math.ceil((Hgt + 2 * OY) / CELL);
    wpp = WORLD_H / Hgt;
    wppX = WORLD_W / W;   // independent x-scale: formations always span the full width
    FOCAL = W * 0.9375;   // 1350 @1440 reference, proportional elsewhere
    const n = (cols + 1) * (rows + 1);
    field = new Float32Array(n);
    warpedX = new Float32Array(n); warpedY = new Float32Array(n); detailF = new Float32Array(n); maskF = new Float32Array(n);
    // domain warp bends the hill rings into kidney/terrace shapes;
    // detail fBm adds ridges, sub-peaks and pinched slopes
    let idx = 0;
    for (let j = 0; j <= rows; j++) {
      const wy = (j * CELL - OY - Hgt / 2) * wpp;
      for (let i = 0; i <= cols; i++) {
        const wx = (i * CELL - OX - W / 2) * wppX;
        warpedX[idx] = wx + fbm(wx * 0.22 + 13.7, wy * 0.22 + 4.2, 3) * 3.2;
        warpedY[idx] = wy + fbm(wx * 0.22 + 71.3, wy * 0.22 + 29.8, 3) * 3.2;
        detailF[idx] = fbm(wx * 0.4, wy * 0.4, 3) * 0.6;   // gentler, rounder detail
        // plains mask: 0 = flat quiet zone (no contours), 1 = full terrain
        const m = fbm(wx * 0.085 + 5.1, wy * 0.085 + 9.7, 2) + 0.5;
        const e = Math.max(0, Math.min(1, (m - 0.34) / (0.66 - 0.34)));
        maskF[idx] = e * e * (3 - 2 * e);
        idx++;
      }
    }
  }
  window.addEventListener('resize', resize);
  resize();

  function cloneF(f) { return { hills: f.hills.map(h => ({ ...h })), warp: f.warp, flow: f.flow, tilt: f.tilt }; }
  const lp = (a, b, e) => a + (b - a) * e;

  const D2R = Math.PI / 180;
  const CAM_DIST = 22, H_SCALE = 1.2, BASE_L = 0.7;
  const ANCHOR_Y = 0.35, YOFF_SCALE = 0.5;   // vertical anchor: keeps the field at the top

  let live = cloneF(FORMATIONS[0].f);
  let pitch = FORMATIONS[0].cam.deg * D2R;
  let yOff = FORMATIONS[0].cam.yOff;
  let camYaw = FORMATIONS[0].cam.yaw;
  let mouseYaw = 0;

  // Continuous keyframe interpolation — camera + field params are a direct,
  // zero-delay function of scroll progress (no step thresholds, no tween
  // duration to wait out). Keyframes are evenly spaced across FORMATIONS.
  const KEY_T = FORMATIONS.map((_, i) => i / (FORMATIONS.length - 1));
  function paramsAtScroll(p) {
    let k = 0;
    while (k < KEY_T.length - 2 && p > KEY_T[k + 1]) k++;
    const t0 = KEY_T[k], t1 = KEY_T[k + 1];
    const e = t1 > t0 ? (p - t0) / (t1 - t0) : 0;
    const A = FORMATIONS[k], B = FORMATIONS[k + 1];
    live = { hills: A.f.hills, warp: lp(A.f.warp, B.f.warp, e), flow: lp(A.f.flow, B.f.flow, e), tilt: lp(A.f.tilt, B.f.tilt, e) };
    pitch = lp(A.cam.deg, B.cam.deg, e) * D2R;
    yOff = lp(A.cam.yOff, B.cam.yOff, e);
    camYaw = lp(A.cam.yaw, B.cam.yaw, e);
  }

  function computeField(P, t) {
    const hs = P.hills, nh = hs.length;
    let idx = 0;
    for (let j = 0; j <= rows; j++) {
      for (let i = 0; i <= cols; i++) {
        const wx = warpedX[idx], wy = warpedY[idx];   // warped domain: organic rings
        let v = P.tilt * wy + detailF[idx];            // static terrain detail
        for (let k = 0; k < nh; k++) {
          const h = hs[k];
          if (h.a === 0) continue;
          const dx = (wx - h.x) / h.rx;
          const dy = (wy - h.y) / h.ry;
          v += h.a * Math.exp(-0.5 * (dx*dx + dy*dy));
        }
        v += P.warp * Math.sin(wx * 0.55 + t * P.flow) * Math.cos(wy * 0.5 - t * P.flow * 0.8);
        // flatten toward a between-levels constant in the quiet zones:
        // flat field = no contour crossings = open breathing room
        field[idx] = 0.03 + (v - 0.03) * maskF[idx];
        idx++;
      }
    }
  }

  function tr(va, vb, L) { const d = vb - va; return Math.abs(d) < 1e-6 ? 0.5 : (L - va) / d; }

  let cosP = 1, sinP = 0, cosY = 1, sinY = 0, PX = 0, PY = 0;
  function proj(px, py, L) {
    const wx = (px - W / 2) * wppX;
    const wy = (py - Hgt / 2) * wpp;
    const wz = (L - BASE_L) * H_SCALE;
    const x1 = wx * cosY - wy * sinY;
    const y1 = wx * sinY + wy * cosY;
    const y2 = y1 * cosP - wz * sinP;
    const z2 = y1 * sinP + wz * cosP;
    const s = FOCAL / (z2 + CAM_DIST);
    PX = W / 2 + x1 * s;
    // anchored high: the field hugs the viewport top regardless of which
    // formation's camera offset is live (ANCHOR_Y + damped yOff)
    PY = Hgt * ANCHOR_Y + y2 * s + yOff * YOFF_SCALE;
  }
  function seg(ax, ay, bx, by, L) {
    proj(ax, ay, L); const mx = PX, my = PY;
    proj(bx, by, L);
    ctx.moveTo(mx, my); ctx.lineTo(PX, PY);
  }

  function drawContours() {
    const stride = cols + 1;
    for (let li = 0; li < LEVELS.length; li++) {
      const L = LEVELS[li];
      ctx.beginPath();
      for (let j = 0; j < rows; j++) {
        const rowTop = j * stride;
        const rowBot = rowTop + stride;
        const y0 = j * CELL - OY, y1 = y0 + CELL;
        for (let i = 0; i < cols; i++) {
          const a = field[rowTop + i];
          const b = field[rowTop + i + 1];
          const c = field[rowBot + i + 1];
          const d = field[rowBot + i];
          let cse = 0;
          if (a > L) cse |= 1;
          if (b > L) cse |= 2;
          if (c > L) cse |= 4;
          if (d > L) cse |= 8;
          if (cse === 0 || cse === 15) continue;
          const x0 = i * CELL - OX, x1 = x0 + CELL;
          const Tx = x0 + CELL * tr(a, b, L);
          const Ry = y0 + CELL * tr(b, c, L);
          const Bx = x0 + CELL * tr(d, c, L);
          const Ly = y0 + CELL * tr(a, d, L);
          switch (cse) {
            case 1: case 14: seg(x0, Ly, Tx, y0, L); break;
            case 2: case 13: seg(Tx, y0, x1, Ry, L); break;
            case 3: case 12: seg(x0, Ly, x1, Ry, L); break;
            case 4: case 11: seg(x1, Ry, Bx, y1, L); break;
            case 6: case 9:  seg(Tx, y0, Bx, y1, L); break;
            case 7: case 8:  seg(x0, Ly, Bx, y1, L); break;
            case 5:
              if ((a + b + c + d) * 0.25 > L) { seg(Tx, y0, x1, Ry, L); seg(Bx, y1, x0, Ly, L); }
              else { seg(x0, Ly, Tx, y0, L); seg(x1, Ry, Bx, y1, L); }
              break;
            case 10:
              if ((a + b + c + d) * 0.25 > L) { seg(x0, Ly, Tx, y0, L); seg(x1, Ry, Bx, y1, L); }
              else { seg(Tx, y0, x1, Ry, L); seg(Bx, y1, x0, Ly, L); }
              break;
          }
        }
      }
      if (ACCENT_LEVELS.has(li)) {
        ctx.strokeStyle = ACCENT_COLOR;
        ctx.lineWidth = 1.1;
      } else {
        ctx.strokeStyle = L >= PEAK_LEVEL ? PEAK_COLOR : LINE_COLOR;
        ctx.lineWidth = L >= PEAK_LEVEL ? 1.05 : 0.85;
      }
      ctx.stroke();
    }
  }

  let mouseX = 0, mouseY = 0;
  window.addEventListener('pointermove', (e) => {
    mouseX = (e.clientX / W - 0.5) * 2;
    mouseY = (e.clientY / Hgt - 0.5) * 2;
  });

  /* scroll: formations morph across the shared-background stretch,
     and the canvas fades + blurs as the funds video approaches */
  function scrollSpanPx() {
    const funds = document.getElementById('our-funds');
    const end = funds ? funds.offsetTop + funds.offsetHeight - window.innerHeight : window.innerHeight * 3;
    return Math.max(1, end);
  }
  let scrollP = 0;
  // the camera finishes its move over the first 55% of the shared-background
  // stretch, so it tracks scroll gradually rather than snapping quickly
  const CAM_RANGE = 0.55;
  lenis.on('scroll', ({ scroll }) => {
    scrollP = Math.min(1, scroll / scrollSpanPx());
    paramsAtScroll(Math.min(1, scrollP / CAM_RANGE));
    const f = Math.max(0, (scrollP - 0.7) / 0.3);
    canvas.style.opacity = (1 - f).toFixed(3);
    canvas.style.filter = 'blur(' + (f * 14).toFixed(2) + 'px)';
  });

  function frame(t) {
    const TIME_PERIOD = 78.54;
    const time = reduceMotion ? 0 : (t * 0.001) % TIME_PERIOD;
    mouseYaw += (mouseX * 0.04 - mouseYaw) * 0.03;
    const totalYaw = camYaw + mouseYaw;
    const pitchView = pitch + (reduceMotion ? 0 : mouseY * 0.015);
    cosP = Math.cos(pitchView); sinP = Math.sin(pitchView);
    cosY = Math.cos(totalYaw); sinY = Math.sin(totalYaw);
    if (W && Hgt) {
      computeField(live, time);
      ctx.clearRect(0, 0, W, Hgt);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      drawContours();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

document.addEventListener('DOMContentLoaded', () => {
  const btt = document.getElementById('back-to-top');
  if (btt) btt.addEventListener('click', () => lenis.scrollTo(0, { duration: 1.4 }));
  initSlideFades();
  initTickUps();
  initFades();
  initNavSheet();
  initProductTicker();
  initFundFilter();
  initMarketViews();
  initInsightsDeck4();
  initRtInsights();
  initSmallCapViews();
  initTeams();
  initWhyFei();
  initTopoBackground();
  initLeadershipCarousel();
  initAboutSubnav();
  initAboutHistory();
});

function initAboutSubnav() {
  const nav = document.querySelector('.ab-subnav');
  if (!nav) return;
  const links = [...nav.querySelectorAll('.ab-subnav-item')];
  const sections = links.map(a => document.querySelector(a.getAttribute('href')));

  links.forEach((a, i) => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const target = sections[i];
      if (!target) return;
      const y = target.getBoundingClientRect().top + window.scrollY - nav.offsetHeight;
      lenis.scrollTo(y, { duration: 1.2 });
    });
  });

  const setActive = idx => links.forEach((a, i) => a.classList.toggle('ab-subnav-item--active', i === idx));
  const onScroll = () => {
    const navH = nav.offsetHeight;
    let idx = 0;
    sections.forEach((s, i) => {
      if (s && s.getBoundingClientRect().top - navH <= 1) idx = i;
    });
    setActive(idx);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ============================================================
   ABOUT PAGE — leadership carousel ("Our legacy")
   Reuses the same sliding-filmstrip mechanic as #market-views
   (.mv-carousel): translateX'd cards, GSAP cross-dissolve on
   next/prev, auto-advance, dots. No-op if #lg-carousel is
   absent, so this has zero effect on index.html.
   ============================================================ */
const LG_ITEMS = [
  { img: 'assets/img/about-leader-mclennan.png', name: 'Matthew McLennan', role: 'Head of Global Value Team and Portfolio Manager • First Eagle' },
  { img: 'assets/img/about-leader-hench.png', name: 'Bill Hench', role: 'Head of Small Cap Team and Portfolio Manager • First Eagle' },
  { img: 'assets/img/about-leader-albertini.png', name: 'Julien Albertini', role: 'Deputy Head of Global Value and Portfolio Manager • First Eagle' },
  { img: 'assets/img/about-leader-mclennan.png', name: 'Matthew McLennan', role: 'Head of Global Value Team and Portfolio Manager • First Eagle' },
  { img: 'assets/img/about-leader-hench.png', name: 'Bill Hench', role: 'Head of Small Cap Team and Portfolio Manager • First Eagle' },
  { img: 'assets/img/about-leader-albertini.png', name: 'Julien Albertini', role: 'Deputy Head of Global Value and Portfolio Manager • First Eagle' }
];

function initLeadershipCarousel() {
  const track = document.getElementById('lg-carousel');
  if (!track) return;
  const BUFFER = 5;
  let firstIndex = 0;
  let animating = false;
  const mod = i => ((i % LG_ITEMS.length) + LG_ITEMS.length) % LG_ITEMS.length;

  function step() {
    // fixed 296px leader-portrait card, unlike the 3-col responsive
    // market-views card — this carousel sits in a narrower fixed column
    return 296 + 32;
  }

  function makeCard(itemIdx, slot, isActive = slot === 0) {
    const it = LG_ITEMS[mod(itemIdx)];
    const el = document.createElement('article');
    el.className = 'lg-card' + (isActive ? ' active' : '');
    el.dataset.slot = slot;
    el.innerHTML = `
      <div class="lg-portrait"><img src="${it.img}" alt="${it.name}" onerror="this.remove()"></div>
      <div>
        <p class="lg-name">${it.name}</p>
        <p class="lg-role">${it.role}</p>
      </div>`;
    gsap.set(el, { x: slot * step(), zIndex: slot === 0 ? 1 : 2 });
    track.appendChild(el);
    return el;
  }

  for (let s = 0; s <= BUFFER; s++) makeCard(firstIndex + s, s);

  function cards() { return [...track.querySelectorAll('.lg-card')]; }

  const dotsWrap = document.getElementById('lg-dots');
  LG_ITEMS.forEach(() => {
    const d = document.createElement('span');
    d.className = 'mv-dot';
    dotsWrap.appendChild(d);
  });
  function updateDots() {
    [...dotsWrap.children].forEach((d, i) => d.classList.toggle('active', i === mod(firstIndex)));
  }
  updateDots();

  function next(dur = 0.65) {
    if (animating) return; animating = true;
    firstIndex = mod(firstIndex + 1);
    updateDots();
    const all = cards();
    const dying = all.find(c => +c.dataset.slot === 0);
    dying.classList.remove('active');
    dying.style.zIndex = 0;
    const movers = all.filter(c => +c.dataset.slot >= 1);
    let incoming = null;
    const tl = gsap.timeline({ onComplete() {
      if (incoming) incoming.classList.add('active');
      dying.remove(); animating = false;
      lgPump();
    }});
    tl.to(dying, { opacity: 0, duration: dur, ease: 'power3.inOut' }, 0);
    movers.forEach(c => {
      const newSlot = +c.dataset.slot - 1;
      c.dataset.slot = newSlot;
      if (newSlot === 0) incoming = c;
      tl.to(c, { x: newSlot * step(), duration: dur, ease: 'power3.inOut' }, 0);
    });
    makeCard(firstIndex + BUFFER, BUFFER);
  }

  function prev(dur = 0.65) {
    if (animating) return; animating = true;
    firstIndex = mod(firstIndex - 1);
    updateDots();
    const reveal = makeCard(firstIndex, 0, false);
    reveal.style.zIndex = 0;
    const movers = cards().filter(c => c !== reveal);
    const tl = gsap.timeline({ onComplete() {
      cards().filter(k => +k.dataset.slot > BUFFER).forEach(k => k.remove());
      reveal.classList.add('active');
      reveal.style.zIndex = 1;
      animating = false;
      lgPump();
    }});
    movers.forEach(c => {
      const newSlot = +c.dataset.slot + 1;
      c.dataset.slot = newSlot;
      if (newSlot === 1) c.classList.remove('active');
      tl.to(c, { x: newSlot * step(), duration: dur, ease: 'power3.inOut' }, 0);
    });
  }

  const lgQueue = [];
  function lgPump() {
    if (animating || !lgQueue.length) return;
    const dir = lgQueue.shift();
    const dur = lgQueue.length ? 0.35 : 0.65;
    dir > 0 ? next(dur) : prev(dur);
  }
  document.getElementById('lg-next').addEventListener('click', () => { lgQueue.push(1); lgPump(); });
  document.getElementById('lg-prev').addEventListener('click', () => { lgQueue.push(-1); lgPump(); });

  let lgHover = false;
  [track, document.querySelector('.lg-arrows')].forEach(el => {
    el.addEventListener('mouseenter', () => lgHover = true);
    el.addEventListener('mouseleave', () => lgHover = false);
  });
  setInterval(() => {
    if (!lgHover && !animating && !lgQueue.length && !document.hidden) next();
  }, 3000);

  window.addEventListener('resize', () => {
    cards().forEach(c => gsap.set(c, { x: (+c.dataset.slot) * step() }));
  });
}

/* ============================================================
   ABOUT PAGE — heritage timeline ("Built on conviction since 1864")
   Figma: 3088:17000 (Overview) / 3039:62437 (1864) / 3039:62697 (1928)

   A horizontal filmstrip of year groups that translates so the active
   group is centered in the stage — derived from Figma, where the 952px
   1864 group sits at x=244 in a 1440 frame: (1440-952)/2 = 244.

   Tab 0 is Overview (the grid layout); tabs 1..n map to AH_ITEMS.
   Active/inactive colouring is CSS class-driven (see .ab-history-item.active),
   matching how .ab-subnav-item--active and .lg-card.active already work.
   No-ops if #ab-history-strip is absent, so index.html is unaffected.
   ============================================================ */
const AH_ITEMS = [
  { year: '1864', title: 'Gebr. Arnhold (Arnhold Brothers) founded in Dresden',
    desc: 'The firm financed a range of local businesses, including brewers.',
    img: 'assets/img/timeline-1864.png' },
  { year: '1928', title: 'Acquired Adler Bank in Switzerland',
    desc: 'Adler means “Eagle” in German, and ultimately served as the basis of the company’s future renaming as “First Eagle.”' },
  { year: '1931', title: 'Arnhold and S. Bleichroeder formed in Berlin',
    desc: 'The combination of two storied banks created one of the leading merchant and investment banks in Europe.',
    img: 'assets/img/timeline-1931.png' },
  { year: '1937', title: 'All business activities moved to New York City',
    desc: 'Faced by the realities of a deteriorating global political and economic environment, the firm relocated to New York.',
    img: 'assets/img/timeline-1937.png' },
  { year: '1967', title: 'Launched first offshore fund, First Eagle Fund N.V.',
    desc: 'The firm moved beyond managing the wealth of family and friends and began investing on behalf of external clients.',
    img: 'assets/img/timeline-1967.png' },
  { year: '1979', title: 'Creation of Global Value strategy by Jean-Marie Eveillard',
    desc: 'Jean-Marie would later join First Eagle through the 1999 acquisition of Société Générale Asset Management Corp.',
    img: 'assets/img/timeline-1979.png' },
  { year: '1987', title: 'Established first US-registered mutual fund, First Eagle Fund of America',
    img: 'assets/img/timeline-1987.png' },
  { year: '1999', title: 'Acquired majority share of Société Générale Asset Management Corp.',
    desc: 'Forming what is now our Global Value team, this acquisition solidified the firm’s commitment to a prudent approach to investing characterized by patience, humility and conviction.',
    img: 'assets/img/timeline-1999.png' },
  { year: '2002', title: 'Sold investment banking and global securities businesses',
    desc: 'Divestment reoriented the firm’s focus exclusively on investment management.' },
  { year: '2009', title: 'Renamed First Eagle Investment Management',
    img: 'assets/img/timeline-2009.png' },
  { year: '2011', title: 'Introduced high yield credit capability',
    desc: 'Hiring of team expanded the firm’s investment lineup into fixed income.' },
  { year: '2015', title: 'Private equity funds managed by Blackstone Capital Partners and Corsair Capital invest in the firm',
    desc: 'The long-term investment of these companies ensured a continuation of First Eagle’s investment culture and philosophy.',
    img: 'assets/img/timeline-2015.png' },
  { year: '2017', title: 'Acquired private credit manager NewStar Financial',
    desc: 'Acquisition marked expansion of investment capabilities into the alternative credit space.' },
  { year: '2020', title: 'Acquired alternative credit manager THL Credit, forming Alternative Credit team',
    desc: 'Acquisition bolstered First Eagle’s position as one of the leading managers of broadly syndicated loan and direct-lending strategies.' },
  { year: '2021', title: 'Renamed First Eagle Investments and established Small Cap team',
    desc: 'Experienced team brought a time-tested, opportunistic approach to active management in a particularly inefficient market.',
    img: 'assets/img/timeline-2021.png' },
  { year: '2022', title: 'Acquired Napier Park Global Capital',
    desc: 'Acquisition significantly broadens alternative credit capabilities including opportunistic credit.',
    img: 'assets/img/timeline-2022.svg', logo: true },
  { year: '2023', title: 'Established High Yield Municipal Credit Team',
    desc: 'Launch to expand the firm’s fixed income footprint into municipal credit, a key asset class for a range of retail and institutional investors in the US.' },
  { year: '2025', title: 'Private equity funds managed by Genstar Capital make majority investment in the firm',
    desc: 'The investment preserves First Eagle’s independence and investment-led culture while accelerating organic and inorganic growth.' },
  { year: '2026', title: 'Acquired Diamond Hill Investment Group',
    desc: 'Acquisition expanded footprint in traditional fixed income while augmenting US-focused multi-cap equity capabilities.' }
];

function initAboutHistory() {
  const strip = document.getElementById('ab-history-strip');
  if (!strip) return;
  const stage = document.querySelector('.ab-history-stage');
  const tabsWrap = document.getElementById('ab-history-tabs');

  strip.innerHTML = AH_ITEMS.map(it => `
    <div class="ab-history-item" data-year="${it.year}">
      <div class="ab-history-card">
        <p class="ab-history-year">${it.year}</p>
        <div class="ab-history-item-copy">
          <h3 class="ab-history-item-title">${it.title}</h3>
          ${it.desc ? `<p class="ab-history-item-desc">${it.desc}</p>` : ''}
        </div>
      </div>
      ${it.img ? `<div class="ab-history-item-img${it.logo ? ' ab-history-item-img--logo' : ''}"><img src="${it.img}" alt=""></div>` : ''}
    </div>`).join('');

  tabsWrap.innerHTML = ['Overview', ...AH_ITEMS.map(i => i.year)]
    .map(label => `<button type="button" class="ab-history-tab">${label}</button>`).join('');

  const items = [...strip.querySelectorAll('.ab-history-item')];
  const tabs = [...tabsWrap.querySelectorAll('.ab-history-tab')];
  let active = 0;
  let transitioning = false;

  const overview = stage.querySelector('.ab-history-overview');
  const stripWrap = stage.querySelector('.ab-history-strip-wrap');

  /* x that centers a year group in the stage */
  const xFor = i => stage.clientWidth / 2 - (items[i].offsetLeft + items[i].offsetWidth / 2);

  function setActiveYear(y) {
    items.forEach((el, i) => el.classList.toggle('active', i === y));
  }

  function show(idx, animate = true) {
    if (transitioning && animate) return;
    const prev = active;
    active = idx;
    tabs.forEach((t, i) => t.classList.toggle('ab-history-tab--active', i === idx));

    if (!animate) {
      if (idx === 0) {
        stage.dataset.mode = 'overview';
        gsap.set(overview, { opacity: 1, x: 0 });
        gsap.set(stripWrap, { opacity: 0, x: 0 });
      } else {
        stage.dataset.mode = 'timeline';
        setActiveYear(idx - 1);
        gsap.set(strip, { x: xFor(idx - 1) });
        gsap.set(overview, { opacity: 0, x: 0 });
        gsap.set(stripWrap, { opacity: 1, x: 0 });
      }
      return;
    }

    transitioning = true;

    if (idx === 0) {
      // timeline → overview: strip slides right out, overview slides in from left
      gsap.to(stripWrap, { opacity: 0, x: 60, duration: 0.35, ease: 'power2.in',
        onComplete() {
          stage.dataset.mode = 'overview';
          gsap.set(stripWrap, { x: 0 });
          gsap.fromTo(overview,
            { opacity: 0, x: -50 },
            { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out', onComplete() { transitioning = false; } });
        }
      });
    } else if (prev === 0) {
      // overview → year: overview slides left out, timeline slides in from right
      gsap.to(overview, { opacity: 0, x: -50, duration: 0.35, ease: 'power2.in',
        onComplete() {
          stage.dataset.mode = 'timeline';
          setActiveYear(idx - 1);
          gsap.set(strip, { x: xFor(idx - 1) });
          gsap.fromTo(stripWrap,
            { opacity: 0, x: 60 },
            { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out', onComplete() {
              gsap.set(overview, { x: 0 }); // reset for next time
              transitioning = false;
            }});
        }
      });
    } else {
      // year → year: slide strip
      setActiveYear(idx - 1);
      gsap.to(strip, { x: xFor(idx - 1), duration: 0.9, ease: 'power3.inOut',
        onComplete() { transitioning = false; }
      });
    }
  }

  /* Set initial state without animation */
  gsap.set(overview, { opacity: 1, x: 0 });
  gsap.set(stripWrap, { opacity: 0, x: 0 });
  stage.dataset.mode = 'overview';
  tabs[0].classList.add('ab-history-tab--active');

  tabs.forEach((t, i) => t.addEventListener('click', () => show(i)));
  window.addEventListener('resize', () => { if (active > 0) show(active, false); });
}
