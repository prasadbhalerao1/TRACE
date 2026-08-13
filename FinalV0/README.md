# FinalV0 — TRACE Phase 1 Submission

**Team: The Big Oh's**

## What to submit

| File | Use |
| :--- | :--- |
| `Overwatch_Idea_Submission.pdf` | **The submission.** 14 pages, all 14 diagrams embedded |
| `Overwatch_Idea_Submission.docx` | Editable version, same content |

## Also here

| Path | What it is |
| :--- | :--- |
| `Overwatch_Idea_Submission.md` | Source markdown. Edit this, then rebuild |
| `diagrams/*.png` | All 14 diagrams as standalone images, for slides or the README |
| `diagrams/src/*.mmd` | Mermaid source for each diagram |
| `build_docs.py` | Rebuilds the DOCX from the markdown |

## Rebuilding after an edit

Edit `Overwatch_Idea_Submission.md`, then:

```bash
# 1. re-render any diagram you changed
cd diagrams
npx @mermaid-js/mermaid-cli -i src/04-2-1-architecture-data-flow.mmd \
    -o 04-2-1-architecture-data-flow.png -b white -s 3

# 2. rebuild the DOCX
cd .. && python build_docs.py

# 3. export the PDF (needs Word installed)
powershell -Command "$w=New-Object -ComObject Word.Application; $w.Visible=$false; `
  $d=$w.Documents.Open((Resolve-Path 'Overwatch_Idea_Submission.docx').Path); `
  $d.ExportAsFixedFormat((Get-Location).Path+'\Overwatch_Idea_Submission.pdf',17); `
  $d.Close(0); $w.Quit()"
```

> **Page budget:** the brief allows 10–15 pages. Current build is 14. `MAX_W`, `MAX_H`
> and the `Normal` font size at the top of `build_docs.py` are the levers if it drifts over.

## Before submitting

- [ ] Fill in the GitHub repo link in §11
- [ ] Add screenshots to §11 (candidate dashboard, recruiter match list, pipeline board, hackathon leaderboard, fraud review queue)
