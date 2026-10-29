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
    if (p.links.code) out.push(`<a class="${cls}" href="${p.links.code}" target="_blank" rel="noopener">${icon("github")}Code</a>`);
    if (p.links.data) out.push(`<a class="${cls}" href="${p.links.data}" target="_blank" rel="noopener">${icon("database")}Data</a>`);
    if (p.talk) out.push(`<button class="${cls}" data-open-talk="${p.talk}">${icon("slides")}Slides</button>`);
    if (p.poster) out.push(`<button class="${cls}" data-open-poster="${p.poster}">${icon("image")}Poster</button>`);
    return out.join("");
  }

  /* ---------------- Featured research ---------------- */
  const featured = $("#featured");
  S.papers.filter((p) => p.featured && !p.status).forEach((p, k) => {
    // figure and text slide in from opposite sides, alternating per row
    const [figDir, txtDir] = k % 2 ? ["from-right", "from-left"] : ["from-left", "from-right"];
    const row = el("article", "feat");
    row.innerHTML = `
      <figure class="feat-fig reveal ${figDir}" data-zoom="${p.figure}" data-caption="${esc(p.caption || p.title)}">
        <img src="${p.figure}" alt="${esc(p.caption || p.title)}" loading="lazy">
        <span class="zoom-hint">${icon("expand")}</span>
        ${p.caption ? `<figcaption>${esc(p.caption)}</figcaption>` : ""}
      </figure>
      <div class="reveal ${txtDir}" style="--d:.12s">
        <div class="feat-meta"><span class="venue">${esc(p.venue)}</span><span class="year">${p.year}</span></div>
        <h3>${esc(p.title)}</h3>
        <p class="authors">${boldMe(p.authors)}</p>
        ${p.stat ? `<div class="big-stat"><strong>${esc(p.stat.value)}</strong><span>${esc(p.stat.label)}</span></div>` : ""}
        <p class="summary">${esc(p.summary)}</p>
        <div class="actions">${paperActions(p, "chip-btn")}</div>
      </div>`;
    featured.appendChild(row);
  });

  /* ---------------- News rail ---------------- */
  const rail = $("#newsRail");
  if (rail && S.news) {
    const NEWS_ICON = { paper: "book", talk: "mic", role: "briefcase", grant: "coins" };
    const NEWS_LABEL = { paper: "Paper", talk: "Talk", role: "New role", grant: "Grant" };
    const fmt = (d) => {
      const [y, m, day] = d.split("-").map(Number);
      const mon = new Date(y, m - 1, 1).toLocaleString("en", { month: "short" });
      return day ? `${day} ${mon} ${y}` : `${mon} ${y}`;
    };
    const now = new Date();
    S.news.forEach((n, k) => {
      const [y, m, day] = n.date.split("-").map(Number);
      const isNew = (now - new Date(y, m - 1, day || 1)) / 864e5 < 62;
      const action = n.talk
        ? `<button class="news-link" data-open-talk="${n.talk}">View slides ${icon("right")}</button>`
        : n.link ? `<a class="news-link" href="${n.link}"${n.link.startsWith("#") ? "" : ' target="_blank" rel="noopener"'}>${n.link.startsWith("#") ? "See papers" : "Read more"} ${icon("right")}</a>` : "";
      const card = el("article", `news-card reveal rise ${n.type}`, `
        <div class="news-top"><span class="news-ic">${icon(NEWS_ICON[n.type] || "file")}</span><span class="news-type">${NEWS_LABEL[n.type] || ""}</span>${isNew ? '<span class="news-new">New</span>' : ""}</div>
        <time datetime="${n.date}">${fmt(n.date)}</time>
        <p>${n.text}</p>
        ${action}`);
      card.style.setProperty("--d", `${Math.min(k, 4) * 0.08}s`);
      rail.appendChild(card);
    });
    const page = (dir) => rail.scrollBy({ left: dir * rail.clientWidth * 0.8, behavior: reduceMotion ? "auto" : "smooth" });
    $("#newsPrev").addEventListener("click", () => page(-1));
    $("#newsNext").addEventListener("click", () => page(1));
    const arrows = () => {
      $("#newsPrev").disabled = rail.scrollLeft < 4;
      $("#newsNext").disabled = rail.scrollLeft + rail.clientWidth > rail.scrollWidth - 4;
    };
    rail.addEventListener("scroll", arrows, { passive: true });
    window.addEventListener("resize", arrows);
    arrows();
  }

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
    slideImg.alt = `${talk.title}, slide ${idx + 1} of ${talk.slides}`;
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
    const f = el("figure", "poster reveal zoom");
    f.style.setProperty("--d", `${(S.posters.indexOf(p) % 5) * 0.08}s`);
    f.dataset.openPoster = p.id;
    f.innerHTML = `<div class="poster-img"><img src="assets/posters/${p.id}-thumb.webp" alt="${esc(p.title)}" loading="lazy"></div>
      <figcaption><b>${esc(p.title)}</b><small>${esc(p.venue)}</small></figcaption>`;
    posterGrid.appendChild(f);
  });

  /* ---------------- Publications ---------------- */
  // Two tabs: published papers (grouped by year) and working papers (grouped by status).
  const filters = $("#filters"), pubList = $("#pubList"), search = $("#pubSearch"), statusTabs = $("#statusTabs");
  const STATUS = { review: "Under review", prep: "In preparation" };
  const isWorking = (p) => !!p.status;
  let topic = "all", working = false;

  [[false, "Published"], [true, "Working papers"]].forEach(([w, label]) => {
    const n = S.papers.filter((p) => isWorking(p) === w).length;
    const b = el("button", "status-tab" + (w ? "" : " on"), `${label}<span class="n">${n}</span>`);
    b.setAttribute("role", "tab");
    b.addEventListener("click", () => {
      working = w;
      statusTabs.querySelectorAll(".status-tab").forEach((t) => t.classList.toggle("on", t === b));
      buildFilters();
      renderPubs();
    });
    statusTabs.appendChild(b);
  });

  function buildFilters() {
    const pool = S.papers.filter((p) => isWorking(p) === working);
    const counts = { all: pool.length };
    pool.forEach((p) => p.topics.forEach((t) => (counts[t] = (counts[t] || 0) + 1)));
    if (topic !== "all" && !counts[topic]) topic = "all";
    filters.innerHTML = "";
    [["all", "All"], ...Object.entries(S.topics)].forEach(([key, label]) => {
      if (key !== "all" && !counts[key]) return;
      const b = el("button", "filter" + (key === topic ? " on" : ""), `${esc(label)}<span class="n">${counts[key]}</span>`);
      b.addEventListener("click", () => {
        topic = key;
        filters.querySelectorAll(".filter").forEach((f) => f.classList.toggle("on", f === b));
        renderPubs();
      });
      filters.appendChild(b);
    });
  }
  search.addEventListener("input", renderPubs);

  function pubItem(p) {
    const href = p.links.paper || p.links.pdf;
    const label = p.status ? STATUS[p.status] : p.venue;
    const thumb = p.figure
      ? `<div class="pub-thumb" data-zoom="${p.figure}" data-caption="${esc(p.caption || p.title)}"><img src="${p.figure}" alt="" loading="lazy"><span class="zoom-hint">${icon("expand")}</span></div>`
      : `<div class="pub-thumb none${p.status ? " wp" : ""}"><span>${esc(label)}</span></div>`;
    const venueTag = p.status ? `${STATUS[p.status]} · ${esc(p.venue)}` : `${esc(p.venue)} ${p.year}`;
    return el("article", "pub", `${thumb}
      <div>
        <h4>${href ? `<a href="${href}" target="_blank" rel="noopener">${esc(p.title)}</a>` : esc(p.title)}</h4>
        <p class="authors">${boldMe(p.authors)}</p>
        <div class="pub-tags"><span class="tag venue-tag">${venueTag}</span>${p.topics.map((t) => `<span class="tag">${esc(S.topics[t])}</span>`).join("")}${p.summary ? `<button class="mini-link summary-toggle" aria-expanded="false">Summary <svg class="ic chev"><use href="#i-right"/></svg></button>` : ""}${paperActions(p, "mini-link")}</div>
        ${p.summary ? `<div class="pub-summary"><div><p>${esc(p.summary)}</p></div></div>` : ""}
      </div>`);
  }

  function renderPubs() {
    const q = search.value.trim().toLowerCase();
    const list = S.papers.filter((p) =>
      isWorking(p) === working &&
      (topic === "all" || p.topics.includes(topic)) &&
      (!q || `${p.title} ${p.venue} ${p.authors} ${p.year}`.toLowerCase().includes(q)));
    pubList.innerHTML = "";
    if (!list.length) { pubList.appendChild(el("p", "empty", "No papers match this filter.")); return; }
    const groups = working
      ? Object.keys(STATUS).map((k) => [STATUS[k], list.filter((p) => p.status === k)])
      : [...new Set(list.map((p) => p.year))].sort((a, b) => b - a).map((y) => [y, list.filter((p) => p.year === y)]);
    groups.filter(([, ps]) => ps.length).forEach(([heading, ps]) => {
      const block = el("div", "pub-year" + (working ? " wp" : ""));
      block.appendChild(el("h3", "", heading));
      const items = el("div", "pub-items");
      ps.forEach((p) => items.appendChild(pubItem(p)));
      block.appendChild(items);
      pubList.appendChild(block);
    });
  }
  buildFilters();
  renderPubs();

  // Jump to the publication list filtered by a topic (used by the research-area cards).
  function showTopic(t) {
    working = false;
    statusTabs.querySelectorAll(".status-tab").forEach((b, k) => b.classList.toggle("on", k === 0));
    topic = t;
    search.value = "";
    buildFilters();
    renderPubs();
    $("#publications").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  }
  document.querySelectorAll("[data-topic]").forEach((card) => {
    card.addEventListener("click", () => showTopic(card.dataset.topic));
    card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showTopic(card.dataset.topic); } });
  });
  pubList.addEventListener("click", (e) => {
    const b = e.target.closest(".summary-toggle");
    if (!b) return;
    const open = b.closest(".pub").classList.toggle("open");
    b.setAttribute("aria-expanded", open);
  });

  /* ---------------- Experience, grants, skills ---------------- */
  const tl = $("#timeline");
  S.timeline.forEach((t) => {
    tl.appendChild(el("li", "tl reveal from-left" + (t.edu ? " edu" : ""), `<time>${esc(t.when)}</time><h3>${esc(t.role)}</h3><p class="org">${esc(t.org)}</p>${t.titles ? `<ul class="titles">${t.titles.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}${t.points ? `<ul>${t.points.map((p) => `<li>${p}</li>`).join("")}</ul>` : ""}`));
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
    if (ps) { const p = posterById[ps.dataset.openPoster]; return openLightbox(`assets/posters/${p.id}.webp`, `${p.title} (${p.venue})`); }
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
      const k = Math.max(0, Math.min(1, (t - t0) / dur)), e = 1 - Math.pow(1 - k, 3);
      n.textContent = pre + Math.round(end * e) + suf;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------------- Hero: a growing network ----------------
     Nodes have a hidden quality. Every few frames a node "discovers" a nearby
     node and follows it if it is better than everyone it already follows (as in
     the meritocratic model). Follow links act as soft springs, so followers drift
     toward the nodes they follow and clusters form around local hubs; a weak
     repulsion keeps nodes apart. Nodes grow with their followers and pulse
     gently. When growth stops, the network fades out and a new one starts. */
  const cv = $("#heroNet");
  if (cv) {
  const ctx = cv.getContext("2d");
  const LINK = "218,231,236";   // CV sidebar blue-grey
  const NODE = "217,183,122";   // soft gold
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let W, H, nodes, edges, idle, alpha, fading, running = true, tick = 0;

  // Keep the network out from behind the hero text and the portrait.
  let zones = [];
  function measureZone() {
    const c = cv.getBoundingClientRect();
    zones = [[".hero-text", 28], [".portrait", 22]].map(([sel, pad]) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x0: r.left - c.left - pad, y0: r.top - c.top - pad, x1: r.right - c.left + pad, y1: r.bottom - c.top + pad };
    }).filter(Boolean);
  }
  const zoneAt = (x, y) => zones.find((z) => x > z.x0 && x < z.x1 && y > z.y0 && y < z.y1);
  const inZone = (x, y) => !!zoneAt(x, y);
  function freeSpot() {
    for (let k = 0; k < 80; k++) {
      const x = Math.random() * W, y = Math.random() * H;
      if (!inZone(x, y)) return [x, y];
    }
    return [Math.random() < 0.5 ? 20 : W - 20, Math.random() * H];
  }

  function seed() {
    const n = Math.min(80, Math.max(30, Math.round((W * H) / 15000)));
    nodes = Array.from({ length: n }, () => {
      const [x, y] = freeSpot();
      return { x, y, hx: x, hy: y, vx: 0, vy: 0,
      q: Math.random(), best: -1, deg: 0, r: 0, phase: Math.random() * Math.PI * 2 };
    });
    edges = []; idle = 0; alpha = 0; fading = false;
    // start from a partly formed network: run some growth off-screen, settle positions, no gold flashes
    for (let k = 0; k < 70; k++) { grow(); physics(); }
    edges.forEach((e) => (e.age = 999));
    nodes.forEach((p) => (p.r = 1.5 + Math.sqrt(p.deg) * 2.2));
    idle = 0;
  }
  function resize() {
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    measureZone();
    seed();
  }

  function grow() {
    // a few discoveries per call; discovery radius grows slowly so clusters merge over time
    const reach = Math.min(W, H) * (0.22 + Math.min(edges.length / 400, 0.35));
    let added = false;
    for (let k = 0; k < 3; k++) {
      const i = Math.floor(Math.random() * nodes.length), a = nodes[i];
      const j = Math.floor(Math.random() * nodes.length), b = nodes[j];
      if (i === j || Math.hypot(a.x - b.x, a.y - b.y) > reach) continue;
      if (a.best < 0 || b.q > nodes[a.best].q) {
        a.best = j; b.deg++;
        edges.push({ a: i, b: j, age: 0 });
        added = true;
      }
    }
    idle = added ? 0 : idle + 1;
  }

  function physics() {
    const n = nodes.length;
    for (let i = 0; i < n; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < n; j++) {
        const b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy + 40;
        if (d2 > 5000) continue;
        const f = 3 / d2;                        // weak short-range repulsion
        a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f;
      }
    }
    for (const e of edges) {                     // springs pull followers toward followees
      const a = nodes[e.a], b = nodes[e.b], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
      const f = 0.002 * (d - 38) / d;
      a.vx += dx * f * 1.6; a.vy += dy * f * 1.6; b.vx -= dx * f * 0.4; b.vy -= dy * f * 0.4;
    }
    for (const p of nodes) {
      p.vx += (p.hx - p.x) * 0.0006; p.vy += (p.hy - p.y) * 0.0006;   // stay near home, so clusters form locally
      const zone = zoneAt(p.x, p.y);
      if (zone) {
        const dl = p.x - zone.x0, dr = zone.x1 - p.x, dt = p.y - zone.y0, db = zone.y1 - p.y, m = Math.min(dl, dr, dt, db);
        if (m === dl) p.vx -= 0.6; else if (m === dr) p.vx += 0.6; else if (m === dt) p.vy -= 0.6; else p.vy += 0.6;
      }
      p.vx *= 0.86; p.vy *= 0.86;
      p.x += p.vx; p.y += p.vy;
      p.x = Math.max(8, Math.min(W - 8, p.x)); p.y = Math.max(8, Math.min(H - 8, p.y));
      p.r += ((1.5 + Math.sqrt(p.deg) * 2.2) - p.r) * 0.08;   // size eases toward followers
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = alpha;
    for (const e of edges) {
      const a = nodes[e.a], b = nodes[e.b];
      // new links fade in softly instead of flashing
      const grown = Math.min(1, e.age / 45);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      ctx.strokeStyle = `rgba(${LINK},${(inZone(mx, my) ? 0.12 : 0.35) * grown})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      e.age++;
    }
    for (const p of nodes) {
      const r = p.r * (1 + 0.12 * Math.sin(tick / 40 + p.phase));   // gentle pulse
      ctx.fillStyle = `rgba(${NODE},.95)`;
      ctx.shadowColor = `rgba(${NODE},.9)`; ctx.shadowBlur = 6 + r;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }

  function frame() {
    tick++;
    if (!fading) {
      alpha = Math.min(1, alpha + 0.04);
      grow();
      if (idle > 160) fading = true;               // growth has stalled: start over
    } else {
      alpha -= 0.02;
      if (alpha <= 0) seed();
    }
    physics();
    draw();
    if (running && !reduceMotion) requestAnimationFrame(frame);
  }

  resize();
  function still() {                               // reduced motion: show a finished network, no animation
    for (let k = 0; k < 900; k++) { grow(); physics(); }
    edges.forEach((e) => (e.age = 999));
    alpha = 1; draw();
  }
  if (reduceMotion) still();
  window.addEventListener("resize", () => { resize(); if (reduceMotion) still(); });
  new IntersectionObserver(([e]) => {
    const was = running; running = e.isIntersecting;
    if (running && !was && !reduceMotion) requestAnimationFrame(frame);
  }).observe(cv);
  if (!reduceMotion) frame();
  }

  /* ---------------- Gentle parallax on the two image bands ---------------- */
  const layers = [...document.querySelectorAll(".hero-bg, .contact-bg")];
  if (!reduceMotion && layers.length) {
    let ticking = false;
    const parallax = () => {
      layers.forEach((l) => {
        const r = l.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        l.style.transform = `translate3d(0, ${(-r.top * 0.18).toFixed(1)}px, 0) scale(1.12)`;
      });
      ticking = false;
    };
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(parallax); } }, { passive: true });
    parallax();
  }

  $("#year").textContent = new Date().getFullYear();
})();
