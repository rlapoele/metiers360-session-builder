# Accessibility audit and remediation

Date: 2026-10-24. Scope: the candidate-authorised accessibility audit, identified fixes, repeat axe/browser checks and project records. Stop for review before the rest of Task 10. This document records targeted evidence, not a WCAG/RGAA conformance declaration.

## Baseline and findings

The initial audit covered the Task 9A application (then uncommitted on `e569c57`, subsequently committed in `3870b3b`). It recorded 17 state/viewport scans, seven with repeated axe violations. Remediation starts from `dev` at `3870b3b`, matching `origin/dev`.

| Finding | Initial evidence | Correction and retest |
|---|---|---|
| Draft header label/name order | `label-content-name-mismatch`: visible `Ma séance` followed by a count, but accessible name placed the count first | Names now begin `Ma séance, 0 vidéo`, `Ma séance, 1 vidéo` or `Ma séance, 2 vidéos`; explicit DOM whitespace precedes the visible badge. Cross-route instructions follow the same prefix. Zero/singular/plural cases are tested on catalogue, list and details routes. |
| Unfocused editable-control boundary | Manual session-name border measurement: RGB 216/216/216 on white, 1.43:1; the border identifies the otherwise white editable area | Shared Input and NativeSelect use the existing `border-input` token, rather than the decorative surface-border token. Browser measurement: RGB 143/143/143 on white, **3.23:1**. Surface borders and the palette are unchanged. |
| Video-details scroll region | `scrollable-region-focusable` at mobile width; Chrome's implicit focusability worked, so this was not established as a Chrome keyboard-access failure | Explicit `tabIndex={0}`, named region and visible inset blue outline. Tab reaches the region, Page Down scrolls its content, and the existing modal focus loop includes it. Chrome mobile scrollTop reached 97/97px; native Firefox also scrolled to the publication metadata. |
| Saved-position badge semantics | `aria-prohibited-attr` incomplete check for `aria-label="Position n"` on generic spans | Decorative numeric badges are hidden from the accessibility tree. Native ordered-list semantics and saved playback order remain. Automated rendering checks retain the list and reject the unsupported labels; final axe scans no longer report this incomplete rule. |
| Modal text contrast left undetermined | Axe reported overlap/background uncertainty for some text inside native dialogs | Every incomplete node in the final run received computed-color and contextual visibility review. Measurements below pass AA; axe's incomplete findings are retained rather than suppressed. |

No project dependency, API/catalogue source, original wireframe or unrelated delivery feature was changed.

## Initial remediation: repeat axe method and results

The final recorded run uses the production build, axe-core **4.14.0**, and isolated **Chrome 155** on macOS. Development-toolbar overlays and intermediate transition colors were excluded by using production and waiting for fonts and transitions to settle, not by excluding application nodes.

Tooling was installed only in a temporary directory, then injected with Playwright CLI into each rendered state. Run configuration:

```js
await axe.run(document, {
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
  },
});
```

There are **23 recorded scans, zero automated violations**. Seven scans retain `color-contrast` incomplete checks (20 node occurrences); no rule was disabled and no application node excluded. These are manual-review results, not automated passes.

| State | Width (CSS px) | Axe violations | Incomplete rules |
|---|---:|---:|---|
| catalogue-mobile-empty-draft | 390 | 0 | None |
| video-details-mobile | 390 | 0 | None |
| filters-mobile | 390 | 0 | color-contrast |
| catalogue-mobile-singular | 390 | 0 | None |
| draft-mobile | 390 | 0 | None |
| save-form-mobile | 390 | 0 | color-contrast |
| save-validation-mobile | 390 | 0 | color-contrast |
| save-compatible-mobile | 390 | 0 | color-contrast |
| catalogue-desktop-singular | 1440 | 0 | None |
| catalogue-desktop-plural | 1440 | 0 | None |
| video-details-desktop | 1440 | 0 | None |
| save-form-desktop | 1440 | 0 | color-contrast |
| sessions-desktop | 1440 | 0 | None |
| saved-details-desktop | 1440 | 0 | None |
| not-found-desktop | 1440 | 0 | None |
| sessions-mobile | 390 | 0 | None |
| saved-details-mobile | 390 | 0 | None |
| video-details-tablet | 834 | 0 | color-contrast |
| save-text-spacing-320 | 320 | 0 | None |
| save-form-tablet | 834 | 0 | color-contrast |
| catalogue-recovered-mobile | 390 | 0 | None |
| catalogue-error-mobile | 390 | 0 | None |
| catalogue-empty-mobile | 390 | 0 | None |

