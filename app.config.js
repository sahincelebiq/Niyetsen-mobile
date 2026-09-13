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

module.exports = ({ config }) => {
  const googleServicesFile = resolveGoogleServicesFile();
  return {
    ...config,
    android: {
      ...config.android,
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
  };
};
