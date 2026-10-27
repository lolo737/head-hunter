/* app.js: wires the page to HHCore. All state lives in this browser's localStorage. */
(function () {
  "use strict";
  const C = window.HHCore;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = u => (/^https?:\/\//i.test(u || "") ? u : "");
  const KEY = "headhunter.v1";
  const XLSX_URL = "vendor/xlsx.full.min.js"; // SheetJS 0.18.5, Apache-2.0, bundled so import works offline

  const DEFAULT_LETTER = {
    subject: "Application: {role} at {company}",
    body: "Hi {company} team,\n\nI'd love to be considered for {role}. My CV is attached, and my portfolio is at [your link].\n\n[Two or three lines on why you and why them.]\n\nThanks for your time,\n{name}",
    name: ""
  };

  // ---------- storage ----------
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && Array.isArray(s.companies)) return { letter: { ...DEFAULT_LETTER }, track: {}, ...s };
      }
    } catch (e) { /* private mode or corrupt data: fall back to the sample */ }
    return { title: window.HH_SAMPLE.title, companies: window.HH_SAMPLE.companies.slice(), track: {}, letter: { ...DEFAULT_LETTER } };
  }
  let state = load();
  let saveWarned = false;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) {
      if (!saveWarned) { $("sync").textContent = "This browser won't let the page save. Export a CSV before you close the tab."; saveWarned = true; }
    }
  }

  // ---------- UI helpers ----------
  function toast(t) { const el = $("toast"); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (el.hidden = true), 2200); }
  function copy(text, label) {
    const done = () => toast(label || "Copied");
    const fallback = () => {
      const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); done(); } catch (e) { toast("Select the text and copy it"); }
      ta.remove();
    };
    try { navigator.clipboard.writeText(text).then(done, fallback); } catch (e) { fallback(); }
  }
  function download(name, text, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: type || "text/csv;charset=utf-8" }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  const F = { q: "", region: "", quick: "" };
  const statusOf = id => (state.track[id] && state.track[id].status) || "Not sent";

  function rowHTML(c) {
    const r = C.route(c), t = state.track[c.id] || {}, status = statusOf(c.id), p = C.primaryEmail(c);
    const chips = [`<span class="chip">${C.ROUTE_LABEL[r]}</span>`];
    if (c.hiring) chips.unshift(`<span class="chip hiring">Hiring now</span>`);
    const contact = p ? `<div class="contact"><span class="lbl">${c.jobs ? "Jobs / HR email" : "Email to use"}</span><span class="addr">${esc(p)}</span><button class="mini" data-copy="${esc(p)}">Copy</button><button class="mini" data-draft="${esc(c.id)}">Draft email</button></div>` : "";
    const portal = safeUrl(c.portal) ? `<div class="contact"><span class="lbl">${p ? "Also" : "Apply here"}</span><a href="${esc(c.portal)}" target="_blank" rel="noopener">Careers page ↗</a></div>` : "";
    const extra = c.jobs && c.gen ? `<div class="contact"><span class="lbl">General inbox</span><span class="addr">${esc(c.gen)}</span><button class="mini" data-copy="${esc(c.gen)}">Copy</button></div>` : "";
    const meta = [];
    if (safeUrl(c.site)) meta.push(`<a href="${esc(c.site)}" target="_blank" rel="noopener">${esc(c.site.replace(/^https?:\/\/(www\.)?/, ""))} ↗</a>`);
    meta.push(`<a href="https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(c.name)}" target="_blank" rel="noopener">Find on LinkedIn ↗</a>`);
    const when = t.date ? `Since ${new Date(t.date).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" })}` : "";
    return `<article class="row${status === "Skip" || status === "Rejected" ? " done" : ""}" data-light="${C.light(status)}">
      <div class="main">
        <div class="head"><span class="dot" title="${esc(status)}"></span><span class="name">${esc(c.name)}</span>${c.region ? `<span class="region">${esc(c.region)}</span>` : ""}<div class="chips">${chips.join("")}</div></div>
        ${c.hiring ? `<div class="hiring-line">${esc(c.hiring)}</div>` : ""}
        ${contact}${portal}${extra}
        ${c.note ? `<p class="note">${esc(c.note)}</p>` : ""}
        <div class="meta">${meta.join("")}</div>
      </div>
      <div class="side">
        <label for="st-${esc(c.id)}" hidden>Status for ${esc(c.name)}</label>
        <select id="st-${esc(c.id)}" data-status="${esc(c.id)}">${C.STATUSES.map(o => `<option${o === status ? " selected" : ""}>${o}</option>`).join("")}</select>
        <span class="when">${when}</span>
        <label for="nt-${esc(c.id)}" hidden>Notes for ${esc(c.name)}</label>
        <textarea id="nt-${esc(c.id)}" data-note="${esc(c.id)}" placeholder="Your notes">${esc(t.note || "")}</textarea>
      </div>
    </article>`;
  }

  function render() {
    const active = document.activeElement && document.activeElement.id;
    const vis = state.companies.filter(c => C.matches(c, F, state.track));
    $("list").innerHTML = vis.length ? vis.map(rowHTML).join("") : `<div class="empty">${state.companies.length ? "Nothing matches. Clear the search or pick another filter." : "Your list is empty. Import a spreadsheet to begin."}</div>`;
    $("count").textContent = `${vis.length} of ${state.companies.length}`;
    const n = C.counts(state.companies, state.track);
    for (const k of ["hiring", "jobs", "portal"]) $("s-" + k).textContent = n[k];
    for (const k of ["grey", "amber", "green", "red"]) $("l-" + k).textContent = n[k];
    document.querySelectorAll(".stat").forEach(b => b.setAttribute("aria-pressed", String(F.quick === b.dataset.f)));
    document.querySelectorAll(".light").forEach(b => b.setAttribute("aria-pressed", String(F.quick === "l-" + b.dataset.l)));
    $("dataset").textContent = state.title ? `List: ${state.title}` : "";
    if (active) { const el = $(active); if (el && el !== document.activeElement) el.focus(); }
  }

  function fillRegions() {
    const sel = $("region"), keep = sel.value;
    sel.innerHTML = `<option value="">All regions</option>`;
    [...new Set(state.companies.map(c => c.region).filter(Boolean))].sort().forEach(r => {
      const o = document.createElement("option"); o.value = r; o.textContent = r; sel.appendChild(o);
    });
    sel.value = [...sel.options].some(o => o.value === keep) ? keep : "";
    F.region = sel.value;
  }

  // ---------- import / export ----------
  function loadScript(src) {
    return new Promise((ok, fail) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => fail(new Error("Couldn't load the Excel reader. Save the sheet as CSV and import that instead.")); document.head.appendChild(s); });
  }
  async function readFile(file) {
    if (/\.xlsx?$/i.test(file.name)) {
      if (!window.XLSX) await loadScript(XLSX_URL);
      const wb = window.XLSX.read(await file.arrayBuffer(), { type: "array" });
      return window.XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
    }
    return file.text();
  }
  $("importFile").addEventListener("change", async e => {
    const file = e.target.files[0]; e.target.value = "";
    if (!file) return;
    try {
      const { companies, track } = C.fromCSV(await readFile(file));
      if (!companies.length) throw new Error("No rows with a name found.");
      if (state.companies.length && !confirm(`Replace your current list (${state.companies.length} companies) with ${companies.length} from ${file.name}? Export a CSV first if you want a backup.`)) return;
      state = { ...state, title: file.name.replace(/\.(csv|xlsx?)$/i, ""), companies, track };
      save(); fillRegions(); render(); toast(`Imported ${companies.length} companies`);
    } catch (err) { toast(err.message || "Couldn't read that file"); }
  });
  $("exportCsv").addEventListener("click", () => {
    const stamp = new Date().toISOString().slice(0, 10);
    download(`head-hunter-${stamp}.csv`, C.toCSV(state.companies, state.track));
  });
  $("templateCsv").addEventListener("click", () => {
    download("head-hunter-template.csv", "name,region,site,jobs,gen,portal,hiring,note\r\nExample Ltd,Dublin,https://example.com,jobs@example.com,hello@example.com,,Junior Designer,Wants a portfolio link\r\n");
  });
  $("resetSample").addEventListener("click", () => {
    if (!confirm("Swap your list for the sample studios? Your statuses for the current list will be cleared. Export a CSV first if you want to keep them.")) return;
    state = { ...state, title: window.HH_SAMPLE.title, companies: window.HH_SAMPLE.companies.slice(), track: {} };
    save(); fillRegions(); render();
  });

  // ---------- letter ----------
  const L = state.letter;
  $("subject").value = L.subject; $("letter").value = L.body; $("myName").value = L.name || "";
  for (const [id, k] of [["subject", "subject"], ["letter", "body"], ["myName", "name"]]) {
    $(id).addEventListener("input", e => { state.letter[k] = e.target.value; save(); });
  }

  // ---------- events ----------
  document.addEventListener("click", e => {
    const cp = e.target.closest("[data-copy]"); if (cp) { copy(cp.dataset.copy, "Copied " + cp.dataset.copy); return; }
    const dr = e.target.closest("[data-draft]");
    if (dr) {
      const c = state.companies.find(x => x.id === dr.dataset.draft); if (!c) return;
      const vars = { company: c.name, role: (c.hiring || "").split(/[·,]/)[0].trim() || "a role on your team", name: state.letter.name };
      location.href = C.mailtoLink(C.primaryEmail(c), C.fillTemplate(state.letter.subject, vars), C.fillTemplate(state.letter.body, vars));
      return;
    }
    const st = e.target.closest(".stat"); if (st) { F.quick = F.quick === st.dataset.f ? "" : st.dataset.f; render(); return; }
    const lb = e.target.closest(".light"); if (lb) { const k = "l-" + lb.dataset.l; F.quick = F.quick === k ? "" : k; render(); }
  });
  document.addEventListener("change", e => {
    const id = e.target.dataset && e.target.dataset.status; if (!id) return;
    state.track[id] = C.applyStatus(state.track[id], e.target.value);
    save(); render();
    toast(`${state.companies.find(c => c.id === id).name}: ${e.target.value}`);
  });
  document.addEventListener("focusout", e => {
    const id = e.target.dataset && e.target.dataset.note; if (!id) return;
    const v = e.target.value.trim(); if (((state.track[id] || {}).note || "") === v) return;
    state.track[id] = { status: "Not sent", ...(state.track[id] || {}), note: v }; save();
  });
  $("q").addEventListener("input", e => { F.q = e.target.value.trim(); render(); });
  $("region").addEventListener("change", e => { F.region = e.target.value; render(); });
  $("copyAll").addEventListener("click", () => {
    const list = state.companies.filter(c => C.matches(c, F, state.track)).map(C.primaryEmail).filter(Boolean);
    if (!list.length) { toast("No emails in this view"); return; }
    copy(list.join(", "), `Copied ${list.length} emails`);
  });

  fillRegions();
  render();
})();
