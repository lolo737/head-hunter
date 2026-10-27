const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../js/core.js");
require("../js/sample-data.js");
const SAMPLE = globalThis.HH_SAMPLE;

test("traffic lights follow the status", () => {
  assert.equal(C.light("Not sent"), "grey");
  assert.equal(C.light("Skip"), "grey");
  for (const s of ["Scheduled", "Sent", "Applied earlier"]) assert.equal(C.light(s), "amber");
  for (const s of ["Replied", "Interview"]) assert.equal(C.light(s), "green");
  for (const s of ["No reply", "Rejected"]) assert.equal(C.light(s), "red");
});

test("route prefers jobs inbox, then portal, then general", () => {
  assert.equal(C.route({ jobs: "j@x.example", gen: "g@x.example", portal: "https://p" }), "jobs");
  assert.equal(C.route({ gen: "g@x.example", portal: "https://p" }), "portal");
  assert.equal(C.route({ gen: "g@x.example" }), "general");
  assert.equal(C.route({}), "none");
});

test("applyStatus stamps the date on first contact only, clears on reset", () => {
  const t1 = C.applyStatus(undefined, "Sent", new Date("2026-10-20T09:30:00Z"));
  assert.equal(t1.date, "2026-10-20T09:30:00.000Z");
  const t2 = C.applyStatus(t1, "Replied", new Date("2026-11-01T00:00:00Z"));
  assert.equal(t2.date, "2026-10-20T09:30:00.000Z", "keeps the original contact date");
  const t3 = C.applyStatus(t2, "Not sent");
  assert.equal(t3.date, null);
  assert.throws(() => C.applyStatus(t1, "Ghosted"));
});

test("matches: search, region, quick filters and lights", () => {
  const cs = SAMPLE.companies;
  const track = { "lantern-yard": { status: "Interview" }, "fernhill": { status: "Sent", note: "spoke to Aoife" } };
  const ids = f => cs.filter(c => C.matches(c, f, track)).map(c => c.id);
  assert.deepEqual(ids({ region: "Galway" }), ["fernhill"]);
  assert.deepEqual(ids({ quick: "l-green" }), ["lantern-yard"]);
  assert.deepEqual(ids({ q: "AOIFE" }), ["fernhill"], "searches your own notes, case-insensitive");
  assert.ok(ids({ quick: "hiring" }).every(id => cs.find(c => c.id === id).hiring));
  assert.ok(ids({ quick: "portal" }).includes("brightwater"));
  assert.equal(ids({}).length, cs.length);
});

test("fillTemplate fills known placeholders and leaves unknown ones visible", () => {
  assert.equal(C.fillTemplate("Hi {company}, re {role}. {name} {other}", { company: "Acme", role: "Rigger", name: "" }),
    "Hi Acme, re Rigger. {name} {other}");
});

test("mailtoLink encodes subject and body", () => {
  const link = C.mailtoLink("jobs@acme.example", "Rigger & FX", "Line 1\nLine 2");
  assert.equal(link, "mailto:jobs@acme.example?subject=Rigger%20%26%20FX&body=Line%201%0ALine%202");
});

test("CSV parser handles quotes, commas, newlines and BOM", () => {
  const rows = C.parseCSV('﻿name,note\r\n"Acme, Ltd","said ""hi""\nthen left"\r\nBeta,\r\n');
  assert.deepEqual(rows, [["name", "note"], ["Acme, Ltd", 'said "hi"\nthen left'], ["Beta", ""]]);
});

test("CSV export then import round-trips companies and statuses", () => {
  const track = { "north-quay": { status: "Rejected", date: "2026-10-01T00:00:00.000Z", note: "Nice, though: \"keep in touch\"" } };
  const csv = C.toCSV(SAMPLE.companies, track);
  const back = C.fromCSV(csv);
  assert.equal(back.companies.length, SAMPLE.companies.length);
  assert.deepEqual(back.companies.find(c => c.id === "salt-and-ink"), SAMPLE.companies.find(c => c.id === "salt-and-ink"));
  assert.deepEqual(back.track["north-quay"], track["north-quay"]);
});

test("CSV export defuses spreadsheet formulas and import restores the text", () => {
  const csv = C.toCSV([{ id: "x", name: "=HYPERLINK(\"evil\")" }], {});
  assert.match(csv, /"'=HYPERLINK/);
  assert.equal(C.fromCSV(csv).companies[0].name, '=HYPERLINK("evil")');
});

test("import from a plain spreadsheet: name required, ids generated and de-duplicated", () => {
  const { companies, track } = C.fromCSV("Name,Region,Jobs\nÉire Pixels,Cork,jobs@eire.example\nÉire Pixels,Dublin,\n,Nowhere,\n");
  assert.deepEqual(companies.map(c => c.id), ["eire-pixels", "eire-pixels-2"]);
  assert.equal(companies[0].jobs, "jobs@eire.example");
  assert.deepEqual(track, {});
  assert.throws(() => C.fromCSV("company,email\nA,b@c.example"), /name/);
  assert.throws(() => C.fromCSV(""), /empty/);
});

test("counts add up", () => {
  const n = C.counts(SAMPLE.companies, { "fernhill": { status: "Sent" } });
  assert.equal(n.grey + n.amber + n.green + n.red, SAMPLE.companies.length);
  assert.equal(n.amber, 1);
});

test("sample data is fictional: every address and site uses .example", () => {
  for (const c of SAMPLE.companies) {
    for (const k of ["jobs", "gen"]) if (c[k]) assert.match(c[k], /@[\w.-]+\.example$/, `${c.id}.${k}`);
    for (const k of ["site", "portal"]) if (c[k]) assert.match(c[k], /^https:\/\/[\w.-]+\.example(\/|$)/, `${c.id}.${k}`);
  }
});
