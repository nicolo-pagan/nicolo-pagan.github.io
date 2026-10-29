/* About-section illustration: a human-AI system.
   People and AI agents form a network around an AI system. Data flows in
   (gold) and decisions flow out (blue). The outer loop follows the ML-based
   decision-making pipeline of the EAAMO 2023 feedback-loops paper:
   data → prediction → decision → outcome, and back. Particles pause off-screen and are
   static for visitors who prefer reduced motion. */
(function () {
  const svg = document.getElementById("systemSvg");
  if (!svg) return;
  const NS = "http://www.w3.org/2000/svg";
  const mk = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    (parent || svg).appendChild(n);
    return n;
  };
  const CX = 260, CY = 238, RING = 150, LOOP = 208;
  const AI = new Set([1, 4, 7]);
  const N = 9;
  const nodes = Array.from({ length: N }, (_, i) => {
    const t = -Math.PI / 2 + (i * 2 * Math.PI) / N;
    return { i, x: CX + RING * Math.cos(t), y: CY + RING * Math.sin(t), ai: AI.has(i) };
  });

  // outer feedback loop: dashed ring with arrowheads and four step labels
  const defs = mk("defs", {});
  const mkArrow = mk("marker", { id: "sysArrow", viewBox: "0 0 10 10", refX: "6", refY: "5", markerWidth: "7", markerHeight: "7", orient: "auto" }, defs);
  mk("path", { d: "M0,0 L10,5 L0,10 z", class: "sys-arrowhead" }, mkArrow);
  const steps = [["data", -60], ["prediction", 30], ["decision", 120], ["outcome", 210]];
  steps.forEach(([, deg]) => {
    const a0 = ((deg - 38) * Math.PI) / 180, a1 = ((deg + 38) * Math.PI) / 180;
    const p0 = [CX + LOOP * Math.cos(a0), CY + LOOP * Math.sin(a0)], p1 = [CX + LOOP * Math.cos(a1), CY + LOOP * Math.sin(a1)];
    mk("path", { d: `M${p0} A${LOOP},${LOOP} 0 0 1 ${p1}`, class: "sys-loop", "marker-end": "url(#sysArrow)" });
  });
  steps.forEach(([label, deg]) => {
    const a = (deg * Math.PI) / 180;
    const x = CX + LOOP * Math.cos(a), y = CY + LOOP * Math.sin(a);
    const g = mk("g", { class: "sys-step" });
    const w = label.length * 7.6 + 18;
    mk("rect", { x: x - w / 2, y: y - 11, width: w, height: 22, rx: 11 }, g);
    mk("text", { x, y: y + 4.5, "text-anchor": "middle" }, g).textContent = label;
  });

  // social ties between people and agents, and spokes to the feed
  const ties = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 0], [0, 3], [2, 6], [5, 8], [1, 5]];
  const gTies = mk("g", { class: "sys-ties" });
  ties.forEach(([a, b]) => mk("line", { x1: nodes[a].x, y1: nodes[a].y, x2: nodes[b].x, y2: nodes[b].y }, gTies));
  const gSpokes = mk("g", { class: "sys-spokes" });
  nodes.forEach((n) => mk("line", { x1: n.x, y1: n.y, x2: CX, y2: CY }, gSpokes));

  // the AI system in the middle: a small neural network in a rounded block
  const feed = mk("g", { class: "sys-feed" });
  mk("rect", { x: CX - 56, y: CY - 50, width: 112, height: 100, rx: 22, class: "sys-card" }, feed);
  const layers = [[CX - 30, [-24, 0, 24]], [CX, [-30, -10, 10, 30]], [CX + 30, [-12, 12]]];
  const gNet = mk("g", { class: "sys-nn" }, feed);
  for (let l = 0; l < layers.length - 1; l++) {
    const [x0, ys0] = layers[l], [x1, ys1] = layers[l + 1];
    ys0.forEach((y0) => ys1.forEach((y1) => mk("line", { x1: x0, y1: CY + y0, x2: x1, y2: CY + y1 }, gNet)));
  }
  layers.forEach(([x, ys], l) => ys.forEach((y) => mk("circle", { cx: x, cy: CY + y, r: 5.5, class: l === 2 ? "out" : "" }, gNet)));
  mk("text", { x: CX, y: CY + 72, "text-anchor": "middle", class: "sys-caption" }, feed).textContent = "AI system";

  // particles layer (under the nodes, above the spokes)
  const gParticles = mk("g", { class: "sys-particles" });

  // people and AI agents
  const PERSON = '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>';
  const BOT = '<path d="M12 8V4H8"/><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M2 14h2M20 14h2M15 13v2M9 13v2"/>';
  nodes.forEach((n) => {
    const g = mk("g", { class: `sys-node ${n.ai ? "ai" : "human"}`, transform: `translate(${n.x},${n.y})` });
    if (n.ai) mk("rect", { x: -22, y: -22, width: 44, height: 44, rx: 12, class: "sys-body" }, g);
    else mk("circle", { r: 22, class: "sys-body" }, g);
    const ic = mk("g", { transform: "translate(-11,-11) scale(0.92)", class: "sys-ic" }, g);
    ic.innerHTML = n.ai ? BOT : PERSON;
    n.g = g;
  });

  // ---- particle animation ----
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const parts = [];
  function spawn() {
    const n = nodes[Math.floor(Math.random() * N)];
    const out = Math.random() < 0.5;                     // out of the feed (recommendation) or into it (post)
    const post = !out;
    // AI agents post more often than people
    if (post && !n.ai && Math.random() < 0.35) return;
    const c = mk("circle", { r: 2.4, class: post ? "p post" : "p rec" }, gParticles);
    parts.push({ c, n, out, t: 0, speed: 0.005 + Math.random() * 0.004 });
  }
  function pulse(g) {
    g.classList.remove("hit");
    void g.getBBox();
    g.classList.add("hit");
  }
  let last = 0, acc = 0, running = false, visible = false;
  function frame(ts) {
    if (!running) return;
    const dt = Math.min(64, ts - (last || ts)); last = ts;
    acc += dt;
    if (acc > 650) { acc = 0; spawn(); }
    for (let k = parts.length - 1; k >= 0; k--) {
      const p = parts[k];
      p.t += p.speed * (dt / 16);
      const t = Math.min(1, p.t), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const [x0, y0, x1, y1] = p.out ? [CX, CY, p.n.x, p.n.y] : [p.n.x, p.n.y, CX, CY];
      p.c.setAttribute("cx", x0 + (x1 - x0) * e);
      p.c.setAttribute("cy", y0 + (y1 - y0) * e);
      p.c.setAttribute("opacity", Math.sin(Math.PI * t) * 0.55);
      if (t >= 1) {
        pulse(p.out ? p.n.g : feed);
        p.c.remove();
        parts.splice(k, 1);
      }
    }
    requestAnimationFrame(frame);
  }
  function setRunning(on) {
    if (reduceMotion) return;
    if (on && !running) { running = true; last = 0; requestAnimationFrame(frame); }
    if (!on) running = false;
  }
  if (!reduceMotion) {
    svg.classList.add("animated");
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; setRunning(visible); }).observe(svg);
    } else setRunning(true);
  }
})();
