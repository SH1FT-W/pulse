# Changelog

After 1.1.0, releases use calendar versions `YY.M.N` (year, month, number of the release in that month), e.g. `26.10.4`. They count as newer than every 1.x version, so updates through HACS work as before.

## 26.10.15 – 2026-10-31

### Added
- **Add any device by hand** (#2). Under *Settings → Added by hand → Add device* you pick a device Pulse does not watch by itself: a camera, an Echo or HomePod, a TV, a robot vacuum, a NAS or any other network device. Pulse then tells you when it is no longer reachable. What decides: a connectivity sensor of the device (not a "mop attached" or "cloud" link) or a router's device tracker (UniFi, FRITZ!Box, Nmap; `not_home` = offline, a GPS tracker's only means away), otherwise its camera, media player, vacuum, mower or alarm panel, else its lamp, plug or remote, else all its entities, and only when all of them are unavailable at the same time. Playing, idle or off is no outage. Silence only counts for devices that usually report regularly, cloud devices keep their calmer rules, the battery of such a device is ignored (a charging vacuum is no battery change), and ignoring (switch or `pulse_ignore` label) works as for every device. It works whether or not mains-powered devices are watched, and a newly added device learns its rhythm and past outages from the recorder right away. The minus button in the same list removes it again, its Pulse entities go with it. "New in Pulse" says so.

### Fixed
- Ready for Home Assistant 2026.11: some integrations (Tuya, Z-Wave, ESPHome, MQTT, Reolink dual-lens cameras) now file a device's channels, endpoints or lenses as *child devices*. Pulse counts the entities of child devices for their parent device again, so a sensor keeps its contact or button as an action, a power strip keeps its sockets in the mains beta, and labels on a child device apply to the device. Child devices never show up as devices of their own. Nothing changes for older Home Assistant versions.
- Connectivity sensors that say nothing about a device being reachable (a Shelly's cloud link, a router's WAN or internet, a mop attached) no longer decide whether an automatically found device is reachable. A Shelly with its cloud switched off stays fine, and a router counts as gone only when it is offline, not when the internet is down.

## 26.10.14 – 2026-10-26

### Fixed
- An unreachable device that is also silent showed *silent* as its reason. Being unreachable explains the silence, so at the same level Pulse now says *unreachable*; a worse silence still wins.
- Device icons come from what a device is: Pulse looks at its regular entities first and at diagnostic or settings entities only if nothing else fits. An ESPHome camera no longer gets a thermometer from its chip temperature sensor, a smoke detector whose smoke sensor is filed under diagnostics keeps its icon. Cameras get a camera icon, room thermostats a radiator.

## 26.10.13 – 2026-10-26

### Fixed
- 26.10.12 could drop days of real reports of a mains-powered device and show it as *Silent for 10 days* for a moment after a restart. It took one entity that is often unavailable on its own (a camera's siren, whose normal state is "unknown") for the whole device, and did not count "unknown" as being there. Now only "unavailable" means gone, and a device counts as gone only while all of its deciding entities (lamp, plug, siren …) are unavailable at the same time. Stored reports are removed only for such outages of the whole device. The dropped reports come back from the recorder on the next start.

## 26.10.12 – 2026-10-26

### Changed
- The room next to a device name is right-aligned against the rhythm bar, so names and rooms each form a clean column. On phones it stays below the name.

### Fixed
- While a mains-powered device itself is unreachable, what its other entities still report is no longer counted as a sign of life. Some integrations rewrite every entity on each poll, also when the lamp is gone (Govee's "connection mode" diagnostic sensor), which drew a healthy-looking rhythm bar through the outage. On start Pulse also removes such reports it had already stored for outages it finds in the recorder. This is a general rule, not a list of integrations: a lamp that works keeps all its reports.

## 26.10.11 – 2026-10-26

### Fixed
- An unreachable device showed the time of its last report instead of when it went: a Govee lamp gone for five days read *Failed · 2 min ago*, because its diagnostic sensors keep reporting on every cloud poll. Row time, rhythm bar ("Unreachable for 5 days", the bar stops where the outage began) and the device headline now start at the outage. The status sensor's `silent_since` is the start of the outage for unreachable devices (dashboards like Casora show the right time), and the new attribute `unavailable_since` has it on its own.

## 26.10.10 – 2026-10-26

### Fixed
- A battery device that was already unreachable before Home Assistant restarted (a Matter leak sensor, a lock, a Zigbee sensor with availability on) counted as unreachable only since the restart, as mains-powered devices did before 26.10.9. Pulse now takes the real start from the recorder for every device that is unreachable at start, also when Zigbee2MQTT reports it offline only after the history was read. Most battery devices were already caught by their silence; this matters for devices without a learned rhythm and for the reason shown ("unreachable" instead of "silent").

## 26.10.9 – 2026-10-26

### Changed
- **Watching mains-powered devices is on by default**, also in existing installations (once, with the update). Switch it off under *Settings*; it then stays off. "New in Pulse" says so.
- **Mains-powered devices from any integration.** Besides every device of the local integrations as before (Zigbee, Matter, ESPHome, Shelly …), Pulse now watches every device without a battery whose own integration gives it a lamp, plug, switch, cover, fan, thermostat, valve or lock (Govee cloud, Bluetooth aquarium lamps, Tuya local, VeSync …). Helpers on top of a device (template, group, powercalc, switch_as_x …) and service devices don't count; a helper's entities no longer decide which integration a device belongs to.
- **Learned availability.** Pulse remembers when a mains device went unavailable by itself and came back (live and from the recorder; outages that begin at a Home Assistant start, while integrations are still loading, don't count). With at least three such outages of 20 minutes or more in two weeks, being gone is that device's habit: *Watch* ("Normal for this device, it is often off or in standby"), no notification. Only when it stays away for more than twice its longest outage (at least a day) does it become *Check*. Replayed on a real home's last ten days: a Bluetooth aquarium lamp went from 5 alarms to 0, a camera from 11 to 3.

- **Own tab for settings.** *Notifications* is only about notifications now; watching mains-powered devices and the Zigbee2MQTT options moved to a new *Settings* tab. On a narrow phone the tab bar scrolls sideways instead of overflowing.
- **Rooms stand out.** In the overview and the device list, room headers are their own band with a count, no longer looking like a device row; devices under a room header no longer repeat the room name.

### Fixed
- An offline Govee lamp was never reported. Pulse did not know the Govee cloud integration, and a mains device only counted as unreachable when all of its entities were: diagnostic sensors that keep reporting (Govee's "last update" on every cloud poll) and a connectivity sensor that stays "on" kept it "reachable" forever. Now the lamp or plug itself decides (not its diagnostic sensors or config switches).
- A device that was already unreachable before Home Assistant restarted counted as unreachable only since the restart and showed *In rhythm* for the first 20 minutes. Pulse now takes the real start from the recorder, so a lamp gone for days is *Failed* right after the restart.

## 26.10.8 – 2026-10-19

### Added
- Home Assistant labels `pulse_important` and `pulse_ignore` on a device or one of its entities mark it important or ignored, without opening the panel. A label wins over the panel switch (shown as "Set by the Home Assistant label …"); `pulse_ignore` wins over `pulse_important`.
- Action `pulse.send_summary` sends the daily summary right away (response `sent`), e.g. from a button or a "good morning" automation.
- **Beta: mains-powered devices.** A switch under *Notifications → Beta* (off by default) lets Pulse also watch devices without a battery from local integrations (Zigbee via ZHA or Zigbee2MQTT, Z-Wave, Matter, Hue, deCONZ, ESPHome, Shelly, Tasmota, TP-Link, WLED and others). Mains-powered devices hang too: Pulse reports one that is no longer reachable, and one that usually reports regularly (e.g. a plug with a power meter) but went silent. A lamp or plug that only reports when used is *OK* while it is reachable. Turning the switch off removes them again.
- **Own notification texts.** Under *Notifications → Texts* each kind of notification about one device (Failed, Check, Battery, Back again) gets its own title and text, starting from Pulse's sentence. Placeholders `{name}`, `{area}`, `{reason}`, `{model}`, `{manufacturer}`, `{integration}`, with a live preview on one of your devices. Empty values disappear together with their " · " separator.
- **Five languages.** Panel, notifications, reasons and the integration's texts in English, German, French, Spanish and Dutch. Pulse follows the language of your profile (panel) and of Home Assistant (notifications).

### Changed
- **Less strict at night.** Pulse now also learns each device's daily pause: the longest gap that comes back on most days (at least three days of data). A sensor that reports every ten minutes by day but not at all at night (a light sensor in the dark, a presence sensor in an empty room) no longer becomes *Watch*, *Check* or even *Failed* every night; its limits start from that pause. A device that stays silent much longer than its usual pause is still reported. Replayed on a real home's last five days: the nightly false alarms of a Matter motion sensor (5× *Failed*, 6× *Check*) and the hourly *Watch* flicker of several sensors are gone, real outages remain.
- Notifications about a single device start with its room (e.g. "Kitchen · Silent for 7 hours …"), unless the device name already contains it. Helps when several rooms have a device with the same name.

## 26.10.7 – 2026-10-18

### Changed
- Reachable devices that report on their own all the time (longest normal gap up to three hours, e.g. a Matter presence sensor or a Netatmo outdoor module) are judged by silence again. If such a device stays silent much longer than usual while the integration still reports it reachable, Pulse shows *Check* ("still on the air, but no values"), never *Failed*. Reachable devices that only report on events (leak sensor, lock, window contact, rain gauge) stay *OK* as in 26.10.6.

## 26.10.6 – 2026-10-18

### Changed
- Devices that their integration reports as reachable (Matter, cloud connectivity sensor) are never judged by silence anymore, not even after a week. A leak sensor without water has nothing to report, so 26.10.5's *Watch* ("not used") after seven days was wrong. Such devices are *OK*, also before Pulse has learned a rhythm; an outage still shows as unreachable.

## 26.10.5 – 2026-10-18

### Changed
- Devices whose integration knows if they are reachable (Matter devices and cloud devices with a connectivity sensor, e.g. Netatmo) are no longer judged by silence. A lock that is only used now and then, or a rain gauge on a dry day, stays *OK* as long as the integration reports it reachable; after a week without use it becomes *Watch* ("not used"). When the integration loses the device, Pulse reports it as unreachable as before.
- The device sheet grows smoothly when *Settings* are opened (where the browser supports it), scrolls them into view and may be taller on large screens.
- Devices without a learned rhythm (they only report on actions) become *Watch* after two days of silence and *Check* only after a week. They no longer show up in the daily summary after two quiet days; the README and the panel's learning hint say so.
- `sensor.<device>_pulse_last_report` is disabled by default: every report would be a recorder row. Enable it in the entity settings if an automation needs it.
- Stored data is written far less often: the uptime stamp is saved every five minutes instead of every minute, new reports wait ten minutes, settings and actions one minute. Stopping still saves immediately.
- Non-admin users no longer receive notification recipients or persons in the panel's live data.
- The diagnostics download no longer contains device IDs of partners or dismissed partner suggestions.
- `pulse.snooze` accepts up to 8760 hours (one year) in the actions UI as well, matching the service schema.
- Log messages are in English.

### Fixed
- After every Home Assistant restart, the state rows HA rewrites on start were read back from the recorder as reports, so a silent device looked alive again ("last report" at the restart time). They are ignored now, and stored ones are removed once.
- Cloud devices still carried the reports of every cloud poll from before 1.1, so Pulse expected a report every few minutes (a Netatmo rain gauge went to *Watch* within an hour without rain). Their reports are rebuilt once from real value changes.
- `pulse_device_status_changed` fired for the first evaluation after a start when the recorder history changed the verdict.
- A battery or "battery low" entity provided by another integration (for example a template sensor) counted as a sign of life.
- Undoing an automatically detected battery change did not remove the report that had been inserted with it.
- Registry changes of Pulse's own entities and cosmetic entity changes no longer trigger a device rediscovery.

### Development
- CI: HACS validation runs on push and weekly, actions in the issue triage are pinned to commits, translations are checked for completeness, and a weekly job tests against the latest Home Assistant. Issue form for bug reports. Panel component tests with happy-dom.

## 26.10.4 – 2026-10-16

### New version numbers
- From now on Pulse uses calendar versions: **year.month.release of that month**. `26.10.4` is the fourth Pulse
  release in October 2026; the next month starts again at `.1` (e.g. `26.11.1`).
- The jump from `1.1.0` to `26.10.4` is intended. Home Assistant and HACS see `26.10.4` as newer than every `1.x`,
  so the update is offered as usual.
- The "What's new" sheet explains the new numbers once.

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
