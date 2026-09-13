const fs = require('fs');
const path = require('path');

/**
 * EAS yalnızca git'te izlenen dosyaları yükler. `google-services.json`
 * gitignore'dadır; yokken `android.googleServicesFile` set etmek prebuild'i
 * düşürür (`ENOENT .../google-services.json`).
 *
 * Üretim FCM için EAS file secret: `GOOGLE_SERVICES_JSON`
 * (`eas env:create --name GOOGLE_SERVICES_JSON --type file`).
 */
function resolveGoogleServicesFile() {
  if (process.env.GOOGLE_SERVICES_JSON) {
    return process.env.GOOGLE_SERVICES_JSON;
  }
  const local = path.join(__dirname, 'google-services.json');
  return fs.existsSync(local) ? './google-services.json' : undefined;
}

function pluginName(entry) {
  return Array.isArray(entry) ? entry[0] : entry;
}

/**
 * `@sentry/react-native` config plugin sentry.gradle uygular; org/project/token
 * yokken `sentry-cli` exit 1 → AAB düşer. Secret yoksa plugin'i hiç bağlama
 * (RELEASE.md: "secret yoksa build geçer").
 */
function withOptionalSentryPlugin(plugins) {
  const without = (plugins ?? []).filter(
    (entry) => pluginName(entry) !== '@sentry/react-native',
  );
  const org = process.env.SENTRY_ORG?.trim();
  const project = process.env.SENTRY_PROJECT?.trim();
  const token = process.env.SENTRY_AUTH_TOKEN?.trim();
  if (org && project && token) {
    without.push(['@sentry/react-native', { organization: org, project }]);
  }
  return without;
}

module.exports = ({ config }) => {
  const googleServicesFile = resolveGoogleServicesFile();
  return {
    ...config,
    plugins: withOptionalSentryPlugin(config.plugins),
    android: {
      ...config.android,
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
  };
};
