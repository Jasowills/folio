#!/usr/bin/env python3
"""Extract text from a PDF using pdfplumber with layout preservation.

Usage: python3 extract_pdf.py <path-to-pdf>

Outputs JSON to stdout: { "text": "...", "pages": N, "method": "pdfplumber" }
"""

import json
import sys

try:
    import pdfplumber
except ImportError:
    print(json.dumps({"error": "pdfplumber not installed", "text": "", "pages": 0, "method": "pdfplumber"}))
    sys.exit(1)


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file path provided", "text": "", "pages": 0, "method": "pdfplumber"}))
        sys.exit(1)

    path = sys.argv[1]

    try:
        with pdfplumber.open(path) as pdf:
            pages = len(pdf.pages)
            texts = []

            for page in pdf.pages:
                page_text = page.extract_text(layout=True) or ""
                texts.append(page_text)

            full_text = "\f".join(texts)
            print(json.dumps({"text": full_text, "pages": pages, "method": "pdfplumber"}))

    except Exception as e:
        print(json.dumps({"error": str(e), "text": "", "pages": 0, "method": "pdfplumber"}))
        sys.exit(1)


if __name__ == "__main__":
    main()
