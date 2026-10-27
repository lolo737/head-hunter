/*
 * sample-data.js: an example list so the page isn't empty on first open.
 * Every company here is FICTIONAL and every address uses the reserved
 * .example domain, so nothing real is ever emailed by accident.
 * Replace it with your own list via "Import spreadsheet".
 */
(function (root) {
  root.HH_SAMPLE = {
    title: "Animation studios (sample)",
    companies: [
      { id: "lantern-yard", name: "Lantern Yard Animation", region: "Dublin", site: "https://lanternyard.example", jobs: "jobs@lanternyard.example", gen: "hello@lanternyard.example", hiring: "2D Animator (Toon Boom Harmony), 9-month contract", note: "Wants CV plus a reel under two minutes. Role name in the subject line." },
      { id: "copper-kettle", name: "Copper Kettle Studios", region: "Kilkenny", site: "https://copperkettle.example", gen: "info@copperkettle.example", portal: "https://copperkettle.example/careers", note: "Applications through the careers page only." },
      { id: "north-quay", name: "North Quay Pictures", region: "Northern Ireland", site: "https://northquay.example", jobs: "careers@northquay.example", note: "Spec CVs welcome. Replies can take a few weeks." },
      { id: "fernhill", name: "Fernhill Motion", region: "Galway", site: "https://fernhill.example", gen: "studio@fernhill.example", hiring: "Production Coordinator, hybrid", note: "Remote-friendly; Galway office twice a week." },
      { id: "salt-and-ink", name: "Salt & Ink", region: "Cork", site: "https://saltandink.example", gen: "hello@saltandink.example", note: "Small team. Mostly commercials and title sequences." },
      { id: "brightwater", name: "Brightwater Kids", region: "Dublin", site: "https://brightwater.example", portal: "https://brightwater.example/jobs", hiring: "Storyboard Artist · Layout Artist", note: "No email published. Portal wants CV, cover letter and portfolio link." },
      { id: "harbour-lights", name: "Harbour Lights Studio", region: "Louth", site: "https://harbourlights.example", gen: "info@harbourlights.example", note: "Not hiring now, but says to send your CV if you think you'd fit." },
      { id: "quiet-hours", name: "Quiet Hours Films", region: "Dublin", site: "https://quiethours.example", gen: "contact@quiethours.example", note: "Says they don't accept unsolicited work. Watch their LinkedIn for roles instead." }
    ]
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
