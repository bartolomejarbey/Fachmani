import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Fachmani iOS (Capacitor 8) — nativní obal kolem fachmani.org.
 * server.url načítá produkční web (SSR) a Capacitor injektuje nativní bridge,
 * takže web může volat nativní pluginy (push, kamera, network, …) přes window.Capacitor.
 * Monetizace (Comgate/předplatné/kredity) je na iOS skryta (viz lib/native gating) — v1 bez IAP.
 */
const config: CapacitorConfig = {
  appId: 'org.fachmani.app',
  appName: 'Fachmani',
  // Lokální fallback bundle (offline obrazovka, splash). Při dostupné síti se načítá server.url.
  webDir: 'www',
  server: {
    url: 'https://fachmani.org',
    cleartext: false,
    allowNavigation: [
      'fachmani.org',
      '*.fachmani.org',
      '*.supabase.co',
    ],
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#ffffff',
    // necháváme false — nepotřebujeme Service Worker / WKAppBoundDomains omezení
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] },
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#ffffff',
      showSpinner: false,
      iosSpinnerStyle: 'small',
    },
  },
};

export default config;
