#!/bin/sh
# Pulse + Fake-Geräte in den Test-HA (ha-venv, Port 8126; MQTT: uvx amqtt auf 1883) kopieren und neu starten.
set -e
cd "$(dirname "$0")/.."
DEST="$HOME/Software/pulse-test/config/custom_components"
rm -rf "$DEST/pulse" "$DEST/pulse_fake"
cp -R custom_components/pulse "$DEST/pulse"
cp -R dev/pulse_fake "$DEST/pulse_fake"
find "$DEST/pulse" "$DEST/pulse_fake" -name __pycache__ -prune -exec rm -rf {} +
[ "$1" = "--no-restart" ] || tools/ha-venv.sh restart "$HOME/Software/pulse-test/config" 8126 >/dev/null
echo "pulse-test aktualisiert"
