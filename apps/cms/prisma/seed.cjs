/**
 * CMS seed from apps/web articles / faqs / legalPages (F-11).
 * Idempotent: upserts by slug.
 */
const { PrismaClient } = require('../generated/prisma');

const prisma = new PrismaClient();

const publishedAt = new Date('2026-08-18T00:00:00.000Z');

function sections(pairs) {
  return pairs.map(([heading, text]) => ({ heading, text }));
}

/** SPA articles — 6 guides (apps/web/src/main.jsx). */
const articles = [
  {
    slug: 'car-rental-tunisia-guide',
    imageKey: 'road-travel.jpg',
    titleEn: 'Renting a car in Tunisia: what to know',
    summaryEn:
      'A practical starting point for choosing a vehicle, preparing documents and arranging collection or delivery.',
    sectionsEn: sections([
      [
        'Choose the vehicle around the journey',
        'Think first about passengers, luggage, distance and the roads on your route. A compact car can suit city stays, while a sedan or SUV gives more space for family travel, business visits or longer itineraries.',
      ],
      [
        'Confirm the essentials before arrival',
        'Ask for the exact vehicle availability, delivery point, rental conditions, deposit and final TND quote before you travel. This keeps the handover clear and avoids surprises at the airport or hotel.',
      ],
      [
        'Plan collection or delivery',
        'VIPCAR can coordinate airport and hotel delivery according to your dates. Share your arrival details early so the team can confirm the practical handover.',
      ],
    ]),
    titleFr: 'Louer une voiture en Tunisie : l’essentiel',
    summaryFr:
      'Les points pratiques pour choisir un véhicule, préparer vos documents et organiser la prise en charge ou la livraison.',
    sectionsFr: sections([
      [
        'Choisir selon votre trajet',
        'Pensez aux passagers, aux bagages, aux distances et aux routes prévues. Une citadine convient à un séjour urbain, tandis qu’une berline ou un SUV apporte davantage d’espace pour la famille, les affaires ou un long circuit.',
      ],
      [
        'Confirmer l’essentiel avant l’arrivée',
        'Demandez la disponibilité exacte, le point de livraison, les conditions de location, la caution et le devis final en TND avant votre départ. La remise du véhicule reste ainsi simple et claire.',
      ],
      [
        'Prévoir la prise en charge ou la livraison',
        'VIPCAR peut organiser une livraison à l’aéroport ou à l’hôtel selon vos dates. Partagez vos informations d’arrivée suffisamment tôt pour confirmer les détails pratiques.',
      ],
    ]),
  },
  {
    slug: 'tunis-carthage-airport-guide',
    imageKey: 'airport.jpg',
    titleEn: 'Arriving at Tunis-Carthage Airport',
    summaryEn: 'How to make the first part of your Tunis trip calm, clear and coordinated.',
    sectionsEn: sections([
      [
        'Share your arrival details',
        'Give your flight number, planned arrival time, passenger count and destination when requesting a transfer. It helps the team prepare the route and meet you at the agreed point.',
      ],
      [
        'Choose the right arrival service',
        'A private transfer is ideal when you want to go directly to a hotel, residence or meeting. If you plan to drive during your stay, a rental vehicle can be arranged for airport collection or delivery.',
      ],
      [
        'Keep the first connection simple',
        'Save the VIPCAR contact details before landing and confirm the final instructions before departure. If your flight schedule changes, notify the team as early as possible.',
      ],
    ]),
    titleFr: 'Arriver à l’aéroport Tunis-Carthage',
    summaryFr: 'Comment rendre les premiers instants de votre séjour à Tunis simples et bien organisés.',
    sectionsFr: sections([
      [
        'Partager les détails de votre arrivée',
        'Indiquez votre numéro de vol, l’heure prévue, le nombre de passagers et votre destination lors de la demande. L’équipe peut ainsi préparer le trajet et le point de rendez-vous.',
      ],
      [
        'Choisir le bon service à l’arrivée',
        'Un transfert privé convient si vous souhaitez rejoindre directement un hôtel, une résidence ou un rendez-vous. Si vous prévoyez de conduire, une location peut être organisée à l’aéroport.',
      ],
      [
        'Simplifier le premier trajet',
        'Conservez les coordonnées VIPCAR avant l’atterrissage et confirmez les instructions finales avant le départ. En cas de modification de vol, prévenez l’équipe dès que possible.',
      ],
    ]),
  },
  {
    slug: 'choosing-a-car-in-tunisia',
    imageKey: 'hero-mercedes.jpg',
    titleEn: 'Choosing the right car for your itinerary',
    summaryEn: 'A simple way to match vehicle size, luggage, roads and travel style across Tunisia.',
    sectionsEn: sections([
      [
        'For city breaks and short stays',
        'A compact car is often the most practical option for Tunis and shorter urban stays. It is easy to handle and leaves room in the budget for the rest of the trip.',
      ],
      [
        'For family routes and longer distances',
        'Choose a sedan, SUV or van when you need more luggage capacity, extra seating or better comfort across several destinations. Review the seat and bag information on each vehicle page before requesting a quote.',
      ],
      [
        'For business and special occasions',
        'Premium and luxury models suit executive travel, client arrivals and events. Confirm the preferred vehicle, timings and delivery point with the VIPCAR team in advance.',
      ],
    ]),
    titleFr: 'Choisir la voiture adaptée à votre circuit',
    summaryFr:
      'Une méthode simple pour choisir selon les bagages, les routes et le style de votre voyage en Tunisie.',
    sectionsFr: sections([
      [
        'Pour un séjour urbain ou court',
        'Une citadine est souvent le choix le plus pratique pour Tunis et les séjours urbains. Elle est facile à conduire et laisse plus de budget pour le reste du voyage.',
      ],
      [
        'Pour la famille et les longues distances',
        'Préférez une berline, un SUV ou un van si vous avez davantage de bagages, de passagers ou plusieurs destinations. Consultez les informations de places et de bagages avant de demander un devis.',
      ],
      [
        'Pour les affaires et les occasions spéciales',
        'Les véhicules premium et luxe conviennent aux déplacements exécutifs, aux arrivées de clients et aux événements. Confirmez le modèle souhaité, les horaires et le point de livraison à l’avance.',
      ],
    ]),
  },
  {
    slug: 'rental-documents-and-deposit',
    imageKey: 'interior.jpg',
    titleEn: 'Car rental documents and deposit in Tunisia',
    summaryEn: 'What to prepare before requesting your rental and what to confirm with the provider.',
    sectionsEn: sections([
      [
        'Bring the essential documents',
        'A valid driving licence, passport or identity document and a payment card are normally required. If your licence does not use the Latin alphabet, an International Driving Permit is recommended.',
      ],
      [
        'Ask how the deposit works',
        'The refundable deposit depends on the vehicle and the confirmed rental conditions. Ask for the amount, payment method and release process before the booking is finalised.',
      ],
      [
        'Keep every condition clear',
        'Before travel, confirm insurance, mileage, fuel, delivery, return time and any additional-driver conditions. A clear written confirmation makes the rental easier for everyone.',
      ],
    ]),
    titleFr: 'Documents et caution pour une location en Tunisie',
    summaryFr: 'Ce qu’il faut préparer avant votre demande et confirmer avec le loueur.',
    sectionsFr: sections([
      [
        'Préparer les documents essentiels',
        'Un permis de conduire valide, un passeport ou une pièce d’identité et une carte de paiement sont généralement nécessaires. Si votre permis n’utilise pas l’alphabet latin, un permis international est conseillé.',
      ],
      [
        'Comprendre le fonctionnement de la caution',
        'La caution remboursable dépend du véhicule et des conditions confirmées. Demandez le montant, le mode de paiement et les modalités de restitution avant de finaliser la réservation.',
      ],
      [
        'Clarifier toutes les conditions',
        'Avant le départ, confirmez l’assurance, le kilométrage, le carburant, la livraison, l’horaire de retour et les éventuels conducteurs additionnels. Une confirmation écrite facilite toute la location.',
      ],
    ]),
  },
  {
    slug: 'long-term-car-rental-tunisia',
    imageKey: 'road-travel.jpg',
    titleEn: 'Long-term car rental in Tunisia: how it works',
    summaryEn: 'A practical option for extended stays, business assignments and flexible local travel.',
    sectionsEn: sections([
      [
        'When a longer rental makes sense',
        'Long-term rental can suit expatriates, project teams, extended family visits and business stays. It offers a consistent vehicle and can be simpler than arranging repeated short rentals.',
      ],
      [
        'Share the full requirement',
        'Tell VIPCAR the expected dates, cities, vehicle category, passenger needs and any delivery requirements. The team can confirm what is available for the full period and the final quote.',
      ],
      [
        'Review the agreement carefully',
        'For an extended rental, clarify maintenance, mileage, insurance, deposit, extensions and early-return terms before confirming the service.',
      ],
    ]),
    titleFr: 'Location longue durée en Tunisie : comment ça marche',
    summaryFr:
      'Une solution pratique pour les séjours prolongés, missions professionnelles et déplacements flexibles.',
    sectionsFr: sections([
      [
        'Quand la longue durée est pertinente',
        'La location longue durée convient aux expatriés, équipes en mission, visites familiales prolongées et séjours professionnels. Elle permet de garder un véhicule cohérent sans organiser plusieurs locations courtes.',
      ],
      [
        'Partager le besoin complet',
        'Indiquez vos dates, les villes concernées, la catégorie de véhicule, les passagers et les besoins de livraison. VIPCAR peut confirmer la disponibilité sur toute la période et le devis final.',
      ],
      [
        'Relire les conditions avec attention',
        'Pour une longue durée, clarifiez l’entretien, le kilométrage, l’assurance, la caution, les prolongations et les conditions de retour anticipé avant la confirmation.',
      ],
    ]),
  },
  {
    slug: 'driving-in-tunisia-guide',
    imageKey: 'road-travel.jpg',
    titleEn: 'Driving in Tunisia: practical tips before your trip',
    summaryEn: 'Prepare for a calmer road trip with a few simple local-driving habits.',
    sectionsEn: sections([
      [
        'Plan the route before leaving',
        'For longer drives, check the distance, daylight, fuel stops and your arrival point in advance. Leave extra time when travelling between cities or heading south.',
      ],
      [
        'Drive for the conditions',
        'Road conditions and traffic can vary by area. Stay attentive, keep a safe distance and adapt your speed to the road, weather and visibility.',
      ],
      [
        'Choose a vehicle that fits the route',
        'A compact car may be right for cities, while an SUV or larger vehicle can be more comfortable for family travel, luggage or longer road trips. Ask VIPCAR if you are unsure which category suits your plan.',
      ],
    ]),
    titleFr: 'Conduire en Tunisie : conseils pratiques avant le départ',
    summaryFr: 'Préparez un road trip plus serein avec quelques habitudes simples.',
    sectionsFr: sections([
      [
        'Préparer l’itinéraire avant de partir',
        'Pour les longs trajets, vérifiez la distance, la lumière du jour, les arrêts carburant et votre point d’arrivée. Prévoyez une marge de temps entre les villes ou vers le sud.',
      ],
      [
        'Adapter la conduite aux conditions',
        'La circulation et l’état des routes peuvent varier selon les zones. Restez attentif, gardez vos distances et adaptez votre vitesse à la route, à la météo et à la visibilité.',
      ],
      [
        'Choisir un véhicule adapté au trajet',
        'Une citadine peut suffire en ville, tandis qu’un SUV ou un véhicule plus grand apporte davantage de confort pour la famille, les bagages ou les longs circuits. Demandez conseil à VIPCAR en cas de doute.',
      ],
    ]),
  },
];

