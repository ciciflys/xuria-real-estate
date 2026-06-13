#!/bin/bash
# Generates the Figueretes property PDFs from two HTML source files.
#
# All four PDFs carry the same price (€479,000 — broker commission is included).
# The ONLY difference is branding:
#
#   PUBLIC  (Xuria-branded)   — downloaded from the "Property PDF" button on the
#                               public site. Carries the Xuria wordmark, since the
#                               visitor is already on xuriare.com.
#     → figueretes-property.pdf       (EN)
#     → figueretes-property-es.pdf    (ES)
#
#   AGENCY  (white-label)     — the discreet "For agencies" / "Para agencias"
#                               footer link. NO Xuria branding — wordmarks read
#                               "Figueretes" so brokers can share it with their
#                               own clients neutrally.
#     → figueretes-property-agency.pdf      (EN)
#     → figueretes-property-agency-es.pdf   (ES)
#
# The HTML sources (investor-pack.html / -es.html) are the canonical WHITE-LABEL
# version. The Xuria-branded public PDF is produced by swapping only the three
# class-targeted brand wordmarks (cover-brand, .brand footer, closing-brand) into
# a temp copy — the place-name "Figueretes" in headings/body is left untouched.

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

# Swap white-label wordmarks → Xuria branding. Class-qualified so only the
# wordmark spots change, never the "Figueretes" place name elsewhere.
brand_swap() {
  local src="$1"
  local tmp="$2"
  local bottom_loc="$3"   # cover-bottom location line to replace with the Xuria line
  sed -e 's|class="cover-brand">Figueretes<|class="cover-brand">Xuria<|' \
      -e 's|class="brand">Figueretes<|class="brand">Xuria<|g' \
      -e 's|class="closing-brand">Figueretes<|class="closing-brand">Xuria Real Estate<|' \
      -e "s|<span>${bottom_loc}</span>|<span>Xuria Real Estate</span>|" \
      "$src" > "$tmp"
}

echo "→ EN agency / white-label (€479,000)…"
render "investor-pack.html" "figueretes-property-agency.pdf"

echo "→ EN public / Xuria-branded (€479,000)…"
brand_swap "investor-pack.html" "investor-pack-branded.html" "Ibiza, Spain"
render "investor-pack-branded.html" "figueretes-property.pdf"
rm "investor-pack-branded.html"

echo "→ ES agency / white-label (€479.000)…"
render "investor-pack-es.html" "figueretes-property-agency-es.pdf"

echo "→ ES public / Xuria-branded (€479.000)…"
brand_swap "investor-pack-es.html" "investor-pack-branded-es.html" "Ibiza, España"
render "investor-pack-branded-es.html" "figueretes-property-es.pdf"
rm "investor-pack-branded-es.html"

echo
echo "✓ Done."
ls -lh figueretes-property*.pdf
