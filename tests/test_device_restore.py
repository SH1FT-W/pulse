"""A device deleted from HA and paired again comes back with the same ID; its Pulse settings must survive.

HA keeps deleted devices (`deleted_devices` in the device registry) and restores the same device ID when an
integration creates a device with the same identifiers again (Z2M/ZHA re-pair, config entry removed and added
again). Pulse used to drop the record 5 s after the deletion: "ignored", battery type, partner, change history gone.
"""

from datetime import timedelta
import time
from unittest.mock import patch

from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr, entity_registry as er

from common import add_device, seed, source_entry, tick
from custom_components.pulse.monitor import GONE_KEEP


def _readd(hass: HomeAssistant, device_id: str) -> tuple[str, list[tuple[str, str, str, str | None]]]:
    """Delete the device, return a callable state to add it again with the same identifiers."""
    reg = dr.async_get(hass)
    ents = er.async_get(hass)
    old = reg.async_get(device_id)
    assert old is not None
    rows = [
        (e.domain, e.platform, e.unique_id, e.original_device_class)
        for e in er.async_entries_for_device(ents, device_id)
        if e.platform != "pulse"
    ]
    reg.async_remove_device(device_id)
    return device_id, rows


def _pair_again(hass: HomeAssistant, identifiers, name, rows) -> str:
    reg = dr.async_get(hass)
    ents = er.async_get(hass)
    entry = source_entry(hass)
    again = reg.async_get_or_create(config_entry_id=entry.entry_id, identifiers=identifiers, name=name)
    for domain, platform, uid, device_class in rows:
        ents.async_get_or_create(
            domain, platform, uid, device_id=again.id, config_entry=entry, original_device_class=device_class
        )
    return again.id


async def test_settings_survive_pairing_again(hass: HomeAssistant, setup) -> None:
    monitor = setup["monitor"]
    door = setup["devices"]["door"]
    monitor.update_device(door.device_id, {"battery_type": "CR2032"})
    monitor.set_ignored(door.device_id, True)
    device = dr.async_get(hass).async_get(door.device_id)
    assert device is not None
    identifiers, name = device.identifiers, device.name
    _, rows = _readd(hass, door.device_id)
    await tick(hass, setup["freezer"], timedelta(seconds=10))
    # Gone from HA: no Pulse entities left, the record waits
    assert door.device_id not in monitor.devices
    assert monitor.store.devices[door.device_id].get("gone_since") is not None
    again = _pair_again(hass, identifiers, name, rows)
    await tick(hass, setup["freezer"], timedelta(seconds=10))
    assert again == door.device_id
    assert monitor.store.devices[again]["battery_type"] == "CR2032"
    assert monitor.devices[again].ignored
    assert "gone_since" not in monitor.store.devices[again]


async def test_record_dropped_after_keep(hass: HomeAssistant, setup) -> None:
    monitor = setup["monitor"]
    door = setup["devices"]["door"]
    _readd(hass, door.device_id)
    await tick(hass, setup["freezer"], timedelta(seconds=10))
    assert door.device_id in monitor.store.devices
    # Another device changes later; the old record is still within GONE_KEEP
    await tick(hass, setup["freezer"], timedelta(days=10))
    monitor._rediscover()
    assert door.device_id in monitor.store.devices
    await tick(hass, setup["freezer"], timedelta(seconds=GONE_KEEP))
    monitor._rediscover()
    assert door.device_id not in monitor.store.devices


async def test_device_back_after_days_is_no_outage(hass: HomeAssistant, setup) -> None:
    """Deleted, paired again 3 days later: the time in between is no silence (no push, no repair issue)."""
    import time

    from homeassistant.helpers import issue_registry as ir

    from common import add_device, seed

    monitor = setup["monitor"]
    thermo = setup["devices"]["thermo"]
    tid = thermo.device_id
    seed(monitor, tid, 600, 500, time.time())
    monitor.update_device(tid, {"battery_type": "CR2032"})
    monitor._evaluate(monitor.devices[tid], time.time())
    dr.async_get(hass).async_remove_device(tid)
    await hass.async_block_till_done()
    monitor._rediscover()
    await hass.async_block_till_done()
    await tick(hass, setup["freezer"], timedelta(days=3))
    pushes = len(setup["pushes"])
    again = add_device(
        hass,
        "thermo",
        "Aquarium Temperatur",
        [("sensor", "temperature", "temperature"), ("sensor", "battery", "battery")],
        manufacturer="Tuya",
        model="Waterproof temperature sensor",
        ieee="0x0001",
    )
    assert again.device_id == tid
    hass.states.async_set(again.entities["battery"], "80")
    hass.states.async_set(again.entities["temperature"], "25.0")
    await hass.async_block_till_done()
    monitor._rediscover()
    await hass.async_block_till_done()
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    device = monitor.devices[tid]
    assert device.status in ("ok", "learning")
    assert setup["pushes"][pushes:] == []
    assert f"failed_{tid}" not in {issue for _, issue in ir.async_get(hass).issues}
    assert device.record["battery_type"] == "CR2032"  # settings stay


