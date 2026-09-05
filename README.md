# Resume Generator Foundation

Phase 2 foundation for a locked WonderCV-style resume workflow.

## Architecture

- `data/resume.yaml`: human-readable YAML content source
- `template/resume.html`: locked document structure
- `styles/resume.css`: locked visual implementation of the approved Figma baseline
- `assets/portrait.png`: local portrait asset
- `scripts/build.ts`: render + Chromium PDF + layout gate
- `scripts/check-layout.ts`: independent overflow/overlap check
- `scripts/visual_check.py`: diagnostic visual comparison against the original page-1 reference
- `output/`: generated deliverables

## Commands

```bash
npm test
npm run schema:check
npm run build:resume
npm run check:layout
npm run design:check
npm run repeatability:check
npm run visual:check
npm run verify
```

`npm run verify` is the Phase 2.1 local acceptance gate. It validates the YAML schema, design lock, required resources, layout, actual two-page PDF output, repeatable page pixels, and the diagnostic visual comparison. Visual differences are reported but are not a hard pixel-diff gate.

Text fields in `data/resume.yaml` support one safe inline emphasis form: `**text**`. It renders as `<strong>text</strong>` after HTML escaping; unclosed markers remain plain text and raw HTML is never interpreted.

Runtime used for this validated foundation: Node 22 + the npm `yaml` and Zod packages for data loading/validation, plus Python 3, Playwright Chromium, and Poppler (`pdfinfo` and `pdftoppm`) for PDF rendering and visual checks. YAML parsing is handled entirely in Node. `PYTHON`, `CHROMIUM_EXECUTABLE`, and the project-local `RESUME_PDF` path may be overridden for PDF runtime differences; defaults remain `python3`, `/usr/bin/chromium`, and `output/resume-fintech.pdf`.

## Phase 2 boundary

Included: deterministic data -> HTML -> PDF generation, layout checks, visual regression artifacts.

Excluded: JD analysis, AI rewriting, Master Resume content pool, automatic bullet selection.
