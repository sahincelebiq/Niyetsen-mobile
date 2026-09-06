import { LEGAL_VERSIONS, type LegalDocument, type LegalDocumentId } from '@/constants/legal-shared';

const controller =
  'Niyetsen n’est pas encore constitué en société. Le responsable du traitement est Şahin Çelebi. ' +
  'Demandes vie privée et droit : ai@niyetsen.com. Instagram sert uniquement aux annonces ; les demandes se font par e-mail.';

export const LEGAL_DOCUMENTS_FR: Record<LegalDocumentId, LegalDocument> = {
  privacy: {
    title: 'Politique de confidentialité',
    shortTitle: 'Confidentialité',
    version: LEGAL_VERSIONS.privacyPolicy,
    summary:
      'Quelles données Niyetsen et niyetsen.com traitent, pourquoi, qui les reçoit, combien de temps, et comment les supprimer. Rédigé pour le Play Store, l’App Store, la KVKK, le RGPD et le CCPA.',
    sections: [
      {
        title: '1. Responsable et champ',
        paragraphs: [
          controller,
          'Cette politique couvre niyetsen.com et les apps iOS et Android (com.niyetsenai / com.niyetsen.app). Apple, Google Play et RevenueCat traitent les paiements. Niyetsen ne stocke pas de numéro de carte.',
        ],
      },
      {
        title: '2. Données traitées',
        bullets: [
          'Compte : nom, e-mail, identifiants Apple ou Google, identifiant Supabase.',
          'Profil : date de naissance, signe, fuseau, langue/région, genre optionnel pour la seule formule d’adresse.',
          'Contenu : chat, intention, plans, tâches et guide mystique.',
          'Photos de preuve et de voyance : caméra in-app uniquement. Pas de galerie. Pas de biométrie.',
          'Jeu : points, chaîne, catégories, excuses, rang, heure de rappel.',
          'Mystique : tarot, café, main, horoscope et quotas journaliers.',
          'Ligue optionnelle : surnom, points, chaîne. Nom réel et e-mail cachés.',
          'Abonnement : offre et statut boutique. Pas de carte chez Niyetsen.',
          'Technique : session, sécurité, journaux d’erreur ; appareil/OS nécessaires.',
          'Formulaire d’accès anticipé : nom, e-mail, plateforme seulement si vous l’envoyez.',
        ],
        paragraphs: [
          'Pas de géolocalisation. Pas de suivi par identifiant publicitaire (ATT / Play). Pas d’envoi à Pinterest. Pas de vente ni de « share » pour la publicité inter-contextes.',
        ],
      },
      {
        title: '3. Données sensibles et consentement',
        paragraphs: [
          'Nous ne demandons pas santé, religion, opinions ou données sensibles comparables. Le chat est un texte libre ; si vous en écrivez, le traitement repose sur votre consentement IA (KVKK art. 6 / RGPD art. 9). Sans consentement le compte reste ; chat, plan et guide mystique restent fermés.',
          'La photo de preuve exige un consentement distinct. Sans lui, aucune photo n’est envoyée. Elle sert à vérifier la tâche — pas à reconnaître un visage.',
        ],
      },
      {
        title: '4. Finalités et bases légales',
        bullets: [
          'Compte, tâches, points, chaîne : contrat (KVKK 5/2-c ; RGPD 6/1-b).',
          'Chat IA, plans, voyance, guide mystique, photos de preuve : consentement (KVKK 5/1 et 6 si besoin ; RGPD 6/1-a et 9).',
          'Sécurité, abus, correction d’erreurs : intérêt légitime (KVKK 5/2-f ; RGPD 6/1-f).',
          'Abonnement boutique et obligations comptables : obligation légale (KVKK 5/2-ç ; RGPD 6/1-c).',
        ],
        paragraphs: [
          'Pas d’e-mail ni SMS marketing aujourd’hui. S’ils arrivent, uniquement via cette case optionnelle. Retrait dans Réglages ou à ai@niyetsen.com.',
        ],
      },
      {
        title: '5. Destinataires et transferts',
        bullets: [
          'Google Gemini : chat, plans, voyance/mystique et photos de preuve pour générer une réponse. Niyetsen n’entraîne pas son propre modèle avec vos données. Google suit les conditions de l’API Gemini.',
          'Supabase : authentification, base, stockage des preuves.',
          'Railway : hébergement de l’API.',
          'Apple, Google Play, RevenueCat : connexion et achats in-app. La boutique est responsable du paiement.',
          'Unsplash : images de cartes de plan. Votre texte de chat n’est pas envoyé.',
          'PostHog / Sentry : seulement si les clés sont configurées.',
          'Autorités : si la loi l’exige.',
        ],
        paragraphs: [
          'L’infrastructure peut être dans l’UE, au Royaume-Uni, aux États-Unis ou ailleurs. Transferts selon KVKK art. 9 et RGPD art. 44–49 (adéquation, clauses types ou exception). Pas de vente de données.',
        ],
      },
      {
        title: '6. Durées et suppression',
        bullets: [
          'Compte : pendant l’adhésion, puis 3 ans max. après une demande de suppression.',
          'Chat, plans, mystique, journaux de voyance : adhésion, puis 1 an max. après suppression.',
          'Photos de preuve : 1 an max. ou jusqu’à la suppression du compte.',
          'Points, chaîne, surnom de ligue : adhésion, puis 2 ans max.',
          'Paiement / facture : durée légale (souvent jusqu’à 10 ans ; souvent chez la boutique).',
          'Journaux de sécurité : 6 mois max.',
        ],
      },
      {
        title: '7. Vos droits (KVKK, RGPD, CCPA)',
        paragraphs: [
          'KVKK art. 11 : accès, information, rectification, suppression, opposition. E-mail ai@niyetsen.com, objet « KVKK Başvurusu ». Réponse sous 30 jours. Réclamation possible auprès du Kurul KVKK.',
          'UE/EEE (RGPD) et Royaume-Uni : accès, rectification, effacement, limitation, portabilité, opposition, retrait du consentement. Réclamation auprès de votre autorité (CNIL, ICO, etc.).',
          'Californie (CCPA/CPRA) : know, delete, correct. Nous ne vendons pas les données et ne les « shareons » pas pour la pub inter-contextes.',
        ],
      },
      {
        title: '8. Voyance, horoscope et mystique',
        paragraphs: [
          'Tarot, café, main, horoscope et chat mystique sont un divertissement — pas un destin ni un conseil médical, juridique ou financier. Secondaire dans les fiches stores. Une mauvaise photo n’utilise pas un droit. La voyance s’arrête en cas de signal de crise.',
        ],
      },
      {
        title: '9. Ligue à surnom (optionnelle)',
        paragraphs: [
          'Sur adhésion. Les autres voient surnom, points et chaîne — pas le vrai nom. Vous pouvez partir. La suppression du compte lance celle du surnom. Pas d’humiliation.',
        ],
      },
      {
        title: '10. Autorisations de l’appareil',
        bullets: [
          'Caméra : seulement pour une preuve ou une photo de voyance.',
          'Notifications : rappel à l’heure choisie ; pas une alarme système garantie.',
          'Calendrier : seulement si vous ajoutez une tâche.',
          'Localisation : non demandée et non traitée.',
        ],
      },
      {
        title: '11. Suppression du compte',
        paragraphs: [
          'Profil → Supprimer mon compte. Sans l’app : niyetsen.com/account-deletion.html ou /suppression-compte.html. Conforme aux règles Play et App Store.',
        ],
      },
      {
        title: '12. Cookies',
        paragraphs: [
          'Le site peut utiliser des cookies strictement nécessaires. Les balises pub/mesure ne se chargent qu’après « Accepter » sur le bandeau.',
        ],
      },
      {
        title: '13. Enfants (18+)',
        paragraphs: [
          'Le service ne s’adresse pas aux moins de 18 ans (y compris COPPA). L’inscription inclut une confirmation 18+. Les données d’un mineur détecté sont supprimées.',
        ],
      },
      {
        title: '14. Traitement automatisé et sécurité',
        paragraphs: [
          'Points et chaînes sont des règles de jeu, pas une décision juridique ou de crédit. Les réponses IA aident ; elles ne doivent pas fonder seules une décision importante.',
          'JWT, HTTPS, contrôle d’accès, stockage privé des preuves. Photos jpeg/png, 5 Mo max. Notification légale en cas de violation.',
        ],
      },
      {
        title: '15. Modifications',
        paragraphs: [
          'Mise à jour avec une nouvelle version et une date. Un changement important peut redemander le consentement dans l’app.',
        ],
      },
    ],
  },
  kvkk: {
    title: 'Information sur les données',
    shortTitle: 'Information',
    version: LEGAL_VERSIONS.privacyPolicy,
    summary:
      'Collecte et vos droits au titre de la KVKK et, dans l’UE, du RGPD.',
    sections: [
      {
        title: '1. Responsable',
        paragraphs: [controller],
      },
      {
        title: '2. Collecte',
        paragraphs: [
          'Par voie électronique : inscription, profil, chat, tâches, caméra in-app, connexion Apple/Google et journaux techniques. Pas de localisation.',
        ],
      },
      {
        title: '3. Catégories et finalités',
        bullets: [
          'Identité et contact : adhésion et session.',
          'Profil : adresse, signe, langue, fuseau, 18+.',
          'Contenu : intention, plan, guide mystique.',
          'Journaux de voyance : divertissement et quota.',
          'Surnom de ligue : optionnel ; pas d’identité réelle.',
          'Progression : tâches, points, chaîne.',
          'Photos : la preuve ou la voyance que vous prenez.',
          'Technique : sécurité et erreurs.',
        ],
      },
      {
        title: '4. Bases légales',
        paragraphs: [
          'Service de base : contrat, obligation, intérêts légitimes (KVKK 5/2 ; RGPD 6). L’IA, la voyance et les photos exigent le consentement à l’écran.',
        ],
      },
      {
        title: '5. Destinataires',
        paragraphs: [
          'Google Gemini, Supabase, Railway, Apple/Google, Unsplash (images seules), RevenueCat, PostHog/Sentry si configurés, autorités si requis. Détail : politique §5.',
        ],
      },
      {
        title: '6. Droits et demande',
        bullets: [
          'KVKK art. 11 et RGPD art. 15–21.',
          'ai@niyetsen.com — objet « Privacy Request » ou « KVKK Başvurusu ».',
          'Réponse sous 30 jours.',
        ],
      },
    ],
  },
  consent: {
    title: 'Consentement et préférences',
    shortTitle: 'Consentement',
    version: LEGAL_VERSIONS.kvkkConsent,
    summary:
      'IA, photos et marketing sont des choix séparés. Lire les textes n’est pas un consentement. La case 18+ est une déclaration d’éligibilité.',
    sections: [
      {
        title: '1. Lecture des notices',
        paragraphs: [
          'Cocher que vous avez lu la politique enregistre l’information. Ce n’est pas à soi seul le consentement IA, photo ou marketing.',
        ],
      },
      {
        title: '2. Confirmation 18+',
        paragraphs: [
          'Le service est réservé aux personnes de 18 ans ou plus, conformément à la déclaration d’âge App Store et Play Store.',
        ],
      },
      {
        title: '3. Chat IA, plans et mystique',
        paragraphs: [
          'Si vous acceptez, chat, intention, profil, plan, voyance et mystique sont traités pour répondre et peuvent aller à Google Gemini. Sans cela ces fonctions restent fermées ; le compte et les pages juridiques restent ouverts.',
        ],
      },
      {
        title: '4. Photos de preuve',
        paragraphs: [
          'Si vous acceptez, la photo de tâche peut être stockée et évaluée par Gemini. Désactivé = pas de preuve photo.',
        ],
      },
      {
        title: '5. Marketing',
        paragraphs: [
          'Désactivé par défaut. Pas d’e-mail ni SMS marketing aujourd’hui.',
        ],
      },
      {
        title: '6. Retrait',
        paragraphs: [
          'Dans Réglages ou via ai@niyetsen.com pour l’avenir. Le traitement licite antérieur reste valable.',
        ],
      },
    ],
  },
  terms: {
    title: 'Conditions d’utilisation',
    shortTitle: 'Conditions',
    version: LEGAL_VERSIONS.terms,
    summary:
      'Compte, IA, preuve, voyance, ligue et abonnements App Store / Google Play, y compris Apple 3.1.2 et la facturation Play.',
    sections: [
      {
        title: '1. Éditeur',
        paragraphs: [
          'Le service est fourni par Şahin Çelebi. Contact : ai@niyetsen.com. La politique de confidentialité fait partie de ces conditions.',
        ],
      },
      {
        title: '2. Service',
        paragraphs: [
          'Niyetsen transforme une intention en plan quotidien et suit tâches, points et chaînes. Aucune garantie de résultat. Pas un conseil médical, juridique ou financier.',
        ],
      },
      {
        title: '3. Éligibilité (18+)',
        paragraphs: [
          'Vous devez avoir 18 ans. La date de naissance et la case le confirment. Vous êtes responsable des informations et de la sécurité de connexion. Pas de cession de compte.',
        ],
      },
      {
        title: '4. Usage acceptable',
        bullets: [
          'Caméra in-app uniquement pour la preuve.',
          'Ne pas téléverser le visage, la photo ou les données d’autrui sans permission.',
          'Pas de triche, harcèlement, contenu illicite ni sabotage.',
          'Évaluer chaque tâche selon votre santé et votre sécurité.',
        ],
      },
      {
        title: '5. IA, voyance et mystique',
        paragraphs: [
          'Les réponses sont générées par l’IA et peuvent être fausses. Voyance et horoscope sont un divertissement — pas un destin ni un avis d’expert.',
        ],
      },
      {
        title: '6. Santé mentale',
        paragraphs: [
          'Niyetsen n’est ni une thérapie, ni un diagnostic, ni une urgence. En cas de risque pour vous ou autrui, contactez les secours locaux ou un professionnel de santé.',
        ],
      },
      {
        title: '7. Ligue à surnom',
        paragraphs: [
          'Optionnelle. Visible : surnom, points, chaîne. Pas d’humiliation. Départ libre.',
        ],
      },
      {
        title: '8. Abonnements (App Store et Google Play)',
        bullets: [
          'Offre gratuite : le chat reste ouvert. Un 2e plan, la preuve, les bonus, les chemins Idole et une partie du mystique exigent un abonnement ou un essai.',
          'Paiement uniquement via Apple App Store / Google Play IAP et RevenueCat. Pas de lien de paiement externe.',
          'Prix, durée et devise sont ceux affichés par la boutique. L’app n’invente jamais un prix.',
          'Apple : le paiement est débité sur l’identifiant Apple à la confirmation. L’abonnement se renouvelle automatiquement sauf désactivation de le renouvellement au moins 24 heures avant la fin de la période. Le compte est débité dans les 24 heures précédant la fin. Gérer : Réglages → Identifiant Apple → Abonnements.',
          'Google Play : facturation récurrente sur le compte Play. Gérer : Google Play → Paiements et abonnements.',
          '« Restaurer les achats » recharge les droits du même compte boutique.',
          'Le reliquat d’un essai gratuit peut être perdu à l’achat d’un abonnement (règle boutique).',
          'Remboursements selon la politique de la boutique. Niyetsen ne peut pas rembourser votre carte directement.',
        ],
      },
      {
        title: '9. Vos contenus et nos droits',
        paragraphs: [
          'Vos intentions et messages restent les vôtres. Vous nous accordez une licence mondiale, gratuite et révocable pour les traiter afin de fournir le service. Le nom, l’interface et les textes Niyetsen sont réservés. Images Unsplash selon leur licence.',
        ],
      },
      {
        title: '10. Fin et responsabilité',
        paragraphs: [
          'Supprimez le compte dans Profil ou sur niyetsen.com/account-deletion.html. L’accès peut être limité en cas de manquement ou de risque de sécurité.',
          'Service « en l’état » sauf droit impératif. Pas de responsabilité pour les dommages indirects liés au réseau, à la boutique ou à Gemini, ni à vos décisions. Droits impératifs des consommateurs réservés.',
        ],
      },
      {
        title: '11. Droit applicable',
        paragraphs: [
          'Droit de la République de Türkiye. Si vous êtes consommateur de l’UE, les protections impératives de votre pays de résidence s’appliquent.',
        ],
      },
    ],
  },
};
