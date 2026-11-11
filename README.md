# Precalc Prep

[https://jlahire.github.io/precalc-app/](https://jlahire.github.io/precalc-app/)

A single-page precalculus study guide: lessons with on-paper worked steps, cheat sheets, a glossary and index, quizzes and tests with answer keys, and a practice-sheet generator.

## Equation Helper

Type or paste any course problem (or a request in words, like `domain of f(x) = √(x-3)`):
simplify, solve, factor, domain, range, inverse, zeros, graph features, coterminal and reference angles
(with a standard-position drawing), all six trig values, trig identity proofs that name each identity,
trig simplification, and log expand/condense.

- **Solve all** runs every goal at once and graphs the result.
- **More like this** generates new problems of the same type with steps and answers hidden behind buttons.
- **Graph → Equation Practice** shows a graph and checks the equation you write for it.

## Scrap-Paper Memory Sheet

Cards to rewrite from memory (trig ratio table, every identity family, inverse-trig ranges with unit-circle pictures,
log properties, domain rules) plus two drills built from the class worksheets:

- **Identities drill (Question 1):** the 17 requested identities plus the alternate Pythagorean forms, checked for
  correctness *and* for the form each section asks for; printable blank page.
- **Inverse trig drill:** the class sheet's 12 evaluate questions and 3 true/false, with range-aware feedback,
  a "How?" walkthrough for each, and new random sets.

## Devices

`js/device.js` detects phone, tablet/iPad or computer (and touch vs mouse) and adapts: bottom action bar and
math-keys-only mode on phones, side-by-side helper on wide screens, keyboard shortcuts on computers, 16px fields
so iOS never zooms. Settings → Layout overrides the detection.

## Files

| File | What it does |
|---|---|
| `precalc-prep.html` | The book, the original engine (`equation-helper-engine`) and page scripts |
| `js/paper.js`, `css/paper.css` | Hand-written paper rendering: stacked fractions, drawn radicals, ruled tables |
| `js/graph.js` | Hand-drawn SVG graphs and number lines |
| `js/eh-trig.js` | Trig identity prover/simplifier, angle analysis |
| `js/eh-plus.js` | New goals, explanations, Solve all, problem generator, graph practice |
| `js/eh-ui.js` | Interface for the above, the Scrap-Paper Memory Sheet and drills, paper-style setting |
| `js/device.js`, `css/device.css` | Device detection and phone / tablet / computer layouts |
| `fonts/caveat-latin.woff2` | Caveat handwriting font (SIL Open Font License), bundled for offline use |
