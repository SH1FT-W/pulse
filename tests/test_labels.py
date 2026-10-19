"""HA labels pulse_important/pulse_ignore, room in the push, summary on demand."""

from __future__ import annotations

from datetime import timedelta
import time

from homeassistant.core import HomeAssistant
from homeassistant.helpers import area_registry as ar, device_registry as dr, entity_registry as er

from common import seed, tick
from custom_components.pulse.const import DOMAIN


async def _settle(hass: HomeAssistant, setup) -> None:
    # Registry changes are picked up by a debounced rediscovery (5 s)
    await tick(hass, setup["freezer"], timedelta(seconds=10))


async def test_labels_decide_important_and_ignore(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    devices = setup["devices"]
    thermo_id = devices["thermo"].device_id
    thermo = monitor.devices[thermo_id]
    assert not thermo.critical and not thermo.ignored
    # Label on the device: important, the panel switch can no longer turn it off
    dr.async_get(hass).async_update_device(thermo_id, labels={"pulse_important"})
    await _settle(hass, setup)
    assert monitor.devices[thermo_id].critical
    monitor.update_device(thermo_id, {"critical": False})
    assert monitor.devices[thermo_id].critical
    assert next(d for d in monitor.snapshot()["devices"] if d["id"] == thermo_id)["label"] == "important"
    # Label on one of its entities: ignore wins over important
    er.async_get(hass).async_update_entity(devices["thermo"].entities["temperature"], labels={"pulse_ignore"})
    await _settle(hass, setup)
    thermo = monitor.devices[thermo_id]
    assert thermo.ignored
    assert thermo not in monitor.monitored()
    # Label removed: watched again, the switch counts again
    er.async_get(hass).async_update_entity(devices["thermo"].entities["temperature"], labels=set())
    dr.async_get(hass).async_update_device(thermo_id, labels=set())
    await _settle(hass, setup)
    thermo = monitor.devices[thermo_id]
    assert not thermo.ignored and not thermo.critical


async def test_label_on_own_entity_counts(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    door_id = setup["devices"]["door"].device_id
    own = next(
        e.entity_id
        for e in er.async_get(hass).entities.values()
        if e.platform == DOMAIN and e.device_id == door_id and e.translation_key == "status"
    )
    er.async_get(hass).async_update_entity(own, labels={"pulse_ignore"})
    await _settle(hass, setup)
    assert monitor.devices[door_id].ignored


async def test_label_ignore_silences_a_failed_device(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    thermo_id = setup["devices"]["thermo"].device_id
    dr.async_get(hass).async_update_device(thermo_id, labels={"pulse_ignore"})
    await _settle(hass, setup)
    seed(monitor, thermo_id, 1800, 200, time.time() - 7 * 3600)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert setup["pushes"] == []


async def test_push_names_the_room_unless_the_name_has_it(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    devices = setup["devices"]
    areas = ar.async_get(hass)
    kitchen = areas.async_create("Küche")
    bath = areas.async_create("Bad")
    dr.async_get(hass).async_update_device(devices["thermo"].device_id, area_id=kitchen.id)
    dr.async_get(hass).async_update_device(devices["leak"].device_id, area_id=bath.id)
    await _settle(hass, setup)
    now = time.time()
    seed(monitor, devices["thermo"].device_id, 1800, 200, now - 7 * 3600)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    pushes = setup["pushes"]
    assert pushes[-1].data["title"] == "Aquarium Temperatur antwortet nicht"
    assert pushes[-1].data["message"].startswith("Küche · Seit 7 Stunden still")
    # "Lecksensor Bad" already says where it is
    seed(monitor, devices["leak"].device_id, 1800, 200, time.time() - 7 * 3600)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    leak = next(p for p in pushes if p.data["title"].startswith("Lecksensor Bad"))
    assert not leak.data["message"].startswith("Bad ·")


async def test_send_summary_service(hass: HomeAssistant, setup):
    response = await hass.services.async_call(DOMAIN, "send_summary", {}, blocking=True, return_response=True)
    assert response == {"sent": False}  # nothing to report, nothing sent
    assert setup["pushes"] == []
