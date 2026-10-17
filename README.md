<p align="center"><img src="docs/images/logo.png" alt="" width="112"></p>

<h1 align="center">Pulse</h1>

<p align="center"><b>Notices when a battery device goes quiet. Before you do.</b></p>

<p align="center">
  <a href="https://github.com/SH1FT-W/pulse/releases"><img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fapi.github.com%2Frepos%2FSH1FT-W%2Fpulse%2Freleases%2Flatest&query=%24.tag_name&label=release&color=6d5dfc" alt="Latest release"></a>
  <a href="https://github.com/SH1FT-W/pulse/actions/workflows/ci.yml"><img src="https://github.com/SH1FT-W/pulse/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/SH1FT-W/pulse/actions/workflows/hassfest.yml"><img src="https://github.com/SH1FT-W/pulse/actions/workflows/hassfest.yml/badge.svg" alt="Hassfest"></a>
  <a href="custom_components/pulse/quality_scale.yaml"><img src="https://img.shields.io/badge/quality%20scale-platinum%20(self--assessed)-6d5dfc" alt="Integration Quality Scale: Platinum, self-assessed"></a>
  <a href="https://hacs.xyz"><img src="https://img.shields.io/badge/HACS-custom%20repository-41bdf5" alt="HACS custom repository"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache%202.0-lightgrey" alt="Apache 2.0"></a>
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/overview-dark.png">
    <img src="docs/images/overview-light.png" alt="The Pulse overview: a big headline saying 3 devices need you, 7 of 10 in rhythm below it, and one rhythm strip per device. A silent aquarium thermometer breaks off into a red dashed line." width="900">
  </picture>
</p>

A door contact runs out of battery. Home Assistant keeps showing the last state it heard, and the battery
sensor keeps showing 94 %. Nobody notices until an automation misfires a week later.

Pulse is a Home Assistant integration that watches every battery-powered device for you. It learns how often
each device normally reports and tells you when one stops. It only listens and never polls, so it costs no
battery and no airtime.

## What it does

- **Learns the rhythm of every device** from the last ten days of recorder history. No learning week.
- **Status in plain words.** Good, Watch, Check or Failed, always with a reason: *Silent for 5 days. Usually
  reports every 30 minutes.*
- **Ignores restart echoes.** Values that Zigbee2MQTT or Home Assistant replay after a restart never count as a
  sign of life.
- **Zigbee signs of life.** One switch turns on `last_seen` and availability in Zigbee2MQTT, so Pulse also sees
  reports that didn't change a value.
- **Cross-check.** Pair devices that fire together, such as a lock and its door contact. If one keeps reporting
  and the other falls silent, Pulse notices early. Pulse also suggests partners on its own: devices that were
  active together on several days show up in the device sheet, where you accept or dismiss them.
- **Battery changes.** Detects a new battery from a voltage or level jump or a Zigbee re-join, keeps a history,
  knows the battery type of common models and ignores the meaningless percentage of NiMH rechargeables.
- **Battery forecast.** From Home Assistant's long-term statistics Pulse estimates how long a battery will last,
  as a rough range such as "about 2 to 5 months". The battery card lists what is due in the next eight weeks, so
  you know what to buy.
- **Radio, but no values.** With the Zigbee2MQTT health check, Pulse notices devices that still talk to the
  network but no longer send readings.
- **Cloud outages stay calm.** When several devices of one cloud integration (Netatmo, Ring and others) go quiet
  together, that is the cloud, not the batteries. Pulse shows them as *Watch* and sends one message.
- **Notifications you control.** Right away, in a daily summary or off, per level. Quiet hours, critical alerts
  for important devices, "only when someone is home", action buttons in the notification. Never the same message
  twice. When a hub or bridge takes many devices down at once, you get one message instead of forty.
- **Repairs.** Failed devices show up under *Settings → Repairs* and disappear on their own.
- **A panel that reads like a dashboard.** One headline that puts problems first, a seven day rhythm strip per
  device, a heartbeat calendar per device, and the notification settings. Important devices carry a star.

## Installation

