"""Test-HA: zehn Tage Vorgeschichte für die Fake-Geräte in .storage/pulse.devices schreiben.

Nur bei gestopptem Container ausführen (HA überschreibt den Speicher sonst beim Beenden):
    docker stop pulse-test && python3 dev/seed_store.py && docker start pulse-test

Szenarien (Stand beim Start):
- Aquarium Temperatur: alle ~30 min, seit 5 Tagen still → Ausgefallen
- Türkontakt Wohnungstür: seit 3,5 Tagen still, Türschloss (Partner) weiter aktiv → Prüfen
- Thermometer Keller: alle ~30 min, seit 5 h 52 min still → wird nach ein paar Minuten Ausgefallen
- alle anderen: gesund, mit Tagesrhythmus
"""

from __future__ import annotations

import json
from pathlib import Path
import random
import time

CONFIG = Path.home() / "Software/pulse-test/config/.storage"
DAY = 86400.0
HOUR = 3600.0

random.seed(42)
now = time.time()
start = now - 10 * DAY


def periodic(every: float, jitter: float, until: float) -> list[float]:
    out, t = [], start + random.uniform(0, every)
    while t < until:
        out.append(t)
        t += every + random.uniform(-jitter, jitter)
    return out


def daytime(per_day: tuple[int, int], until: float, hours: tuple[int, int] = (7, 23)) -> list[float]:
    out: list[float] = []
    day = start - (start % DAY) - 2 * HOUR  # ungefähr Mitternacht Ortszeit (UTC+2)
    while day < until:
        for _ in range(random.randint(*per_day)):
            t = day + random.uniform(hours[0] * HOUR, hours[1] * HOUR)
            if start <= t < until:
                out.append(t)
        day += DAY
    return sorted(out)


def merged(*lists: list[float]) -> list[float]:
    return sorted({round(t, 3) for lst in lists for t in lst})


door_actions = daytime((10, 18), now - 3.5 * DAY)
lock_actions = daytime((6, 12), now)
fridge_actions = daytime((3, 8), now)
window_actions = daytime((4, 10), now)
motion_actions = daytime((5, 15), now)
presence_actions = daytime((30, 60), now)

PROFILES: dict[str, dict[str, object]] = {
    "Aquarium Temperatur": {"events": periodic(30 * 60, 5 * 60, now - 5 * DAY)},
    "Thermometer Bad": {"events": periodic(30 * 60, 5 * 60, now)},
    "Thermometer Keller": {"events": periodic(30 * 60, 4 * 60, now - (5 * HOUR + 52 * 60))},
    "Fensterkontakt Schlafzimmer": {
        "events": merged(window_actions, periodic(4 * HOUR, HOUR, now)),
        "actions": window_actions,
    },
    "Türkontakt Wohnungstür": {
        "events": merged(door_actions, periodic(4 * HOUR, HOUR, now - 3.5 * DAY)),
        "actions": door_actions,
        "partner": "Türschloss",
    },
    "Lecksensor Bad": {"events": periodic(50 * 60, 5 * 60, now)},
    "Bewegungsmelder Terrasse": {
        "events": merged(motion_actions, periodic(3 * HOUR, HOUR, now)),
        "actions": motion_actions,
    },
    "Kontaktsensor Gefrierschrank": {
        "events": merged(fridge_actions, periodic(4 * HOUR, HOUR, now)),
        "actions": fridge_actions,
    },
    "Türschloss": {"events": merged(lock_actions, periodic(2 * HOUR, 30 * 60, now)), "actions": lock_actions},
    "Präsenzmelder Büro": {
        "events": merged(presence_actions, periodic(20 * 60, 5 * 60, now)),
        "actions": presence_actions,
    },
}


def main() -> None:
    devices = json.loads((CONFIG / "core.device_registry").read_text())["data"]["devices"]
    by_name = {d.get("name_by_user") or d.get("name"): d["id"] for d in devices}
    path = CONFIG / "pulse.devices"
    data = (
        json.loads(path.read_text())
        if path.exists()
        else {"version": 1, "minor_version": 1, "key": "pulse.devices", "data": {}}
    )
    store = data["data"].setdefault("devices", {})
    for name, profile in PROFILES.items():
        device_id = by_name.get(name)
        if device_id is None:
            print("fehlt:", name)
            continue
        record = store.setdefault(device_id, {})
        record["events"] = profile["events"]
        record["actions"] = profile.get("actions", [])
        record["first_seen"] = start
        record["notified"] = None
        partner = profile.get("partner")
        if isinstance(partner, str):
            record["partner"] = by_name.get(partner)
    path.write_text(json.dumps(data))
    print(f"{len(PROFILES)} Geräte vorbelegt → {path}")


if __name__ == "__main__":
    main()
