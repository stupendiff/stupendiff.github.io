(function () {
  const builds = window.BUILDS || [];
  const cats = (window.CATEGORIES || []).filter((c) => builds.some((b) => b.cat === c.id));
  const root = document.getElementById('builds');

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // Allow **bold** and `code` in copy without shipping a markdown parser.
  const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code>$1</code>');

  function diagram(d) {
    const lanes = d.lanes.map((lane, i) => {
      const nodes = lane.nodes.map((n) => {
        const o = typeof n === 'string' ? { t: n } : n;
        return `<div class="node${o.kind ? ' ' + o.kind : ''}">${esc(o.t)}${o.s ? `<small>${esc(o.s)}</small>` : ''}</div>`;
      }).join('');
      const arrow = i < d.lanes.length - 1
        ? `<div class="arrow" aria-hidden="true">${lane.out ? `<span>${esc(lane.out)}</span>` : ''}</div>` : '';
      return `<div class="lane"><div class="lane-label">${esc(lane.label)}</div><div class="lane-nodes">${nodes}</div></div>${arrow}`;
    }).join('');
    return `<div class="diagram" role="img" aria-label="${esc(d.alt || 'Diagram')}"><div class="flow">${lanes}</div></div>`
      + (d.caption ? `<p class="diagram-cap">${rich(d.caption)}</p>` : '');
  }

  const shotBtn = (s) => `<button type="button" data-src="${esc(s.src)}" data-cap="${esc(s.cap || '')}">
      <img src="${esc(s.src)}" alt="${esc(s.cap || '')}" loading="lazy"></button>`;

  function gallery(shots) {
    const phone = shots.some((s) => s.phone);
    return `<div class="gallery${phone ? ' has-phone' : ''}">` + shots.map((s) =>
      `<figure class="shot${s.wide ? ' wide' : ''}">${shotBtn(s)}${s.cap ? `<figcaption>${esc(s.cap)}</figcaption>` : ''}</figure>`).join('') + '</div>';
  }

  // Design case studies: numbered stages, each an image with what changed and why.
  function evolution(stages) {
    return `<ol class="evo">` + stages.map((s) => `<li class="evo-stage">
        ${s.src ? `<figure class="shot">${shotBtn({ src: s.src, cap: s.title })}</figure>` : ''}
        <h4>${esc(s.title)}</h4>${s.note ? `<p>${rich(s.note)}</p>` : ''}</li>`).join('') + '</ol>';
  }

  const sec = (title, body, cls = '') => `<div class="sec ${cls}"><h3 class="sec-h">${title}</h3>${body}</div>`;

  function card(b) {
    const status = b.status ? `<span class="tag tag-status${/live|in use|runs|public/i.test(b.status) ? ' live' : ''}">${esc(b.status)}</span>` : '';
    const left = [
      sec('The problem', `<p>${rich(b.problem)}</p>`),
      b.how ? sec(b.evolution ? 'The approach' : 'How it works', `<ol class="steps">${b.how.map((s) => `<li>${rich(s)}</li>`).join('')}</ol>`) : '',
      b.numbers ? sec('Numbers', `<div class="numbers">${b.numbers.map((n) => `<div class="num"><span class="n">${esc(n[0])}</span><span class="l">${esc(n[1])}</span></div>`).join('')}</div>`) : '',
      b.links ? `<div class="sec"><div class="links">${b.links.map((l) => `<a href="${esc(l[1])}" target="_blank" rel="noopener">${esc(l[0])} ↗</a>`).join('')}</div></div>` : '',
    ].join('');
    const right = b.decisions ? sec('Decisions', `<ul class="decisions">${b.decisions.map((d) => `<li><b>${esc(d[0])}</b>${rich(d[1])}</li>`).join('')}</ul>`) : '';
    const wide = [
      b.diagram ? sec(b.cat === 'process' ? 'The flow' : 'Architecture', diagram(b.diagram), 'wide') : '',
      b.evolution ? sec('How the design evolved', evolution(b.evolution), 'wide') : '',
      b.shots && b.shots.length ? sec('Screens', gallery(b.shots), 'wide') : '',
      b.visualNote ? `<p class="note wide">${esc(b.visualNote)}</p>` : '',
    ].join('');

    return `<details class="build" id="${esc(b.id)}">
      <summary>
        <h3 class="b-title">${esc(b.name)}</h3>
        <span class="chev" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 4.5 6 8l3.5-3.5"/></svg></span>
        <p class="b-line">${rich(b.line)}</p>
        ${b.award ? `<p class="award">★ ${esc(b.award)}</p>` : ''}
        <div class="b-meta">
          <span class="tag tag-${esc(b.where)}">${b.where === 'habuild' ? 'Habuild' : b.where === 'client' ? 'Client' : 'Personal'}</span>${status}
          <span class="stack">${esc(b.stack.join(' · '))}</span>
        </div>
      </summary>
      <div class="b-body"><div>${left}</div><div>${right}</div>${wide}</div>
    </details>`;
  }

  root.innerHTML = cats.map((c) => {
    const items = builds.filter((b) => b.cat === c.id);
    return `<section class="cat" id="${c.id}" aria-labelledby="${c.id}-h">
      <header class="cat-head"><h2 id="${c.id}-h">${esc(c.name)}</h2><p>${esc(c.blurb)}</p></header>
      <div class="builds">${items.map(card).join('')}</div></section>`;
  }).join('');

  // Tabs are filters: one category shows at a time, its blurb sits under the tabs.
  const tabs = document.querySelector('.bar-links');
  tabs.innerHTML = cats.map((c) => `<a href="#${c.id}" role="tab" data-cat="${c.id}">${esc(c.name)}</a>`).join('');
  const links = [...tabs.querySelectorAll('a')];
  const sections = [...root.querySelectorAll('.cat')];
  const barEl = document.getElementById('bar');
  const heroEl = document.querySelector('.hero');
  const blurb = document.getElementById('bar-blurb');

  function select(id, { scroll = false } = {}) {
    sections.forEach((s) => {
      const show = s.id === id;
      if (show && s.hidden) { s.classList.remove('fade-in'); void s.offsetWidth; s.classList.add('fade-in'); }
      s.hidden = !show;
    });
    links.forEach((a) => {
      const on = a.dataset.cat === id;
      a.classList.toggle('on', on);
      a.setAttribute('aria-selected', String(on));
      // Phone: bring the selected tab to the centre of the row, under the fixed triangle.
      if (on) centreTab(a);
    });
    placePointer();
    blurb.textContent = (cats.find((c) => c.id === id) || {}).blurb || '';
    // If the header has already scrolled away, glide to the top of the list, keeping the header hidden.
    // If the header is still on screen, stay put.
    const heroBottom = heroEl.offsetTop + heroEl.offsetHeight;
    if (scroll && window.scrollY >= heroBottom) {
      const top = root.getBoundingClientRect().top + window.scrollY - barEl.offsetHeight - 16;
      window.scrollTo({ top: Math.max(top, heroBottom), behavior: 'smooth' });
    }
  }
  function centreTab(a) {
    const r = a.getBoundingClientRect(), t = tabs.getBoundingClientRect();
    const delta = r.left + r.width / 2 - (t.left + t.width / 2);
    if (Math.abs(delta) > 1) tabs.scrollBy({ left: delta, behavior: 'smooth' });
  }
  // Phone: swiping the row selects whichever tab settles in the centre.
  const phone = window.matchMedia('(max-width:700px)');
  let settle;
  tabs.addEventListener('scroll', () => {
    if (!phone.matches) return;
    clearTimeout(settle);
    settle = setTimeout(() => {
      const mid = tabs.getBoundingClientRect().left + tabs.clientWidth / 2;
      const near = links.reduce((best, a) => {
        const r = a.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - mid);
        return d < best.d ? { a, d } : best;
      }, { a: null, d: Infinity }).a;
      if (near && !near.classList.contains('on')) {
        history.replaceState(null, '', '#' + near.dataset.cat);
        select(near.dataset.cat, { scroll: true });
      }
    }, 140);
  }, { passive: true });

  // Small triangle under the active tab, pointing into the description strip.
  const pointer = document.querySelector('.bar-pointer');
  function placePointer() {
    const on = tabs.querySelector('a.on'); if (!on) return;
    const r = on.getBoundingClientRect(), box = pointer.parentElement.getBoundingClientRect();
    pointer.style.left = (r.left + r.width / 2 - box.left) + 'px';
  }
  tabs.addEventListener('scroll', placePointer, { passive: true });
  window.addEventListener('resize', placePointer);
  document.fonts?.ready.then(placePointer);

  links.forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    history.replaceState(null, '', '#' + a.dataset.cat);
    select(a.dataset.cat, { scroll: true });
  }));

  // Deep link: /#jagriti opens that card in its category; /#internal selects the tab. Default: first tab.
  const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  const startCat = target ? (target.classList.contains('cat') ? target.id : target.closest('.cat')?.id) : null;
  select(startCat || cats[0].id);
  if (target && target.tagName === 'DETAILS') { target.open = true; target.scrollIntoView({ block: 'start' }); }

  const lb = document.getElementById('lightbox');
  root.addEventListener('click', (e) => {
    const b = e.target.closest('.shot button'); if (!b) return;
    lb.querySelector('img').src = b.dataset.src; lb.querySelector('img').alt = b.dataset.cap;
    lb.querySelector('.lb-cap').textContent = b.dataset.cap; lb.showModal();
  });
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target.closest('.lb-close')) lb.close(); });
})();

// Reach out: one dialog, opened from the hero button or the sticky button.
(() => {
  const dlg = document.getElementById('reach');
  const fab = document.querySelector('.reach-fab');
  document.querySelectorAll('[data-reach]').forEach((b) => b.addEventListener('click', () => dlg.showModal()));
  dlg.querySelector('.reach-x').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'Copied'; }
    catch { b.textContent = 'Copy failed'; }
    setTimeout(() => { b.textContent = 'Copy'; }, 1600);
  }));
  // Desktop: the sticky button appears once the hero has scrolled away.
  const hero = document.querySelector('.hero');
  new IntersectionObserver(([e]) => fab.classList.toggle('show', !e.isIntersecting)).observe(hero);
})();
