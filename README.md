# Farzeen Hamza, portfolio

Live: https://farzeenhamz.github.io/portfolio/

A single page scroll story through a dark, glassy digital space. A puzzle dragon
flies down the page, each chapter arrives as a puzzle shaped transition, and the
two explorations open as working product documents.

Plain HTML, CSS and vanilla JavaScript. No framework, no build step, no npm
packages, no images, no trackers. Open `index.html` in a browser and it runs. It
deploys to GitHub Pages exactly as it is.

## Files

```
index.html          the journey: opening and nine chapters
case-travel.html    exploration one: visa safe travel planner (PRD explorer)
case-hiring.html    exploration two: skills first hiring with feedback (PRD explorer)
css/styles.css      all styling, design tokens and animation
js/puzzle.js        jigsaw geometry. Every piece on the site comes from here
js/main.js          starfield, dragon, scroll progress, transitions, PRD behaviour
README.md           this file
```

Total weight is about 380 KB of HTML, CSS and JavaScript. Fonts are the only
external request (Google Fonts: Space Grotesk, Inter, JetBrains Mono). If the
fonts do not load, the system fallbacks take over and nothing breaks.

## The story, in order

| Chapter | id | What it holds |
| --- | --- | --- |
| Opening | `opening` | headline, short lede, the dragon, the scroll cue |
| 1 Education | `education` | B.Tech at Government Engineering College Kannur, MBA at NIT Calicut |
| 2 Management | `management` | studies and the research with more than 50 psychologists |
| 3 Research | `research` | student research practice |
| 4 Deloitte | `deloitte` | Jul 2021 to Oct 2023, PMO analyst work |
| 5 Toolkit | `skills` | skill tiles, interlocking |
| 6 Break | `quiet` | calm interlude, CIPP/E |
| 7 Explorations | `explore` | the two case cards |
| 8 Contact | `contact` | email, mobile, WhatsApp, location and LinkedIn |

Every chapter heading also carries a one line summary in
`<p class="chapter__note">`. It sits between the `<h2>` and the body copy, so it
is the first thing a reader takes from the chapter.

After the Deloitte chapter the page pauses on two plain blocks: `#why-product`,
which explains the move into product work, and a strip of three evidence lines
from that role. Edit both directly in `index.html`.

The dragon's body segments are real jigsaw pieces produced by
`Puzzle.piece()`. As chapters pass, the segment on screen is regenerated with a
different tab configuration, so the body changes shape while it flies.

## Edit the text

All text lives in the HTML. A search engine, a screen reader or a text browser
sees the whole story without JavaScript.

### The journey page

1. Open `index.html`.
2. Each chapter is a `<section class="chapter" id="...">` block. Reading order
   in the file is reading order on the page.
3. Headlines use `<h2 class="chapter__title">`, body copy uses `<p>` inside
   `<div class="chapter__body">`.
4. The opening headline is the only `<h1>` on the page. Keep it that way.
5. Section navigation lives in `.site-nav` and is matched to chapters in
   `js/main.js` (`navMap`). If you add or reorder a chapter, update both.

### The case pages

Each page is a set of panels, one per section, in a fixed order:

1. Overview
2. Problem and evidence
3. Personas and jobs to be done
4. Journey, current to proposed
5. Scope, in and out
6. Functional requirements
7. Non functional requirements
8. Business rules
9. User stories with acceptance criteria
10. Edge cases and exceptions
11. AI requirements and human oversight
12. Data, privacy and compliance (ends with the privacy lens box)
13. Success metrics
14. Prototype and flow (two concept wireframes)
15. Risks
16. MVP and roadmap (ends with the validation plan box)
17. Competitors
18. Evidence log
19. Open questions
20. Traceability
21. Reflection

Above the rail there is an `At a glance` box with five rows: problem, who it is
for, first slice, status and next step. It is a plain `<dl>`, outside the panel
system, so it does not need a number.

Each panel looks like this:

```html
<section class="panel" id="problem" data-panel aria-labelledby="h-problem">
  <span class="panel__edge" aria-hidden="true">...</span>
  <header class="panel__head">
    <span class="panel__num" aria-hidden="true">02</span>
    <h2 class="panel__title" id="h-problem">Problem and evidence</h2>
    <span class="tag tag--assumption">Assumption</span>
  </header>
  <div class="panel__body">
    ...
  </div>
</section>
```

To add a section, copy one panel block, give it a new `id`, keep the numbering in
step, and add a matching `<li>` to the rail at the top of `.prd-shell`.

### The tags

The tag on each section says how solid the content is:

```html
<span class="tag tag--draft">Draft</span>
<span class="tag tag--concept">Concept</span>
<span class="tag tag--assumption">Assumption</span>
<span class="tag tag--hypothesis">Hypothesis</span>
<span class="tag tag--quick-scan">Quick scan</span>
<!-- verified exists but nothing on the site uses it yet -->
```

