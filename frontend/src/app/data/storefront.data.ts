import {
  CollectionCard,
  FaqItem,
  FooterColumn,
  HeroSlide,
  HighlightCard,
  NavLink,
  PromoBoard,
  SupportCard
} from '../models/storefront.model';

export const MARKETPLACE_CATEGORIES = [
  'Mobiles, Computers',
  'TV, Appliances, Electronics',
  "Men's Fashion",
  "Women's Fashion",
  'Home, Kitchen, Pets',
  'Beauty, Health, Grocery',
  'Sports, Fitness, Bags, Luggage',
  "Toys, Baby Products, Kids' Fashion",
  'Car, Motorbike, Industrial',
  'Books',
  'Movies, Music & Video Games'
];

export const NAV_LINKS: NavLink[] = [
  { id: 'account', label: 'Account' },
  { id: 'orders', label: 'Orders' },
  { id: 'support', label: 'Support' }
];

export const PAYMENT_OPTIONS = ['Cash on delivery', 'Card payment'];

export const SUPPORT_ISSUE_OPTIONS = [
  'Order issue',
  'Payment help',
  'Return or refund',
  'Account problem',
  'Product question',
  'Other'
];

export const HERO_SLIDES: HeroSlide[] = [
  {
    eyebrow: 'Spring Specials',
    title: 'Save up to 40% on standout seasonal picks',
    subtitle:
      'Fresh fashion, gift-ready extras, and everyday essentials lined up for a brighter week of shopping.',
    cta: 'Shop deals',
    secondaryCta: 'Browse catalog',
    background:
      'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1600&q=85',
    surface: 'linear-gradient(90deg, #d77ef7 0%, #df8bf6 38%, #ebb0f5 68%, #f8d3ee 100%)',
    accent: 'Limited-time savings',
    category: "Women's Fashion",
    primaryAction: 'catalog',
    secondaryAction: 'catalog'
  },
  {
    eyebrow: 'Home Refresh',
    title: 'Warm up every room with fresh everyday upgrades',
    subtitle:
      'Discover practical kitchen tools, softer decor, and home picks that make daily spaces feel complete.',
    cta: 'Browse home picks',
    secondaryCta: 'Read our story',
    background:
      'https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=1600&q=80',
    surface: 'linear-gradient(90deg, #ffe1a8 0%, #ffd59b 35%, #ffe4b8 68%, #fff1d6 100%)',
    accent: 'New arrivals for every corner',
    category: 'Home, Kitchen, Pets',
    primaryAction: 'catalog',
    secondaryAction: 'support'
  },
  {
    eyebrow: 'Fashion Focus',
    title: 'Step into the week with style-first deals and easy looks',
    subtitle:
      'Bags, shoes, and daily outfits come together in one fast-moving edit built for comfort and color.',
    cta: 'See fashion picks',
    secondaryCta: 'Contact support',
    background:
      'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1600&q=85',
    surface: 'linear-gradient(90deg, #f5c1ad 0%, #f6ceb6 35%, #f7dccd 68%, #fbefe5 100%)',
    accent: 'Trending looks this week',
    category: "Men's Fashion",
    primaryAction: 'catalog',
    secondaryAction: 'support'
  },
  {
    eyebrow: 'Tech Spotlight',
    title: 'Upgrade your setup with smarter daily tech and desk essentials',
    subtitle:
      'Laptops, accessories, and productivity tools are grouped into one quick tech edit for work and home.',
    cta: 'Open tech deals',
    secondaryCta: 'Browse catalog',
    background:
      'https://images.unsplash.com/photo-1496171367470-9ed9a91ea931?auto=format&fit=crop&w=1600&q=85',
    surface: 'linear-gradient(90deg, #b9d7ff 0%, #cde4ff 35%, #ddeeff 68%, #f1f7ff 100%)',
    accent: 'Smart picks for your desk',
    category: 'Mobiles, Computers',
    primaryAction: 'catalog',
    secondaryAction: 'catalog'
  },
  {
    eyebrow: 'Reading Corner',
    title: 'Discover page-turning reads and gifting favorites in one sweep',
    subtitle:
      'From fiction to practical guides, this bookshelf edit keeps books and easy gifts in one clean stop.',
    cta: 'See book picks',
    secondaryCta: 'Browse catalog',
    background:
      'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1600&q=85',
    surface: 'linear-gradient(90deg, #f5deb3 0%, #f8e7c9 35%, #fbefdc 68%, #fff7ea 100%)',
    accent: 'Top reads this week',
    category: 'Books',
    primaryAction: 'catalog',
    secondaryAction: 'catalog'
  }
];

