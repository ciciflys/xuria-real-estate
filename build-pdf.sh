#!/bin/bash
# Regenerate the investor-pack PDF from investor-pack.html using Chrome headless.
# Run from the repo root after editing investor-pack.html.

cd "$(dirname "$0")"

"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new \
  --disable-gpu \
  --no-pdf-header-footer \
  --print-to-pdf-no-header \
  --print-to-pdf="figueretes-property.pdf" \
  --virtual-time-budget=15000 \
  --hide-scrollbars \
  "file://$(pwd)/investor-pack.html"

echo "✓ Regenerated figueretes-property.pdf"
ls -lh figueretes-property.pdf
