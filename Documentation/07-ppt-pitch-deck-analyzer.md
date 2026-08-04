# AI PPT Analyzer & Presentation Intelligence

## What it does

Analyzes pitch decks uploaded by hackathon teams. Scores on problem clarity, solution innovativeness, business viability, and technical feasibility. Detects plagiarism and AI-generated content.

## How it works

```
Team uploads PowerPoint/PDF
    ↓
    ├─→ Extraction Phase
    │   ├─ If .ppt: Convert via LibreOffice → PDF
    │   └─ Extract slides: OCR text + image metadata
    │
    ├─→ Slide Embedding Phase
    │   - Embed each slide's text via sentence transformer
    │   - Store in Qdrant for plagiarism comparison
    │
    ├─→ Rubric Scoring Phase (LLM, temperature=0)
    │   ├─ Problem Clarity (0-100)
    │   │   "Is the problem statement clear and compelling?"
    │   │
    │   ├─ Solution Innovation (0-100)
    │   │   "How novel is the approach?"
    │   │   (Uses Qdrant to check novelty vs past hackathon pitches)
    │   │
    │   ├─ Business Viability (0-100)
    │   │   "Is this a real business problem?"
    │   │
    │   └─ Technical Feasibility (0-100)
    │       "Can it actually be built in a weekend?"
    │
    ├─→ Plagiarism Check
    │   - Structural similarity: MinHash fingerprint vs Qdrant corpus
    │   - Semantic similarity: slide embeddings vs existing pitches
    │   └─ Flag if similarity > threshold (0.85)
    │
    ├─→ AI-Content Detection (heuristics)
    │   - Perplexity score: low perplexity = AI-generated
    │   - Lexical diversity: type/token ratio
    │   - Temporal consistency: dates align?
    │   └─ Signal (not auto-flagging; contributes to fraud score)
    │
    └─→ Composite Score
        - problem:0.25 + innovation:0.25 + business:0.25 + feasibility:0.25
        - Renormalized if any component missing
```

**Why background task?** Analysis is 15-40 seconds (extraction + LLM calls + embeddings). Used to block HTTP request with no progress feedback → frustrating UX. Now runs as `BackgroundTask`, returns immediately with status='processing'. Frontend polls `/presentations/{id}/status` until done.

## Key design decisions

1. **Background tasks, not blocking requests**:
   - Old: `POST /upload` waits 30 seconds, returns full report
   - New: `POST /upload` returns immediately, status='processing'
   - Frontend polls status, shows "Analyzing..." with spinner
   - Reason: User sees progress, can switch tabs, never thinks app hung

2. **Rubric scoring uses temperature=0**:
   - Reproducible scores (same pitch always gets same score)
   - No randomness = audit trail is meaningful
   - Tradeoff: less creative/nuanced responses (fine for rubric)

3. **Plagiarism corpus starts empty**:
   - Cold-start: first 10 pitches won't match anything (correct, no prior decks)
   - After 50+ submissions: corpus becomes useful
   - Acknowledged limitation, not a bug

4. **AI-content is heuristic, not auto-flagging**:
   - Signal recorded (via verification_records), never auto-rejects
   - Human reviewer judges whether high perplexity score = suspicious or just formal writing
   - Similar to fraud engine: evidence → human review

## Limitations

- LibreOffice dependency for legacy .ppt (not all .ppt types fully supported)
- Rubric is hardcoded (should be per-hackathon configurable)
- Plagiarism corpus is within-platform only (not checked against internet)
- AI-content detection is statistical, not forensic (imperfect)

## Where this lives

| Component | File |
|---|---|
| Extraction | `services/agents/ppt_analyzer/tools/extraction.py` |
| Rubric scoring | `services/agents/ppt_analyzer/tools/rubric_scoring.py` |
| Plagiarism detection | `services/agents/ppt_analyzer/tools/plagiarism.py` |
| AI-content heuristic | `services/agents/ppt_analyzer/tools/ai_content_heuristic.py` |
| Embedding model | `services/agents/ppt_analyzer/tools/embeddings.py` |
| PPT analyzer graph | `services/agents/ppt_analyzer/graph.py` |
| API: Upload + analyze | `services/api/modules/presentations/router.py:POST /presentations/analyze` |
| API: Get status | `services/api/modules/presentations/router.py:GET /presentations/{id}/status` |
| Frontend: Upload | `apps/web/src/app/(candidate)/pitch-deck/page.tsx` |
| Frontend: Results | `apps/web/src/app/pitch-deck/[id]/page.tsx` |
| DB: Presentation model | `packages/db/models/presentation.py::Presentation` |
| DB: Score model | `packages/db/models/presentation.py::PresentationScore` |
