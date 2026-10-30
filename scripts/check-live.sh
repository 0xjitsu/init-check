#!/usr/bin/env bash
# Verify the link-preview tags and video on a deployed URL.
# Usage: scripts/check-live.sh https://init-check.vercel.app
set -uo pipefail

URL="${1:-}"
if [ -z "$URL" ]; then
  echo "usage: $0 <url>" >&2
  exit 2
fi
URL="${URL%/}"
MAX=$((5 * 1024 * 1024))
fail=0
ok() { echo "ok   $1"; }
bad() { echo "FAIL $1"; fail=1; }

html="$(curl -fsSL --max-time 30 "$URL/")" || { echo "FAIL could not fetch $URL/"; exit 1; }

for tag in og:title og:description og:image og:video og:video:secure_url og:video:type og:video:width og:video:height \
           twitter:card twitter:player twitter:player:width twitter:player:height; do
  if printf '%s' "$html" | grep -Eq "<meta[^>]*(property|name)=\"$tag\"[^>]*content=\"[^\"]+\""; then ok "tag $tag"; else bad "tag $tag missing"; fi
done

printf '%s' "$html" | grep -Eq 'property="og:video"[^>]*content="https://' && ok "og:video is absolute https" || bad "og:video is not an absolute https URL"
printf '%s' "$html" | grep -Eq 'name="twitter:card"[^>]*content="player"' && ok "twitter:card=player" || bad "twitter:card is not player"

video="$(printf '%s' "$html" | grep -Eo '<meta[^>]*property="og:video"[^>]*content="[^"]+"' | head -1 | sed -E 's/.*content="([^"]+)".*/\1/')"
[ -z "$video" ] && video="$URL/og/preview.mp4"

headers="$(curl -sSIL --max-time 30 "$video")" || { bad "could not request $video"; exit 1; }
status="$(printf '%s' "$headers" | grep -E '^HTTP' | tail -1 | awk '{print $2}')"
ctype="$(printf '%s' "$headers" | grep -i '^content-type:' | tail -1 | tr -d '\r' | awk '{print tolower($2)}')"
[ "$status" = "200" ] && ok "video returns 200" || bad "video status is $status"
case "$ctype" in video/mp4*) ok "content-type video/mp4";; *) bad "content-type is '$ctype'";; esac

size="$(curl -sSL --max-time 60 "$video" -o /dev/null -w '%{size_download}')"
if [ "$size" -gt 0 ] && [ "$size" -lt "$MAX" ]; then ok "video size $size bytes (< 5 MB)"; else bad "video size $size bytes"; fi

player="$(printf '%s' "$html" | grep -Eo '<meta[^>]*name="twitter:player"[^>]*content="[^"]+"' | head -1 | sed -E 's/.*content="([^"]+)".*/\1/')"
if [ -n "$player" ]; then
  pstatus="$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "$player")"
  [ "$pstatus" = "200" ] && ok "twitter:player page returns 200" || bad "twitter:player status $pstatus"
fi

exit $fail
