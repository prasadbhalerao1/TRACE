# Talent Score Enhancement - Quick Start

## What Was Built

Two new sub-scores added to the talent scoring system:

1. **Open Source Contributions** (10% weight)
   - Automatically derived from GitHub data
   - Measures external PRs, repo diversity, language breadth
   - No user action needed

2. **Hackathon Performance** (10% weight)
   - Combines platform-run hackathons (auto-detected) + self-reported hackathons (user-entered)
   - User adds hackathon wins/placements in profile edit page
   - Results in immediate Talent Score update

## 🚀 Deploy

1. **Run database migration:**
   ```bash
   cd packages/db
   alembic upgrade head
   ```

2. **Restart backend:**
   ```bash
   # Your FastAPI start command
   uvicorn services.api.main:app --reload
   ```

3. **Frontend already updated** — no additional build needed

## ✅ Test

### Backend Unit Tests
```bash
pytest services/agents/candidate_intelligence/tools/test_open_source_score.py -v
pytest services/agents/candidate_intelligence/tools/test_hackathon_score.py -v
```

### Manual E2E (Web UI)

1. **Navigate to Profile Edit**
   - Go to dashboard → settings/profile edit

2. **Test Open Source**
   - Connect GitHub (or reconnect if already connected)
   - Verify dashboard score breakdown includes "Open Source Contributions"
   - Should show a score between 0-100 if you have external PRs

3. **Test Hackathon Performance**
   - Scroll down to new "Hackathon Experience" section
   - Click "Add Hackathon Experience"
   - Fill in:
     - Name: e.g. "HackIndia 2025"
     - Result: Pick "Winner" (🏆)
     - Importance: Set to 5
     - Date: Pick any recent date
   - Click "Add Experience"
   - Should see success notification
   - Dashboard score should update (will show "Talent Score updating in background")
   - Refresh page — score should include "Hackathon Performance" in breakdown

4. **Test Removal**
   - In same section, click "Remove" on the entry you just added
   - Score should recompute (should decrease or stay same)
   - Entry disappears from list

## 📊 Expected Behavior

### Score Never Goes Down
- Adding a hackathon entry: score stays same or goes up
- Removing a hackathon entry: score stays same or goes down
- **Never negative** — both new sub-scores use cold-start pattern

### Self-Reported Entries Are Unverified
- Shows "self-reported" label in the list
- Matches existing skills/experience behavior
- Can be verified later if needed

### Platform Hackathons Auto-Added
- If you participate in platform-run hackathons, they auto-show in score
- No manual entry needed
- Platform rank converts to tier: rank 1→winner, 2-5→top5, 6-10→finalist, 11+→participant

## 🔍 Key Files to Review

### Backend
- **Scoring logic**: `services/agents/candidate_intelligence/tools/open_source_score.py` & `hackathon_score.py`
- **Data models**: `packages/db/models/candidate.py`
- **Schemas**: `packages/shared_schemas/candidates.py`
- **Router**: `services/api/modules/candidates/router.py`

### Frontend
- **Profile edit UI**: `apps/web/src/app/(candidate)/profile/edit/page.tsx`
- **API client**: `apps/web/src/lib/api.ts`
- **Score display**: Already generic (uses `SUB_SCORE_LABELS`)

## ⚙️ Configuration

### Hackathon Weights (Backend)

Edit `services/agents/candidate_intelligence/tools/hackathon_score.py`:
```python
RESULT_TIER_SCORES = {
    "winner": 100.0,      # ← Adjust these values
    "top5": 75.0,
    "finalist": 50.0,
    "participant": 25.0,
}
```

### Sub-Score Weights (Backend)

Edit `services/agents/candidate_intelligence/tools/aggregate.py`:
```python
SUB_SCORE_WEIGHTS = {
    "coding_ability": 0.16,
    "problem_solving": 0.16,
    # ... etc ...
    "open_source_contributions": 0.10,  # ← Adjust if needed
    "hackathon_performance": 0.10,      # ← Adjust if needed
}
```

## 📝 API Reference

### New Endpoints

**Add hackathon experience:**
```bash
POST /candidates/me/hackathon-experience
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "HackIndia 2025",
  "result": "winner",
  "weight": 5,
  "date": "2025-03-01"
}
```

**Remove hackathon experience:**
```bash
DELETE /candidates/me/hackathon-experience/{entry_id}
Authorization: Bearer <token>
```

Both endpoints trigger background rescoring. Use existing polling (`GET /candidates/me/ingestion-status`) to wait for completion.

## 🐛 Troubleshooting

**"Open Source Contributions" score is None/missing?**
- User hasn't connected GitHub yet, OR
- No external PR history detected
- This is normal (cold-start) — not an error

**"Hackathon Performance" score is None/missing?**
- User hasn't added any self-reported hackathons AND
- User hasn't participated in platform hackathons
- This is normal (cold-start) — not an error

**Score not updating after adding hackathon entry?**
- Check browser console for errors
- Verify network request succeeded (should see 200 response)
- Try refreshing the page
- Check `GET /candidates/me/ingestion-status` returns "idle" (not "processing")

**Migration fails?**
- Ensure PostgreSQL is running
- Check alembic.ini points to correct DB
- Verify all previous migrations applied (`alembic current`)
- Try: `alembic downgrade -1 && alembic upgrade head`

## 📚 Documentation

- **Full details**: See `IMPLEMENTATION_COMPLETE.md`
- **Architecture**: See `TALENT_SCORE_ENHANCEMENTS.md`
- **This file**: `QUICK_START.md`

---

**Questions?** Check the implementation docs or search the codebase for `open_source_contributions` and `hackathon_performance`.
