# Expo HAS CHANGED

Bu uygulama **Expo SDK 54** (expo-router 6, React Native 0.81.5, Reanimated 4)
kullanır. Kod yazmadan önce sürüme özel dokümanı oku:
https://docs.expo.dev/versions/v54.0.0/

- Sürüm doğrulama: `mobile/package.json` → `"expo": "~54..."`. Farklı bir
  sürüm linki (ör. v57) **yanlıştır**; SDK yükseltmesi yalnız Şahin kararıyla.
- Proje kuralları: `mobile/.cursor/rules/` ve kök `.cursor/rules/niyetsen-hafiza.mdc`.
- Kilitler: `Easing`/`Animated` asla `react-native`'ten import edilmez
  (Reanimated only); hex hardcode yok (`src/constants/theme.ts` token'ları);
  `any` yok; `KeyboardAwareView` + `useKeyboardLift` (Dimensions tahmini yasak);
  `npx tsc --noEmit` 0 hata.
- Web hedefi (V2): aynı kod `npx expo export --platform web` ile
  `app.niyetsen.com`'a çıkar — `Platform.OS === 'web'` dalları bilinçli tutulur.
