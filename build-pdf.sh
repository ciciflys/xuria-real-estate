#!/bin/bash
# Generates four PDFs from two HTML source files:
#
#   English source: investor-pack.html
#     → figueretes-property.pdf            (private, €479,000 / 7.3% / 5.8%)
#     → figueretes-property-agency.pdf     (agency,  €499,000 / 7.0% / 5.6%)
#
#   Spanish source: investor-pack-es.html
#     → figueretes-property-es.pdf         (private ES, €479.000 / 7,3 % / 5,8 %)
#     → figueretes-property-agency-es.pdf  (agency  ES, €499.000 / 7,0 % / 5,6 %)
#
# The agency variants are produced by sed-substituting price + 2 yield values into
# a temporary copy of the source, so the single source file stays canonical.

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

agency_swap_en() {
  local src="$1"
  local tmp="$2"
  sed -e 's/€479,000/€499,000/g' \
      -e 's|>7\.3%<|>7.0%<|g' \
      -e 's|>5\.8%<|>5.6%<|g' \
      "$src" > "$tmp"
}

agency_swap_es() {
  local src="$1"
  local tmp="$2"
  # Spanish uses '.' as thousands separator and ',' as decimal, plus a non-breaking
  # space before % — match the exact patterns used in investor-pack-es.html.
  sed -e 's/€479\.000/€499.000/g' \
      -e 's|>7,3 %<|>7,0 %<|g' \
      -e 's|>5,8 %<|>5,6 %<|g' \
      "$src" > "$tmp"
}

echo "→ EN private  (€479,000)…"
render "investor-pack.html" "figueretes-property.pdf"

echo "→ EN agency   (€499,000)…"
agency_swap_en "investor-pack.html" "investor-pack-agency.html"
render "investor-pack-agency.html" "figueretes-property-agency.pdf"
rm "investor-pack-agency.html"

echo "→ ES private  (€479.000)…"
render "investor-pack-es.html" "figueretes-property-es.pdf"

echo "→ ES agency   (€499.000)…"
agency_swap_es "investor-pack-es.html" "investor-pack-agency-es.html"
render "investor-pack-agency-es.html" "figueretes-property-agency-es.pdf"
rm "investor-pack-agency-es.html"

echo
echo "✓ Done."
ls -lh figueretes-property*.pdf
