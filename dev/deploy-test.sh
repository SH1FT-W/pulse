#!/bin/sh
# Pulse + Fake-Geräte in den Test-HA (Docker pulse-test, Port 8126) kopieren und neu starten.
set -e
cd "$(dirname "$0")/.."
DEST="$HOME/Software/pulse-test/config/custom_components"
rm -rf "$DEST/pulse" "$DEST/pulse_fake"
cp -R custom_components/pulse "$DEST/pulse"
cp -R dev/pulse_fake "$DEST/pulse_fake"
find "$DEST/pulse" "$DEST/pulse_fake" -name __pycache__ -prune -exec rm -rf {} +
[ "$1" = "--no-restart" ] || docker restart pulse-test >/dev/null
echo "pulse-test aktualisiert"