/** SPA FAQ — 4 Q&A pairs EN/FR. */
const faqs = [
  {
    slug: 'documents',
    sortOrder: 1,
    questionEn: 'What documents do I need to rent a car?',
    answerEn:
      'A valid driving licence held for at least one year, your passport or ID, and a bank card. An International Driving Permit is recommended if your licence is not in the Latin alphabet.',
    questionFr: 'Quels documents faut-il pour louer ?',
    answerFr:
      'Un permis valide depuis au moins un an, votre passeport ou pièce d’identité et une carte bancaire. Le permis international est conseillé si votre permis n’utilise pas l’alphabet latin.',
  },
  {
    slug: 'airport-pickup',
    sortOrder: 2,
    questionEn: 'Can VIPCAR meet me at the airport?',
    answerEn:
      'Yes. VIPCAR serves Tunis-Carthage, Djerba-Zarzis and Enfidha-Hammamet airports. Transfer drivers track your flight and meet you in arrivals.',
    questionFr: 'VIPCAR peut-il m’accueillir à l’aéroport ?',
    answerFr:
      'Oui. VIPCAR dessert Tunis-Carthage, Djerba-Zarzis et Enfidha-Hammamet. Pour un transfert, votre chauffeur suit votre vol et vous attend aux arrivées.',
  },
  {
    slug: 'deposit',
    sortOrder: 3,
    questionEn: 'Is a security deposit required?',
    answerEn:
      'Yes. The refundable security deposit depends on the vehicle and is confirmed before booking. It is released after the car is returned in good condition.',
    questionFr: 'Une caution est-elle demandée ?',
    answerFr:
      'Oui. Son montant dépend du véhicule et vous est communiqué avant la réservation. Elle est libérée après le retour du véhicule en bon état.',
  },
  {
    slug: 'hotel-delivery',
    sortOrder: 4,
    questionEn: 'Can a car be delivered to my hotel?',
    answerEn:
      'Yes. Hotel and airport delivery can be arranged across the operating areas and elsewhere in Tunisia on request.',
    questionFr: 'La voiture peut-elle être livrée à mon hôtel ?',
    answerFr:
      'Oui. La livraison à l’hôtel ou à l’aéroport est disponible dans les zones desservies et ailleurs en Tunisie sur demande.',
  },
];

