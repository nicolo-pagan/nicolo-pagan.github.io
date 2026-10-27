/* Renders the content in js/data.js and wires up the interactive parts:
   hero network, slide viewer, lightbox, publication filters, scroll reveals. */
(function () {
  const S = window.SITE;
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
  const icon = (name) => `<svg class="ic"><use href="#i-${name}"/></svg>`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const boldMe = (authors) => esc(authors).replace(/N\. Pagan\*?/, (m) => `<b>${m}</b>`);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const paperById = Object.fromEntries(S.papers.map((p) => [p.id, p]));
  const posterById = Object.fromEntries(S.posters.map((p) => [p.id, p]));
  const talkById = Object.fromEntries(S.talks.map((t) => [t.id, t]));

  /* ---------------- Paper link buttons (shared by featured + list) ---------------- */
  function paperActions(p, cls) {
    const out = [];
    if (p.links.paper) out.push(`<a class="${cls}" href="${p.links.paper}" target="_blank" rel="noopener">${icon("external")}Paper</a>`);
    if (p.links.pdf) out.push(`<a class="${cls}" href="${p.links.pdf}" target="_blank" rel="noopener">${icon("file")}PDF</a>`);
    if (p.talk) out.push(`<button class="${cls}" data-open-talk="${p.talk}">${icon("slides")}Slides</button>`);
    if (p.poster) out.push(`<button class="${cls}" data-open-poster="${p.poster}">${icon("image")}Poster</button>`);
    return out.join("");
  }

  /* ---------------- Featured research ---------------- */
  const featured = $("#featured");
  S.papers.filter((p) => p.featured).forEach((p) => {
    const row = el("article", "feat reveal");
    row.innerHTML = `
      <figure class="feat-fig" data-zoom="${p.figure}" data-caption="${esc(p.caption || p.title)}">
        <img src="${p.figure}" alt="${esc(p.caption || p.title)}" loading="lazy">
        <span class="zoom-hint">${icon("expand")}</span>
        ${p.caption ? `<figcaption>${esc(p.caption)}</figcaption>` : ""}
      </figure>
      <div>
        <div class="feat-meta"><span class="venue">${esc(p.venue)}</span><span class="year">${p.year}</span></div>
        <h3>${esc(p.title)}</h3>
        <p class="authors">${boldMe(p.authors)}</p>
        ${p.stat ? `<div class="big-stat"><strong>${esc(p.stat.value)}</strong><span>${esc(p.stat.label)}</span></div>` : ""}
        <p class="summary">${esc(p.summary)}</p>
        <div class="actions">${paperActions(p, "chip-btn")}</div>
      </div>`;
    featured.appendChild(row);
  });

  /* ---------------- Slide viewer ---------------- */
  const talkList = $("#talkList"), viewer = $("#viewer"), stage = $("#stage"), slideImg = $("#slideImg");
  const thumbs = $("#thumbs"), counter = $("#counter"), bar = $("#progressBar");
  const prevBtn = $("#prevBtn"), nextBtn = $("#nextBtn");
  let talk = null, idx = 0;
  const useHd = () => !!document.fullscreenElement || stage.clientWidth * (window.devicePixelRatio || 1) > 1700;
  const slideSrc = (t, i, size) => `assets/slides/${t.id}/${size ? size + "/" : ""}${String(i + 1).padStart(2, "0")}.webp`;

  S.talks.forEach((t) => {
    const b = el("button", "talk-item");
    b.setAttribute("role", "tab");
    b.dataset.talk = t.id;
    b.innerHTML = `<img src="${slideSrc(t, 0, "thumbs")}" alt="" loading="lazy"><span><b>${esc(t.title)}</b><small>${esc(t.event)} · ${esc(t.date)}</small></span>`;
    b.addEventListener("click", () => selectTalk(t.id));
    talkList.appendChild(b);
  });

  function selectTalk(id, slide = 0) {
    talk = talkById[id];
    talkList.querySelectorAll(".talk-item").forEach((b) => b.setAttribute("aria-selected", b.dataset.talk === id));
    $("#viewerTitle").textContent = talk.title;
    $("#viewerMeta").textContent = `${talk.event} · ${talk.place} · ${talk.date}`;
    $("#viewerPdf").href = `content/talks/${talk.id}.pdf`;
    const paper = paperById[talk.paper];
    const plink = paper && (paper.links.paper || paper.links.pdf);
    $("#viewerPaper").hidden = !plink;
    if (plink) $("#viewerPaper").href = plink;
    thumbs.innerHTML = "";
    for (let i = 0; i < talk.slides; i++) {
      const tb = el("button", "", `<img src="${slideSrc(talk, i, "thumbs")}" alt="Slide ${i + 1}" loading="lazy">`);
      tb.addEventListener("click", () => go(i));
      thumbs.appendChild(tb);
    }
    go(slide, true);
  }

  function go(i, instant) {
    if (!talk) return;
    idx = Math.max(0, Math.min(talk.slides - 1, i));
    const size = useHd() ? "hd" : "";
    const src = slideSrc(talk, idx, size);
    slideImg.classList.add("loading");
    const pre = new Image();
    pre.onload = pre.onerror = () => { slideImg.src = src; slideImg.classList.remove("loading"); };
    pre.src = src;
    slideImg.alt = `${talk.title} — slide ${idx + 1} of ${talk.slides}`;
    [idx + 1, idx + 2].forEach((j) => { if (j < talk.slides) new Image().src = slideSrc(talk, j, size); });
    counter.textContent = `${idx + 1} / ${talk.slides}`;
    bar.style.width = `${((idx + 1) / talk.slides) * 100}%`;
    prevBtn.disabled = idx === 0;
    nextBtn.disabled = idx === talk.slides - 1;
    [...thumbs.children].forEach((b, j) => b.classList.toggle("on", j === idx));
    const on = thumbs.children[idx];
    if (on) thumbs.scrollTo({ left: on.offsetLeft - thumbs.clientWidth / 2 + on.clientWidth / 2, behavior: instant ? "auto" : "smooth" });
  }

  prevBtn.addEventListener("click", () => go(idx - 1));
  nextBtn.addEventListener("click", () => go(idx + 1));
  $("#viewerFs").addEventListener("click", toggleFs);
  document.addEventListener("fullscreenchange", () => go(idx, true));
  function toggleFs() {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (viewer.requestFullscreen) viewer.requestFullscreen();
  }

  // Swipe on touch screens
  let x0 = null;
  stage.addEventListener("pointerdown", (e) => { x0 = e.clientX; });
  stage.addEventListener("pointerup", (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0; x0 = null;
    if (Math.abs(dx) > 40) go(idx + (dx < 0 ? 1 : -1));
  });

  // Keyboard: active while the viewer is on screen
  let viewerVisible = false;
  new IntersectionObserver(([e]) => { viewerVisible = e.intersectionRatio > 0.4; }, { threshold: [0, 0.4, 1] }).observe(viewer);
  document.addEventListener("keydown", (e) => {
    if (!lightbox.hidden) { if (e.key === "Escape") closeLightbox(); return; }
    if (/input|textarea/i.test(document.activeElement.tagName)) return;
    if (!viewerVisible && !document.fullscreenElement) return;
    if (e.key === "ArrowRight") { go(idx + 1); e.preventDefault(); }
    else if (e.key === "ArrowLeft") { go(idx - 1); e.preventDefault(); }
    else if (e.key.toLowerCase() === "f") toggleFs();
  });

  selectTalk(S.talks[0].id);

  /* ---------------- Posters ---------------- */
  const posterGrid = $("#posterGrid");
  S.posters.forEach((p) => {
    const f = el("figure", "poster reveal");
    f.dataset.openPoster = p.id;
    f.innerHTML = `<div class="poster-img"><img src="assets/posters/${p.id}-thumb.webp" alt="${esc(p.title)}" loading="lazy"></div>
      <figcaption><b>${esc(p.title)}</b><small>${esc(p.venue)}</small></figcaption>`;
    posterGrid.appendChild(f);
  });

  /* ---------------- Publications ---------------- */
  const filters = $("#filters"), pubList = $("#pubList"), search = $("#pubSearch");
  let topic = "all";
  const counts = { all: S.papers.length };
  S.papers.forEach((p) => p.topics.forEach((t) => (counts[t] = (counts[t] || 0) + 1)));
  [["all", "All"], ...Object.entries(S.topics)].forEach(([key, label]) => {
    const b = el("button", "filter" + (key === "all" ? " on" : ""), `${esc(label)}<span class="n">${counts[key] || 0}</span>`);
    b.addEventListener("click", () => {
      topic = key;
      filters.querySelectorAll(".filter").forEach((f) => f.classList.toggle("on", f === b));
      renderPubs();
    });
    filters.appendChild(b);
  });
  search.addEventListener("input", renderPubs);

  function renderPubs() {
    const q = search.value.trim().toLowerCase();
    const list = S.papers.filter((p) =>
      (topic === "all" || p.topics.includes(topic)) &&
      (!q || `${p.title} ${p.venue} ${p.authors} ${p.year}`.toLowerCase().includes(q)));
    pubList.innerHTML = "";
    if (!list.length) { pubList.appendChild(el("p", "empty", "No papers match this filter.")); return; }
    const years = [...new Set(list.map((p) => p.year))].sort((a, b) => b - a);
    years.forEach((y) => {
      const block = el("div", "pub-year");
      block.appendChild(el("h3", "", y));
      const items = el("div", "pub-items");
      list.filter((p) => p.year === y).forEach((p) => {
        const href = p.links.paper || p.links.pdf;
        const thumb = p.figure
          ? `<div class="pub-thumb" data-zoom="${p.figure}" data-caption="${esc(p.caption || p.title)}"><img src="${p.figure}" alt="" loading="lazy"><span class="zoom-hint">${icon("expand")}</span></div>`
          : `<div class="pub-thumb none"><span>${esc(p.venue)}</span></div>`;
        items.appendChild(el("article", "pub", `${thumb}
          <div>
            <h4>${href ? `<a href="${href}" target="_blank" rel="noopener">${esc(p.title)}</a>` : esc(p.title)}</h4>
            <p class="authors">${boldMe(p.authors)}</p>
            <div class="pub-tags"><span class="tag venue-tag">${esc(p.venue)} ${p.year}</span>${p.topics.map((t) => `<span class="tag">${esc(S.topics[t])}</span>`).join("")}${paperActions(p, "mini-link")}</div>
          </div>`));
      });
      block.appendChild(items);
      pubList.appendChild(block);
    });
  }
  renderPubs();

  /* ---------------- Experience, grants, skills ---------------- */
  const tl = $("#timeline");
  S.timeline.forEach((t) => {
    tl.appendChild(el("li", "tl reveal" + (t.edu ? " edu" : ""), `<time>${esc(t.when)}</time><h3>${esc(t.role)}</h3><p class="org">${esc(t.org)}</p>${t.titles ? `<ul class="titles">${t.titles.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}${t.points ? `<ul>${t.points.map((p) => `<li>${p}</li>`).join("")}</ul>` : ""}`));
  });
  const grants = $("#grants");
  S.grants.forEach((g) => grants.appendChild(el("li", "", `<strong>${esc(g.amount)}</strong><p>${esc(g.title)}</p><small>${esc(g.meta)}</small>`)));
  const skills = $("#skills");
  Object.entries(S.skills).forEach(([group, items]) => {
    skills.appendChild(el("div", "skill-group", `<h4>${esc(group)}</h4><ul class="chips">${items.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>`));
  });

  /* ---------------- Lightbox ---------------- */
  const lightbox = $("#lightbox"), lbImg = $("#lbImg"), lbCap = $("#lbCap"), lbScroll = $("#lbScroll");
  function openLightbox(src, caption) {
    lbImg.src = src; lbImg.alt = caption; lbCap.textContent = caption;
    lbScroll.classList.remove("zoomed");
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeLightbox() { lightbox.hidden = true; lbImg.src = ""; document.body.style.overflow = ""; }
  $("#lbClose").addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (e) => { if (e.target === lightbox) closeLightbox(); });
  lbImg.addEventListener("click", () => lbScroll.classList.toggle("zoomed"));

  // One delegated handler for figures, posters and slide buttons anywhere on the page
  document.addEventListener("click", (e) => {
    const z = e.target.closest("[data-zoom]");
    if (z) return openLightbox(z.dataset.zoom, z.dataset.caption);
    const ps = e.target.closest("[data-open-poster]");
    if (ps) { const p = posterById[ps.dataset.openPoster]; return openLightbox(`assets/posters/${p.id}.webp`, `${p.title} — ${p.venue}`); }
    const tk = e.target.closest("[data-open-talk]");
    if (tk) { selectTalk(tk.dataset.openTalk); $("#talks").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" }); viewer.focus({ preventScroll: true }); }
  });

  /* ---------------- Nav state ---------------- */
  const nav = $("#nav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  const links = [...document.querySelectorAll(".nav-links a")];
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === `#${en.target.id}`));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  links.forEach((a) => { const s = $(a.getAttribute("href")); if (s) spy.observe(s); });

  /* ---------------- Reveal + count-up ---------------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add("in");
      en.target.querySelectorAll("[data-count]").forEach(countUp);
      io.unobserve(en.target);
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach((n) => io.observe(n));

  function countUp(n) {
    const end = +n.dataset.count, pre = n.dataset.prefix || "", suf = n.dataset.suffix || "";
    if (reduceMotion) return;
    const t0 = performance.now(), dur = 1400;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      n.textContent = pre + Math.round(end * e) + suf;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------------- Hero: drifting network ---------------- */
  const cv = $("#heroNet"), ctx = cv.getContext("2d");
  let W, H, nodes = [], running = true;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  function resize() {
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.min(90, Math.round((W * H) / 18000));
    nodes = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.8 + 0.8
    }));
  }
  function colorAt(x) { // blue → violet → magenta across the width
    const t = x / W;
    const a = [107, 140, 255], b = [155, 107, 255], c = [239, 79, 195];
    const [p, q, k] = t < 0.5 ? [a, b, t * 2] : [b, c, (t - 0.5) * 2];
    return p.map((v, i) => Math.round(v + (q[i] - v) * k)).join(",");
  }
  function frame() {
    ctx.clearRect(0, 0, W, H);
    const R = 150;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
        if (d < R) {
          ctx.strokeStyle = `rgba(${colorAt((a.x + b.x) / 2)},${(1 - d / R) * 0.35})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    nodes.forEach((n) => {
      ctx.fillStyle = `rgba(${colorAt(n.x)},.9)`;
      ctx.shadowColor = `rgba(${colorAt(n.x)},1)`; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
    });
    if (running && !reduceMotion) requestAnimationFrame(frame);
  }
  resize();
  window.addEventListener("resize", () => { resize(); if (reduceMotion) frame(); });
  new IntersectionObserver(([e]) => {
    const was = running; running = e.isIntersecting;
    if (running && !was && !reduceMotion) requestAnimationFrame(frame);
  }).observe(cv);
  frame();

  $("#year").textContent = new Date().getFullYear();
})();