The recovered, controlled-503 and empty-search scans supplement the earlier responsive matrix. The mock API's real transient failures were retried; a browser-only response override made the error state deterministic and was removed afterward. Expected failed HTTP requests are not a clean-console claim.

### Manual review of all incomplete contrast nodes

| Rendered text | Foreground / opaque background (RGB) | Ratio |
|---|---|---:|
| Filter labels/select text and programme title | 23/23/23 on 255/255/255 | 17.93:1 |
| Name helper, character counter, headset helper, ROME code and publication date | 86/86/86 on 255/255/255 | 7.34:1 |
| Compatible-headset confirmation | 0/130/54 on 245/245/245 | 4.54:1 |

All 20 node occurrences were within the tested viewport; their center-point hit test resolved to the element or its descendant, and reviewed screenshots confirmed the modal presentation. The success message retains its text and icon as non-color cues. These measurements clear the sampled uncertainty in context; axe still reports its overlap/background limitation.

## Keyboard, responsive and regression verification

- Chrome checks covered 390 × 844 mobile, 834 × 1112 tablet and 1440 × 900 desktop, including video details, filters, draft, finalisation/validation, saved list/details and not-found presentation.
- A dedicated native Firefox window was used with explicit candidate permission. Close initially received focus; Tab reached `Contenu de la vidéo` with a visible inset outline; Page Down revealed the final metadata; subsequent Tab navigation stayed in the modal; Escape returned focus to the originating details button. This was agent-operated browser testing, not candidate-personal testing or a screen-reader session.
- At 320 × 740, increased line height (1.5), letter spacing (0.12em), word spacing (0.16em) and paragraph spacing (2em) left page and open form widths at 320/320px with no horizontal overflow. The form and controls remained readable in the viewport screenshot. Tablet finalisation also remained usable with the spacing overrides.
- Failing-first regression tests protect header visible/name order, forward/backward video-details focus traversal, shared control-border tokens and saved-position semantics. `npm run verify` passed Prettier, ESLint, strict Astro/TypeScript checks with **zero diagnostics**, **18 test files / 89 tests**, and the production server build. Final diff hygiene is recorded in the handoff.

Temporary raw results and screenshots are under `/private/tmp/metiers360-a11y-remediation.QN7tVg/`; they are local evidence, not committed deliverables. The durable outcomes are recorded here. No `test:browser` script was added; establishing the final reproducible browser-test setup remains part of the rest of Task 10.

## Bottom-edge follow-up after candidate visual review

The initial remediation above was committed and pushed in `63730ba` (`fix: address accessibility audit findings`). The candidate then changed the shared input/select fill to `bg-background` (RGB 250/250/250) and lightened `--input` to neutral 300 (RGB 216/216/216). A desktop-only recheck found zero axe violations but manual boundary contrast remained 1.43:1 against white; the fill alone was 1.04:1. These are separate candidate-authored changes, not part of the agent's initial remediation.

The candidate explicitly authorised trying a contrasting bottom edge while retaining this lighter styling. Input and NativeSelect now add a **2px bottom edge** using the new semantic `input-boundary` token (existing neutral 450, RGB 143/143/143), exposed through Tailwind as `border-b-input-boundary`. The other borders remain 1px neutral 300; fill, native semantics and the existing blue keyboard-focus ring are retained.

### Current contrast measurements

Measured on the desktop catalogue search and all three filter selects, mobile/tablet filter sheets, and session-name/headset controls in finalisation:

