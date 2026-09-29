# Handoff: Saecora marketing site (Home, Privacy, Terms)

## Overview
Three-page marketing site for **Saecora: Masters Training**, an iPhone training app for masters athletes (40+). The home page's goal is TestFlight beta signups. Domain: saecora.com. Legal entity: Paolo Narciso, LLC. Contact: pnarciso@icloud.com.

## About the design files
The `.dc.html` files are **design references built in HTML**. They show the intended look and behavior; they are not production code. Recreate them in the target stack. If no codebase exists yet, a static site works well: Astro, Next.js static export, or plain HTML/CSS. The pages open in a browser directly, with `support.js` alongside. All styles are inline on the elements, so read exact values there.

## Fidelity
**High-fidelity.** Final colors, type, spacing, copy and interactions. Match them exactly.

## Design tokens
**Colors**
- `#0a0a0a`: page background
- `#0f0e0d`: alternate section background ("How the beta works")
- `#131211`: panels and cards
- `#bd9d6c`: gold accent (buttons, kickers, bars, ring)
- `#d1b284`: button hover; `#a6865a`: button pressed
- `#f3ece0`: primary text (cream)
- `#d9d0c1`, `#cfc6b6`, `#c9bfae`, `#b3a998`: body text, in steps
- `#a39a8c`: muted labels; `#8a8275`: tertiary text and footer
- `#c9a978`: link; link hover `#e2c89c`
- `#2a2622`: neutral segment; `#3a342d`: B-race tag
- `#e29a7a`: form error text
- Rules and borders: `rgba(189,157,108,.18)`. Stronger borders use `.24`–`.35`. Inactive fills use `.14`–`.32`.

**Type** (Google Fonts)
- Display: **Newsreader** 400 (opsz 6..72). Used for h1/h2/h3, big numbers and the "Today" title.
- UI and body: **Jost** 400/500.
- h1: `clamp(52px,7vw,92px)`, line-height .98, letter-spacing -.02em.
- h2: `clamp(38px,4.5vw,58px)`, line-height 1.04, letter-spacing -.015em.
- h3 (feature titles): 32px / 1.1. Legal h1: `clamp(44px,6vw,68px)`. Legal h2: 30px.
- Kickers: 11–12px, uppercase, letter-spacing .24–.28em, weight 500, gold.
- Body: 16–18px, line-height 1.55–1.65. Hero lede: `clamp(18px,1.6vw,21px)`.
- Buttons: 13px uppercase, letter-spacing .26em, weight 500.
- Nav wordmark "SAECORA": 15px, letter-spacing .42em, weight 500.

**Radii**: pill buttons and chips 999px; hero panel 28px; cards and panels 18px; inputs 12px; segments and link field 10px; meal bars 8px; tags 6px; icon 8px (32px size) or 6px (24px size).

**Layout**: max content width 1240px (legal pages 760px). Horizontal padding `clamp(20px,5vw,64px)`. Section vertical padding `clamp(56px,8vw,112px)`. 1px gold-alpha rules separate every section. No shadows.

## Screens

### 1. Home (`Home.dc.html`)
1. **Header.** Icon (32px) plus "SAECORA" on the left. On the right, a gold pill "JOIN THE BETA" that anchors to `#join`. Bottom rule.
2. **Hero.** Two-column grid, `auto-fit minmax(420px,1fr)`, which stacks on mobile.
   - Left column (`id="join"`):
     - Kicker "TESTFLIGHT BETA · iPHONE" with a 28px gold dash before it.
     - h1 "Still in the fight."
     - Lede paragraph.
     - **Signup form panel**: an email input (52px tall), primary-sport chips (HYROX, Running, Triathlon, Strength, Other; single select), an optional error line, the "REQUEST ACCESS" submit button (54px pill), and a privacy note with a link.
   - Right column: the **"Today" panel**, max 420px wide:
     - Readiness ring: 128px conic-gradient at 82%, with a 108px inner disc showing "82".
     - Four label/value rows: Band READY, Easy HR 118–136, Protein 140 g, Next Session HYROX.