export const PROMO_BOARDS: PromoBoard[] = [
  {
    title: 'Wireless tech',
    description: 'Phones, tablets, wearables, and desk-ready electronics picked for daily use.',
    image:
      'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1200&q=80',
    tags: ['Smartphones', 'Watches', 'Headphones', 'Tablets'],
    category: 'Mobiles, Computers'
  },
  {
    title: 'Finds for home',
    description: 'Kitchen, decor, smart-home, and daily utility picks arranged in an easier shopping card.',
    image:
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
    tags: ['Kitchen', 'Home decor', 'Dining', 'Smart home'],
    category: 'Home, Kitchen, Pets'
  },
  {
    title: 'Deals on top categories',
    description: 'Books, fashion, PC setups, and beauty products collected in one attractive panel.',
    image:
      'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=80',
    tags: ['Books', 'Fashion', 'PC', 'Beauty'],
    category: 'Books'
  },
  {
    title: 'Gear up to get fit',
    description: 'Activewear, trackers, fitness gear, and sports bags displayed in an Amazon-style grid.',
    image:
      'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80',
    tags: ['Clothing', 'Trackers', 'Equipment', 'Deals'],
    category: 'Sports, Fitness, Bags, Luggage'
  }
];

export const COLLECTION_CARDS: CollectionCard[] = [
  {
    eyebrow: 'Collection one',
    title: 'Home and pet essentials made simple',
    description:
      'A practical edit of kitchen tools, home upgrades, pet care, and storage pieces that feel useful every day.',
    image:
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80',
    category: 'Home, Kitchen, Pets'
  },
  {
    eyebrow: 'Collection two',
    title: 'Womens fashion with everyday polish',
    description:
      'Comfortable dresses, footwear, bags, and wardrobe staples that work from weekday errands to weekends out.',
    image:
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1400&q=80',
    category: "Women's Fashion"
  },
  {
    eyebrow: 'Collection three',
    title: 'Smart tech for work and play',
    description:
      'Monitors, laptops, tablets, and computer accessories chosen to make digital spaces feel more complete.',
    image:
      'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1400&q=80',
    category: 'Mobiles, Computers'
  }
];

export const SUPPORT_CARDS: SupportCard[] = [
  {
    icon: 'bi bi-truck',
    title: 'Fast dispatch',
    text: 'We prepare in-stock orders quickly and keep delivery updates simple for the customer.'
  },
  {
    icon: 'bi bi-arrow-repeat',
    title: 'Easy returns',
    text: 'A clear return promise builds trust, especially when you begin adding more categories and products.'
  },
  {
    icon: 'bi bi-shield-check',
    title: 'Secure checkout',
    text: 'The checkout flow now sends a real order payload to MySQL through the backend API.'
  },
  {
    icon: 'bi bi-headset',
    title: 'Support that feels human',
    text: 'Helpful copy and contact sections give the store more meaning than a plain product grid alone.'
  }
];

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: 'Know More About Us',
    links: ['About LuxeCart', 'Careers', 'Blog', 'Investor relations', 'Our devices']
  },
  {
    title: 'Grow With Us',
    links: ['Sell products with us', 'Become an affiliate', 'Show your products', 'Host a brand story']
  },
  {
    title: 'Payment Apps',
    links: ['Business card', 'Shop with reward', 'Reload wallet', 'Currency converter']
  },
  {
    title: 'Contact Details',
    links: ['Wheeling, West Virginia 26003', '304-559-3023', 'shopnow@store.com', 'contact@ama.com']
  }
];

export const FAQS: FaqItem[] = [
  {
    title: 'What changed in the new design?',
    text: 'The homepage now uses stronger sections, category stories, larger banners, and richer photography to feel more like a complete marketplace.'
  },
  {
    title: 'Can this store grow into admin and checkout pages?',
    text: 'Yes. The current structure already supports product data, cart logic, multi-view navigation, and now order creation through the backend.'
  },
  {
    title: 'Why add more copy and storytelling?',
    text: 'Meaningful text helps shoppers understand the value of a category and makes the design feel intentional instead of empty.'
  }
];

export const HIGHLIGHTS: HighlightCard[] = [
  {
    icon: 'bi bi-stars',
    title: 'Attractive imagery',
    text: 'Each section uses stronger visuals so the store looks prepared for real customers, not just demo content.'
  },
  {
    icon: 'bi bi-grid-3x3-gap',
    title: 'More page variety',
    text: 'Home, product, checkout, collections, and support views give the project more depth and make future expansion easier.'
  },
  {
    icon: 'bi bi-chat-left-text',
    title: 'Meaningful content',
    text: 'Headlines, short descriptions, and support language explain why the products matter and where they fit.'
  }
];
