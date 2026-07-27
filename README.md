# Niyetsen — Mobil Uygulama (iOS & Android)

> **Niyetini söze, sözünü zincire çevir. 🌙**
> Expo (React Native + TypeScript) istemcisi · Backend: FastAPI + Supabase

Bu depo Niyetsen'in mobil istemcisidir. Ürünün tamamı, mimarisi ve yol haritası
için ana depoya bakın: [`Niyetsen`](https://github.com/sahincelebiq/Niyetsen)
(`README.md` + `NIYETSEN_MASTER_PLAN.md`).

---

## Ne yapar?

Kullanıcının "bu yıl nasıl bir hayat istiyorum?" niyetini yapay zekâ sohbetiyle
toplar, kişinin gerçek hayatından türeyen **365 günlük görselli plana** çevirir,
görevleri **uygulama içi kamerayla çekilen fotoğraf kanıtıyla** kapatır ve
**zincir + puan** mekaniğiyle sürdürülebilir kılar.

**Ekranlar:** Sohbet (oturum geçmişli) · Bugün (görev + kanıt) · Planım ·
Zincir & Rank · Profil · Felsefe Yolları (İdol Modu) · Mistik bölüm
(tarot, kahve/el falı, burç — eğlence amaçlı, ikincil özellik)

---

## Kurulum

```bash
npm install
cp .env.example .env      # EXPO_PUBLIC_* değerlerini doldur
npx expo start -c         # temiz önbellekle başlat
```

`.env` **asla commit edilmez** (gitignore'da). Gerekli değişkenler
`.env.example` içinde listelidir: Supabase URL + publishable key, API URL,
RevenueCat public key, PostHog key.

> Kamera, takvim ve bildirim izinleri gerektiğinden **Expo Go kısıtlıdır**;
> tam deneyim için development build veya EAS build kullanın.

---

## Mimari notlar

| Konu | Karar |
|---|---|
| Yönlendirme | `expo-router` (dosya tabanlı, `src/app/`) |
| Tema | Tek kaynak: `src/constants/theme.ts` (renk, tipografi, gölge, hareket) |
| Animasyon | **Yalnız `react-native-reanimated`** |
| Depolama | Oturum: `expo-secure-store` (parçalı), diğer: AsyncStorage — `localStorage` YASAK |
| API sözleşmesi | `src/lib/api.ts` tipleri backend `app/models/schemas.py` ile birebir eşleşir |
| Abonelik | RevenueCat (yalnız IAP; harici ödeme linki yasak — App Store kuralı) |

### ⚠️ Kritik kural: `Easing` importu

Animasyonlarda kullanılan `Easing` **mutlaka** `react-native-reanimated`'dan
import edilmelidir. `react-native`'in `Easing`'i worklet değildir; `withTiming`
içinde kullanılırsa uygulama çalışma zamanında
*"The easing function is not a worklet"* hatasıyla çöker — ve TypeScript bunu
yakalamaz. Bu yüzden `eslint.config.js`'te `no-restricted-imports` kuralı
vardır; **kaldırılmamalıdır.**

---

## Doğrulama

```bash
npx tsc --noEmit     # 0 hata beklenir
npx expo lint        # no-restricted-imports dahil
```

---

## Katkı disiplini

- Küçük commit'ler, biçim: `faz7: fal gecmisi ekrani`
- Ekranlar gerçek cihazda test edilir (simülatör tek başına yeterli değil)
- Ton kuralı: kayıp hissi + kimlik ✅ · suçlama/utandırma ❌
- Puan/ceza/zincir sayıları ana depodaki `NIYETSEN_MASTER_PLAN.md` §1-2'den
  alınır; uydurulmaz

---

© 2026 Niyetsen · [niyetsen.com](https://niyetsen.com) · ai@niyetsen.com
