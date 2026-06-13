#!/bin/bash
# Generates the Figueretes property PDFs from two HTML source files.
#
#   English source: investor-pack.html
#     → figueretes-property.pdf            (€479,000 / 7.3% / 5.8%)
#     → figueretes-property-agency.pdf     (copy — same €479,000; broker commission
#                                            is included in the price, so the agency
#                                            and private versions are identical)
#
#   Spanish source: investor-pack-es.html
#     → figueretes-property-es.pdf         (€479.000 / 7,3 % / 5,8 %)
#     → figueretes-property-agency-es.pdf  (copy — same €479.000)
#
# The "-agency" filenames are retained because the discreet "For agencies" /
# "Para agencias" footer links and any bookmarked broker URLs point at them.
# Their content is identical to the public PDFs.

set -e
cd "$(dirname "$0")"

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

render() {
  local src="$1"
  local out="$2"
  "$CHROME" \
    --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf-no-header \
    --print-to-pdf="$out" \
    --virtual-time-budget=15000 --hide-scrollbars \
    "file://$(pwd)/$src" > /dev/null 2>&1
}

echo "→ EN  (€479,000)…"
render "investor-pack.html" "figueretes-property.pdf"
cp "figueretes-property.pdf" "figueretes-property-agency.pdf"

echo "→ ES  (€479.000)…"
render "investor-pack-es.html" "figueretes-property-es.pdf"
cp "figueretes-property-es.pdf" "figueretes-property-agency-es.pdf"

echo
echo "✓ Done."
ls -lh figueretes-property*.pdf
