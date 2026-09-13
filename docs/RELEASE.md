# Niyetsen Release Hattı (06 — hata altyapısı + release)

Doğrulama yolu tektir: `eas build` → development build veya kapalı test
AAB → gerçek cihaz. QR ile test, yerel önizleme sunucusuna güvenen talimat
yoktur.

## Profiller (`eas.json`)

| Profil | Kanal | Dağıtım | Ne için |
|---|---|---|---|
| `development` | `development` | internal (dev client) | Günlük geliştirme, gerçek cihazda hata ayıklama |
| `preview` | `preview` | internal (APK/AAB) | İç test (kapalı test öncesi prova) |
| `production` | `production` | store (AAB) | Kapalı/açık test ve mağaza |
| `play-internal` | `production` | store (AAB) | Play kapalı test (production kanalını paylaşır) |
| `ios-testflight` | `production` | store | TestFlight |

Tüm profillerde `autoIncrement: true` — `versionCode`/`buildNumber` EAS'te
otomatik artar, elle sürüm şişirme yok. `appVersionSource: remote` açıktır.

## OTA mı, yeni build mi?

`runtimeVersion` politikası `appVersion` — aynı `version` içindeki JS-only
değişiklikler OTA ile gider, native taraf değişince OTA **uygulanmaz**
(uyumsuz build güncellenmez, düşmez).

| Değişiklik | Yol |
|---|---|
| `src/**` TS/TSX, metin, tema token'ı, i18n | OTA (`eas update --channel production`) |
| Yeni/degisen npm paketi (JS-only) | OTA — ama import edilen native modül varsa rebuild |
| `app.json` plugin/native izin, yeni native modül (`expo-camera`, Sentry, `expo-updates`…), `runtimeVersion` politikası, `version` artışı | **Rebuild gerekli** (`eas build --profile play-internal`) |
| `eas.json` profil/env değişikliği | Sonraki build'de geçerli (OTA'yı etkilemez) |

Kural: native şüphe varsa rebuild yap. OTA sessiz başarısızlığı, yanlış
kanala basılmış güncellemeden gelir — önce `eas channel:list` ile kanal-build
eşleşmesini doğrula.

## Komutlar

```bash
# Geliştirme build (gerçek cihaz)
npm run build:dev:android

# İç test provası
npm run build:preview:android

# Play kapalı test (mağaza AAB)
npm run build:play-internal:android

# JS-only düzeltme → OTA (ör. hata metni, i18n, taksonomi mesajı)
eas update --branch production --message "kisa-aciklama"

# Kalite kapısı (CI ile aynı)
npx tsc --noEmit && npx eslint . && npm test
```

## Sentry (okunabilir stack trace için)

1. Sentry projesinden `EXPO_PUBLIC_SENTRY_DSN` alınır → EAS environment
   secret olarak tanımlanır (`development`/`preview`/`production`).
2. Source map yüklemesi: `app.json` içinde `@sentry/react-native` config
   plugini kayıtlıdır; EAS build sırasında `SENTRY_AUTH_TOKEN`,
   `SENTRY_ORG`, `SENTRY_PROJECT` secret'ları tanımlıysa haritalar yüklenir.
   Secret yoksa build yine de geçer — raporlar daha az ayrıntılı olur.
3. `release` = `niyetsen@<version>`, `dist` = native build numarası —
   ikisi de EAS numaralarıyla eşleşir (`src/lib/sentry.ts`).
4. Doğrulama: gerçek cihazda kapalı test build'inden bilerek fırlatılan test
   hatasının Sentry'de sembolize stack trace ile görünmesi.
5. KVKK: `beforeSend` + `pii-scrub.ts` sohbet içeriği, fotoğraf, e-posta ve
   token'ı maskeler. `setSentryUser` yalnız id bağlar.

## Backend eşleştirme

- Mobil her isteğe `X-Request-Id` üretir; aynı değer `ApiError.istekKimligi`,
  `UygulamaHatasi.istekKimligi` ve hata kod satırında taşınır.
- Backend JSON loguna `request_id` yazmalıdır — destek, kullanıcının verdiği
  `hataKodu` + `request_id` ile iki tarafı birleştirir.

## Yayın öncesi kontrol listesi

- [ ] `npx tsc --noEmit` → 0 hata, `npx eslint .` → 0 yeni uyarı, `npm test` yeşil
- [ ] Açık + koyu tema, 375pt genişlikte taşma/kontrast bakıldı
- [ ] Yükleniyor / boş / hata üçlüsü her değişen ekranda var
- [ ] Ham teknik metin yok (`error.message`/stack/URL ekrana basılmıyor)
- [ ] Native değişiklik varsa rebuild alındı, OTA ile geçiştirilmedi
- [ ] Gerçek cihazda kapalı test build'i ile denendi
