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

  const pauseBtn    = document.getElementById('pt-pause');
  const prevBtn     = document.getElementById('pt-prev');
  const nextBtn     = document.getElementById('pt-next');
  const progressEl  = document.getElementById('pt-bar-progress');

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
    if (progressEl) progressEl.style.height = '0%';
    gsap.to(fundEl, { opacity: 0, x: dir * -12, duration: 0.2, ease: 'power2.in', onComplete() {
      render(idx);
      gsap.fromTo(fundEl, { opacity: 0, x: dir * 12 }, { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' });
    }});
  }

  render(0);

  function step(ts) {
    if (lastTs !== null && !paused && !document.hidden) elapsed += ts - lastTs;
    lastTs = ts;
    if (elapsed >= DWELL) { goTo(idx + 1, 1); }
    else if (progressEl) progressEl.style.height = (elapsed / DWELL * 100) + '%';
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
  const track = document.getElementById('of-cards-track');
  if (!track) return;

  const pageEls = [...track.querySelectorAll('.of-cards-page')];
  const totalPages = pageEls.length;
  const dots = [...document.querySelectorAll('.of-dot')];
  const prevBtn = document.getElementById('of-prev');
  const nextBtn = document.getElementById('of-next');
  if (!prevBtn || !nextBtn) return;

  let page = 0;

  function goTo(p) {
    page = ((p % totalPages) + totalPages) % totalPages;
    const viewport = track.parentElement.offsetWidth;
    gsap.to(track, { x: -page * viewport, duration: 0.55, ease: 'power2.inOut' });
    dots.forEach((d, i) => d.classList.toggle('active', i === page));
  }

  dots.forEach((d, i) => d.classList.toggle('active', i === 0));

  prevBtn.addEventListener('click', () => goTo(page - 1));
  nextBtn.addEventListener('click', () => goTo(page + 1));

  // Asset class dropdown
  const assetField = document.getElementById('of-asset-field');
  const assetBox   = document.getElementById('of-asset-box');
  const assetValue = document.getElementById('of-asset-value');
  const assetOpts  = assetField ? [...assetField.querySelectorAll('.of-asset-option')] : [];

  if (assetBox) {
    assetBox.addEventListener('click', (e) => {
      e.stopPropagation();
      assetField.classList.toggle('open');
      assetBox.setAttribute('aria-expanded', assetField.classList.contains('open'));
    });

    assetOpts.forEach(opt => {
      opt.addEventListener('click', () => {
        const val = opt.dataset.value;
        assetOpts.forEach(o => o.classList.remove('selected'));
        if (val) { opt.classList.add('selected'); assetValue.textContent = val; }
        else { assetValue.textContent = 'Browse by asset class'; }
        assetField.classList.remove('open');
        assetBox.setAttribute('aria-expanded', 'false');
      });
    });

    document.addEventListener('click', () => {
      assetField.classList.remove('open');
      assetBox.setAttribute('aria-expanded', 'false');
    });
  }
}

/* ============================================================
   NAVIGATION MEGA-MENU  (Sprint 2 — 187:20082)
   ------------------------------------------------------------
   L1 tap drops a full-width steel-blue panel from under the
   132px header. Each panel is a row of column GROUPS separated
   by hairline dividers; a group leads with a large cobalt CTA
   and holds sub-columns (mono eyebrow + link list), a
   description, or both. An editorial brief rail is pinned to
   the right edge, full-bleed top to bottom.
   ============================================================ */
const NAV = {
  /* Investments: fourth pilot for the intro+brief template. Capabilities
     used to live here as a fourth column; it now sits under Who We Are. */
  'investments': {
    panel: {
      title: 'Investments',
      body: 'Our strategies, funds, and how we invest.',
      cta: { label: 'Find Finder', href: '#' },
      accentLinks: true,
      cols: [
        { h: 'Vehicle', items: ['Mutual Funds', 'ETFs', 'Interval Funds', 'SMAs', 'CITs', 'BDCs'] },
        { h: 'Asset Class', items: ['Global Equity', 'US Equity', 'Real Assets', 'Multi-Asset', 'Alternative Credit', 'Real Estate Debt'] },
        { h: 'Goal', items: ['Capital Preservation', 'Capital Appreciation', 'Income Generation'] }
      ]
    }
    // no brief — Investments doesn't get the featured/Contact Us rail
  },
  /* Insights is the second pilot for the new intro+brief template
     (552:37345): title/body/cta on the left, eyebrow columns kept in
     the middle (unlike Who We Are's flat list), light-blue brief. */
  'insights': {
    panel: {
      title: 'Insights',
      body: 'Discover our view on the economy, market and investment strategy in our latest insight articles.',
      cta: { label: 'Featured Insights', href: '#' },
      accentLinks: true,
      cols: [
        { h: 'Theme', items: ['Alternative Credit', 'Investment Ideas', 'Fund Updates', 'Gold + Real Assets', 'Market Outlook', 'Municipal Credit', 'Practice Building', 'Retirement Planning'] },
        { h: 'Birds Eye View', items: ['All Blogs'],
          desc: 'Timely market insights, thoughtful perspectives, and expert commentary — our commitment to providing modern investment solutions to modern challenges.' }
      ]
    },
    brief: {
      img: 'assets/img/nav-brief-insights.jpg',
      eyebrow: 'Macro & Market Views',
      title: 'Navigating Uncertainty: A Mid-Year Market Outlook',
      href: '#',
      light: true
    }
  },
  /* Resources: third pilot for the intro+brief template. Links stay the
     default oxford-blue (no accentLinks) unlike Insights' cobalt. */
  'resources': {
    panel: {
      title: 'Resources',
      body: 'Education, tools, and support for your practice.',
      cta: { label: 'First Eagle Academy', href: '#' },
      accentLinks: true,
      cols: [
        { h: 'First Eagle Academy', items: ['Practice Management', 'High Net Worth Acquisition', 'Succession Planning', 'Behavioral Finance', 'Earn CE Credit Online', 'Alternative Credit Education'] },
        { h: 'More', items: ['Client Servicing', 'Retirement Solutions|retirement.html'] }
      ]
    },
    brief: {
      img: 'assets/img/nav-img-people.png',
      title: 'Contact Us',
      body: 'How we think about risk, resilience and long-term value across every strategy we manage. Learn more about our philosophy.',
      href: '#',
      light: true
    }
  },
  /* Who We Are: intro copy + secondary CTA on the left, two eyebrow columns
     in the middle, light-blue brief on the right. Capabilities moved here
     from Investments and keeps its own "All capabilities" link+arrow
     instead of a separate cta group. */
  'who-we-are': {
    panel: {
      title: 'Who We Are',
      body: 'Our firm, our people, and what drives us.',
      cta: { label: 'Overview', href: 'about.html' },
      accentLinks: true,
      cols: [
        { h: 'First Eagle', items: ['Our Clients', 'Our People & Teams', 'Press & Media', 'Careers', 'Investment Culture', 'Engagement and Inclusion', 'Corporate Social Responsibility', 'Responsible Investing (ESG)'] },
        { h: 'Capabilities', items: ['Equities', 'Fixed Income & Currencies', 'Alternative Credit', 'Real Assets'],
          more: { label: 'All Capabilities', href: '#' } }
      ]
    },
    brief: {
      img: 'assets/img/nav-img-people.png',
      eyebrow: 'Investment Teams',
      title: 'The people behind our investment strategies.',
      href: '#',
      light: true
    }
  }
};

/* ============================================================
   ROLES — the site personalizes per investor type. Each role owns
   its trigger label, dropdown option label, L1 list and NAV
   content. All three currently share the Financial Professionals
   nav; per-role content lands when it's defined.
   ============================================================ */
/* Institutional Investors swap "Investments" for a "Strategies" panel:
   one All Strategies group, single column, Contact us brief rail.
   The other three L1 panels are shared with Financial Professionals. */
const NAV_INSTITUTIONAL = {
  /* Strategies is on the same intro+brief template as the other panels.
     Links stay the default oxford-blue (no accentLinks). */
  'strategies': {
    panel: {
      title: 'Strategies',
      body: 'How we invest across asset classes and mandates.',
      cta: { label: 'All Strategies', href: '#' },
      cols: [
        { h: null, items: ['Alternative Credit', 'Fixed Income', 'Equity', 'Multi-Asset', 'Real Assets'] }
      ]
    },
    brief: {
      img: 'assets/img/nav-brief-insights.jpg',
      eyebrow: 'Macro & Market Views',
      title: 'Navigating Uncertainty: A Mid-Year Market Outlook',
      href: '#',
      light: true
    }
  },
  'insights': NAV['insights'],
  'resources': NAV['resources'],
  'who-we-are': NAV['who-we-are']
};

/* Individual Investors keep everything from Financial Professionals except
   Resources, which moves onto the same intro+brief template as the other
   panels: documents/forms and how-to-invest as eyebrow columns, plus a
   featured-insight brief instead of Contact Us. */
const NAV_INDIVIDUAL = {
  'investments': NAV['investments'],
  'insights': NAV['insights'],
  'resources': {
    panel: {
      title: 'Resources',
      body: 'Tools, and support for your financial journey.',
      cta: { label: 'Explore Resources', href: '#' },
      accentLinks: true,
      cols: [
        { h: 'Documents & Resources', items: ['Applications & Forms', 'Minimum Investments', 'Fees & Expenses', 'Tax Information', 'Fund Holdings', 'Proxy Voting', 'XBRL Filings'] },
        { h: 'Ways to Invest', items: ['Invest Directly', 'Through Your Brokerage', 'Through a Financial Advisor', 'Buy an ETF'] }
      ]
    },
    brief: {
      img: 'assets/img/nav-brief-insights.jpg',
      eyebrow: 'Macro & Market Views',
      title: 'Navigating Uncertainty: A Mid-Year Market Outlook',
      href: '#',
      light: true
    }
  },
  'who-we-are': NAV['who-we-are']
};

const ROLES = {
  'financial-professionals': {
    label: 'Advisor', option: 'Advisors', desc: 'I advise clients on their investments.',
    l1: [['investments', 'Investments'], ['insights', 'Insights'], ['resources', 'Resources'], ['who-we-are', 'Who We Are']],
    nav: NAV
  },
  'individual-investors': {
    label: 'Individual', option: 'Individuals', desc: 'I manage my own investments.',
    l1: [['investments', 'Investments'], ['insights', 'Insights'], ['resources', 'Resources'], ['who-we-are', 'Who We Are']],
    nav: NAV_INDIVIDUAL
  },
  'institutional-investors': {
    label: 'Institution', option: 'Institutions', desc: 'I invest on behalf of a company or fund.',
    l1: [['strategies', 'Strategies'], ['insights', 'Insights'], ['who-we-are', 'Who We Are']],
    nav: NAV_INSTITUTIONAL
  }
};
/* in-memory only — no persistence, so every page load starts as a fresh
   new visitor and the gate demo can be repeated without clearing storage */
let currentRole = 'financial-professionals';
const roleData = () => ROLES[currentRole];

/* hooks other modules register so a role change re-renders their UI */
const roleChangeHooks = [];

function setRole(key) {
  if (!ROLES[key] || key === currentRole) return;
  currentRole = key;
  buildHeaderL1();
  syncRoleLabels();
  roleChangeHooks.forEach(fn => fn());
}

/* rebuild the desktop L1 buttons for the active role (burger/search stay) */
function buildHeaderL1() {
  const nav = document.querySelector('.hdr-l1');
  if (!nav) return;
  nav.querySelectorAll('button[data-l1]:not(.hdr-search)').forEach(b => b.remove());
  const anchor = nav.querySelector('.hdr-burger') || nav.querySelector('.hdr-search');
  roleData().l1.forEach(([k, label]) => {
    const b = document.createElement('button');
    b.dataset.l1 = k;
    b.textContent = label;
    nav.insertBefore(b, anchor);
  });
}

/* keep every place the role name appears in sync */
function syncRoleLabels() {
  const { label } = roleData();
  const eyebrow = document.querySelector('.hdr-eyebrow-left .utility-nav');
  if (eyebrow && eyebrow.firstChild) eyebrow.firstChild.textContent = label + ' ';
  const foot = document.querySelector('.mnav-foot > .utility-nav');
  if (foot && foot.firstChild) foot.firstChild.textContent = label + ' ';
  const pzSel = document.querySelector('.mnav-pz-select--role span');
  if (pzSel) pzSel.textContent = label;
}

function initRoleSwitcher() {
  // the current role is the trigger's own label — the list below it only offers the others
  const optionsHTML = () => Object.entries(ROLES)
    .filter(([k]) => k !== currentRole)
    .map(([k, r]) => `<button data-role="${k}">${r.option}</button>`).join('');

  // mobile: the personalize sheet's investor-type field is the picker
  const roleField = document.querySelector('.mnav-pz-field--role');
  const roleSelect = document.querySelector('.mnav-pz-select--role');
  if (roleField && roleSelect) {
    const list = document.createElement('div');
    list.className = 'mnav-role-list';
    roleField.appendChild(list);
    roleSelect.addEventListener('click', () => {
      list.innerHTML = optionsHTML();
      roleField.classList.toggle('open');
    });
    list.addEventListener('click', e => {
      const opt = e.target.closest('[data-role]');
      if (!opt) return;
      setRole(opt.dataset.role);
      roleField.classList.remove('open');
    });
  }

  buildHeaderL1();
  syncRoleLabels();
}

/* Locations for the modal's country field. Single entry for now — the
   picker is built to take more without changing its behavior. */
/* order matches the Figma list (408:63271): US / UK / Global Site, then
   the rest alphabetically. Always defaults to United States for now. */
/* iso is the flagcdn.com country code (differs from the key only for uk/global) */
/* region groups the location list; "global" has none — it's reached via
   the "visit our Global Site" copy instead of sitting in the grid */
const REGION_ORDER = ['North America', 'Europe and the Middle East', 'Asia Pacific'];
const LOCATIONS = {
  us: { label: 'United States', iso: 'us', region: 'North America' },
  uk: { label: 'UK', iso: 'gb', region: 'Europe and the Middle East' },
  global: { label: 'Rest of World', iso: null },
  au: { label: 'Australia', iso: 'au', region: 'Asia Pacific' },
  at: { label: 'Austria', iso: 'at', region: 'Europe and the Middle East' },
  be: { label: 'Belgium', iso: 'be', region: 'Europe and the Middle East' },
  dk: { label: 'Denmark', iso: 'dk', region: 'Europe and the Middle East' },
  fi: { label: 'Finland', iso: 'fi', region: 'Europe and the Middle East' },
  fr: { label: 'France', iso: 'fr', region: 'Europe and the Middle East' },
  de: { label: 'Germany', iso: 'de', region: 'Europe and the Middle East' },
  ie: { label: 'Ireland', iso: 'ie', region: 'Europe and the Middle East' },
  it: { label: 'Italy', iso: 'it', region: 'Europe and the Middle East' },
  jp: { label: 'Japan', iso: 'jp', region: 'Asia Pacific' },
  lu: { label: 'Luxembourg', iso: 'lu', region: 'Europe and the Middle East' },
  nl: { label: 'Netherlands', iso: 'nl', region: 'Europe and the Middle East' },
  pt: { label: 'Portugal', iso: 'pt', region: 'Europe and the Middle East' },
  sg: { label: 'Singapore', iso: 'sg', region: 'Asia Pacific' },
  kr: { label: 'South Korea', iso: 'kr', region: 'Asia Pacific' },
  es: { label: 'Spain', iso: 'es', region: 'Europe and the Middle East' },
  ch: { label: 'Switzerland', iso: 'ch', region: 'Europe and the Middle East' },
  tw: { label: 'Taiwan', iso: 'tw', region: 'Asia Pacific' }
};
/* Some roles are only served in certain locations — individuals get the US
   site and the global site, nothing else. A role absent here is unrestricted. */
const ROLE_LOCATIONS = { 'individual-investors': ['us', 'global'] };
const locationAllowed = (role, k) => !ROLE_LOCATIONS[role] || ROLE_LOCATIONS[role].includes(k);

/* real flag images (flagcdn.com) — falls back to a globe glyph for Rest of World */
const globeIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 4 5.7 4 9s-1.5 6.5-4 9c-2.5-2.5-4-5.7-4-9s1.5-6.5 4-9z"/></svg>';
const flagHTML = k => LOCATIONS[k].iso
  ? `<img class="gate-loc-flag" src="https://flagcdn.com/${LOCATIONS[k].iso}.svg" alt="" width="20" height="15" onerror="this.remove()">`
  : `<span class="gate-loc-flag gate-loc-flag--globe">${globeIcon}</span>`;
/* in-memory only, like currentRole above — resets on every reload so the
   gate's new-visitor state can be demoed repeatedly without clearing storage */
let currentLocation = 'us';
let gateSatisfiedFlag = false;
const gateSatisfied = () => gateSatisfiedFlag;

/* ============================================================
   ENTRY GATE  (630:46762 / 651:111874 / 630:46967)
   ------------------------------------------------------------
   A panel that sits IN THE HEADER'S FLOW between the eyebrow bar
   and the main nav, pushing the nav and hero down. The eyebrow
   stays crisp above the scrim; everything from the main nav down
   is dimmed and blocked. Three steps:
     1        role cards + current location
     location country picker
     terms    the selected role's disclosure + Accept and Continue
   New visitors cannot dismiss it — a role must be chosen before
   entering the site. Once satisfied, the same panel doubles as
   the eyebrow's role/location switcher and IS dismissible, so a
   returning user can't get trapped. No close button either way.
   ============================================================ */
const GATE_ROLE_ORDER = ['institutional-investors', 'financial-professionals', 'individual-investors'];

/* Disclosures are per-role: a role listed here must accept its terms before
   entering, and must re-accept whenever the location changes (eligibility is
   per-jurisdiction). Individuals aren't gated and apply straight away.
   The closing two paragraphs are identical across roles. */
const GATE_TERMS_COMMON = [
  'Information provided is for informational purposes only and does not constitute an offer or solicitation to buy or sell any security. Past performance is not indicative of future results. All investments involve risk, including possible loss of principal.',
  'Please review the applicable fund prospectus and disclosure documents before making any investment decision. If you are unsure whether you meet these eligibility requirements, please select a different investor type or contact your First Eagle representative.'
];
const GATE_TERMS = {
  'institutional-investors': [
    'By selecting Institutional Investor, you represent that you are a qualified institutional buyer, accredited investor, or otherwise meet the eligibility requirements to receive information intended for institutional use only.',
    'Materials made available under this designation may include fund characteristics, performance data, and commentary not authorized for distribution to retail investors. First Eagle Investments has not independently verified your eligibility and relies on your representation in providing access.',
    ...GATE_TERMS_COMMON
  ],
  'financial-professionals': [
    'By selecting Advisor, you represent that you are a registered representative, investment adviser, or other financial intermediary acting in a professional capacity, and not a retail investor accessing this information for your own account.',
    'Materials made available under this designation may include strategy detail, performance data, and commentary intended for professional use and not authorized for distribution to retail investors. First Eagle Investments has not independently verified your status and relies on your representation in providing access.',
    ...GATE_TERMS_COMMON
  ]
};
const needsTerms = role => !!GATE_TERMS[role];

function initGate() {
  const header = document.getElementById('site-header');
  const main = header && header.querySelector('.hdr-main');
  if (!main) return;

  const chevL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>';

  // injected rather than duplicated across the three HTML files
  const scrim = document.createElement('div');
  scrim.id = 'gate-scrim';
  const panel = document.createElement('div');
  panel.id = 'gate';
  panel.setAttribute('aria-hidden', 'true');
  panel.setAttribute('data-lenis-prevent', '');
  panel.innerHTML = '<div class="gate-inner" id="gate-body"></div>';
  header.insertBefore(scrim, main);
  header.insertBefore(panel, main);
  const body = document.getElementById('gate-body');

  let step = 1;
  let staged = currentLocation;      // discarded if the user backs out of the picker
  let openState = false;
  let tl;
  // true only when the location step was reached straight from the eyebrow's
  // location trigger, as opposed to a "Change" link inside the role step
  let standaloneLocation = false;
  let termsRole = null;              // which role's disclosure the terms step is showing

  const locLabel = k => `${LOCATIONS[k].label} (EN)`;

  function cardsHTML() {
    return `<div class="gate-cards" data-anim>` + GATE_ROLE_ORDER.map(k => {
      const r = ROLES[k];
      // on the terms step, the role being decided on is the selected one;
      // otherwise, a returning user sees their already-picked role (621:105033)
      const sel = step === 'terms' ? k === termsRole : (gateSatisfied() && k === currentRole);
      return `<button type="button" class="gate-card${sel ? ' gate-card--selected' : ''}" data-gate-role="${k}">
        <span class="gate-card-text">
          <span class="gate-card-title">${r.option}</span>
          <span class="gate-card-desc">${r.desc}</span>
        </span>
        <span class="gate-radio"></span>
      </button>`;
    }).join('') + `</div>`;
  }

  const introHTML = `
    <div class="gate-intro" data-anim>
      <p class="gate-title">Welcome to the First Eagle Investments</p>
      <p class="gate-body-copy">Please select your user type.</p>
    </div>`;

  function renderStep1() {
    // a returning user reopening the role trigger just sees the cards,
    // already showing their pick — welcome copy and location line are
    // first-visit-only (621:105033)
    const satisfied = gateSatisfied();
    body.innerHTML = (satisfied ? '' : introHTML) +
      `${cardsHTML()}` +
      (satisfied ? '' : `
       <p class="gate-location" data-anim>
         <span>Your Location:</span>
         <strong>${locLabel(staged)}</strong>
         <button type="button" class="gate-link" data-gate-act="location">Change</button>
       </p>`);
  }

  function renderLocation() {
    const cell = k => `<button type="button" class="gate-loc${k === staged ? ' gate-loc--selected' : ''}" data-gate-loc="${k}">
        ${flagHTML(k)}${LOCATIONS[k].label}</button>`;
    // once a role is set, hide the locations it isn't served in; before that
    // (first visit, reached via "Change") there's no role to restrict by yet
    const allowed = k => locationAllowed(gateSatisfied() ? currentRole : null, k);
    const region = r => {
      const keys = Object.keys(LOCATIONS).filter(k => LOCATIONS[k].region === r && allowed(k));
      if (!keys.length) return '';
      return `<div class="gate-loc-region${keys.length > 6 ? ' gate-loc-region--split' : ''}">
          <p class="gate-loc-region-title">${r}</p>
          <div class="gate-loc-region-items">${keys.map(cell).join('')}</div>
        </div>`;
    };
    // no back chevron only when reached straight from the eyebrow's location
    // trigger — a "Change" link inside the role step still returns to it
    const back = standaloneLocation ? '' : `<button type="button" class="gate-back" data-gate-act="back" aria-label="Back">${chevL}</button>`;
    // Rest of World stacks below North America in the same grid column,
    // labeled "Global" rather than the location's own "Rest of World" label
    const restOfWorld = `<div class="gate-loc-region">
        <p class="gate-loc-region-title">Rest of World</p>
        <div class="gate-loc-region-items">
          <button type="button" class="gate-loc${staged === 'global' ? ' gate-loc--selected' : ''}" data-gate-loc="global">
            ${flagHTML('global')}Global</button>
        </div>
      </div>`;
    body.innerHTML = `
      <div class="gate-head" data-anim>
        ${back}
        <p class="gate-title">Select Your Location</p>
      </div>
      <p class="gate-body-copy" data-anim>If your location is not listed here, please visit our <button type="button" class="gate-link gate-link--underline" data-gate-loc="global">Global Site</button>.</p>
      <div class="gate-loc-regions" data-anim>
        <div class="gate-loc-col-1">${region('North America')}${restOfWorld}</div>
        ${REGION_ORDER.filter(r => r !== 'North America').map(region).join('')}
      </div>`;
  }

  function renderTerms() {
    // a returning user re-accepting just sees cards, terms, and the button —
    // no welcome copy, no location line (same rule as renderStep1)
    const satisfied = gateSatisfied();
    const footer = satisfied
      ? `<div class="gate-footer gate-footer--solo" data-anim>
           <button type="button" class="btn gate-accept" data-gate-act="accept">Accept and Continue</button>
         </div>`
      : `<div class="gate-footer" data-anim>
           <p class="gate-location">
             <span>Your Location:</span>
             <strong>${locLabel(staged)}</strong>
             <button type="button" class="gate-link" data-gate-act="location">Change</button>
           </p>
           <button type="button" class="btn gate-accept" data-gate-act="accept">Accept and Continue</button>
         </div>`;
    body.innerHTML = (satisfied ? '' : introHTML) +
      `${cardsHTML()}
       <div class="gate-terms" data-anim>${(GATE_TERMS[termsRole] || []).map(p => `<p>${p}</p>`).join('')}</div>
       ${footer}`;
  }

  function render() {
    if (step === 'location') renderLocation();
    else if (step === 'terms') renderTerms();
    else renderStep1();
  }

  /* step changes re-stagger the content without re-collapsing the panel */
  function stagger() {
    gsap.fromTo(body.querySelectorAll('[data-anim]'), { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out', stagger: 0.05 });
  }

  function goTo(next) { if (next !== 'location') standaloneLocation = false; step = next; render(); stagger(); }

  function openGate(at = 1) {
    step = at;
    standaloneLocation = (at === 'location');
    staged = currentLocation;
    render();
    if (openState) { stagger(); return; }
    openState = true;
    panel.setAttribute('aria-hidden', 'false');
    panel.style.display = 'block';
    // a returning user already has access — no scrim/blur, no scroll lock,
    // this is just a dropdown reopening, not the blocking first-visit gate
    if (!gateSatisfied()) { scrim.classList.add('open'); lenis.stop(); }
    tl && tl.kill();
    tl = gsap.timeline()
      .fromTo(panel, { height: 0, opacity: 0 },
        { height: 'auto', opacity: 1, duration: 0.4, ease: 'power3.out' })
      .fromTo(body.querySelectorAll('[data-anim]'), { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out', stagger: 0.05 }, 0.1);
  }

  function closeGate() {
    if (!openState) return;
    openState = false;
    panel.setAttribute('aria-hidden', 'true');
    scrim.classList.remove('open');
    lenis.start();
    tl && tl.kill();
    tl = gsap.timeline({ onComplete: () => {
      panel.style.display = 'none';
      gsap.set(panel, { clearProps: 'height,opacity' });
    } })
      .to(body.querySelectorAll('[data-anim]'), { opacity: 0, y: 8, duration: 0.18,
        ease: 'power2.in', stagger: { each: 0.04, from: 'end' } })
      .to(panel, { height: 0, opacity: 0, duration: 0.3, ease: 'power2.inOut' }, 0.12);
  }

  /* the eyebrow's role + location labels */
  function syncGateTriggers() {
    const roleEl = document.getElementById('gate-trigger-role');
    const locEl = document.getElementById('gate-trigger-location');
    if (roleEl && roleEl.firstChild) roleEl.firstChild.textContent = (gateSatisfied() ? roleData().label : 'Role') + ' ';
    if (locEl && locEl.firstChild) locEl.firstChild.textContent = LOCATIONS[currentLocation].label + ' ';
  }

  function commit(role) {
    // the new role may not be served where they are (e.g. an advisor in Japan
    // switching to Individuals) — fall back to the US site
    if (!locationAllowed(role, staged)) staged = 'us';
    currentLocation = staged;
    gateSatisfiedFlag = true;
    // setRole no-ops when the role is unchanged, which would skip the very
    // first commit (default role picked for the first time) — force it
    const forced = role === currentRole;
    if (forced) currentRole = null;
    setRole(role);
    syncGateTriggers();
    closeGate();
  }

  body.addEventListener('click', e => {
    const roleBtn = e.target.closest('[data-gate-role]');
    if (roleBtn) {
      const role = roleBtn.dataset.gateRole;
      // gated roles must accept their disclosure first; the rest apply straight away
      if (needsTerms(role)) { termsRole = role; return goTo('terms'); }
      // let the radio visibly fill in before committing, so the click reads as a choice, not a jump-cut
      body.querySelectorAll('.gate-card').forEach(c => c.classList.remove('gate-card--selected'));
      roleBtn.classList.add('gate-card--selected');
      setTimeout(() => commit(role), 450);
      return;
    }
    const loc = e.target.closest('[data-gate-loc]');
    if (loc) {
      staged = loc.dataset.gateLoc;
      // reached via "Change" inside the role step: still mid-flow, go back to it
      if (!standaloneLocation) return goTo(1);
      // eligibility for a gated role is per-jurisdiction, so changing location
      // sends them back through the disclosure rather than applying silently.
      // commit() is what finally moves `staged` into currentLocation, so
      // backing out here leaves the old location in place.
      if (needsTerms(currentRole)) { termsRole = currentRole; return goTo('terms'); }
      // ungated role: a standalone location pick applies and closes
      currentLocation = staged;
      syncGateTriggers();
      return closeGate();
    }
    const act = e.target.closest('[data-gate-act]');
    if (!act) return;
    if (act.dataset.gateAct === 'location') { standaloneLocation = false; goTo('location'); }
    else if (act.dataset.gateAct === 'back') goTo(1);
    else if (act.dataset.gateAct === 'accept') commit(termsRole);
  });

  /* dismissible only once the gate has been satisfied — a first-time
     visitor has to pick a role, a returning user must not get stuck */
  const dismissible = () => openState && gateSatisfied();
  scrim.addEventListener('click', () => { if (dismissible()) closeGate(); });
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && dismissible()) closeGate();
  });

  document.getElementById('gate-trigger-role')?.addEventListener('click', () => openGate(1));
  document.getElementById('gate-trigger-location')?.addEventListener('click', () => openGate('location'));

  panel.style.display = 'none';
  syncGateTriggers();
  if (!gateSatisfied()) openGate(1);
}

/* Search (405:63055) — a slim single-row bar in the mega-menu shell.
   Predictive: as you type, SEARCH_INDEX (real site titles + URLs from the
   FE sitemap export) is filtered client-side and shown as a suggestion
   list under the input. Results link out to the live firsteagle.com
   pages they represent, since this prototype doesn't host that content. */
const SEARCH = { placeholder: 'Search' };
const SEARCH_INDEX = [{"t": "Hero - HP Corporate", "u": "https://www.firsteagle.com/"}, {"t": "Our Commitment to Engagement and Inclusion", "u": "https://www.firsteagle.com/our-commitment-engagement-and-inclusion"}, {"t": "Transparency in Coverage", "u": "https://www.firsteagle.com/transparency-coverage"}, {"t": "May Views from First Eagle Global Value Team", "u": "https://www.firsteagle.com/insights/may-views-first-eagle-global-value-team-1"}, {"t": "Notice About WhatsApp", "u": "https://www.firsteagle.com/notice-about-whatsapp"}, {"t": "Complaint Handling Policy", "u": "https://www.firsteagle.com/complaint-handling-policy"}, {"t": "US Small Caps in Focus: 1Q26", "u": "https://www.firsteagle.com/insights/us-small-caps-focus-1q26"}, {"t": "Global Value Team Responsible Investment Guidelines", "u": "https://www.firsteagle.com/Global_Value_Team_Responsible_Investment_Guidelines"}, {"t": "Corporate Social Responsibility", "u": "https://www.firsteagle.com/corporate-social-responsibility"}, {"t": "Terms and Conditions", "u": "https://www.firsteagle.com/terms-and-conditions"}, {"t": "Business Continuity", "u": "https://www.firsteagle.com/business-continuity"}, {"t": "Diamond Hill to Be Acquired by First Eagle Investments", "u": "https://www.firsteagle.com/news/diamond-hill-be-acquired-first-eagle-investments"}, {"t": "June Views from First Eagle Global Value Team", "u": "https://www.firsteagle.com/all-insights"}, {"t": "Press, Announcements and Media", "u": "https://www.firsteagle.com/press-releases-and-announcements"}, {"t": "Our Strategies", "u": "https://www.firsteagle.com/strategies-overview"}, {"t": "First Eagle Best Place to Work", "u": "https://www.firsteagle.com/first-eagle-investments-among-best-places-work-money-management-2025"}, {"t": "First Eagle Investments Expands ETF Business with Launch of Mid Cap and US Equity ETFs; AUM Surpasses $1.5 Billion", "u": "https://www.firsteagle.com/news/first-eagle-investments-expands-etf-business-launch-mid-cap-and-us-equity-etfs-aum-surpasses"}, {"t": "Shape the Future. Start with Us.", "u": "https://www.firsteagle.com/careers"}, {"t": "1Q26 Market Overview: Goldilocks, Interrupted", "u": "https://www.firsteagle.com/insights/1q26-market-overview-goldilocks-interrupted"}, {"t": "Contact Us", "u": "https://www.firsteagle.com/contact-us"}, {"t": "Stewardship Code and Shareholder Rights Directive - April 2024", "u": "https://www.firsteagle.com/stewardship-code-and-shareholder-rights-directive-april-2024"}, {"t": "PRIVACY POLICY", "u": "https://www.firsteagle.com/privacy-policy-european-area"}, {"t": "Disciplined, Unconventional Thinking. Global Perspective. Long-Term Alignment.", "u": "https://www.firsteagle.com/about-us"}, {"t": "United in Our Commitment to Clients", "u": "https://www.firsteagle.com/our-people"}, {"t": "First Eagle Investments Recognized in Pensions & Investments’ “Best Places to Work in Money Management” for Third Consecutive Year", "u": "https://www.firsteagle.com/news/first-eagle-investments-recognized-pensions-investments-best-places-work-money-management"}, {"t": "Online Privacy Statement", "u": "https://www.firsteagle.com/online-privacy-statement"}, {"t": "The Small Idea: Onward, Small Cap Soldiers!", "u": "https://www.firsteagle.com/insights/small-idea-onward-small-cap-soldiers"}, {"t": "First Eagle Investment Management, Ltd. (the “Company”) - UK Tax Strategy", "u": "https://www.firsteagle.com/first-eagle-investment-management-ltd-company-uk-tax-strategy"}, {"t": "Investment Capabilities", "u": "https://www.firsteagle.com/our-investment-strategies"}, {"t": "Accessibility Statement for First Eagle Investments", "u": "https://www.firsteagle.com/accessibility-statement-first-eagle-investments"}, {"t": "Investment Culture", "u": "https://www.firsteagle.com/investment-culture"}, {"t": "Alternative Credit Review: 1Q26", "u": "https://www.firsteagle.com/insights/alternative-credit-review-1q26"}, {"t": "Matthew McLennan CFA", "u": "https://www.firsteagle.com/our-people/matthew-mclennan"}, {"t": "Bill Hench", "u": "https://www.firsteagle.com/our-people/bill-hench"}, {"t": "Financial Literacy", "u": "https://www.firsteagle.com/financial-literacy"}, {"t": "August Views from First Eagle Alternative Credit", "u": "https://www.firsteagle.com/insights/august-views-first-eagle-alternative-credit-2025"}, {"t": "Selectivity Sets the Stage for Upside", "u": "https://www.firsteagle.com/insights/selectivity-sets-stage-upside"}, {"t": "Global Equity ETF Commentary", "u": "https://www.firsteagle.com/insights/global-equity-etf-commentary-3q2025"}, {"t": "2Q24 Market Overview: Choose Your Own Adventure", "u": "https://www.firsteagle.com/insights/2q24-market-overview-choose-your-own-adventure"}, {"t": "Bloomberg Intelligence: FICC Focus with Jim Fellows", "u": "https://www.firsteagle.com/insights/bloomberg-intelligence-ficc-focus-jim-fellows"}, {"t": "First Eagle Global Fund: Perennial Relevance", "u": "https://www.firsteagle.com/insights/first-eagle-global-fund-perennial-relevance"}, {"t": "Separating the Wheat from the Chaff", "u": "https://www.firsteagle.com/insights/separating-wheat-chaff-0"}, {"t": "Direct Lending: 2025 Outlook", "u": "https://www.firsteagle.com/insights/direct-lending-2025-outlook"}, {"t": "Matt McLennan on WealthTrack", "u": "https://www.firsteagle.com/insights/matt-mclennan-wealthtrack-0"}, {"t": "October Views from First Eagle Alternative Credit", "u": "https://www.firsteagle.com/insights/october-views-first-eagle-alternative-credit"}, {"t": "Small Business Retirement Plans", "u": "https://www.firsteagle.com/insights/small-business-retirement-plans"}, {"t": "Michael Herzig featured on GlobalCapital's Another Fine Mezz", "u": "https://www.firsteagle.com/insights/michael-herzig-featured-globalcapitals-another-fine-mezz"}, {"t": "Views from First Eagle Municipal Credit Team", "u": "https://www.firsteagle.com/insights/views-first-eagle-municipal-credit-team"}, {"t": "Quarterly Views from First Eagle Municipal Credit Team: 2Q25", "u": "https://www.firsteagle.com/insights/quarterly-views-first-eagle-municipal-credit-team-2q25"}, {"t": "September Views from First Eagle Global Value Team", "u": "https://www.firsteagle.com/insights/september-views-first-eagle-global-value-team-1"}, {"t": "Structured Credit: Seeing the Forest for the Trees", "u": "https://www.firsteagle.com/insights/structured-credit-seeing-forest-trees"}, {"t": "Alternative Credit: 4Q23 Review", "u": "https://www.firsteagle.com/insights/alternative-credit-4q23-review"}, {"t": "February Views from First Eagle Alternative Credit Team", "u": "https://www.firsteagle.com/insights/february-views-first-eagle-alternative-credit-team"}, {"t": "Alternative Credit: 1Q24 Review", "u": "https://www.firsteagle.com/insights/alternative-credit-1q24-review"}, {"t": "Everything Old Is New Again", "u": "https://www.firsteagle.com/insights/reflections-everything-old-new-again"}, {"t": "How Much Does Inflation Vary by Income?", "u": "https://www.firsteagle.com/insights/how-much-does-inflation-vary-income"}, {"t": "From Top to Bottom", "u": "https://www.firsteagle.com/insights/top-bottom-0"}, {"t": "Municipal Bonds: Unrated ≠ Uninvestable", "u": "https://www.firsteagle.com/insights/municipal-bonds-unrated-uninvestable"}, {"t": "Summertime Observations", "u": "https://www.firsteagle.com/insights/2024-summertime-observations"}, {"t": "The Small Idea: RESPECT!", "u": "https://www.firsteagle.com/insights/small-idea-respect"}, {"t": "Direct Lending: Underwriting Amid Tariff Uncertainty", "u": "https://www.firsteagle.com/insights/direct-lending-underwriting-amid-tariff-uncertainty"}, {"t": "Gold Fund Commentary", "u": "https://www.firsteagle.com/insights/gold-fund-commentary-3q2025"}, {"t": "First Eagle Small Cap Team Celebrates Three Years", "u": "https://www.firsteagle.com/insights/first-eagle-small-cap-team-celebrates-3-years"}, {"t": "January Views from First Eagle Global Value Team", "u": "https://www.firsteagle.com/insights/january-views-first-eagle-global-value-team-1"}, {"t": "Seeking Prime Opportunities in the Primary Market", "u": "https://www.firsteagle.com/insights/seeking-prime-opportunities-primary-market"}, {"t": "Homing in on Residential Real Estate Debt", "u": "https://www.firsteagle.com/insights/homing-residential-real-estate-debt"}, {"t": "January Views from First Eagle Global Value Team", "u": "https://www.firsteagle.com/insights/january-views-first-eagle-global-value-team-0"}, {"t": "Quarterly Views from First Eagle Municipal Credit Team: 3Q25", "u": "https://www.firsteagle.com/insights/quarterly-views-first-eagle-municipal-credit-team-3q25"}, {"t": "February Views from First Eagle Alternative Credit", "u": "https://www.firsteagle.com/insights/february-views-first-eagle-alternative-credit-0"}, {"t": "July Views from First Eagle Alternative Credit Team", "u": "https://www.firsteagle.com/insights/july-views-first-eagle-alternative-credit-team"}, {"t": "November Views from First Eagle Global Value Team", "u": "https://www.firsteagle.com/insights/november-views-first-eagle-global-value-team-2025"}, {"t": "Japan: The Sun Also Rises", "u": "https://www.firsteagle.com/insights/japan-sun-also-rises"}, {"t": "February Views from First Eagle Global Value Team", "u": "https://www.firsteagle.com/insights/february-views-first-eagle-global-value-team-1"}, {"t": "February Views from First Eagle Global Value Team", "u": "https://www.firsteagle.com/insights/february-views-first-eagle-global-value-team-0"}, {"t": "QDIAs – Looking Beyond Target Date Funds", "u": "https://www.firsteagle.com/insights/qdias-looking-beyond-target-date-funds"}, {"t": "Overseas Fund Commentary", "u": "https://www.firsteagle.com/insights/overseas-fund-commentary-3q2025"}, {"t": "Investment Insights: Seasons of Gold", "u": "https://www.firsteagle.com/insights/investment-insights-seasons-gold"}, {"t": "A New Dawn for Healthcare Credit", "u": "https://www.firsteagle.com/insights/new-dawn-healthcare-credit"}, {"t": "April Views from First Eagle Alternative Credit Team", "u": "https://www.firsteagle.com/insights/april-views-first-eagle-alternative-credit-team"}, {"t": "Alternative Credit: 2Q23 Review", "u": "https://www.firsteagle.com/insights/alternative-credit-2q23-review"}, {"t": "Supporting a Solid Foundation for Insurance Portfolios", "u": "https://www.firsteagle.com/insights/supporting-solid-foundation-insurance-portfolios"}, {"t": "Michelle Handy Featured on Reorg: The Primary View", "u": "https://www.firsteagle.com/insights/michelle-handy-featured-reorg-primary-view"}, {"t": "November Views from First Eagle Alternative Credit Team", "u": "https://www.firsteagle.com/insights/november-views-first-eagle-alternative-credit-team-0"}, {"t": "How Much Do People Value Annuities and Their Added Features?", "u": "https://www.firsteagle.com/insights/how-much-do-people-value-annuities-and-their-added-features"}, {"t": "Alternative Credit: 1Q25 Review", "u": "https://www.firsteagle.com/insights/alternative-credit-1q25-review"}, {"t": "August Views from First Eagle Global Value Team", "u": "https://www.firsteagle.com/insights/august-views-first-eagle-global-value-team-0"}, {"t": "Matt McLennan featured on NYSE ETF Central Podcast", "u": "https://www.firsteagle.com/insights/matt-mclennan-featured-nyse-etf-central-podcast"}, {"t": "There’s No Place Like Home", "u": "https://www.firsteagle.com/insights/theres-no-place-home-0"}, {"t": "Alternative Credit: Let the Circle Be Unbroken", "u": "https://www.firsteagle.com/insights/alternative-credit-let-circle-be-unbroken"}, {"t": "Global Value Team Quarterly Webcast Featuring Matthew McLennan", "u": "https://www.firsteagle.com/insights/global-value-team-quarterly-webcast-featuring-matthew-mclennan"}, {"t": "June Views from First Eagle Global Value Team", "u": "https://www.firsteagle.com/insights/june-views-first-eagle-global-value-team-0"}, {"t": "How Well Do People Perceive Their Retirement Preparedness?", "u": "https://www.firsteagle.com/insights/how-well-do-people-perceive-their-retirement-preparedness"}, {"t": "US Government Shutdown: Here We Go Again", "u": "https://www.firsteagle.com/insights/us-government-shutdown-here-we-go-again"}, {"t": "November Views from First Eagle Global Value Team", "u": "https://www.firsteagle.com/insights/november-views-first-eagle-global-value-team-1"}, {"t": "Quarterly Views from First Eagle Municipal Credit Team: 4Q25", "u": "https://www.firsteagle.com/insights/quarterly-views-first-eagle-municipal-credit-team-4q25"}, {"t": "Lower Middle Market Direct Lending: Same as It Ever Was", "u": "https://www.firsteagle.com/insights/lower-middle-market-direct-lending-same-it-ever-was"}, {"t": "Beyond the Headlines: Investing Smarter in a Volatile ‘25", "u": "https://www.firsteagle.com/insights/beyond-headlines-investing-smarter-volatile-25"}, {"t": "Why Munis Now?", "u": "https://www.firsteagle.com/insights/why-munis-now"}, {"t": "Quarterly Views from First Eagle Direct Lending Team: 4Q25", "u": "https://www.firsteagle.com/insights/quarterly-views-first-eagle-direct-lending-team-4q25"}, {"t": "Prudent Investing in Perilous Times with Matt McLennan", "u": "https://www.firsteagle.com/insights/prudent-investing-perilous-times-matt-mclennan"}, {"t": "1Q26 Small Cap Market Overview", "u": "https://www.firsteagle.com/insights/1q26-small-cap-market-overview"}, {"t": "Eyes on Private Debt", "u": "https://www.firsteagle.com/insights/eyes-private-debt-0"}, {"t": "John Miller on Osaic’s Weekly Market Impact Podcast", "u": "https://www.firsteagle.com/insights/john-miller-osaics-weekly-market-impact-podcast"}, {"t": "October Views from First Eagle Municipal Credit Team", "u": "https://www.firsteagle.com/insights/october-views-first-eagle-municipal-credit-team"}, {"t": "Short Duration High Yield Municipal Fund Commentary", "u": "https://www.firsteagle.com/insights/short-duration-high-yield-municipal-fund-commentary-3q2025"}, {"t": "A World of Tariffs", "u": "https://www.firsteagle.com/insights/world-tariffs"}, {"t": "May Views from First Eagle Alternative Credit Team", "u": "https://www.firsteagle.com/insights/may-views-first-eagle-alternative-credit-team"}, {"t": "Real Estate Lending: Strong Foundation for Investment", "u": "https://www.firsteagle.com/insights/real-estate-lending-strong-foundation-investment"}, {"t": "US Government Shutdown: Is There Signal in the Noise?", "u": "https://www.firsteagle.com/insights/us-government-shutdown-there-signal-noise"}, {"t": "High Yield Municipal Fund Commentary", "u": "https://www.firsteagle.com/insights/high-yield-municipal-fund-commentary-4q25"}, {"t": "Overseas Fund Commentary", "u": "https://www.firsteagle.com/insights/overseas-fund-commentary-4q25"}, {"t": "June Views from First Eagle Global Value Team", "u": "https://www.firsteagle.com/insights/june-views-first-eagle-global-value-team-2026"}, {"t": "June Views from First Eagle Global Value Team", "u": "https://www.firsteagle.com/insights/june-views-first-eagle-global-value-team-2025"}, {"t": "Cryptocurrencies: Hearts of Gold?", "u": "https://www.firsteagle.com/insights/cryptocurrencies-hearts-gold"}, {"t": "Sovereign Debt: Driving the Dynamite Truck", "u": "https://www.firsteagle.com/insights/sovereign-debt-driving-dynamite-truck"}, {"t": "October Views from First Eagle Global Value Team", "u": "https://www.firsteagle.com/insights/october-views-first-eagle-global-value-team-1"}, {"t": "Relative Valuations Favor the Small Cap Universe", "u": "https://www.firsteagle.com/insights/relative-valuations-favor-small-cap-universe"}, {"t": "Alternative Credit: 4Q24 Review", "u": "https://www.firsteagle.com/insights/alternative-credit-4q24-review"}, {"t": "Getting Creative with Enticements for Plan Participation", "u": "https://www.firsteagle.com/insights/getting-creative-enticements-plan-participation"}, {"t": "August Views from First Eagle Global Value Team", "u": "https://www.firsteagle.com/insights/august-views-first-eagle-global-value-team-2025"}, {"t": "Japan Insights with Portfolio Manager Matt Lamphier", "u": "https://www.firsteagle.com/insights/japan-insights-portfolio-manager-matt-lamphier"}, {"t": "Matt McLennan featured in Barron's Markets | Q&A", "u": "https://www.firsteagle.com/insights/matt-mclennan-featured-barrons-markets-qa"}, {"t": "John Miller featured in The Wall Street Journal", "u": "https://www.firsteagle.com/insights/john-miller-featured-wall-street-journal"}, {"t": "Understanding Medicare from A to D", "u": "https://www.firsteagle.com/insights/understanding-medicare-d"}, {"t": "More Bang for Your Buck", "u": "https://www.firsteagle.com/insights/more-bang-your-buck"}, {"t": "Welcome to Reflections 2025-2026", "u": "https://www.firsteagle.com/insights/welcome-reflections-2025-2026"}, {"t": "1Q24 Market Overview: Something Like a Phenomenon", "u": "https://www.firsteagle.com/insights/1q24-market-overview-something-phenomenon"}, {"t": "It (May Be) a Small World After All", "u": "https://www.firsteagle.com/insights/it-may-be-small-world-after-all"}, {"t": "Investment Insights with Portfolio Manager Bill Hench", "u": "https://www.firsteagle.com/insights/investment-insights-portfolio-manager-bill-hench"}, {"t": "Smaller Borrowers Bring Higher Pricing and Bigger Volumes", "u": "https://www.firsteagle.com/insights/smaller-borrowers-bring-higher-pricing-and-bigger-volumes"}, {"t": "The Brave New World of Insurance Asset Management", "u": "https://www.firsteagle.com/insights/brave-new-world-insurance-asset-management"}, {"t": "The Small Idea: Risky Business", "u": "https://www.firsteagle.com/insights/small-idea-risky-business"}, {"t": "Small Caps Offer a Compelling Risk-Reward", "u": "https://www.firsteagle.com/insights/small-caps-offer-compelling-risk-reward"}, {"t": "March Views from First Eagle Global Value Team", "u": "https://www.firsteagle.com/insights/march-views-first-eagle-global-value-team-2026"}, {"t": "Stop the Glide!", "u": "https://www.firsteagle.com/insights/stop-glide"}, {"t": "Overseas Equity ETF Commentary", "u": "https://www.firsteagle.com/insights/overseas-equity-etf-commentary-3q2025"}, {"t": "Navigating Defaults", "u": "https://www.firsteagle.com/insights/navigating-defaults"}, {"t": "Investment Matters: Improving Retirement Plan Menu Design", "u": "https://www.firsteagle.com/insights/investment-matters-improving-retirement-plan-menu-design"}, {"t": "Municipal Bond Market Update Featuring John Miller", "u": "https://www.firsteagle.com/insights/municipal-bond-market-update-featuring-john-miller"}, {"t": "The Small Idea: Onward and (Hopefully) Upward!", "u": "https://www.firsteagle.com/insights/small-idea-onward-and-hopefully-upward"}, {"t": "Alternative Credit: 3Q24 Review", "u": "https://www.firsteagle.com/insights/alternative-credit-3q24-review"}, {"t": "John Miller Featured on WealthManagement FastChat", "u": "https://www.firsteagle.com/insights/john-miller-featured-wealthmanagement-fastchat"}, {"t": "June Views from First Eagle Alternative Credit Team", "u": "https://www.firsteagle.com/insights/june-views-first-eagle-alternative-credit-team"}, {"t": "3Q23 Market Overview: A Riot of Red", "u": "https://www.firsteagle.com/insights/3q23-market-overview-riot-red"}, {"t": "December Views from First Eagle Alternative Credit", "u": "https://www.firsteagle.com/insights/december-views-first-eagle-alternative-credit-0"}, {"t": "October Views from First Eagle Global Value Team", "u": "https://www.firsteagle.com/insights/october-views-first-eagle-global-value-team-2025"}, {"t": "September Views from First Eagle Global Value Team", "u": "https://www.firsteagle.com/insights/september-views-first-eagle-global-value-team-2025"}, {"t": "Harnessing Experience to Identify Small Cap Opportunity", "u": "https://www.firsteagle.com/insights/harnessing-experience-identify-small-cap-opportunity"}, {"t": "Giving (Alt) Credit Where (Alt) Credit Is Due", "u": "https://www.firsteagle.com/insights/giving-alt-credit-where-alt-credit-due"}, {"t": "May Views from First Eagle Global Value Team", "u": "https://www.firsteagle.com/insights/may-views-first-eagle-global-value-team-2025"}, {"t": "A Better Framework for Fund Evaluation", "u": "https://www.firsteagle.com/insights/better-framework-fund-evaluation"}, {"t": "Persistence Pays: Value Investor Insight", "u": "https://www.firsteagle.com/insights/persistence-pays-value-investor-insight"}, {"t": "Credit Selection", "u": "https://www.firsteagle.com/insights/credit-selection"}, {"t": "February Views from First Eagle Global Value Team", "u": "https://www.firsteagle.com/insights/february-views-first-eagle-global-value-team-2026"}, {"t": "Asset-Based Lending: Collateralizing Corporate Assets", "u": "https://www.firsteagle.com/insights/asset-based-lending-collateralizing-corporate-assets"}, {"t": "Global Value Team Webcast Replay with Matthew McLennan", "u": "https://www.firsteagle.com/insights/global-value-team-webcast-replay-matthew-mclennan"}, {"t": "Celebrating Three Years with Bill Hench", "u": "https://www.firsteagle.com/insights/celebrating-three-years-bill-hench-0"}, {"t": "Trade War 2.0", "u": "https://www.firsteagle.com/insights/trade-war-20"}, {"t": "Why Did IBM Reopen Its Defined Benefit Plan?", "u": "https://www.firsteagle.com/insights/why-did-ibm-reopen-its-defined-benefit-plan"}, {"t": "High Yield Municipal Fund Commentary", "u": "https://www.firsteagle.com/insights/high-yield-municipal-fund-commentary-3q2025"}, {"t": "Alternative Credit: 2Q24 Review", "u": "https://www.firsteagle.com/insights/alternative-credit-2q24-review"}, {"t": "Matt McLennan featured on Troy Asset Management Podcast", "u": "https://www.firsteagle.com/insights/matt-mclennan-featured-troy-asset-management-podcast"}, {"t": "March Views from First Eagle Alternative Credit Team", "u": "https://www.firsteagle.com/insights/march-views-first-eagle-alternative-credit-team"}, {"t": "Innovation in the Age of the SECURE 2.0 Act", "u": "https://www.firsteagle.com/insights/innovation-age-secure-20-act"}, {"t": "Diversifying Within Structured Credit with Noelle Sisco", "u": "https://www.firsteagle.com/insights/diversifying-within-structured-credit-noelle-sisco"}, {"t": "January Views from First Eagle Alternative Credit", "u": "https://www.firsteagle.com/insights/january-views-first-eagle-alternative-credit-0"}, {"t": "Breaking Ground in Search of Hidden Gems - Muni Bond Market", "u": "https://www.firsteagle.com/insights/breaking-ground-search-hidden-gems-muni-bond-market"}, {"t": "Investment Insights: The Gold Standard", "u": "https://www.firsteagle.com/insights/investment-insights-gold-standard"}, {"t": "Quarterly Views from First Eagle Direct Lending Team: 1Q26", "u": "https://www.firsteagle.com/insights/quarterly-views-first-eagle-direct-lending-team-1q26"}, {"t": "4Q24 Market Overview: Parting of the Sensory", "u": "https://www.firsteagle.com/insights/4q24-market-overview-parting-sensory"}, {"t": "Will Multiple Employer Plans Help Close the Coverage Gap?", "u": "https://www.firsteagle.com/insights/will-multiple-employer-plans-help-close-coverage-gap"}, {"t": "June Views from First Eagle Alternative Credit", "u": "https://www.firsteagle.com/insights/june-views-first-eagle-alternative-credit-2025"}, {"t": "Global Value Team Quarterly Webcast with Matthew McLennan", "u": "https://www.firsteagle.com/insights/global-value-team-quarterly-webcast-matthew-mclennan"}, {"t": "Cutting Through the Waves: Corporate Governance in Japan", "u": "https://www.firsteagle.com/insights/cutting-through-waves-corporate-governance-japan"}, {"t": "Quarterly Views from First Eagle Global Value Team: 1Q25", "u": "https://www.firsteagle.com/insights/quarterly-views-first-eagle-global-value-team-1q25"}, {"t": "Global Value Team Annual Letter", "u": "https://www.firsteagle.com/insights/global-value-team-annual-letter-1"}, {"t": "Global Value Team Annual Letter", "u": "https://www.firsteagle.com/insights/global-value-team-annual-letter-0"}, {"t": "Emergency Savings Accounts May Change Retirement Outcomes", "u": "https://www.firsteagle.com/insights/emergency-savings-accounts-may-change-retirement-outcomes"}, {"t": "Medicare Finances: A 2023 Update", "u": "https://www.firsteagle.com/insights/medicare-finances-2023-update"}, {"t": "Quarterly Views from First Eagle Global Value Team: 1Q26", "u": "https://www.firsteagle.com/insights/quarterly-views-first-eagle-global-value-team-1q26"}, {"t": "Deal Origination – Structure", "u": "https://www.firsteagle.com/insights/deal-origination-structure"}, {"t": "Gold in Investment Portfolios: FAQs", "u": "https://www.firsteagle.com/insights/gold-investment-portfolios-faqs"}, {"t": "A Review of Existing Measures of Retirement Well-Being", "u": "https://www.firsteagle.com/insights/review-existing-measures-retirement-well-being"}, {"t": "The Small Idea: Everything Old Is New Again", "u": "https://www.firsteagle.com/insights/small-idea-everything-old-new-again"}, {"t": "Non-US Equities: An Exception to American Exceptionalism?", "u": "https://www.firsteagle.com/insights/non-us-equities-exception-american-exceptionalism"}, {"t": "What Stock Allocations Do Advisors Suggest?", "u": "https://www.firsteagle.com/insights/what-stock-allocations-do-advisors-suggest"}, {"t": "Retirement Insights: Better Data for Better Outcomes", "u": "https://www.firsteagle.com/insights/retirement-insights-better-data-better-outcomes"}, {"t": "Quarterly Views from First Eagle Global Value Team: 2Q24", "u": "https://www.firsteagle.com/insights/quarterly-views-first-eagle-global-value-team-2q24"}, {"t": "Direct Lending: 3Q24 Market Views", "u": "https://www.firsteagle.com/insights/direct-lending-3q24-market-views"}, {"t": "Quarterly Views from First Eagle Global Value Team: 2Q25", "u": "https://www.firsteagle.com/insights/quarterly-views-first-eagle-global-value-team-2q25"}, {"t": "May Views from First Eagle Alternative Credit", "u": "https://www.firsteagle.com/insights/may-views-first-eagle-alternative-credit-2025"}, {"t": "Municipal Bond Market Review: 1Q25", "u": "https://www.firsteagle.com/insights/municipal-bond-market-review-1q25"}, {"t": "September Views from First Eagle Alternative Credit", "u": "https://www.firsteagle.com/insights/september-views-first-eagle-alternative-credit-0"}, {"t": "January Views from First Eagle Global Value Team", "u": "https://www.firsteagle.com/insights/january-views-first-eagle-global-value-team-2026"}, {"t": "The Small Idea: Turn! Turn! Turn!", "u": "https://www.firsteagle.com/insights/small-idea-turn-turn-turn"}, {"t": "The HALO effect", "u": "https://www.firsteagle.com/insights/halo-effect"}, {"t": "Evaluating Qualified Default Investment Alternative (QDIA)", "u": "https://www.firsteagle.com/insights/evaluating-qualified-default-investment-alternative-qdia"}, {"t": "1Q25 Market Overview: Forget the Night Ahead", "u": "https://www.firsteagle.com/insights/1q25-market-overview-forget-night-ahead"}, {"t": "Fall in August", "u": "https://www.firsteagle.com/insights/fall-august"}, {"t": "Municipal Bond Market Overview: 4Q25", "u": "https://www.firsteagle.com/insights/municipal-bond-market-overview-4q25"}, {"t": "Matt McLennan on WealthTrack", "u": "https://www.firsteagle.com/insights/matt-mclennan-wealthtrack-2024"}, {"t": "Liquid Real Assets: Powering the Pursuit of Real Returns", "u": "https://www.firsteagle.com/insights/liquid-real-assets-powering-pursuit-real-returns"}, {"t": "Private Credit Across Cycles", "u": "https://www.firsteagle.com/insights/private-credit-across-cycles-0"}, {"t": "Selectivity in Private Credit", "u": "https://www.firsteagle.com/insights/selectivity-private-credit"}, {"t": "Suzanne Franks featured in Barron's", "u": "https://www.firsteagle.com/insights/suzanne-franks-featured-barrons"}, {"t": "Direct Lending: 3Q25 Market Views", "u": "https://www.firsteagle.com/insights/direct-lending-3q25-market-views"}, {"t": "Digging Deep: Lower Middle Market Direct Lending", "u": "https://www.firsteagle.com/insights/digging-deep-lower-middle-market-direct-lending"}, {"t": "Alternative Credit: 3Q23 Review", "u": "https://www.firsteagle.com/insights/alternative-credit-3q23-review"}, {"t": "The Small Idea: It Don't Come Easy", "u": "https://www.firsteagle.com/insights/small-idea-it-dont-come-easy"}, {"t": "Seeking a Better Retirement-Income Solution", "u": "https://www.firsteagle.com/insights/seeking-better-retirement-income-solution"}, {"t": "Re-thinking the Defined Contribution Investment Menu", "u": "https://www.firsteagle.com/insights/re-thinking-defined-contribution-investment-menu"}, {"t": "Jon Dorfman featured on the Credit Exchange podcast", "u": "https://www.firsteagle.com/insights/jon-dorfman-featured-credit-exchange-podcast"}, {"t": "3Q24 Market Overview: Gravity Rides Everything", "u": "https://www.firsteagle.com/insights/3q24-market-overview-gravity-rides-everything"}, {"t": "Municipal Bond Market Review: 2Q25", "u": "https://www.firsteagle.com/insights/municipal-bond-market-review-2q25"}, {"t": "January Views from First Eagle Alternative Credit Team", "u": "https://www.firsteagle.com/insights/january-views-first-eagle-alternative-credit-team"}, {"t": "Confidence Game", "u": "https://www.firsteagle.com/insights/reflections-confidence-game"}, {"t": "The Small Idea: EBITDos and Don’ts", "u": "https://www.firsteagle.com/insights/small-idea-ebitdos-and-donts"}, {"t": "The Small Idea: The Waiting Is the Hardest Part", "u": "https://www.firsteagle.com/insights/small-idea-waiting-hardest-part"}, {"t": "Overseas Equity ETF Commentary", "u": "https://www.firsteagle.com/insights/overseas-equity-etf-commentary-4q25"}, {"t": "Corporate Overview", "u": "https://www.firsteagle.com/insights/corporate-overview"}, {"t": "Municipal Bonds Market Review: 3Q25", "u": "https://www.firsteagle.com/insights/municipal-bonds-market-review-3q25"}, {"t": "Seeking Stability Amid a Housing Imbalance", "u": "https://www.firsteagle.com/insights/seeking-stability-amid-housing-imbalance"}, {"t": "Can U.S. Households Last Through Retirement?", "u": "https://www.firsteagle.com/insights/can-us-households-last-through-retirement"}, {"t": "The Small Idea: The Tide Is High", "u": "https://www.firsteagle.com/insights/small-idea-tide-high"}, {"t": "Municipal Bond SMAs: Personal Attention, Institutional Scale", "u": "https://www.firsteagle.com/insights/municipal-bond-smas-personal-attention-institutional-scale"}, {"t": "Quarterly Views from First Eagle Global Value Team: 3Q24", "u": "https://www.firsteagle.com/insights/quarterly-views-first-eagle-global-value-team-3q24"}, {"t": "Quarterly Views from First Eagle Global Value Team: 3Q25", "u": "https://www.firsteagle.com/insights/quarterly-views-first-eagle-global-value-team-3q25"}, {"t": "2Q23 Market Overview: OK Computer", "u": "https://www.firsteagle.com/insights/2q23-market-overview-ok-computer"}, {"t": "Matt McLennan featured on CNBC", "u": "https://www.firsteagle.com/insights/matt-mclennan-featured-cnbc"}, {"t": "November Views from First Eagle Alternative Credit", "u": "https://www.firsteagle.com/insights/november-views-first-eagle-alternative-credit"}, {"t": "Alternative Credit Review: 2Q25", "u": "https://www.firsteagle.com/insights/alternative-credit-review-2q25"}, {"t": "March Views from First Eagle Alternative Credit", "u": "https://www.firsteagle.com/insights/march-views-first-eagle-alternative-credit-0"}, {"t": "Quarterly Views from First Eagle Global Value Team: 4Q25", "u": "https://www.firsteagle.com/insights/quarterly-views-first-eagle-global-value-team-4q25"}, {"t": "Quarterly Views from First Eagle Global Value Team: 4Q24", "u": "https://www.firsteagle.com/insights/quarterly-views-first-eagle-global-value-team-4q24"}, {"t": "Global Value Team Annual Letter", "u": "https://www.firsteagle.com/insights/global-value-team-annual-letter-2023"}, {"t": "December Views from First Eagle Global Value Team", "u": "https://www.firsteagle.com/insights/december-views-first-eagle-global-value-team-2"}, {"t": "How Widespread Unemployment Might Affect Retirement Security", "u": "https://www.firsteagle.com/insights/how-widespread-unemployment-might-affect-retirement-security"}, {"t": "December Views from First Eagle Global Value Team", "u": "https://www.firsteagle.com/insights/december-views-first-eagle-global-value-team-0"}, {"t": "Summertime Observations", "u": "https://www.firsteagle.com/insights/summertime-observations"}, {"t": "First Eagle Reflections", "u": "https://www.firsteagle.com/insights/first-eagle-reflections-0"}, {"t": "Bill Hench on Asset TV's US Small Caps Masterclass Takeover", "u": "https://www.firsteagle.com/insights/bill-hench-asset-tvs-us-small-caps-masterclass-takeover"}, {"t": "Webcast Replay: Breaking New Ground in Real Estate Investing", "u": "https://www.firsteagle.com/insights/webcast-replay-breaking-new-ground-real-estate-investing"}, {"t": "First Eagle Small Cap Team Celebrates Three Years", "u": "https://www.firsteagle.com/insights/first-eagle-small-cap-team-celebrates-three-years"}, {"t": "Short Duration High Yield Municipal Fund Commentary", "u": "https://www.firsteagle.com/insights/short-duration-high-yield-municipal-fund-commentary-4q25"}, {"t": "Bill Hench on AI, outsourced tech and a re-opening IPO market", "u": "https://www.firsteagle.com/insights/bill-hench-ai-outsourced-tech-and-re-opening-ipo-market"}, {"t": "March Views from First Eagle Global Value Team", "u": "https://www.firsteagle.com/insights/march-views-first-eagle-global-value-team-1"}, {"t": "Gold in Institutional Portfolios: FAQs", "u": "https://www.firsteagle.com/insights/gold-institutional-portfolios-faqs-0"}, {"t": "First Eagle Reflections 2025-2026", "u": "https://www.firsteagle.com/insights/first-eagle-reflections-2025-2026"}, {"t": "March Views from First Eagle Global Value Team", "u": "https://www.firsteagle.com/insights/march-views-first-eagle-global-value-team-0"}, {"t": "Municipal Bond Market Overview: 1Q26", "u": "https://www.firsteagle.com/insights/municipal-bond-market-overview-1q26"}, {"t": "John Miller featured on Bloomberg TV", "u": "https://www.firsteagle.com/insights/john-miller-featured-bloomberg-tv"}, {"t": "4Q25 Market Overview: Kissing the Beehive", "u": "https://www.firsteagle.com/insights/4q25-market-overview-kissing-beehive"}, {"t": "Help Optimize Benefits with a Combo 401(k)/Cash Balance Plan", "u": "https://www.firsteagle.com/insights/help-optimize-benefits-combo-401kcash-balance-plan"}, {"t": "Caution Is the New Conviction", "u": "https://www.firsteagle.com/insights/reflections-caution-new-conviction"}, {"t": "Global Equity ETF Commentary", "u": "https://www.firsteagle.com/insights/global-equity-etf-commentary-4q25"}, {"t": "Grace Under Pressure", "u": "https://www.firsteagle.com/insights/reflections-grace-under-pressure"}, {"t": "2Q25 Market Review: Suddenly It’s a Folk Song", "u": "https://www.firsteagle.com/insights/2q25-market-review-suddenly-its-folk-song"}, {"t": "July Views from First Eagle Global Value Team", "u": "https://www.firsteagle.com/insights/july-views-first-eagle-global-value-team-2025"}, {"t": "Myths that May Impede HSAs' Retirement Planning Benefits", "u": "https://www.firsteagle.com/insights/myths-may-impede-hsas-retirement-planning-benefits"}, {"t": "Quality Never Goes Out of Style", "u": "https://www.firsteagle.com/insights/quality-never-goes-out-style"}, {"t": "Energy Transition: The Long and Winding Road", "u": "https://www.firsteagle.com/insights/energy-transition-long-and-winding-road"}, {"t": "Global Fund Commentary", "u": "https://www.firsteagle.com/insights/global-fund-commentary-4q25"}, {"t": "Small Cap Opportunity Fund Commentary", "u": "https://www.firsteagle.com/insights/small-cap-opportunity-fund-commentary-3q2025"}, {"t": "Gold Fund Commentary", "u": "https://www.firsteagle.com/insights/gold-fund-commentary-4q25"}, {"t": "Investment Insights: The Golden Touch", "u": "https://www.firsteagle.com/insights/investment-insights-golden-touch"}, {"t": "3Q25 Market Review: Against Perfection", "u": "https://www.firsteagle.com/insights/3q25-market-review-against-perfection"}, {"t": "4Q23 Market Overview: Risky Business", "u": "https://www.firsteagle.com/insights/4q23-market-overview-risky-business"}, {"t": "Alternative Credit Review: 3Q25", "u": "https://www.firsteagle.com/insights/alternative-credit-review-3q25"}, {"t": "Different Vehicles for Different Investors", "u": "https://www.firsteagle.com/insights/different-vehicles-different-investors"}, {"t": "The Rise of Alternative Designs for Public Plans", "u": "https://www.firsteagle.com/insights/rise-alternative-designs-public-plans"}, {"t": "Alternative Credit: 3Q22 Review", "u": "https://www.firsteagle.com/insights/alternative-credit-3q22-review"}, {"t": "December Views from First Eagle Municipal Credit Team", "u": "https://www.firsteagle.com/insights/december-views-first-eagle-municipal-credit-team"}, {"t": "April Views from First Eagle Alternative Credit", "u": "https://www.firsteagle.com/insights/april-views-first-eagle-alternative-credit-2025"}, {"t": "Asia Centric by Bloomberg Intelligence Podcast", "u": "https://www.firsteagle.com/insights/asia-centric-bloomberg-intelligence-podcast"}, {"t": "Japan Insights with Portfolio Manager Alan Barr", "u": "https://www.firsteagle.com/insights/japan-insights-portfolio-manager-alan-barr"}, {"t": "August Views from First Eagle Alternative Credit Team", "u": "https://www.firsteagle.com/insights/august-views-first-eagle-alternative-credit-team"}, {"t": "April Views from First Eagle Global Value Team", "u": "https://www.firsteagle.com/insights/april-views-first-eagle-global-value-team-2025"}, {"t": "Deal Origination – Sourcing", "u": "https://www.firsteagle.com/insights/deal-origination-sourcing"}, {"t": "July Views from First Eagle Alternative Credit", "u": "https://www.firsteagle.com/insights/july-views-first-eagle-alternative-credit-2025"}, {"t": "Asset-Based Lending: A Primer", "u": "https://www.firsteagle.com/insights/asset-based-lending-primer"}, {"t": "Quarterly Views from First Eagle Municipal Credit Team: 1Q26", "u": "https://www.firsteagle.com/insights/quarterly-views-first-eagle-municipal-credit-team-1q26"}, {"t": "Quarterly Views from First Eagle Municipal Credit Team: 1Q25", "u": "https://www.firsteagle.com/insights/quarterly-views-first-eagle-municipal-credit-team-1q25"}, {"t": "April Views from First Eagle Global Value Team", "u": "https://www.firsteagle.com/insights/april-views-first-eagle-global-value-team-2"}, {"t": "Municipal Bond Market Update Featuring John Miller", "u": "https://www.firsteagle.com/insights/municipal-bond-market-update-featuring-john-miller-2"}, {"t": "Municipal Bond Market Update Featuring John Miller", "u": "https://www.firsteagle.com/insights/municipal-bond-market-update-featuring-john-miller-1"}, {"t": "Municipal Bond Market Update Featuring John Miller", "u": "https://www.firsteagle.com/insights/municipal-bond-market-update-featuring-john-miller-0"}, {"t": "Municipal Bond Market Update Featuring John Miller", "u": "https://www.firsteagle.com/insights/municipal-bond-market-update-featuring-john-miller-3"}, {"t": "April Views from First Eagle Global Value Team", "u": "https://www.firsteagle.com/insights/april-views-first-eagle-global-value-team-1"}, {"t": "4Q25 Small Cap Market Overview", "u": "https://www.firsteagle.com/insights/4q25-small-cap-market-overview"}, {"t": "July Views from First Eagle Global Value Team", "u": "https://www.firsteagle.com/insights/july-views-first-eagle-global-value-team-1"}, {"t": "Direct Lending: 1Q24 Market Views", "u": "https://www.firsteagle.com/insights/direct-lending-1q24-market-views"}, {"t": "December Views from First Eagle Alternative Credit Team", "u": "https://www.firsteagle.com/insights/december-views-first-eagle-alternative-credit-team-0"}, {"t": "May Views from First Eagle Global Value Team", "u": "https://www.firsteagle.com/insights/may-views-first-eagle-global-value-team-2"}, {"t": "December Views from First Eagle Global Value", "u": "https://www.firsteagle.com/insights/december-views-first-eagle-global-value"}, {"t": "GrowthCap's RJ Lumba speaks with Garrett Stephen", "u": "https://www.firsteagle.com/insights/growthcaps-rj-lumba-speaks-garrett-stephen"}, {"t": "Don't Hide Behind Your Investment Policy Statement", "u": "https://www.firsteagle.com/insights/dont-hide-behind-your-investment-policy-statement"}, {"t": "First Eagle Global Value Team: Perennial Relevance", "u": "https://www.firsteagle.com/insights/first-eagle-global-value-team-perennial-relevance"}, {"t": "Matthew McLennan featured on Troy Asset Management Podcast", "u": "https://www.firsteagle.com/news/matthew-mclennan-featured-troy-asset-management-podcast"}, {"t": "Frank Riccio to Join First Eagle as Head of Sales and Strategic Relationships—US Wealth Solutions", "u": "https://www.firsteagle.com/news/frank-riccio-join-first-eagle-head-sales-and-strategic-relationships-us-wealth-solutions"}, {"t": "First Eagle Investment Management Launches US Small Cap Fund", "u": "https://www.firsteagle.com/news/first-eagle-launches-us-small-cap-fund"}, {"t": "Jean-Marie Eveillard Retires as Senior Advisor", "u": "https://www.firsteagle.com/news/jean-marie-eveillard-retires-senior-advisor"}, {"t": "Max Belmont featured on FEG Insight Bridge Podcast", "u": "https://www.firsteagle.com/news/max-belmont-featured-feg-insight-bridge-podcast"}, {"t": "First Eagle Investments Launches Core Plus Municipal Fund", "u": "https://www.firsteagle.com/news/first-eagle-investments-launches-core-plus-municipal-fund"}, {"t": "First Eagle Coronavirus Response: Message to Our Clients and Partners", "u": "https://www.firsteagle.com/news/first-eagle-coronavirus-response-message-our-clients-and-partners"}, {"t": "First Eagle US Small Cap Opportunity Fund, an Irish-Domiciled UCITS (ICAV), Celebrates Three-Year Anniversary in the UK and Europe", "u": "https://www.firsteagle.com/news/first-eagle-us-small-cap-opportunity-fund-irish-domiciled-ucits-icav-celebrates-three-year"}, {"t": "First Eagle High Yield Municipal Fund Surpasses $1 Billion in Total Assets", "u": "https://www.firsteagle.com/news/first-eagle-high-yield-municipal-fund-surpasses-1-billion-total-assets"}, {"t": "First Eagle Credit Opportunities Fund Celebrates One-Year Anniversary", "u": "https://www.firsteagle.com/news/first-eagle-credit-opportunities-fund-celebrates-one-year-anniversary"}, {"t": "The HALO effect", "u": "https://www.firsteagle.com/news/halo-effect"}, {"t": "First Eagle Investments to Be Honored by Working in Support of Education (W!se)", "u": "https://www.firsteagle.com/news/first-eagle-investments-be-honored-working-support-education-wse"}, {"t": "Rémi Casals Joins First Eagle Investments as Head of International Wealth Solutions", "u": "https://www.firsteagle.com/news/remi-casals-joins-first-eagle-investments-head-international-wealth-solutions"}, {"t": "First Eagle Investments Ranked First Place in Major Employers Category for Pensions & Investments’ Best Places to Work in Money Management for 2024", "u": "https://www.firsteagle.com/news/first-eagle-investments-ranked-first-place-major-employers-category-pensions-investments-best"}, {"t": "First Eagle Investments to Offer Active ETFs", "u": "https://www.firsteagle.com/news/first-eagle-investments-offer-active-etfs"}, {"t": "First Eagle Investments Makes a Donation to Los Angeles Fire Department Foundation and the Los Angeles Regional Food Bank in Support of Humanitarian Relief Efforts in the Area", "u": "https://www.firsteagle.com/news/first-eagle-investments-makes-donation-los-angeles-fire-department-foundation-and-los-angeles"}, {"t": "First Eagle Investment Management Launches Alternative Credit Interval Fund", "u": "https://www.firsteagle.com/news/first-eagle-launches-alternative-credit-interval-fund"}, {"t": "First Eagle Continues to Build out New High Yield Municipal Credit Team with Key Hire", "u": "https://www.firsteagle.com/news/first-eagle-continues-build-out-new-high-yield-municipal-credit-team-key-hire"}, {"t": "First Eagle Investment Management Completes Acquisition of THL Credit", "u": "https://www.firsteagle.com/news/first-eagle-completes-acquisition-thl-credit"}, {"t": "Larry Klaff featured on ABL Advisor", "u": "https://www.firsteagle.com/news/larry-klaff-featured-abl-advisor"}, {"t": "First Eagle Investment Management Renamed First Eagle Investments; New Visual Identity Introduced", "u": "https://www.firsteagle.com/news/new-visual-identity-introduced"}, {"t": "Kimball Brooker Promoted to Co-Head of Global Value Team; PMs Promoted and Added to Certain Strategies", "u": "https://www.firsteagle.com/news/kimball-brooker-promotion"}, {"t": "First Eagle Investments Announces Majority Investment from Genstar Capital", "u": "https://www.firsteagle.com/news/first-eagle-investments-announces-majority-investment-genstar-capital"}, {"t": "First Eagle Investments Expands Fixed Income Platform with Launch of Tactical Municipal Opportunities Fund", "u": "https://www.firsteagle.com/news/first-eagle-investments-expands-fixed-income-platform-launch-tactical-municipal-opportunities"}, {"t": "First Eagle Investments to Expand Its High Yield Municipal Credit Team as Total Assets Surpass $3.5 Billion", "u": "https://www.firsteagle.com/news/first-eagle-investments-expand-its-high-yield-municipal-credit-team-total-assets-surpass-35"}, {"t": "First Eagle Investments Unveils First Active Equity ETFs", "u": "https://www.firsteagle.com/news/first-eagle-investments-unveils-first-active-equity-etfs"}, {"t": "First Eagle Alternative Credit Closes Fourth Middle-Market Direct Lending Fund", "u": "https://www.firsteagle.com/news/first-eagle-alternative-credit-closes-fourth-middle-market-direct-lending-fund"}, {"t": "First Eagle Investments Launches Real Estate Debt Fund Offering Access to Private and Public Credit Opportunities", "u": "https://www.firsteagle.com/news/first-eagle-investments-launches-real-estate-debt-fund-offering-access-private-and-public"}, {"t": "First Eagle Investments Completes Acquisition of Diamond Hill Investment Group", "u": "https://www.firsteagle.com/news/first-eagle-investments-completes-acquisition-diamond-hill-investment-group"}, {"t": "John Miller featured in The Wall Street Journal", "u": "https://www.firsteagle.com/news/john-miller-featured-wall-street-journal"}, {"t": "Katie Cowan Joins First Eagle as Head of Insurance Client Solutions", "u": "https://www.firsteagle.com/news/katie-cowan-joins-first-eagle-head-insurance-client-solutions"}, {"t": "Michelle Handy Featured on FundFire", "u": "https://www.firsteagle.com/news/michelle-handy-featured-fundfire"}, {"t": "First Eagle Investments Appoints Michael Constantino as Chief Financial Officer", "u": "https://www.firsteagle.com/news/first-eagle-investments-appoints-michael-constantino-chief-financial-officer"}, {"t": "First Eagle Expands Offering of US Small Cap Strategy to Non-US Investors", "u": "https://www.firsteagle.com/news/first-eagle-expands-offering-us-small-cap-strategy-non-us-investors"}, {"t": "First Eagle Investment Management Hires Sales Leader to Help Deliver Alternative Investment Solutions to Retail Market", "u": "https://www.firsteagle.com/news/first-eagle-hires-sales-leader-help-deliver-alternative-investment-solutions"}, {"t": "First Eagle Investments Appoints Justin Arabadjief as Senior Trader on Municipal Credit Team", "u": "https://www.firsteagle.com/news/first-eagle-investments-appoints-justin-arabadjief-senior-trader-municipal-credit-team"}, {"t": "First Eagle Investment Management Establishes New Small Cap Team", "u": "https://www.firsteagle.com/news/first-eagle-establishes-new-small-cap-team"}, {"t": "First Eagle Investments Establishes New High Yield Municipal Credit Team to Be Led by Veteran Investor John Miller", "u": "https://www.firsteagle.com/news/first-eagle-investments-establishes-new-high-yield-municipal-credit-team-be-led-veteran"}, {"t": "First Eagle Investments to Transfer Two Active Equity ETFs to New York Stock Exchange from NYSE Arca", "u": "https://www.firsteagle.com/news/first-eagle-investments-transfer-two-active-equity-etfs-new-york-stock-exchange-nyse-arca"}, {"t": "First Eagle High Yield Municipal Fund Reaches $2 Billion in Total Assets, Reflecting Investor Confidence in the Market and the Team’s Expertise", "u": "https://www.firsteagle.com/news/first-eagle-high-yield-municipal-fund-reaches-2-billion-total-assets-reflecting-investor"}, {"t": "First Eagle Credit Opportunities Fund Sees Strong Demand in Retail Channel", "u": "https://www.firsteagle.com/news/first-eagle-credit-opportunities-fund-sees-strong-demand-retail-channel"}, {"t": "Jon Dorfman featured on the Credit Exchange podcast", "u": "https://www.firsteagle.com/news/jon-dorfman-featured-credit-exchange-podcast"}, {"t": "First Eagle Credit Opportunities Fund Continues to See Strong Adoption in Retail Channel", "u": "https://www.firsteagle.com/news/first-eagle-credit-opportunities-fund-continues-see-strong-adoption-retail-channel"}, {"t": "First Eagle Small Cap Opportunity Fund Celebrates Three-Year Anniversary", "u": "https://www.firsteagle.com/news/first-eagle-small-cap-opportunity-fund-celebrates-three-year-anniversary"}, {"t": "First Eagle Investments Identifies Untapped Value in Japanese Equities", "u": "https://www.firsteagle.com/news/first-eagle-investments-identifies-untapped-value-japanese-equities"}, {"t": "First Eagle Appoints New Global Head of Consultant Relations", "u": "https://www.firsteagle.com/news/first-eagle-appoints-new-global-head-consultant-relations"}, {"t": "First Eagle Short Duration High Yield Municipal Fund Surpasses $1 Billion in Assets", "u": "https://www.firsteagle.com/news/first-eagle-short-duration-high-yield-municipal-fund-surpasses-1-billion-in-assets"}, {"t": "First Eagle Investments Joins United Airline’s Eco-Skies Alliance", "u": "https://www.firsteagle.com/news/first-eagle-investments-joins-united-airlines-eco-skies-alliance"}, {"t": "First Eagle Investments Launches US Smid Cap Opportunity Fund", "u": "https://www.firsteagle.com/news/first-eagle-investments-launches-us-smid-cap-opportunity-fund"}, {"t": "First Eagle Investments Foundation Partners with the Council for Economic Education’s FinEd50 Coalition", "u": "https://www.firsteagle.com/news/first-eagle-investments-foundation-partners-council-economic-educations-fined50-coalition"}, {"t": "First Eagle Investments Makes a Donation to German Red Cross in Support of Humanitarian Relief Efforts in Ukraine", "u": "https://www.firsteagle.com/news/first-eagle-investments-makes-donation-german-red-cross-support-humanitarian-relief-efforts"}, {"t": "First Eagle Investments’ High Yield Municipal Business Hits One-Year Milestone with Record Asset Growth and Performance", "u": "https://www.firsteagle.com/news/first-eagle-investments-high-yield-municipal-business-hits-one-year-milestone-record-asset"}, {"t": "Michelle Handy featured on Cloud 9fin: The case for lower middle market lending", "u": "https://www.firsteagle.com/news/michelle-handy-featured-cloud-9fin-case-lower-middle-market-lending"}, {"t": "First Eagle has been recognized by the 2026 LSEG Lipper Fund Awards", "u": "https://www.firsteagle.com/news/first-eagle-has-been-recognized-2026-lseg-lipper-fund-awards"}, {"t": "First Eagle Investments to Acquire Napier Park Global Capital, Expanding Alternative Credit Capabilities", "u": "https://www.firsteagle.com/news/first-eagle-investments-acquire-napier-park-global-capital-expanding-alternative-credit"}, {"t": "First Eagle Investments Completes Acquisition of Napier Park Global Capital, Expanding Alternative Credit Capabilities", "u": "https://www.firsteagle.com/news/first-eagle-investments-completes-acquisition-napier-park-global-capital-expanding-alternative"}, {"t": "First Eagle to Open Its First German Office in More Than 80 Years", "u": "https://www.firsteagle.com/news/first-eagle-open-its-first-german-office-more-80-years"}, {"t": "First Eagle Active ETF Platform Surpasses $3 Billion in Assets Less than 18 Months after Launch", "u": "https://www.firsteagle.com/news/first-eagle-active-etf-platform-surpasses-3-billion-assets-less-18-months-after-launch"}, {"t": "First Eagle Investments Says a Revival in “Animal Spirits” Has Created Opportunities in Select Japanese Equities", "u": "https://www.firsteagle.com/news/first-eagle-investments-says-revival-animal-spirits-has-created-opportunities-select-japanese"}, {"t": "First Eagle Investments Named in Pensions & Investments Best Places to Work in Money Management", "u": "https://www.firsteagle.com/news/first-eagle-investments-named-pensions-investments-best-places-work-money-management"}, {"t": "First Eagle Continues to Build out High Yield Municipal Credit Team", "u": "https://www.firsteagle.com/news/first-eagle-continues-build-out-high-yield-municipal-credit-team"}, {"t": "First Eagle Investment Management Launches Global Real Assets Fund", "u": "https://www.firsteagle.com/news/first-eagle-launches-real-assets-fund"}, {"t": "Retirement Insights", "u": "https://www.firsteagle.com/retirement-insights"}, {"t": "Global Real Assets Strategy", "u": "https://www.firsteagle.com/strategy/global-real-assets-strategy"}, {"t": "International Equity Strategy", "u": "https://www.firsteagle.com/strategy/international-equity-strategy"}, {"t": "Global Value Strategy", "u": "https://www.firsteagle.com/strategy/global-value-strategy"}, {"t": "International Value Strategy", "u": "https://www.firsteagle.com/strategy/international-value-strategy"}, {"t": "Global Equity Strategy", "u": "https://www.firsteagle.com/strategy/global-equity-strategy"}, {"t": "US Value Strategy", "u": "https://www.firsteagle.com/strategy/us-value-strategy"}, {"t": "US Dividend Equity Strategy", "u": "https://www.firsteagle.com/strategy/us-dividend-equity-strategy"}, {"t": "US Small Cap Strategy", "u": "https://www.firsteagle.com/strategy/us-small-cap-strategy"}, {"t": "High Yield Municipal Strategy", "u": "https://www.firsteagle.com/strategy/high-yield-municipal-strategy"}, {"t": "Short Duration High Yield Municipal Strategy", "u": "https://www.firsteagle.com/strategy/short-duration-high-yield-municipal-strategy"}, {"t": "Gold Investment Strategy", "u": "https://www.firsteagle.com/strategy/gold-investment-strategy"}, {"t": "Direct Lending Strategy", "u": "https://www.firsteagle.com/strategy/direct-lending-strategy"}, {"t": "Elizabeth Fitzsimmons", "u": "https://www.firsteagle.com/our-people/elizabeth-fitzsimmons"}, {"t": "Briana Fisher", "u": "https://www.firsteagle.com/our-people/briana-fisher"}, {"t": "John Miller CFA", "u": "https://www.firsteagle.com/our-people/john-miller"}, {"t": "Jon Simmons", "u": "https://www.firsteagle.com/our-people/jon-simmons"}, {"t": "Debbie Lusman", "u": "https://www.firsteagle.com/our-people/debbie-lusman"}, {"t": "First Eagle Employee Benefits", "u": "https://www.firsteagle.com/employee-benefits"}, {"t": "Brandon Webster", "u": "https://www.firsteagle.com/our-people/brandon-webster"}, {"t": "Jon Dorfman", "u": "https://www.firsteagle.com/our-people/jon-dorfman"}, {"t": "Robert Bruno", "u": "https://www.firsteagle.com/our-people/robert-bruno"}, {"t": "Tim Greatorex", "u": "https://www.firsteagle.com/our-people/tim-greatorex"}, {"t": "Mehdi Mahmud", "u": "https://www.firsteagle.com/our-people/mehdi-mahmud"}, {"t": "Jim O’Brien", "u": "https://www.firsteagle.com/our-people/jim-obrien"}, {"t": "Heather Brilliant CFA", "u": "https://www.firsteagle.com/our-people/heather-brilliant"}, {"t": "David O'Connor", "u": "https://www.firsteagle.com/our-people/david-oconnor"}, {"t": "Rémi Casals", "u": "https://www.firsteagle.com/our-people/remi-casals"}, {"t": "Michael Williams", "u": "https://www.firsteagle.com/our-people/michael-williams"}, {"t": "Michael Constantino", "u": "https://www.firsteagle.com/our-people/michael-constantino"}, {"t": "Frank Riccio", "u": "https://www.firsteagle.com/our-people/frank-riccio"}, {"t": "Online Privacy Overview", "u": "https://www.firsteagle.com/online-privacy-overview"}, {"t": "Market & Topical Perspective Insights", "u": "https://www.firsteagle.com/market-topical-insights"}, {"t": "Institutional Investors", "u": "https://www.firsteagle.com/taxonomy/term/9"}, {"t": "Financial Professionals", "u": "https://www.firsteagle.com/taxonomy/term/8"}, {"t": "Individual Investors", "u": "https://www.firsteagle.com/taxonomy/term/7"}, {"t": "Adam Mielnik CFA", "u": "https://www.firsteagle.com/our-people/adam-mielnik"}, {"t": "Suzanne Franks", "u": "https://www.firsteagle.com/our-people/suzanne-franks"}, {"t": "Gold Fund", "u": "https://www.firsteagle.com/funds/gold-fund"}, {"t": "U.S. Smid Cap Opportunity Fund", "u": "https://www.firsteagle.com/funds/us-smid-cap-opportunity-fund"}, {"t": "Joseph Dargan", "u": "https://www.firsteagle.com/our-people/joseph-dargan"}, {"t": "Frank Francese", "u": "https://www.firsteagle.com/our-people/frank-francese"}, {"t": "Mark Salamone", "u": "https://www.firsteagle.com/our-people/mark-salamone"}, {"t": "Connor Sheehy", "u": "https://www.firsteagle.com/our-people/connor-sheehy"}, {"t": "Small Cap Opportunity Fund", "u": "https://www.firsteagle.com/funds/small-cap-opportunity-fund"}, {"t": "Christian Heck CFA", "u": "https://www.firsteagle.com/our-people/christian-heck"}, {"t": "Julien Albertini", "u": "https://www.firsteagle.com/our-people/julien-albertini"}, {"t": "Alan Barr CFA", "u": "https://www.firsteagle.com/our-people/alan-barr"}, {"t": "Short Duration High Yield Municipal Fund", "u": "https://www.firsteagle.com/funds/short-duration-high-yield-municipal-fund"}, {"t": "Why Small Cap Now?", "u": "https://www.firsteagle.com/why-small-cap-now-1"}, {"t": "High Yield Municipal Fund", "u": "https://www.firsteagle.com/funds/high-yield-municipal-fund"}, {"t": "Noelle Sisco, CFA, CAIA", "u": "https://www.firsteagle.com/our-people/noelle-sisco-cfa-caia"}, {"t": "Adrian Jones", "u": "https://www.firsteagle.com/our-people/adrian-jones"}, {"t": "Thomas Kertsos", "u": "https://www.firsteagle.com/our-people/thomas-kertsos"}, {"t": "When We Two Parted", "u": "https://www.firsteagle.com/insights/reflections-when-we-two-parted"}, {"t": "Homing in on Residential Real Estate Debt", "u": "https://www.firsteagle.com/insights/reflections-homing-residential-real-estate-debt"}, {"t": "Reflections: Welcome Letter from Mehdi Mahmud", "u": "https://www.firsteagle.com/insights/reflections-welcome-letter-mehdi-mahmud"}, {"t": "Breaking Ground in Search of Hidden Gems", "u": "https://www.firsteagle.com/insights/reflections-breaking-ground-search-hidden-gems"}, {"t": "The Tide Is High", "u": "https://www.firsteagle.com/insights/reflections-tide-high"}, {"t": "Let the Circle Be Unbroken", "u": "https://www.firsteagle.com/insights/reflections-let-circle-be-unbroken"}, {"t": "Real Estate Debt Fund", "u": "https://www.firsteagle.com/funds/real-estate-debt-fund"}, {"t": "Larry Klaff", "u": "https://www.firsteagle.com/our-people/larry-klaff"}, {"t": "Tactical Municipal Opportunities Fund", "u": "https://www.firsteagle.com/funds/tactical-municipal-opportunities-fund"}, {"t": "Kimball Brooker Jr.", "u": "https://www.firsteagle.com/our-people/kimball-brooker-jr"}, {"t": "Max Belmont CFA", "u": "https://www.firsteagle.com/our-people/max-belmont"}, {"t": "Garrett M. Stephen", "u": "https://www.firsteagle.com/our-people/garrett-m-stephen"}, {"t": "Overseas Fund", "u": "https://www.firsteagle.com/funds/overseas-fund"}, {"t": "Jeffrey Kovanda CFA", "u": "https://www.firsteagle.com/our-people/jeffrey-kovanda"}, {"t": "Singapore", "u": "https://www.firsteagle.com/singapore"}, {"t": "Luxembourg", "u": "https://www.firsteagle.com/luxembourg-1"}, {"t": "Australia", "u": "https://www.firsteagle.com/australia"}, {"t": "Asia Pacific", "u": "https://www.firsteagle.com/asia-pacific"}, {"t": "France", "u": "https://www.firsteagle.com/france"}, {"t": "Japan", "u": "https://www.firsteagle.com/japan"}, {"t": "Netherlands", "u": "https://www.firsteagle.com/netherlands-0"}, {"t": "Americas", "u": "https://www.firsteagle.com/taxonomy/term/1"}, {"t": "Ireland", "u": "https://www.firsteagle.com/ireland"}, {"t": "United States", "u": "https://www.firsteagle.com/taxonomy/term/4"}, {"t": "Belgium", "u": "https://www.firsteagle.com/belgium-0"}, {"t": "Germany", "u": "https://www.firsteagle.com/germany"}, {"t": "Denmark", "u": "https://www.firsteagle.com/denmark"}, {"t": "Europe", "u": "https://www.firsteagle.com/europe"}, {"t": "Finland", "u": "https://www.firsteagle.com/finland"}, {"t": "Switzerland", "u": "https://www.firsteagle.com/switzerland-0"}, {"t": "Hero Section - HP Inst US", "u": "https://www.firsteagle.com/us-institutions-home"}, {"t": "South Korea", "u": "https://www.firsteagle.com/south-korea"}, {"t": "Taiwan", "u": "https://www.firsteagle.com/taiwan"}, {"t": "Spain", "u": "https://www.firsteagle.com/spain-0"}, {"t": "Portugal", "u": "https://www.firsteagle.com/portugal-0"}, {"t": "Hero Section - HP Inst Non US", "u": "https://www.firsteagle.com/non-us-institutions-home"}, {"t": "Hero Section - HP FP", "u": "https://www.firsteagle.com/us-financial-professionals-home"}, {"t": "Hero Section - HP FP NUS", "u": "https://www.firsteagle.com/non-us-financial-professionals-home"}, {"t": "Hero Section - HP Ind", "u": "https://www.firsteagle.com/individuals-home"}, {"t": "FEGE | Global Equity ETF", "u": "https://www.firsteagle.com/funds/global-equity-etf"}, {"t": "Michelle Handy", "u": "https://www.firsteagle.com/our-people/michelle-handy"}, {"t": "George Ross CFA", "u": "https://www.firsteagle.com/our-people/george-ross"}, {"t": "FEOE | Overseas Equity ETF", "u": "https://www.firsteagle.com/funds/overseas-equity-etf"}, {"t": "Credit Opportunities Fund", "u": "https://www.firsteagle.com/funds/credit-opportunities-fund"}, {"t": "US Small Cap Opportunity Fund", "u": "https://www.firsteagle.com/funds/us-small-cap-opportunity-fund"}, {"t": "US Smid Cap Opportunity Strategy", "u": "https://www.firsteagle.com/strategy/us-smid-cap-opportunity-strategy"}, {"t": "Global Fund", "u": "https://www.firsteagle.com/funds/global-fund"}, {"t": "Financial Professional Tools, Practice Management and Client Engagement", "u": "https://www.firsteagle.com/tools-value-add"}, {"t": "Core Plus Municipal Fund", "u": "https://www.firsteagle.com/funds/core-plus-municipal-fund"}, {"t": "Global Real Assets Fund", "u": "https://www.firsteagle.com/funds/global-real-assets-fund"}, {"t": "USFE | US Equity ETF", "u": "https://www.firsteagle.com/funds/usfe-us-equity-etf"}, {"t": "Persistence Pays: Value Investor Insight", "u": "https://www.firsteagle.com/news/persistence-pays-value-investor-insight"}, {"t": "John Miller on Osaic’s Weekly Market Impact Podcast", "u": "https://www.firsteagle.com/news/john-miller-osaics-weekly-market-impact-podcast"}, {"t": "Suzanne Franks featured in Barron’s", "u": "https://www.firsteagle.com/news/suzanne-franks-featured-barrons"}, {"t": "FEMD | Mid Cap Equity ETF", "u": "https://www.firsteagle.com/funds/mid-cap-equity-etf"}, {"t": "John Miller Featured on WealthManagement FastChat", "u": "https://www.firsteagle.com/news/john-miller-featured-wealthmanagement-fastchat"}, {"t": "Taking a Calculated Risk", "u": "https://www.firsteagle.com/news/taking-calculated-risk"}, {"t": "Asset-based lending: Formulaic but not simple", "u": "https://www.firsteagle.com/news/asset-based-lending-formulaic-not-simple"}, {"t": "Michelle Handy Discusses Middle Market Direct Lending Trends on Reorg: The Primary View", "u": "https://www.firsteagle.com/news/michelle-handy-discusses-middle-market-direct-lending-trends-reorg-primary-view"}, {"t": "Private Debt's Sweet Spot", "u": "https://www.firsteagle.com/news/private-debts-sweet-spot"}, {"t": "Benjamin Bahr CFA", "u": "https://www.firsteagle.com/our-people/benjamin-bahr"}, {"t": "Get Updates from First Eagle", "u": "https://www.firsteagle.com/get-updates-from-first-eagle"}, {"t": "David Wang CFA", "u": "https://www.firsteagle.com/our-people/david-wang"}, {"t": "John Masi CFA", "u": "https://www.firsteagle.com/our-people/john-masi"}, {"t": "Privacy Notice for First Eagle’s U.S. Clients and Shareholders", "u": "https://www.firsteagle.com/privacy-notice-us"}, {"t": "Privacy Notice for First Eagle’s Non-U.S. Clients and Shareholders", "u": "https://www.firsteagle.com/privacy-notice-non-us"}, {"t": "First Eagle Investments Recognized Among “Best Places to Work in Money Management”", "u": "https://www.firsteagle.com/first-eagle-investments-recognized-among-best-place-work-money-management"}, {"t": "Performance & Prices", "u": "https://www.firsteagle.com/mutual-fund-performance-overview"}, {"t": "Our Products", "u": "https://www.firsteagle.com/our-financial-products"}, {"t": "Darren Felfeli", "u": "https://www.firsteagle.com/our-people/darren-felfeli"}, {"t": "Melanie Hanlon", "u": "https://www.firsteagle.com/our-people/melanie-hanlon"}, {"t": "Jason Wendorf CFA", "u": "https://www.firsteagle.com/our-people/jason-wendorf"}, {"t": "Justin Arabadjief", "u": "https://www.firsteagle.com/our-people/justin-arabadjief"}, {"t": "Bryce Pickering", "u": "https://www.firsteagle.com/our-people/bryce-pickering"}, {"t": "Michael Licata", "u": "https://www.firsteagle.com/our-people/michael-licata"}, {"t": "Mark Wright CFA", "u": "https://www.firsteagle.com/our-people/mark-wright"}, {"t": "Manish Gupta", "u": "https://www.firsteagle.com/our-people/manish-gupta"}, {"t": "Lisa Galeota", "u": "https://www.firsteagle.com/our-people/lisa-galeota"}, {"t": "Matthew McLennan on Bloomberg Markets", "u": "https://www.firsteagle.com/news/matthew-mclennan-bloomberg-markets"}, {"t": "Matt McLennan on CNBC", "u": "https://www.firsteagle.com/news/matt-mclennan-cnbc"}, {"t": "Matthew McLennan on WealthTrack", "u": "https://www.firsteagle.com/news/matthew-mclennan-wealthtrack-0"}, {"t": "Napier Park, a First Eagle Investments Company, featured in Alternatives Watch", "u": "https://www.firsteagle.com/news/napier-park-first-eagle-investments-company-featured-alternatives-watch"}, {"t": "Tax Information", "u": "https://www.firsteagle.com/tax-information"}, {"t": "Welcome to First Eagle", "u": "https://www.firsteagle.com/first-eagle-investments-among-best-places-work-money-management"}, {"t": "BLOGThe Bird's Eye View", "u": "https://www.firsteagle.com/the-birds-eye-view-blog"}, {"t": "Rajesh Agarwal", "u": "https://www.firsteagle.com/our-people/rajesh-agarwal"}, {"t": "David Blair", "u": "https://www.firsteagle.com/our-people/david-blair"}, {"t": "Idanna Appio PhD", "u": "https://www.firsteagle.com/our-people/idanna-appio"}, {"t": "Declan Hegarty", "u": "https://www.firsteagle.com/our-people/declan-hegarty"}, {"t": "Serhan Secmen", "u": "https://www.firsteagle.com/our-people/serhan-secmen"}, {"t": "Robert O’Brien", "u": "https://www.firsteagle.com/our-people/robert-obrien"}, {"t": "Mohammed El Khazzar", "u": "https://www.firsteagle.com/our-people/mohammed-el-khazzar"}, {"t": "Henry Song CFA", "u": "https://www.firsteagle.com/our-people/henry-song"}, {"t": "US Consumers: Headline Strength, Hidden Strain", "u": "https://www.firsteagle.com/blog/us-consumers-headline-strength-hidden-strain"}, {"t": "PIK Your Poison", "u": "https://www.firsteagle.com/blog/pik-your-poison"}, {"t": "Could Munis Roar in 2026?", "u": "https://www.firsteagle.com/municipalcredit"}, {"t": "First Eagle Fund Shareholder Reports", "u": "https://www.firsteagle.com/first-eagle-fund-shareholder-reports"}, {"t": "Global Balanced Fund", "u": "https://www.firsteagle.com/funds/global-balanced-fund"}, {"t": "U.S. Fund", "u": "https://www.firsteagle.com/funds/us-fund"}, {"t": "Douglas Gimple", "u": "https://www.firsteagle.com/our-people/douglas-gimple"}, {"t": "A New Era of Mortgage Credit Scoring", "u": "https://www.firsteagle.com/blog/new-era-mortgage-credit-scoring"}, {"t": "Rising Dividend Fund", "u": "https://www.firsteagle.com/funds/rising-dividend-fund"}, {"t": "Harvesting AI Productivity with Smart Farming", "u": "https://www.firsteagle.com/blog/harvesting-ai-productivity-smart-farming"}, {"t": "Anirudh Kirtane", "u": "https://www.firsteagle.com/our-people/anirudh-kirtane"}, {"t": "The Lower Middle Market Advantage", "u": "https://www.firsteagle.com/blog/lower-middle-market-advantage"}, {"t": "High Tide for Equities amid Inflation Undertow", "u": "https://www.firsteagle.com/blog/high-tide-equities-amid-inflation-undertow"}, {"t": "Farewell Powell, Welcome Dissent", "u": "https://www.firsteagle.com/blog/farewell-powell-welcome-dissent"}, {"t": "Taxable Fixed Income Markets Update: April 2026", "u": "https://www.firsteagle.com/blog/taxable-fixed-income-markets-update-april-2026"}, {"t": "A Case for Continued Caution in Credit", "u": "https://www.firsteagle.com/blog/case-continued-caution-credit"}, {"t": "Is Energy Volatility the New Normal?", "u": "https://www.firsteagle.com/blog/energy-volatility-new-normal"}, {"t": "Housing Desirability Remains Durable", "u": "https://www.firsteagle.com/blog/housing-desirability-remains-durable"}, {"t": "MMDL Spreads Widen Amid Slower Volume", "u": "https://www.firsteagle.com/blog/mmdl-spreads-widen-amid-slower-volume"}, {"t": "Record Issuance Meets Resilience", "u": "https://www.firsteagle.com/blog/record-issuance-meets-resilience"}, {"t": "Can Smaller Continue to Be Better?", "u": "https://www.firsteagle.com/blog/can-smaller-continue-be-better"}, {"t": "Is the Stagflationary Impulse Transitory or Troubling?", "u": "https://www.firsteagle.com/blog/stagflationary-impulse-transitory-or-troubling"}, {"t": "Buy the Rumor, Sell the News", "u": "https://www.firsteagle.com/blog/buy-rumor-sell-news"}, {"t": "Not All Private Credit Is Equal", "u": "https://www.firsteagle.com/blog/not-all-private-credit-equal"}, {"t": "The Overlooked Risk in the Strait of Hormuz", "u": "https://www.firsteagle.com/blog/overlooked-risk-strait-hormuz"}, {"t": "Small Caps Get Earnings Support", "u": "https://www.firsteagle.com/blog/small-caps-get-earnings-support"}, {"t": "Beyond the Battery", "u": "https://www.firsteagle.com/blog/beyond-battery"}, {"t": "Broader Leadership, Broader Opportunity", "u": "https://www.firsteagle.com/blog/broader-leadership-broader-opportunity"}, {"t": "A Hawkish Hold in the Face of Uncertainty", "u": "https://www.firsteagle.com/blog/hawkish-hold-face-uncertainty"}, {"t": "A Still-Slippery Slope", "u": "https://www.firsteagle.com/blog/still-slippery-slope"}, {"t": "The Tug of War in Gold", "u": "https://www.firsteagle.com/blog/tug-war-gold"}, {"t": "A Supply Path to Energy Security", "u": "https://www.firsteagle.com/blog/supply-path-energy-security"}, {"t": "Between a Rock and a Hard Place", "u": "https://www.firsteagle.com/blog/between-rock-and-hard-place"}, {"t": "A Cacophony of Canaries", "u": "https://www.firsteagle.com/blog/cacophony-canaries"}, {"t": "Middle East Tensions Boil Over", "u": "https://www.firsteagle.com/blog/middle-east-tensions-boil-over"}, {"t": "Alpha Over Beta", "u": "https://www.firsteagle.com/blog/alpha-over-beta"}, {"t": "A Blizzard of Tariffs", "u": "https://www.firsteagle.com/blog/blizzard-tariffs"}, {"t": "Catching the Nominal Drift", "u": "https://www.firsteagle.com/blog/catching-nominal-drift"}, {"t": "The Software Slump", "u": "https://www.firsteagle.com/blog/software-slump"}, {"t": "A Market of Homes", "u": "https://www.firsteagle.com/blog/market-homes"}, {"t": "A Prescription for Opportunity in Muni Healthcare", "u": "https://www.firsteagle.com/blog/prescription-opportunity-muni-healthcare"}, {"t": "A Dove in Hawk’s Clothing?", "u": "https://www.firsteagle.com/blog/dove-hawks-clothing"}, {"t": "Gold Still Worth Its Weight", "u": "https://www.firsteagle.com/blog/gold-still-worth-its-weight"}, {"t": "Can Smaller Deals Yield Better Value?", "u": "https://www.firsteagle.com/blog/can-smaller-deals-yield-better-value"}, {"t": "Silver: Gold on Steroids?", "u": "https://www.firsteagle.com/blog/silver-gold-steroids"}, {"t": "Can Muni Bond Fundamentals Remain Steady?", "u": "https://www.firsteagle.com/blog/can-muni-bond-fundamentals-remain-steady"}, {"t": "Can Venezuela’s Oil Market Reopen?", "u": "https://www.firsteagle.com/blog/can-venezuelas-oil-market-reopen"}, {"t": "Small Caps Poised to Benefit from Rate Cuts", "u": "https://www.firsteagle.com/blog/small-caps-poised-benefit-rate-cuts"}, {"t": "Seeking Ballast as the Dark Clouds of Complacency Gather", "u": "https://www.firsteagle.com/blog/seeking-ballast-dark-clouds-complacency-gather"}, {"t": "The Case for a Small Cap Earnings Revival", "u": "https://www.firsteagle.com/blog/case-small-cap-earnings-revival"}, {"t": "First Eagle Reflections 2025-2026", "u": "https://www.firsteagle.com/blog/first-eagle-reflections-2025-2026"}, {"t": "AI’s Energy Appetite", "u": "https://www.firsteagle.com/blog/ais-energy-appetite"}, {"t": "Happy Holidays from First Eagle", "u": "https://www.firsteagle.com/blog/happy-holidays-first-eagle"}, {"t": "Credit Barometer: Selectivity Remains Key", "u": "https://www.firsteagle.com/blog/credit-barometer-selectivity-remains-key"}, {"t": "Looking Beyond the AI Hype", "u": "https://www.firsteagle.com/blog/looking-beyond-ai-hype"}, {"t": "Fed Cuts and Tees up a Pause", "u": "https://www.firsteagle.com/blog/fed-cuts-and-tees-pause"}, {"t": "The Instability Beneath the Equipoise", "u": "https://www.firsteagle.com/blog/instability-beneath-equipoise"}, {"t": "Runaway Gold", "u": "https://www.firsteagle.com/blog/runaway-gold"}, {"t": "Dealmakers Go Beyond the Mainstream", "u": "https://www.firsteagle.com/blog/dealmakers-go-beyond-mainstream"}, {"t": "Does Bitcoin Glitter Like Gold?", "u": "https://www.firsteagle.com/blog/does-bitcoin-glitter-gold"}, {"t": "Untapped Opportunities in Unrated Municipal Bonds", "u": "https://www.firsteagle.com/blog/untapped-opportunities-unrated-municipal-bonds"}, {"t": "First Eagle Academy", "u": "https://www.firsteagle.com/firsteagleacademy"}, {"t": "Short on Advice: The Great Wealth Transfer Challenge", "u": "https://www.firsteagle.com/blog/short-advice-great-wealth-transfer-challenge"}, {"t": "High Net Worth Client Acquisition and Retention", "u": "https://www.firsteagle.com/high-net-worth-client-acquisition-and-retention"}, {"t": "The “Korea Discount” Gets a Value-Up Turnaround", "u": "https://www.firsteagle.com/blog/korea-discount-gets-value-turnaround"}, {"t": "First Eagle Retirement Investment Solutions", "u": "https://www.firsteagle.com/first-eagle-retirement-investment-solutions"}, {"t": "Succession Planning", "u": "https://www.firsteagle.com/succession-planning"}, {"t": "Alternative Credit Education", "u": "https://www.firsteagle.com/alternative-credit-education-overview"}, {"t": "Elite Teams 2.0: The Future of Teams", "u": "https://www.firsteagle.com/elite-financial-teams"}, {"t": "Behavioral Finance", "u": "https://www.firsteagle.com/behavioral-finance"}, {"t": "Joe Lee", "u": "https://www.firsteagle.com/our-people/joe-lee"}, {"t": "Understanding Medicare from A to D", "u": "https://www.firsteagle.com/understanding-medicare-d"}, {"t": "Building Elite Financial Teams", "u": "https://www.firsteagle.com/building-elite-financial-teams"}, {"t": "Bridging the Residential Housing Gap", "u": "https://www.firsteagle.com/blog/bridging-residential-housing-gap"}, {"t": "Valuation Gaps Widen: Case for Active Management", "u": "https://www.firsteagle.com/blog/valuation-gaps-widen-case-active-management"}, {"t": "Have Munis Solved Their Technical Issues?", "u": "https://www.firsteagle.com/blog/have-munis-solved-their-technical-issues"}, {"t": "Finding Signal in the Bankruptcy Noise", "u": "https://www.firsteagle.com/blog/finding-signal-bankruptcy-noise"}, {"t": "Understanding Medicare from A to D", "u": "https://www.firsteagle.com/blog/understanding-medicare-d"}, {"t": "Gold and Equities—Unusually—Have Risen Together", "u": "https://www.firsteagle.com/blog/gold-and-equities-unusually-have-risen-together"}, {"t": "Is Large Cap Dominance Coming to an End?", "u": "https://www.firsteagle.com/blog/large-cap-dominance-coming-end"}, {"t": "Credit Barometer: Yields Stay High as Spreads Tighten", "u": "https://www.firsteagle.com/blog/credit-barometer-yields-stay-high-spreads-tighten"}, {"t": "4K Gold", "u": "https://www.firsteagle.com/blog/4k-gold"}, {"t": "Fairy Tales and Reality", "u": "https://www.firsteagle.com/blog/fairy-tales-and-reality"}, {"t": "Unhappy New Year!", "u": "https://www.firsteagle.com/blog/unhappy-new-year"}, {"t": "Alternatives in 401(k): Fiduciary Duties First", "u": "https://www.firsteagle.com/blog/alternatives-401k-fiduciary-duties-first"}, {"t": "Demand for Gold Remains Strong", "u": "https://www.firsteagle.com/blog/demand-gold-remains-strong"}, {"t": "Valuation Dispersion Favors Selectivity", "u": "https://www.firsteagle.com/blog/valuation-dispersion-favors-selectivity"}, {"t": "Fed Cuts Rates, but Path Forward “Not Incredibly Obvious”", "u": "https://www.firsteagle.com/blog/fed-cuts-rates-path-forward-not-incredibly-obvious"}, {"t": "Seeking an Edge in the Primary Muni Market", "u": "https://www.firsteagle.com/blog/seeking-edge-primary-muni-market"}, {"t": "Healthcare Credit Opportunities Amid Heightened Uncertainty", "u": "https://www.firsteagle.com/blog/healthcare-credit-opportunities-amid-heightened-uncertainty"}, {"t": "Credit Selection: What Makes a Business Attractive?", "u": "https://www.firsteagle.com/blog/credit-selection-what-makes-business-attractive"}, {"t": "Stagnant US Labor Pool Represents Inflation Risk", "u": "https://www.firsteagle.com/blog/stagnant-us-labor-pool-represents-inflation-risk"}, {"t": "No More Excuses for Small Caps", "u": "https://www.firsteagle.com/blog/no-more-excuses-small-caps"}, {"t": "Strength in Numbers: Why Team Structures Are Leading the Way", "u": "https://www.firsteagle.com/blog/strength-numbers-why-team-structures-are-leading-way"}, {"t": "Resilient Economy Bolsters Small Caps", "u": "https://www.firsteagle.com/blog/resilient-economy-bolsters-small-caps"}, {"t": "Weak Dollar, Strong Opportunity: Why International Value Matters Now", "u": "https://www.firsteagle.com/blog/weak-dollar-strong-opportunity-why-international-value-matters-now"}, {"t": "Looking Beyond the Headlines in Muni Market", "u": "https://www.firsteagle.com/blog/looking-beyond-headlines-muni-market"}];

function searchMatches(query, limit) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const starts = [], contains = [];
  for (const item of SEARCH_INDEX) {
    const t = item.t.toLowerCase();
    if (t.startsWith(q)) starts.push(item);
    else if (t.includes(q)) contains.push(item);
    if (starts.length >= limit) break;
  }
  return starts.concat(contains).slice(0, limit);
}
function suggestListHTML(matches) {
  if (!matches.length) return '<p class="mm-search-empty">No matches found.</p>';
  return matches.map(m =>
    `<a class="mm-search-suggestion" href="${m.u}" target="_blank" rel="noopener">${m.t}</a>`).join('');
}


function initNavMenu() {
  const menu = document.getElementById('nav-menu');
  const body = document.getElementById('nav-menu-body');
  const overlay = document.getElementById('nav-overlay');
  const l1Buttons = () => [...document.querySelectorAll('.hdr-l1 button[data-l1]')];
  if (!menu || !body) return;
  let openKey = null;

  const arrR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';

  function colsHTML(cols, anim) {
    return `<div class="mm-cols"${anim ? ' data-anim' : ''}>` + cols.map(c => `
      <div class="mm-col">
        ${c.h ? `<h5>${c.h}</h5>` : ''}
        <ul>
          ${c.items.map(i => {
            const [label, href] = i.split('|');
            return `<li><a href="${href || '#'}">${label}</a></li>`;
          }).join('')}
        </ul>
        ${c.desc ? `<p class="mm-desc">${c.desc}</p>` : ''}
        ${c.more ? `<a class="mm-col-more" href="${c.more.href}">${c.more.label}<span class="mm-col-more-icon">${arrR}</span></a>` : ''}
      </div>`).join('') + `</div>`;
  }

  function groupHTML(g) {
    return `
      <div class="mm-group" data-anim>
        <a class="mm-cta" href="${g.cta.href}">${g.cta.label}<span class="mm-cta-icon">${arrR}</span></a>
        ${g.desc ? `<p class="mm-desc">${g.desc}</p>` : ''}
        ${g.cols ? colsHTML(g.cols) : ''}
      </div>`;
  }

  function briefHTML(b) {
    if (!b) return '';
    return `<a class="mm-brief${b.light ? ' mm-brief--light' : ''}" href="${b.href}" data-anim>
         <div class="mm-brief-text">
           <div class="mm-brief-copy">
             ${b.eyebrow ? `<p class="mm-brief-eyebrow">${b.eyebrow}</p>` : ''}
             <p class="mm-brief-title">${b.title}</p>
             ${b.body ? `<p class="mm-brief-body">${b.body}</p>` : ''}
           </div>
           <span class="mm-brief-icon">${arrR}</span>
         </div>
         <div class="mm-brief-thumb"><img src="${b.img}" alt="" onerror="this.remove()"></div>
       </a>`;
  }

  function flatPanelHTML(p) {
    const intro = `
      <div class="mm-flat-intro" data-anim>
        <div class="mm-flat-intro-copy">
          <p class="mm-flat-title">${p.title}</p>
          <p class="mm-flat-body">${p.body}</p>
        </div>
        <a class="mm-flat-cta" href="${p.cta.href}">${p.cta.label}</a>
      </div>`;
    // "links" is one flat, eyebrow-less list (Who We Are); "cols" keeps the
    // usual eyebrow-headed columns (Insights) — a panel provides exactly one.
    const rest = p.links
      ? `<ul class="mm-flat-links" data-anim>${p.links.map(i => {
          const [label, href] = i.split('|');
          return `<li><a href="${href || '#'}">${label}</a></li>`;
        }).join('')}</ul>`
      : colsHTML(p.cols, true);
    return intro + rest;
  }

  const mailIcon = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M14.6673 4.6665L8.67332 8.4845C8.46991 8.60265 8.23888 8.66487 8.00365 8.66487C7.76843 8.66487 7.53739 8.60265 7.33398 8.4845L1.33398 4.6665M2.66732 2.6665H13.334C14.0704 2.6665 14.6673 3.26346 14.6673 3.99984V11.9998C14.6673 12.7362 14.0704 13.3332 13.334 13.3332H2.66732C1.93094 13.3332 1.33398 12.7362 1.33398 11.9998V3.99984C1.33398 3.26346 1.93094 2.6665 2.66732 2.6665Z"/></svg>';

  function render(key) {
    menu.classList.toggle('search-open', key === 'search');
    if (key === 'search') return renderSearch();
    const d = roleData().nav[key];
    const main = d.panel
      ? `<div class="mm-groups mm-groups--flat${d.panel.accentLinks ? ' mm-groups--flat-accent' : ''}">${flatPanelHTML(d.panel)}</div>`
      : `<div class="mm-groups">${d.groups.map(groupHTML).join('<div class="mm-divider" data-anim></div>')}</div>`;
    const quicklinks = `
      <div class="mm-quicklinks" data-anim>
        <a class="mm-quicklinks-btn" href="#contact"><span class="mm-quicklinks-icon">${mailIcon}</span>Contact</a>
      </div>`;
    body.innerHTML = `<div class="mm-panel">${main}${quicklinks}</div>` + briefHTML(d.brief);
  }

  /* ---- search ---- */
  const searchIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>';

  function renderSearch() {
    body.innerHTML =
      `<div class="mm-search-simple" data-anim>
         <div class="mm-search-wrap">
           <div class="mm-search-input">
             <span class="mm-search-icon">${searchIcon}</span>
             <input type="search" id="mm-search-input" autocomplete="off"
                    placeholder="${SEARCH.placeholder}" aria-label="${SEARCH.placeholder}">
           </div>
           <div class="mm-search-suggestions" id="mm-search-suggestions" hidden></div>
         </div>
         <button type="button" class="btn mm-search-submit">Search</button>
       </div>`;

    const input = document.getElementById('mm-search-input');
    const suggest = document.getElementById('mm-search-suggestions');

    input.addEventListener('input', () => {
      const matches = searchMatches(input.value, 8);
      suggest.hidden = !input.value.trim();
      suggest.innerHTML = suggestListHTML(matches);
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !suggest.hidden) { e.stopPropagation(); suggest.hidden = true; }
    });
    requestAnimationFrame(() => input.focus({ preventScroll: true }));
  }

  function animateIn() {
    gsap.fromTo(body.querySelectorAll('[data-anim]'),
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out', stagger: 0.06, delay: 0.1 });
  }

  function open(key) {
    if (openKey === key) return close();
    const wasOpen = !!openKey;
    openKey = key;
    l1Buttons().forEach(b => b.classList.toggle('open', b.dataset.l1 === key));
    render(key);
    menu.setAttribute('aria-hidden', 'false');
    menu.classList.add('open');
    overlay.classList.add('open');
    lenis.stop();
    if (!wasOpen) gsap.fromTo(menu, { y: -16, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.35, ease: 'power3.out' });
    animateIn();
  }

  function close() {
    if (!openKey) return;
    openKey = null;
    l1Buttons().forEach(b => b.classList.remove('open'));
    overlay.classList.remove('open');
    menu.setAttribute('aria-hidden', 'true');
    menu.classList.remove('open');
    lenis.start();
    gsap.to(menu, { y: -16, opacity: 0, duration: 0.25, ease: 'power3.in' });
  }

  gsap.set(menu, { opacity: 0, y: -16 });
  // delegated: role changes rebuild the L1 buttons, so bind the container.
  // below the desktop breakpoint the mega-menu is display:none — the mobile sheet handles these taps
  document.querySelector('.hdr-l1')?.addEventListener('click', e => {
    const b = e.target.closest('button[data-l1]');
    if (!b) return;
    if (window.matchMedia('(max-width:1023px)').matches) return;
    open(b.dataset.l1);
  });
  // a role change while the menu is open re-renders it with the new role's content
  roleChangeHooks.push(() => { if (openKey) render(openKey); });
  overlay.addEventListener('click', close);
  // any click outside the open panel closes it (header, logo, eyebrow — not just the scrim)
  document.addEventListener('click', e => {
    if (!openKey) return;
    if (e.target.closest('#nav-menu') || e.target.closest('.hdr-l1 button[data-l1]')) return;
    close();
  });
  window.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  // Real navigation links (e.g. "Overview" -> about.html) close the menu
  // first, then navigate once the close animation finishes — instead of
  // the page unloading mid-transition while the menu is still open.
  body.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href === '#') return;
    e.preventDefault();
    close();
    setTimeout(() => { window.location.href = href; }, 400);
  });
}

