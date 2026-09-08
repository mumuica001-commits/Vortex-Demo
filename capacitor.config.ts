import type { CapacitorConfig } from "@capacitor/cli";

// IMPORTANTE: troque pela URL real do seu backend depois do deploy (Vercel).
// Sem isso, o app abre em branco — é a URL que o WebView nativo vai carregar.
const DEPLOYED_URL = "https://SEU-APP.vercel.app";

const config: CapacitorConfig = {
  appId: "com.vortex.app",
  appName: "Vortex",
  webDir: "www",
  server: {
    url: DEPLOYED_URL,
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