/** Legal slugs: terms-conditions, privacy-policy, cancellation-policy. */
const legalPages = [
  {
    slug: 'terms-conditions',
    titleEn: 'Terms & conditions',
    bodyEn:
      'The rental, transfer and chauffeur conditions confirmed for each request apply to the agreed service, vehicle and dates.',
    titleFr: 'Conditions générales',
    bodyFr:
      'Les conditions de location, de transfert et de chauffeur confirmées pour chaque demande s’appliquent au service, au véhicule et aux dates convenus.',
  },
  {
    slug: 'privacy-policy',
    titleEn: 'Privacy policy',
    bodyEn:
      'VIPCAR uses the details you share to respond to your request, confirm availability and coordinate the service you asked for.',
    titleFr: 'Politique de confidentialité',
    bodyFr:
      'VIPCAR utilise les informations partagées pour répondre à votre demande, confirmer la disponibilité et organiser le service demandé.',
  },
  {
    slug: 'cancellation-policy',
    titleEn: 'Cancellation policy',
    bodyEn:
      'Cancellation and amendment terms depend on the service, vehicle and timing of the request and are confirmed before booking.',
    titleFr: 'Politique d’annulation',
    bodyFr:
      'Les conditions d’annulation et de modification dépendent du service, du véhicule et du délai de la demande et sont confirmées avant la réservation.',
  },
];

