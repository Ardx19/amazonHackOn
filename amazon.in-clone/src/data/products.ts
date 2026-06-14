import { Product, CarouselBanner } from '../types';

export const CATEGORY_LABELS: Record<string, string> = {
  appliances: 'Appliances for your home | Up to 55% off',
  revamp: 'Revamp your home in style',
  essentials: 'Starting ₹49 | Deals on home essentials',
  brands: 'Starting ₹199 | Amazon Brands & more',
};

export const INITIAL_PRODUCTS: Product[] = [
  // --- APPLIANCES CATEGORY ---
  {
    id: 'app-ac-1',
    name: 'Voltas 1.5 Ton 3 Star Split Air Conditioner (Inverter, White)',
    category: 'Appliances',
    categoryKey: 'appliances',
    subCategoryKey: 'ac',
    price: 32990,
    originalPrice: 54990,
    rating: 4.2,
    reviewCount: 15482,
    imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=400&q=80',
    description: 'Voltas Adjustable Inverter AC works at different capacities based on the ambient heat load. High cooling performance even at 52°C, coupled with a multi stage filtration system for pure air.',
    features: [
      '1.5 Ton Capacity, perfect for medium-sized rooms (111 to 150 sq.ft)',
      'Copper condenser coil for highly efficient heat transfer',
      'Dual Filtration: Dust filter & anti-bacterial filter included',
      'Low noise operation of 32 dB with silent night mode',
      'Stabilizer free operation (working range 100V to 290V)'
    ],
    inStock: true,
    brand: 'Voltas'
  },
  {
    id: 'app-ref-1',
    name: 'Samsung 236L 3 Star Inverter Double Door Refrigerator (Silver)',
    category: 'Appliances',
    categoryKey: 'appliances',
    subCategoryKey: 'fridge',
    price: 24490,
    originalPrice: 32990,
    rating: 4.4,
    reviewCount: 9840,
    imageUrl: 'https://images.unsplash.com/photo-1571175432244-93ad2947e901?auto=format&fit=crop&w=400&q=80',
    description: 'Elegant double door refrigerator with digital inverter compressor. Experience ultra-long-lasting freshness, smart power options, and stabilizer-free operation for modern kitchens.',
    features: [
      'Digital Inverter Compressor: automatic control based on cooling demand',
      'All-round cooling for equalized cooling at every shelf segment',
      'Fresh Room compartment keeps meats and salads fresher, longer',
      'Moist Fresh Zone preserves humidity levels for fragile leafy greens',
      'Movable Ice Maker with twist and serve action'
    ],
    inStock: true,
    brand: 'Samsung'
  },
  {
    id: 'app-micro-1',
    name: 'LG 20L Solo Microwave Oven (Intellowave Technology, Black)',
    category: 'Appliances',
    categoryKey: 'appliances',
    subCategoryKey: 'microwave',
    price: 6490,
    originalPrice: 9490,
    rating: 4.3,
    reviewCount: 11105,
    imageUrl: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?auto=format&fit=crop&w=400&q=80',
    description: 'The premium 20 Litre solo microwave is perfect for bachelors and small families. Offers Intellowave technology for quick, uniform cooking and an easy clean cavity.',
    features: [
      'Intellowave technology ensures all-around circulation and uniform heating',
      'Energy Saving: automatic power cutoff after completion',
      'Auto Cook Menu: 38 Indian recipes built in',
      'Easy to Clean health-friendly internal coating preventing odor',
      'Child Lock mechanism for complete home safety'
    ],
    inStock: true,
    brand: 'LG'
  },
  {
    id: 'app-wm-1',
    name: 'Bosch 7kg 5 Star Fully Automatic Front Loading Washing Machine (White)',
    category: 'Appliances',
    categoryKey: 'appliances',
    subCategoryKey: 'wm',
    price: 28490,
    originalPrice: 38990,
    rating: 4.6,
    reviewCount: 7421,
    imageUrl: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=400&q=80',
    description: 'Unlock pristine garment cleaning with German engineering. Features EcoSilence Drive for silent operation, AntiTangle feature to protect fabrics, and 15 rapid wash modes.',
    features: [
      '7kg Capacity, suited for families of 3-4 members',
      '1200 RPM Spin Speed for rapid drying times',
      'Anti-Vibration Side Panels for supreme silent balance during cycles',
      'Reload function allows you to pause and add laundry mid-cycle',
      'EcoSilence Drive: Inverter motor delivers maximum energy savings'
    ],
    inStock: true,
    brand: 'Bosch'
  },

  // --- HOME STYLE REVAMP CATEGORY ---
  {
    id: 'rev-cushion-1',
    name: 'Amazon Brand - Solimo Cotton Cushion Covers (Set of 5, Flora, 16x16 inches)',
    category: 'Home Revamp',
    categoryKey: 'revamp',
    subCategoryKey: 'cushion',
    price: 449,
    originalPrice: 999,
    rating: 4.3,
    reviewCount: 4210,
    imageUrl: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e6?auto=format&fit=crop&w=400&q=80',
    description: 'Transform your living spaces with high-comfort printed cushion covers made of premium breathable cotton yarn. Includes invisible zipper seals.',
    features: [
      'Set of 5 cushion covers, dimensions: 16x16 inches (40x40 cm)',
      '100% Cotton material, soft to touch and completely skin safe',
      'Hidden/invisible high-quality ZIP lock at the base',
      'Colorfast, machine washable print pattern designs',
      'Sturdy seam stitching ensures durability over years'
    ],
    inStock: true,
    brand: 'Solimo'
  },
  {
    id: 'rev-fig-1',
    name: 'Prestige Sculptures Gold Thinking Astronaut Figurines (Premium Trio)',
    category: 'Home Revamp',
    categoryKey: 'revamp',
    subCategoryKey: 'fig',
    price: 899,
    originalPrice: 1999,
    rating: 4.5,
    reviewCount: 381,
    imageUrl: 'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=400&q=80',
    description: 'Elegant modern decor figures representing abstract gold thinking astronaut figurines. High-grade resin sculpt with luxury glossy smooth glaze finish.',
    features: [
      'Made of premium environmental safe eco-resin materials',
      'Intricately molded golden details with smooth felt-bottom pads to prevent scratches',
      'Pack of 3 in varied reflective thinking positions',
      'Perfect addition for luxury modern wall shelves, consoles, and TV stands',
      'Dimensions: Approx. 5.5 inches height each'
    ],
    inStock: true,
    brand: 'Deco Pride'
  },
  {
    id: 'rev-store-1',
    name: 'Kuber Industries Foldable Wardrobe Storage Organizers (Set of 3, Grey)',
    category: 'Home Revamp',
    categoryKey: 'revamp',
    subCategoryKey: 'storage',
    price: 349,
    originalPrice: 699,
    rating: 4.0,
    reviewCount: 5219,
    imageUrl: 'https://images.unsplash.com/photo-1595079676339-1534801ad6cf?auto=format&fit=crop&w=400&q=80',
    description: 'Streamline closets and wardrobes. Multi-purpose breathable non-woven organizers fitted with windows and dual handles for dust-proof garment arrangement.',
    features: [
      'High-capacity non-woven fabric blocks dust and humidity',
      'Clear transparent frontal window allows effortless identification of clothes',
      'Equipped with 2 reinforced side carrying handles',
      'Foldable flat design saves absolute drawer space when not in utilization',
      'Premium zipper sliders glide smoothly along tracks'
    ],
    inStock: true,
    brand: 'Kuber Industries'
  },
  {
    id: 'rev-light-1',
    name: 'Philips Hue Smart Ambient Luxury Table Lamp (Cool & Warm White Adjustable)',
    category: 'Home Revamp',
    categoryKey: 'revamp',
    subCategoryKey: 'lighting',
    price: 1899,
    originalPrice: 3499,
    rating: 4.5,
    reviewCount: 1622,
    imageUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=400&q=80',
    description: 'Establish gorgeous visual accents. Features variable color temperature adjustments, high-luminescence output, and smart pairing options with cellular assistants.',
    features: [
      'Warm golden to icy daylight adjustments (2200K - 6500K)',
      'Touch control base: instantly change brightness and temperature',
      'Energy rating 5 star bulb built inside',
      'Durable modern matte-alloy finish design stand',
      'Works with Philips Hue Bridge or independent smart bluetooth links'
    ],
    inStock: true,
    brand: 'Philips'
  },

  // --- HOME ESSENTIALS CATEGORY ---
  {
    id: 'ess-clean-1',
    name: 'Scotch-Brite Kitchen Sponge Wipe Pack (Set of 5, Multi-Color)',
    category: 'Home Essentials',
    categoryKey: 'essentials',
    subCategoryKey: 'clean',
    price: 139,
    originalPrice: 199,
    rating: 4.6,
    reviewCount: 22100,
    imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=400&q=80',
    description: 'Clean surfaces in one stroke. Scotch-Brite biodegradable cellulose sponge wipes absorb water up to 10 times their weight to keep countertops hygienic and streak-free.',
    features: [
      'Absorptive power: Sucks up liquid spills 10x its dry mass',
      'Lint-free & scratch-free cleaning across ceramic glass and stainless steel',
      'Washable and long-lasting reusable fabric mesh',
      'Dries rapidly, reducing bacterial culture buildup and foul scent',
      '100% natural, biodegradable wood pulp cellulose raw materials'
    ],
    inStock: true,
    brand: 'Scotch-Brite'
  },
  {
    id: 'ess-bath-1',
    name: 'Groz High-Pressure Oxygenating SPA Showerhead (Luxury Chrome)',
    category: 'Home Essentials',
    categoryKey: 'essentials',
    subCategoryKey: 'bath',
    price: 649,
    originalPrice: 1199,
    rating: 4.2,
    reviewCount: 349,
    imageUrl: 'https://images.unsplash.com/photo-1604014237800-1c9102c219da?auto=format&fit=crop&w=400&q=80',
    description: 'Upgrade your morning routine. Advanced high-velocity micro-nozzles oxygenate cold and hot water spray, enhancing pressure while saving up to 30% of standard water output.',
    features: [
      'Self-cleaning mineral-resistant silicone nozzles prevent lime build up',
      '3 core spray systems: Rainfall, Massage, and Mist spray modes',
      'Rust-proof ABS body wrapped in premium triple mirror-plated chrome',
      'Rotatable swivel brass ball-joint for flexible angle adjustments',
      'Includes teflon sealing tape for quick toolless DIY installation'
    ],
    inStock: true,
    brand: 'Cera'
  },
  {
    id: 'ess-tools-1',
    name: 'Stanley Multi-Bit Magnetic Ratcheting Screwdriver & Tool Set',
    category: 'Home Essentials',
    categoryKey: 'essentials',
    subCategoryKey: 'tools',
    price: 849,
    originalPrice: 1399,
    rating: 4.4,
    reviewCount: 8940,
    imageUrl: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=400&q=80',
    description: 'Complete home maintenance with absolute ease. Set of heavy magnetic socket heads and ergonomic ratcheting handles to adjust screws without lifting your hand.',
    features: [
      'Three-position ratcheting mechanism: Left, Right, and Locked',
      'Comes with 10 varied interchangeable hardened alloy bits',
      'Magnetic holder tip locks bit securely in place',
      'Tri-lobular handle with texturized rubber pad grip prevents slipping',
      'Internal storage hollow in handle stores the bits on the move'
    ],
    inStock: true,
    brand: 'Stanley'
  },
  {
    id: 'ess-wall-1',
    name: 'Wolpin Embossed Self-Adhesive Textured Floral Wallpaper (45cm x 5m)',
    category: 'Home Essentials',
    categoryKey: 'essentials',
    subCategoryKey: 'wall',
    price: 249,
    originalPrice: 499,
    rating: 4.0,
    reviewCount: 6512,
    imageUrl: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=400&q=80',
    description: 'Revitalize dreary concrete surfaces instantly. Waterproof, anti-mildew floral textured wallpaper rolls with tough self-adhesive backing—no messy external glue required.',
    features: [
      'Easiest Peel & Stick installation: Just cut size, pull backing film, and press',
      'Waterproof, oil-proof and moisture barrier PVC composition',
      'Clean easily with damp wipes without color bleeding',
      'Perfect for living room accents, study units, cabinets, drawers and desks',
      'High stick-strength adhesive preserves surface condition on removal'
    ],
    inStock: true,
    brand: 'Wolpin'
  },

  // --- AMAZON BRANDS & MORE CATEGORY ---
  {
    id: 'brand-beds-1',
    name: 'Amazon Brand - Solimo 100% Cotton Dual Bedsheet with 2 Pillow Covers',
    category: 'Amazon Brands',
    categoryKey: 'brands',
    subCategoryKey: 'bedsheets',
    price: 399,
    originalPrice: 899,
    rating: 4.1,
    reviewCount: 14590,
    imageUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=400&q=80',
    description: 'Experience pure cotton sleep luxury. Breathable 144 TC thread counts deliver durable weave density and cozy, non-allergic sleeping surfaces for standard queen size beds.',
    features: [
      'Queen Bed dimensions: 90 in x 100 in (228 cm x 254 cm)',
      '144 Thread Count fabric structure for balanced thickness and breathability',
      'Fitted with two custom-sized envelope closure pillow slips',
      'Completely machine friendly wash with dye preservation features',
      'Soft combed fibers feel soothing across the skin'
    ],
    inStock: true,
    brand: 'Amazon Brand - Solimo'
  },
  {
    id: 'brand-curtains-1',
    name: 'Amazon Brand - Presto! Linen Sheer Window Curtains (Trio Set, Grey)',
    category: 'Amazon Brands',
    categoryKey: 'brands',
    subCategoryKey: 'curtains',
    price: 199,
    originalPrice: 499,
    rating: 4.2,
    reviewCount: 3120,
    imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80',
    description: 'Infuse soft sunlight patterns into bedrooms. Made of semi-sheer heavy-thread polyester, allowing ventilation while shielding interior activity from exterior gaze.',
    features: [
      'Trio set: Includes 3 panels with ring grommet sockets along upper hem',
      'Allows soft filtering of blinding daylight while providing privacy',
      'Pre-fitted with 8 rust-resistant steel rings per panel, fit for 2 inch rods',
      'Resistant to shrinkage and wrinkle lines, standard wash cycles',
      'Sleek neutral grey coloring blends with modern interior accents'
    ],
    inStock: true,
    brand: 'Amazon Brand - Presto!'
  },
  {
    id: 'brand-iron-1',
    name: 'Amazon Brand - Solimo Heavy Foldable Ironing Board with Soft Pad',
    category: 'Amazon Brands',
    categoryKey: 'brands',
    subCategoryKey: 'iron',
    price: 1290,
    originalPrice: 2499,
    rating: 4.4,
    reviewCount: 911,
    imageUrl: 'https://images.unsplash.com/photo-1555529669-e69e7aa0bc9a?auto=format&fit=crop&w=400&q=80',
    description: 'Enjoy crisp crease sweeps in garments. Heavy steel framework with heat resistant padded felt layer and iron stand holder, adaptable along multiple heights.',
    features: [
      'Multi-level adjustable height configurations to standard heights',
      'Equipped with retractable heat-proof steel hot iron rest dock',
      'Thick non-slip floor-gripping rubber socks on legs avoid movement',
      'Flame-retardant heat-resistant heavy cotton fabric cover slip',
      'Foldable slim body frame packs into 2 inch thin layout for wardrobes'
    ],
    inStock: true,
    brand: 'Amazon Brand - Solimo'
  },
  {
    id: 'brand-decor-1',
    name: 'Amazon Brand - Umi Geometric Ceramic Vase and Deer Pair Figurines',
    category: 'Amazon Brands',
    categoryKey: 'brands',
    subCategoryKey: 'decor',
    price: 399,
    originalPrice: 799,
    rating: 4.3,
    reviewCount: 1042,
    imageUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=400&q=80',
    description: 'Beautiful geometric contemporary table artifacts. Elegant ceramic deer pair sculptures representing serenity and love, accompanied by clean matte finish ceramic vases.',
    features: [
      'Includes two elegant deer figures (Sitting and Standing) and a small vase',
      'Textured white ceramic with smooth polished abstract geometries',
      'Sturdy heavy base with non-slip velvet protections',
      'Elegant packaging - perfect for wedding and housewarming gifts',
      'Instantly accentuates bookcases, coffee desks, and floating shelves'
    ],
    inStock: true,
    brand: 'Amazon Brand - Umi'
  },

  // --- ADDITIONAL SEARCH PRODUCTS (Mobiles, Computers, Electronics, Fashion, etc.) ---
  {
    id: 'search-mobile-1',
    name: 'iPhone 15 Pro (128 GB, Titanium Black)',
    category: 'Mobiles',
    categoryKey: 'mobiles',
    subCategoryKey: 'phone-i15',
    price: 129900,
    originalPrice: 134900,
    rating: 4.8,
    reviewCount: 5210,
    imageUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=400&q=80',
    description: 'Forged in titanium—featuring the groundbreaking A17 Pro chip, custom Action button, and a powerful camera system with multiple focal lengths.',
    features: [
      'Aerospace-grade titanium structure with tough ceramic shield front',
      'A17 Pro game-changing graphic rendering microchip',
      'Pro 48 MP Camera sensor capturing vivid deep dynamic range',
      'Interactive Dynamic Island floating overlay',
      'USB-C standard compatibility for rapid speeds'
    ],
    inStock: true,
    brand: 'Apple'
  },
  {
    id: 'search-mobile-2',
    name: 'OnePlus 12 5G (Flowy Emerald, 16GB RAM, 512GB Storage)',
    category: 'Mobiles',
    categoryKey: 'mobiles',
    subCategoryKey: 'phone-op12',
    price: 69999,
    originalPrice: 74999,
    rating: 4.7,
    reviewCount: 3410,
    imageUrl: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=400&q=80',
    description: 'Elite speed. Powering Snapdragon 8 Gen 3, custom 4th Gen Hasselblad mobile camera setup, and 100W wired SuperVOOC charging engine.',
    features: [
      'Snapdragon 8 Gen 3 with massive 16GB LPDDR5X RAM',
      '100W lightning charging goes 1% to 100% in 26 minutes',
      'Hasselblad Lens integration for premium cinema grade frames',
      'Stunning 2K 120Hz Fluid AMOLED display output',
      'Huge 5400 mAh dual-cell high endurance battery pack'
    ],
    inStock: true,
    brand: 'OnePlus'
  },
  {
    id: 'search-mobile-3',
    name: 'Samsung Galaxy S24 Ultra (Titanium Gray, 12GB RAM, 256GB Storage)',
    category: 'Mobiles',
    categoryKey: 'mobiles',
    subCategoryKey: 'phone-s24',
    price: 129999,
    originalPrice: 139999,
    rating: 4.9,
    reviewCount: 6112,
    imageUrl: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=400&q=80',
    description: 'Welcome to the era of mobile AI. Galaxy S24 Ultra is powered by Galaxy AI, integrated S Pen Stylus, Titanium frame, and incredible 200MP camera.',
    features: [
      'Galaxy AI: Circle to Search, Live Call translation, and AI photo editing',
      'Equipped with absolute high-precision Bluetooth active S-Pen',
      '200 Megapixel primary camera with 100x Space Zoom capabilities',
      'Stunning outdoor readable peak 2600 nits dynamic screen',
      'Long enduring vapor chamber heat cooling systems'
    ],
    inStock: true,
    brand: 'Samsung'
  },
  {
    id: 'search-laptop-1',
    name: 'MacBook Air M3 Pro Slate (13.6-inch, 8GB RAM, 256GB SSD)',
    category: 'Computers',
    categoryKey: 'computers',
    subCategoryKey: 'laptop-mac',
    price: 99900,
    originalPrice: 114900,
    rating: 4.8,
    reviewCount: 2240,
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=400&q=80',
    description: 'Strikingly thin design laptop featuring the M3 chip. Delivers blazing speeds, silent fanless thermal system, and up to 18 hours of battery juice.',
    features: [
      'Supercharged Apple Silicon M3 8-core CPU and 10-core GPU',
      'Passive zero-noise thermal build provides completely silent output',
      'Fascinating Liquid Retina display supporting 500 nits brightness',
      '1080p FaceTime HD premium camera with studio quality microphones',
      'Secure tactile Backlit Magic Keyboard and biological TouchID'
    ],
    inStock: true,
    brand: 'Apple'
  },
  {
    id: 'search-elec-1',
    name: 'Sony WH-1000XM5 Wireless Active Noise Cancelling Headphones (Silver)',
    category: 'Electronics',
    categoryKey: 'electronics',
    subCategoryKey: 'headphone-sony',
    price: 26990,
    originalPrice: 34990,
    rating: 4.7,
    reviewCount: 12052,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80',
    description: 'Redefining distraction-free audio sweeps. Dual chipsets control 8 noise-canceling sensors, linked with high-definition audio drivers and smart mic arrays.',
    features: [
      'Industry-leading active noise canceling tailored dynamically to your environment',
      'Up to 30 Hours high stamina battery life with fast charging (3 min for 3 hrs)',
      'Touchpad swipes trigger volume control, track skip and active voice assistance',
      'Speak-to-Chat pauses music instantly when you start speaking',
      'Ultra comfortable, feather-soft synthetic leather earmuffs'
    ],
    inStock: true,
    brand: 'Sony'
  },
  {
    id: 'search-fashion-1',
    name: 'Levi\'s Men\'s 511 Slim Fit Raw Cotton Blue Jeans',
    category: 'Fashion',
    categoryKey: 'fashion',
    subCategoryKey: 'jeans-levis',
    price: 1899,
    originalPrice: 3199,
    rating: 4.2,
    reviewCount: 19430,
    imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=400&q=80',
    description: 'A modern slim with room to move. The 511, since its legendary inception, offers a refined tailored alternative with durable stretch denim and 5 pockets.',
    features: [
      'Material Composition: 98% cotton, 2% high-stretch Spandex',
      'Slightly tapered narrow leg layout below the knees',
      'Signature rivets and arcuate design stitching along rear pockets',
      'Tough metallic zipper glide with custom heavy metal secure button',
      'Double stitched loops for security on heavy belt adjustments'
    ],
    inStock: true,
    brand: "Levi's"
  }
];

