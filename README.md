# 🎯 Head Hunter
### *A job-hunt tracker for any industry*

> *The hardest part of looking for work is not doing the job. It is most certainly not turning up for the job, nor wanting the job. The hardest part is **finding** the job: the right studio, the right inbox, the one door in forty that is actually open.*
>
> *Head Hunter was built to find the doors.*

![Head Hunter: a tracker of companies with traffic-light statuses, hiring badges, the best email for each, and notes](docs/screenshot copy.png)
---

## 🎬 Why it exists

It began with animation. Ireland has dozens of studios, from Kilkenny to Belfast, and every one of them hides its hiring route somewhere different. One has a `jobs@` inbox. One has a portal on BambooHR. One has a Google Form, one has only a director's first name, and one says, in small print, *please don't send us your CV at all.*

Finding work, it turned out, was a research project before it was ever an application. So the research became a tool: every studio on one sheet, the **best way in** for each, and a coloured light beside every name, so you know at a glance who you've written to, who answered, and who went quiet.

Then came the realisation that nothing about it was really about animation. Bakeries, robotics firms, architects, theatres, hospitals, games studios: **give it a spreadsheet of any industry and it becomes that industry's tracker.**

## ✨ What it does

- **Import a spreadsheet.** Excel (`.xlsx`) or CSV, from any industry. Only a `name` column is required.
- **Finds the best way in.** Each company is sorted into *Jobs inbox*, *Portal or form*, *General inbox* or *No email*, and the right address is put up front.
- **Traffic lights for every application:**
  - ⚪ **Grey**: not contacted yet
  - 🟠 **Amber**: sent, scheduled or applied earlier
  - 🟢 **Green**: replied or interview
  - 🔴 **Red**: no reply or rejected
- **Click any light or badge to filter.** *Hiring now*, *Jobs inbox*, *Portal or form*, or any colour.
- **Dates itself.** The first time you mark a company as contacted, it stamps the date.
- **Notes per company**, searched along with everything else.
- **One letter, many companies.** Write your cover letter once with `{company}`, `{role}` and `{name}` placeholders. **Draft email** fills them in and opens your own mail app, ready for your CV.
- **Copy emails in view**, for when you want the whole filtered list at once.
- **Export to CSV** at any time, with your statuses, dates and notes, so nothing is ever trapped in a browser.

## 🔒 Private by design

Head Hunter has **no server, no account, no tracking and no third-party requests**. Your list lives in your own browser's storage. Email drafts open in your own mail app, so nothing is sent on your behalf. The fonts and the Excel reader are bundled in the repo, so the page works fully offline.

CSV exports are defused against spreadsheet formula tricks: a cell starting with `=`, `+`, `-` or `@` is escaped on the way out and restored on the way back in.

## 🚀 Use it

**Online:** host the folder anywhere static (GitHub Pages, Netlify), or just:

```bash
git clone https://github.com/lolo737/head-hunter.git
cd head-hunter
npm start        # serves on http://localhost:8080
```

No Node or Python to hand? Just double-click `index.html`. It runs straight from the file.

Then:
1. Press **Download blank template**, or use any sheet you already have.
2. Fill in one company per row. Columns:

| Column | What goes in it |
|---|---|
| `name` | Company name. **Required.** |
| `region` | Town, county or country, used for the region filter |
| `site` | Their website |
| `jobs` | A jobs or HR inbox, the best route in |
| `gen` | Their general inbox |
| `portal` | Link to a careers page, portal or form |
| `hiring` | Roles open right now, e.g. `Storyboard Artist · Layout Artist` |
| `note` | Anything worth remembering about how they hire |

3. **Import spreadsheet**, and start working down the lights.

The sample list it opens with is entirely **fictional**: made-up studios on the reserved `.example` domain, so nobody real is ever emailed by accident.

## 🧪 Tests

```bash
npm test
```

Twelve tests cover the traffic lights, route ranking, date stamping, filtering and search, letter placeholders, `mailto:` encoding, the CSV parser (quotes, commas, line breaks, byte-order marks), a full export-and-import round trip, formula defusing, importing a bare spreadsheet with duplicate names, and a guard that the sample data stays fictional. No dependencies: just Node's built-in test runner.

## 🗂️ Layout

```
head-hunter/
├── index.html            the page
├── css/app.css           lightbox-sheet design, light and dark
├── js/core.js            pure logic: statuses, filters, CSV, mailto (tested)
├── js/app.js             wires the page to core.js and browser storage
├── js/sample-data.js     the fictional starter list
├── fonts/                self-hosted fonts (SIL Open Font License)
├── vendor/               SheetJS Excel reader (Apache-2.0)
├── docs/screenshot.png
└── test/core.test.js
```

## 🗺️ Roadmap

- Several lists side by side (one per industry or job search)
- Follow-up reminders: *"no reply in 14 days, nudge them?"*
- A job watch that checks careers pages for new postings

## 🙏 Credits

Excel import by [SheetJS](https://sheetjs.com) (Apache-2.0). Fonts: Big Shoulders Display, Instrument Sans and JetBrains Mono, all under the SIL Open Font License.

## 📜 Licence

MIT. See [LICENSE](LICENSE). Built in Skerries by Niall O'Hara, for everyone whose hardest job is finding one.