async def test_history_after_return_is_no_silence(hass: HomeAssistant, setup) -> None:
    monitor = setup["monitor"]
    tid = setup["devices"]["thermo"].device_id
    t0 = time.time()
    seed(monitor, tid, 600, 500, t0)
    old = list(monitor.devices[tid].record["events"])
    monitor._evaluate(monitor.devices[tid], time.time())
    dr.async_get(hass).async_remove_device(tid)
    await hass.async_block_till_done()
    monitor._rediscover()
    await hass.async_block_till_done()
    await tick(hass, setup["freezer"], timedelta(days=3))
    again = add_device(
        hass,
        "thermo",
        "Aquarium Temperatur",
        [("sensor", "temperature", "temperature"), ("sensor", "battery", "battery")],
        manufacturer="Tuya",
        model="Waterproof temperature sensor",
        ieee="0x0001",
    )
    hass.states.async_set(again.entities["battery"], "80")
    hass.states.async_set(again.entities["temperature"], "25.0")
    await hass.async_block_till_done()
    monitor._rediscover()
    await hass.async_block_till_done()
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    hass.states.async_set(again.entities["temperature"], "25.3")
    await hass.async_block_till_done()
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    d = monitor.devices[tid]
    new = list(d.record["events"])
    pushes = len(setup["pushes"])
    temp = again.entities["temperature"]
    fake = {temp: (old + new, [])}

    async def _load(*a, **k):
        return fake

    async def _out(*a, **k):
        return {}

    with (
        patch("custom_components.pulse.monitor.async_load_history", _load),
        patch("custom_components.pulse.monitor.async_load_outages", _out),
    ):
        await monitor.async_bootstrap()
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    await tick(hass, setup["freezer"], timedelta(minutes=30))
    assert d.status in ("ok", "learning", "watch"), (d.status, d.reason)
    assert setup["pushes"][pushes:] == []


async def test_return_with_old_battery_change_is_no_silence(hass: HomeAssistant, setup) -> None:
    monitor = setup["monitor"]
    tid = setup["devices"]["thermo"].device_id
    now = time.time()
    seed(monitor, tid, 600, 500, now)
    monitor.mark_replaced(tid, at=now - 60 * 86400)
    monitor._evaluate(monitor.devices[tid], time.time())
    dr.async_get(hass).async_remove_device(tid)
    await hass.async_block_till_done()
    monitor._rediscover()
    await hass.async_block_till_done()
    await tick(hass, setup["freezer"], timedelta(days=3))
    pushes = len(setup["pushes"])
    again = add_device(
        hass,
        "thermo",
        "Aquarium Temperatur",
        [("sensor", "temperature", "temperature"), ("sensor", "battery", "battery")],
        manufacturer="Tuya",
        model="Waterproof temperature sensor",
        ieee="0x0001",
    )
    assert again.device_id == tid
    # no states set yet (device paired, first values not in)
    monitor._rediscover()
    await hass.async_block_till_done()
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    d = monitor.devices[tid]
    await tick(hass, setup["freezer"], timedelta(hours=2))
    assert d.status in ("ok", "learning", "watch"), (d.status, d.reason)
    assert setup["pushes"][pushes:] == []


async def test_outage_start_before_deletion_is_forgotten(hass: HomeAssistant, setup) -> None:
    """Unreachable since before a restart, deleted, paired again and unavailable for a moment while pairing:
    its outage must not start at the old time (gegenprüfung round 3)."""
    monitor = setup["monitor"]
    tid = setup["devices"]["thermo"].device_id
    seed(monitor, tid, 600, 500, time.time())
    monitor._gone_before[tid] = time.time() - 5 * 86400  # as `_async_learn_outages` sets it on start
    dr.async_get(hass).async_remove_device(tid)
    await hass.async_block_till_done()
    monitor._rediscover()
    await hass.async_block_till_done()
    await tick(hass, setup["freezer"], timedelta(days=3))
    again = add_device(
        hass,
        "thermo",
        "Aquarium Temperatur",
        [("sensor", "temperature", "temperature"), ("sensor", "battery", "battery")],
        manufacturer="Tuya",
        model="Waterproof temperature sensor",
        ieee="0x0001",
    )
    hass.states.async_set(again.entities["battery"], "unavailable")
    hass.states.async_set(again.entities["temperature"], "unavailable")
    await hass.async_block_till_done()
    pushes = len(setup["pushes"])
    monitor._rediscover()
    await hass.async_block_till_done()
    device = monitor.devices[tid]
    await tick(hass, setup["freezer"], timedelta(minutes=5))
    assert device.unavailable_since is None or device.unavailable_since >= device.record["restored_at"]
    assert setup["pushes"][pushes:] == []