| Visual information | Colors | Ratio | Assessment |
|---|---|---:|---|
| Bottom edge against surrounding surface | RGB 143/143/143 on white | **3.234:1** | Passes the 3:1 non-text contrast requirement |
| Bottom edge against internal fill | RGB 143/143/143 on RGB 250/250/250 | **3.098:1** | Passes 3:1 |
| Entered/selected text against fill | RGB 23/23/23 on RGB 250/250/250 | 17.18:1 | Passes AA text contrast |
| Search placeholder against fill | RGB 86/86/86 on RGB 250/250/250 | 7.03:1 | Passes AA text contrast |

The light perimeter is decorative; the contrasting bottom edge supplies the identifying boundary. W3C's [minimal text-input example](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html#user-interface-component-examples) permits a bottom border as the indicator when it meets 3:1. This establishes the tested boundary treatment, not whole-application WCAG conformance.

### Follow-up verification

Production Chrome 155 with axe-core 4.14.0 used the same tags and no exclusions as the initial remediation. **Eight follow-up scans have zero automated violations.** Three scans retain incomplete modal contrast checks (six node occurrences); all were manually reviewed without disabling the rule.

| State | Width (CSS px) | Axe violations | Incomplete rules |
|---|---:|---:|---|
| catalogue-desktop | 1440 | 0 | None |
| save-desktop | 1440 | 0 | color-contrast |
| catalogue-390 | 390 | 0 | None |
| filters-390 | 390 | 0 | None |
| save-390 | 390 | 0 | color-contrast |
| catalogue-834 | 834 | 0 | None |
| filters-834 | 834 | 0 | color-contrast |
| save-834 | 834 | 0 | None |

- Incomplete helper/counter text measured 7.34:1 on white; programme text measured 17.93:1; the tablet filter's white `Afficher les vidéos` text measured 5.20:1 on its blue button. All six node occurrences were inside the viewport and their center hit resolved to the element or its descendant. Reviewed screenshots confirmed the presentation.
- Keyboard Tab/Shift+Tab checks confirmed that search and all three desktop selects retain their visible blue focus ring. Initial name-field focus remained visible in finalisation.
- Reviewed catalogue/filter/finalisation screenshots at 390 × 844, 834 × 1112 and 1440 × 900. Page and open dialogs had no horizontal overflow. The shared primitive change warranted this limited responsive check; the rest of Task 10 remains pending.
- `npm run verify` passed format/lint, strict checks with zero diagnostics, 18 test files / 89 tests and the production build. No new dependency or application behavior was introduced.
- Follow-up raw results and screenshots are local evidence under `/private/tmp/metiers360-input-edge.8ckgAj/`, including `controls-desktop.png`. The durable outcomes are recorded here. Native Firefox and screen readers were not rerun for this styling-only follow-up; earlier Firefox evidence remains attributed to the initial remediation.

The bottom-edge refinement remains uncommitted for candidate review.

## Limits and remaining delivery work

At the time of the official-source check, **RGAA 4.1.2** was the published reference and **RGAA 5** was announced for late 2026 with WCAG 2.2 coverage. This work does not claim RGAA 5 conformance, a percentage score or a formal accessibility declaration.

Axe cannot establish full WCAG 2.2 AA conformance. No dedicated VoiceOver/NVDA or voice-control session, full RGAA criterion-by-criterion audit, exhaustive focus-obscuring/target-size matrix, high-contrast-mode evaluation or complete zoom/resize-text assessment was performed. Saved-list numbering is retained semantically but its spoken presentation still needs real screen-reader review. Representative checks do not prove every remote state or browser/assistive-technology combination.

The remaining Task 10 scope includes the clean-install rehearsal, final delivery review and candidate-facing README. Task 10 and Checkpoint E remain unchecked; deployment is also pending separate authorisation. The initial remediation is committed in `63730ba`; the bottom-edge follow-up remains uncommitted for candidate review.

## References

- [Published RGAA reference](https://accessibilite.numerique.gouv.fr/)
- [DINUM announcement about RGAA 5](https://www.numerique.gouv.fr/actualites/nouvelle-version-rgaa-2026/)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [W3C Label in Name guidance](https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html)
- [W3C Non-text Contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- [W3C evaluation-tool limits](https://www.w3.org/WAI/test-evaluate/tools/selecting/)
- [axe-core API documentation](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md)

