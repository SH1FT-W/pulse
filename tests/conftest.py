"""Fixtures für alle Tests."""

from homeassistant import config_entries
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType
import pytest
from pytest_homeassistant_custom_component.common import async_mock_service

from common import set_states, standard_devices
from custom_components.pulse.const import DOMAIN
from custom_components.pulse.monitor import PulseMonitor


@pytest.fixture(autouse=True)
def pulse_test_setup(request):
    """Eigene Integrationen erlauben, Texte und Entity-IDs auf Deutsch.

    Der Recorder muss vor `hass` starten – deshalb wird er (falls gewünscht) zuerst geholt.
    """
    if "recorder_mock" in request.fixturenames:
        request.getfixturevalue("recorder_mock")
    request.getfixturevalue("enable_custom_integrations")
    hass = request.getfixturevalue("hass")
    hass.config.language = "de"


START = "2026-10-03 10:00:00+00:00"  # 12:00 Ortszeit (Europe/Berlin) – außerhalb der Ruhezeit


@pytest.fixture
async def setup(hass: HomeAssistant, freezer):
    await hass.config.async_set_time_zone("Europe/Berlin")
    freezer.move_to(START)
    devices = standard_devices(hass)
    set_states(hass, devices)
    pushes = async_mock_service(hass, "notify", "mobile_app_alex")
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": config_entries.SOURCE_USER})
    assert result["type"] is FlowResultType.FORM
    assert result["description_placeholders"] == {"count": "4"}
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()
    entry = hass.config_entries.async_entries(DOMAIN)[0]
    monitor: PulseMonitor = entry.runtime_data
    return {"devices": devices, "monitor": monitor, "pushes": pushes, "entry": entry, "freezer": freezer}
