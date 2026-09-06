import { LEGAL_VERSIONS, type LegalDocument, type LegalDocumentId } from '@/constants/legal-shared';

const controller =
  'Niyetsen henüz şirketleşmemiştir. Veri sorumlusu / veri kontrolörü Şahin Çelebi’dir. ' +
  'Yasal ve gizlilik yazışması: ai@niyetsen.com. Instagram duyuru kanalıdır; başvuru yalnız e-posta ile alınır.';

export const LEGAL_DOCUMENTS_TR: Record<LegalDocumentId, LegalDocument> = {
  privacy: {
    title: 'Gizlilik Politikası',
    shortTitle: 'Gizlilik',
    version: LEGAL_VERSIONS.privacyPolicy,
    summary:
      'Niyetsen uygulaması ve niyetsen.com’da hangi verilerin neden işlendiğini, kime aktarıldığını, haklarınızı ve nasıl sileceğinizi açıklar. Play Store, App Store, KVKK, GDPR ve CCPA için hazırlanmıştır.',
    sections: [
      {
        title: '1. Veri sorumlusu ve kapsam',
        paragraphs: [
          controller,
          'Bu politika niyetsen.com, Niyetsen iOS ve Android uygulamaları (com.niyetsenai / com.niyetsen.app) için geçerlidir. Ödeme kartınızı Apple, Google Play veya RevenueCat işler; Niyetsen kart numarası tutmaz.',
        ],
      },
      {
        title: '2. İşlenen kişisel veriler',
        bullets: [
          'Hesap: ad, e-posta, Apple veya Google giriş kimliği, Supabase kullanıcı kimliği.',
          'Profil: doğum tarihi, burç, saat dilimi, dil/bölge, isteğe bağlı cinsiyet (yalnız hitap; “kadın”, “erkek”, “belirtmek istemiyorum”).',
          'İçerik: sohbet, niyet, plan, görev ve mistik rehber mesajları.',
          'Kanıt ve fal fotoğrafı: yalnız uygulama içi kamera. Galeri istenmez. Biyometrik tanıma veya kimlik tespiti yapılmaz.',
          'Oyunlaştırma: puan, zincir, kategori, mazeret, rütbe, bildirim saati.',
          'Fal ve mistik: tarot, kahve, el, burç sonuçları ve günlük hak sayaçları.',
          'Takma adlı lig: katılırsanız rumuz, puan, zincir. Gerçek ad ve e-posta lige düşmez.',
          'Abonelik: plan ve mağaza işlem durumu. Kart Niyetsen’de tutulmaz.',
          'Teknik: oturum, güvenlik ve hata kayıtları; cihaz/işletim sistemi bilgisi.',
          'Web erken erişim formu: yalnız gönderirseniz ad, e-posta, platform tercihi.',
        ],
        paragraphs: [
          'Konum şu anda toplanmaz. Reklam kimliği ile takip (ATT / Play reklam kimliği) yapılmaz. Pinterest’e kullanıcı verisi gitmez. Verileriniz satılmaz ve çapraz bağlamlı reklam için paylaşılmaz.',
        ],
      },
      {
        title: '3. Özel nitelikli veriler ve açık rıza',
        paragraphs: [
          'Sağlık, inanç, siyasi görüş veya benzeri özel nitelikli veri istenmez. Sohbet serbest metindir; yazarsanız işleme AI açık rızasına (KVKK m. 6 / GDPR m. 9) dayanır. Rıza yoksa hesap kalır; sohbet, plan ve mistik rehber kapanır.',
          'Kanıt fotoğrafı ayrı rızadır. Yoksa fotoğraf yüklenmez. Fotoğraf, görevin yapılıp yapılmadığını anlamak içindir; yüz tanıma için kullanılmaz.',
        ],
      },
      {
        title: '4. Amaçlar ve hukuki sebepler',
        bullets: [
          'Hesap, görev, puan, zincir: sözleşmenin ifası (KVKK m. 5/2-c; GDPR m. 6/1-b).',
          'AI sohbet, plan, fal, mistik rehber, kanıt fotoğrafı: açık rıza (KVKK m. 5/1 ve gerektiğinde m. 6; GDPR m. 6/1-a ve m. 9).',
          'Güvenlik, kötüye kullanım ve hata giderme: meşru menfaat (KVKK m. 5/2-f; GDPR m. 6/1-f).',
          'Mağaza aboneliği ve yasal mali kayıt: hukuki yükümlülük (KVKK m. 5/2-ç; GDPR m. 6/1-c).',
        ],
        paragraphs: [
          'Pazarlama e-postası veya SMS şu anda gönderilmez. Tercih kutusu ileride yalnız açık onayla kullanılır. Rızayı Ayarlar’dan veya ai@niyetsen.com ile geri alabilirsiniz.',
        ],
      },
      {
        title: '5. Aktarım ve yurt dışı',
        bullets: [
          'Google Gemini: sohbet, plan, fal/mistik yanıt ve kanıt fotoğrafı — yanıt üretmek için. Niyetsen kendi modelini sizin verinizle eğitmez. Google’ın işleme koşulları Gemini API şartlarına tabidir.',
          'Supabase: kimlik, veritabanı, kanıt depolama.',
          'Railway: API sunucusu.',
          'Apple, Google Play, RevenueCat: giriş ve uygulama içi satın alma. Ödeme kontrolörü ilgili mağazadır.',
          'Unsplash: plan kartı görseli. Sohbet metniniz gönderilmez.',
          'PostHog / Sentry: anahtar yapılandırılmışsa ürün olayı veya hata; yoksa veri gitmez.',
          'Yetkili kamu kurumları: kanunen zorunluysa.',
        ],
        paragraphs: [
          'Altyapı Avrupa, ABD veya başka ülkelerde olabilir. Aktarım KVKK m. 9 ve GDPR m. 44–49 (yeterlilik, standart sözleşmeler veya istisna) ile yapılır. Veri satılmaz.',
        ],
      },
      {
        title: '6. Saklama ve silme',
        bullets: [
          'Hesap: üyelik + silme talebinden sonra en fazla 3 yıl.',
          'Sohbet, plan, mistik sohbet, fal: üyelik + silmeden sonra en fazla 1 yıl.',
          'Kanıt fotoğrafı: en fazla 1 yıl veya hesap silinene kadar.',
          'Puan, zincir, lig rumuzu: üyelik + silmeden sonra en fazla 2 yıl.',
          'Ödeme/fatura: mevzuatın zorunlu süresi (kural olarak 10 yıl; çoğu mağazada tutulur).',
          'Güvenlik kayıtları: en fazla 6 ay.',
        ],
      },
      {
        title: '7. Haklarınız (KVKK, GDPR, CCPA)',
        paragraphs: [
          'KVKK m. 11: öğrenme, bilgi, aktarım, düzeltme, silme, itiraz, zararın giderilmesi. Başvuru: ai@niyetsen.com, konu “KVKK Başvurusu”. Yanıt en geç 30 gün. KVKK Kurulu’na şikâyet hakkınız saklıdır.',
          'AB / AEA (GDPR) ve Birleşik Krallık: erişim, düzeltme, silme, kısıtlama, taşınabilirlik, itiraz, rızayı geri alma. Şikâyet: kendi ülkenizin otoritesi (ör. CNIL, BfDI, ICO).',
          'Kaliforniya (CCPA/CPRA): bilme, silme, düzeltme. Kişisel veriyi satmıyoruz ve çapraz bağlamlı reklam için “share” etmiyoruz. Ayrımcılık yapılmaz.',
        ],
      },
      {
        title: '8. Fal, burç ve mistik içerik',
        paragraphs: [
          'Tarot, kahve, el, burç ve mistik rehber eğlencedir; kader, tıp, hukuk veya finans tavsiyesi değildir. Play ve App Store konumlandırmasında fal ikincildir. Yanlış fal fotoğrafı hak yakmaz. Kriz sinyalinde fal durur.',
        ],
      },
      {
        title: '9. Takma adlı gelişim ligi',
        paragraphs: [
          'İsteğe bağlıdır. Diğerleri rumuz, puan ve zinciri görür. Gerçek ad görünmez. Ayrılabilirsiniz; hesap silinince rumuz silme sürecine alınır. Utandırma yoktur.',
        ],
      },
      {
        title: '10. Cihaz izinleri',
        bullets: [
          'Kamera: kanıt veya fal fotoğrafı çekerken.',
          'Bildirim: seçtiğiniz saatte hatırlatma; sistem alarmı garantisi yoktur.',
          'Takvim: görevi siz eklemeyi seçerseniz.',
          'Konum: istenmez ve işlenmez.',
        ],
      },
      {
        title: '11. Hesap silme',
        paragraphs: [
          'Profil → Hesabımı Sil. Uygulamaya giremiyorsanız niyetsen.com/hesap-silme.html veya niyetsen.com/account-deletion.html. Apple ve Google Play hesap silme kuralına uygundur.',
        ],
      },
      {
        title: '12. Çerezler',
        paragraphs: [
          'Sitede zorunlu kayıtlar tutulabilir. Reklam/ölçüm etiketi yalnız çerez bandında kabul derseniz yüklenir.',
        ],
      },
      {
        title: '13. Çocuklar (18+)',
        paragraphs: [
          'Hizmet 18 yaşından küçüklere yönelik değildir (COPPA / KVKK çocuk kuralları). 18 yaş onayı kayıtta alınır. Bu yaşta veri fark edilirse silinir.',
        ],
      },
      {
        title: '14. Otomatik işlem ve güvenlik',
        paragraphs: [
          'Puan ve zincir oyun kuralıdır; hukuki veya kredi kararı değildir. AI yanıtları yardımcıdır, tek başına önemli karar dayanağı değildir.',
          'JWT, HTTPS, yetki ayrımı ve kanıt için özel depolama kullanılır. Fotoğraf en fazla 5 MB, jpeg/png. İhlalde yasal bildirim yapılır.',
        ],
      },
      {
        title: '15. Değişiklikler',
        paragraphs: [
          'Metin yeni sürüm ve yürürlük tarihiyle güncellenir. Önemli değişikliklerde uygulama yeniden rıza isteyebilir.',
        ],
      },
    ],
  },
  kvkk: {
    title: 'KVKK Aydınlatma ve Gizlilik Bildirimi',
    shortTitle: 'KVKK',
    version: LEGAL_VERSIONS.privacyPolicy,
    summary:
      '6698 sayılı Kanun ve (AB kullanıcısıysanız) GDPR uyarınca toplanma yöntemi, amaçlar ve haklarınız.',
    sections: [
      {
        title: '1. Veri sorumlusu',
        paragraphs: [controller],
      },
      {
        title: '2. Toplanma yöntemi',
        paragraphs: [
          'Kayıt ve profil, sohbet, görev, uygulama içi kamera, Apple/Google girişi ve teknik kayıtlardan elektronik ortamda toplanır. Konum toplanmaz.',
        ],
      },
      {
        title: '3. Kategoriler ve amaçlar',
        bullets: [
          'Kimlik ve iletişim: üyelik ve oturum.',
          'Profil: hitap, burç, dil, saat dilimi, 18+ uygunluk.',
          'İçerik: niyet, plan, mistik rehber.',
          'Fal: eğlence yorumu ve hak sayacı.',
          'Lig rumuzu: isteğe bağlı; gerçek kimlik yok.',
          'İlerleme: görev, puan, zincir.',
          'Fotoğraf: seçtiğiniz görev veya fal kanıtı.',
          'Teknik: güvenlik ve hata.',
        ],
      },
      {
        title: '4. Hukuki sebepler',
        paragraphs: [
          'Temel hizmet KVKK m. 5/2 (sözleşme, yükümlülük, meşru menfaat) ve GDPR m. 6 ile yürür. AI, fal ve fotoğraf için ekranda açık rıza alınır.',
        ],
      },
      {
        title: '5. Aktarım',
        paragraphs: [
          'Google Gemini, Supabase, Railway, Apple/Google, Unsplash (yalnız görsel), RevenueCat, yapılandırılmışsa PostHog/Sentry ve yetkili kurumlar. Ayrıntı Gizlilik Politikası bölüm 5’tedir.',
        ],
      },
      {
        title: '6. Haklar ve başvuru',
        bullets: [
          'KVKK m. 11 hakları ve GDPR m. 15–21 hakları (erişim, silme, taşınabilirlik, itiraz).',
          'ai@niyetsen.com — konu “KVKK Başvurusu” veya “Privacy Request”.',
          'Yanıt en geç 30 gün (KVKK m. 13 / GDPR makul süre).',
        ],
      },
    ],
  },
  consent: {
    title: 'Açık Rıza ve Tercih Metni',
    shortTitle: 'Açık Rıza',
    version: LEGAL_VERSIONS.kvkkConsent,
    summary:
      'AI, fotoğraf ve pazarlama ayrı tercihlerdir. Metni okumak tek başına açık rıza sayılmaz. 18 yaş onayı uygunluk beyanıdır.',
    sections: [
      {
        title: '1. Aydınlatmayı okuma',
        paragraphs: [
          'Gizlilik ve KVKK metnini işaretlemeniz bilgilendirildiğinizi kaydeder. Tek başına AI, fotoğraf veya pazarlama rızası değildir.',
        ],
      },
      {
        title: '2. 18 yaş onayı',
        paragraphs: [
          'Hizmet yalnız 18 yaşını doldurmuş kullanıcılar içindir. Onay, App Store ve Play Store yaş beyanı ile uyumludur.',
        ],
      },
      {
        title: '3. AI sohbeti, plan ve mistik',
        paragraphs: [
          'Onay verirseniz sohbet, niyet, profil, plan, fal ve mistik mesajlar yanıt için işlenir ve Google Gemini’ye gidebilir. Rıza yoksa bu özellikler çalışmaz; hesap ve yasal sayfalar açık kalır.',
        ],
      },
      {
        title: '4. Kanıt fotoğrafı',
        paragraphs: [
          'Onay verirseniz çektiğiniz görev fotoğrafı saklanabilir ve Gemini ile değerlendirilir. Kapalıysa fotoğraf kanıtı gönderilmez.',
        ],
      },
      {
        title: '5. Pazarlama',
        paragraphs: [
          'Varsayılan kapalıdır. Şu anda e-posta veya SMS pazarlaması yoktur.',
        ],
      },
      {
        title: '6. Rızayı geri alma',
        paragraphs: [
          'Ayarlar’dan veya ai@niyetsen.com ile geleceğe etkili olarak geri alabilirsiniz. Geri alma öncesi hukuka uygun işleme geçerliliğini korur.',
        ],
      },
    ],
  },
  terms: {
    title: 'Kullanım Koşulları',
    shortTitle: 'Koşullar',
    version: LEGAL_VERSIONS.terms,
    summary:
      'Hesap, AI, kanıt, fal, lig ve App Store / Google Play aboneliği kuralları. Apple 3.1.2 ve Play faturalama açıklamalarını içerir.',
    sections: [
      {
        title: '1. Hizmeti sunan',
        paragraphs: [
          'Hizmeti Şahin Çelebi sunar. İletişim: ai@niyetsen.com. Gizlilik Politikası bu koşulların parçasıdır.',
        ],
      },
      {
        title: '2. Hizmet',
        paragraphs: [
          'Niyetsen niyeti sohbetle plana çevirir; görev, puan ve zincir tutar. Sonuç, davranış değişikliği veya hedefe ulaşma garantisi yoktur. Tıbbi, hukuki veya finansal tavsiye değildir.',
        ],
      },
      {
        title: '3. Uygunluk (18+)',
        paragraphs: [
          'Hizmet yalnız 18 yaşını doldurmuş kişiler içindir. Doğum tarihi ve onay kutusu bu kuralı destekler. Hesap bilgisi ve giriş güvenliği size aittir. Hesabı devredemezsiniz.',
        ],
      },
      {
        title: '4. Kabul edilebilir kullanım',
        bullets: [
          'Kanıtta yalnız uygulama içi kamera kullanmak.',
          'Başkasının yüzünü, fotoğrafını veya verisini izinsiz yüklememek.',
          'Hile, taciz, yasa dışı içerik veya hizmeti bozmamak.',
          'Görevi kendi sağlık ve güvenliğinize göre değerlendirmek.',
        ],
      },
      {
        title: '5. Yapay zekâ, fal ve mistik',
        paragraphs: [
          'Yanıtlar yapay zekâ ile üretilir ve hata içerebilir. Fal ve burç eğlencedir; kader veya uzman tavsiyesi değildir. Önemli kararlar için uzman görüşü alın.',
        ],
      },
      {
        title: '6. Ruh sağlığı',
        paragraphs: [
          'Niyetsen terapi, tanı veya acil yardım değildir. Kendinize veya başkasına zarar riski varsa yerel acil hatta veya sağlık kuruluşuna başvurun.',
        ],
      },
      {
        title: '7. Takma adlı lig',
        paragraphs: [
          'İsteğe bağlıdır. Görünen rumuz, puan ve zincirdir. Utandırma yoktur. Ayrılabilirsiniz.',
        ],
      },
      {
        title: '8. Abonelik (App Store ve Google Play)',
        bullets: [
          'Ücretsiz katmanda sohbet açıktır. İkinci plan, kanıt, bonus, İdol yolları ve bazı mistik haklar abonelik veya deneme ile açılır.',
          'Ödeme yalnız Apple App Store / Google Play IAP ve RevenueCat iledir. Harici ödeme linki yoktur.',
          'Fiyat, süre ve para birimi satın alma anında mağazanın gösterdiği tutardır. Uygulama fiyat uydurmaz.',
          'Apple: ödeme, onayda Apple kimliğinize işlenir. Abonelik, dönem bitiminden en az 24 saat önce otomatik yenileme kapatılmazsa yenilenir. Yenileme ücreti dönem bitiminden önceki 24 saat içinde alınır. Yönetim: Ayarlar → Apple Kimliği → Abonelikler.',
          'Google Play: yinelenen fatura Play hesabınızdan alınır. İptal ve yönetim: Google Play → Ödemeler ve abonelikler.',
          '“Satın alımları geri yükle” ile aynı mağaza hesabındaki haklar yüklenir.',
          'Ücretsiz deneme varsa, deneme bitmeden abonelik alırsanız kullanılmayan deneme hakkı yanabilir (mağaza kuralı).',
          'İade, ilgili mağazanın iade politikasına tabidir. Niyetsen kartınıza doğrudan iade yapamaz.',
        ],
      },
      {
        title: '9. Kullanıcı içeriği ve fikri mülkiyet',
        paragraphs: [
          'Yazdığınız niyet ve sohbet size aittir. Hizmeti sunmak (plan, kanıt, fal yanıtı) için bize dünya çapında, bedelsiz, geri alınabilir bir işleme lisansı verirsiniz. Niyetsen adı, arayüz ve metinler saklıdır. Unsplash görselleri kendi lisansına tabidir.',
        ],
      },
      {
        title: '10. Sona erme ve sorumluluk',
        paragraphs: [
          'Profil’den veya niyetsen.com/hesap-silme.html ile hesabı silebilirsiniz. İhlal veya güvenlik riskinde erişim kısıtlanabilir.',
          'Hizmet, emredici hukuk saklı kalmak üzere “olduğu gibi” sunulur. İnternet, mağaza veya Gemini kesintisi ile sizin kararlarınızdan doğan dolaylı zararlardan Niyetsen sorumlu tutulamaz. Tüketici mevzuatındaki zorunlu haklar saklıdır.',
        ],
      },
      {
        title: '11. Uygulanacak hukuk',
        paragraphs: [
          'Türkiye Cumhuriyeti hukuku uygulanır. AB tüketicisiyseniz oturduğunuz ülkenin zorunlu tüketici koruması saklıdır.',
        ],
      },
    ],
  },
};
