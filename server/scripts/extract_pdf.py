#!/usr/bin/env python3
"""Extract text or layout from a PDF using pdfplumber.

Usage:
  python3 extract_pdf.py --mode text <path-to-pdf>
  python3 extract_pdf.py --mode layout <path-to-pdf>

--mode text:   Returns plain text (existing behaviour).
--mode layout: Returns character-level layout blocks.

Outputs JSON to stdout.
"""

import json
import sys
from collections import Counter

try:
    import pdfplumber
except ImportError:
    print(json.dumps({"error": "pdfplumber not installed", "text": "", "pages": 0, "method": "pdfplumber"}))
    sys.exit(1)


# ── Font mapping ──────────────────────────────────────────────────────────────

def map_pdf_font(fontname: str) -> str:
    name = fontname.lower()
    if any(x in name for x in [
        'times', 'georgia', 'garamond', 'palatino',
        'baskerville', 'caslon', 'playfair', 'lora',
        'merriweather', 'serif',
    ]):
        return 'serif'
    if any(x in name for x in [
        'courier', 'mono', 'consolas', 'menlo',
        'inconsolata', 'source code',
    ]):
        return 'monospace'
    return 'sans-serif'


# ── Mode helpers ──────────────────────────────────────────────────────────────

def mode_text(path: str) -> dict:
    with pdfplumber.open(path) as pdf:
        pages = len(pdf.pages)
        texts = []
        for page in pdf.pages:
            page_text = page.extract_text(layout=True) or ""
            texts.append(page_text)
        full_text = "\f".join(texts)
        return {"text": full_text, "pages": pages, "method": "pdfplumber"}


