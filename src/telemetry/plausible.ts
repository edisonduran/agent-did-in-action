/**
 * Plausible telemetry wrapper.
 *
 * Loads asynchronously via a <script> tag injected from `bootstrapTelemetry`.
 * All event sends are no-ops until the script loads, and they are silently
 * dropped if the user blocks tracking — never throw.
 *
 * Domain + script URL come from Vite env (`VITE_PLAUSIBLE_DOMAIN`,
 * `VITE_PLAUSIBLE_SCRIPT`). If `VITE_PLAUSIBLE_DOMAIN` is unset we run
 * in DEV-shim mode: events go to `console.debug` so you can validate
 * the funnel locally without spinning up Plausible.
 */

export type PlazaEventName =
  | 'demo.loaded'
  | 'demo.interaction.first'
  | 'demo.attacker.toggled'
  | 'demo.attacker.blocked.viewed'
  | 'cta.sdk.clicked'
  | 'cta.spec.clicked'
  | 'cta.maintainer.clicked'
  | 'cta.star.clicked'
  | 'cta.share.clicked'
  | 'demo.viewsource.clicked'
  | 'demo.scenario.changed'
  | 'gallery.viewed'
  | 'gallery.demo.picked'
  | 'gallery.returned';

declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: Record<string, string | number | boolean> }) => void;
  }
}

interface TelemetryConfig {
  domain?: string;
  scriptUrl?: string;
  /** When true, events are routed to console.debug instead of Plausible. */
  devMode?: boolean;
}

const DEFAULT_SCRIPT = 'https://plausible.io/js/script.js';

let config: Required<TelemetryConfig> = {
  domain: '',
  scriptUrl: DEFAULT_SCRIPT,
  devMode: true,
};

let bootstrapped = false;

export function bootstrapTelemetry(input?: TelemetryConfig): void {
  if (bootstrapped) return;
  bootstrapped = true;

  const env =
    typeof import.meta !== 'undefined' && (import.meta as ImportMeta & { env?: Record<string, string> }).env
      ? (import.meta as unknown as { env: Record<string, string> }).env
      : {};
  const domain = input?.domain ?? env.VITE_PLAUSIBLE_DOMAIN ?? '';
  const scriptUrl = input?.scriptUrl ?? env.VITE_PLAUSIBLE_SCRIPT ?? DEFAULT_SCRIPT;
  config = {
    domain,
    scriptUrl,
    devMode: input?.devMode ?? !domain,
  };

  if (config.devMode || typeof document === 'undefined' || !domain) return;

  const existing = document.querySelector(`script[data-domain="${domain}"]`);
  if (existing) return;

  const tag = document.createElement('script');
  tag.defer = true;
  tag.src = scriptUrl;
  tag.setAttribute('data-domain', domain);
  document.head.appendChild(tag);
}

export function track(
  event: PlazaEventName,
  props?: Record<string, string | number | boolean>,
): void {
  try {
    if (!bootstrapped) {
      // Allow tracking before bootstrap finished — buffer to console at minimum.
      // eslint-disable-next-line no-console
      console.debug('[telemetry:pre-bootstrap]', event, props ?? {});
      return;
    }
    if (config.devMode || typeof window === 'undefined') {
      // eslint-disable-next-line no-console
      console.debug('[telemetry:dev]', event, props ?? {});
      return;
    }
    if (typeof window.plausible === 'function') {
      window.plausible(event, props ? { props } : undefined);
    } else {
      // Script not loaded yet — drop silently. Plausible's queueing is unreliable
      // across script versions, and missed first-paint events are acceptable.
      // eslint-disable-next-line no-console
      console.debug('[telemetry:not-ready]', event, props ?? {});
    }
  } catch {
    // Telemetry must never crash the demo.
  }
}

/** Convenience helper: fire `demo.interaction.first` only once per session. */
let firstInteractionFired = false;
export function trackFirstInteraction(): void {
  if (firstInteractionFired) return;
  firstInteractionFired = true;
  track('demo.interaction.first');
}

/** Test-only reset hook. */
export function __resetTelemetryForTests(): void {
  bootstrapped = false;
  firstInteractionFired = false;
  config = { domain: '', scriptUrl: DEFAULT_SCRIPT, devMode: true };
}
