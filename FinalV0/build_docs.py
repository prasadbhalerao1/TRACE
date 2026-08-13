"""Build the DOCX and print-ready HTML for the Overwatch idea submission.

Mermaid fences are swapped for the PNGs already rendered into diagrams/, tables
keep their grid, and the whole thing is sized to land inside the 10-15 page
window the submission asks for.
"""

import base64
import re
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

ROOT = Path(__file__).resolve().parent
SRC = ROOT.parent / "Overwatch_Idea_Submission.md"
DIAGRAMS = ROOT / "diagrams"

ACCENT = RGBColor(0x1A, 0x1A, 0x1A)
MUTED = RGBColor(0x55, 0x55, 0x55)
RULE = "D0D0D0"

# Diagram PNGs are numbered in document order, so the Nth mermaid fence maps
# onto the Nth file once they are sorted.
DIAGRAM_FILES = sorted(DIAGRAMS.glob("*.png"))

# Widths tuned per diagram: wide/flat ones can run full-bleed, tall ones have to
# be held back or a single diagram eats most of a page.
MAX_W = 6.6
MAX_H = 2.3


def png_size(path: Path) -> tuple[int, int]:
    data = path.read_bytes()[:26]
    w = int.from_bytes(data[16:20], "big")
    h = int.from_bytes(data[20:24], "big")
    return w, h


def fit(path: Path) -> Inches:
    """Scale a diagram to fit the text column without blowing the page budget."""
    w, h = png_size(path)
    width = MAX_W
    if h / w * width > MAX_H:
        width = MAX_H * w / h
    return Inches(round(width, 2))


# --------------------------------------------------------------------------
# Markdown parsing
# --------------------------------------------------------------------------

INLINE = re.compile(r"(\*\*.+?\*\*|\*[^*]+?\*|`[^`]+?`)", re.S)

# --------------------------------------------------------------------------
# LaTeX -> Unicode
#
# Word has no MathML pipeline here, so raw $...$ would print as literal
# backslash soup. These formulas are small enough to render faithfully with
# Unicode sub/superscripts and real math symbols.
# --------------------------------------------------------------------------

SUB = str.maketrans("0123456789+-=()aeioxhklmnpstjr", "₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑᵢₒₓₕₖₗₘₙₚₛₜⱼᵣ")
SUP = str.maketrans("0123456789+-=()n", "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿ")

GREEK = {
    r"\lambda": "λ", r"\sigma": "σ", r"\Sigma": "Σ", r"\mu": "μ",
    r"\tau": "τ", r"\rho": "ρ", r"\phi": "φ", r"\delta": "δ",
    r"\alpha": "α", r"\beta": "β", r"\varnothing": "∅", r"\infty": "∞",
    r"\leq": "≤", r"\geq": "≥", r"\neq": "≠", r"\approx": "≈",
    r"\cdot": "·", r"\times": "×", r"\in": "∈", r"\subseteq": "⊆",
    r"\min": "min", r"\max": "max", r"\ln": "ln", r"\log": "log",
    r"\qquad": "    ", r"\quad": "  ", r"\,": " ", r"\;": " ", r"\!": "",
}


def _brace_group(s: str, start: int) -> tuple[str, int]:
    """Return the contents of the {...} beginning at `start`, and the index after it."""
    assert s[start] == "{"
    depth, i = 0, start
    while i < len(s):
        if s[i] == "{":
            depth += 1
        elif s[i] == "}":
            depth -= 1
            if depth == 0:
                return s[start + 1 : i], i + 1
        i += 1
    return s[start + 1 :], len(s)


def latex_to_unicode(s: str) -> str:
    """Best-effort LaTeX -> Unicode for the short formulas in this document."""
    s = s.strip()

    # \frac{a}{b} -> a / b, brace-matched so \sum_{...} inside still works
    while r"\frac{" in s:
        k = s.index(r"\frac{")
        num, j = _brace_group(s, k + 5)
        if j >= len(s) or s[j] != "{":
            break
        den, end = _brace_group(s, j)
        num, den = latex_to_unicode(num), latex_to_unicode(den)
        wrap = lambda x: x if re.fullmatch(r"[^\s+\-]{1,4}", x) else f"({x})"
        s = s[:k] + f"{wrap(num)} / {wrap(den)}" + s[end:]

    s = re.sub(r"\\text\{([^}]*)\}", r"\1", s)
    s = re.sub(r"\\mathcal\{([^}]*)\}", r"\1", s)
    s = re.sub(r"\\lvert|\\rvert|\\bigl|\\bigr|\\left|\\right", "|", s)

    # sums with bounds: \sum_{i \in A} -> Σ(i∈A)
    s = re.sub(r"\\sum_\{([^}]*)\}", lambda m: "Σ" + _script(m.group(1), SUB, paren=True), s)
    s = s.replace(r"\sum", "Σ")

    for k, v in sorted(GREEK.items(), key=lambda kv: -len(kv[0])):
        s = s.replace(k, v)

    # superscripts first (exponents), then subscripts
    s = re.sub(r"\^\{([^}]*)\}", lambda m: _script(m.group(1), SUP, sup=True), s)
    s = re.sub(r"\^([A-Za-z0-9])", lambda m: _script(m.group(1), SUP, sup=True), s)
    s = re.sub(r"_\{([^}]*)\}", lambda m: _script(m.group(1), SUB), s)
    s = re.sub(r"_([A-Za-z0-9])", lambda m: _script(m.group(1), SUB), s)

    s = s.replace("\\", "").replace("{", "").replace("}", "")
    s = re.sub(r"\b(min|max|ln|log)(?=[A-Za-z(])", r"\1 ", s)
    return re.sub(r"\s{2,}", " ", s).strip()


