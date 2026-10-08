import { css, html, LitElement, nothing, type PropertyValues } from 'lit';
import {
  defineOnce,
  dropdownValue,
  dropFocusAfterPointer,
  errorText,
  type HomeAssistant,
  navigateTo,
  showMenuButton,
  showToast,
  trackInput,
  type Unsubscribe,
} from './ha';
import type { DeviceFilter, GroupBy } from './logic';
import {
  canEdit,
  dayStartsOf,
  memoize,
  monitored,
  parseSpans,
  timeFormatOf,
  validTimeZone,
} from './logic';
import { WHATS_NEW, type ZigbeeOffer } from './pulse-welcome';
import { t } from './strings';
import { shared, tokens } from './styles';
import type { Settings, Snapshot, SnapshotMessage } from './types';
import { detectMode, markSeen, type StorageLike, type WelcomeMode } from './welcome';
import './pulse-device-sheet';
import './pulse-mark';
import './pulse-devices';
import './pulse-overview';
import './pulse-segmented';
import './pulse-settings';
import './pulse-sheet';

declare const __PULSE_VERSION__: string;

type View = 'overview' | 'devices' | 'settings';

interface Route {
  path: string;
  prefix: string;
}

/** Erster und größter Abstand zwischen zwei Abo-Versuchen nach einem Fehler (ms). */
const RETRY_FIRST = 2000;
const RETRY_MAX = 60_000;

/** localStorage, wenn der Browser ihn hergibt – sonst nichts (dann kommt kein Willkommen). */
function storage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Beim Laden entschieden – wie FLODE, bevor das Panel selbst etwas speichert. */
function startMode(): WelcomeMode | null {
  const store = storage();
  if (!store) return null;
  try {
    return detectMode(store, __PULSE_VERSION__, WHATS_NEW.length > 0);
  } catch {
    return null;
  }
}

/** Was aus `hass` die Anzeige ändert (alles andere – z. B. fremde Zustände – löst kein Rendern aus). */
function hassKey(hass: HomeAssistant): string {
  return [
    hass.language,
    hass.themes?.darkMode,
    hass.dockedSidebar,
    hass.kioskMode,
    hass.config?.time_zone,
    hass.locale?.time_format,
    hass.user?.is_admin,
  ].join('|');
}

/** Seitenleisten-Panel „Pulse“ im FLODE-Aufbau: Titel, Segmente, Aktionen; darunter die Ansicht. */
export class PulsePanel extends LitElement {
  static properties = {
    hass: { attribute: false },
    narrow: { type: Boolean },
    route: { attribute: false },
    snapshot: { state: true },
    now: { state: true },
    openId: { state: true },
    welcome: { state: true },
    error: { state: true },
    groupBy: { state: true },
    filter: { state: true },
    confirmZigbee: { state: true },
  };

  declare hass: HomeAssistant | undefined;
  declare narrow: boolean;
  declare route: Route | undefined;
  declare snapshot: SnapshotMessage | null;
  /** „Jetzt“ in Sekunden – nur im 30-s-Takt und bei neuem Snapshot, nicht bei jedem Rendern */
  declare now: number;
  declare openId: string | null;
  declare welcome: WelcomeMode | null;
  declare error: string | null;
  declare groupBy: GroupBy;
  /** Aus der Übersicht gewählter Filter der Geräteliste (vorübergehend, ändert die Gruppierung nicht) */
  declare filter: DeviceFilter | null;
  /** Rückfrage vor dem Schreiben in Zigbee2MQTT */
  declare confirmZigbee: boolean;

  private unsub: Promise<Unsubscribe> | null = null;
  private clock: number | undefined;
  private retryTimer: number | undefined;
  private retryDelay = RETRY_FIRST;
  private namesCache: { key: string; value: Record<string, string> } = { key: '{}', value: {} };

  /** Gleiche Eingabe → dasselbe Array, damit die Kinder nicht neu rendern */
  private readonly spans = memoize((raw: unknown) => parseSpans(raw));
  private readonly watched = memoize((devices: Snapshot['devices']) => monitored(devices));
  private readonly dayStarts = memoize((snap: Snapshot) => dayStartsOf(snap));

