from services.agents.fraud.state import FraudCheckState
from services.agents.fraud.tools.photo_hash import (
    HAMMING_DISTANCE_FLAG_THRESHOLD,
    find_duplicate_photos,
)


async def run(state: FraudCheckState) -> dict:
    ctx = state["context"]
    target_hash = ctx.get("photo_hash")
    if not target_hash:
        signal = {
            "signal_type": "photo_hash",
            "score": None,
            "confidence_label": "low",
            "evidence": "No profile photo available to hash (candidate has not uploaded one).",
        }
        return {"signals": [signal], "context": {**ctx, "photo_hash_results": []}}

    results = find_duplicate_photos(target_hash, ctx.get("photo_corpus", []))
    top = results[0] if results else None
    signal = {
        "signal_type": "photo_hash",
        "score": None,
        "confidence_label": "high" if top and top["hamming_distance"] <= HAMMING_DISTANCE_FLAG_THRESHOLD else "low",
        "evidence": top["evidence"] if top else "No matching profile photo found in the corpus.",
    }
    return {"signals": [signal], "context": {**ctx, "photo_hash_results": results}}
