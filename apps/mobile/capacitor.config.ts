import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "studio.aidrama.app",
  appName: "AI Drama Studio",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  android: {
    path: "android",
  },
  ios: {
    path: "ios",
  },
};

export default config;
