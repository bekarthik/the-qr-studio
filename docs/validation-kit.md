# QR Studio — UX & Feel Validation Kit

A reusable kit for evaluating QR Studio each release. Hold two lenses apart:

- **Feel** = craft (motion, latency, polish, consistency, intentionality).
- **UX** = task success (can a first-timer actually finish the job).

Validate both with evidence, not opinion. **§A and §F** can be assessed directly
(an AI or a reviewer can do them). **§B, §C, §D, §E, §H** require real users on real
devices — an AI can write the scripts but cannot feel latency, judge emotion, or
stand in for a user.

**Context for this kit:** target users = SMB/marketer, general consumer, developer,
designer. Surfaces = desktop + mobile (equal weight). Instrumentation = privacy-first
/ client-side (no third-party analytics) → use the local-instrumentation approach in §C.

> **How to re-run:** repeat §A + §F directly each release; run §B/§C/§E with 5–8 users
> on the deployed URL; capture §D on a throttled mid-tier phone; record §G; keep §H
> going continuously. Update the status column in §0.

---

## 0. Prioritized issue tracker

Severity: **0** none · **1** cosmetic · **2** minor · **3** major · **4** catastrophe.
Update **Status** each release.

| # | Sev | Lens | Issue | Fix | Status |
|---|-----|------|-------|-----|--------|
| 1 | 4 | UX | Card output had no scannability badge; "exact design" could ship an unscannable card silently | jsQR-decode the card's embedded QR; show ✓/⚠ badge in card mode | ✅ fixed |
| 2 | 3 | UX | No persistence — refresh lost all work | Persist `Config` to localStorage (debounced) + restore; confirmed Reset | ✅ fixed |
| 3 | 3 | UX | Delete custom preset was unconfirmed/unrecoverable | Confirm before delete | ✅ fixed |
| 4 | 3 | Feel/UX | Output switch (right) silently injects card-design section (left) | Brief highlight cue on the section when it appears | ✅ fixed (consider also an `aria-live` announce) |
| 5 | 2 | Feel | Contrast misses AA: white-on-accent 3.66, helper 4.43, links 4.47 | Darken `--ink-soft`/`--accent-2`; active pills → accent-2 + on-accent | ✅ fixed (5.86 / 5.13 / 5.25) |
| 6 | 2 | UX | Mobile has no quick-nav (jump-pills desktop-only) | Scrollable jump-pills docked inside the pinned output card on mobile | ✅ fixed (scroll-spy highlight lags slightly on mobile — cosmetic) |
| 7 | 2 | UX | Two-level source picker teaches a model; no search | In-dropdown search across ALL types (punctuation-insensitive: "wifi"→Wi-Fi); auto-open already shipped | ✅ fixed |
| 8 | 2 | UX | No shareable/permalink state | Encode config (minus images) in URL hash; "🔗 Share" copies it | ✅ fixed |
| 9 | 1 | Feel | No progress feedback / cost for heavy ops (large-image halftone) | Downscale uploads to ≤1400px (real perf/memory fix) + "Processing…" spinner | ✅ fixed |
| 10 | 1 | Feel | Theme icons tooltip-only; Graphite mark ambiguous | Visible labels / clearer icons | ⬜ open |
| — | 1 | Feel | Google Fonts were render-blocking external requests (FOIT/offline risk) | Fonts now load non-blocking (swap + system fallback); service worker precaches the shell for offline | ✅ fixed (self-hosting fonts still optional) |

---

## A. Expert heuristic review (assessed directly)

Walk each surface against Nielsen's 10 heuristics. Surfaces: **Nav/Hero**,
**Workspace-Controls**, **Output (QR)**, **Output (Card)**, **Source picker**,
**Image roles**, **Theme**. Per finding: location · heuristic · severity · why ·
fix. (See §0 for the current top items; below is the full re-runnable checklist.)

For each heuristic, confirm:

1. **Visibility of system status** — every action gives immediate feedback; the
   user can always tell what state they're in (which source, which output mode,
   verifying vs verified, saved vs unsaved). *Re-check: card badge present in
   card mode; "checking…" affordance on slow devices.*
