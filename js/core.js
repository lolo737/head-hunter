/*
 * core.js: the pure logic behind Head Hunter.
 * No DOM, no storage, no network. Loaded as a plain <script> in the browser
 * (exposes window.HHCore) and with require() in the Node tests.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.HHCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const STATUSES = ["Not sent", "Scheduled", "Applied earlier", "Sent", "Replied", "Interview", "No reply", "Rejected", "Skip"];
  // Statuses that mean "you've made contact", so the first time one is set we stamp the date.
  const DONE = new Set(["Sent", "Applied earlier", "Replied", "Interview", "No reply", "Rejected"]);
  const ROUTE_LABEL = { jobs: "Jobs inbox", portal: "Portal or form", general: "General inbox", none: "No email" };

  /** Traffic light for a status: grey = not yet, amber = in flight, green = good news, red = closed. */
  function light(status) {
    if (status === "Replied" || status === "Interview") return "green";
    if (status === "Scheduled" || status === "Sent" || status === "Applied earlier") return "amber";
    if (status === "No reply" || status === "Rejected") return "red";
    return "grey";
  }

  /** The best way in: a jobs inbox beats a portal beats a general inbox. */
  function route(c) {
    if (c.jobs) return "jobs";
    if (c.portal) return "portal";
    if (c.gen) return "general";
    return "none";
  }

  function primaryEmail(c) {
    return c.jobs || c.gen || "";
  }

  /** Apply a status change, stamping the date on first contact and clearing it on reset. */
  function applyStatus(prev, status, now) {
    if (!STATUSES.includes(status)) throw new Error("Unknown status: " + status);
    const next = { ...(prev || {}), status };
    if (DONE.has(status) && !next.date) next.date = (now || new Date()).toISOString();
    if (status === "Not sent") next.date = null;
    return next;
  }

  /** Filter companies by search text, region, quick filter (hiring/jobs/portal) or light (l-green etc). */
  function matches(c, filter, track) {
    const f = filter || {};
    const st = (track && track[c.id] && track[c.id].status) || "Not sent";
    if (f.region && c.region !== f.region) return false;
    if (f.quick === "hiring" && !c.hiring) return false;
    if (f.quick === "jobs" && route(c) !== "jobs") return false;
    if (f.quick === "portal" && route(c) !== "portal") return false;
    if (f.quick && f.quick.startsWith("l-") && light(st) !== f.quick.slice(2)) return false;
    if (f.q) {
      const hay = [c.name, c.region, c.jobs, c.gen, c.note, c.hiring, (track && track[c.id] && track[c.id].note) || ""]
        .join(" ").toLowerCase();
      if (!hay.includes(f.q.toLowerCase())) return false;
    }
    return true;
  }

  /** Fill {company}, {role}, {name} placeholders in the letter template. */
  function fillTemplate(tpl, vars) {
    return String(tpl || "").replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null && vars[k] !== "" ? String(vars[k]) : m));
  }

  /** A mailto: link that opens the person's own mail app with the letter prefilled. */
  function mailtoLink(to, subject, body) {
    const q = [];
    if (subject) q.push("subject=" + encodeURIComponent(subject));
    if (body) q.push("body=" + encodeURIComponent(body));
    return "mailto:" + encodeURIComponent(to).replace(/%40/g, "@") + (q.length ? "?" + q.join("&") : "");
  }

  // ---------- CSV ----------

  const CSV_COLUMNS = ["id", "name", "region", "site", "jobs", "gen", "portal", "hiring", "note", "status", "date", "mynote"];

  function csvCell(v) {
    const s = v == null ? "" : String(v);
    // Quote when needed, and neutralise spreadsheet formula injection (=, +, -, @ at the start).
    const safe = /^[=+\-@]/.test(s) ? "'" + s : s;
    return /[",\n\r]/.test(safe) || safe !== s ? '"' + safe.replace(/"/g, '""') + '"' : safe;
  }

  function toCSV(companies, track) {
    const rows = [CSV_COLUMNS.join(",")];
    for (const c of companies) {
      const t = (track && track[c.id]) || {};
      rows.push(CSV_COLUMNS.map(k => csvCell(
        k === "status" ? (t.status || "Not sent") : k === "date" ? t.date : k === "mynote" ? t.note : c[k]
      )).join(","));
    }
    return rows.join("\r\n") + "\r\n";
  }

  /** RFC 4180-style parser: quoted fields, doubled quotes, commas and newlines inside quotes. */
  function parseCSV(text) {
    const rows = [];
    let row = [], cell = "", i = 0, q = false;
    const s = String(text || "").replace(/^﻿/, "");
    while (i < s.length) {
      const ch = s[i];
      if (q) {
        if (ch === '"') {
          if (s[i + 1] === '"') { cell += '"'; i += 2; continue; }
          q = false; i++; continue;
        }
        cell += ch; i++; continue;
      }
      if (ch === '"') { q = true; i++; continue; }
      if (ch === ",") { row.push(cell); cell = ""; i++; continue; }
      if (ch === "\r" || ch === "\n") {
        row.push(cell); rows.push(row); row = []; cell = "";
        if (ch === "\r" && s[i + 1] === "\n") i++;
        i++; continue;
      }
      cell += ch; i++;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.some(v => v !== ""));
  }

  const unFormula = v => (/^'[=+\-@]/.test(v) ? v.slice(1) : v);

  function slug(s) {
    return String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "company";
  }

  /** Turn CSV text back into { companies, track }. Needs at least a "name" column. */
  function fromCSV(text) {
    const rows = parseCSV(text);
    if (!rows.length) throw new Error("The file is empty.");
    const head = rows[0].map(h => h.trim().toLowerCase());
    if (!head.includes("name")) throw new Error('The first row needs a "name" column.');
    const companies = [], track = {}, seen = new Set();
    for (const r of rows.slice(1)) {
      const o = {};
      head.forEach((h, idx) => { o[h] = unFormula((r[idx] || "").trim()); });
      if (!o.name) continue;
      let id = slug(o.id || o.name), n = 2;
      while (seen.has(id)) id = slug(o.id || o.name) + "-" + n++;
      seen.add(id);
      const c = { id, name: o.name };
      for (const k of ["region", "site", "jobs", "gen", "portal", "hiring", "note"]) if (o[k]) c[k] = o[k];
      companies.push(c);
      const status = STATUSES.includes(o.status) ? o.status : "Not sent";
      if (status !== "Not sent" || o.mynote) track[id] = { status, date: o.date || null, note: o.mynote || "" };
    }
    return { companies, track };
  }

  function counts(companies, track) {
    const out = { hiring: 0, jobs: 0, portal: 0, grey: 0, amber: 0, green: 0, red: 0 };
    for (const c of companies) {
      if (c.hiring) out.hiring++;
      const r = route(c);
      if (r === "jobs") out.jobs++;
      if (r === "portal") out.portal++;
      out[light((track[c.id] && track[c.id].status) || "Not sent")]++;
    }
    return out;
  }

  return { STATUSES, DONE, ROUTE_LABEL, light, route, primaryEmail, applyStatus, matches, fillTemplate, mailtoLink, toCSV, parseCSV, fromCSV, slug, counts, CSV_COLUMNS };
});
