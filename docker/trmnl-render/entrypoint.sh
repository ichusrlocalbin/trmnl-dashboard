#!/bin/sh
# Starts Xvfb for Firefox, then runs trmnlp with the given arguments.
set -eu
# The trmnlp image is built after starting Firefox once, which leaves a stale lock behind.
rm -f /tmp/.X99-lock /tmp/.X11-unix/X99
Xvfb :99 -nolisten tcp >/tmp/xvfb.log 2>&1 &
i=0
until [ -e /tmp/.X11-unix/X99 ]; do
  i=$((i + 1))
  if [ "$i" -gt 100 ]; then
    echo "Xvfb did not start:" >&2
    cat /tmp/xvfb.log >&2
    exit 1
  fi
  sleep 0.1
done
export DISPLAY=:99
exec /app/bin/trmnlp "$@"