Use `Verified` only when a claim has a source, a link and a date in the evidence
log.

### Places marked for later

Search the HTML for these and replace them:

| Find | Where | What to do |
| --- | --- | --- |
| Revision history rows | both case pages, under the title | add a row per revision and move the badges from `PRD v0.1 draft` to `v0.2` |
| `None yet` | evidence log on the hiring page | replace with rows once sources exist |
| `legal requirements to be confirmed` | hiring page, HFR8 evidence | replace with the finding once a lawyer or the official text settles it |
| Validation plan answers | both roadmaps | the plan lists the questions. When interviews happen, the answers belong in the problem panel, not in the plan |

Keep the rule the pages are built on: do not add testimonials, metrics,
percentages, awards, users, results or dates that cannot be shown. If a claim is
not sourced, tag the section `Assumption` or `Hypothesis`.

## Change the colours

Every colour is a custom property at the top of `css/styles.css`:

```css
:root {
  --obsidian: #05060A;   /* page */
  --space: #0A1020;      /* deep panels */
  --cyan: #5CE1E6;       /* primary accent, links, focus */
  --aurora: #3DDC97;     /* secondary accent, verified and quick scan */
  --amber: #FFB547;      /* assumption, warnings, placeholders */
  --ice: #EAF2FF;        /* bright text */
  --muted: #9FB0C8;      /* secondary text, meets AA on the dark ground */
  --glass-border: rgba(255, 255, 255, 0.16);
}
```

Change those and the whole site follows: the rail, the tags, the tables, the risk
tiles, the journey path and the dragon. The per chapter backgrounds are gradients
further down, in the `.world__theme[data-theme="..."]` rules. Keep `--muted`
light enough to stay readable on the darkest background, because that is what
keeps body text at WCAG AA.

## Deploy on GitHub Pages

1. Create a repository on GitHub. Any name works. If you want the site at
   `https://<user>.github.io`, name it `<user>.github.io`.
2. Upload the contents of this folder, so that `index.html` sits at the top level
   of the repository, not inside a sub folder.

   With the command line:

   ```bash
   cd portfolio
   git init
   git add .
   git commit -m "Portfolio"
   git branch -M main
   git remote add origin https://github.com/<user>/<repo>.git
   git push -u origin main
   ```

3. In the repository open Settings, then Pages.
4. Under Build and deployment, set Source to Deploy from a branch.
5. Choose branch `main` and folder `/ (root)`. Save.
6. Wait a minute. The site appears at `https://<user>.github.io/<repo>/`.
7. Every later push to `main` republishes the site automatically.

All links are relative, so the site works in a sub folder as well as at a domain
root. There is no server code and nothing to build.

## Accessibility and performance notes

* One `h1` per page, sections in order, skip link first in the tab order.
* The navigation works from the keyboard, and so do the requirement cards and
  the traceability rows.
* Decorative SVG is `aria-hidden`. The dragon, the starfield and the scenes carry
  no meaning that is missing from the text.
* `prefers-reduced-motion` stops the movement. The journey, the risk grid, the
  tables and the traceability lines jump to their final, readable state.
* Animation only touches `transform` and `opacity`. Scroll work runs inside a
  single `requestAnimationFrame` loop, writes a CSS variable only when its value
  actually changed, and updates the dragon and the starfield on alternate frames.
* The fixed world layer avoids `backdrop-filter` and `mix-blend-mode`. Both force
  the whole layer stack to re-composite on every scroll frame, which cost about
  half the frame rate on a machine without a GPU. A plain translucent gradient
  looks the same here and holds 60 frames per second.
* Chapters are 130 to 215 viewport heights, not 300, so the pinned scenes finish
  sooner and scrolling does not feel like it stalls. Edit
  `.chapter[data-chapter="n"]` in `css/styles.css` to change that.
* No images, no analytics, no third party scripts. Fonts load from Google with
  `display=swap`, so text paints immediately.

## Limitations

* The two explorations are concept work. Nothing on the case pages has been
  tested with real users, recruiters or travellers.
* The hiring evidence log is empty and the travel evidence log is a quick scan.
  Both are drafts and say so.
* Every requirement card, user story and reflection now carries written text.
  Nothing claims a result, a user count or a test outcome, because none exist.
* The two wireframe sets in Prototype and flow are drawings, labelled
  `Concept wireframe, not tested`. They show the intended flow, not a built
  prototype.
* The travel competitor table lists only the services that were checked. Eleven
  earlier rows that were marked `Lead, not yet checked` were removed rather than
  left empty.
* The validation plans are plans. No interview has been run, so the site shows
  the questions and says plainly that there are no findings yet.
* The contact chapter now carries a mobile number, a WhatsApp number and a
  country, because the owner asked for them. Publishing the site publishes those
  details.