[![Open in HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=SH1FT-W&repository=pulse&category=integration)

1. Click **Open in HACS** above, or add `https://github.com/SH1FT-W/pulse` by hand under HACS → *Integrations* → ⋮ →
   *Custom repositories* (type *Integration*).
2. Install **Pulse** and restart Home Assistant (2026.9 or newer).
3. *Settings → Devices & services → Add integration → Pulse*. One click. Pulse finds your battery devices itself.
4. Open **Pulse** in the sidebar. Admins can change everything, other users see the panel read only.

Pulse monitors every device that has a battery sensor (`device_class: battery`), including devices that only
report "battery low" as on or off. Phones, tablets, vacuums, mowers and devices with power or energy sensors are
skipped on purpose. If a device is missing, check that it has a battery entity and that the entity is enabled.

**Without HACS:** download the [latest release](https://github.com/SH1FT-W/pulse/releases/latest), copy its
`custom_components/pulse` folder into `/config/custom_components/`, restart Home Assistant and add the integration.

### Updates and version numbers

Updates arrive through HACS like any other integration. Pulse uses calendar versions **`YY.M.N`**: two-digit
year, month without a leading zero, and the number of the release in that month. `26.10.4` is the fourth release
of October 2026, and the next month starts again at `.1`. There is no major, minor or patch anymore; every
release, feature or fix, simply gets the next number. The jump from `1.1.0` to `26.10.4` was intended: Home
Assistant and HACS see `26.10.x` as newer than every `1.x`, so updates are offered as usual. After an update the
panel shows what is new once.

## How Pulse decides

Pulse needs about seven reports from a device to know its rhythm. With recorder history this is there right away.
Devices the recorder doesn't record start as *Learning*.

From the gaps between reports Pulse learns a typical gap and a longest normal gap. The current silence is compared
with them:

| Status | Normal device | Important device (lock, leak, smoke, gas) |
|---|---|---|
| Watch | 2.5 × typical gap (at least 45 min) | 2 × (at least 30 min) |
| Check | 4 × typical gap (at least 2 h) | 3 × (at least 1 h) |
| Failed | 8 × typical gap (at least 6 h) | 5 × (at least 3 h) |

Unreachable devices (Zigbee2MQTT availability, Matter, entities that are unavailable) become *Check* after
20 minutes and *Failed* after 2 hours (important devices: 10 minutes and 1 hour). A battery at 20 % or less is
*Watch*, at 10 % or less *Check*. NiMH rechargeables are exempt because their percentage says nothing. A device
that only reports "battery low" becomes *Check* when it does.

The time Home Assistant was not running never counts as silence. After a start, a device that has not reported
yet waits for one usual gap as *Watch*, without a notification. After a long silence, one or two stray reports don't count as
recovery. Two reports in the usual rhythm do, and so does a real action such as a door opening.

A few more reasons have their own wording:

- **Battery entity missing.** The battery sensor has been unavailable for a day while the rest of the device
  keeps reporting. Pulse says so instead of guessing a level.
- **"Battery low" wins.** If a device has its own "battery low" sensor and it is on, that counts, even when the
  percentage still looks fine.
- **Radio, but no values.** Zigbee2MQTT still counts messages from the device, but nothing new arrives in Home
  Assistant. This is at most *Check*, never *Failed*, and it does not count as a sign of life.
- **Cloud devices.** For cloud integrations only a real change of value counts as a sign of life, because the
  cloud's polling repeats old values. A single cloud device becomes *Failed* after a day at the earliest.

After *Battery replaced* the silence counts from the replacement, and the device shows "waiting for the first
report" until it reports again.

<p align="center">
  <img src="docs/images/detail.png" alt="Device detail: a headline reading Silent for 5 days, the buttons Remind tomorrow and Battery replaced, a heartbeat calendar with one row per day where the silent days are red dashed lines, and the battery with its forecast status." width="520">
</p>

## Notifications

Pulse sends to the Home Assistant Companion app (`notify.mobile_app_*`). As long as you don't change the
recipient list, new phones are added automatically.

- **Levels.** *Failed*, *Check* and *Battery* each go right away, in the daily summary, or not at all. Important
  devices send *Check* right away unless it is off.
- **Quiet hours and "only when someone is home"** hold notifications back and deliver them afterwards. Only the
  latest message per device is kept. A device that failed and recovered during the night sends nothing.
- **Critical alerts** break through Do Not Disturb when an important device fails. On iOS the Companion app needs
  permission for critical alerts. On Android they use the `alarm_stream` channel.
- **Buttons** in the notification work for everyone: *Battery replaced* records a replacement, *Remind tomorrow*
  stays quiet for 24 hours.
- **One message for an outage.** If three or more devices go silent in the same minute, Pulse sends a single
  non-critical message naming them, because that is almost always a hub or bridge, not the batteries. The same
  goes for a cloud outage: one calm message for the integration instead of one alarm per device.
- **Batteries to buy.** The daily summary mentions batteries that are forecast to run out in the next eight
  weeks. It only goes out because of a battery when one is due now.
- **The daily summary** waits for quiet hours and for someone to come home. If Home Assistant was down at summary
  time, the summary is sent up to two hours late.

<p align="center">
  <img src="docs/images/notifications.png" alt="Notification settings: recipients, the levels Failed, Check and Battery with Right away or Daily, times for the daily summary and quiet hours, critical alerts, only when someone is home." width="900">
</p>

## Zigbee2MQTT

Pulse listens to `zigbee2mqtt/#` (the base topic can be changed in the panel). With one switch it enables two
bridge options: `last_seen`, a timestamp on every message so Pulse also sees reports without a new value, and
availability. Battery devices send nothing extra. Note that with availability turned on, Home Assistant shows
silent Zigbee devices as unavailable, and Zigbee2MQTT pings mains powered routers.

A second, separate switch turns on Zigbee2MQTT's health check (Zigbee2MQTT 2.x). The bridge then publishes a
message counter per device, and Pulse notices devices that keep talking to the network but no longer send values.
Both switches are the only things Pulse ever writes, and only after you confirm them in the panel. You find them
in the welcome sheet and under *Notifications → Zigbee2MQTT*. Battery devices send nothing extra.

If the MQTT broker starts later than Home Assistant, Pulse keeps trying every five minutes.

<table>
  <tr>
    <td width="50%" align="center"><img src="docs/images/welcome.png" alt="The welcome sheet: Pulse listens. Knows every rhythm, only listens, tells you in time, and a switch for Zigbee signs of life." width="420"></td>
    <td width="50%" align="center"><img src="docs/images/iphone-dark.png" alt="Pulse on an iPhone in dark mode: the headline, the rhythm strips glowing in the dark, failed devices first." width="300"></td>
  </tr>
  <tr>
    <td align="center"><sub><b>Welcome</b>: what Pulse does, one switch for Zigbee signs of life</sub></td>
    <td align="center"><sub><b>iPhone</b>: dark mode, the strips glow</sub></td>
  </tr>
</table>

## Entities, events and actions

Per monitored device, attached to the device itself as diagnostic entities:

| Entity | State | Attributes |
|---|---|---|
| `binary_sensor.<device>_pulse_problem` | on for Check or Failed | `status`, `reason_key` |
| `sensor.<device>_pulse_status` | `ok`, `learning`, `watch`, `check`, `failed` | `reason_key`, `silent_since`, `typical_interval` (s), `critical`, `snoozed_until` |
| `sensor.<device>_pulse_last_report` | time of the last report | |

Overall: `sensor.pulse_problems` (count, attribute `devices` with `device_id`, `name`, `status`, `reason_key`,
`reason`) and `sensor.pulse_monitored_devices`. Ignored devices are unavailable.

`reason_key` is one of `ok_rhythm`, `learning`, `silent`, `silent_new`, `silent_strays`, `unavailable`, `partner`,
`battery_low`, `battery_low_flag`, `battery_soon`, `battery_missing`, `radio_only`, `cloud_outage`,
`startup_waiting`, `waiting_first`.

**Events**

- `pulse_device_status_changed`: `device_id`, `name`, `status`, `previous`, `reason`, `reason_key`. Fired when the
  status changes, not for the first evaluation after a start.
- `pulse_battery_replaced`: `device_id`, `name`, `source` (`manual`, `auto` from a voltage or level jump, `announce`
  from a Zigbee re-join after silence).

**Actions:** `pulse.mark_replaced`, `pulse.snooze` (`hours`, 0 cancels), `pulse.ignore`, `pulse.send_test`.

Example: flash a light when an important device fails.

```yaml
triggers:
  - trigger: event
    event_type: pulse_device_status_changed
    event_data:
      status: failed
conditions:
  - condition: template
    value_template: "{{ not trigger.event.data.reason_key.startswith('battery') }}"
actions:
  - action: light.turn_on
    target:
      entity_id: light.hallway
    data:
      flash: long
```

## Known limitations

- **Only devices with a battery entity.** Pulse finds devices through `device_class: battery` (a percentage or a
  "battery low" switch). Devices without one are not monitored.
- **Quiet by design is hard to tell from dead.** A device that only reports when something happens, with no
  periodic battery report, has no rhythm. Pulse learns the longest normal gap, but a door that is rarely opened
  stays in *Learning* or *Watch* longer.
- **Stuck values are not silence.** A sensor that keeps reporting the same wrong value counts as alive. Pulse
  watches whether a device talks, not whether what it says is right.
- **Zigbee2MQTT `last_seen` in payloads.** If the bridge option was once on and is now off, Zigbee2MQTT keeps
  sending a frozen timestamp. Pulse ignores `last_seen` unless the option is on.
- **History needs the recorder.** Entities excluded from the recorder start in *Learning* after every install.
- **Notifications only through the Companion app** (`notify.mobile_app_*`). For anything else, use the
  `pulse_device_status_changed` event in an automation.
- **NiMH rechargeables** never get a battery warning from their percentage, only from silence.
- **Cloud integrations come from a fixed list.** Pulse knows the common cloud integrations (Netatmo, Ring, Nest,
  tado and others). A cloud integration that is not on the list is treated like a local one.
- **Forecasts need usable percentages.** Pulse only forecasts when the battery level falls in fine steps over at
  least two weeks. Coarse levels (100, 50, 0), flat or noisy values, NiMH rechargeables and devices that only
  report "battery low" get no forecast, and the panel says why.

## Troubleshooting

- **A device is missing.** Check that it has a battery entity, that the entity is enabled, and that the device is
  not a phone, vacuum, mower or a device with power or energy sensors (skipped on purpose).
- **A device shows *Failed* although it works.** Open it in the panel: the reason says what Pulse saw. If it
  reports rarely, wait a few days for the rhythm to settle, mark it as important or not, or ignore it.
- **No notifications.** Use *Send test notification* in the panel (or `pulse.send_test`) and check the recipients
  and the levels.
- **Diagnostics.** *Settings → Devices & services → Pulse → ⋮ → Download diagnostics* gives the state of every
  monitored device without names, recipients or persons. Attach it to an issue.
- **Debug logging:**

  ```yaml
  logger:
    logs:
      custom_components.pulse: debug
  ```

## Removal

1. *Settings → Devices & services → Pulse → ⋮ → Delete*. This removes the panel, the Pulse entities on your
   devices, open repairs and the stored data (`.storage/pulse.devices`).
2. If you turned on Zigbee signs of life, `last_seen` and availability stay on in Zigbee2MQTT. Switch them off in
   Zigbee2MQTT under *Settings → Advanced* and *Settings → Availability* if you don't want them.
3. Remove Pulse in HACS and restart Home Assistant.

## Privacy

Pulse runs entirely inside your Home Assistant. It reads the recorder, listens to state changes and MQTT, and
sends notifications through the Companion app. Nothing leaves your network.

## Development

```
cd frontend && corepack yarn install && corepack yarn build   # panel → custom_components/pulse/www
python -m pytest -q                                          # needs pytest-homeassistant-custom-component
dev/deploy-test.sh                                           # copy into a Docker test instance
```

`dev/pulse_fake` simulates a Zigbee2MQTT bridge (including `last_seen`, availability, restart echoes and battery
changes) plus a few non-MQTT devices for testing. `dev/seed_store.py` writes ten days of history for them.

Issues and ideas are welcome in the [issue tracker](https://github.com/SH1FT-W/pulse/issues).

License: Apache 2.0
