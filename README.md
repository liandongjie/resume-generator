# Resume Generator Foundation

Phase 3 foundation for a locked WonderCV-style, JD-driven resume workflow.

## Architecture

- `data/base-fintech.yaml`: read-only approved fintech base
- `data/base-fullstack.yaml`: read-only approved full-stack base
- `tmp/*.yaml`: disposable JD-specific working copies
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
npm run build:resume -- --input data/base-fullstack.yaml
npm run verify:resume -- --input tmp/20260905-招商银行-后端工程师.yaml
npm run generate -- --input tmp/20260905-招商银行-后端工程师.yaml --company 招商银行 --role 后端工程师
```

Without `--input`, schema/build/verify use `data/base-fintech.yaml`. Every selected input goes through the same schema, design, resource, layout, actual two-page PDF, repeatability, and diagnostic visual checks. Visual differences are reported but are not a hard pixel-diff gate.

For JD work, copy one Base into `tmp/`, edit only that temporary YAML, then run `generate`. Final PDFs are archived under `output/applications/`; an existing name receives `-02`, `-03`, and so on. Do not edit either Base directly during routine JD customization.

Text fields in resume YAML support one safe inline emphasis form: `**text**`. It renders as `<strong>text</strong>` after HTML escaping; unclosed markers remain plain text and raw HTML is never interpreted.

Runtime used for this validated foundation: Node 22 + the npm `yaml` and Zod packages for data loading/validation, plus Python 3, Playwright Chromium, and Poppler (`pdfinfo` and `pdftoppm`) for PDF rendering and visual checks. YAML parsing is handled entirely in Node. `PYTHON`, `CHROMIUM_EXECUTABLE`, and the project-local `RESUME_PDF` path may be overridden for PDF runtime differences; defaults remain `python3`, `/usr/bin/chromium`, and `output/resume-fintech.pdf`.

## Phase 3 boundary

Included: Base selection, disposable JD-specific YAML input, deterministic data -> HTML -> PDF generation, guarded application naming, layout checks, and visual regression artifacts.

Excluded: JD Analyzer services, LLM APIs, automatic keyword scoring, Master Resume, Content Pool, bullet IDs, databases, and Web UI.
