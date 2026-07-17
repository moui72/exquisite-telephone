---
status: planned
created: 2026-07-17
plan: plan-5ef1-2026-07-17-9e40.md
---

# Feedback

## Bugs
- [x] F001 Changing the drawing tool's color and/or line width, then starting a new stroke, renders that stroke with the *previous* color/width while actively drawing — it only updates to the newly-selected color/width once the stroke is finished (pointer up). The new setting should apply from the start of the stroke, not after it. [artifacts: ui]