async function main() {
  for (const article of articles) {
    await prisma.article.upsert({
      where: { slug: article.slug },
      create: {
        ...article,
        isPublished: true,
        publishedAt,
      },
      update: {
        titleEn: article.titleEn,
        titleFr: article.titleFr,
        summaryEn: article.summaryEn,
        summaryFr: article.summaryFr,
        sectionsEn: article.sectionsEn,
        sectionsFr: article.sectionsFr,
        imageKey: article.imageKey,
        isPublished: true,
        publishedAt,
      },
    });
  }

  for (const faq of faqs) {
    await prisma.faqItem.upsert({
      where: { slug: faq.slug },
      create: {
        ...faq,
        isPublished: true,
      },
      update: {
        questionEn: faq.questionEn,
        questionFr: faq.questionFr,
        answerEn: faq.answerEn,
        answerFr: faq.answerFr,
        sortOrder: faq.sortOrder,
        isPublished: true,
      },
    });
  }

  for (const page of legalPages) {
    await prisma.legalPage.upsert({
      where: { slug: page.slug },
      create: {
        ...page,
        isPublished: true,
        publishedAt,
      },
      update: {
        titleEn: page.titleEn,
        titleFr: page.titleFr,
        bodyEn: page.bodyEn,
        bodyFr: page.bodyFr,
        isPublished: true,
        publishedAt,
      },
    });
  }

  console.log(
    `Seeded ${articles.length} articles, ${faqs.length} FAQs, ${legalPages.length} legal pages.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
