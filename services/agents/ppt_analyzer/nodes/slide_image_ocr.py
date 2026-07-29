"""Slide Image/OCR Agent — doc 04 §4. Node contract: constraints.md §2.3.

Runs off content_extraction in parallel with slide_embedding/problem_solution_clarity/
innovation_business_impact/ai_content_heuristic — returns only `slide_ocr_notes`.
"""

from services.agents.ppt_analyzer.state import PitchAnalysisState
from services.agents.ppt_analyzer.tools.ocr import ocr_image, vision_diagram_summary


async def run(state: PitchAnalysisState) -> dict:
    slide_images: dict[int, list] = state.get("slide_images") or {}
    if not slide_images:
        return {"slide_ocr_notes": []}

    notes: list[dict] = []
    for index, images in slide_images.items():
        ocr_texts = [t for t in (ocr_image(img) for img in images) if t]
        # Vision diagram understanding only when there's little/no extracted body text
        # for this slide — i.e. it's likely a chart/architecture image, not a bullet list.
        diagram_summary = vision_diagram_summary(images[0]) if images else None
        if ocr_texts or diagram_summary:
            notes.append(
                {
                    "index": index,
                    "ocr_text": " ".join(ocr_texts) or None,
                    "diagram_summary": diagram_summary,
                }
            )

    return {"slide_ocr_notes": notes}
