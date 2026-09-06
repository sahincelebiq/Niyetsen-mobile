import { LEGAL_VERSIONS, type LegalDocument, type LegalDocumentId } from '@/constants/legal-shared';

const controller =
  'Niyetsen is not yet incorporated. The data controller is Şahin Çelebi. ' +
  'Privacy and legal requests: ai@niyetsen.com. Instagram is an announcement channel only; requests are accepted by email.';

export const LEGAL_DOCUMENTS_EN: Record<LegalDocumentId, LegalDocument> = {
  privacy: {
    title: 'Privacy Policy',
    shortTitle: 'Privacy',
    version: LEGAL_VERSIONS.privacyPolicy,
    summary:
      'What data Niyetsen and niyetsen.com process, why, who receives it, how long we keep it, and how you delete it. Written for Google Play, the App Store, KVKK, GDPR/UK GDPR and CCPA.',
    sections: [
      {
        title: '1. Controller and scope',
        paragraphs: [
          controller,
          'This policy covers niyetsen.com and the Niyetsen iOS and Android apps (com.niyetsenai / com.niyetsen.app). Apple, Google Play and RevenueCat process payments. Niyetsen does not store card numbers.',
        ],
      },
      {
        title: '2. Personal data we process',
        bullets: [
          'Account: name, email, Apple or Google sign-in identifiers, Supabase user id.',
          'Profile: date of birth, zodiac, timezone, language/region, optional gender for address only (“kadın” / “erkek” / “belirtmek istemiyorum”).',
          'Your content: chat, intentions, plans, tasks and mystic-guide messages.',
          'Proof and fortune photos: in-app camera only. No gallery access. No biometrics or identity matching.',
          'Gameplay: points, streak, categories, excuses, rank, reminder time.',
          'Fortune/mystic: tarot, coffee, palm, horoscope results and daily quotas.',
          'Optional nickname league: alias, points, streak. Real name and email are hidden.',
          'Subscription: plan and store transaction status. No card data on Niyetsen.',
          'Technical: session, security and crash logs; device/OS needed to run the app.',
          'Website early-access form: name, email and platform only if you submit it.',
        ],
        paragraphs: [
          'We do not collect location. We do not track you with an advertising id (ATT / Play ads id). We do not send your data to Pinterest. We do not sell personal information or share it for cross-context behavioural advertising.',
        ],
      },
      {
        title: '3. Special-category data and consent',
        paragraphs: [
          'We do not ask for health, religion, politics or similar special-category data. Chat is free text; if you type it, processing relies on your AI consent (KVKK Art. 6 / GDPR Art. 9). Refusing consent keeps the account; chat, plans and the mystic guide stay off.',
          'Proof photos need a separate consent. Without it no photo is uploaded. Photos are used only to check whether a task was done — not for face recognition.',
        ],
      },
      {
        title: '4. Purposes and legal bases',
        bullets: [
          'Account, tasks, points, streak: contract (KVKK 5/2-c; GDPR 6/1-b).',
          'AI chat, plans, fortune, mystic guide, proof photos: consent (KVKK 5/1 and 6 if needed; GDPR 6/1-a and 9).',
          'Security, abuse prevention, debugging: legitimate interests (KVKK 5/2-f; GDPR 6/1-f).',
          'Store subscriptions and required tax/accounting records: legal obligation (KVKK 5/2-ç; GDPR 6/1-c).',
        ],
        paragraphs: [
          'We do not send marketing email or SMS today. If that starts, it will use this optional box only. You can withdraw consent in Settings or by emailing ai@niyetsen.com.',
        ],
      },
      {
        title: '5. Recipients and international transfers',
        bullets: [
          'Google Gemini: chat, plans, fortune/mystic replies and proof photos — to generate a response. Niyetsen does not train its own model on your data. Google’s processing follows the Gemini API terms.',
          'Supabase: auth, database, proof storage.',
          'Railway: API hosting.',
          'Apple, Google Play, RevenueCat: sign-in and in-app purchases. The store is the payment controller.',
          'Unsplash: plan-card images. Your chat text is not sent.',
          'PostHog / Sentry: product events or crashes only if those keys are configured.',
          'Public authorities: where the law requires it.',
        ],
        paragraphs: [
          'Infrastructure may be in the EU, the UK, the United States or elsewhere. Transfers rely on KVKK Art. 9 and GDPR Arts. 44–49 (adequacy, standard contractual clauses or a permitted exception). We do not sell your data.',
        ],
      },
      {
        title: '6. Retention and deletion',
        bullets: [
          'Account: while you are a member, then up to 3 years after a deletion request.',
          'Chat, plans, mystic chat, fortune logs: membership, then up to 1 year after deletion.',
          'Proof photos: up to 1 year or until the account is deleted, whichever is first.',
          'Points, streak, league alias: membership, then up to 2 years after deletion.',
          'Payment/invoice records: as long as tax law requires (often up to 10 years; usually held by the store).',
          'Security logs: up to 6 months.',
        ],
      },
      {
        title: '7. Your rights (KVKK, GDPR, UK GDPR, CCPA)',
        paragraphs: [
          'Türkiye / KVKK Art. 11: access, information, correction, deletion, objection. Email ai@niyetsen.com with subject “KVKK Başvurusu”. We reply within 30 days. You may complain to the KVKK Board.',
          'EU/EEA (GDPR) and United Kingdom (UK GDPR): access, rectification, erasure, restriction, portability, objection, withdraw consent. You may complain to your authority (for example CNIL, BfDI or the ICO).',
          'California (CCPA/CPRA): know, delete, correct. We do not sell personal information and we do not “share” it for cross-context advertising. We will not discriminate for exercising these rights.',
        ],
      },
      {
        title: '8. Fortune, horoscope and mystic content',
        paragraphs: [
          'Tarot, coffee, palm, horoscope and mystic chat are entertainment — not fate, medical, legal or financial advice. In store listings this feature is secondary. A wrong fortune photo does not use a daily right. Fortune stops if a crisis signal is detected.',
        ],
      },
      {
        title: '9. Optional nickname league',
        paragraphs: [
          'Opt-in only. Others see alias, points and streak — not your real name. You can leave. Deleting the account starts deletion of the alias. No shaming ranks.',
        ],
      },
      {
        title: '10. Device permissions',
        bullets: [
          'Camera: only when you take a proof or fortune photo.',
          'Notifications: reminder at the hour you choose; not a system alarm guarantee.',
          'Calendar: only if you choose to add a task.',
          'Location: not requested and not processed.',
        ],
      },
      {
        title: '11. Account deletion',
        paragraphs: [
          'Profile → Delete my account. If you cannot open the app: niyetsen.com/account-deletion.html (also /hesap-silme.html). This meets Google Play and App Store account-deletion rules.',
        ],
      },
      {
        title: '12. Cookies',
        paragraphs: [
          'The website may use strictly necessary cookies. Ads or measurement tags load only after you tap Accept on the cookie bar.',
        ],
      },
      {
        title: '13. Children (18+)',
        paragraphs: [
          'The service is not directed at anyone under 18 (including COPPA). Sign-up includes an 18+ confirmation. If we learn a user is under 18 we delete the data.',
        ],
      },
      {
        title: '14. Automated processing and security',
        paragraphs: [
          'Points and streaks are game rules, not legal or credit decisions. AI replies are assistive and must not be your only basis for important decisions.',
          'We use JWT auth, HTTPS, access control and a private proof store. Photos are jpeg/png, max 5 MB. We notify authorities if the law requires it after a breach.',
        ],
      },
      {
        title: '15. Changes',
        paragraphs: [
          'We update this policy with a new version and effective date. Material changes may trigger in-app re-consent.',
        ],
      },
    ],
  },
  kvkk: {
    title: 'Privacy notice',
    shortTitle: 'Notice',
    version: LEGAL_VERSIONS.privacyPolicy,
    summary:
      'How Niyetsen collects data and what rights you have under KVKK and, if you are in the EU/UK, GDPR / UK GDPR.',
    sections: [
      {
        title: '1. Controller',
        paragraphs: [controller],
      },
      {
        title: '2. How we collect',
        paragraphs: [
          'Electronically from sign-up and profile forms, chat, tasks, the in-app camera, Apple/Google sign-in and technical logs. We do not collect location.',
        ],
      },
      {
        title: '3. Categories and purposes',
        bullets: [
          'Identity and contact: membership and session.',
          'Profile: address, zodiac, language, timezone, 18+ eligibility.',
          'Content: intention, plan, mystic guide.',
          'Fortune logs: entertainment readings and quotas.',
          'League alias: optional; no real identity.',
          'Progress: tasks, points, streak.',
          'Photos: the proof or fortune shot you take.',
          'Technical: security and debugging.',
        ],
      },
      {
        title: '4. Legal bases',
        paragraphs: [
          'Core service: contract, legal duty and legitimate interests (KVKK 5/2; GDPR 6). AI, fortune and photos need the on-screen consent.',
        ],
      },
      {
        title: '5. Recipients',
        paragraphs: [
          'Google Gemini, Supabase, Railway, Apple/Google, Unsplash (images only), RevenueCat, PostHog/Sentry if configured, and authorities if required. Details: Privacy Policy section 5.',
        ],
      },
      {
        title: '6. Rights and how to apply',
        bullets: [
          'KVKK Art. 11 and GDPR Arts. 15–21 (access, deletion, portability, objection).',
          'ai@niyetsen.com — subject “Privacy Request” or “KVKK Başvurusu”.',
          'We respond within 30 days.',
        ],
      },
    ],
  },
  consent: {
    title: 'Consent and preferences',
    shortTitle: 'Consent',
    version: LEGAL_VERSIONS.kvkkConsent,
    summary:
      'AI, photos and marketing are separate choices. Reading the policy is not itself consent. The 18+ box is an eligibility statement.',
    sections: [
      {
        title: '1. Reading the notices',
        paragraphs: [
          'Ticking that you read the Privacy Policy and notice records that you were informed. It is not by itself AI, photo or marketing consent.',
        ],
      },
      {
        title: '2. 18+ confirmation',
        paragraphs: [
          'The service is only for people aged 18 or over. This matches our App Store and Play Store age declaration.',
        ],
      },
      {
        title: '3. AI chat, plans and mystic',
        paragraphs: [
          'If you agree, chat, intention, profile, plan, fortune and mystic messages are processed to reply and may be sent to Google Gemini. Without this consent those features stay off; your account and legal pages stay available.',
        ],
      },
      {
        title: '4. Proof photos',
        paragraphs: [
          'If you agree, the task photo you take may be stored and checked with Gemini. If this is off, photo proof cannot be sent.',
        ],
      },
      {
        title: '5. Marketing',
        paragraphs: [
          'Off by default. We do not send marketing email or SMS today.',
        ],
      },
      {
        title: '6. Withdrawal',
        paragraphs: [
          'Withdraw in Settings or via ai@niyetsen.com for the future. Lawful processing before withdrawal stays valid.',
        ],
      },
    ],
  },
  terms: {
    title: 'Terms of Use',
    shortTitle: 'Terms',
    version: LEGAL_VERSIONS.terms,
    summary:
      'Account, AI, proof, fortune, league and App Store / Google Play subscriptions, including Apple Guideline 3.1.2 and Play billing disclosures.',
    sections: [
      {
        title: '1. Provider',
        paragraphs: [
          'The service is provided by Şahin Çelebi. Contact: ai@niyetsen.com. The Privacy Policy is part of these terms.',
        ],
      },
      {
        title: '2. The service',
        paragraphs: [
          'Niyetsen turns an intention into a daily plan through chat and tracks tasks, points and streaks. No result or behaviour-change guarantee. Not medical, legal or financial advice.',
        ],
      },
      {
        title: '3. Eligibility (18+)',
        paragraphs: [
          'You must be 18 or older. Date of birth and the confirmation box support this rule. You are responsible for account accuracy and sign-in security. You may not transfer the account.',
        ],
      },
      {
        title: '4. Acceptable use',
        bullets: [
          'Use only the in-app camera for proof.',
          'Do not upload another person’s face, photo or data without permission.',
          'No cheating, harassment, illegal content or attempts to break the service.',
          'Judge each task against your own health and safety.',
        ],
      },
      {
        title: '5. AI, fortune and mystic content',
        paragraphs: [
          'Replies are generated by AI and can be wrong. Fortune and horoscope are entertainment — not fate or professional advice. Get expert help for important decisions.',
        ],
      },
      {
        title: '6. Mental health',
        paragraphs: [
          'Niyetsen is not therapy, diagnosis or emergency care. If you or someone else may be at risk of harm, contact local emergency services or a health professional.',
        ],
      },
      {
        title: '7. Nickname league',
        paragraphs: [
          'Optional. Others see alias, points and streak. No shaming. You may leave at any time.',
        ],
      },
      {
        title: '8. Subscriptions (App Store and Google Play)',
        bullets: [
          'Free tier: chat stays open. A second plan, proof, bonuses, Idol paths and some mystic rights need a subscription or trial.',
          'Payment is only via Apple App Store / Google Play IAP and RevenueCat. There is no external payment link.',
          'Price, length and currency are whatever the store shows at purchase. The app never invents a price.',
          'Apple: payment is charged to your Apple ID at confirmation. The subscription renews automatically unless auto-renew is turned off at least 24 hours before the end of the current period. Your account is charged for renewal within 24 hours prior to the end of the current period. Manage or cancel: Settings → Apple ID → Subscriptions.',
          'Google Play: recurring billing is charged to your Play account. Manage or cancel: Google Play → Payments & subscriptions.',
          'Use Restore purchases to reload entitlements on the same store account.',
          'If a free trial is offered, any unused trial time may be forfeited when you buy a subscription (store rule).',
          'Refunds follow the store’s refund policy. Niyetsen cannot refund your card directly.',
        ],
      },
      {
        title: '9. Your content and our IP',
        paragraphs: [
          'Your intentions and messages remain yours. You grant us a worldwide, royalty-free, revocable licence to process them so we can provide the service (plans, proof, fortune replies). Niyetsen’s name, UI and copy are reserved. Unsplash images follow their licence.',
        ],
      },
      {
        title: '10. Ending the account and liability',
        paragraphs: [
          'Delete the account in Profile or at niyetsen.com/account-deletion.html. We may restrict access for breach or security risk.',
          'The service is provided “as is” except where mandatory law says otherwise. Niyetsen is not liable for indirect loss from internet, store or Gemini outages or from your decisions. Mandatory consumer rights remain.',
        ],
      },
      {
        title: '11. Governing law',
        paragraphs: [
          'Laws of the Republic of Türkiye apply. If you are an EU consumer, the mandatory consumer protections of your country of residence still apply.',
        ],
      },
    ],
  },
};