2. **Match with the real world** — labels match user language (search "what do
   you want to share?" beats "Network → Wi-Fi"); jargon (finder eyes, halftone)
   has tooltips.
3. **User control & freedom** — destructive actions confirmed or undoable
   (delete preset, import design, reset); a global reset exists; no dead-ends.
4. **Consistency & standards** — one segmented primitive, one tab primitive,
   one "selected" token; primary-action color rule documented.
5. **Error prevention** — exact-design card can't silently break; inputs hint
   format (UPI VPA, phone); "two files" surprise is labelled.
6. **Recognition over recall** — recent/popular source shortcuts; theme labels;
   no need to remember which ribbon tab holds which control.
7. **Flexibility & efficiency** — keyboard shortcuts; permalink; presets.
8. **Aesthetic & minimalist** — long controls column has collapsible advanced
   groups; no over-stacking on 360px.
9. **Recognize/recover from errors** — fail badges give *actionable* guidance
   ("lower detail / raise contrast"); "too much data" says which field.
10. **Help & documentation** — optional first-run coachmark; in-app help.

**Scoring guide:** any Sev-4 blocks release; Sev-3s are the iteration backlog;
Sev-1/2 are polish. Record counts per release to track drift.

---

## B. Usability test plan (run with 5–8 real users)

**Setup:** deployed URL; each tester on **their own phone + a desktop**
(counterbalance order). Record screen+audio with consent. Think-aloud; observe
silently. Don't help unless stuck >90s; mark "assisted." Read prompts verbatim.

**Pre-task (2 min):** "What do you use QR codes for? Made one before?"

| # | JTBD | Prompt (read aloud) | Success criterion | Watch for |
|---|------|---------------------|-------------------|-----------|
| T1 | Basic link (consumer) | "Make a QR code that opens *example.com*, and save it as an image." | Downloads PNG/SVG encoding the URL, unaided | Finding the source picker; trusting it's done; noticing "Verified" |
| T2 | Branded code (SMB/designer) | "Make it on-brand — colour `#1E6F5C`, rounded dots." | Applies colour + module shape; still Verified | Finding Style; eye-shape confusion |
| T3 | Image-styled (designer/dev) | "Make the code show this logo *[PNG]* faintly behind it." | Uploads, assigns watermark role, result scans | Understanding the role matrix |
| T4 | Visiting card (SMB) | "Turn your details into a printable business card with the QR on it." | Switches to Card, fills vCard, downloads | **Discovering the Card switch**; noticing the new left section; trusting it scans |
| T5 | Prove it scans (all) | "Scan the one you just made with your phone." | Phone opens the correct target | Real-world scan success |
| T6 | Recover/redo (all) | "Change the background to black, then undo that." | Changes bg; attempts undo | Looks for undo; reaction to absence |
| T7 | Return visit (retention) | "Close the tab, reopen the link. Continue where you left off." | Work restored | Reaction to (now) restored state |

**Note-taking grid (one row per tester × task):**

| Tester | Task | Completion (✓/assisted/✗) | Time-on-task | # Errors | Wrong paths | Verbatim quote |
|---|---|---|---|---|---|---|

**Post-task:** SUS (§G) + "Most confusing thing?" + "Would you trust this for a
500-copy print run?"

**Targets:** T1 ≥90% unaided · T4 ≥60% unaided (at-risk flow) · T5 ≥95% real scan.

---

## C. First-run / activation (instrument; predicts retention)

**Activation metric — Time-To-First-Verified-Download (TTFVD):** first paint →
first PNG/SVG (QR or card) download where the verify badge read **OK**.

- **Targets:** consumer median < 75 s; SMB card flow median < 150 s; unaided
  completion ≥ 80% / ≥ 60%.
- **Instrument (privacy-first):** stamp `performance.now()` at mount; emit local
  events — `source_selected`, `content_entered`, `style_changed`, `image_added`,
  `verify_ok`, `download_clicked` — to an in-page logger (or `sendBeacon` to your
  own endpoint if/when added). TTFVD = `download_clicked.t − mount.t` with the
  latest `verify_ok` true. **Fallback now:** moderator stopwatch from §B.

**Pre-activation step map (stall risks):** land → pick source (2-level picker,
*medium*) → enter details (*validation gap*) → optional image (role matrix,
*medium*) → style (long column; mobile lacks jump-nav) → **notice "Verified"**
(below the QR) → download. **Card flow** adds the switch discovery + (now badged)
result. Watch the **switch-to-card** and **notice-verified** steps as the
hypothesized leaks.

---

## D. Performance-as-UX (measure on real devices)

Treat lag/jank as defects. Measure on a throttled mid-tier Android (4× CPU) + a
real iPhone, on Fast 3G and offline.

| Check | Target | How |
|---|---|---|
| First Contentful Paint | < 1.5 s (mid-mobile, Fast 3G) | Lighthouse / WebPageTest |
| Time to Interactive | < 3.5 s | Lighthouse |
| JS bundle (gzip) | budget < 180 KB (≈142 KB today) | `npm run build` output |
| Input latency (type → preview) | < 100 ms perceived | Performance panel; watch layout thrash |
| QR verify decode | < 250 ms; show "checking…" if longer | instrument the debounce path |
| Card verify decode | < 400 ms (rasterise + jsQR) | mid phone |
| Halftone sampling (4000px, High) | < 500 ms or show progress | throttle 4×, big image |
| Animation smoothness | 60 fps, no jank on hover/scroll/sticky | DevTools "frames" |
| Sticky-preview repaint | no scroll jank from nav `backdrop-filter` | mobile scroll |
| Offline / 2nd load | usable offline | **no service worker yet; fonts are external/render-blocking — fix** |
| Memory (many images) | no leak | upload/remove 20 images, watch heap |

---

## E. Product-specific risk tests (top 5 bespoke interactions)

1. **Card scannability under "exact design."** vCard + halftone + small QR scale
   + busy logo → export → scan with 3 phones. *Pass:* card badge warns/blocks on
   fail (now implemented — re-verify each release with real phones).
2. **Image-role matrix comprehension.** Two images: "photo = background texture,
   logo = centre." Watch halftone/logo/watermark mapping; remove an image
   mid-assignment → roles must re-map without breaking.
3. **Source-switch data loss.** Fill a long vCard, click another category chip →
   form swaps; confirm users don't lose unrelated content unexpectedly and can
   get back.
4. **Large/edge inputs.** Empty fields (empty-state copy), 2000-char URL ("too
   much data" guidance), emoji/RTL in vCard, 6000px PNG (perf+memory), non-image
   file dropped on upload (error handling).
5. **Interruption/resume.** Mid-edit: refresh (state now restored — verify),
   background tab 10 min, rotate device (sticky-preview reflow), lose network
   during font load.

Record completion, errors, and the **emotional reaction** at each failure point.

---

## F. Accessibility audit (assessed directly; doubles as a quality pass)

**Measured contrast — Linen (re-measure every theme each release):**

| Pair | Ratio | Verdict |
|---|---|---|
| Body ink on page | 14.99:1 | AAA |
| Secondary ink on card | 8.05:1 | AAA |
| Helper text on page bg | 5.13:1 | AA ✅ (was 4.43) |
| Helper text on card | 4.95:1 | AA |
| Accent link on page | 5.25:1 | AA ✅ (was 4.47) |
| White on active pill (accent-2) | 5.86:1 | AA ✅ (was 3.66) |

**Re-run for Graphite + Midnight** (Midnight active pill uses dark `--on-accent`
on bright accent — confirm).

**Keyboard / names:** all interactive controls have accessible names (theme
toggle `aria-label`; switches/pills/tabs text; colour inputs via wrapping
`<label>`; posgrid cells `title`; io chips `title`). Focus-visible is consistent
and **un-clipped** (inset `outline-offset:-2px`). `prefers-reduced-motion`
honored; opaque nav fallback where `backdrop-filter` is absent.

**Verify with real AT (NVDA/VoiceOver):**
- custom `.picker` (`role=listbox/option`) — arrow-key nav + `aria-activedescendant`.
- segmented `role=tab` controls — roving tabindex / tab semantics.
- posgrid — consider `role=radiogroup`; confirm cell names announce ("top left").
- text zoom 200% — no clipping in the fixed mobile download bar.
- `@media (forced-colors)` / Windows high-contrast — untested; add checks.

---

## G. Scorecard (one page; track across versions)

**System Usability Scale** (each 1–5, alternate +/–; score = Σ(adjusted)×2.5 →
0–100; ~68 avg, 80+ good):
1. Use frequently · 2. Unnecessarily complex · 3. Easy to use · 4. Need support ·
5. Functions well integrated · 6. Too inconsistent · 7. Learn quickly ·
8. Cumbersome · 9. Felt confident · 10. Lots to learn first.

**Hard metrics:**

| Metric | Target | This release |
|---|---|---|
| Task completion (unaided) T1 / T4 | ≥90% / ≥60% | — |
| Error rate (errors ÷ tasks) | < 0.5 | — |
| Avg time-on-task T1 / T4 | <75 s / <150 s | — |
| TTFVD median | <75 s / <150 s | — |
| Real-scan success (T5) | ≥95% | — |
| SUS | ≥80 | — |

**Activation funnel** (the 6 §C events):
`land → source_selected → content_entered → (style/image) → verify_ok → download`
— report % surviving each step.

---

## H. Dogfooding / longitudinal protocol (≥1 week)

Make a *real* code every working day (real link, real Wi-Fi share, real card).
Log:

| Date | Task (real) | Device | Time | Friction (1–5) | What annoyed me | Did the output work in the wild? |
|---|---|---|---|---|---|---|

Weekly roll-up: top 3 recurring annoyances, "I avoided the tool because…", and
**trust events** (a printed/shared code that failed to scan). Longitudinal
surfaces what 30-min tests miss — missing share link (#8), heavy-op feedback
(#9), and re-doing style each session (mitigated by persistence — confirm).

---

### Direct vs. real-user

- **Direct (an AI/reviewer can do):** §A heuristics, §F a11y + measured contrast/names, structural/feel findings, §D *targets* + font/offline observations.
- **Requires real users/devices:** §B outcomes, §C TTFVD + drop-off, §D device measurements/jank, §E emotional-failure reactions + real-scan success, §G scores, §H accumulated friction.
