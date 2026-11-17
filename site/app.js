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

  // theme: changes only when the user clicks
  const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
  const saved = store.get("ws-theme");
  if (saved) document.documentElement.dataset.theme = saved;
  $("#theme").addEventListener("click", () => {
    const cur = document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next; store.set("ws-theme", next);
  });

  const toast = (t) => { const el = $("#toast"); el.textContent = t; el.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("on"), 1600); };
  async function copy(text, btn) {
    try { await navigator.clipboard.writeText(text); } catch {
      const ta = document.createElement("textarea"); ta.value = text; document.body.append(ta); ta.select(); document.execCommand("copy"); ta.remove();
    }
    if (btn) { const o = btn.textContent; btn.textContent = "Copied"; btn.classList.add("done"); setTimeout(() => { btn.textContent = o; btn.classList.remove("done"); }, 1400); }
    toast("Copied");
  }
  document.addEventListener("click", (e) => { const b = e.target.closest(".cmd .copy"); if (b) copy(b.closest(".cmd").dataset.copy, b); });

  // markdown + surface marks
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|[^*])\*([^*]+)\*/g, "$1<i>$2</i>").replace(/\[([^\]]+)\]\(([^)]*)\)/g, "<u>$1</u>");
  function md(src) {
    const out = [];
    for (const block of src.trim().split(/\n\s*\n/)) {
      const lines = block.split("\n");
      if (/^#{1,3} /.test(lines[0])) { const n = lines[0].match(/^#+/)[0].length; out.push(`<h${n}>${inline(lines[0].replace(/^#+ /, ""))}</h${n}>`); lines.shift(); }
      if (lines.length && lines.every((l) => /^\s*[-*] /.test(l))) { out.push("<ul>" + lines.map((l) => `<li>${inline(l.replace(/^\s*[-*] /, ""))}</li>`).join("") + "</ul>"); continue; }
      const text = lines.join(" ").trim(); if (!text) continue;
      if (/^-{3,}$/.test(text)) { out.push("<hr>"); continue; }
      const punch = (text.match(/[.!?](\s|$)/g) || []).length <= 1 && text.split(/\s+/).length < 8;
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
      for (const [k, re] of TELLS) { re.lastIndex = 0; let m; while ((m = re.exec(t))) if (m[0]) hits.push([m.index, m.index + m[0].length, k]); }
      if (!hits.length) continue;
      hits.sort((a, b) => a[0] - b[0]);
      const frag = document.createDocumentFragment(); let at = 0;
      for (const [s, e, k] of hits) { if (s < at) continue; frag.append(t.slice(at, s)); const m = document.createElement("mark"); m.dataset.k = k; m.textContent = t.slice(s, e); frag.append(m); at = e; }
      frag.append(t.slice(at)); n.replaceWith(frag);
    }
  }
  function render(el, src) { el.innerHTML = md(src); markTells(el); }
  const fmt = (x, d = 1) => (x == null ? "–" : (+x).toFixed(d));

  // ---------- hero: blind pair, the card is the control
  let heroGenre = "journal";
  const pairOrder = {};
  function hero() {
    $("#hero-genres").innerHTML = Object.entries(GENRE).map(([g, n]) => `<button role="tab" data-g="${g}" aria-selected="${g === heroGenre}">${n}</button>`).join("");
    $$("#hero-genres button").forEach((b) => b.addEventListener("click", () => { heroGenre = b.dataset.g; $$("#hero-genres button").forEach((x) => x.setAttribute("aria-selected", x === b)); duel(); }));
    duel();
  }
  function opening(src) {
    const blocks = src.trim().split(/\n\s*\n/);
    let words = 0; const keep = [];
    for (const b of blocks) { keep.push(b); if (!/^#/.test(b)) words += b.split(/\s+/).length; if (words > 110) break; }
    return keep.join("\n\n");
  }
  function duel() {
    const br = R.briefs.find((b) => b.genre === heroGenre);
    pairOrder[heroGenre] ||= Math.random() < 0.5 ? ["baseline", "storyscope"] : ["storyscope", "baseline"];
    $("#hero-brief").textContent = "Brief: " + br.prompt;
    $("#verdict").textContent = "";
    $("#duel").innerHTML = pairOrder[heroGenre].map((c, i) => `
      <button class="draft" data-c="${c}" aria-label="Prefer draft ${"AB"[i]}">
        <span class="tag"><span class="anon">Draft ${"AB"[i]}</span><span class="real">${NAME[c]}</span></span>
        <span class="sample">${md(opening(D.outputs[br.id][c]))}</span>
        <span class="fade" aria-hidden="true"></span>
      </button>`).join("");
    $$("#duel .draft").forEach((d) => d.addEventListener("click", () => pick(d.dataset.c)));
  }
  function pick(c) {
    const duelEl = $("#duel");
    if (duelEl.classList.contains("revealed")) return;
    duelEl.classList.add("revealed");
    $$("#duel .draft").forEach((d) => d.classList.toggle("chosen", d.dataset.c === c));
    const g = R.per_genre[heroGenre].storyscope;
    const n = g.n_judgements;
    $("#verdict").innerHTML = `You picked <b>${NAME[c]}</b>. In this genre the AI judges ranked StoryScope first in ${g.firsts} of ${n} blind judgements, and in ${g.neutral_firsts ?? "–"} of ${n} with the neutral prompt. <a href="#compare" data-brief="${R.briefs.find((b) => b.genre === heroGenre).id}">Read both in full</a>`;
    $("#verdict a").addEventListener("click", (e) => { $("#brief-sel").value = e.target.dataset.brief; $("#left-cfg").value = "baseline"; $("#right-cfg").value = "storyscope"; renderPanes(); });
  }

  // ---------- results: one table
  function board() {
    const ov = R.overall;
    const order = CFG.slice().sort((a, b) => (ov[b].neutral_overall ?? ov[b].judge_overall) + ov[b].judge_overall - (ov[a].neutral_overall ?? ov[a].judge_overall) - ov[a].judge_overall);
    const hb = (c) => { const xs = Object.keys(GENRE).map((g) => R.per_genre[g][c].human_bws).filter((x) => x != null); return xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null; };
    const top = order[0];
    $("#board-table").innerHTML = `<thead><tr><th>Setup</th><th>Score</th><th>Neutral prompt</th><th>First places of 12</th><th>Human picks</th></tr></thead><tbody>` +
      order.map((c) => `<tr class="${c === top ? "lead" : ""}"><td>${NAME[c]}</td><td>${fmt(ov[c].judge_overall, 2)}</td><td>${fmt(ov[c].neutral_overall, 2)}</td><td>${ov[c].firsts} <span class="of">/</span> ${ov[c].neutral_firsts ?? "–"}</td><td>${hb(c) == null ? '<a href="#arena">none yet</a>' : (hb(c) > 0 ? "+" : "") + hb(c)}</td></tr>`).join("") + "</tbody>";
    const st = R.per_genre.story;
    $("#board-note").textContent = `StoryScope led under both prompts. The gap is smallest on short stories, where the neutral prompt scored it ${fmt(st.storyscope.neutral_overall, 2)} against ${fmt(st.baseline.neutral_overall, 2)} for no skill. Scores are averages out of 10. First places are shown as original / neutral prompt.`;
    const rows = (cols, fn) => order.map((c) => `<tr><td>${NAME[c]}</td>${cols.map((k) => `<td>${fn(c, k)}</td>`).join("")}</tr>`).join("");
    const table = (head, body) => `<div class="table-wrap"><table><thead><tr><th>Setup</th>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table></div>`;
    $("#signals").innerHTML =
      `<h3>Score by genre (original / neutral prompt)</h3>` + table(Object.values(GENRE), rows(Object.keys(GENRE), (c, g) => `${fmt(R.per_genre[g][c].overall)} / ${fmt(R.per_genre[g][c].neutral_overall)}`)) +
      `<h3>Short stories, StoryScope classifier</h3>` + table(["AI-default index, lower is fewer", "Classifier log-odds"], rows(["ssi", "logit_full"], (c, k) => fmt(st[c][k], k === "ssi" ? 2 : 1))) +
      `<p class="small">Relative only. The classifier was trained on 5,000-word stories annotated by another model, so its absolute values here don't match the paper.</p>` +
      `<h3>Surface patterns per 100 words</h3>` + table(Object.values(GENRE), rows(Object.keys(GENRE), (c, g) => fmt(R.per_genre[g][c].lint, 2))) +
      `<p class="small">writing-skill removes the most of these, yet scored lowest. Fewer patterns did not mean a better read.</p>`;
  }

  // ---------- all drafts
  function compare() {
    $("#brief-sel").innerHTML = Object.entries(GENRE).map(([g, n]) => `<optgroup label="${n}">${R.briefs.filter((b) => b.genre === g).map((b) => `<option value="${b.id}">${esc(b.title)}</option>`).join("")}</optgroup>`).join("");
    $("#brief-sel").value = R.briefs.find((b) => b.genre === "story").id;
    const opts = CFG.map((c) => `<option value="${c}">${NAME[c]}</option>`).join("");
    $("#left-cfg").innerHTML = opts; $("#right-cfg").innerHTML = opts;
    $("#left-cfg").value = "baseline"; $("#right-cfg").value = "storyscope";
    ["#left-cfg", "#right-cfg", "#brief-sel"].forEach((s) => $(s).addEventListener("change", renderPanes));
    const marks = $("#cmp-marks");
    const apply = () => $("#compare").classList.toggle("marks-on", marks.checked);
    marks.addEventListener("change", apply);
    renderPanes();
    // show once what the switch does: on, then off
    if (!reduce && "IntersectionObserver" in window) {
      const io = new IntersectionObserver((es) => {
        if (!es[0].isIntersecting) return; io.disconnect();
        setTimeout(() => { marks.checked = true; apply(); }, 400);
        setTimeout(() => { marks.checked = false; apply(); }, 2200);
      }, { threshold: 0.35 });
      io.observe($(".panes"));
    }
  }
  function judgeLine(bid, c) {
    const pb = (R.per_brief[bid] || {})[c]; if (!pb) return "";
    const js = Object.values(pb.judges || {});
    const avg = js.length ? js.reduce((a, s) => a + s.overall, 0) / js.length : null;
    return `Judges ${fmt(avg)}/10${js[0] && js[0].note ? ` · “${esc(js[0].note)}”` : ""}`;
  }
  function renderPanes() {
    const bid = $("#brief-sel").value;
    for (const side of ["left", "right"]) {
      const c = $(`#${side}-cfg`).value;
      render($(`#${side}`), D.outputs[bid][c] || "");
      $(`#${side}-judge`).innerHTML = judgeLine(bid, c);
    }
  }

  // ---------- arena: blind best/worst, self-paced
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const plain = (src) => src.split(/\n\s*\n/).filter((b) => !/^#/.test(b.trim()) && !/^\*\*\[/.test(b.trim())).join(" ").replace(/[*_#>\[\]]/g, "").replace(/\s+/g, " ").trim();
  function excerpt(src) {
    const s = plain(src).match(/[^.!?]+[.!?]+["”’)]*/g) || [plain(src)];
    if (s.length <= 4) return esc(s.join(" "));
    return esc(s.slice(0, 2).join(" ")) + '<span class="gap">⋯</span>' + esc(s.slice(-2).join(" "));
  }
  const A = { round: 0, rounds: [], picks: {}, seconds: {} };
  function arena() {
    A.rounds = Object.keys(GENRE).map((g) => { const bs = R.briefs.filter((b) => b.genre === g); return { g, b: bs[Math.floor(Math.random() * bs.length)], order: shuffle(CFG) }; });
    A.round = 0; A.picks = {}; A.seconds = {};
    $("#arena-root").innerHTML = `<button class="btn" id="ar-go">Start</button>`;
    $("#ar-go").addEventListener("click", roundView);
  }
  function roundView() {
    const r = A.rounds[A.round]; const st = { best: null, worst: null, t0: Date.now(), locked: false };
    $("#arena-root").innerHTML = `
      <div class="ar-top"><b>${GENRE[r.g]}</b><span class="small">Round ${A.round + 1} of 3</span></div>
      <div class="cards">${r.order.map((c, i) => `
        <div class="card" data-c="${c}">
          <div class="who">${"ABCD"[i]}<span class="reveal"></span></div>
          <div class="ex">${excerpt(D.outputs[r.b.id][c])}</div>
          <button class="full">Read in full</button>
          <div class="acts"><button class="b" aria-pressed="false">Best</button><button class="w" aria-pressed="false">Worst</button></div>
        </div>`).join("")}</div>
      <div class="ar-foot"><button class="btn" id="ar-next" disabled>Next</button></div>`;
    $$("#arena-root .card").forEach((card) => {
      const c = card.dataset.c;
      card.querySelector(".full").addEventListener("click", (e) => { const ex = card.querySelector(".ex"); const open = ex.dataset.full; ex.innerHTML = open ? excerpt(D.outputs[r.b.id][c]) : md(D.outputs[r.b.id][c]); open ? delete ex.dataset.full : (ex.dataset.full = 1); e.target.textContent = open ? "Read in full" : "Show less"; });
      for (const kind of ["best", "worst"]) {
        card.querySelector(kind === "best" ? ".b" : ".w").addEventListener("click", () => {
          if (st.locked) return;
          st[kind] = st[kind] === c ? null : c;
          if (st.best && st.best === st.worst) st[kind === "best" ? "worst" : "best"] = null;
          $$("#arena-root .card").forEach((k) => { k.classList.toggle("best", k.dataset.c === st.best); k.classList.toggle("worst", k.dataset.c === st.worst); k.querySelector(".b").setAttribute("aria-pressed", k.dataset.c === st.best); k.querySelector(".w").setAttribute("aria-pressed", k.dataset.c === st.worst); });
          $("#ar-next").disabled = !(st.best && st.worst);
        });
      }
    });
    $("#ar-next").addEventListener("click", () => {
      if (!st.locked) {
        st.locked = true;
        A.picks[r.b.id] = { best: st.best, worst: st.worst, shown: r.order }; A.seconds[r.b.id] = Math.round((Date.now() - st.t0) / 1000);
        $$("#arena-root .card").forEach((k) => { k.querySelector(".reveal").textContent = NAME[k.dataset.c]; k.classList.add("revealed"); });
        $("#ar-next").textContent = A.round < 2 ? "Next round" : "Finish";
      } else { A.round++; A.round < 3 ? roundView() : doneView(); }
    });
  }
  function doneView() {
    const tally = Object.fromEntries(CFG.map((c) => [c, 0]));
    for (const p of Object.values(A.picks)) { tally[p.best]++; tally[p.worst]--; }
    const payload = { v: 1, picks: A.picks, seconds: A.seconds, ua: navigator.language, at: new Date().toISOString() };
    const body = `Submitting this issue adds these picks to the human column of the benchmark.\n\n\`\`\`json\n${JSON.stringify(payload, null, 1)}\n\`\`\`\n`;
    const url = `https://github.com/${REPO}/issues/new?title=${encodeURIComponent("[human-review] 3 rounds")}&body=${encodeURIComponent(body)}`;
    $("#arena-root").innerHTML = `<div class="ar-sum">${CFG.slice().sort((a, b) => tally[b] - tally[a]).map((c) => `<div><span>${NAME[c]}</span><b>${tally[c] > 0 ? "+" : ""}${tally[c]}</b></div>`).join("")}</div>
      <p class="small">Best counts +1, worst −1. Adding them opens a prefilled GitHub issue; nothing is posted until you submit it there.</p>
      <a class="btn" href="${url}" target="_blank" rel="noopener">Add my picks</a>`;
  }

  // ---------- use
  function use() {
    const p = D.prompts.storyscope;
    $("#prompt-meta").textContent = `${p.split(/\s+/).length} words. Other versions are in the repo's prompts folder.`;
    $("#copy-prompt").addEventListener("click", (e) => copy(p + " ", e.target));
  }

  fetch("data.json").then((r) => r.json()).then(async (d) => {
    D = d; R = d.results;
    try { const live = await fetch(LIVE, { cache: "no-store" }); if (live.ok) { const lr = await live.json(); if (lr.per_genre && lr.overall && lr.overall.storyscope && "neutral_overall" in lr.overall.storyscope) R = lr; } } catch {}
    hero(); board(); compare(); arena(); use();
  });
})();
