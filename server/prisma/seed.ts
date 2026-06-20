import { PrismaClient } from '@prisma/client';
// role / category / status values are plain strings (SQLite has no native enum support)
import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Admin user ────────────────────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@tripzy.com';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin@123456';

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: process.env.ADMIN_NAME ?? 'Admin',
      email: adminEmail,
      phone: process.env.ADMIN_PHONE ?? '9999999999',
      pinCode: process.env.ADMIN_PINCODE ?? '110001',
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: 'ADMIN' as string,
    },
  });
  console.log(`✅ Admin user: ${adminEmail}`);

  // ── Destinations ─────────────────────────────────────────────────────────
  const destinations = [
    {
      slug: 'paris',
      name: 'Paris',
      country: 'France',
      description:
        'The City of Light beckons with its iconic Eiffel Tower, world-class museums, and charming cafés. Stroll along the Seine, explore the artistic Montmartre, and indulge in exquisite French cuisine. Paris is a timeless destination where romance, art, and history intertwine in every cobblestone street.',
      bestTimeToVisit: JSON.stringify(['Spring (April to June)', 'Fall (September to November)', 'Mild weather and fewer tourists']),
      topAttractions: JSON.stringify(['Eiffel Tower', 'Louvre Museum', 'Notre-Dame Cathedral', 'Champs-Élysées']),
      travelTips: JSON.stringify(['Purchase Museum Pass for skip-the-line access', 'Use Metro for easy navigation', 'Book restaurants in advance']),
      tags: JSON.stringify(['Romantic Getaway', 'Art & Culture', 'Historic Landmarks', 'Fine Dining']),
      images: JSON.stringify(['assets/Paris/Img_01.jpg', 'assets/Paris/Img_02.jpg', 'assets/Paris/Img_03.jpg']),
      basePrice: 450,
    },
    {
      slug: 'tokyo',
      name: 'Tokyo',
      country: 'Japan',
      description:
        'A mesmerizing blend of ancient traditions and cutting-edge technology, Tokyo offers an unparalleled urban experience. From serene temples to bustling districts like Shibuya, vibrant street food to Michelin-starred restaurants, this metropolis never ceases to amaze with its energy and innovation.',
      bestTimeToVisit: JSON.stringify(['Spring (March to May) — Cherry Blossoms', 'Autumn (September to November)', 'Comfortable temperatures year-round']),
      topAttractions: JSON.stringify(['Senso-ji Temple', 'Tokyo Skytree', 'Shibuya Crossing', 'Meiji Shrine']),
      travelTips: JSON.stringify(['Get a JR Pass for unlimited train travel', 'Learn basic Japanese phrases', 'Always carry cash']),
      tags: JSON.stringify(['Technology Hub', 'Traditional Culture', 'Urban Adventure', 'Food Paradise']),
      images: JSON.stringify(['assets/Tokyo/Img_01.jpg', 'assets/Tokyo/Img_02.jpg', 'assets/Tokyo/Img_03.jpg']),
      basePrice: 580,
    },
    {
      slug: 'rome',
      name: 'Rome',
      country: 'Italy',
      description:
        'The Eternal City is a living museum where ancient ruins stand alongside Renaissance masterpieces. Walk through history at the Colosseum, toss a coin in the Trevi Fountain, and savor authentic Italian cuisine. Rome\'s timeless beauty and rich heritage make every corner a journey through centuries.',
      bestTimeToVisit: JSON.stringify(['Spring (April to June)', 'Fall (September to October)', 'Pleasant weather for sightseeing']),
      topAttractions: JSON.stringify(['Colosseum', 'Vatican Museums', 'Trevi Fountain', 'Roman Forum']),
      travelTips: JSON.stringify(['Book skip-the-line tickets in advance', 'Dress modestly for religious sites', 'Try local trattorias for authentic food']),
      tags: JSON.stringify(['Ancient History', 'Renaissance Art', 'Italian Cuisine', 'Architecture']),
      images: JSON.stringify(['assets/Rome/Img_01.jpg', 'assets/Rome/Img_02.jpg', 'assets/Rome/Img_03.jpg']),
      basePrice: 420,
    },
    {
      slug: 'newyork',
      name: 'New York',
      country: 'USA',
      description:
        'The city that never sleeps pulses with energy, diversity, and endless possibilities. From the iconic skyline to world-famous museums, Broadway shows to diverse neighborhoods, New York offers an unmatched urban experience that captures the American dream in its most vibrant form.',
      bestTimeToVisit: JSON.stringify(['Spring (April to June)', 'Fall (September to November)', 'Comfortable weather for walking']),
      topAttractions: JSON.stringify(['Statue of Liberty', 'Central Park', 'Times Square', 'Empire State Building']),
      travelTips: JSON.stringify(['Use subway for efficient travel', 'Book Broadway tickets in advance', 'Explore different neighborhoods']),
      tags: JSON.stringify(['Urban Jungle', 'Entertainment', 'Shopping', 'Museums']),
      images: JSON.stringify(['assets/New_York/Img_01.jpg', 'assets/New_York/Img_02.jpg', 'assets/New_York/Img_03.jpg']),
      basePrice: 520,
    },
    {
      slug: 'london',
      name: 'London',
      country: 'UK',
      description:
        'A perfect blend of royal heritage and modern culture, London captivates with its iconic landmarks, world-class museums, and diverse neighborhoods. From Buckingham Palace to trendy markets, traditional pubs to innovative restaurants, the British capital offers something for every traveler.',
      bestTimeToVisit: JSON.stringify(['Late Spring (May to June)', 'Early Fall (September to October)', 'Mild weather and festivals']),
      topAttractions: JSON.stringify(['Big Ben & Parliament', 'Tower of London', 'British Museum', 'London Eye']),
      travelTips: JSON.stringify(['Get an Oyster Card for transport', 'Many museums offer free entry', 'Try afternoon tea experience']),
      tags: JSON.stringify(['Royal Heritage', 'Museums', 'Theatre', 'Markets']),
      images: JSON.stringify(['assets/London/Img_01.jpg', 'assets/London/Img_02.jpg', 'assets/London/Img_03.jpg']),
      basePrice: 480,
    },
  ];

  for (const dest of destinations) {
    await prisma.destination.upsert({
      where: { slug: dest.slug },
      update: dest,
      create: dest,
    });
  }
  console.log(`✅ ${destinations.length} destinations seeded`);

  // ── Trip options ──────────────────────────────────────────────────────────
  const tripOptions = [
    // Travel
    { optionKey: 'flight',       category: 'TRAVEL',   title: 'Round-Trip Flight',        subtitle: 'Economy class with baggage allowance',     emoji: '✈️',  price: 1200 },
    { optionKey: 'hotel',        category: 'TRAVEL',   title: 'Luxury Hotel Stay',         subtitle: '7 nights in 4-star accommodation',          emoji: '🏨',  price: 2100 },
    { optionKey: 'car',          category: 'TRAVEL',   title: 'Car Rental',                subtitle: '7-day compact car rental with insurance',    emoji: '🚗',  price: 450  },
    { optionKey: 'airport',      category: 'TRAVEL',   title: 'Airport Transfers',         subtitle: 'Round-trip private transfers',               emoji: '🚕',  price: 120  },
    // Food
    { optionKey: 'breakfast',    category: 'FOOD',     title: 'Daily Breakfast',           subtitle: 'Buffet breakfast at hotel',                  emoji: '☕',  price: 180  },
    { optionKey: 'allinclusive', category: 'FOOD',     title: 'All-Inclusive Dining',      subtitle: 'Three meals daily plus snacks',              emoji: '🍽️', price: 750  },
    { optionKey: 'finedining',   category: 'FOOD',     title: 'Fine Dining Experience',    subtitle: 'Two Michelin-star restaurant meals',         emoji: '🍷',  price: 420  },
    { optionKey: 'foodtour',     category: 'FOOD',     title: 'Local Food Tour',           subtitle: 'Guided culinary exploration',                emoji: '🥘',  price: 280  },
    // Activity
    { optionKey: 'citytour',     category: 'ACTIVITY', title: 'City Sightseeing Tour',     subtitle: 'Full-day guided tour of major attractions',  emoji: '🏙️', price: 150  },
    { optionKey: 'museum',       category: 'ACTIVITY', title: 'Museum Pass',               subtitle: '7-day unlimited museum access',              emoji: '🎨',  price: 95   },
    { optionKey: 'adventure',    category: 'ACTIVITY', title: 'Adventure Activities',      subtitle: 'Hiking, zip-lining, water sports',           emoji: '🏔️', price: 380  },
    { optionKey: 'spa',          category: 'ACTIVITY', title: 'Spa & Wellness Package',    subtitle: 'Three relaxation sessions',                  emoji: '💆',  price: 240  },
    { optionKey: 'nightlife',    category: 'ACTIVITY', title: 'Nightlife Experience',      subtitle: 'VIP access to top venues',                   emoji: '🎭',  price: 180  },
    { optionKey: 'cruise',       category: 'ACTIVITY', title: 'Sunset Cruise',             subtitle: 'Evening cruise with dinner',                 emoji: '🚢',  price: 320  },
  ];

  for (const opt of tripOptions) {
    await prisma.tripOption.upsert({
      where: { optionKey: opt.optionKey },
      update: opt,
      create: opt,
    });
  }
  console.log(`✅ ${tripOptions.length} trip options seeded`);
  console.log('🎉 Seeding complete');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
