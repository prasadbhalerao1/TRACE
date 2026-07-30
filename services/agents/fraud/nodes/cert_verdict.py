"""Combines whichever branch ran (Auto-Verify or Visual Forensics — doc 06 §4's
Certificate Verification subgraph) into a single certificate verdict. Conservative by
design (doc 06's "when unsure, pick the more conservative option"): only a CONFIRMED
non-match (`auto_verify_result.verified is False`) or a `high` visual-forensics suspicion
crosses the flag-raising bar — an inconclusive/unreachable check never raises a flag on
its own, it's still recorded as a `verification_records` row (full evidence trail) but
doesn't accuse anyone."""

from services.agents.fraud.state import FraudCheckState

FLAG_TYPE = "fake_certificate"


async def run(state: FraudCheckState) -> dict:
    ctx = state["context"]
    auto_verify_result = ctx.get("auto_verify_result")
    visual_result = ctx.get("visual_forensics_result")

    if auto_verify_result is not None:
        if auto_verify_result["verified"] is False:
            verdict = {
                "flag_type": FLAG_TYPE,
                "should_flag": True,
                "confidence_label": auto_verify_result["confidence_label"],
                "evidence": [auto_verify_result["evidence"]],
            }
        else:
            verdict = {
                "flag_type": FLAG_TYPE,
                "should_flag": False,
                "confidence_label": auto_verify_result["confidence_label"],
                "evidence": [auto_verify_result["evidence"]],
            }
    elif visual_result is not None:
        verdict = {
            "flag_type": FLAG_TYPE,
            "should_flag": visual_result["suspicion_label"] == "high",
            "confidence_label": visual_result["confidence_label"],
            "evidence": visual_result["evidence"] if isinstance(visual_result["evidence"], list) else [visual_result["evidence"]],
        }
    else:
        verdict = {
            "flag_type": FLAG_TYPE,
            "should_flag": False,
            "confidence_label": "low",
            "evidence": ["No verification branch produced a usable result."],
        }

    return {"verdict": verdict}
