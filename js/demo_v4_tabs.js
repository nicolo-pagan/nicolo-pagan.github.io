/* Interactive meritocratic network formation model
   (Pagan, Mei, Li & Dörfler, Nature Communications 2021).

   N agents, ranked by quality (rank 1 = best). At every step each agent i
   meets one other agent j, chosen uniformly, proportionally to popularity
   (in-degree + 1), or by a 50/50 mix. Agent i starts following j if j is
   better than every agent i already follows. Links are never removed.
   At equilibrium the expected in-degree of the i-th best agent is N/i. */
(function () {
  const $ = (id) => document.getElementById(id);
  const netCv = $("demoNet"), plotCv = $("demoPlot");
  if (!netCv || !plotCv) return;

  const css = getComputedStyle(document.documentElement);
  const C = {
    band: css.getPropertyValue("--band").trim() || "#305f74",
    dark: css.getPropertyValue("--band-dark").trim() || "#244b5d",
    panel: css.getPropertyValue("--panel").trim() || "#dae7ec",
    gold: css.getPropertyValue("--gold").trim() || "#b8955a",
    faint: "#8a8e9c"
  };
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let N, best, indeg, links, edges, recent, t, pos, playing = false, acc = 0, last = 0;

  function reset() {
    N = +$("demoN").value;
    best = new Int32Array(N).fill(N); // rank of best followee; N = "nobody yet" (worse than all)
    indeg = new Int32Array(N);
    edges = [];
    recent = [];
    links = 0; t = 0;
    // golden-angle spiral: rank 0 (best) at the centre
    pos = Array.from({ length: N }, (_, i) => {
      const r = Math.sqrt((i + 0.5) / N), a = i * 2.39996323;
      return [r * Math.cos(a), r * Math.sin(a)];
    });
    updateStats(); draw();
  }

  function meet(i, mode) {
    const usePA = mode === "pa" || (mode === "mixed" && Math.random() < 0.5);
    if (!usePA) {
      let j = Math.floor(Math.random() * (N - 1));
      return j >= i ? j + 1 : j;
    }
    // preferential attachment: probability proportional to in-degree + 1
    const total = links + N - (indeg[i] + 1);
    let r = Math.random() * total;
    for (let j = 0; j < N; j++) {
      if (j === i) continue;
      r -= indeg[j] + 1;
      if (r < 0) return j;
    }
    return i === N - 1 ? N - 2 : N - 1;
  }

  function step() {
    const mode = $("demoMeet").value;
    const fresh = [];
    for (let i = 0; i < N; i++) {
      const j = meet(i, mode);
      if (j < best[i]) {          // j is better than everyone i follows
        best[i] = j;
        indeg[j]++; links++;
        edges.push([i, j]);
        fresh.push([i, j]);
      }
    }
    t++;
    recent = fresh;
    updateStats();
  }

  function updateStats() {
    let found = 0;
    for (let i = 0; i < N; i++) if (best[i] === (i === 0 ? 1 : 0)) found++;
    $("demoT").textContent = t;
    $("demoLinks").textContent = links.toLocaleString("en");
    $("demoBest").textContent = Math.round((found / N) * 100) + "%";
    if (found === N && playing) toggle(false);
  }

  function fit(cv) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return [ctx, w, h];
  }

  function drawNet() {
    const [ctx, w, h] = fit(netCv);
    ctx.clearRect(0, 0, w, h);
    const R = Math.min(w, h) / 2 - 14, cx = w / 2, cy = h / 2;
    const P = (i) => [cx + pos[i][0] * R, cy + pos[i][1] * R];
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = "rgba(48,95,116,0.10)";
    ctx.beginPath();
    for (const [a, b] of edges) { const [x1, y1] = P(a), [x2, y2] = P(b); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); }
    ctx.stroke();
    // new links in gold; fainter when many appear at once (e.g. the first step)
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = `rgba(184,149,90,${Math.min(0.8, 12 / Math.max(1, recent.length))})`;
    ctx.beginPath();
    for (const [a, b] of recent) { const [x1, y1] = P(a), [x2, y2] = P(b); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); }
    ctx.stroke();
    const maxR = Math.max(6, R / 9);
    for (let i = N - 1; i >= 0; i--) {
      const [x, y] = P(i);
      const r = Math.min(maxR, 1.6 + Math.sqrt(indeg[i]) * 1.1);
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = i < 3 ? C.gold : i < N * 0.1 ? C.band : "rgba(48,95,116,0.45)";
      ctx.fill();
    }
  }

  function drawPlot() {
    const [ctx, w, h] = fit(plotCv);
    ctx.clearRect(0, 0, w, h);
    const m = { l: 44, r: 12, t: 12, b: 34 };
    const W = w - m.l - m.r, H = h - m.t - m.b;
    const lx = (v) => m.l + (Math.log10(v) / Math.log10(N)) * W;     // rank 1..N
    const ly = (v) => m.t + H - (Math.log10(v) / Math.log10(N)) * H; // followers 1..N
    // axes and grid
    ctx.strokeStyle = "#dfe7ea"; ctx.lineWidth = 1; ctx.fillStyle = C.faint; ctx.font = "11px Inter, sans-serif";
    for (let e = 0; Math.pow(10, e) <= N; e++) {
      const v = Math.pow(10, e);
      ctx.beginPath(); ctx.moveTo(lx(v), m.t); ctx.lineTo(lx(v), m.t + H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(m.l, ly(v)); ctx.lineTo(m.l + W, ly(v)); ctx.stroke();
      ctx.textAlign = "center"; ctx.fillText(v, lx(v), m.t + H + 15);
      ctx.textAlign = "right"; ctx.fillText(v, m.l - 6, ly(v) + 4);
    }
    ctx.textAlign = "center"; ctx.fillText("creator rank i (log)", m.l + W / 2, h - 4);
    ctx.save(); ctx.translate(11, m.t + H / 2); ctx.rotate(-Math.PI / 2); ctx.fillText("followers (log)", 0, 0); ctx.restore();
    // Zipf line N/i
    ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.moveTo(lx(1), ly(N)); ctx.lineTo(lx(N), ly(1)); ctx.stroke(); ctx.setLineDash([]);
    // empirical in-degree by quality rank
    ctx.fillStyle = C.band;
    for (let i = 0; i < N; i++) {
      if (!indeg[i]) continue;
      ctx.beginPath(); ctx.arc(lx(i + 1), ly(indeg[i]), 2.4, 0, Math.PI * 2); ctx.fill();
    }
  }

  function draw() { drawNet(); drawPlot(); }

  function loop(ts) {
    if (!playing) return;
    const dt = Math.min(250, ts - (last || ts)); last = ts;
    acc += dt * (+$("demoSpeed").value) / 1000;
    let did = false;
    while (acc >= 1 && playing) { step(); acc -= 1; did = true; }
    if (did) draw();
    requestAnimationFrame(loop);
  }

  function toggle(on) {
    playing = on === undefined ? !playing : on;
    $("demoPlay").querySelector("span").textContent = playing ? "Pause" : "Play";
    if (playing) { last = 0; acc = 1; requestAnimationFrame(loop); }
  }

  $("demoPlay").addEventListener("click", () => toggle());
  $("demoStep").addEventListener("click", () => { toggle(false); step(); draw(); });
  $("demoReset").addEventListener("click", () => { toggle(false); reset(); });
  $("demoN").addEventListener("input", (e) => { $("demoNOut").textContent = e.target.value; toggle(false); reset(); });
  $("demoSpeed").addEventListener("input", (e) => { $("demoSpeedOut").textContent = e.target.value; });
  $("demoMeet").addEventListener("change", () => { toggle(false); reset(); });
  window.addEventListener("resize", draw);

  reset();
  // Start automatically the first time the section scrolls into view.
  if (!reduceMotion) {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { toggle(true); io.disconnect(); } }, { threshold: 0.35 });
    io.observe(netCv);
  }
})();