/* ============================================================
   MOBILE NAV  (≤1023px — Figma 187:15595)
   ------------------------------------------------------------
   Hamburger opens a full-screen sheet: L1 list on the first
   screen, tapping an L1 slides to an L2 screen built from the
   same NAV data (back row + groups). Search reuses SEARCH.
   ============================================================ */
function initMobileNav() {
  const mnav = document.getElementById('mnav');
  const body = document.getElementById('mnav-body');
  const burger = document.getElementById('hdr-burger');
  if (!mnav || !body || !burger) return;

  const l1Label = key => (roleData().l1.find(([k]) => k === key) || [])[1] || key;
  const chevR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
  const arrOut = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 14L14 6M8 6h6v6"/></svg>';
  const searchIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>';
  const burgerBars = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>';
  const burgerX = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>';

  function slideIn() {
    gsap.fromTo(body.children, { opacity: 0, x: 24 },
      { opacity: 1, x: 0, duration: 0.35, ease: 'power3.out', stagger: 0.05 });
  }

  function renderL1() {
    body.innerHTML = `
      <div class="mnav-l1">
        ${roleData().l1.map(([k, label]) =>
          `<button data-mnav-l1="${k}">${label}${chevR}</button>`).join('')}
      </div>
      <div class="mnav-utility">
        <a href="#">Noteholder Services${arrOut}</a>
        <a href="#">Subscriptions${arrOut}</a>
        <a href="#">Account Access${arrOut}</a>
      </div>`;
    body.querySelectorAll('[data-mnav-l1]').forEach(b =>
      b.addEventListener('click', () => { renderL2(b.dataset.mnavL1); slideIn(); }));
  }

  function renderL2(key) {
    const d = roleData().nav[key];
    body.innerHTML = `
      <div class="mnav-groups">
        <button class="mnav-back">${chevR}${l1Label(key)}</button>
        ${d.groups.map(g => `
          <div class="mnav-group">
            <a class="mm-cta" href="${g.cta.href}">${g.cta.label}<span class="mm-cta-icon">${chevR}</span></a>
            ${g.desc ? `<p class="mm-desc">${g.desc}</p>` : ''}
            ${g.cols ? g.cols.map(c => `
              <div class="mm-col">
                ${c.h ? `<h5>${c.h}</h5>` : ''}
                <ul>${c.items.map(i => {
                  const [label, href] = i.split('|');
                  return `<li><a href="${href || '#'}">${label}</a></li>`;
                }).join('')}</ul>
              </div>`).join('') : ''}
          </div>`).join('')}
      </div>
      <div></div>`;
    body.querySelector('.mnav-back').addEventListener('click', () => { renderL1(); slideIn(); });
  }

  function renderSearch() {
    body.innerHTML = `
      <div class="mnav-search">
        <button class="mnav-back">${chevR}Search</button>
        <div class="mm-search-simple">
          <div class="mm-search-wrap">
            <div class="mm-search-input">
              <span class="mm-search-icon">${searchIcon}</span>
              <input type="search" id="mnav-search-input" autocomplete="off"
                     placeholder="${SEARCH.placeholder}" aria-label="${SEARCH.placeholder}">
            </div>
            <div class="mm-search-suggestions" id="mnav-search-suggestions" hidden></div>
          </div>
          <button type="button" class="btn mm-search-submit">Search</button>
        </div>
      </div>
      <div></div>`;
    body.querySelector('.mnav-back').addEventListener('click', () => { renderL1(); slideIn(); });
    const input = document.getElementById('mnav-search-input');
    const suggest = document.getElementById('mnav-search-suggestions');
    input.addEventListener('input', () => {
      const matches = searchMatches(input.value, 8);
      suggest.hidden = !input.value.trim();
      suggest.innerHTML = suggestListHTML(matches);
    });
    requestAnimationFrame(() => input.focus({ preventScroll: true }));
  }

  /* personalize sheet — GSAP owns display so the collapse can play out
     instead of snapping to display:none the moment the class drops */
  let pzTl;
  function openPz() {
    const foot = document.getElementById('mnav-foot');
    const pz = document.getElementById('mnav-pz');
    if (!foot || !pz) return;
    foot.classList.add('open');
    document.getElementById('mnav-scrim')?.classList.add('open');
    pz.setAttribute('aria-hidden', 'false');
    pz.style.display = 'flex';
    pzTl && pzTl.kill();
    pzTl = gsap.timeline()
      .fromTo(pz, { height: 0, opacity: 0 },
        { height: 'auto', opacity: 1, duration: 0.4, ease: 'power3.out' })
      .fromTo(pz.children, { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out', stagger: 0.05 }, 0.1);
  }
  function closePz(instant) {
    const foot = document.getElementById('mnav-foot');
    const pz = document.getElementById('mnav-pz');
    if (!foot || !pz) return;
    foot.classList.remove('open');
    document.getElementById('mnav-scrim')?.classList.remove('open');
    pz.setAttribute('aria-hidden', 'true');
    pzTl && pzTl.kill();
    const done = () => {
      pz.style.display = 'none';
      gsap.set(pz, { clearProps: 'height,opacity' });
      gsap.set(pz.children, { clearProps: 'opacity,transform' });
    };
    if (instant) { gsap.killTweensOf([pz, ...pz.children]); done(); return; }
    pzTl = gsap.timeline({ onComplete: done })
      .to(pz.children, { opacity: 0, y: 8, duration: 0.18, ease: 'power2.in',
        stagger: { each: 0.04, from: 'end' } })
      .to(pz, { height: 0, opacity: 0, duration: 0.3, ease: 'power2.inOut' }, 0.12);
  }

  function open(screen = 'l1') {
    screen === 'search' ? renderSearch() : renderL1();
    mnav.classList.add('open');
    burger.innerHTML = burgerX;
    mnav.setAttribute('aria-hidden', 'false');
    lenis.stop();
    gsap.fromTo(mnav, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power2.out' });
    slideIn();
  }
  function close() {
    mnav.classList.remove('open');
    burger.innerHTML = burgerBars;
    mnav.setAttribute('aria-hidden', 'true');
    closePz(true);            // whole sheet is going away — reset without playing the collapse
    lenis.start();
  }
  function toggle() { mnav.classList.contains('open') ? close() : open(); }

  burger.addEventListener('click', toggle);
  roleChangeHooks.push(() => { if (mnav.classList.contains('open')) renderL1(); });
  document.getElementById('mnav-close').addEventListener('click', close);

  // footer bar expands the "Personalize Your Experience" sheet upward
  const foot = document.getElementById('mnav-foot');
  const pz = document.getElementById('mnav-pz');
  if (foot && pz) {
    foot.addEventListener('click', e => {
      if (e.target.closest('.mnav-pz')) return;          // taps inside the sheet don't collapse it
      foot.classList.contains('open') ? closePz() : openPz();
    });
    document.getElementById('mnav-scrim')?.addEventListener('click', () => closePz());
  }
  document.getElementById('mnav-search').addEventListener('click', () => { renderSearch(); slideIn(); });
  // the page-header search icon opens the sheet on its search screen at mobile widths
  document.querySelector('.hdr-search')?.addEventListener('click', () => {
    if (!window.matchMedia('(max-width:1023px)').matches) return;
    open('search');
  });
  window.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  // real links: close first, then navigate
  body.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href === '#') return;
    e.preventDefault();
    close();
    setTimeout(() => { window.location.href = href; }, 250);
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
        <div class="mv-frame-fill" aria-hidden="true"></div>
        <img class="mv-still" src="${it.img}" alt="" onerror="this.remove()">
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
  }, 6000);

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
        <div class="mv-frame-fill" aria-hidden="true"></div>
        <img class="mv-still" src="${it.img}" alt="" onerror="this.remove()">
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
  setInterval(() => { if (!hover && !document.hidden) setActive(active + 1); }, 5000);

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
  const CARD_W = 422, CARD_GAP = 8;    // Sprint-1 fixed card width + gap
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
      <div class="team-copy">
        <p class="team-name">${it.name}</p>
        <p class="team-desc">${it.desc}</p>
      </div>
      <svg class="team-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      <img class="team-card-motif" src="assets/img/team-card-motif.svg" aria-hidden="true">`;
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
    const top = 90 + headerH + 56;
    track.style.top = top + 'px';
    const h = 185;
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
  initNavMenu();
  initMobileNav();
  initRoleSwitcher();
  initGate();
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
