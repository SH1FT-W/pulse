"""Partner-Vorschläge: Geräte, deren Aktionen regelmäßig zusammen auftreten – ohne HA-Abhängigkeit.

Ein Partner dient der Gegenprobe: war er mehrfach aktiv und dieses Gerät nicht, stimmt etwas nicht. Ein
guter Partner ist also einer, bei dessen Aktionen dieses Gerät fast immer auch etwas tut (Türkontakt +
Schloss, Präsenzmelder + Fensterkontakt im selben Raum). Gerechnet wird selten (einmal am Tag).
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field

DAY = 86400.0
# Aktionen so dicht beieinander gelten als „zusammen“
WINDOW = 120.0
# Mindestens so viele gemeinsame Aktionen an mindestens so vielen Tagen
MIN_TOGETHER = 3
MIN_DAYS = 2
# Anteil der Partner-Aktionen, bei denen das Gerät auch aktiv war (anderer Raum zählt weniger)
MIN_SCORE = 0.8
OTHER_AREA = 0.75
MAX_SUGGESTIONS = 3
# Nur die letzten Tage und je Gerät höchstens so viele (neueste) Aktionen – sehr aktive Melder sprengen sonst
# die Rechnung (150 Geräte × 2000 Aktionen kosteten über 8 s)
RECENT_DAYS = 7
MAX_ACTIONS = 300


@dataclass(frozen=True)
class PartnerInput:
    actions: Sequence[float]
    area: str | None = None
    wants: bool = True  # noch kein Partner gesetzt
    dismissed: frozenset[str] = field(default_factory=frozenset)


@dataclass(frozen=True)
class Suggestion:
    id: str
    score: float
    together: int


def suggest(devices: Mapping[str, PartnerInput]) -> dict[str, list[Suggestion]]:
    """Je Gerät (ohne Partner) bis zu drei Vorschläge, beste zuerst."""
    newest = max((item.actions[-1] for item in devices.values() if item.actions), default=0.0)
    recent = {
        device_id: [ts for ts in list(item.actions)[-MAX_ACTIONS:] if ts >= newest - RECENT_DAYS * DAY]
        for device_id, item in devices.items()
    }
    timeline = sorted((ts, device_id) for device_id, actions in recent.items() for ts in actions)
    # hits[a][b] = Aktionen von a (Index in timeline), bei denen b innerhalb des Fensters auch aktiv war
    hits: dict[str, dict[str, set[int]]] = {}
    for i, (ts, a) in enumerate(timeline):
        j = i + 1
        while j < len(timeline) and timeline[j][0] - ts <= WINDOW:
            b = timeline[j][1]
            if b != a:
                hits.setdefault(a, {}).setdefault(b, set()).add(i)
                hits.setdefault(b, {}).setdefault(a, set()).add(j)
            j += 1
    counts = {device_id: len(actions) for device_id, actions in recent.items()}
    result: dict[str, list[Suggestion]] = {}
    for device_id, item in devices.items():
        if not item.wants:
            continue
        found: list[Suggestion] = []
        for partner_id, partner in devices.items():
            if partner_id == device_id or partner_id in item.dismissed or not counts[partner_id]:
                continue
            # Partner-Aktionen, bei denen dieses Gerät dabei war
            together = hits.get(partner_id, {}).get(device_id, set())
            days = {int(timeline[i][0] // DAY) for i in together}
            if len(together) < MIN_TOGETHER or len(days) < MIN_DAYS:
                continue
            score = len(together) / counts[partner_id]
            if not (item.area and item.area == partner.area):
                score *= OTHER_AREA
            if score >= MIN_SCORE:
                found.append(Suggestion(partner_id, round(min(1.0, score), 2), len(together)))
        found.sort(key=lambda s: (-s.score, -s.together, s.id))
        if found:
            result[device_id] = found[:MAX_SUGGESTIONS]
    return result