  constructor() {
    super();
    this.narrow = false;
    this.snapshot = null;
    this.now = Date.now() / 1000;
    this.openId = null;
    this.welcome = startMode();
    this.error = null;
    this.groupBy = 'area';
    this.filter = null;
    this.confirmZigbee = false;
  }

  private get language(): string {
    return this.hass?.language ?? 'en';
  }

  private get timeZone(): string | undefined {
    return validTimeZone(this.hass?.config?.time_zone);
  }

  private get timeFormat() {
    return timeFormatOf(this.hass?.locale?.time_format);
  }

  /** Nicht-Admins sehen alles, ändern aber nichts (der Server erlaubt ihnen nur Lesen). */
  private get readonly(): boolean {
    return !canEdit(this.hass?.user);
  }

  private get view(): View {
    const path = this.route?.path ?? '';
    // Mitteilungen gibt es nur für Admins
    if (path.startsWith('/settings')) return this.readonly ? 'overview' : 'settings';
    if (path.startsWith('/devices')) return 'devices';
    return 'overview';
  }

  private readonly onMenuHidden = (e: Event): void => {
    // Nur Menüs – kein Tooltip o. Ä., sonst verlöre z. B. das Suchfeld den Fokus
    const source = e.composedPath()[0];
    if (source instanceof HTMLElement && source.localName.endsWith('dropdown'))
      dropFocusAfterPointer();
  };

  connectedCallback(): void {
    super.connectedCallback();
    trackInput();
    // Alle Menüs (⋮, Auswahl, Gruppieren) melden das Schließen bis hierher (composed)
    this.addEventListener('wa-after-hide', this.onMenuHidden);
    this.openDeepLink();
    this.now = Date.now() / 1000;
    this.clock = window.setInterval(() => {
      this.now = Date.now() / 1000;
    }, 30_000);
    this.ensureSubscribed();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('wa-after-hide', this.onMenuHidden);
    window.clearInterval(this.clock);
    window.clearTimeout(this.retryTimer);
    this.retryTimer = undefined;
    this.unsubscribe();
  }

  private unsubscribe(): void {
    const unsub = this.unsub;
    this.unsub = null;
    // Auch das Abmelden selbst kann scheitern (Verbindung gerade weg) – beides still schlucken
    void unsub?.then(
      (u) => Promise.resolve(u()).catch(() => undefined),
      () => undefined
    );
  }

  /** Push-Link `/pulse?device=…`: Gerätedetail öffnen (auch wenn das Panel schon offen ist). */
  private deepLink = '';

  private openDeepLink(): void {
    const device = new URLSearchParams(location.search).get('device') ?? '';
    if (device && device !== this.deepLink) this.openId = device;
    this.deepLink = device;
  }

