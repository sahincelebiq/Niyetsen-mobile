// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // ============================================================
    // ÇALIŞMA ZAMANI ÇÖKME KORUMASI (26 Tem 2026)
    // Olay: count-up-text.tsx içinde `Easing` react-native'den import
    // edilmişti; Reanimated worklet'i (withTiming) worklet olmayan bir easing
    // fonksiyonu alınca uygulama "Render Error: The easing function is not a
    // worklet" ile ÇÖKTÜ. TypeScript bunu yakalamaz (iki Easing tipi uyumlu).
    // Bu kural aynı hatayı derleme/lint aşamasında yakalar.
    // ============================================================
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react-native",
              importNames: ["Easing"],
              message:
                "Easing'i 'react-native-reanimated'dan import et. react-native'in " +
                "Easing'i worklet değildir; withTiming/withRepeat içinde " +
                "kullanılırsa uygulama çalışma zamanında çöker.",
            },
            {
              name: "react-native",
              importNames: ["Animated"],
              message:
                "Animasyonlarda react-native-reanimated kullanılıyor. " +
                "react-native'in Animated API'sini karıştırma.",
            },
          ],
        },
      ],
    },
  },
]);
