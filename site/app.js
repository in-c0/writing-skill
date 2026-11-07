(() => {
  const CFG = ["baseline", "writing-skill", "merged", "storyscope"];
  const NAME = { baseline: "No skill", "writing-skill": "writing-skill", merged: "writing-skill + StoryScope", storyscope: "StoryScope" };
  const GENRE = { journal: "Journal post", sales: "Sales copy", story: "Short story" };
  const REPO = "in-c0/writing-skill";
  const LIVE = `https://raw.githubusercontent.com/${REPO}/main/benchmark/results.json`;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let D, R;

  // ---------- theme (only changes when the user clicks)
  const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
  const saved = store.get("ws-theme");
  if (saved) document.documentElement.dataset.theme = saved;
  $("#theme").addEventListener("click", () => {
    const cur = document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next; store.set("ws-theme", next);
  });

  const toast = (t) => { const el = $("#toast"); el.textContent = t; el.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("on"), 1800); };
  async function copy(text, btn) {
    try { await navigator.clipboard.writeText(text); } catch {
      const ta = document.createElement("textarea"); ta.value = text; document.body.append(ta); ta.select(); document.execCommand("copy"); ta.remove();
    }
    if (btn) { const o = btn.textContent; btn.textContent = "Copied"; btn.classList.add("done"); setTimeout(() => { btn.textContent = o; btn.classList.remove("done"); }, 1400); }
    toast("Copied to clipboard");
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".cmd .copy"); if (b) copy(b.closest(".cmd").dataset.copy, b);
  });

  // ---------- markdown + AI-tell marks
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|[^*])\*([^*]+)\*/g, "$1<i>$2</i>").replace(/\[([^\]]+)\]\(([^)]*)\)/g, "<u>$1</u>");
  function md(src) {
    const out = []; let list = null;
    for (const block of src.trim().split(/\n\s*\n/)) {
      const lines = block.split("\n");
      if (/^#{1,3} /.test(lines[0]) && lines.length === 1) { const n = lines[0].match(/^#+/)[0].length; out.push(`<h${n}>${inline(lines[0].replace(/^#+ /, ""))}</h${n}>`); continue; }
      if (lines.every((l) => /^\s*[-*] /.test(l))) { out.push("<ul>" + lines.map((l) => `<li>${inline(l.replace(/^\s*[-*] /, ""))}</li>`).join("") + "</ul>"); continue; }
      if (/^#{1,3} /.test(lines[0])) { const n = lines[0].match(/^#+/)[0].length; out.push(`<h${n}>${inline(lines[0].replace(/^#+ /, ""))}</h${n}>`); lines.shift(); }
      const text = lines.join(" ").trim(); if (!text) continue;
      if (/^-{3,}$/.test(text)) { out.push("<hr>"); continue; }
      const sentences = (text.match(/[.!?](\s|$)/g) || []).length;
      const punch = sentences <= 1 && text.split(/\s+/).length < 8;
      out.push(`<p${punch ? ' class="punch"' : ""}>${inline(text)}</p>`);
    }
    return out.join("");
  }
  const STOCK = "tapestry|testament|delve|delving|realm|landscape|journey|navigate|navigating|elevate|seamless|seamlessly|unlock|embark|vibrant|resonate|resonates|profound|liminal|whisper(?:ed|s)?|symphony|beacon|intricate|meticulous|crafted|bustling|ever-evolving|game-changer|embrace|testimony|unwavering|kaleidoscope";
  const TELLS = [
    ["em dash", /—/g],
    ["not X but Y", /\bnot (?:just |only |merely |simply )?[^.,;]{1,40}, but\b|\b(?:isn't|is not|wasn't|was not) (?:just|only|merely|about)\b/gi],
    ["triad", /\b\w+(?: \w+)?, \w+(?: \w+)?,? and \w+(?: \w+)?\b/g],
    ["stock word", new RegExp(`\\b(?:${STOCK})\\b`, "gi")],
  ];
  function markTells(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
      const t = n.nodeValue; const hits = [];
      for (const [k, re] of TELLS) { re.lastIndex = 0; let m; while ((m = re.exec(t))) { if (m[0]) hits.push([m.index, m.index + m[0].length, k]); } }
      if (!hits.length) continue;
      hits.sort((a, b) => a[0] - b[0]);
      const frag = document.createDocumentFragment(); let at = 0;
      for (const [s, e, k] of hits) { if (s < at) continue; frag.append(t.slice(at, s)); const m = document.createElement("mark"); m.dataset.k = k; m.textContent = t.slice(s, e); frag.append(m); at = e; }
      frag.append(t.slice(at)); n.replaceWith(frag);
    }
  }
  function render(el, src) { el.innerHTML = md(src); markTells(el); }

  // ---------- hero demo: one orchestrated before/after on load
  function heroDemo() {
    const body = $("#demo-body"), marks = $("#demo-marks");
    const pick = (src) => src.trim().split(/\n\s*\n/).slice(0, 4).join("\n\n");
    const show = (v) => { render(body, pick(D.outputs["sales-1"][v])); $$("#demo-seg button").forEach((b) => b.setAttribute("aria-selected", b.dataset.v === v)); };
    const setMarks = () => body.classList.toggle("marks-on", marks.checked);
    $$("#demo-seg button").forEach((b) => b.addEventListener("click", () => { clearTimeout(heroDemo.t); show(b.dataset.v); }));
    marks.addEventListener("change", setMarks);
    show("baseline"); marks.checked = false; setMarks();
    if (reduce) { marks.checked = true; setMarks(); return; }
    setTimeout(() => { marks.checked = true; setMarks(); }, 700);
    heroDemo.t = setTimeout(() => show("storyscope"), 3200);
  }

  // ---------- leaderboard
  const fmt = (x, d = 1) => (x == null ? "–" : (+x).toFixed(d));
  function board() {
    const rank = R.ranking, ov = R.overall, top = rank[0];
    const fe = $("#hero-firsts"); if (fe && ov[top]) fe.textContent = `${ov[top].firsts} of ${ov[top].judgements}`;
    $("#podium").innerHTML = rank.map((c, i) => `
      <button class="pod ${i === 0 ? "win" : ""}" data-c="${c}">
        ${i === 0 ? '<span class="crown" aria-hidden="true">👑</span>' : ""}
        <div class="place">#${i + 1}</div>
        <div class="name">${NAME[c]}</div>
        <div class="score">${fmt(ov[c].judge_overall)}<small> /10</small></div>
        <div class="bar"><i data-w="${(ov[c].judge_overall || 0) * 10}"></i></div>
        <div class="firsts">${ov[c].firsts} first place${ov[c].firsts === 1 ? "" : "s"} of ${ov[c].judgements}</div>
      </button>`).join("");
    requestAnimationFrame(() => setTimeout(() => $$("#podium .bar i").forEach((i) => (i.style.width = i.dataset.w + "%")), 60));
    $$("#podium .pod").forEach((p) => p.addEventListener("click", () => { $("#right-cfg").value = p.dataset.c; renderPanes(); location.hash = "compare"; }));
    const best = {}; for (const g in GENRE) best[g] = Math.max(...CFG.map((c) => R.per_genre[g][c].overall || 0));
    const hb = (c) => { const xs = Object.keys(GENRE).map((g) => R.per_genre[g][c].human_bws).filter((x) => x != null); return xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null; };
    $("#board-table").innerHTML = `<thead><tr><th>Setup</th>${Object.values(GENRE).map((g) => `<th>${g}</th>`).join("")}<th>Average</th><th>Human best − worst</th></tr></thead><tbody>` +
      rank.map((c) => `<tr><td>${NAME[c]}</td>${Object.keys(GENRE).map((g) => { const v = R.per_genre[g][c].overall; return `<td class="${v === best[g] ? "best" : ""}">${fmt(v)}<span class="cell-bar"><i style="width:${(v || 0) * 10}%"></i></span></td>`; }).join("")}<td><b>${fmt(ov[c].judge_overall, 2)}</b></td><td>${hb(c) == null ? '<a href="#arena">add yours</a>' : (hb(c) > 0 ? "+" : "") + hb(c)}</td></tr>`).join("") + "</tbody>";
    const st = R.per_genre.story;
    const sig = (title, rows, cols) => `<h3>${title}</h3><div class="table-wrap"><table><thead><tr><th>Setup</th>${cols.map((c) => `<th>${c[0]}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>`;
    $("#signals").innerHTML =
      sig("Short stories, StoryScope classifier (relative only)", rank.map((c) => `<tr><td>${NAME[c]}</td><td>${fmt(st[c].ssi, 2)}</td><td>${fmt(st[c].logit_full)}</td><td>${fmt(st[c].p_human, 0)}%</td></tr>`).join(""), [["AI-default index ↓"], ["Classifier log-odds human ↑"], ["Judge P(human)"]]) +
      sig("Surface polish lint, per 100 words (lower is fewer tells)", rank.map((c) => `<tr><td>${NAME[c]}</td>${Object.keys(GENRE).map((g) => `<td>${fmt(R.per_genre[g][c].lint, 2)}</td>`).join("")}</tr>`).join(""), Object.values(GENRE).map((g) => [g])) +
      `<p class="small">Lint counts em dashes, "not X but Y", triads, stock words and one-line punch paragraphs. writing-skill cuts these hardest, yet judges still preferred StoryScope: removing tells is not the same as adding a voice. Human reviewers so far: ${R.human_reviewers}.</p>`;
  }

  // ---------- compare
  let genre = "story";
  function compare() {
    $("#genre-seg").innerHTML = Object.entries(GENRE).map(([g, n]) => `<button role="tab" data-g="${g}" aria-selected="${g === genre}">${n}</button>`).join("");
    $$("#genre-seg button").forEach((b) => b.addEventListener("click", () => { genre = b.dataset.g; $$("#genre-seg button").forEach((x) => x.setAttribute("aria-selected", x === b)); fillBriefs(); }));
    const opts = CFG.map((c) => `<option value="${c}">${NAME[c]}</option>`).join("");
    $("#left-cfg").innerHTML = opts; $("#right-cfg").innerHTML = opts;
    $("#left-cfg").value = "baseline"; $("#right-cfg").value = R.ranking[0];
    ["#left-cfg", "#right-cfg", "#brief-sel"].forEach((s) => $(s).addEventListener("change", renderPanes));
    $("#cmp-marks").addEventListener("change", () => $("#compare").classList.toggle("marks-on", $("#cmp-marks").checked));
    fillBriefs();
  }
  function fillBriefs() {
    const bs = R.briefs.filter((b) => b.genre === genre);
    $("#brief-sel").innerHTML = bs.map((b) => `<option value="${b.id}">${b.title}</option>`).join("");
    renderPanes();
  }
  function judgeLine(bid, c) {
    const pb = (R.per_brief[bid] || {})[c]; if (!pb) return "";
    const js = Object.entries(pb.judges || {});
    const avg = js.length ? js.reduce((a, [, s]) => a + s.overall, 0) / js.length : null;
    return `<span>Judges ${fmt(avg)}/10</span>${js.map(([k, s]) => `<span>${k.replace("-judge", "")} #${s.rank}</span>`).join("")}<span>${pb.lint.per_100w} tells/100w</span>${js[0] ? `<q>${esc(js[0][1].note || "")}</q>` : ""}`;
  }
  function renderPanes() {
    const bid = $("#brief-sel").value; const br = R.briefs.find((b) => b.id === bid);
    $("#brief-text").textContent = "Brief: " + br.prompt;
    for (const side of ["left", "right"]) {
      const c = $(`#${side}-cfg`).value;
      render($(`#${side}`), D.outputs[bid][c] || "");
      $(`#${side}-judge`).innerHTML = judgeLine(bid, c);
    }
  }

  // ---------- arena: blind best/worst, ~1 minute per genre
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const plain = (src) => src.split(/\n\s*\n/).filter((b) => !/^#/.test(b.trim()) && !/^\*\*\[/.test(b.trim())).join(" ").replace(/[*_#>\[\]]/g, "").replace(/\s+/g, " ").trim();
  function excerpt(src) {
    const s = plain(src).match(/[^.!?]+[.!?]+["”’)]*/g) || [plain(src)];
    if (s.length <= 4) return esc(s.join(" "));
    return esc(s.slice(0, 2).join(" ")) + '<span class="gap">⋯</span>' + esc(s.slice(-2).join(" "));
  }
  const A = { round: 0, rounds: [], picks: {}, seconds: {} };
  function arena() {
    A.rounds = Object.keys(GENRE).map((g) => { const bs = R.briefs.filter((b) => b.genre === g); const b = bs[Math.floor(Math.random() * bs.length)]; return { g, b, order: shuffle(CFG) }; });
    $("#arena-root").innerHTML = `<div class="ar-start"><p>You will see four anonymous pieces per round, showing their opening and closing lines. Pick the best and the worst. It takes about three minutes.</p><button class="btn" id="ar-go">Start round 1</button></div>`;
    $("#ar-go").addEventListener("click", () => { A.round = 0; A.picks = {}; roundView(); });
  }
  let tick;
  function roundView() {
    const r = A.rounds[A.round]; const st = { best: null, worst: null, t0: Date.now(), locked: false };
    const C = 2 * Math.PI * 19;
    $("#arena-root").innerHTML = `
      <div class="ar-top">
        <svg class="ring" viewBox="0 0 46 46" aria-hidden="true"><circle class="bg" cx="23" cy="23" r="19"/><circle class="fg" cx="23" cy="23" r="19" stroke-dasharray="${C}" stroke-dashoffset="0"/><text x="23" y="27.5" text-anchor="middle">60</text></svg>
        <div class="ar-title">Round ${A.round + 1}: ${GENRE[r.g]}<small>${esc(r.b.prompt.slice(0, 120))}…</small></div>
        <div class="ar-steps">${A.rounds.map((_, i) => `<i class="${i < A.round ? "done" : i === A.round ? "on" : ""}"></i>`).join("")}</div>
      </div>
      <div class="cards">${r.order.map((c, i) => `
        <div class="card" data-c="${c}">
          <div class="who">Writer ${"ABCD"[i]}</div>
          <div class="ex">${excerpt(D.outputs[r.b.id][c])}</div>
          <button class="full">Read the full piece</button>
          <div class="acts"><button class="b" aria-pressed="false">Best</button><button class="w" aria-pressed="false">Worst</button></div>
          <div class="reveal" hidden></div>
        </div>`).join("")}</div>
      <div class="ar-foot"><button class="btn" id="ar-lock" disabled>Lock in picks</button></div>`;
    const fg = $(".ring .fg"), tx = $(".ring text"); let left = 60;
    clearInterval(tick); tick = setInterval(() => { left = Math.max(0, left - 1); tx.textContent = left; fg.style.strokeDashoffset = C * (1 - left / 60); if (left === 0) { fg.style.stroke = "var(--red)"; clearInterval(tick); } }, 1000);
    $$("#arena-root .card").forEach((card) => {
      const c = card.dataset.c;
      card.querySelector(".full").addEventListener("click", (e) => { const ex = card.querySelector(".ex"); if (ex.dataset.full) { ex.innerHTML = excerpt(D.outputs[r.b.id][c]); delete ex.dataset.full; e.target.textContent = "Read the full piece"; } else { ex.innerHTML = md(D.outputs[r.b.id][c]); ex.dataset.full = 1; e.target.textContent = "Show less"; } });
      for (const kind of ["best", "worst"]) {
        card.querySelector(kind === "best" ? ".b" : ".w").addEventListener("click", () => {
          if (st.locked) return;
          st[kind] = st[kind] === c ? null : c;
          if (st.best && st.best === st.worst) st[kind === "best" ? "worst" : "best"] = null;
          $$("#arena-root .card").forEach((k) => { k.classList.toggle("best", k.dataset.c === st.best); k.classList.toggle("worst", k.dataset.c === st.worst); k.querySelector(".b").setAttribute("aria-pressed", k.dataset.c === st.best); k.querySelector(".w").setAttribute("aria-pressed", k.dataset.c === st.worst); });
          $("#ar-lock").disabled = !(st.best && st.worst);
        });
      }
    });
    $("#ar-lock").addEventListener("click", () => {
      if (!st.locked) {
        st.locked = true; clearInterval(tick);
        A.picks[r.b.id] = { best: st.best, worst: st.worst, shown: r.order }; A.seconds[r.b.id] = Math.round((Date.now() - st.t0) / 1000);
        $$("#arena-root .card").forEach((k, i) => { const rv = k.querySelector(".reveal"); rv.hidden = false; setTimeout(() => { rv.textContent = NAME[k.dataset.c]; k.classList.add("revealed"); }, i * 120); });
        $("#ar-lock").textContent = A.round < A.rounds.length - 1 ? `Next: ${GENRE[A.rounds[A.round + 1].g]}` : "See my results";
      } else { A.round++; A.round < A.rounds.length ? roundView() : doneView(); }
    });
  }
  function doneView() {
    const tally = Object.fromEntries(CFG.map((c) => [c, 0]));
    for (const p of Object.values(A.picks)) { tally[p.best]++; tally[p.worst]--; }
    const payload = { v: 1, picks: A.picks, seconds: A.seconds, ua: navigator.language, at: new Date().toISOString() };
    const body = `Thanks for judging! Submitting this issue adds your picks to the human column of the benchmark. A bot will merge it in a minute.\n\n\`\`\`json\n${JSON.stringify(payload, null, 1)}\n\`\`\`\n`;
    const url = `https://github.com/${REPO}/issues/new?title=${encodeURIComponent("[human-review] 3 rounds")}&body=${encodeURIComponent(body)}`;
    $("#arena-root").innerHTML = `<div class="ar-done"><h3>Your picks</h3><p>Best counts +1, worst counts −1. Send them to the leaderboard with one GitHub issue; nothing is posted until you press Submit there.</p>
      <div class="ar-sum">${CFG.slice().sort((a, b) => tally[b] - tally[a]).map((c) => `<div><span>${NAME[c]}</span><b>${tally[c] > 0 ? "+" : ""}${tally[c]}</b></div>`).join("")}</div>
      <a class="btn" href="${url}" target="_blank" rel="noopener">Send to leaderboard</a> <button class="btn ghost" id="ar-copy">Copy as JSON</button> <button class="btn ghost" id="ar-again">Judge again</button></div>`;
    $("#ar-copy").addEventListener("click", (e) => copy(JSON.stringify(payload), e.target));
    $("#ar-again").addEventListener("click", arena);
  }

  // ---------- prompts + install tabs
  function prompts() {
    const meta = { storyscope: ["StoryScope", "Best in this benchmark. Measured AI defaults, then deliberate departures."], "writing-skill-storyscope": ["writing-skill + StoryScope", "Reader-first rules plus the StoryScope map."], "writing-skill": ["writing-skill", "Reader-first rules that strip AI polish."] };
    const order = [R.ranking[0] === "merged" ? "writing-skill-storyscope" : R.ranking[0], "storyscope", "writing-skill-storyscope", "writing-skill"].filter((v, i, a) => meta[v] && a.indexOf(v) === i);
    $("#prompt-grid").innerHTML = order.map((k, i) => `<div class="pcard ${i === 0 ? "top-pick" : ""}"><h3>${meta[k][0]}${i === 0 ? " 👑" : ""}</h3><div class="meta">${meta[k][1]} · ${D.prompts[k].split(/\s+/).length} words</div><pre>${esc(D.prompts[k])}</pre><button class="btn" data-k="${k}">Copy prompt</button></div>`).join("");
    $$("#prompt-grid .btn").forEach((b) => b.addEventListener("click", () => copy(D.prompts[b.dataset.k] + " ", b)));
    $$("#inst-seg button").forEach((b) => b.addEventListener("click", () => { $$("#inst-seg button").forEach((x) => x.setAttribute("aria-selected", x === b)); $$(".inst").forEach((p) => (p.hidden = p.dataset.t !== b.dataset.t)); }));
  }

  // ---------- boot
  fetch("data.json").then((r) => r.json()).then(async (d) => {
    D = d; R = d.results;
    try { const live = await fetch(LIVE, { cache: "no-store" }); if (live.ok) { const lr = await live.json(); if (lr.per_genre && lr.ranking) R = lr; } } catch {}
    heroDemo(); board(); compare(); arena(); prompts();
  });
})();