def _script(inner: str, table, paren: bool = False, sup: bool = False) -> str:
    """Translate to sub/superscript when every char maps; else fall back.

    Uppercase letters have no Unicode subscript forms, so `y_C` keeps a plain
    'C' rather than silently losing it.
    """
    inner = inner.strip()
    for k, v in GREEK.items():
        inner = inner.replace(k, v)
    inner = inner.replace("\\", "").replace("{", "").replace("}", "").strip()
    if not inner:
        return ""

    mapped = inner.translate(table)
    leftover = [ch for ch in mapped if ord(ch) < 128 and ch.isalnum()]

    if not leftover:
        return f"({mapped})" if paren else mapped
    if paren:
        return f"({inner})"
    # partial translation: keep it inline and readable
    if sup:
        return f"^({inner})" if len(inner) > 1 else f"^{inner}"
    # subscript with no Unicode form (e.g. uppercase): keep a visible marker
    return f"_{inner}" if len(inner) > 1 else f"_{inner}"


def add_runs(par, text: str, base_size=None, color=None):
    """Render **bold**, *italic*, `code` and inline $math$ inside a paragraph."""
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)  # links -> plain text
    text = text.replace("&amp;", "&").replace("&gt;", ">").replace("&lt;", "<")
    # inline math: $...$ -> unicode (skip $$, handled as display math)
    text = re.sub(r"(?<!\$)\$([^$]+)\$(?!\$)", lambda m: latex_to_unicode(m.group(1)), text)
    for part in INLINE.split(text):
        if not part:
            continue
        if part.startswith("**") and part.endswith("**") and len(part) > 4:
            r = par.add_run(part[2:-2])
            r.bold = True
        elif part.startswith("`") and part.endswith("`") and len(part) > 2:
            r = par.add_run(part[1:-1])
            r.font.name = "Consolas"
            r.font.size = Pt(9)
        elif part.startswith("*") and part.endswith("*") and len(part) > 2:
            r = par.add_run(part[1:-1])
            r.italic = True
        else:
            r = par.add_run(part)
        if base_size:
            r.font.size = base_size
        if color:
            r.font.color.rgb = color


def shade(cell, hexcolor: str):
    el = OxmlElement("w:shd")
    el.set(qn("w:fill"), hexcolor)
    cell._tc.get_or_add_tcPr().append(el)


