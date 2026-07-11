export const LEGAL_EFFECTIVE_DATE = '11 Temmuz 2026';

export const LEGAL_VERSIONS = {
  privacyPolicy: '2026-07-11',
  kvkkConsent: '2026-07-11',
  aiChatConsent: '2026-07-11',
  proofPhotoConsent: '2026-07-11',
  marketingConsent: '2026-07-11',
  terms: '2026-07-11',
} as const;

export const LEGAL_IDENTITY = {
  service: 'Niyetsen',
  dataController: 'Şahin Çelebi',
  email: 'ai@niyetsen.com',
  company: 'Henüz kurulmamış / belirlenmemiştir.',
  taxNumber: 'Henüz oluşmamış / belirlenmemiştir.',
  mersis: 'Henüz oluşmamış / belirlenmemiştir.',
  kep: 'Henüz oluşturulmamış / belirlenmemiştir.',
  address: 'Henüz belirlenmemiştir.',
} as const;

export type LegalDocumentId = 'privacy' | 'kvkk' | 'consent' | 'terms';

export type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type LegalDocument = {
  title: string;
  shortTitle: string;
  version: string;
  summary: string;
  sections: LegalSection[];
};

const controllerParagraph =
  'Niyetsen hizmeti bakımından veri sorumlusu Şahin Çelebi’dir. İletişim: ai@niyetsen.com. ' +
  'Niyetsen adına kurulmuş bir şirket, vergi numarası, MERSİS numarası, KEP adresi ve iş adresi ' +
  'henüz bulunmamakta veya belirlenmemiştir; bu bilgiler varmış gibi kabul edilmemelidir.';

