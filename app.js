(function () {
  const builds = (window.BUILDS || []).filter((b) => !b.hidden);
  // Typesetting variants under review: ?type=a|b|c|d (default = current).
  const tv = new URLSearchParams(location.search).get('type'); if (tv) document.body.dataset.type = tv;
  const lv = new URLSearchParams(location.search).get('layout'); if (lv) document.body.dataset.layout = lv;
  // ?look=bento: a bento board on desktop; phones keep the portfolio list. Filters are off in bento.
  const wantLook = new URLSearchParams(location.search).get('look') || 'bento';
  const wide = window.matchMedia('(min-width:760px)');
  const setLook = () => { document.body.dataset.look = wantLook === 'bento' && !wide.matches ? 'portfolio' : wantLook; };
  setLook();
  const cats = (window.CATEGORIES || []).filter((c) => !c.hidden && builds.some((b) => b.cat === c.id));
  const root = document.getElementById('builds');

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // Allow **bold** and `code` in copy without shipping a markdown parser.
  const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code>$1</code>');

  // Board diagram (d.board): dotted background, palette rectangles, rows top→bottom with labelled arrows,
  // and an optional side store (d.side) joined by a dashed line. Simpler than the lane diagram, for popups.
  const BOARD = { teal: ['#DDEFF3', '#0A7388'], yellow: ['#FFEBC7', '#C98A1E'], coral: ['#FFE1E2', '#C43C3C'], grey: ['#FFFFFF', '#9AA6AD'] };
  function boardSVG(d) {
    const W = 640, mainW = d.side ? 470 : 600, x0 = 20, uid = 'bd-' + Math.random().toString(36).slice(2, 7), gap = 12, PER = 3;
    let y = 26, out = '';
    d.rows.forEach((r, i) => {
      out += `<text class="bd-lb" x="${x0}" y="${y + 6}">${esc(r.label.toUpperCase())}</text>`;
      y += 16;
      for (let k0 = 0; k0 < r.nodes.length; k0 += PER) {          // wrap long lanes onto extra lines
        const line = r.nodes.slice(k0, k0 + PER), n = line.length, w = (mainW - gap * (n - 1)) / n;
        const boxes = line.map((nd) => ({ nd, t: wrap(nd.t, Math.floor((w - 16) / 8.2)).slice(0, 2), sb: nd.s ? wrap(nd.s, Math.floor((w - 16) / 6.6)).slice(0, 2) : [] }));
        const h = Math.max(...boxes.map((x) => 20 + x.t.length * 18 + x.sb.length * 15));
        boxes.forEach(({ nd, t, sb }, k) => {
          const [f, st] = BOARD[nd.c || r.c || 'grey'], x = x0 + k * (w + gap), cx = x + w / 2;
          const used = t.length * 18 + sb.length * 15, ty = y + (h - used) / 2 + 13;
          out += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${f}" stroke="${st}" stroke-width="1.5"${nd.dash ? ' stroke-dasharray="6 5"' : ''}/>`
            + t.map((l, j) => `<text class="bd-t" x="${cx}" y="${ty + j * 18}">${esc(l)}</text>`).join('')
            + sb.map((l, j) => `<text class="bd-s" x="${cx}" y="${ty + t.length * 18 + j * 15}">${esc(l)}</text>`).join('');
        });
        y += h + 8;
      }
      if (i < d.rows.length - 1) {
        const ax = x0 + mainW / 2;
        out += `<path d="M${ax} ${y}V${y + 26}" class="bd-ar" marker-end="url(#${uid})"/>${r.out ? `<text class="bd-al" x="${ax + 10}" y="${y + 17}">${esc(r.out)}</text>` : ''}`;
        y += 34;
      }
    });
    const H = y + 14;
    if (d.side) {
      const sx = x0 + mainW + 24, sw = W - sx - 16, sy = 42, [f, st] = BOARD[d.side.c || 'yellow'];
      const sh = Math.max(110, 40 + (d.side.lines || []).length * 18 + 20);
      out += `<text class="bd-lb" x="${sx}" y="32">${esc(d.side.label.toUpperCase())}</text>
        <rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="10" fill="${f}" stroke="${st}" stroke-width="1.5"/>
        <text class="bd-t" x="${sx + sw / 2}" y="${sy + 28}">${esc(d.side.t)}</text>
        ${(d.side.lines || []).map((l, k) => `<text class="bd-s" x="${sx + sw / 2}" y="${sy + 52 + k * 18}">${esc(l)}</text>`).join('')}
        <path d="M${x0 + mainW + 2} ${sy + 27}H${sx - 4}" class="bd-ar" stroke-dasharray="4 4" marker-end="url(#${uid})"/>`;
    }
    return `<div class="board" role="img" aria-label="${esc(d.alt || 'Diagram')}"><svg viewBox="0 0 ${W} ${H}">
      <defs><pattern id="${uid}-d" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="#B9CCD4"/></pattern>
      <marker id="${uid}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#555"/></marker></defs>
      <rect width="${W}" height="${H}" fill="#E9F2F5"/><rect width="${W}" height="${H}" fill="url(#${uid}-d)"/>${out}</svg></div>`
      + (d.caption ? `<p class="diagram-cap">${rich(d.caption)}</p>` : '');
  }
  // House style: every diagram renders as a board. Old lane data ({lanes:[{label,nodes,out}]}) converts here:
  // plain node = white, kind 'key' = yellow, kind 'gate' = coral dashed.
  const lanesToBoard = (d) => ({ ...d, board: true, rows: d.lanes.map((l) => ({ label: l.label, out: l.out, nodes: l.nodes.map((n) => {
    const o = typeof n === 'string' ? { t: n } : n;
    return { t: o.t, s: o.s, c: o.kind === 'key' ? 'yellow' : o.kind === 'gate' ? 'coral' : 'grey', dash: o.kind === 'gate' };
  }) })) });

  function diagram(d) {
    return boardSVG(d.board ? d : lanesToBoard(d));
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
      <img src="${esc(s.src)}" alt="${esc(s.cap || '')}" loading="lazy" decoding="async"></button>`;

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

  const WHERE = { habuild: 'Habuild', personal: 'On my own', techpix: 'Techpix · Freelance', venwiz: 'Venwiz', headfone: 'Headfone', client: 'Client' };
  const ROLE = { pm: 'Product Manager', designer: 'Product Designer', freelance: 'Freelance Designer' };
  const chev = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 4.5 6 8l3.5-3.5"/></svg>';

  // Illustrated cover for builds with no screens to show (placeholder name, no real member data).
  const notifCover = () => `<div class="nt" aria-hidden="true">
      <div class="nt-card"><span class="nt-ic"></span><div><b>Your 6:30 AM session starts in 10 minutes</b><small>Tap to join the live class · now</small></div></div>
      <div class="nt-card"><span class="nt-ic"></span><div><b>Sunita, Day 12 is waiting for you</b><small>Keep the streak going · 2m</small></div></div>
      <div class="nt-card"><span class="nt-ic"></span><div><b>Today's story: 3 poses for a stiff back</b><small>Watch before it disappears · 1h</small></div></div>
      <span class="nt-chip">✓ Dry run passed · ready to schedule</span>
    </div>`;

  function stage(b, i) {
    const c = b.cover;
    const layers = (c.layers || []).map((l) => `<img class="cv-l${l.flat ? ' flat' : ''}" src="${esc(l.src)}" alt=""
        style="--l:${l.l}%;--t:${l.t}%;--w:${l.w}%;--r:${l.r || 0}deg;z-index:${l.z || 1}"${i > 1 ? ' loading="lazy" decoding="async"' : ''}>`).join('');
    return `<div class="cv-stage tint-${esc(c.tint || 'teal')}${c.bg ? ' has-bg' : ''}"${c.bg ? ` style="--bg:url('${esc(c.bg)}');--bgf:${esc(c.bgFilter || 'none')}"` : ''} role="img" aria-label="${esc(c.alt || b.name)}">
        ${c.orbits ? '<span class="cv-orbits" aria-hidden="true"><i></i><i></i><i></i></span>' : ''}
        ${layers}${c.notif ? notifCover() : ''}
        ${c.img ? `<img class="cv-cover" src="${esc(c.img)}" alt=""${i > 1 ? ' loading="lazy" decoding="async"' : ''}>` : ''}
        ${b.placeholder && !c.img ? `<span class="cv-ph"><b>${esc(b.short || b.name)}</b>Cover coming</span>` : ''}
        ${c.img ? '' : (() => { const ph = (b.shots || []).find((x) => x.phone); return ph ? `<img class="cv-full" src="${esc(ph.src.replace('assets/shots/', 'assets/covers/').replace(/\.png$/, '.webp'))}" alt="" loading="lazy" decoding="async">` : ''; })()}
        ${b.carousel && (b.shots || []).length ? '<div class="cv-car" aria-hidden="true"></div>' : ''}
        <span class="cv-tag">${esc(WHERE[b.where] || b.where)}</span>
      </div>`;
  }

  // Processes cover: a FigJam-style board drawn from the card's diagram. One sticky per lane (gate > key > first node),
  // zig-zagging left→right with elbow arrows, lane labels above, one handwritten note pointing at the gate (or key) sticky,
  // and a multiplayer cursor. Fixed 800×500 viewBox so the board holds at every width.
  const STICKY = ['#BFE5EC', '#FFD0D2', '#FFE0B3', '#D9ECD0'];
  function wrap(t, max) {
    const out = []; let line = '';
    t.split(/\s+/).forEach((w) => { if ((line + ' ' + w).trim().length > max && line) { out.push(line); line = w; } else line = (line + ' ' + w).trim(); });
    if (line) out.push(line); return out;
  }
  function figjam(b) {
    const d = b.diagram, W = 800, H = 500, uid = 'fj-' + b.id;
    const lanes = d.lanes.slice(0, 5);
    const nodes = lanes.map((lane) => {
      const all = lane.nodes.map((n) => (typeof n === 'string' ? { t: n } : n));
      return { ...(all.find((n) => n.kind === 'gate') || all.find((n) => n.kind === 'key') || all[0]), label: lane.label };
    });
    const n = nodes.length, slot = (W - 60) / n, w = Math.min(176, slot - 22), fs = 18, lh = 23;
    const tops = [118, 238];
    let tint = 0;
    const st = nodes.map((o, i) => {
      const lines = wrap(o.t, Math.max(8, Math.floor((w - 26) / 10.6))).slice(0, 4);
      const h = Math.max(w * 0.72, lines.length * lh + 36);
      const x = 30 + slot * i + (slot - w) / 2, y = tops[i % 2] + (i % 2 ? 0 : (i * 7) % 14);
      const fill = o.kind === 'key' ? '#FFC65C' : o.kind === 'gate' ? '#FFFFFF' : STICKY[tint++ % STICKY.length];
      return { ...o, lines, x, y, w, h, fill, r: ((i * 37) % 5) - 2 };
    });
    const arrows = st.slice(0, -1).map((a, i) => {
      const c = st[i + 1], x1 = a.x + a.w, y1 = a.y + a.h / 2, x2 = c.x, y2 = c.y + c.h / 2, mx = (x1 + x2) / 2;
      return `<path d="M${x1 + 4} ${y1}H${mx}V${y2}H${x2 - 8}" class="fj-ar" marker-end="url(#${uid}-ah)"/>`;
    }).join('');
    const stickies = st.map((o) => {
      const cx = o.x + o.w / 2, ty = o.y + o.h / 2 - ((o.lines.length - 1) * lh) / 2 + 6;
      const body = o.kind === 'gate'
        ? `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" rx="18" fill="#fff" stroke="#0A7388" stroke-width="2.5" stroke-dasharray="8 6"/>`
        : `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" rx="4" fill="${o.fill}" filter="url(#${uid}-sh)"/>`;
      return `<g transform="rotate(${o.r} ${cx} ${o.y + o.h / 2})">${body}
        <text class="fj-t" x="${cx}" y="${ty}" font-size="${fs}">${o.lines.map((l, k) => `<tspan x="${cx}" dy="${k ? lh : 0}">${esc(l)}</tspan>`).join('')}</text></g>
        <text class="fj-lb" x="${o.x + 2}" y="${o.y - 12}">${esc(o.label.toUpperCase())}</text>`;
    }).join('');
    // Handwritten note in the free band above (target on the top row) or below (bottom row), arrow curling to it.
    let note = '', nTop = Infinity, nBot = -Infinity;
    if (b.note) {
      const k = Math.max(0, st.findIndex((o) => o.kind === 'gate') >= 0 ? st.findIndex((o) => o.kind === 'gate') : st.findIndex((o) => o.kind === 'key'));
      const t = st[k], top = k % 2 === 0, cx = t.x + t.w / 2;
      const nw = b.note.length * 12.5, nx = Math.min(Math.max(cx + (cx > W / 2 ? -nw - 40 : 40), 24), W - nw - 24);
      const ny = top ? 62 : Math.min(H - 26, t.y + t.h + 74);
      const sx = nx < cx ? nx + nw + 6 : nx - 6, sy = ny - 9, ey = top ? t.y - 30 : t.y + t.h + 10;
      nTop = Math.min(ny - 30, ey); nBot = Math.max(ny + 8, ey);
      note = `<text class="fj-note" x="${nx}" y="${ny}">${esc(b.note)}</text>
        <path class="fj-na" d="M${sx} ${sy}Q${cx + (sx > cx ? 10 : -10)} ${sy} ${cx} ${ey}" marker-end="url(#${uid}-nh)"/>`;
    }
    // Multiplayer cursor on a bottom-row sticky the note doesn't point at, so its label hangs into empty space.
    const noteAt = st.findIndex((o) => o.kind === 'gate') >= 0 ? st.findIndex((o) => o.kind === 'gate') : st.findIndex((o) => o.kind === 'key');
    const noteBox = note ? [Number(note.match(/x="([\d.]+)"/)[1]), 0] : null;
    if (noteBox) noteBox[1] = noteBox[0] + b.note.length * 12.5;
    const fits = (o) => { const x = o.x + o.w - 18, l = x + 92 > W - 8 ? x - 78 : x + 16;
      return !(noteBox && noteAt % 2 === 1 && l < noteBox[1] + 10 && l + 74 > noteBox[0] - 10); };
    const pool = st.filter((o, i) => i % 2 === 1 && !(b.note && i === noteAt) && fits(o));
    const cs = pool.length ? pool[b.id.length % pool.length] : st[n - 1], cxp = cs.x + cs.w - 18, cyp = cs.y + cs.h - 12;
    const lx = cxp + 92 > W - 8 ? -78 : 16;
    const cursor = `<g transform="translate(${cxp} ${cyp})"><path d="M0 0l0 22 6-6 5 10 4-2-5-10 8 0z" fill="#DD4D4D" stroke="#fff" stroke-width="1.5"/>
        <rect x="${lx}" y="22" width="74" height="22" rx="11" fill="#DD4D4D"/><text class="fj-cur" x="${lx + 37}" y="37">Saurabh</text></g>`;
    // Centre the whole drawing vertically on the board.
    const top = Math.min(...st.map((o) => o.y - 28), nTop), bot = Math.max(...st.map((o) => o.y + o.h), nBot, cyp + 46);
    const dy = Math.round((H - (top + bot)) / 2);
    return `<svg class="fj" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(d.alt || b.name)}" preserveAspectRatio="xMidYMid slice">
      <defs><pattern id="${uid}-dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.4" fill="#C9D3DC"/></pattern>
        <filter id="${uid}-sh" x="-10%" y="-10%" width="130%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#1c3640" flood-opacity=".16"/></filter>
        <marker id="${uid}-ah" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#555"/></marker>
        <marker id="${uid}-nh" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M1 1L9 5L1 9" fill="none" stroke="#DD4D4D" stroke-width="1.8" stroke-linecap="round"/></marker></defs>
      <rect width="${W}" height="${H}" fill="#F7F9FB"/><rect width="${W}" height="${H}" fill="url(#${uid}-dots)"/>
      <g transform="translate(0 ${dy})">${arrows}${stickies}${note}${cursor}</g></svg>`;
  }

  // Processes card: FigJam board left, caption right (stacked on phone). Click opens the same popup as Product.
  function procCard(b) {
    return `<article class="build proc" id="${esc(b.id)}" data-teams="${esc((b.teams || []).join(' '))}" data-purpose="${esc(b.purpose || '')}">
      <div class="pc">
        <div class="pc-pic">${figjam(b)}</div>
        <div class="pc-text">
          <span class="pc-meta">${esc(WHERE[b.where] || b.where)}${b.year ? ' · ' + esc(b.year) : ''}${b.status ? `<span class="pc-status">${esc(b.status)}</span>` : ''}</span>
          <h3 class="pc-title">${esc(b.short || b.name)}</h3>
          <p class="pc-hook">${rich(b.hook)}</p>
          <p class="pc-out">${rich(b.outcome)}</p>
          <button class="pc-view" type="button" data-open="${esc(b.id)}">View project →</button>
        </div>
      </div>
    </article>`;
  }

  // Play: a looser "sticker wall" bento on desktop (areas set in CSS by `area`), a single column on phone.
  // Pictures are a screenshot (`pic.img`) or a small drawn scene (`pic.art`) for builds with nothing to show yet.
  const ART = {
    typewriter: () => `<div class="art-tw"><div class="tw-paper"><p>The first draft is</p><p>allowed to be <s>bad</s> honest.</p><p>Keep going<i class="tw-caret"></i></p></div><span class="tw-key">⌃⌥L</span></div>`,
    journal: () => `<div class="art-jr"><div class="jr-bar"><span>Foolproof</span><b class="jr-dot"></b></div>
        <div class="jr-week">${['M', 'T', 'W', 'T', 'F'].map((d) => `<span class="jr-d off">${d}</span>`).join('')}<span class="jr-d on">S</span><span class="jr-d on">S</span></div>
        <p class="jr-cap">Reveal opens Saturday</p></div>`,
    meals: () => `<div class="art-ml"><div class="ml-grid">${['Poha', 'Dal rice', 'Pasta', 'Upma', 'Rajma', 'Soup'].map((m, k) => `<span${k === 2 ? ' class="x"' : ''}>${m}</span>`).join('')}</div>
        <span class="ml-note">7 pm: not feeling it → khichdi</span></div>`,
  };
  function playCard(b) {
    const p = b.pic || {};
    const pic = p.img ? `<img class="pl-img${p.fill ? ' fill' : ''}" src="${esc(p.img)}" alt="" loading="lazy" decoding="async">` : p.art && ART[p.art] ? ART[p.art]() : '';
    return `<article class="build play-card" id="${esc(b.id)}" data-area="${esc(b.area || '')}" data-who="${esc((b.who || []).join(' '))}" data-why="${esc(b.why || '')}">
      <div class="pl">
        <div class="pl-pic tint-${esc(p.tint || 'teal')}" role="img" aria-label="${esc(b.name)}">${pic}</div>
        <div class="pl-text">
          <span class="pc-meta">${esc(WHERE[b.where] || b.where)}${b.status ? `<span class="pc-status">${esc(b.status)}</span>` : ''}</span>
          <h3 class="pl-title">${esc(b.short || b.name)}</h3>
          <p class="pl-hook">${rich(b.hook)}</p>
          <p class="pl-out">${rich(b.outcome)}</p>
        </div>
      </div>
    </article>`;
  }

  // Cover card: identity on the outside (picture + short title + problem + subtext). "View project" opens the story
  // in a popup (desktop) or bottom sheet (phone).
  function coverCard(b, i) {
    return `<article class="build has-cover is-feat${b.placeholder ? ' is-ph' : ''}" data-tile="${esc(b.tile || 'S')}" id="${esc(b.id)}" data-roles="${esc((b.roles || []).join(' '))}" data-where="${esc(b.where)}">
      <div class="cv">
        <div class="cv-text">
          <span class="cv-meta"><span class="m-full">${esc(WHERE[b.where] || b.where)}</span><span class="m-short">${esc((WHERE[b.where] || b.where).split(' · ')[0])}</span>${b.year ? ' · ' + esc(b.year) : ''}</span>
          <h3 class="cv-title">${esc(b.short || b.name)}</h3>
          <p class="cv-hook">${rich(b.hook)}</p>
          <p class="cv-out">${rich(b.outcome)}</p>
          <button class="cv-view" type="button" data-open="${esc(b.id)}">View project →</button>
        </div>
        ${stage(b, i)}
      </div>
    </article>`;
  }

  // Popup content: text on the left, pictures and diagram on the right (stacked on phone).
  function modalHTML(b) {
    const text = [
      b.problem ? sec('The problem', `<p>${rich(b.problem)}</p>`) : '',
      b.did ? sec('What I did', `<p>${rich(b.did)}</p>`) : '',
      b.how ? sec('How it works', `<ol class="steps">${b.how.map((x) => `<li>${rich(x)}</li>`).join('')}</ol>`) : '',
      b.changed ? sec('What changed', `<p>${rich(b.changed)}</p>`) : '',
      b.numbers ? sec('Numbers', `<div class="numbers">${b.numbers.map((n) => `<div class="num"><span class="n">${esc(n[0])}</span><span class="l">${esc(n[1])}</span></div>`).join('')}</div>`) : '',
      b.decisions ? sec('Decisions', `<ul class="decisions">${b.decisions.map((d) => `<li><b>${esc(d[0])}</b>${rich(d[1])}</li>`).join('')}</ul>`) : '',
      b.links ? `<div class="sec"><div class="links">${b.links.map((l) => `<a href="${esc(l[1])}" target="_blank" rel="noopener">${esc(l[0])} ↗</a>`).join('')}</div></div>` : '',
      b.lookback ? sec('Looking back', `<p>${rich(b.lookback)}</p>`) : '',
    ].join('');
    const pics = [
      (b.shots || []).length ? sec('Screens', `<div class="pm-shots">${b.shots.map((x) => `<figure class="shot${x.phone ? ' phone' : ''}">${shotBtn(x)}${x.cap ? `<figcaption>${esc(x.cap)}</figcaption>` : ''}</figure>`).join('')}</div>`) : '',
      b.evolution ? sec('How the design evolved', evolution(b.evolution)) : '',
      b.diagram ? sec(b.diagram.title || (b.cat === 'process' ? 'The flow' : 'Architecture'), diagram(b.diagram)) : '',
      b.visualNote ? `<p class="note">${esc(b.visualNote)}</p>` : '',
      b.placeholder ? `<div class="pm-ph tint-${esc((b.cover || {}).tint || 'teal')}">Pictures coming</div>` : '',
    ].join('');
    return `<header class="pm-head"><span class="cv-meta">${esc(WHERE[b.where] || b.where)}${b.year ? ' · ' + esc(b.year) : ''}</span>
        <h2 class="pm-title" id="pm-h">${esc(b.short || b.name)}</h2><p class="pm-hook">${rich(b.hook)}</p></header>
      <div class="pm-body"><div class="pm-text">${text}</div><div class="pm-pics">${pics}</div></div>`;
  }

  function bodyHTML(b) {
    const left = [
      sec('The problem', `<p>${rich(b.problem)}</p>`),
      b.how ? sec(b.evolution ? 'The approach' : 'How it works', `<ol class="steps">${b.how.map((s) => `<li>${rich(s)}</li>`).join('')}</ol>`) : '',
      b.numbers ? sec('Numbers', `<div class="numbers">${b.numbers.map((n) => `<div class="num"><span class="n">${esc(n[0])}</span><span class="l">${esc(n[1])}</span></div>`).join('')}</div>`) : '',
      b.links ? `<div class="sec"><div class="links">${b.links.map((l) => `<a href="${esc(l[1])}" target="_blank" rel="noopener">${esc(l[0])} ↗</a>`).join('')}</div></div>` : '',
    ].join('');
    const right = b.decisions ? sec('Decisions', `<ul class="decisions">${b.decisions.map((d) => `<li><b>${esc(d[0])}</b>${rich(d[1])}</li>`).join('')}</ul>`) : '';
    const wide = [
      b.diagram ? sec(b.diagram.title || (b.cat === 'process' ? 'The flow' : 'Architecture'), diagram(b.diagram), 'wide') : '',
      b.evolution ? sec('How the design evolved', evolution(b.evolution), 'wide') : '',
      b.shots && b.shots.length ? sec('Screens', gallery(b.shots), 'wide') : '',
      b.visualNote ? `<p class="note wide">${esc(b.visualNote)}</p>` : '',
    ].join('');
    return `<div>${left}</div><div>${right}</div>${wide}`;
  }

  function card(b, i) {
    if (b.cover && b.cat === 'product') return coverCard(b, i);
    if (b.cat === 'process' && b.hook && b.diagram) return procCard(b);
    if (b.cat === 'play' && b.hook) return playCard(b);
    const status = b.status ? `<span class="tag tag-status${/live|in use|runs|public/i.test(b.status) ? ' live' : ''}">${esc(b.status)}</span>` : '';
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
      <div class="b-body">${bodyHTML(b)}</div>
    </details>`;
  }

  root.innerHTML = cats.map((c) => {
    const items = builds.filter((b) => b.cat === c.id).sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
    return `<section class="cat" id="${c.id}" aria-labelledby="${c.id}-h">
      <header class="cat-head"><h2 id="${c.id}-h">${esc(c.name)}</h2><p>${esc(c.blurb)}</p></header>
      <div class="builds">${items.map(card).join('')}</div>
      <p class="f-empty" hidden>Nothing matches that combination. <button type="button" class="linkish" data-f-reset>Show everything</button></p></section>`;
  }).join('');

  // Tabs are filters: one category shows at a time, its blurb sits under the tabs.
  const tabs = document.querySelector('.bar-links');
  tabs.innerHTML = cats.map((c) => `<a href="#${c.id}" role="tab" data-cat="${c.id}">${esc(c.name)}</a>`).join('');
  const links = [...tabs.querySelectorAll('a')];
  const sections = [...root.querySelectorAll('.cat')];
  const barEl = document.getElementById('bar');
  const heroEl = document.querySelector('.hero');
  const blurb = document.getElementById('bar-blurb');

  // Per-tab sentence filters: "Viewing 5 product problems I solved as [any role] [anywhere]".
  const caret = '<svg viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4"/></svg>';
  const params = new URLSearchParams(location.search);
  const sentences = {};
  cats.filter((c) => c.sentence).forEach((c) => {
    const el = document.createElement('span');
    el.className = 'f-line';
    el.innerHTML = esc(c.sentence)
      .replace('{n}', '<b class="f-n"></b>').replace('{noun}', '<span class="f-noun"></span>')
      .replace(/\{(\w+)\}/g, (m, id) => {
        const f = c.filters.find((x) => x.id === id); if (!f) return m;
        return `<label class="pick"><span class="pick-v"></span>${caret}<select data-f="${f.id}" aria-label="Filter: ${esc(f.any)}">
          <option value="">${esc(f.any)}</option>${f.options.map((o) => `<option value="${esc(o[0])}">${esc(o[1])}</option>`).join('')}</select></label>`;
      });
    const state = {};
    c.filters.forEach((f) => { const v = params.get(f.id); state[f.id] = f.options.some((o) => o[0] === v) ? v : ''; });
    sentences[c.id] = { el, state, cat: c };
    el.addEventListener('change', (e) => {
      const sel = e.target.closest('select'); if (!sel) return;
      state[sel.dataset.f] = sel.value; applyFilters(c.id, true);
    });
    applyFilters(c.id);
  });
  root.addEventListener('click', (e) => {
    const r = e.target.closest('[data-f-reset]'); if (!r) return;
    const id = r.closest('.cat').id; const sn = sentences[id];
    Object.keys(sn.state).forEach((k) => { sn.state[k] = ''; }); applyFilters(id, true);
  });

  function matches(card, c, state) {
    return c.filters.every((f) => {
      if (!state[f.id]) return true;
      const have = (card.dataset[f.field] || '').split(' ');
      return have.includes(state[f.id]);
    });
  }
  function applyFilters(id, fromUser) {
    const { el, state, cat: c } = sentences[id];
    const sec = document.getElementById(id);
    const cards = [...sec.querySelectorAll('.build')];
    let n = 0;
    cards.forEach((card) => {
      const show = matches(card, c, state);
      if (show && card.hidden && fromUser) { card.classList.remove('fade-in'); void card.offsetWidth; card.classList.add('fade-in'); }
      card.hidden = !show; if (show) n++;
    });
    sec.querySelector('.f-empty').hidden = n > 0;
    sec.classList.toggle('filtered', Object.values(state).some(Boolean));
    const nEl = el.querySelector('.f-n'), nounEl = el.querySelector('.f-noun');
    if (nEl) nEl.textContent = n;
    if (nounEl && c.noun) nounEl.textContent = c.noun[n === 1 ? 0 : 1];
    c.filters.forEach((f) => {
      const sel = el.querySelector(`select[data-f="${f.id}"]`);
      sel.value = state[f.id];
      [...sel.options].forEach((o, k) => {
        const label = k === 0 ? f.any : f.options[k - 1][1];
        // Count what this choice would show, given the other filter.
        const cnt = cards.filter((card) => matches(card, c, { ...state, [f.id]: o.value })).length;
        o.textContent = `${label} (${cnt})`;
        o.disabled = cnt === 0 && o.value !== state[f.id];
        o.hidden = !!o.value && !cards.some((card) => matches(card, c, { [f.id]: o.value }));
      });
      sel.closest('.pick').querySelector('.pick-v').textContent = sel.value ? f.options.find((o) => o[0] === sel.value)[1] : f.any;
      sel.closest('.pick').classList.toggle('set', !!sel.value);
    });
    if (fromUser) {
      const q = new URLSearchParams(location.search);
      c.filters.forEach((f) => (state[f.id] ? q.set(f.id, state[f.id]) : q.delete(f.id)));
      const qs = q.toString();
      history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
    }
  }

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
    if (false) {
      const sn = sentences[id]; Object.keys(sn.state).forEach((k) => { sn.state[k] = ''; }); applyFilters(id);
      blurb.textContent = (cats.find((c) => c.id === id) || {}).blurb || '';
    } else if (sentences[id]) blurb.replaceChildren(sentences[id].el);
    else blurb.textContent = (cats.find((c) => c.id === id) || {}).blurb || '';
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

  wide.addEventListener('change', () => { setLook(); const on = tabs.querySelector('a.on'); if (on) select(on.dataset.cat); });
  links.forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    history.replaceState(null, '', '#' + a.dataset.cat);
    select(a.dataset.cat, { scroll: true });
  }));

  // Deep link: /#jagriti opens that card in its category; /#internal selects the tab. Default: first tab.
  const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  const startCat = target ? (target.classList.contains('cat') ? target.id : target.closest('.cat')?.id) : null;
  if (target && target.hidden && sentences[startCat]) {
    Object.keys(sentences[startCat].state).forEach((k) => { sentences[startCat].state[k] = ''; }); applyFilters(startCat, true);
  }
  select(startCat || cats[0].id);
  if (target && target.tagName === 'DETAILS') { target.open = true; target.scrollIntoView({ block: 'start' }); }

  // Project popup: desktop = centred dialog, phone = bottom sheet. Deep link /#jagriti opens it.
  const pm = document.getElementById('proj');
  const pmIn = pm.querySelector('.pm-in');
  const byId = Object.fromEntries(builds.map((b) => [b.id, b]));
  function openProject(id) {
    const b = byId[id]; if (!b) return;
    pmIn.innerHTML = modalHTML(b); pm.querySelector('.pm-card').scrollTop = 0;
    if (!pm.open) pm.showModal();
    history.replaceState(null, '', location.pathname + location.search + '#' + id);
  }
  function closeProject() {
    pm.close();
    const cat = document.querySelector('.cat:not([hidden])');
    history.replaceState(null, '', location.pathname + location.search + (cat ? '#' + cat.id : ''));
  }
  root.addEventListener('click', (e) => {
    if (e.target.closest('a,select,label')) return;
    const card = e.target.closest('.build.has-cover,.build.proc,.build.play-card'); if (card) openProject(card.id);
  });
  pm.querySelector('.pm-x').addEventListener('click', closeProject);
  pm.addEventListener('click', (e) => { if (e.target === pm) closeProject(); });
  pm.addEventListener('cancel', (e) => { e.preventDefault(); closeProject(); });
  if (target && target.matches('.has-cover,.proc,.play-card')) openProject(target.id);

  // Hover carousel: cycles the project's screens over the cover (desktop, motion allowed).
  const canHover = window.matchMedia('(hover:hover) and (prefers-reduced-motion:no-preference)');
  root.querySelectorAll('.build.has-cover').forEach((card) => {
    const car = card.querySelector('.cv-car'); if (!car) return;
    let timer, k = 0;
    card.addEventListener('mouseenter', () => {
      if (!canHover.matches) return;
      if (!car.children.length) car.innerHTML = byId[card.id].shots.map((x) => `<img src="${esc(x.src)}" alt="">`).join('');
      const imgs = [...car.children]; k = 0;
      car.classList.add('on'); imgs.forEach((im, j) => im.classList.toggle('on', j === 0));
      timer = setInterval(() => { k = (k + 1) % imgs.length; imgs.forEach((im, j) => im.classList.toggle('on', j === k)); }, 1600);
    });
    card.addEventListener('mouseleave', () => { clearInterval(timer); car.classList.remove('on'); });
  });

  const lb = document.getElementById('lightbox');
  [root, pm].forEach((el) => el.addEventListener('click', (e) => {
    const b = e.target.closest('.shot button'); if (!b) return;
    e.stopPropagation();
    lb.querySelector('img').src = b.dataset.src; lb.querySelector('img').alt = b.dataset.cap;
    lb.querySelector('.lb-cap').textContent = b.dataset.cap; lb.showModal();
  }));
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