def build_docx() -> Path:
    md = SRC.read_text(encoding="utf8")
    doc = Document()

    sec = doc.sections[0]
    sec.top_margin = Inches(0.55)
    sec.bottom_margin = Inches(0.55)
    sec.left_margin = Inches(0.6)
    sec.right_margin = Inches(0.6)

    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(12)
    style.paragraph_format.space_after = Pt(3)
    style.paragraph_format.line_spacing = 1.0

    lines = md.split("\n")
    i = 0
    diagram_idx = 0
    in_toc = False

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # ---- fenced blocks -------------------------------------------------
        if stripped.startswith("```"):
            lang = stripped[3:].strip()
            body = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith("```"):
                body.append(lines[i])
                i += 1
            i += 1

            if lang == "mermaid":
                if diagram_idx < len(DIAGRAM_FILES):
                    img = DIAGRAM_FILES[diagram_idx]
                    p = doc.add_paragraph()
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    p.paragraph_format.space_before = Pt(2)
                    p.paragraph_format.space_after = Pt(3)
                    p.add_run().add_picture(str(img), width=fit(img))
                    diagram_idx += 1
            else:
                p = doc.add_paragraph()
                p.paragraph_format.left_indent = Inches(0.14)
                p.paragraph_format.space_after = Pt(5)
                shade_par = OxmlElement("w:shd")
                shade_par.set(qn("w:fill"), "F6F6F6")
                p._p.get_or_add_pPr().append(shade_par)
                r = p.add_run("\n".join(body))
                r.font.name = "Consolas"
                r.font.size = Pt(9.5)
            continue

        # ---- tables --------------------------------------------------------
        if stripped.startswith("|") and i + 1 < len(lines) and re.match(r"^\|[\s:|-]+\|$", lines[i + 1].strip()):
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
                if not re.match(r"^[\s:|-]+$", "|".join(cells)):
                    rows.append(cells)
                i += 1

            ncol = max(len(r) for r in rows)
            table = doc.add_table(rows=0, cols=ncol)
            table.style = "Table Grid"
            table.alignment = WD_TABLE_ALIGNMENT.CENTER
            for ri, row in enumerate(rows):
                cells = table.add_row().cells
                for ci in range(ncol):
                    txt = row[ci] if ci < len(row) else ""
                    cell = cells[ci]
                    cell.text = ""
                    par = cell.paragraphs[0]
                    par.paragraph_format.space_after = Pt(1)
                    par.paragraph_format.space_before = Pt(1)
                    add_runs(par, txt, base_size=Pt(10.5))
                    if ri == 0:
                        shade(cell, "EDEDED")
                        for r in par.runs:
                            r.bold = True
            doc.add_paragraph().paragraph_format.space_after = Pt(0)
            continue

        # ---- headings ------------------------------------------------------
        m = re.match(r"^(#{1,4})\s+(.*)$", stripped)
        if m:
            level, text = len(m.group(1)), m.group(2)
            in_toc = text.strip().lower() == "table of contents"
            text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)

            if level == 1:
                p = doc.add_paragraph()
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                r = p.add_run(text)
                r.bold = True
                r.font.size = Pt(22)
                r.font.color.rgb = ACCENT
            else:
                p = doc.add_paragraph()
                p.paragraph_format.space_before = Pt(5 if level == 2 else 3)
                p.paragraph_format.space_after = Pt(2)
                p.paragraph_format.keep_with_next = True
                r = p.add_run(text)
                r.bold = True
                r.font.size = Pt({2: 15, 3: 12.8, 4: 12}[level])
                r.font.color.rgb = ACCENT
                if level == 2:
                    pbdr = OxmlElement("w:pBdr")
                    bottom = OxmlElement("w:bottom")
                    bottom.set(qn("w:val"), "single")
                    bottom.set(qn("w:sz"), "6")
                    bottom.set(qn("w:color"), RULE)
                    pbdr.append(bottom)
                    p._p.get_or_add_pPr().append(pbdr)
            i += 1
            continue

        # ---- horizontal rule ----------------------------------------------
        if stripped in ("---", "***", "___"):
            i += 1
            continue

        # ---- display math ($$...$$ on its own line) ------------------------
        if stripped.startswith("$$") and stripped.endswith("$$") and len(stripped) > 4:
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(4)
            p.paragraph_format.space_after = Pt(5)
            r = p.add_run(latex_to_unicode(stripped[2:-2]))
            r.font.name = "Cambria Math"
            r.font.size = Pt(12.5)
            r.italic = True
            i += 1
            continue

        # ---- blockquote ----------------------------------------------------
        if stripped.startswith(">"):
            body = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                body.append(lines[i].strip().lstrip(">").strip())
                i += 1
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Inches(0.16)
            p.paragraph_format.space_before = Pt(3)
            p.paragraph_format.space_after = Pt(5)
            pbdr = OxmlElement("w:pBdr")
            left = OxmlElement("w:left")
            left.set(qn("w:val"), "single")
            left.set(qn("w:sz"), "18")
            left.set(qn("w:color"), "999999")
            left.set(qn("w:space"), "6")
            pbdr.append(left)
            p._p.get_or_add_pPr().append(pbdr)
            add_runs(p, " ".join(body), base_size=Pt(11.5))
            continue

        # ---- lists ---------------------------------------------------------
        m = re.match(r"^(\s*)([-*+]|\d+\.)\s+(.*)$", line)
        if m:
            indent = len(m.group(1))
            ordered = bool(re.match(r"\d+\.", m.group(2)))
            style_name = "List Number" if ordered else "List Bullet"
            p = doc.add_paragraph(style=style_name)
            p.paragraph_format.left_indent = Inches(0.26 + 0.2 * (indent // 3))
            p.paragraph_format.space_after = Pt(1)
            size = Pt(11) if in_toc else Pt(12)
            add_runs(p, m.group(3), base_size=size)
            i += 1
            continue

        # ---- body text -----------------------------------------------------
        if stripped:
            p = doc.add_paragraph()
            p.paragraph_format.space_after = Pt(4)
            add_runs(p, stripped)
        i += 1

    out = ROOT / "Overwatch_Idea_Submission.docx"
    doc.save(out)
    return out


if __name__ == "__main__":
    path = build_docx()
    print(f"wrote {path}  ({path.stat().st_size // 1024} KB)")
    print(f"diagrams embedded: {len(DIAGRAM_FILES)}")