export const LEGAL_DOCUMENTS: Record<LegalDocumentId, LegalDocument> = {
  privacy: {
    title: 'Gizlilik Politikası',
    shortTitle: 'Gizlilik',
    version: LEGAL_VERSIONS.privacyPolicy,
    summary:
      'Bu politika Niyetsen mobil uygulaması ve web sürümünde hangi verilerin, hangi amaçlarla ve hangi hizmet sağlayıcılarla işlendiğini açıklar.',
    sections: [
      {
        title: '1. Veri sorumlusu ve iletişim',
        paragraphs: [controllerParagraph],
      },
      {
        title: '2. Şu anda işlenen veriler',
        bullets: [
          'Hesap verileri: e-posta adresi, kimlik doğrulama sağlayıcısı ve Supabase kullanıcı kimliği.',
          'Profil verileri: ad, doğum tarihi, hesaplanan burç, saat dilimi ve bildirim saati.',
          'Kullanıcı içeriği: AI sohbetleri, hedefler, ilgi alanları, yaşam planına ilişkin yanıtlar ve oluşturulan planlar.',
          'İlerleme verileri: görevler, durumları, puanlar, kategoriler, zincirler, mazeretler ve uygulama içi tercihler.',
          'Kanıt verileri: kullanıcı bu özelliği seçerse uygulama içi kamerayla çekilen görev fotoğrafı; ayrıca kullanıcı izin verirse yaklaşık konum bilgisi.',
          'Teknik veriler: hizmetin çalışması sırasında sağlayıcıların ürettiği oturum, istek, IP adresi ve cihaz/tarayıcı gibi teknik kayıtlar.',
        ],
      },
      {
        title: '3. İşleme amaçları',
        bullets: [
          'Hesap oluşturmak, oturumu yönetmek ve kullanıcıyı doğrulamak.',
          'Sohbetten kişiselleştirilmiş yaşam planı ve görevler üretmek.',
          'Görev, puan, zincir ve tercihleri cihazlar arasında saklamak.',
          'Kullanıcı seçerse fotoğraf kanıtını görevle uyumu bakımından değerlendirmek.',
          'Kullanıcının talep ettiği bildirim ve cihaz içi hatırlatıcıları çalıştırmak.',
          'Hataları gidermek, kötüye kullanımı önlemek ve hizmeti işletmek.',
        ],
      },
      {
        title: '4. Güncel hizmet sağlayıcılar ve aktarımlar',
        bullets: [
          'Google Gemini: AI sohbeti, plan üretimi ve kullanıcı fotoğraf kanıtı gönderirse kanıt değerlendirmesi. Bu işlemler için ilgili sohbet içeriği, plan bağlamı veya fotoğraf Google’a aktarılabilir.',
          'Supabase: e-posta/Apple/Google ile kimlik doğrulama, veritabanı ve kanıt fotoğrafı kullanılırsa depolama. Hesap ve uygulama verileri Supabase altyapısında işlenir.',
          'Apple ve Google: yalnız kullanıcı ilgili giriş yöntemini seçerse kimlik doğrulama. Sağlayıcı Niyetsen’e hesap tanımlayıcılarını ve izin verilen temel hesap bilgisini iletebilir.',
          'Unsplash: plan görevlerinde görsel sağlama ve fotoğrafçı atfı. Görsel cihazdan yüklenirken Unsplash, IP adresi ve standart istek bilgilerini alabilir; Niyetsen sohbet metnini Unsplash’a göndermez.',
          'Yetkili kurumlar: yalnız hukuken geçerli bir yükümlülük veya talep bulunması halinde gerekli kapsamda aktarım yapılabilir.',
        ],
        paragraphs: [
          'Gemini, Supabase, Apple, Google ve Unsplash hizmetlerinin altyapısı yurt dışında bulunabilir. Bu nedenle kullanım, KVKK’nın yurt dışına aktarım kuralları bakımından ayrıca değerlendirilir. Bu metin, henüz kurulmamış sözleşme veya uygun güvence mekanizmalarının kurulmuş olduğunu iddia etmez.',
        ],
      },
      {
        title: '5. Henüz aktif olmayan sağlayıcılar',
        paragraphs: [
          'RevenueCat (abonelik), PostHog (analitik), Sentry (hata izleme) ve Pinterest entegrasyonları şu anda aktif değildir. Bu sağlayıcılar etkinleştirilirse ilgili veri akışları başlamadan önce politika güncellenecek ve gerektiğinde yeni tercih veya rıza alınacaktır. Niyetsen şu anda kart bilgisi toplamaz ve pazarlama analitiği çalıştırmaz.',
        ],
      },
      {
        title: '6. Saklama ve silme',
        paragraphs: [
          'Veriler, ilgili özelliğin sağlanması ve geçerli hukuki yükümlülükler için gerekli olduğu süreyle tutulur. Henüz veri kategorilerine özgü sabit ek saklama süreleri ilan edilmemiştir. Kullanıcı Ayarlar içinden hesabını silebilir. Silme talebi üzerine aktif hesapla bağlantılı veriler silme sürecine alınır; kanunen saklanması zorunlu kayıtlar varsa yalnız zorunlu süre ve kapsamla sınırlı tutulur.',
        ],
      },
      {
        title: '7. Tercihler ve izinler',
        bullets: [
          'Kamera, fotoğraf kanıtı çekilene kadar kullanılmaz; galeri erişimi istenmez.',
          'Konum opsiyoneldir ve ayrı cihaz iznine bağlıdır.',
          'Bildirim ve takvim izinleri ilgili özellik istendiğinde cihaz tarafından sorulur.',
          'Pazarlama iletişimi tercihi varsayılan olarak kapalıdır ve şu anda pazarlama gönderimi yapılmamaktadır.',
        ],
      },
      {
        title: '8. Çocuklar',
        paragraphs: [
          'Niyetsen şu anda çocuklara yönelik bir hizmet olarak tasarlanmamıştır. Reşit olmayan bir kullanıcı bakımından veli/vasi izni ve uygulanabilir yaş kuralları ayrıca değerlendirilmelidir.',
        ],
      },
      {
        title: '9. Değişiklikler',
        paragraphs: [
          'Veri akışları veya hukuki bilgiler değişirse bu politika yeni bir sürüm numarası ve yürürlük tarihiyle güncellenir. Önemli değişikliklerde uygulama yeniden bilgilendirme/onay ekranı gösterebilir. Güncel sürüm uygulamadaki yasal sayfalarda bulunur.',
        ],
      },
    ],
  },
  kvkk: {
    title: 'KVKK Aydınlatma Metni',
    shortTitle: 'KVKK',
    version: LEGAL_VERSIONS.privacyPolicy,
    summary:
      '6698 sayılı Kişisel Verilerin Korunması Kanunu uyarınca Niyetsen’deki kişisel veri işleme faaliyetlerine ilişkin aydınlatma metnidir.',
    sections: [
      {
        title: '1. Veri sorumlusu',
        paragraphs: [controllerParagraph],
      },
      {
        title: '2. Kişisel verilerin toplanma yöntemi',
        paragraphs: [
          'Veriler; kayıt ve profil formları, AI sohbetine yazdıklarınız, uygulama içi görev işlemleri, seçmeniz halinde kamera ve konum izinleri, kimlik doğrulama sağlayıcıları ve hizmetin çalışması sırasında oluşan teknik kayıtlar aracılığıyla elektronik ortamda elde edilir.',
        ],
      },
      {
        title: '3. Veri kategorileri ve amaçlar',
        bullets: [
          'Kimlik ve iletişim: üyelik, oturum ve kullanıcı iletişimi.',
          'Profil: hitap, doğum tarihi/burç, saat dilimi ve bildirim tercihleri.',
          'Kullanıcı içeriği: hedefleri anlamak, AI sohbeti yürütmek ve kişisel plan üretmek.',
          'Davranış ve ilerleme: görev, puan ve zincir sistemini işletmek.',
          'Fotoğraf ve opsiyonel konum: kullanıcının talep ettiği görev kanıtı doğrulaması.',
          'Teknik kayıtlar: hizmetin sunulması, hata giderme ve kötüye kullanımın önlenmesi.',
        ],
      },
      {
        title: '4. Hukuki sebepler',
        paragraphs: [
          'Hesap ve temel hizmet verileri, KVKK m. 5/2 kapsamındaki sözleşmenin kurulması veya ifası, hukuki yükümlülük ve uygulanabildiği ölçüde meşru menfaat sebeplerine dayanabilir. AI sohbeti ve kanıt fotoğrafı gibi ayrı seçim gerektiren işlemler için ilgili ekranda açık rıza istenir. Kullanıcının açık uçlu sohbette sağlık, dini inanç veya benzeri özel nitelikli bilgi paylaşma ihtimali bulunduğundan AI rızası bu riski açıklar; gerekli olmayan özel nitelikli bilgileri yazmamanız önerilir.',
        ],
      },
      {
        title: '5. Aktarım yapılan taraflar',
        paragraphs: [
          'Amaçla sınırlı olarak Google Gemini, Supabase, kullanıcı tarafından seçilen Apple/Google giriş sağlayıcısı, görsellerin sunumu için Unsplash ve hukuken yetkili kurumlar alıcı olabilir. Ayrıntılar Gizlilik Politikası’nın “Güncel hizmet sağlayıcılar ve aktarımlar” bölümündedir. RevenueCat, PostHog, Sentry ve Pinterest şu anda aktif değildir.',
        ],
      },
      {
        title: '6. KVKK m. 11 kapsamındaki haklarınız',
        bullets: [
          'Kişisel verilerinizin işlenip işlenmediğini öğrenme ve işlenmişse bilgi isteme.',
          'İşleme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme.',
          'Yurt içinde veya yurt dışında aktarılan üçüncü kişileri bilme.',
          'Eksik veya yanlış işlenen verilerin düzeltilmesini isteme.',
          'Koşulları varsa verilerin silinmesini/yok edilmesini ve bu işlemlerin aktarılan üçüncü kişilere bildirilmesini isteme.',
          'Münhasıran otomatik analiz sonucu aleyhinize bir sonuç doğmasına itiraz etme.',
          'Kanuna aykırı işleme nedeniyle zararın giderilmesini talep etme.',
        ],
      },
      {
        title: '7. Başvuru',
        paragraphs: [
          'Talebinizi, kimliğinizi ve talebinizi doğrulamaya yeterli bilgilerle ai@niyetsen.com adresine iletebilirsiniz. Şirket adresi ve KEP adresi henüz belirlenmediğinden bu kanallar şu anda sunulmamaktadır. Kimlik doğrulama için yalnız talebin güvenli biçimde sonuçlandırılması bakımından gerekli bilgiler istenir. Başvurular KVKK m. 13 uyarınca talebin niteliğine göre en kısa sürede ve en geç 30 gün içinde sonuçlandırılır; uygulanabilir Kurul tarifesinde öngörülen bir maliyet doğarsa bu bildirilebilir.',
        ],
      },
    ],
  },
  consent: {
    title: 'Açık Rıza ve Tercih Metni',
    shortTitle: 'Açık Rıza',
    version: LEGAL_VERSIONS.kvkkConsent,
    summary:
      'AI sohbeti, fotoğraf kanıtı ve pazarlama iletişimi birbirinden bağımsız tercihlerdir. Gizlilik/KVKK metnini okuduğunuzu belirtmeniz açık rıza değildir.',
    sections: [
      {
        title: '1. Aydınlatma metnini okuma',
        paragraphs: [
          'Gizlilik Politikası ve KVKK Aydınlatma Metni’ni okuduğunuzu onaylamanız, veri işleme hakkında bilgilendirildiğinizi kaydeder. Bu kutu tek başına AI, fotoğraf veya pazarlama için açık rıza anlamına gelmez.',
        ],
      },
      {
        title: '2. AI sohbeti ve kişiselleştirme rızası',
        paragraphs: [
          'Onay verirseniz sohbet içerikleriniz, hedefleriniz, profil bilgileriniz ve plan bağlamınız kişiselleştirilmiş yanıt ve plan üretmek için işlenebilir ve Google Gemini’ye aktarılabilir. Açık uçlu sohbette kendiniz özel nitelikli kişisel veri paylaşabilirsiniz; gerekli olmayan sağlık, inanç, siyasi görüş, cinsel hayat veya benzeri bilgileri yazmamanız önerilir. Bu rızayı vermezseniz AI sohbeti ve kişisel plan üretimi kullanılamaz; hesabınız ve yasal sayfalar erişilebilir kalır.',
        ],
      },
      {
        title: '3. Kanıt fotoğrafı rızası',
        paragraphs: [
          'Onay verirseniz yalnız sizin çekmeyi seçtiğiniz görev kanıtı fotoğrafları göreve uygunluk değerlendirmesi için Supabase’de saklanabilir ve Google Gemini’ye gönderilebilir. Fotoğrafta yüz veya başka hassas unsurlar bulunabilir; bunları kadraja almamayı seçebilirsiniz. Bu tercih kapalıysa fotoğraf kanıtı gönderilmez ve ilgili doğrulama özelliği kullanılamaz.',
        ],
      },
      {
        title: '4. Pazarlama iletişimi',
        paragraphs: [
          'Pazarlama tercihi varsayılan olarak kapalıdır. Şu anda pazarlama iletişimi gönderilmemektedir. Gelecekte bu özellik açılırsa yalnız açıkça onay veren kullanıcılara, ilgili iletişim mevzuatı ve tercih yönetimi koşulları sağlanarak gönderim yapılabilir.',
        ],
      },
      {
        title: '5. Rızayı geri alma',
        paragraphs: [
          'Açık rızanızı geleceğe etkili olarak Ayarlar üzerinden değiştirebilir veya ai@niyetsen.com adresine yazabilirsiniz. Geri alma öncesindeki hukuka uygun işlemenin geçerliliği etkilenmez. Bir özelliğin gerekli rızasını kapatmanız o özelliğin kullanımını durdurabilir.',
        ],
      },
    ],
  },
  terms: {
    title: 'Kullanım Koşulları',
    shortTitle: 'Koşullar',
    version: LEGAL_VERSIONS.terms,
    summary:
      'Niyetsen’in hesap, AI destekli plan, görev ve kanıt özelliklerinin kullanımına ilişkin temel koşullardır.',
    sections: [
      {
        title: '1. Hizmeti sunan',
        paragraphs: [
          'Niyetsen hizmeti Şahin Çelebi tarafından sunulmaktadır. İletişim: ai@niyetsen.com. Şirket, VKN, MERSİS, KEP ve iş adresi henüz kurulmamış veya belirlenmemiştir.',
        ],
      },
      {
        title: '2. Hizmetin kapsamı',
        paragraphs: [
          'Niyetsen; kullanıcının hedeflerini AI destekli sohbetle yapılandıran, plan ve görevler oluşturan, ilerleme/puan/zincir kaydı tutan bir yaşam planlama aracıdır. AI çıktıları hata içerebilir ve profesyonel değerlendirme yerine geçmez. Tıbbi, psikolojik, hukuki veya finansal tavsiye sunulmaz.',
        ],
      },
      {
        title: '3. Kullanıcı sorumluluğu',
        bullets: [
          'Doğru hesap bilgisi sağlamak ve hesabın güvenliğini korumak.',
          'Başkalarının kişisel verisini, yüzünü veya özel içeriğini izinsiz paylaşmamak.',
          'Hukuka aykırı, zararlı veya hizmeti kötüye kullanan içerik göndermemek.',
          'Görevleri kendi sağlık, güvenlik ve koşullarına göre değerlendirmek; riskli görünen görevi yapmamak.',
        ],
      },
      {
        title: '4. Fotoğraf ve cihaz özellikleri',
        paragraphs: [
          'Kanıt fotoğrafı yalnız uygulama içi kamera ve kullanıcı seçimiyle alınır. Konum, bildirim ve takvim gibi cihaz özellikleri ilgili izin verilirse çalışır. İşletim sistemi kısıtları nedeniyle bildirimler gerçek sistem alarmı değildir ve kesin teslim garantisi verilmez.',
        ],
      },
      {
        title: '5. Fikri haklar ve üçüncü taraf içerik',
        paragraphs: [
          'Niyetsen markası ve uygulama içeriği üzerindeki haklar saklıdır. Unsplash görselleri ilgili fotoğrafçı ve Unsplash koşullarına tabidir; uygulamada mümkün olduğunda atıf gösterilir. Kullanıcı, yüklediği içeriğin işlevin sunulması için gerekli teknik işlemlerine izin verir.',
        ],
      },
      {
        title: '6. Ücretli hizmetler',
        paragraphs: [
          'Ücretli abonelik ve RevenueCat entegrasyonu şu anda aktif değildir. Etkinleştirilirse fiyat, yenileme, iptal ve satın alımı geri yükleme koşulları satın alma öncesinde ayrıca gösterilecek; ödemeler Apple App Store veya Google Play üzerinden yürütülecektir.',
        ],
      },
      {
        title: '7. Hesabın sonlandırılması ve değişiklikler',
        paragraphs: [
          'Kullanıcı hesabını Ayarlar’dan silebilir. Hizmetin güvenliği veya hukuki zorunluluklar için kötüye kullanım halinde erişim sınırlandırılabilir. Koşullar önemli ölçüde değişirse yeni sürüm yayımlanır ve gerektiğinde yeniden kabul istenir.',
        ],
      },
    ],
  },
};