export const CAROUSEL_BANNERS: CarouselBanner[] = [
  {
    id: 'banner-kurtas',
    title: 'Bestselling kurtas',
    subtitle: 'Under ₹399',
    tagline: 'TOP BRANDS | LATEST TRENDS',
    accentText: 'Unlimited 5%* cashback with Amazon Pay ICICI bank credit card',
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80', // Beautiful Kurtas / Dresses
    bgColor: 'bg-pink-100', // Light Pink
    textPosition: 'left',
    textColor: 'text-gray-900',
    linkText: 'Explore Collection'
  },
  {
    id: 'banner-mobiles',
    title: 'Great Republic Sale',
    subtitle: 'Latest Smartphones',
    tagline: 'Up to 40% Off on Premium Devices',
    accentText: 'No Cost EMI options starting ₹1,999/month & free screens',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80', // Smartphone / Tech
    bgColor: 'bg-indigo-100', // Ice blue / Indigo
    textPosition: 'left',
    textColor: 'text-indigo-950',
    linkText: 'Shop Mobiles'
  },
  {
    id: 'banner-furniture',
    title: 'Elegant Furniture & Living',
    subtitle: 'Under ₹1,499',
    tagline: 'COMPLEMENTARY HOME DESIGNS',
    accentText: 'Get extra ₹150 off on delivery on orders above ₹999',
    image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=600&q=80', // Sofa / Lamp / Living
    bgColor: 'bg-orange-50', // Soft gold / sand
    textPosition: 'right',
    textColor: 'text-orange-950',
    linkText: 'Upgrade Home style'
  }
];
