# DESIGN LOCK - Phase 1 Visual Baseline

This repository treats the approved Figma file and `连冬杰_金融全栈(3).pdf` page 1 as the visual source of truth.

Locked by default:
- A4 geometry and zero print margin
- top blue stripe
- `#4183FF` section system
- Noto Sans SC / Noto Sans CJK SC Regular/Bold typography hierarchy (9 pt body baseline)
- header geometry and portrait slot
- 22.5 pt side margins
- page-1 content start position and flow-based Education / Skills / Experience order
- calibrated inter-section whitespace; oversized gaps are a build failure
- date right column
- tag appearance and bullet indentation

JD-specific work may change temporary resume data, ordering and wording only. Do not change `styles/resume.css` or `template/resume.html` unless the task is explicitly a template/layout change.

## Change policy

- `data/base-fintech.yaml` and `data/base-fullstack.yaml` are read-only Base resumes; routine JD work must copy one into `tmp/` and modify only the copy.
- JD customization must remain in the temporary data layer and must not modify either Base, `template/`, or `styles/`.
- Locked files may change only when a task explicitly requests a design-template change and the new rendering has been reviewed.

## Machine check

`design-lock.json` stores SHA-256 hashes for the approved `template/resume.html` and `styles/resume.css` baseline.

```bash
npm run design:check
```

The check fails with a non-zero exit code if either locked file is missing or changed. After an explicitly approved template redesign, update the baseline deliberately:

```bash
npm run design:approve
```
