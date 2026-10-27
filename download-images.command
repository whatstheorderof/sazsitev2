#!/bin/bash
# Downloads every image from the old Format site into this folder.
# Double-click this file in Finder (or run: bash download-images.command).
# originals/      full-size copies (2500px) — your archive, not uploaded to the web
# assets/img/     web versions (max 1600px) used by the site
# assets/img/thumbs/  small versions (max 640px) for grids
cd "$(dirname "$0")" || exit 1
total=$(grep -c . images-manifest.tsv); n=0; fail=0
resize() { # src dest maxpx
  local w h
  w=$(sips -g pixelWidth "$1" 2>/dev/null | awk '/pixelWidth/{print $2}')
  h=$(sips -g pixelHeight "$1" 2>/dev/null | awk '/pixelHeight/{print $2}')
  if [ -n "$w" ] && { [ "$w" -gt "$3" ] || [ "$h" -gt "$3" ]; }; then
    sips -Z "$3" "$1" --out "$2" >/dev/null 2>&1 || cp "$1" "$2"
  else cp "$1" "$2"; fi
}
echo "Downloading $total images from Format..."
while IFS=$'\t' read -r path url; do
  [ -z "$path" ] && continue
  n=$((n+1)); rel="${path#assets/img/}"
  orig="originals/$rel"; thumb="assets/img/thumbs/$rel"
  mkdir -p "$(dirname "$orig")" "$(dirname "$path")" "$(dirname "$thumb")"
  if [ ! -s "$orig" ]; then
    if ! curl -fsSL --retry 3 --connect-timeout 20 -o "$orig" "$url"; then
      echo; echo "Failed: $path"; rm -f "$orig"; fail=$((fail+1)); continue
    fi
  fi
  [ -s "$path" ] || resize "$orig" "$path" 1600
  [ -s "$thumb" ] || resize "$orig" "$thumb" 640
  printf "\r%d of %d" "$n" "$total"
done < images-manifest.tsv
echo; echo "Done. $((total-fail)) saved, $fail failed."
[ "$fail" -gt 0 ] && echo "Run this again to retry the failed ones."
