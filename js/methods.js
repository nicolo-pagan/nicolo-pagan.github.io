/* "Method → Area → Application" diagram above All papers.
   Three columns built from the facets in js/data.js. Links join a method to an
   area, and an area to an application, with width = number of published papers.
   Clicking a node toggles that filter (like the chips); clicking a link sets both
   of its ends. The highlight shows the links that still contain matching papers. */
(function () {
  const svg = document.getElementById("methodsSvg");
  if (!svg) return;
  const S = window.SITE;
  const published = S.papers.filter((p) => !p.status);
  const AREA_LINES = { ms: ["Networks, games", "& social dynamics"], ma: ["Feedback loops", "& AI evaluation"], as: ["LLMs", "in society"] };
  const cols = {
    method: Object.entries(S.methods).map(([id, label]) => ({ id, label })),
    area: Object.entries(S.areas).map(([id, label]) => ({ id, label })),
    app: Object.entries(S.apps).map(([id, label]) => ({ id, label }))
  };
  const has = (p, facet, key) => facet === "area" ? p.area === key : (facet === "method" ? p.methods : p.apps).includes(key);

  // links: method–area and area–app, each with the papers behind it
  const linkDefs = [];
  cols.method.forEach((m) => cols.area.forEach((a) => {
    const ps = published.filter((p) => has(p, "method", m.id) && p.area === a.id);
    if (ps.length) linkDefs.push({ from: ["method", m.id], to: ["area", a.id], ps });
  }));
  cols.area.forEach((a) => cols.app.forEach((x) => {
    const ps = published.filter((p) => p.area === a.id && has(p, "app", x.id));
    if (ps.length) linkDefs.push({ from: ["area", a.id], to: ["app", x.id], ps });
  }));

  const NS = "http://www.w3.org/2000/svg";
  const mk = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    (parent || svg).appendChild(n);
    return n;
  };
  let linkEls = [], nodeEls = [], state = { area: null, method: null, app: null }, drawn = false;

  function build() {
    const narrow = svg.parentElement.clientWidth < 640;
    const L = narrow
      ? { W: 700, H: 600, XM: 185, XA0: 255, XA1: 415, XP: 485, top: 80, gapS: 106, fs: 19, afs: 14.5, wrap: 12 }
      : { W: 1000, H: 400, XM: 255, XA0: 405, XA1: 595, XP: 745, top: 52, gapS: 74, fs: 16, afs: 15.5, wrap: 99 };
    svg.innerHTML = "";
    svg.setAttribute("viewBox", `0 0 ${L.W} ${L.H}`);
    svg.style.setProperty("--fs", L.fs + "px");
    const pos = { method: {}, area: {}, app: {} };
    cols.method.forEach((n, i) => (pos.method[n.id] = [L.XM, L.top + i * L.gapS]));
    cols.app.forEach((n, i) => (pos.app[n.id] = [L.XP, L.top + i * L.gapS]));
    const spanTop = L.top, spanBot = L.top + 4 * L.gapS;
    cols.area.forEach((n, i) => (pos.area[n.id] = [(L.XA0 + L.XA1) / 2, spanTop + ((i + 0.5) * (spanBot - spanTop + L.gapS)) / 3 - L.gapS / 2 + 10]));

    mk("text", { x: L.XM, y: 18, "text-anchor": "end", class: "map-col" }).textContent = "METHOD";
    mk("text", { x: (L.XA0 + L.XA1) / 2, y: 18, "text-anchor": "middle", class: "map-col" }).textContent = "AREA";
    mk("text", { x: L.XP, y: 18, "text-anchor": "start", class: "map-col" }).textContent = "APPLICATION";

    const gLinks = mk("g", {});
    linkEls = linkDefs.map((d) => {
      const [fx, fy] = pos[d.from[0]][d.from[1]];
      const [tx, ty] = pos[d.to[0]][d.to[1]];
      const x1 = d.from[0] === "area" ? L.XA1 : fx + 10;
      const x2 = d.to[0] === "area" ? L.XA0 : tx - 10;
      const path = `M${x1},${fy} C${(x1 + x2) / 2},${fy} ${(x1 + x2) / 2},${ty} ${x2},${ty}`;
      const area = d.from[0] === "area" ? d.from[1] : d.to[1];
      const el = mk("path", { d: path, class: `map-link area-${area}`, "stroke-width": 1.4 + d.ps.length * 1.3 }, gLinks);
      if (!drawn) { const len = el.getTotalLength(); el.style.strokeDasharray = len; el.style.strokeDashoffset = len; }
      const hit = mk("path", { d: path, class: "map-hit" }, gLinks);
      const facets = { [d.from[0]]: d.from[1], [d.to[0]]: d.to[1] };
      hit.addEventListener("mouseenter", () => paint({ ...state, ...facets }));
      hit.addEventListener("mouseleave", () => paint(state));
      hit.addEventListener("click", () => window.setFacets(facets));
      return { ...d, path: el };
    });

    nodeEls = [];
    const addNode = (facet, n) => {
      const [x, y] = pos[facet][n.id];
      const g = mk("g", { class: `map-node ${facet === "method" ? "m" : facet === "app" ? "a" : "ar area-" + n.id}`, tabindex: 0, role: "button", "aria-label": `Filter by ${n.label}` });
      if (facet === "area") {
        const w = L.XA1 - L.XA0, h = narrow ? 64 : 54;
        mk("rect", { x: L.XA0, y: y - h / 2, width: w, height: h, rx: 12 }, g);
        AREA_LINES[n.id].forEach((line, k) => {
          mk("text", { x, y: y - 4 + k * (L.afs + 3), "text-anchor": "middle", class: "area-text", style: `font-size:${L.afs}px` }, g).textContent = line;
        });
      } else {
        mk("circle", { cx: x, cy: y, r: 9 }, g);
        const left = facet === "method", tx = left ? x - 20 : x + 20;
        const t = mk("text", { x: tx, y: y + 5, "text-anchor": left ? "end" : "start" }, g);
        const words = n.label.split(" ");
        if (n.label.length > L.wrap && words.length > 1) {
          // split into two lines, choosing the break that keeps the longer line shortest
          let cut = 1, best = Infinity;
          for (let c = 1; c < words.length; c++) {
            const m = Math.max(words.slice(0, c).join(" ").length, words.slice(c).join(" ").length);
            if (m < best) { best = m; cut = c; }
          }
          [words.slice(0, cut).join(" "), words.slice(cut).join(" ")].forEach((line, k) => {
            mk("tspan", { x: tx, dy: k ? "1.15em" : "-0.45em" }, t).textContent = line;
          });
        } else t.textContent = n.label;
      }
      nodeEls.push({ facet, id: n.id, g });
      const toggled = () => ({ ...state, [facet]: state[facet] === n.id ? null : n.id });
      g.addEventListener("mouseenter", () => paint({ ...state, [facet]: n.id }));
      g.addEventListener("mouseleave", () => paint(state));
      g.addEventListener("click", () => window.setFacets({ [facet]: toggled()[facet] }));
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); window.setFacets({ [facet]: toggled()[facet] }); } });
    };
    cols.method.forEach((n) => addNode("method", n));
    cols.area.forEach((n) => addNode("area", n));
    cols.app.forEach((n) => addNode("app", n));
    paint(state);
  }

  // Highlight the links and nodes that still carry papers matching the facets.
  function paint(f) {
    const any = f.area || f.method || f.app;
    svg.classList.toggle("focus", !!any);
    if (!any) {
      linkEls.forEach((l) => l.path.classList.remove("on"));
      nodeEls.forEach((n) => n.g.classList.remove("on"));
      return;
    }
    const ok = (p) => ["area", "method", "app"].every((k) => !f[k] || has(p, k, f[k]));
    const live = new Set();
    // in a column with a selection, only the selected node's links light up
    // (papers with several methods/applications would otherwise light their siblings)
    const ends = (l) => [l.from, l.to].every(([facet, id]) => !f[facet] || f[facet] === id);
    linkEls.forEach((l) => {
      const on = ends(l) && l.ps.some(ok);
      l.path.classList.toggle("on", on);
      if (on) { live.add(l.from.join(":")); live.add(l.to.join(":")); }
    });
    nodeEls.forEach((n) => n.g.classList.toggle("on", live.has(`${n.facet}:${n.id}`) || f[n.facet] === n.id));
    nodeEls.forEach((n) => n.g.classList.toggle("sel", f[n.facet] === n.id));
  }
  // called by the publication list after any filter change
  window.methodsSync = (active) => { state = { ...active }; paint(state); };

  build();

  // draw the links in when the diagram scrolls into view
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const reveal = () => {
    if (drawn) return;
    drawn = true;
    linkEls.forEach((l, k) => {
      l.path.style.transition = reduceMotion ? "none" : `stroke-dashoffset 1.1s cubic-bezier(.2,.7,.2,1) ${0.1 + k * 0.04}s`;
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