def mode_layout(path: str) -> dict:
    with pdfplumber.open(path) as pdf:
        doc_pages = []
        all_font_sizes = []

        for page_num, page in enumerate(pdf.pages, start=1):
            width = float(page.width)
            height = float(page.height)

            chars = page.chars
            if not chars:
                doc_pages.append({
                    "pageNumber": page_num,
                    "width": width,
                    "height": height,
                    "blocks": [],
                })
                continue

            # Collect all font sizes for median computation
            all_font_sizes.extend(c.get("size", 0) or 0 for c in chars)

            # Group characters into words
            # Characters are in same word if x distance < 3px and y0 within 2px
            sorted_chars = sorted(chars, key=lambda c: (round(c["top"], 1), c["x0"]))

            words = []
            current_word = [sorted_chars[0]]
            for c in sorted_chars[1:]:
                prev = current_word[-1]
                x_gap = c["x0"] - prev["x1"]
                y_gap = abs(c["top"] - prev["top"])
                if x_gap < 3 and y_gap < 2:
                    current_word.append(c)
                else:
                    words.append(current_word)
                    current_word = [c]
            words.append(current_word)

            # Group words into lines (y0 within 2px)
            lines = []
            current_line = [words[0]]
            for w in words[1:]:
                prev_w = current_line[-1]
                prev_y0 = min(c["top"] for c in prev_w)
                curr_y0 = min(c["top"] for c in w)
                if abs(curr_y0 - prev_y0) < 2:
                    current_line.append(w)
                else:
                    lines.append(current_line)
                    current_line = [w]
            lines.append(current_line)

            # Group lines into blocks
            line_sizes = []
            line_fonts = []
            for line in lines:
                chars = [c for w in line for c in w]
                sizes = [c.get("size", 10) or 10 for c in chars]
                fonts = [c.get("fontname", "") or "" for c in chars]
                line_sizes.append(max(sizes) if sizes else 10)
                line_fonts.append(Counter(fonts).most_common(1)[0][0] if fonts else "")

            def is_heading_line(i):
                font_lower = line_fonts[i].lower()
                is_bold = any(x in font_lower for x in ["semibold", "bold", "medium", "black", "heavy"])
                size = line_sizes[i]
                # Check for size spike relative to previous and next lines
                prev_size = line_sizes[i - 1] if i > 0 else 0
                next_size = line_sizes[i + 1] if i < len(line_sizes) - 1 else 0
                size_spike = (prev_size > 0 and size / prev_size > 1.25) or (next_size > 0 and size / next_size > 1.25)
                return is_bold or size_spike

            blocks = []
            current_block = [lines[0]]
            for i in range(1, len(lines)):
                prev_line = lines[i - 1]
                curr_line = lines[i]
                prev_bottom = max(c["bottom"] for c in sum(prev_line, []))
                curr_top = min(c["top"] for c in sum(curr_line, []))
                gap = curr_top - prev_bottom

                # Break block if heading lines
                prev_heading = is_heading_line(i - 1)
                curr_heading = is_heading_line(i)

                # Break: heading followed by non-heading (or vice versa)
                if prev_heading != curr_heading:
                    blocks.append(current_block)
                    current_block = [lines[i]]
                    continue

                # Break: two consecutive headings (e.g. "Experience" then "Senior Product Designer")
                if prev_heading and curr_heading:
                    blocks.append(current_block)
                    current_block = [lines[i]]
                    continue

                # Merge if gap < 1.5x the smaller font size
                smaller_size = min(line_sizes[i - 1], line_sizes[i]) if line_sizes else 10
                if gap < 1.5 * smaller_size:
                    current_block.append(lines[i])
                else:
                    blocks.append(current_block)
                    current_block = [lines[i]]
            blocks.append(current_block)

            # Convert blocks to output format
            output_blocks = []
            for bi, block in enumerate(blocks):
                # Build text preserving spaces between words and lines
                lines_text = []
                for line in block:
                    words_text = []
                    for w in line:
                        words_text.append("".join(c["text"] for c in w))
                    lines_text.append(" ".join(words_text))
                full_text = " ".join(lines_text).strip()
                if not full_text:
                    continue
                all_chars = [c for line in block for w in line for c in w]

                x0 = min(c["x0"] for c in all_chars)
                x1 = max(c["x1"] for c in all_chars)
                y0 = min(c["top"] for c in all_chars)
                y1 = max(c["bottom"] for c in all_chars)

                # Mode font size
                sizes = [c.get("size", 10) or 10 for c in all_chars]
                size_counts = Counter(sizes)
                mode_size = size_counts.most_common(1)[0][0] if size_counts else 10

                # Font name detection
                fontnames = [c.get("fontname", "") or "" for c in all_chars]
                fontname_counts = Counter(fontnames)
                dominant_font = fontname_counts.most_common(1)[0][0] if fontname_counts else ""

                font_family = map_pdf_font(dominant_font)
                fontname_lower = dominant_font.lower()
                if any(x in fontname_lower for x in ["black", "heavy"]):
                    font_weight = 900
                elif "semibold" in fontname_lower:
                    font_weight = 600
                elif "medium" in fontname_lower:
                    font_weight = 500
                elif "bold" in fontname_lower:
                    font_weight = 700
                else:
                    font_weight = 400
                font_style = "italic" if any(x in fontname_lower for x in ["italic", "oblique"]) else "normal"

                # Color
                color_objs = [c.get("non_stroking_color") for c in all_chars if c.get("non_stroking_color")]
                if color_objs:
                    # PDF colors are 0.0-1.0 floats
                    color = color_objs[0]
                    if isinstance(color, (list, tuple)) and len(color) >= 3:
                        r = max(0, min(255, round(color[0] * 255)))
                        g = max(0, min(255, round(color[1] * 255)))
                        b = max(0, min(255, round(color[2] * 255)))
                        css_color = f"rgb({r},{g},{b})"
                    else:
                        css_color = "rgb(0,0,0)"
                else:
                    css_color = "rgb(0,0,0)"

                is_all_caps = False
                alpha_chars = [c for c in full_text if c.isalpha()]
                if len(alpha_chars) > 2 and all(c.isupper() for c in alpha_chars):
                    is_all_caps = True

                line_count = len(block)

                # pdfplumber's top is from top of page — use directly for CSS
                block_height = y1 - y0

                output_blocks.append({
                    "id": f"p{page_num}_b{bi}",
                    "text": full_text,
                    "x": round(x0, 2),
                    "y": round(y0, 2),
                    "width": round(x1 - x0, 2),
                    "height": round(block_height, 2),
                    "fontSize": round(mode_size, 1),
                    "fontWeight": font_weight,
                    "fontStyle": font_style,
                    "fontFamily": font_family,
                    "color": css_color,
                    "isAllCaps": is_all_caps,
                    "isLikelyHeading": False,  # computed below
                    "lineCount": line_count,
                })

            # Compute isLikelyHeading for each block
            if output_blocks:
                median_size = sorted(b["fontSize"] for b in output_blocks)[len(output_blocks) // 2]
                for b in output_blocks:
                    is_heading = b["fontSize"] >= median_size * 1.3 or b["fontWeight"] >= 600
                    is_caps_short = b["isAllCaps"] and len(b["text"]) < 40
                    b["isLikelyHeading"] = is_heading or is_caps_short

            doc_pages.append({
                "pageNumber": page_num,
                "width": round(width, 2),
                "height": round(height, 2),
                "blocks": output_blocks,
            })

        # Dominant font across entire document
        if all_font_sizes:
            font_size_counts = Counter(all_font_sizes)
            dom_size = font_size_counts.most_common(1)[0][0]
        else:
            dom_size = 10

        # Count families across all blocks
        all_families = []
        for pg in doc_pages:
            for b in pg["blocks"]:
                all_families.append(b["fontFamily"])
        family_counts = Counter(all_families) if all_families else Counter({"sans-serif": 1})
        dom_family = family_counts.most_common(1)[0][0]

        return {
            "pages": doc_pages,
            "dominantFontSize": round(dom_size, 1),
            "dominantFontFamily": dom_family,
            "pageCount": len(doc_pages),
        }


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 3:
        print(json.dumps({
            "error": "Usage: python3 extract_pdf.py --mode text|layout <path-to-pdf>",
        }))
        sys.exit(1)

    mode = sys.argv[1]
    path = sys.argv[2]

    if mode != "--mode" or len(sys.argv) < 3:
        print(json.dumps({"error": "Expected --mode flag as first argument"}))
        sys.exit(1)

    mode_value = sys.argv[2]
    pdf_path = sys.argv[3] if len(sys.argv) > 3 else ""

    if not pdf_path:
        print(json.dumps({"error": "No file path provided"}))
        sys.exit(1)

    try:
        if mode_value == "text":
            result = mode_text(pdf_path)
        elif mode_value == "layout":
            result = mode_layout(pdf_path)
        else:
            result = {"error": f"Unknown mode: {mode_value}"}
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
