import { LEGAL_VERSIONS, type LegalDocument, type LegalDocumentId } from '@/constants/legal-shared';

const controller =
  'Niyetsen ist noch nicht als Gesellschaft eingetragen. Verantwortlicher ist Şahin Çelebi. ' +
  'Datenschutz und Recht: ai@niyetsen.com. Instagram ist nur ein Ankündigungskanal; Anträge nur per E-Mail.';

export const LEGAL_DOCUMENTS_DE: Record<LegalDocumentId, LegalDocument> = {
  privacy: {
    title: 'Datenschutzerklärung',
    shortTitle: 'Datenschutz',
    version: LEGAL_VERSIONS.privacyPolicy,
    summary:
      'Welche Daten Niyetsen und niyetsen.com verarbeiten, warum, wer sie erhält, wie lange sie bleiben und wie Sie sie löschen. Für Google Play, den App Store, KVKK, DSGVO und CCPA.',
    sections: [
      {
        title: '1. Verantwortlicher und Geltungsbereich',
        paragraphs: [
          controller,
          'Diese Erklärung gilt für niyetsen.com sowie die iOS- und Android-Apps (com.niyetsenai / com.niyetsen.app). Zahlungen verarbeiten Apple, Google Play und RevenueCat. Niyetsen speichert keine Kartennummern.',
        ],
      },
      {
        title: '2. Verarbeitete personenbezogene Daten',
        bullets: [
          'Konto: Name, E-Mail, Apple- oder Google-Anmeldekennung, Supabase-Nutzer-ID.',
          'Profil: Geburtsdatum, Sternzeichen, Zeitzone, Sprache/Region, optionales Geschlecht nur für die Anrede.',
          'Inhalte: Chat, Absicht, Pläne, Aufgaben und mystische Begleitung.',
          'Nachweis- und Wahrsagefotos: nur die In-App-Kamera. Keine Galerie. Keine Biometrie.',
          'Spielstand: Punkte, Kette, Kategorien, Entschuldigungen, Rang, Erinnerungszeit.',
          'Mystik: Tarot, Kaffee, Hand, Horoskop und Tageskontingente.',
          'Optionale Lig: Alias, Punkte, Kette. Echter Name und E-Mail bleiben verborgen.',
          'Abo: Tarif und Store-Status. Keine Kartendaten bei Niyetsen.',
          'Technik: Sitzung, Sicherheit, Fehlerprotokolle; Gerät/OS zum Betrieb.',
          'Website-Frühzugang: Name, E-Mail, Plattform nur bei Absenden des Formulars.',
        ],
        paragraphs: [
          'Standort wird nicht erhoben. Kein Tracking über Werbe-IDs (ATT / Play). Keine Übermittlung an Pinterest. Kein Verkauf und kein „Sharing“ für werbliche Profilbildung.',
        ],
      },
      {
        title: '3. Besondere Kategorien und Einwilligung',
        paragraphs: [
          'Gesundheit, Religion, Politik oder ähnliche besondere Daten werden nicht erfragt. Chat ist Freitext; schreiben Sie solches, stützt sich die Verarbeitung auf Ihre KI-Einwilligung (KVKK Art. 6 / DSGVO Art. 9). Ohne Einwilligung bleibt das Konto; Chat, Plan und mystische Begleitung sind aus.',
          'Nachweisfotos brauchen eine eigene Einwilligung. Ohne sie wird kein Foto hochgeladen. Fotos dienen nur der Aufgabenerfüllung — nicht der Gesichtserkennung.',
        ],
      },
      {
        title: '4. Zwecke und Rechtsgrundlagen',
        bullets: [
          'Konto, Aufgaben, Punkte, Kette: Vertrag (KVKK 5/2-c; DSGVO 6/1-b).',
          'KI-Chat, Pläne, Wahrsagen, mystische Begleitung, Nachweisfotos: Einwilligung (KVKK 5/1 und ggf. 6; DSGVO 6/1-a und 9).',
          'Sicherheit, Missbrauch, Fehlerbehebung: berechtigte Interessen (KVKK 5/2-f; DSGVO 6/1-f).',
          'Store-Abo und gesetzliche Buchhaltung: rechtliche Pflicht (KVKK 5/2-ç; DSGVO 6/1-c).',
        ],
        paragraphs: [
          'Derzeit keine Marketing-E-Mails oder SMS. Falls später, nur mit diesem optionalen Kästchen. Widerruf in den Einstellungen oder per ai@niyetsen.com.',
        ],
      },
      {
        title: '5. Empfänger und Drittlandtransfer',
        bullets: [
          'Google Gemini: Chat, Pläne, Mystik/Wahrsagen und Nachweisfotos zur Antwort. Niyetsen trainiert kein eigenes Modell mit Ihren Daten. Google richtet sich nach den Gemini-API-Bedingungen.',
          'Supabase: Anmeldung, Datenbank, Fotospeicher.',
          'Railway: API-Hosting.',
          'Apple, Google Play, RevenueCat: Anmeldung und In-App-Kauf. Zahlungscontroller ist der Store.',
          'Unsplash: Planbilder. Ihr Chattext wird nicht gesendet.',
          'PostHog / Sentry: nur wenn Schlüssel konfiguriert sind.',
          'Behörden: soweit gesetzlich vorgeschrieben.',
        ],
        paragraphs: [
          'Infrastruktur kann in der EU, im Vereinigten Königreich, in den USA oder anderswo liegen. Transfers nach KVKK Art. 9 und DSGVO Art. 44–49 (Angemessenheit, Standardvertragsklauseln oder Ausnahme). Kein Datenverkauf.',
        ],
      },
      {
        title: '6. Speicherung und Löschung',
        bullets: [
          'Konto: Mitgliedschaft, danach höchstens 3 Jahre nach Löschantrag.',
          'Chat, Pläne, Mystik, Wahrsagelog: Mitgliedschaft, danach höchstens 1 Jahr.',
          'Nachweisfotos: höchstens 1 Jahr oder bis zur Kontolöschung.',
          'Punkte, Kette, Liga-Alias: Mitgliedschaft, danach höchstens 2 Jahre.',
          'Zahlungs-/Rechnungsdaten: gesetzliche Frist (oft bis 10 Jahre; meist im Store).',
          'Sicherheitsprotokolle: höchstens 6 Monate.',
        ],
      },
      {
        title: '7. Ihre Rechte (KVKK, DSGVO, CCPA)',
        paragraphs: [
          'KVKK Art. 11: Auskunft, Berichtigung, Löschung, Widerspruch. E-Mail ai@niyetsen.com, Betreff „KVKK Başvurusu“. Antwort binnen 30 Tagen. Beschwerde bei der KVKK-Behörde möglich.',
          'EU/EWR (DSGVO) und Vereinigtes Königreich: Auskunft, Berichtigung, Löschung, Einschränkung, Übertragbarkeit, Widerspruch, Widerruf. Beschwerde z. B. bei BfDI/Landesbeauftragten, CNIL oder ICO.',
          'Kalifornien (CCPA/CPRA): Know, Delete, Correct. Wir verkaufen keine Daten und „sharen“ sie nicht für Cross-Context-Werbung.',
        ],
      },
      {
        title: '8. Wahrsagen, Horoskop und Mystik',
        paragraphs: [
          'Tarot, Kaffee, Hand, Horoskop und mystischer Chat sind Unterhaltung — kein Schicksal, keine medizinische, rechtliche oder finanzielle Beratung. Im Store nachrangig. Ein falsches Foto verbraucht kein Tagesrecht. Bei Krisensignal stoppt das Wahrsagen.',
        ],
      },
      {
        title: '9. Optionale Alias-Liga',
        paragraphs: [
          'Nur mit Opt-in. Andere sehen Alias, Punkte und Kette — nicht den echten Namen. Austritt jederzeit. Kontolöschung löscht den Alias. Kein Bloßstellen.',
        ],
      },
      {
        title: '10. Geräteberechtigungen',
        bullets: [
          'Kamera: nur beim Nachweis- oder Wahrsagefoto.',
          'Mitteilungen: zur gewählten Uhrzeit; kein Systemalarm.',
          'Kalender: nur wenn Sie eine Aufgabe hinzufügen.',
          'Standort: wird nicht angefragt und nicht verarbeitet.',
        ],
      },
      {
        title: '11. Kontolöschung',
        paragraphs: [
          'Profil → Konto löschen. Ohne App: niyetsen.com/account-deletion.html oder /konto-loeschen.html. Erfüllt Play- und App-Store-Regeln.',
        ],
      },
      {
        title: '12. Cookies',
        paragraphs: [
          'Die Website darf notwendige Cookies setzen. Werbe-/Mess-Tags nur nach „Akzeptieren“ in der Cookie-Leiste.',
        ],
      },
      {
        title: '13. Kinder (18+)',
        paragraphs: [
          'Der Dienst richtet sich nicht an Personen unter 18 (einschließlich COPPA). Bei der Anmeldung bestätigen Sie 18+. Unter-18-Daten werden gelöscht.',
        ],
      },
      {
        title: '14. Automatisierte Verarbeitung und Sicherheit',
        paragraphs: [
          'Punkte und Ketten sind Spielregeln, keine Rechts- oder Kreditentscheidung. KI-Antworten sind Hilfen, keine alleinige Entscheidungsgrundlage.',
          'JWT, HTTPS, Zugriffskontrolle, privater Fotospeicher. Fotos jpeg/png, max. 5 MB. Meldepflichten bei Verletzungen werden eingehalten.',
        ],
      },
      {
        title: '15. Änderungen',
        paragraphs: [
          'Aktualisierung mit neuer Version und Datum. Wesentliche Änderungen können eine erneute Einwilligung in der App auslösen.',
        ],
      },
    ],
  },
  kvkk: {
    title: 'Datenschutzhinweis',
    shortTitle: 'Hinweis',
    version: LEGAL_VERSIONS.privacyPolicy,
    summary:
      'Erhebung und Ihre Rechte nach KVKK und — in der EU — nach der DSGVO.',
    sections: [
      {
        title: '1. Verantwortlicher',
        paragraphs: [controller],
      },
      {
        title: '2. Erhebung',
        paragraphs: [
          'Elektronisch über Registrierung, Profil, Chat, Aufgaben, In-App-Kamera, Apple/Google-Login und Techniklogs. Kein Standort.',
        ],
      },
      {
        title: '3. Kategorien und Zwecke',
        bullets: [
          'Identität und Kontakt: Mitgliedschaft und Sitzung.',
          'Profil: Anrede, Sternzeichen, Sprache, Zeitzone, 18+.',
          'Inhalte: Absicht, Plan, mystische Begleitung.',
          'Wahrsagelog: Unterhaltung und Kontingent.',
          'Liga-Alias: optional; keine echte Identität.',
          'Fortschritt: Aufgaben, Punkte, Kette.',
          'Fotos: Ihr Nachweis- oder Wahrsagefoto.',
          'Technik: Sicherheit und Fehler.',
        ],
      },
      {
        title: '4. Rechtsgrundlagen',
        paragraphs: [
          'Kerndienst: Vertrag, Pflicht, berechtigte Interessen (KVKK 5/2; DSGVO 6). KI, Wahrsagen und Fotos brauchen die Einwilligung auf dem Bildschirm.',
        ],
      },
      {
        title: '5. Empfänger',
        paragraphs: [
          'Google Gemini, Supabase, Railway, Apple/Google, Unsplash (nur Bilder), RevenueCat, ggf. PostHog/Sentry, Behörden. Details: Datenschutzerklärung Abschnitt 5.',
        ],
      },
      {
        title: '6. Rechte und Antrag',
        bullets: [
          'KVKK Art. 11 und DSGVO Art. 15–21.',
          'ai@niyetsen.com — Betreff „Privacy Request“ oder „KVKK Başvurusu“.',
          'Antwort binnen 30 Tagen.',
        ],
      },
    ],
  },
  consent: {
    title: 'Einwilligung und Einstellungen',
    shortTitle: 'Einwilligung',
    version: LEGAL_VERSIONS.kvkkConsent,
    summary:
      'KI, Fotos und Marketing sind getrennte Wahl. Das Lesen der Texte ist noch keine Einwilligung. 18+ ist eine Eignungserklärung.',
    sections: [
      {
        title: '1. Hinweise gelesen',
        paragraphs: [
          'Das Häkchen bei Datenschutz/Hinweis dokumentiert die Information. Es ist nicht zugleich KI-, Foto- oder Marketingeinwilligung.',
        ],
      },
      {
        title: '2. Bestätigung 18+',
        paragraphs: [
          'Der Dienst ist nur für Personen ab 18 Jahren. Das entspricht der Altersangabe in App Store und Play Store.',
        ],
      },
      {
        title: '3. KI-Chat, Pläne und Mystik',
        paragraphs: [
          'Mit Einwilligung werden Chat, Absicht, Profil, Plan, Wahrsagen und Mystik zur Antwort verarbeitet und können an Google Gemini gehen. Ohne Einwilligung bleiben diese Funktionen aus; Konto und Rechtstexte bleiben erreichbar.',
        ],
      },
      {
        title: '4. Nachweisfotos',
        paragraphs: [
          'Mit Einwilligung kann das Aufgabenfoto gespeichert und mit Gemini geprüft werden. Aus = kein Fotonachweis.',
        ],
      },
      {
        title: '5. Marketing',
        paragraphs: [
          'Standard aus. Derzeit keine Marketing-E-Mails oder SMS.',
        ],
      },
      {
        title: '6. Widerruf',
        paragraphs: [
          'In den Einstellungen oder per ai@niyetsen.com für die Zukunft. Rechtmäßige Verarbeitung davor bleibt gültig.',
        ],
      },
    ],
  },
  terms: {
    title: 'Nutzungsbedingungen',
    shortTitle: 'Bedingungen',
    version: LEGAL_VERSIONS.terms,
    summary:
      'Konto, KI, Nachweis, Wahrsagen, Liga und Abos im App Store / Google Play einschließlich Apple 3.1.2 und Play-Abrechnung.',
    sections: [
      {
        title: '1. Anbieter',
        paragraphs: [
          'Anbieter ist Şahin Çelebi. Kontakt: ai@niyetsen.com. Die Datenschutzerklärung ist Teil dieser Bedingungen.',
        ],
      },
      {
        title: '2. Dienst',
        paragraphs: [
          'Niyetsen macht aus einer Absicht einen Tagesplan und führt Aufgaben, Punkte und Ketten. Keine Erfolgsgarantie. Keine medizinische, rechtliche oder finanzielle Beratung.',
        ],
      },
      {
        title: '3. Eignung (18+)',
        paragraphs: [
          'Nur für Personen ab 18. Geburtsdatum und Bestätigungskästchen stützen die Regel. Sie haften für Kontoangaben und Login. Keine Kontoübertragung.',
        ],
      },
      {
        title: '4. Zulässige Nutzung',
        bullets: [
          'Nachweis nur mit der In-App-Kamera.',
          'Kein fremdes Gesicht, Foto oder Daten ohne Erlaubnis.',
          'Kein Betrug, keine Belästigung, keine rechtswidrigen Inhalte, kein Angriff auf den Dienst.',
          'Jede Aufgabe an der eigenen Gesundheit messen.',
        ],
      },
      {
        title: '5. KI, Wahrsagen und Mystik',
        paragraphs: [
          'Antworten kommen von KI und können falsch sein. Wahrsagen und Horoskop sind Unterhaltung — kein Schicksal und kein Expertenrat.',
        ],
      },
      {
        title: '6. Psychische Gesundheit',
        paragraphs: [
          'Niyetsen ist keine Therapie, Diagnose oder Notfallhilfe. Bei Selbst- oder Fremdgefährdung lokale Notfallnummer oder eine Ärztin / einen Arzt kontaktieren.',
        ],
      },
      {
        title: '7. Alias-Liga',
        paragraphs: [
          'Optional. Sichtbar: Alias, Punkte, Kette. Kein Bloßstellen. Austritt jederzeit.',
        ],
      },
      {
        title: '8. Abos (App Store und Google Play)',
        bullets: [
          'Kostenlos: Chat bleibt offen. Zweiter Plan, Nachweis, Boni, Idol-Wege und Teile der Mystik brauchen Abo oder Testphase.',
          'Zahlung nur über Apple App Store / Google Play IAP und RevenueCat. Kein externer Zahlungslink.',
          'Preis, Laufzeit und Währung sind die im Store angezeigten. Die App erfindet keinen Preis.',
          'Apple: Belastung der Apple-ID bei Bestätigung. Automatische Verlängerung, wenn Auto-Renew nicht mindestens 24 Stunden vor Periodenende ausgeschaltet wird. Belastung für die Verlängerung innerhalb von 24 Stunden vor Periodenende. Verwalten: Einstellungen → Apple-ID → Abonnements.',
          'Google Play: wiederkehrende Zahlung über das Play-Konto. Verwalten: Google Play → Zahlungen und Abos.',
          '„Käufe wiederherstellen“ lädt Rechte desselben Store-Kontos neu.',
          'Ungenutzte Testzeit kann bei Kauf eines Abos verfallen (Store-Regel).',
          'Erstattungen nach Store-Politik. Niyetsen kann Ihre Karte nicht direkt erstatten.',
        ],
      },
      {
        title: '9. Inhalte und Schutzrechte',
        paragraphs: [
          'Ihre Absichten und Nachrichten bleiben Ihnen. Sie räumen uns eine weltweite, unentgeltliche, widerrufliche Lizenz ein, sie zur Leistungserbringung zu verarbeiten. Name, UI und Texte von Niyetsen sind vorbehalten. Unsplash folgt eigener Lizenz.',
        ],
      },
      {
        title: '10. Ende und Haftung',
        paragraphs: [
          'Konto löschen im Profil oder unter niyetsen.com/account-deletion.html. Bei Verstoß oder Sicherheitsrisiko kann der Zugang beschränkt werden.',
          'Dienst „wie besehen“, soweit zwingendes Recht nichts anderes sagt. Keine Haftung für mittelbare Schäden durch Netz, Store oder Gemini oder durch Ihre Entscheidungen. Zwingende Verbraucherrechte bleiben.',
        ],
      },
      {
        title: '11. Anwendbares Recht',
        paragraphs: [
          'Recht der Republik Türkei. EU-Verbraucher behalten den zwingenden Schutz ihres Wohnsitzstaates.',
        ],
      },
    ],
  },
};