3. **Who it's for.** Kicker, h2 "Athletes over 40 who still race." and an intro paragraph. Below that, a **feature grid** (`auto-fit minmax(460px,1fr)`, gap 56px rows). Each cell has a top rule, then kicker, h3, description, and a visual panel:
   - READINESS, "Calibrated by research.": score 82/100 and three band bars (Recover 0–49, Steady 50–74, Ready 75–100). Ready is highlighted.
   - LOGGING, "Log the day as it happened.": a brick session drawn as flex segments sized by minutes (Run 25 gold, Strength 40 neutral, Run 28 gold), then "How it felt 7/10".
   - PLANNING, "One peak. Two races.": 15 weekly-load bars, 120px tall. Heights are `[40,46,52,44,56,62,50,30,58,66,74,80,64,42,24]`%. Bars 8 and 15 are solid gold (race weeks); the rest are gold at .32 alpha. Below them sit a B-RACE tag with Chicago Half (November) and an A-RACE tag with HYROX DC (December).
   - FUEL, "Fuel, don't shrink.": Calories 2400 and Protein 140 g, then four 35 g meal bars (Breakfast, Lunch, Post-session, Dinner).
   - COACH, "Your coach sees the context.": a link field `saecora.com/coach/p-52…` marked READ-ONLY, readiness 78, three session rows (Tue Tempo Run 60 min, Thu Strength 50 min, Sat Long Run 90 min), and "Next block: Build Endurance · 3 weeks".
   - The band cut-offs and load bars are illustrative. Confirm the real values with the app.
4. **How the beta works.** Background `#0f0e0d`. Three step cards (01 Request access, 02 Install with TestFlight, 03 Train and tell us), then a "REQUEST ACCESS →" pill that anchors to `#join`.
5. **Footer.** "© 2026 Paolo Narciso, LLC" and links: Home, Privacy, Terms, Contact (mailto).

### 2. Privacy (`Privacy.dc.html`) and 3. Terms (`Terms.dc.html`)
Same header and footer as Home. A single 760px column containing: a LEGAL kicker, the h1, the effective date (September 28, 2026), and numbered sections separated by rules. Privacy also has a "short version" callout panel. Copy the text verbatim from the files. It is a **draft; have a lawyer review it before launch**.

## Interactions and state
- State: `email`, `sport`, `submitted`, `error`.
- Validation on submit:
  - Email must match `^[^\s@]+@[^\s@]+\.[^\s@]+$`. Otherwise show "Enter a valid email."
  - A sport must be picked. Otherwise show "Pick your primary sport."
  - Typing or picking a chip clears the error.
- Chips: when selected, gold fill with `#0a0a0a` text. When not, transparent with a `rgba(189,157,108,.28)` border.
- On success, replace the form with a **confirmation panel**:
  - "YOU'RE IN · {SPORT}", "Install Saecora on your iPhone." and the registered email.
  - Three numbered install steps. Step 1 links TestFlight: `https://apps.apple.com/app/testflight/id899247664`.
  - A pill "OPEN TESTFLIGHT INVITE →" linking to the public TestFlight URL (**placeholder `https://testflight.apple.com/join/XXXXXXXX`; replace it**).
  - A "Use a different email" link that resets the form.
- The prototype saves to `localStorage['saecora-beta']` only. **In production, POST `{email, sport}` to a real backend or list** (not chosen yet), then show the confirmation.
- Hover: gold buttons go to `#d1b284`; pressed state `#a6865a`. Focus: 2px `#bd9d6c` outline, 2px offset.
- Responsive: every grid uses `auto-fit`/`minmax` and collapses to one column. The header stays one row.

## Assets
- `assets/icon.png`: app icon (1920², black rounded square with gold S). Used in the header and footer.
- `assets/lockup.png`: S mark plus SAECORA lockup on black. Not used on the pages; included for favicon or OG image use.
- Fonts: Newsreader and Jost from Google Fonts.

## Files
- `Home.dc.html`, `Privacy.dc.html`, `Terms.dc.html`: design references.
- `support.js`: runtime needed only to open the references in a browser. Do not port it.
