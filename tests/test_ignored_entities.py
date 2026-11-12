"""#8: an ignored device loses its Pulse entities instead of keeping them unavailable; watched again, they return."""

from __future__ import annotations

from datetime import timedelta

from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr, entity_registry as er

from common import tick
from custom_components.pulse.const import DOMAIN


def _own(hass: HomeAssistant, device_id: str) -> dict[str, str]:
    """Pulse's own entities on the device: unique_id → entity_id."""
    return {
        e.unique_id: e.entity_id
        for e in er.async_get(hass).entities.values()
        if e.platform == DOMAIN and e.device_id == device_id
    }


async def test_ignore_switch_removes_and_restores_entities(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    thermo_id = setup["devices"]["thermo"].device_id
    before = _own(hass, thermo_id)
    assert len(before) == 3

    monitor.update_device(thermo_id, {"ignored": True})
    await hass.async_block_till_done()
    assert _own(hass, thermo_id) == {}
    assert all(hass.states.get(entity_id) is None for entity_id in before.values())
    # The device stays known with its record, only its entities are gone
    assert monitor.devices[thermo_id].ignored
    assert thermo_id in monitor.store.devices
    # Nothing comes back on the next passes
    await tick(hass, setup["freezer"], timedelta(minutes=2))
    monitor._rediscover()
    await hass.async_block_till_done()
    assert _own(hass, thermo_id) == {}

    monitor.update_device(thermo_id, {"ignored": False})
    await hass.async_block_till_done()
    assert _own(hass, thermo_id) == before
    reg = er.async_get(hass)
    for entity_id in before.values():
        entry = reg.async_get(entity_id)
        assert entry is not None
        if entry.disabled_by is None:
            assert hass.states.get(entity_id).state != "unavailable"
    # "Last report" is off by default and comes back off, the others on
    assert sorted(reg.async_get(e).disabled_by is None for e in before.values()) == [False, True, True]


async def test_ignore_label_on_device_removes_entities(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    thermo_id = setup["devices"]["thermo"].device_id
    before = _own(hass, thermo_id)
    dr.async_get(hass).async_update_device(thermo_id, labels={"pulse_ignore"})
    await tick(hass, setup["freezer"], timedelta(seconds=10))
    assert monitor.devices[thermo_id].ignored
    assert _own(hass, thermo_id) == {}
    dr.async_get(hass).async_update_device(thermo_id, labels=set())
    await tick(hass, setup["freezer"], timedelta(seconds=10))
    assert _own(hass, thermo_id) == before


async def test_ignored_device_gets_no_entities_after_reload(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    thermo_id = setup["devices"]["thermo"].device_id
    monitor.update_device(thermo_id, {"ignored": True})
    await hass.async_block_till_done()
    await monitor.store.async_save()
    await hass.config_entries.async_reload(setup["entry"].entry_id)
    await hass.async_block_till_done()
    assert setup["entry"].runtime_data.devices[thermo_id].ignored
    assert _own(hass, thermo_id) == {}


async def test_ignore_label_on_own_entity_keeps_it(hass: HomeAssistant, setup):
    """The label sits on a Pulse entity: removing it would take the label along and end the ignore."""
    monitor = setup["monitor"]
    door_id = setup["devices"]["door"].device_id
    before = _own(hass, door_id)
    status = next(e for u, e in before.items() if u.endswith("_status"))
    er.async_get(hass).async_update_entity(status, labels={"pulse_ignore"})
    await tick(hass, setup["freezer"], timedelta(seconds=10))
    assert monitor.devices[door_id].ignored
    await tick(hass, setup["freezer"], timedelta(minutes=2))
    assert _own(hass, door_id) == before
    assert monitor.devices[door_id].ignored
