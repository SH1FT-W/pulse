# Changelog

After 1.1.0, releases use calendar versions `YY.M.N` (year, month, number of the release in that month), e.g. `26.10.4`. They count as newer than every 1.x version, so updates through HACS work as before.

## 1.1.0 – 2026-10-16

### New
- **Battery forecast:** Pulse estimates how long a battery will last ("about 2–5 months") from Home Assistant's long-term statistics. Devices with coarse or unreliable levels honestly show no forecast. The battery card lists what is due in the next eight weeks.
- **"Radio, but no values":** with Zigbee2MQTT's health check (enabled only after you confirm in the panel), Pulse notices devices that still talk to the network but no longer send readings.
- **Missing battery entity:** a device whose battery sensor has been unavailable for a day while it keeps reporting gets its own reason.
- **Cloud outages:** when several devices of a cloud integration (e.g. Netatmo, Ring) go quiet together, Pulse sends one calm message instead of an alarm per device. A cloud's polling is no longer taken as a sign of life.
- **Partner suggestions:** Pulse suggests devices that are regularly active together; accept or dismiss them in the device sheet.

### Fixed
- A grouped notification was queued again every minute during quiet hours.
- Stored data was only written at shutdown while devices kept reporting.
- After a longer Home Assistant downtime all devices were reported as failed. The time Home Assistant was off no longer counts as silence.
- Zigbee2MQTT replays after a restart arrived later than expected and counted as signs of life, hiding real failures.
- A single Zigbee2MQTT message with battery and voltage could be taken as a battery change.
- A device's own "battery low" sensor now wins over a contradicting percentage.
- Devices no longer monitored keep no orphaned Pulse entities.
- Headline, rhythm bar and reason now agree on when a silence started; a single stray report after a long silence no longer counts as recovery, a real action does.
- Less work in the event loop with many or chatty devices.

### Panel
- The headline puts problems first ("3 devices need you") and only glows when everything is in rhythm.
- Times older than five days show a date; important devices carry a star and can be marked from the menu.
- "Battery replaced" is the main action only when the battery is the likely cause; clearer, consistent wording; better phone layout; empty and connection-lost states keep the last view.

## 1.0.1 – 2026-10-13

Checked against the Home Assistant Integration Quality Scale (self-assessed: Platinum, see
`custom_components/pulse/quality_scale.yaml`).

- **Download diagnostics** under *Settings → Devices & services → Pulse*: the state of every monitored device,
  Zigbee2MQTT and the settings, without device names, recipients or persons.
- README: known limitations, troubleshooting and removal.
- Platforms declare `PARALLEL_UPDATES`; type checking is now `mypy --strict`.

## 1.0.0 – 2026-10-08

First version: passive monitoring of battery devices, rhythm learning from history, Zigbee2MQTT signs of life,
cross-checks, battery change detection, configurable notifications, repairs, panel.

- A notification that was recorded as sent but never delivered (restart during quiet hours) is sent again
  after the quiet hours. A device that recovered while Home Assistant was off is reported again when it fails next.
- When three or more devices go silent in the same minute (hub or bridge down), Pulse sends one message instead of
  one per device, and never a critical one.
- The daily summary catches up when Home Assistant was down at summary time (up to two hours late) and survives a
  restart while it is waiting for quiet hours or someone coming home.
- Zigbee2MQTT is retried every five minutes when the MQTT broker was not ready at startup.
- Devices that only report "battery low" as on or off no longer get an invented percentage; they become *Check*
  with their own reason (`battery_low_flag`).
- The panel shows reasons in the user's language, not the server's, and follows the time format from the user's
  profile (12 h or 24 h).
- `pulse.snooze` rejects more than a year; removing the integration deletes its stored data; reading history no
  longer blocks the event loop for chatty devices.
- Battery change detection only from real reports: no more false “battery replaced” after a Home Assistant or
  Zigbee2MQTT restart (stricter voltage rule, confirmation by the next report, re-joins only after real silence).
  Change notifications only when the change fixed something; bursts are bundled or dropped.
- Sound bar accessories (e.g. battery rear speakers) are no longer monitored.
- A device that disappears for good (e.g. its integration was replaced) takes its Pulse entities and stored data
  with it, so a successor device gets the old entity IDs instead of `_2`.
- Times without data (Home Assistant not running) are hatched instead of looking like silence.
- “Battery replaced” from a notification no longer triggers the same alert again right away: silence is counted
  from the replacement.
- Zigbee2MQTT: a stale `last_seen` in payloads (option switched off) is ignored, friendly names with `/` work,
  and the base topic can be changed in the panel.
- Quiet hours: only the latest waiting notification per device is delivered; a device that failed and recovered
  during the night sends nothing.
- The daily summary is not sent twice after a restart; “due soon” uses the current battery level.
- Voltages reported in volts (e.g. ZHA) are converted to mV for display and change detection.
- Heartbeat calendar rows follow real calendar days (daylight saving time).
- Changing reasons are no longer written to the recorder every minute; history is read in small batches at startup.
- After *Battery replaced* the device shows “waiting for the first report”; *Undo* no longer re-sends the alert.
- Important devices send *Check* right away; critical alerts only when an important device fails; Android gets
  high priority and the alarm channel.
- The daily summary respects quiet hours and “only when someone is home” and mentions how many more devices need a look.
- “Only when someone is home” accepts several people.
- Attributes and events carry `reason_key`, `silent_since` and `device_id` for automations; entities are only
  written when something changed.
- The panel can be opened by every user (read only for non-admins), so tapping a notification works for everyone.
- Rhythm learning is cached, very chatty devices are thinned to one report per 2 minutes so 7 days fit.
- Reloading Pulse while it is still starting no longer leaves a second watcher behind.
- README: installation, how Pulse decides, notifications, Zigbee2MQTT, entities, events and an example automation.
