/* Research map in the About section: methods (left) linked to the systems
   studied (right). Each link lists the papers that connect the two; link
   width grows with the number of papers. Hover, focus or tap a node to
   highlight its links and list the papers. */
(function () {
  const svg = document.getElementById("mapSvg");
  const info = document.getElementById("mapInfo");
  if (!svg || !info) return;

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
  // [method, area, papers]
  const links = [
    ["gt", "net", ["Nature Communications 2019", "IFAC 2023"]],
    ["gt", "rec", ["Nature Communications 2021"]],
    ["opt", "net", ["Nature Communications 2019", "IFAC 2023"]],
    ["opt", "mis", ["L4DC 2026"]],
    ["ds", "rec", ["IEEE CDC 2023"]],
    ["ds", "mis", ["L4DC 2026", "IEEE CDC 2023"]],
    ["ds", "hire", ["EAAMO 2023"]],
    ["ml", "rec", ["RecSys 2023", "Applied Network Science 2023", "Complex Networks 2022", "RecSys Workshop 2026"]],
    ["ml", "mis", ["Complex Networks 2023"]],
    ["ml", "hire", ["ECAF 2026"]],
    ["llm", "rec", ["COLM 2026 (content curators)"]],
    ["llm", "hire", ["ECAF 2026"]],
    ["llm", "soc", ["PNAS 2026", "Scientific Reports 2026", "COLM 2025", "COLM 2026 (illusory truth)", "EMNLP 2026", "npj Climate Action 2026"]]
  ];

  const NS = "http://www.w3.org/2000/svg";
  const mk = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    (parent || svg).appendChild(n);
    return n;
  };
  let linkEls = [], nodeEls = [], drawn = false;

  // Wide screens: labels on one line. Narrow screens: a taller canvas, closer
  // columns and labels wrapped onto two lines so the text stays readable.
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
    linkEls = links.map(([m, a, papers]) => {
      const [x1, y1] = pos[m], [x2, y2] = pos[a];
      const d = `M${x1 + 10},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2 - 10},${y2}`;
      const path = mk("path", { d, class: "map-link", "stroke-width": 1.2 + papers.length * 0.9 }, gLinks);
      if (!drawn) {
        const len = path.getTotalLength();
        path.style.strokeDasharray = len;
        path.style.strokeDashoffset = len;
      }
      return { m, a, papers, path };
    });

    nodeEls = [];
    const addNode = (n, side) => {
      const [x, y] = pos[n.id];
      const g = mk("g", { class: `map-node ${side}`, tabindex: 0, role: "button", "aria-label": n.label });
      mk("circle", { cx: x, cy: y, r: 9 }, g);
      const tx = side === "m" ? x - 20 : x + 20;
      const t = mk("text", { x: tx, y: y + 5, "text-anchor": side === "m" ? "end" : "start" }, g);
      // wrap long labels onto two lines on narrow screens
      const words = n.label.split(" ");
      if (n.label.length > L.wrap && words.length > 1) {
        const cut = Math.ceil(words.length / 2);
        [words.slice(0, cut).join(" "), words.slice(cut).join(" ")].forEach((line, k) => {
          const ts = mk("tspan", { x: tx, dy: k ? "1.15em" : "-0.45em" }, t);
          ts.textContent = line;
        });
      } else t.textContent = n.label;
      nodeEls.push({ id: n.id, g });
      const on = () => highlight(n.id, n.label, side);
      g.addEventListener("mouseenter", on);
      g.addEventListener("focus", on);
      g.addEventListener("click", on);
      g.addEventListener("mouseleave", clear);
      g.addEventListener("blur", clear);
    };
    methods.forEach((m) => addNode(m, "m"));
    areas.forEach((a) => addNode(a, "a"));
  }
  build();

  const label = (id) => (methods.find((m) => m.id === id) || areas.find((a) => a.id === id)).label;
  const DEFAULT = info.textContent;

  function highlight(id, name, side) {
    svg.classList.add("focus");
    const mine = linkEls.filter((l) => l.m === id || l.a === id);
    linkEls.forEach((l) => l.path.classList.toggle("on", mine.includes(l)));
    const partners = new Set(mine.map((l) => (side === "m" ? l.a : l.m)));
    nodeEls.forEach((n) => n.g.classList.toggle("on", n.id === id || partners.has(n.id)));
    info.innerHTML = `<b>${name}</b>` + mine.map((l) => `<span class="map-row"><i>${side === "m" ? "→ " + label(l.a) : label(l.m) + " →"}</i> ${l.papers.join(" · ")}</span>`).join("");
  }
  function clear() {
    svg.classList.remove("focus");
    linkEls.forEach((l) => l.path.classList.remove("on"));
    nodeEls.forEach((n) => n.g.classList.remove("on"));
    info.textContent = DEFAULT;
  }

  // Draw the links in when the map scrolls into view (scroll check as a fallback).
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const reveal = () => {
    if (drawn) return;
    drawn = true;
    linkEls.forEach((l, k) => {
      l.path.style.transition = reduceMotion ? "none" : `stroke-dashoffset 1.1s cubic-bezier(.2,.7,.2,1) ${0.15 + k * 0.07}s`;
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

  // rebuild when crossing the narrow/wide breakpoint
  let wasNarrow = svg.parentElement.clientWidth < 640;
  window.addEventListener("resize", () => {
    const narrow = svg.parentElement.clientWidth < 640;
    if (narrow !== wasNarrow) { wasNarrow = narrow; build(); clear(); }
  });
})();
