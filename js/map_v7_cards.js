/* About-section figure: a three-set Venn diagram.
   Sets: Mathematics & control, AI & machine learning, Society & platforms.
   Each overlap is a research theme, listing the papers that live there; the
   centre is Responsible AI. Hover, focus or tap a region to highlight it and
   list its papers. The circles slide together when the figure scrolls into view. */
(function () {
  const svg = document.getElementById("mapSvg");
  const info = document.getElementById("mapInfo");
  if (!svg || !info) return;

  const NS = "http://www.w3.org/2000/svg";
  const mk = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    (parent || svg).appendChild(n);
    return n;
  };

  // Icons drawn in a 24x24 box (same style as the rest of the site).
  const ICONS = {
    math: '<path d="M18 7V4H6l6 8-6 8h12v-3"/>',
    ai: '<path d="M12 8V4H8"/><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M2 14h2M20 14h2M15 13v2M9 13v2"/>',
    society: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    scale: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1ZM2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1ZM7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>'
  };

  const SETS = [
    { id: "math", cx: 390, cy: 250, cls: "set-a", from: [-70, -40], title: "Mathematics & control", items: ["Game theory · Optimization", "Dynamical systems"], at: [285, 160] },
    { id: "ai", cx: 610, cy: 250, cls: "set-b", from: [70, -40], title: "AI & machine learning", items: ["LLMs · Agents", "NLP · Evaluation"], at: [715, 160] },
    { id: "society", cx: 500, cy: 440, cls: "set-c", from: [0, 80], title: "Society & platforms", items: ["Social media · Labor markets", "Content creators"], at: [500, 560] }
  ];
  const R = 205;

  // The three overlaps and the centre are the four research areas. Papers are
  // taken from js/data.js by topic, so the Venn, the cards and the filters agree.
  const S = window.SITE || { papers: [] };
  const REGIONS = [
    { id: "ab", topic: "audit", at: [500, 160], lines: ["LLM decision-making", "evaluation"] },
    { id: "ac", topic: "games", at: [366, 392], lines: ["Networks, games", "& control"] },
    { id: "bc", topic: "llm-sim", at: [634, 392], lines: ["Algorithmic", "fidelity"] },
    { id: "core", topic: "recsys", at: [500, 318], lines: ["Responsible AI", "& fairness"], core: true }
  ];
  REGIONS.forEach((r) => {
    r.title = r.lines.join(" ").replace(" & ", " & ");
    r.papers = S.papers
      .filter((p) => !p.status && p.topics.includes(r.topic))
      .map((p) => `<span class="pv">${p.venue} ${p.year}</span> ${p.title}`);
  });

  const gSets = mk("g", { class: "venn-sets" });
  const setEls = SETS.map((s) => {
    const g = mk("g", { class: `venn-set ${s.cls}`, style: `--fx:${s.from[0]}px; --fy:${s.from[1]}px` }, gSets);
    mk("circle", { cx: s.cx, cy: s.cy, r: R }, g);
    return { ...s, g };
  });

  // set labels (icon + title + items) in the outer lobes
  const gLabels = mk("g", { class: "venn-labels" });
  const regionEls = [];
  SETS.forEach((s) => {
    const [x, y] = s.at;
    const g = mk("g", { class: `venn-label set-label ${s.cls}`, tabindex: 0, role: "button", "aria-label": s.title }, gLabels);
    const ic = mk("g", { class: "venn-ic", transform: `translate(${x - 17},${y - 62})` }, g);
    mk("circle", { cx: 17, cy: 17, r: 21 }, ic);
    const icon = mk("g", { transform: "translate(5,5)" }, ic);
    icon.innerHTML = ICONS[s.id];
    mk("text", { x, y: y - 8, class: "venn-title", "text-anchor": "middle" }, g).textContent = s.title;
    if (s.id !== "society") g.classList.add("top-set");
    s.items.forEach((line, k) => {
      mk("text", { x, y: y + 15 + k * 17, class: "venn-items", "text-anchor": "middle" }, g).textContent = line;
    });
    regionEls.push({ id: s.id, g, title: s.title, papers: null, set: s });
  });

  // overlap labels
  REGIONS.forEach((r) => {
    const [x, y] = r.at;
    const g = mk("g", { class: `venn-label region-label${r.core ? " core" : ""}`, tabindex: 0, role: "button", "aria-label": r.title }, gLabels);
    if (r.core) {
      mk("circle", { cx: x, cy: y - 4, r: 52, class: "core-disc" }, g);
      const icon = mk("g", { transform: `translate(${x - 12},${y - 44})`, class: "core-ic" }, g);
      icon.innerHTML = ICONS.scale;
      r.lines.forEach((line, k) => {
        mk("text", { x, y: y + 6 + k * 17, class: "venn-core", "text-anchor": "middle" }, g).textContent = line;
      });
    } else {
      r.lines.forEach((line, k) => {
        mk("text", { x, y: y + k * 20, class: "venn-region", "text-anchor": "middle" }, g).textContent = line;
      });
    }
    regionEls.push({ id: r.id, g, title: r.title, papers: r.papers, topic: r.topic });
  });

  // which sets each region belongs to (for highlighting the circles)
  const MEMBERS = { math: ["math"], ai: ["ai"], society: ["society"], ab: ["math", "ai"], ac: ["math", "society"], bc: ["ai", "society"], core: ["math", "ai", "society"] };
  const SET_PAPERS = {
    math: "Mathematical foundations: game theory, inverse optimization, dynamical systems and control, applied across all my work.",
    ai: "Large language models, multi-agent systems and evaluation pipelines: fine-tuning, RAG, BERT-based detectors, and the 2024 ARC Prize team gold medal.",
    society: "The platforms and markets where AI decisions land: social media feeds, content creators, job applications, public opinion."
  };

  const DEFAULT = `<b>Responsible AI</b><span class="map-row">Auditing AI systems that make consequential decisions, from who gets hired to what we see on social media, with tools from all three fields.</span>`;
  info.innerHTML = DEFAULT;
  function highlight(r) {
    svg.classList.add("focus");
    regionEls.forEach((e) => e.g.classList.toggle("on", e === r));
    setEls.forEach((s) => s.g.classList.toggle("on", MEMBERS[r.id].includes(s.id)));
    const body = r.papers
      ? r.papers.map((p) => `<span class="map-row">${p}</span>`).join("") +
        `<button class="news-link map-go" data-topic-go="${r.topic}">See these papers <svg class="ic"><use href="#i-right"/></svg></button>`
      : `<span class="map-row">${SET_PAPERS[r.id]}</span>`;
    info.innerHTML = `<b>${r.title}</b>${body}`;
  }
  let pinned = null;   // a tapped/clicked region stays selected until another is chosen
  function clear() {
    if (pinned) return highlight(pinned);
    reset();
  }
  function reset() {
    svg.classList.remove("focus");
    regionEls.forEach((e) => e.g.classList.remove("on"));
    setEls.forEach((s) => s.g.classList.remove("on"));
    info.innerHTML = DEFAULT;
  }
  regionEls.forEach((r) => {
    const on = () => highlight(r);
    r.g.addEventListener("mouseenter", on);
    r.g.addEventListener("focus", on);
    r.g.addEventListener("click", () => { pinned = pinned === r ? null : r; pinned ? highlight(r) : reset(); });
    r.g.addEventListener("mouseleave", clear);
    r.g.addEventListener("blur", clear);
  });

  // research-area cards light up their region; "See these papers" filters the list
  window.vennHighlight = (topic) => {
    const r = regionEls.find((e) => e.topic === topic);
    if (r) highlight(r); else clear();
  };
  info.addEventListener("click", (e) => {
    const b = e.target.closest("[data-topic-go]");
    if (b && window.showTopic) window.showTopic(b.dataset.topicGo);
  });

  // slide the circles together when the figure scrolls into view
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let shown = false;
  const show = () => { if (!shown) { shown = true; svg.classList.add("in"); } };
  const check = () => {
    const r = svg.getBoundingClientRect();
    if (r.top < innerHeight * 0.85 && r.bottom > 0) { show(); window.removeEventListener("scroll", check); }
  };
  if (reduceMotion) show();
  else {
    window.addEventListener("scroll", check, { passive: true });
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { show(); io.disconnect(); } }, { threshold: 0.2 });
      io.observe(svg);
    }
    check();
  }
})();
