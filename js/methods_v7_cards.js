/* Methods diagram above "All papers": methods (left) linked to the systems
   studied (right). Link width grows with the number of papers. Selecting a node
   or a link filters the publication list to the papers behind it. */
(function () {
  const svg = document.getElementById("methodsSvg");
  if (!svg) return;

  const methods = [
    { id: "gt", label: "Game theory" },
    { id: "opt", label: "Optimization" },
    { id: "ds", label: "Dynamical systems & control" },
    { id: "ml", label: "Statistics & ML" },
    { id: "llm", label: "NLP & LLMs" }
  ];
  const areas = [
    { id: "net", label: "Social networks" },
    { id: "rec", label: "Creators & recommenders" },
    { id: "mis", label: "Opinions & misinformation" },
    { id: "hire", label: "Hiring & automated decisions" },
    { id: "soc", label: "LLMs as social actors" }
  ];
  // [method, area, paper ids from js/data.js]
  const links = [
    ["gt", "net", ["natcomm-2019", "ifac-2023"]],
    ["gt", "rec", ["natcomm-2021"]],
    ["opt", "net", ["natcomm-2019", "ifac-2023"]],
    ["opt", "mis", ["l4dc-2026"]],
    ["ds", "rec", ["cdc-2023"]],
    ["ds", "mis", ["l4dc-2026", "cdc-2023"]],
    ["ds", "hire", ["eaamo-2023"]],
    ["ml", "rec", ["recsys-2023", "ans-2023", "cn-2022", "recsys-ws-2026"]],
    ["ml", "mis", ["cn-2023"]],
    ["ml", "hire", ["ecaf-2026-hiring"]],
    ["llm", "rec", ["colm-2026-curators"]],
    ["llm", "hire", ["ecaf-2026-hiring"]],
    ["llm", "soc", ["pnas-2026", "scirep-2026", "colm-2025", "colm-2026-ite", "emnlp-2026", "npj-2026"]]
  ];

  const NS = "http://www.w3.org/2000/svg";
  const mk = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    (parent || svg).appendChild(n);
    return n;
  };
  const label = (id) => (methods.find((m) => m.id === id) || areas.find((a) => a.id === id)).label;
  let linkEls = [], nodeEls = [], selected = null, drawn = false;

  // Wide screens: one-line labels. Narrow screens: taller canvas, wrapped labels.
  function build() {
    const narrow = svg.parentElement.clientWidth < 640;
    const L = narrow
      ? { W: 640, XL: 250, XR: 390, top: 70, gap: 105, H: 560, fs: 23, wrap: 13 }
      : { W: 1000, XL: 300, XR: 700, top: 50, gap: 75, H: 400, fs: 16, wrap: 99 };
    svg.innerHTML = "";
    svg.setAttribute("viewBox", `0 0 ${L.W} ${L.H}`);
    svg.style.setProperty("--fs", L.fs + "px");
    const pos = {};
    methods.forEach((m, i) => (pos[m.id] = [L.XL, L.top + i * L.gap]));
    areas.forEach((a, i) => (pos[a.id] = [L.XR, L.top + i * L.gap]));
    mk("text", { x: L.XL, y: 16, "text-anchor": "end", class: "map-col" }).textContent = "METHODS";
    mk("text", { x: L.XR, y: 16, "text-anchor": "start", class: "map-col" }).textContent = "SYSTEMS I STUDY";

    const gLinks = mk("g", {});
    linkEls = links.map(([m, a, ids]) => {
      const [x1, y1] = pos[m], [x2, y2] = pos[a];
      const d = `M${x1 + 10},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2 - 10},${y2}`;
      const path = mk("path", { d, class: "map-link", "stroke-width": 1.4 + ids.length * 1.1 }, gLinks);
      if (!drawn) { const len = path.getTotalLength(); path.style.strokeDasharray = len; path.style.strokeDashoffset = len; }
      const el = { m, a, ids, path };
      // a wider invisible path makes links easy to click
      const hit = mk("path", { d, class: "map-hit" }, gLinks);
      hit.addEventListener("mouseenter", () => preview({ link: el }));
      hit.addEventListener("mouseleave", restore);
      hit.addEventListener("click", () => select({ link: el }));
      return el;
    });

    nodeEls = [];
    const addNode = (n, side) => {
      const [x, y] = pos[n.id];
      const g = mk("g", { class: `map-node ${side}`, tabindex: 0, role: "button", "aria-label": `Show papers: ${n.label}` });
      mk("circle", { cx: x, cy: y, r: 9 }, g);
      const tx = side === "m" ? x - 20 : x + 20;
      const t = mk("text", { x: tx, y: y + 5, "text-anchor": side === "m" ? "end" : "start" }, g);
      const words = n.label.split(" ");
      if (n.label.length > L.wrap && words.length > 1) {
        const cut = Math.ceil(words.length / 2);
        [words.slice(0, cut).join(" "), words.slice(cut).join(" ")].forEach((line, k) => {
          mk("tspan", { x: tx, dy: k ? "1.15em" : "-0.45em" }, t).textContent = line;
        });
      } else t.textContent = n.label;
      nodeEls.push({ id: n.id, g });
      g.addEventListener("mouseenter", () => preview({ node: n.id }));
      g.addEventListener("mouseleave", restore);
      g.addEventListener("click", () => select({ node: n.id }));
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select({ node: n.id }); } });
    };
    methods.forEach((m) => addNode(m, "m"));
    areas.forEach((a) => addNode(a, "a"));
    if (selected) paint(selected);
  }

  // which links and nodes a selection covers
  function scope(sel) {
    const ls = sel.link ? [sel.link] : linkEls.filter((l) => l.m === sel.node || l.a === sel.node);
    const nodes = new Set(sel.link ? [sel.link.m, sel.link.a] : [sel.node, ...ls.map((l) => (l.m === sel.node ? l.a : l.m))]);
    return { ls, nodes };
  }
  function paint(sel) {
    if (!sel) {
      svg.classList.remove("focus");
      linkEls.forEach((l) => l.path.classList.remove("on"));
      nodeEls.forEach((n) => n.g.classList.remove("on"));
      return;
    }
    const { ls, nodes } = scope(sel);
    svg.classList.add("focus");
    linkEls.forEach((l) => l.path.classList.toggle("on", ls.some((x) => x.m === l.m && x.a === l.a)));
    nodeEls.forEach((n) => n.g.classList.toggle("on", nodes.has(n.id)));
  }
  const preview = (sel) => paint(sel);
  const restore = () => paint(selected);

  function select(sel) {
    const same = selected && ((sel.node && selected.node === sel.node) || (sel.link && selected.link && selected.link.m === sel.link.m && selected.link.a === sel.link.a));
    if (same) { selected = null; paint(null); window.filterPapers && window.filterPapers(null); return; }
    selected = sel;
    paint(sel);
    const { ls } = scope(sel);
    const ids = [...new Set(ls.flatMap((l) => l.ids))];
    const name = sel.link ? `${label(sel.link.m)} → ${label(sel.link.a)}` : label(sel.node);
    window.filterPapers && window.filterPapers(ids, name);
  }
  window.methodsReset = () => { selected = null; paint(null); };

  build();

  // draw the links in when the diagram scrolls into view
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const reveal = () => {
    if (drawn) return;
    drawn = true;
    linkEls.forEach((l, k) => {
      l.path.style.transition = reduceMotion ? "none" : `stroke-dashoffset 1.1s cubic-bezier(.2,.7,.2,1) ${0.15 + k * 0.06}s`;
      l.path.style.strokeDashoffset = 0;
    });
  };
  const check = () => {
    const r = svg.getBoundingClientRect();
    if (r.top < innerHeight * 0.85 && r.bottom > 0) { reveal(); window.removeEventListener("scroll", check); }
  };
  if (reduceMotion) reveal();
  else {
    window.addEventListener("scroll", check, { passive: true });
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { reveal(); io.disconnect(); } }, { threshold: 0.15 });
      io.observe(svg);
    }
    check();
  }

  let wasNarrow = svg.parentElement.clientWidth < 640;
  window.addEventListener("resize", () => {
    const narrow = svg.parentElement.clientWidth < 640;
    if (narrow !== wasNarrow) { wasNarrow = narrow; build(); }
  });
})();