  protected willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('route')) this.openDeepLink();
    // Mitteilungen gibt es nur für Admins: die Adresse dazu passend ersetzen
    if (this.hass?.user && this.readonly && (this.route?.path ?? '').startsWith('/settings'))
      navigateTo('/pulse', true);
  }

  /**
   * HA setzt `hass` bei jeder Zustandsänderung im Haus neu. Neu gerendert wird nur, wenn sich etwas
   * ändert, das Pulse anzeigt (Sprache, Dunkelmodus, Seitenleiste, Zeitzone, Namen der Empfänger).
   */
  protected shouldUpdate(changed: PropertyValues<this>): boolean {
    this.ensureSubscribed();
    if (changed.size !== 1 || !changed.has('hass')) return true;
    const before = changed.get('hass');
    if (!before || !this.hass) return true;
    const names = this.namesCache.value;
    return hassKey(before) !== hassKey(this.hass) || this.names() !== names;
  }

  protected updated(): void {
    // Dunkelmodus: erhöhte Flächen für Blatt und aktives Segment (wie iOS)
    this.toggleAttribute('dark', this.hass?.themes?.darkMode === true);
  }

  /** Sprache, mit der das Abo läuft – ändert sie sich, wird neu abonniert (Begründungen kommen übersetzt). */
  private subscribedLanguage = '';

  private ensureSubscribed(): void {
    if (!this.hass || !this.isConnected) return;
    if (this.unsub && this.subscribedLanguage !== this.hass.language) this.unsubscribe();
    if (!this.unsub && this.retryTimer === undefined) this.subscribe();
  }

  private subscribe(): void {
    if (!this.hass) return;
    this.subscribedLanguage = this.hass.language;
    const promise = this.hass.connection.subscribeMessage<SnapshotMessage>(
      (snapshot) => {
        this.snapshot = snapshot;
        this.now = Date.now() / 1000;
        this.error = null;
        this.retryDelay = RETRY_FIRST;
      },
      { type: 'pulse/subscribe', language: this.hass.language }
    );
    this.unsub = promise;
    promise.catch((err: unknown) => {
      if (this.unsub !== promise) return;
      this.unsub = null;
      this.error = errorText(err);
      if (!this.isConnected) return;
      // Nicht bei jedem hass-Update neu versuchen, sondern mit wachsendem Abstand
      const delay = this.retryDelay;
      this.retryDelay = Math.min(delay * 2, RETRY_MAX);
      this.retryTimer = window.setTimeout(() => {
        this.retryTimer = undefined;
        this.ensureSubscribed();
      }, delay);
    });
  }

  private async call(
    message: Record<string, unknown> & { type: string },
    done?: string
  ): Promise<unknown> {
    if (!this.hass) return undefined;
    try {
      const result = await this.hass.callWS<unknown>(message);
      if (done) showToast(this, done);
      return result ?? null;
    } catch (err) {
      showToast(this, errorText(err));
      return undefined;
    }
  }

  private go(view: View): void {
    if (view !== 'devices') this.filter = null;
    navigateTo(view === 'overview' ? '/pulse' : `/pulse/${view}`);
  }

  private loaded(): Snapshot | null {
    const snap = this.snapshot;
    return snap === null || snap.loaded === false ? null : snap;
  }

  private onDeviceChange(id: string, changes: Record<string, unknown>): void {
    const device = this.loaded()?.devices.find((d) => d.id === id);
    void this.call({ type: 'pulse/device', device_id: id, ...changes });
    if (changes.ignored === true && device) {
      this.openId = null;
      showToast(this, t(this.language, 'ignored_done', { name: device.name }), {
        text: t(this.language, 'undo'),
        action: () => void this.call({ type: 'pulse/device', device_id: id, ignored: false }),
      });
    }
  }

  private async onReplaced(id: string): Promise<void> {
    const lang = this.language;
    const done = await this.call({ type: 'pulse/replaced', device_id: id });
    if (done === undefined) return;
    // Blatt schließen: ein offenes modales Blatt liegt über HAs Hinweis – „Rückgängig“ wäre nicht tippbar
    this.openId = null;
    showToast(this, t(lang, 'replaced_done'), {
      text: t(lang, 'undo'),
      action: () => void this.onUndoReplaced(id),
    });
  }

  private async onUndoReplaced(id: string): Promise<void> {
    const lang = this.language;
    const result = await this.call({ type: 'pulse/replaced_undo', device_id: id });
    if (result === undefined) return;
    const undone = Reflect.get(Object(result), 'undone') === true;
    showToast(this, t(lang, undone ? 'replaced_undone' : 'replaced_undo_failed'));
  }

  /** Herzschlag-Kalender fürs Gerätedetail (Server rechnet aus seinem Zwischenspeicher). */
  private readonly fetchHeartbeat = async (ids: string[]): Promise<unknown> => {
    if (!this.hass) return null;
    try {
      return await this.hass.callWS<unknown>({ type: 'pulse/heartbeat', device_ids: ids });
    } catch {
      return null;
    }
  };

  private async onConfirmZigbee(): Promise<void> {
    this.confirmZigbee = false;
    await this.call({ type: 'pulse/enable_z2m' }, t(this.language, 'zigbee_sent'));
  }

  private async onTest(): Promise<void> {
    const result = await this.call({ type: 'pulse/test' });
    if (result === undefined) return;
    const targets: unknown = Reflect.get(Object(result), 'targets');
    const count = Array.isArray(targets) ? targets.length : 0;
    showToast(
      this,
      count ? t(this.language, 'test_done', { count }) : t(this.language, 'test_none')
    );
  }

  private async onSummary(): Promise<void> {
    const result = await this.call({ type: 'pulse/summary' });
    if (result === undefined) return;
    showToast(
      this,
      t(this.language, Reflect.get(Object(result), 'sent') ? 'summary_sent' : 'summary_empty')
    );
  }

  private onMenu(event: Event): void {
    const value = dropdownValue(event);
    if (value === 'summary' && !this.readonly) void this.onSummary();
    else if (value === 'welcome') this.welcome = 'welcome';
    else if (value === 'integration') navigateTo('/config/integrations/integration/pulse');
  }

  private welcomeDone(): void {
    this.welcome = null;
    const store = storage();
    try {
      if (store) markSeen(store, __PULSE_VERSION__);
    } catch {
      // Ohne Speicher kommt das Blatt beim nächsten Mal wieder – kein Fehler
    }
  }

  private zigbeeOffer(snap: Snapshot): ZigbeeOffer {
    if (!snap.z2m.present || this.readonly) return 'none';
    return snap.z2m.last_seen && snap.z2m.availability ? 'on' : 'offer';
  }

  /**
   * Anzeigenamen für Empfänger (notify-Dienst → Gerät) und Personen. Bleibt dasselbe Objekt, solange
   * sich nichts ändert – so erkennt shouldUpdate, ob ein hass-Update die Anzeige betrifft.
   */
  private names(): Record<string, string> {
    const names: Record<string, string> = {};
    const states = this.hass?.states ?? {};
    const snap = this.loaded();
    for (const target of snap?.targets ?? []) {
      const name =
        states[`device_tracker.${target.replace(/^mobile_app_/, '')}`]?.attributes.friendly_name;
      if (typeof name === 'string') names[target] = name;
    }
    for (const person of snap?.persons ?? []) {
      const name = states[person]?.attributes.friendly_name;
      if (typeof name === 'string') names[person] = name;
    }
    const key = JSON.stringify(names);
    if (key !== this.namesCache.key) this.namesCache = { key, value: names };
    return this.namesCache.value;
  }

  /** „An Alex’ iPhone“ – wer die Mitteilungen bekommt (für das Tagesband). */
  private recipients(snap: Snapshot, names: Record<string, string>): string {
    const lang = this.language;
    const chosen = (snap.settings.targets ?? snap.targets).filter((x) => snap.targets.includes(x));
    if (!chosen.length) return t(lang, 'day_nobody');
    const label = (service: string) =>
      names[service] ?? service.replace(/^mobile_app_/, '').replaceAll('_', ' ');
    const first = chosen.slice(0, 2).map(label).join(', ');
    return t(lang, 'day_to', {
      names: chosen.length > 2 ? `${first} +${chosen.length - 2}` : first,
    });
  }

  private renderHead() {
    const lang = this.language;
    const tabs = [
      { value: 'overview', label: t(lang, 'tab_overview') },
      { value: 'devices', label: t(lang, 'tab_devices') },
      ...(this.readonly ? [] : [{ value: 'settings', label: t(lang, 'tab_notify') }]),
    ];
    return html`<header class="head">
      <div class="brand" title=${t(lang, 'subtitle')}>
        <pulse-mark flat></pulse-mark>
        <span>${t(lang, 'title')}</span>
      </div>
      <pulse-segmented
        .options=${tabs}
        .value=${this.view}
        .label=${t(lang, 'title')}
        @change=${(e: CustomEvent<{ value: string }>) => {
          const v = e.detail.value;
          if (v === 'overview' || v === 'devices' || v === 'settings') this.go(v);
        }}
      ></pulse-segmented>
    </header>`;
  }

  private renderView(snap: Snapshot) {
    const lang = this.language;
    const now = this.now;
    const zone = this.timeZone;
    const names = this.names();
    if (this.view === 'settings') {
      return html`<pulse-settings
        .snapshot=${snap}
        .language=${lang}
        .timeZone=${zone}
        .now=${now}
        .recipients=${this.recipients(snap, names)}
        .names=${names}
        @settings-change=${(e: CustomEvent<{ settings: Partial<Settings> }>) =>
          void this.call({ type: 'pulse/settings', settings: e.detail.settings })}
        @test=${() => void this.onTest()}
        @summary=${() => void this.onSummary()}
      ></pulse-settings>`;
    }
    if (this.view === 'devices') {
      return html`<pulse-devices
        .devices=${snap.devices}
        .language=${lang}
        .timeZone=${zone}
        .timeFormat=${this.timeFormat}
        .now=${now}
        .start=${snap.strip_start}
        .days=${snap.strip_days}
        .dayStarts=${this.dayStarts(snap)}
        .bucketHours=${snap.bucket_hours}
        .noData=${this.spans(snap.no_data)}
        .readonly=${this.readonly}
        .groupBy=${this.groupBy}
        .filter=${this.filter}
        @group-change=${(e: CustomEvent<{ group: GroupBy }>) => {
          this.groupBy = e.detail.group;
        }}
        @filter-clear=${() => {
          this.filter = null;
        }}
      ></pulse-devices>`;
    }
    return html`<pulse-overview
      .snapshot=${snap}
      .language=${lang}
      .timeZone=${zone}
      .timeFormat=${this.timeFormat}
      .now=${now}
      .dayStarts=${this.dayStarts(snap)}
      .noData=${this.spans(snap.no_data)}
      .recipients=${this.recipients(snap, names)}
      .readonly=${this.readonly}
      @show-devices=${(e: CustomEvent<{ filter: DeviceFilter | null }>) => {
        this.filter = e.detail.filter;
        this.go('devices');
      }}
      @show-settings=${() => this.go('settings')}
    ></pulse-overview>`;
  }

  private renderContent() {
    const lang = this.language;
    const snap = this.snapshot;
    if (this.error) return html`<ha-alert alert-type="error">${this.error}</ha-alert>`;
    if (!snap) return html`<p class="muted center">${t(lang, 'loading')}</p>`;
    if (snap.loaded === false)
      return html`<ha-alert alert-type="info">${t(lang, 'not_loaded')}</ha-alert>`;
    return this.renderView(snap);
  }

  render() {
    const snap = this.loaded();
    const lang = this.language;
    const open = snap?.devices.find((d) => d.id === this.openId) ?? null;
    return html`
      <div class="toolbar">
        ${showMenuButton(this.hass, this.narrow) ? html`<ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>` : nothing}
        <div class="toolbar-title">${t(lang, 'title')}</div>
        <ha-dropdown placement="bottom-end" @wa-select=${(e: Event) => this.onMenu(e)}>
          <ha-icon-button slot="trigger" .label=${t(lang, 'more')}>
            <ha-icon icon="mdi:dots-vertical"></ha-icon>
          </ha-icon-button>
          ${this.readonly ? nothing : html`<ha-dropdown-item value="summary"><ha-icon slot="icon" icon="mdi:text-box-outline"></ha-icon>${t(lang, 'summary_now')}</ha-dropdown-item>`}
          <ha-dropdown-item value="welcome"><ha-icon slot="icon" icon="mdi:hand-wave-outline"></ha-icon>${t(lang, 'show_welcome')}</ha-dropdown-item>
          ${this.readonly ? nothing : html`<ha-dropdown-item value="integration"><ha-icon slot="icon" icon="mdi:cog-outline"></ha-icon>${t(lang, 'open_integration')}</ha-dropdown-item>`}
        </ha-dropdown>
      </div>
      <main
        @open=${(e: CustomEvent<{ id: string }>) => {
          this.openId = e.detail.id;
        }}
        @replaced=${(e: CustomEvent<{ id: string }>) => void this.onReplaced(e.detail.id)}
        @later=${(e: CustomEvent<{ id: string }>) =>
          void this.call(
            { type: 'pulse/snooze', device_id: e.detail.id, hours: 24 },
            t(lang, 'later_done')
          )}
        @snooze-cancel=${(e: CustomEvent<{ id: string }>) =>
          void this.call(
            { type: 'pulse/snooze', device_id: e.detail.id, hours: 0 },
            t(lang, 'snooze_cancelled')
          )}
        @device-change=${(e: CustomEvent<{ id: string; changes: Record<string, unknown> }>) =>
          this.onDeviceChange(e.detail.id, e.detail.changes)}
        @enable-z2m=${() => {
          if (!this.readonly) this.confirmZigbee = true;
        }}
      >
        ${this.renderHead()} ${this.renderContent()}
        <p class="version muted">${t(lang, 'version', { version: __PULSE_VERSION__ })}</p>
        ${
          snap
            ? html`<pulse-device-sheet
                  .open=${open !== null}
                  .device=${open}
                  .devices=${this.watched(snap.devices)}
                  .language=${lang}
                  .timeZone=${this.timeZone}
                  .timeFormat=${this.timeFormat}
                  .now=${this.now}
                  .stripStart=${snap.strip_start}
                  .stripDays=${snap.strip_days}
                  .dayStarts=${this.dayStarts(snap)}
                  .bucketHours=${snap.bucket_hours}
                  .fetchHeartbeat=${this.fetchHeartbeat}
                  .batteryTypes=${snap.battery_types}
                  .chemistries=${snap.chemistries}
                  .noData=${this.spans(snap.no_data)}
                  .readonly=${this.readonly}
                  @sheet-closed=${() => {
                    this.openId = null;
                    if (location.search.includes('device=')) navigateTo(location.pathname, true);
                  }}
                ></pulse-device-sheet>
                <pulse-welcome
                  .mode=${this.welcome}
                  .language=${lang}
                  .version=${__PULSE_VERSION__}
                  .zigbee=${this.zigbeeOffer(snap)}
                  @closed=${() => this.welcomeDone()}
                  @enable-z2m=${() => {
                    this.confirmZigbee = true;
                  }}
                ></pulse-welcome>
                <pulse-sheet
                  no-close
                  .open=${this.confirmZigbee}
                  .heading=${t(lang, 'zigbee_confirm_title')}
                  .language=${lang}
                  @closed=${() => {
                    this.confirmZigbee = false;
                  }}
                >
                  <p class="confirm-text">${t(lang, 'zigbee_confirm_text')}</p>
                  <p class="confirm-text">${t(lang, 'zigbee_confirm_side')}</p>
                  <button slot="footer" class="pbtn" type="button" @click=${() => {
                    this.confirmZigbee = false;
                  }}>${t(lang, 'cancel')}</button>
                  <button slot="footer" class="pbtn primary" type="button" @click=${() => void this.onConfirmZigbee()}>
                    ${t(lang, 'zigbee_confirm_go')}
                  </button>
                </pulse-sheet>`
            : nothing
        }
      </main>
    `;
  }

  static styles = [
    tokens,
    shared,
    css`
      :host {
        display: block;
        min-height: 100%;
        /* Systemschrift (SF auf Apple-Geräten), sonst HAs Schrift */
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', var(--ha-font-family-body, Roboto), system-ui, sans-serif;
        -webkit-font-smoothing: antialiased;
        background: var(--primary-background-color);
        color: var(--primary-text-color);
        /* Eine Akzentfarbe: HAs Schalter, Fokus und Auswahl im Panel ebenfalls Pulse-Violett */
        --primary-color: var(--pu-accent);
        --accent-color: var(--pu-accent);
        --ha-switch-checked-background-color: var(--pu-accent);
        --ha-switch-checked-background-color-hover: var(--pu-accent-hi);
        --ha-switch-checked-border-color: var(--pu-accent);
        --ha-switch-checked-border-color-hover: var(--pu-accent-hi);
        --ha-color-fill-primary-normal-resting: color-mix(in srgb, var(--pu-accent) 12%, transparent);
        --ha-switch-checked-thumb-background-color: #fff;
        --ha-switch-checked-thumb-background-color-hover: #fff;
        /* Aus-Zustand passend zum iOS-An: weißer Knopf auf heller Spur, ohne Rand */
        --ha-switch-thumb-background-color: #fff;
        --ha-switch-thumb-background-color-hover: #fff;
        --ha-switch-background-color: color-mix(in srgb, var(--primary-text-color) 16%, transparent);
        --ha-switch-background-color-hover: color-mix(in srgb, var(--primary-text-color) 20%, transparent);
        --ha-switch-border-color: transparent;
        --ha-switch-border-color-hover: transparent;
      }
      /* Dunkel: tiefe Bühne (nur im Pulse-Bereich), damit die Leisten leuchten; Blatt und aktives
         Segment eine Stufe heller als die Seite (iOS „erhöht“) */
      :host([dark]) {
        background: var(--pulse-dark-background, #050507);
        --pulse-raised: color-mix(in srgb, var(--card-background-color, #1c1c1c) 82%, white);
        --pulse-sheet-bg: color-mix(in srgb, var(--card-background-color, #1c1c1c) 94%, white);
        --pulse-sheet-card: color-mix(in srgb, var(--card-background-color, #1c1c1c) 84%, white);
        --pulse-sheet-edge: rgba(255, 255, 255, 0.08);
        --pulse-grab: rgba(255, 255, 255, 0.35);
        /* Dunkel leuchten die Rhythmusleisten in ihrer Statusfarbe wie ein EKG */
        --pulse-glow-strength: 55%;
        /* Hell #8b7cff nur für Leisten und Text auf Schwarz; Knopfflächen dunkler (Weiß ≥ 4,5:1) */
        --pulse-accent-default: #8b7cff;
        --pulse-accent-hi-default: #c4bcff;
        --pulse-accent-fill-default: #6f5cff;
        --pulse-warn-text: color-mix(in srgb, var(--pu-warn) 70%, var(--primary-text-color));
        --pulse-grad-text: linear-gradient(90deg, var(--pu-accent), var(--pu-accent-hi));
      }
      .confirm-text {
        margin: 0 0 var(--pu-sp-12);
        line-height: 1.5;
        color: var(--pu-muted);
      }
      /* HA-App-Leiste wie auf HAs eigenen Seiten (und FLODE) */
      .toolbar {
        position: sticky;
        top: 0;
        z-index: 2;
        display: flex;
        align-items: center;
        gap: 4px;
        height: var(--header-height, 56px);
        padding: 0 12px;
        box-sizing: border-box;
        font-family: var(--ha-font-family-body, Roboto, sans-serif);
        background: var(--app-header-background-color, var(--primary-background-color));
        color: var(--app-header-text-color, var(--primary-text-color));
        border-bottom: var(--app-header-border-bottom, 1px solid var(--divider-color));
      }
      .toolbar-title {
        flex: 1;
        margin-inline-start: 8px;
        font-size: 20px;
      }
      main {
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: var(--pu-sp-24);
        max-width: 1280px;
        margin: 0 auto;
        padding: var(--pu-sp-24) clamp(16px, 4vw, 56px) var(--pu-sp-48);
      }
      .head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: var(--pu-fs-17);
        font-weight: 700;
        letter-spacing: -0.01em;
      }
      .brand pulse-mark {
        width: 28px;
        height: 28px;
      }
      .center {
        padding: 48px 0;
        text-align: center;
      }
      .version {
        margin: 8px 0 0;
        font-size: var(--pu-fs-11);
        text-align: center;
      }
      .head pulse-segmented {
        min-width: 0;
      }
      /* Handy: kein doppelter „Pulse“-Titel (die App-Leiste zeigt ihn), Reiter links über die volle
         Breite; dunkel geht die App-Leiste in die Bühne über */
      @media (max-width: 600px) {
        main {
          padding-top: var(--pu-sp-16);
          gap: var(--pu-sp-16);
        }
        .brand {
          display: none;
        }
        .head {
          justify-content: flex-start;
        }
        .head pulse-segmented {
          flex: 1;
        }
        :host([dark]) .toolbar {
          background: var(--pulse-dark-background, #050507);
        }
      }
    `,
  ];
}

defineOnce('pulse-panel', PulsePanel);

declare global {
  interface HTMLElementTagNameMap {
    'pulse-panel': PulsePanel;
  }
}
