const productImagePools = require('./product-image-pools');

const categoryDefinitions = [
  {
    category: 'Mobiles, Computers',
    series: ['Nova', 'Pulse', 'Vertex', 'Atlas', 'Orbit'],
    items: ['Laptop', 'Smartphone', 'Tablet', 'Monitor', 'Keyboard'],
    images: [
      'https://images.unsplash.com/photo-1517336714739-489689fd1ca8?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1496171367470-9ed9a91ea931?auto=format&fit=crop&w=1600&q=85',
      'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1400&q=80'
    ],
    basePrice: 149,
    step: 28,
    description:
      'Built for fast workdays, entertainment, and modern digital setups with reliable performance and clean design.'
  },
  {
    category: 'TV, Appliances, Electronics',
    series: ['Radiant', 'Volt', 'Prism', 'Echo', 'Crest'],
    items: ['Smart TV', 'Air Fryer', 'Soundbar', 'Mixer', 'Projector'],
    images: [
      'https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1571415060716-baff5f717c37?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1540932239986-30128078f3c5?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=1600&q=80'
    ],
    basePrice: 99,
    step: 31,
    description:
      'Everyday electronics and home appliances selected to make rooms more useful, entertaining, and efficient.'
  },
  {
    category: "Men's Fashion",
    series: ['North', 'Urban', 'Cedar', 'Metro', 'Summit'],
    items: ['Shirt', 'Jacket', 'Sneakers', 'Jeans', 'Watch'],
    images: [
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1600&q=85',
      'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1200&q=80'
    ],
    basePrice: 39,
    step: 17,
    description:
      'Smart daily menswear with comfortable fits, practical materials, and a polished casual look.'
  },
  {
    category: "Women's Fashion",
    series: ['Luna', 'Sienna', 'Velvet', 'Aster', 'Bloom'],
    items: ['Dress', 'Handbag', 'Heels', 'Blouse', 'Jewellery Set'],
    images: [
      'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1600&q=85'
    ],
    basePrice: 34,
    step: 19,
    description:
      'Curated wardrobe pieces and accessories designed for versatile styling from mornings out to special occasions.'
  },
  {
    category: 'Home, Kitchen, Pets',
    series: ['Harbor', 'Nest', 'Cozy', 'Maple', 'Sunny'],
    items: ['Cookware Set', 'Storage Rack', 'Pet Bed', 'Blender', 'Dining Set'],
    images: [
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1545249390-6bdfa286032f?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=1600&q=80',
      'https://images.unsplash.com/photo-1612196808214-b40fba4f3358?auto=format&fit=crop&w=1200&q=80'
    ],
    basePrice: 29,
    step: 15,
    description:
      'Useful upgrades for busy homes, tidy kitchens, and comfortable pet corners with strong everyday value.'
  },
  {
    category: 'Beauty, Health, Grocery',
    series: ['Pure', 'Glow', 'Vital', 'Fresh', 'Calm'],
    items: ['Skincare Kit', 'Hair Dryer', 'Protein Pack', 'Massage Gun', 'Wellness Hamper'],
    images: [
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1200&q=80'
    ],
    basePrice: 18,
    step: 13,
    description:
      'Self-care, wellness, and pantry-focused finds that balance value, convenience, and thoughtful daily routines.'
  },
  {
    category: 'Sports, Fitness, Bags, Luggage',
    series: ['Drive', 'Motion', 'Summit', 'Stride', 'Aero'],
    items: ['Duffel Bag', 'Yoga Mat', 'Dumbbell Set', 'Travel Trolley', 'Running Shorts'],
    images: [
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1200&q=80'
    ],
    basePrice: 24,
    step: 18,
    description:
      'Fitness gear, travel bags, and active essentials ready for workouts, commutes, and weekend movement.'
  },
  {
    category: "Toys, Baby Products, Kids' Fashion",
    series: ['Joy', 'Little', 'Spark', 'Play', 'Wonder'],
    items: ['Building Set', 'Stroller', 'Kids Sneakers', 'Learning Toy', 'Baby Care Kit'],
    images: [
      'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1600&q=85'
    ],
    basePrice: 16,
    step: 14,
    description:
      'Family-friendly picks for play, early learning, baby care, and comfortable styles made for growing routines.'
  },
  {
    category: 'Car, Motorbike, Industrial',
    series: ['Torque', 'Rider', 'Forge', 'Trail', 'Engine'],
    items: ['Toolkit', 'Helmet', 'Vacuum Cleaner', 'Tyre Inflator', 'Work Light'],
    images: [
      'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1517520287167-4bbf64a00d66?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80'
    ],
    basePrice: 22,
    step: 21,
    description:
      'Practical tools and durable accessories for garages, workshops, roadside fixes, and industrial use.'
  },
  {
    category: 'Books',
    series: ['Blue', 'Golden', 'Quiet', 'Bright', 'Modern'],
    items: ['Novel', 'Cookbook', 'Business Guide', 'Childrens Storybook', 'Design Journal'],
    images: [
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1495640388908-05fa85288e61?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1540932239986-30128078f3c5?auto=format&fit=crop&w=1200&q=80'
    ],
    basePrice: 9,
    step: 8,
    description:
      'A broader reading shelf with entertaining fiction, practical guides, giftable editions, and family favorites.'
  },
  {
    category: 'Movies, Music & Video Games',
    series: ['Pixel', 'Rhythm', 'Legend', 'Arcade', 'Neon'],
    items: ['Video Game', 'Vinyl Album', 'Movie Box Set', 'Gaming Headset', 'Console Controller'],
    images: [
      'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1496171367470-9ed9a91ea931?auto=format&fit=crop&w=1600&q=85'
    ],
    basePrice: 14,
    step: 20,
    description:
      'Entertainment picks across gaming, music, and movie nights with strong gift appeal and home fun.'
  }
];

const badges = ['Best Seller', 'New Arrival', 'Top Pick', 'Limited Deal', 'Customer Favorite'];

function buildProductImagePoolKey(category, item) {
  return `${category}|${item}`;
}

function resolveSeedProductImage(category, item, seriesIndex, fallbackImages) {
  const pool = productImagePools[buildProductImagePoolKey(category, item)] || [];

  if (pool[seriesIndex]) {
    return pool[seriesIndex];
  }

  return fallbackImages[seriesIndex % fallbackImages.length];
}

const productSeed = categoryDefinitions.flatMap((definition, categoryIndex) =>
  definition.series.flatMap((series, seriesIndex) =>
    definition.items.map((item, itemIndex) => {
      const seedIndex = seriesIndex * definition.items.length + itemIndex;

      return {
        name: `${series} ${item}`,
        category: definition.category,
        description: `${definition.description} ${series} ${item} brings a balanced mix of style, quality, and daily usefulness.`,
        imageUrl: resolveSeedProductImage(
          definition.category,
          item,
          seriesIndex,
          definition.images
        ),
        price: Number((definition.basePrice + seriesIndex * definition.step + itemIndex * (definition.step * 0.65)).toFixed(2)),
        rating: Number((4.2 + ((categoryIndex + seriesIndex + itemIndex) % 7) * 0.1).toFixed(1)),
        stock: 24 + ((categoryIndex * 5 + seriesIndex * 7 + itemIndex * 3) % 28),
        featured: seedIndex < 5 ? 1 : 0,
        badge: badges[seedIndex % badges.length]
      };
    })
  )
);

const legacySeedImageUrls = [...new Set(categoryDefinitions.flatMap((definition) => definition.images))];

module.exports = {
  productSeed,
  marketplaceCategories: categoryDefinitions.map((definition) => definition.category),
  legacySeedImageUrls
};
