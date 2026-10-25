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
      b.how ? sec(b.cat === 'design' ? 'The approach' : 'How it works', `<ol class="steps">${b.how.map((s) => `<li>${rich(s)}</li>`).join('')}</ol>`) : '',
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

  document.getElementById('index').innerHTML = cats.map((c, i) => {
    const items = builds.filter((b) => b.cat === c.id);
    return `<a class="idx" href="#${c.id}"><span class="idx-n">0${i + 1}</span>
      <span class="idx-name">${esc(c.name)}</span><span class="idx-count">${items.length}</span>
      <span class="idx-list">${items.map((b) => esc(b.name.split(' — ')[0])).join(' · ')}</span></a>`;
  }).join('');
  document.querySelector('.bar-links').innerHTML = cats.map((c) => `<a href="#${c.id}">${esc(c.name)}</a>`).join('');

  const toggle = document.getElementById('toggle-all');
  toggle.addEventListener('click', () => {
    const open = toggle.textContent === 'Expand all';
    root.querySelectorAll('.build').forEach((el) => { el.open = open; });
    toggle.textContent = open ? 'Collapse all' : 'Expand all';
  });

  // Deep link: /#jagriti opens that card; /#internal scrolls to the section.
  const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (target) { if (target.tagName === 'DETAILS') target.open = true; target.scrollIntoView({ block: 'start' }); }

  // Highlight the section in view in the sticky bar.
  const links = [...document.querySelectorAll('.bar-links a')];
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) links.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
    }), { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('.cat').forEach((s) => io.observe(s));
  }

  const lb = document.getElementById('lightbox');
  root.addEventListener('click', (e) => {
    const b = e.target.closest('.shot button'); if (!b) return;
    lb.querySelector('img').src = b.dataset.src; lb.querySelector('img').alt = b.dataset.cap;
    lb.querySelector('.lb-cap').textContent = b.dataset.cap; lb.showModal();
  });
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target.closest('.lb-close')) lb.close(); });
})();
