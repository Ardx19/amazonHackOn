import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Sparkles, 
  Tag, 
  ArrowRight, 
  ArrowLeft,
  BadgePercent, 
  User, 
  PlusCircle, 
  X, 
  CheckCircle,
  Clock,
  MapPin,
  Trash2,
  PackageCheck,
  SlidersHorizontal,
  ChevronDown,
  Coins,
  ShieldAlert,
  HelpCircle,
  Video,
  Camera,
  Loader2,
  Search,
} from 'lucide-react';
import { Product } from '../types';
import { getDeals, gradeProduct, generateHealthCard } from '../lib/api';
import type { DealItem } from '../lib/types';
import { CATEGORY_IMAGE_MAP } from '../data/products';
import GradingCard from './GradingCard';
import HealthCardView from './HealthCardView';
import GreenCreditsCard from './GreenCreditsCard';
import SustainabilityBadge from './SustainabilityBadge';

interface MarketplaceViewProps {
  onAddToCart: (product: any, color?: string, size?: string) => void;
  onGoHome: () => void;
  onOpenSimulation?: () => void;
  session: any;
  relistItems: any[];
  setRelistItems: React.Dispatch<React.SetStateAction<any[]>>;
  initialTab?: 'float' | 'relist';
  excludeItemId?: string | null;
  excludePurchaseIds?: string[];
}

// Hardcoded fallback (replaced by API data via getDeals())
export const FLOAT_ITEMS: any[] = [];

const RELIST_IMAGE_OPTIONS = [
  { label: '🛋️ Sofa / Furniture', url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&auto=format&fit=crop&q=60' },
  { label: '📱 Phone / Tablet', url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&auto=format&fit=crop&q=60' },
  { label: '🚲 Cycle / Sports', url: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=400&auto=format&fit=crop&q=60' },
  { label: '💻 Laptop / PC', url: 'https://images.unsplash.com/photo-1496181130204-755241544e35?w=400&auto=format&fit=crop&q=60' },
  { label: '🧥 Jacket / Clothing', url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&auto=format&fit=crop&q=60' },
  { label: '📚 Books / Novels', url: 'https://images.unsplash.com/photo-1495640388908-05fa85288e61?w=400&auto=format&fit=crop&q=60' }
];

// ── Session-scoped shared listing store ──────────────────────────────────────
// Listings created in this browser session are visible to ALL personas.
// This is a simple module-level array — no backend persistence needed for demo.
const SESSION_LISTINGS: any[] = [];

export default function MarketplaceView({ 
  onAddToCart, 
  onGoHome, 
  onOpenSimulation,
  session,
  relistItems,
  setRelistItems,
  initialTab = 'float',
  excludeItemId,
  excludePurchaseIds = [],
}: MarketplaceViewProps) {
  // Navigation tabs: 'float' or 'relist'
  const [activeTab, setActiveTab] = useState<'float' | 'relist'>(initialTab);
  
  // Controls ReList multi-page state: 'feed' or 'create-listing'
  const [relistPage, setRelistPage] = useState<'feed' | 'identity' | 'declaration' | 'create-listing'>('feed');

  // Multi-page state for showing a product in detail: either FLOAT or RELIST
  const [selectedDetailItem, setSelectedDetailItem] = useState<{ item: any; source: 'float' | 'relist' } | null>(null);

  // ReList form: Media upload state trackers
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [aiHealthCard, setAiHealthCard] = useState<{
    score: number;
    grade: string;
    functionality: string;
    diagnostics: string;
    suggestedPrice: number;
  } | null>(null);

  // ─── API-backed state ──────────────────────────────────────────────────
  const [apiDeals, setApiDeals] = useState<any[]>([]);
  const [apiDealsLoading, setApiDealsLoading] = useState(false);
  const [apiDealsError, setApiDealsError] = useState<string | null>(null);
  const [apiGradingReport, setApiGradingReport] = useState<any>(null);
  const [apiHealthCard, setApiHealthCard] = useState<any>(null);
  const [apiGradingError, setApiGradingError] = useState<string | null>(null);
  const [apiGradingLoading, setApiGradingLoading] = useState(false);
  const [relistUploadedFiles, setRelistUploadedFiles] = useState<File[]>([]);
  const relistFileRef = useRef<HTMLInputElement>(null);

  // Fetch Float deals from API on mount (filtered by user's pincode, excluding own returned items)
  useEffect(() => {
    setApiDealsLoading(true);
    getDeals(undefined, session?.pincode, excludeItemId || undefined)
      .then((data) => {
        const mapped = data.deals.map((d: DealItem) => ({
          id: d.listing_id,
          name: d.product_name || d.item_id,
          category: 'Electronics',
          brand: 'Amazon ReRoute',
          imageUrl: CATEGORY_IMAGE_MAP.default,
          originalPrice: d.original_price_inr,
          price: d.current_sale_price_inr,
          rating: 4.0 + Math.random() * 1.0,
          reviewCount: Math.floor(Math.random() * 500 + 50),
          description: `Get it by: ${Math.abs((d.listing_id || '').split('').reduce((s, c) => s + c.charCodeAt(0), 0)) % 25}h`,
          glowAccent: d.discount_pct > 40 ? '#00ff9d' : d.discount_pct > 30 ? '#fffc00' : '#ff5c00',
          ring_index: d.ring_index,
          hub_name: d.current_hub_name,
        }));
        setApiDeals(mapped);
      })
      .catch((err) => setApiDealsError(err.message))
      .finally(() => setApiDealsLoading(false));
  }, [session?.pincode, excludeItemId]);

  // Interactive Filter tags
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [minRatingFilter, setMinRatingFilter] = useState<boolean>(false);
  const [underPriceFilter, setUnderPriceFilter] = useState<boolean>(false);

  // Search queries — one per tab
  const [floatSearchQuery, setFloatSearchQuery] = useState('');
  const [relistSearchQuery, setRelistSearchQuery] = useState('');

  // States for ReList Tab are loaded from global App.tsx container props now.

  // Form states for creating a new relisting
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('Home Essentials');
  const [itemOriginalPrice, setItemOriginalPrice] = useState('');
  const [itemAskingPrice, setItemAskingPrice] = useState('');
  const [itemCondition, setItemCondition] = useState('Very Good');
  const [itemYearsUsed, setItemYearsUsed] = useState('1 year');
  const [itemImageUrl, setItemImageUrl] = useState(RELIST_IMAGE_OPTIONS[0].url);
  const [itemDescription, setItemDescription] = useState('');
  const [isSubmitListing, setIsSubmitListing] = useState(false);
  const [showSubmitSuccess, setShowSubmitSuccess] = useState(false);

  // Image slider for the ReList detail page
  const [sliderIdx, setSliderIdx] = React.useState(0);

  // Float notifications state
  const [addCartNotification, setAddCartNotification] = useState<string | null>(null);

  // ── Identity verification gate ─────────────────────────────────────
  const [identityVerified, setIdentityVerified] = useState(
    () => sessionStorage.getItem('reroute_verified') === 'true'
  );
  const [identityLoading, setIdentityLoading] = useState(false);
  const [idForm, setIdForm] = useState({ fullName: '', aadhaar: '', phone: '', confirm: false });

  // ── Seller declaration form ────────────────────────────────────────
  const [declarationChecked, setDeclarationChecked] = useState({
    functional: false, neverRepaired: false, noHiddenDefects: false,
    allAccessories: false, misrepresentation: false,
  });
  const [declarationSubmitted, setDeclarationSubmitted] = useState(false);

  // Handle Tab Switch smoothly
  const handleTabSwitch = (tab: 'float' | 'relist') => {
    setActiveTab(tab);
    // Reset filters and search
    setSelectedCategory('All');
    setMinRatingFilter(false);
    setUnderPriceFilter(false);
    setFloatSearchQuery('');
    setRelistSearchQuery('');
  };

  // ── Identity verification submit ──────────────────────────────────
  const handleIdentitySubmit = () => {
    if (!idForm.fullName || idForm.aadhaar.length !== 12 || idForm.phone.length !== 10 || !idForm.confirm) return;
    setIdentityLoading(true);
    setTimeout(() => {
      setIdentityLoading(false);
      setIdentityVerified(true);
      sessionStorage.setItem('reroute_verified', 'true');
      setRelistPage('declaration');
    }, 1500);
  };

  // ── Declaration form submit ───────────────────────────────────────
  const allDeclarationChecked = Object.values(declarationChecked).every(Boolean);

  const handleDeclarationSubmit = () => {
    if (!allDeclarationChecked) return;
    setDeclarationSubmitted(true);
    setRelistPage('create-listing');
  };

  // ── Open listing flow (with identity check) ──────────────────────
  const openListingFlow = () => {
    if (identityVerified) {
      setRelistPage(declarationSubmitted ? 'create-listing' : 'declaration');
    } else {
      setRelistPage('identity');
    }
  };

  const simulateMediaUpload = () => {
    // Open the real OS file picker — if user picks files those are used for
    // grading. The stock-photo fallback only runs when no files are picked.
    relistFileRef.current?.click();
  };

  const handleRelistFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    // Store actual File objects (not FileList which gets invalidated when input clears)
    const files: File[] = [];
    for (let i = 0; i < Math.min(fileList.length, 3); i++) {
      const f = fileList.item(i);
      if (f) files.push(f);
    }
    setRelistUploadedFiles(files);
    // Show previews
    setUploadedImages(files.map((f) => URL.createObjectURL(f)));
    setUploadedVideo('placeholder-video');
    e.target.value = '';
  };

  const triggerAIEvaluation = async () => {
    if (relistUploadedFiles.length === 0) {
      setApiGradingError('No photos detected. Click a photo slot above and select an image.');
      return;
    }
    setIsAnalyzingAI(true);
    setAiHealthCard(null);
    setApiGradingReport(null);
    setApiHealthCard(null);
    setApiGradingError(null);

    try {
      const formData = new FormData();
      formData.append('item_id', `C2C-DEMO-${Date.now()}`);
      formData.append('product_name', itemName || 'C2C Product');
      formData.append('category', itemCategory === 'Home Essentials' ? 'home_goods' : itemCategory === 'Electronics' ? 'electronics' : 'clothing');
      formData.append('original_price_inr', itemOriginalPrice || '2999');
      formData.append('flow', 'relist');
      for (let i = 0; i < Math.min(relistUploadedFiles.length, 3); i++) {
        formData.append('images', relistUploadedFiles[i]);
      }

      const report = await gradeProduct(formData);
      setApiGradingReport(report);

      const card = await generateHealthCard({
        item_id: report.item_id,
        seller_id: session.isLoggedIn ? (session.email?.split('@')[0] || 'USER_DEMO') : 'USER_GUEST',
        seller_name: session.name || 'Demo Seller',
        seller_city: session.city || 'Mumbai',
        seller_usage_description: itemDescription || undefined,
        declaration_all_checked: declarationSubmitted && allDeclarationChecked,
        declaration_timestamp: declarationSubmitted ? new Date().toISOString() : undefined,
      });
      setApiHealthCard(card);

      setAiHealthCard({
        score: Math.round(report.confidence * 100),
        grade: report.condition_grade,
        functionality: report.routing_reason,
        diagnostics: report.rekognition_labels.join(', '),
        suggestedPrice: report.suggested_resale_band_inr?.[0] || Math.round(Number(itemOriginalPrice || 2999) * 0.5),
      });
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.error('AI evaluation failed:', msg);
      setApiGradingError(`AI grading failed: ${msg}`);
      setAiHealthCard(null);
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  // Relisting submit handler
  const handleAddNewListing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || !itemAskingPrice) return;

    setIsSubmitListing(true);

    setTimeout(() => {
      const newListing = {
        id: `user-list-${Date.now()}`,
        name: itemName,
        category: itemCategory,
        listedBy: session.name || 'You',
        location: `${session.city || 'Sector 62, Noida'}`,
        originalPrice: Number(itemOriginalPrice) || 0,
        askingPrice: Number(itemAskingPrice),
        condition: itemCondition,
        yearsUsed: itemYearsUsed,
        imageUrl: uploadedImages[0] || itemImageUrl,
        uploadedImages: uploadedImages.length > 0 ? [...uploadedImages] : [itemImageUrl],
        videoUrl: uploadedVideo,
        aiHealthCard: aiHealthCard ? { ...aiHealthCard } : null,
        // Full HealthCard from the API — shown in the detail page
        fullHealthCard: apiHealthCard ? { ...apiHealthCard } : null,
        description: itemDescription || 'No description supplied. Contact owner for further snaps.',
        likes: 0,
        isUserListing: true,
        verifiedSeller: session.isVerifiedSeller || false,
      };

      // Push to the shared session store so all personas see it
      SESSION_LISTINGS.unshift(newListing);
      setRelistItems((prev) => [newListing, ...prev]);
      setIsSubmitListing(false);
      setShowSubmitSuccess(true);

      // Clean form inputs & media
      setItemName('');
      setItemAskingPrice('');
      setItemOriginalPrice('');
      setItemDescription('');
      setUploadedImages([]);
      setUploadedVideo(null);
      setAiHealthCard(null);

      // Return to feed page
      setRelistPage('feed');

      setTimeout(() => setShowSubmitSuccess(false), 4000);
    }, 1200);
  };

  const handleDeleteUserListing = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRelistItems((prev) => prev.filter(item => item.id !== id));
  };

  const handlePurchaseFloatItem = (item: typeof FLOAT_ITEMS[0]) => {
    // Inject the discounted product representation to the global shopping basket
    const discountProductRepresentation: Product = {
      id: item.id,
      name: `[Marketplace Float] ${item.name}`,
      category: item.category,
      categoryKey: item.category === 'Electronics' ? 'appliances' : 'fashion',
      subCategoryKey: 'marketplace',
      price: item.price,
      originalPrice: item.originalPrice,
      rating: item.rating,
      reviewCount: item.reviewCount,
      imageUrl: item.imageUrl,
      description: item.description,
      features: ['Marketplace Inspected', 'Verified Second-Life'],
      inStock: true,
      brand: item.brand
    };

    onAddToCart(discountProductRepresentation, 'Standard Premium', 'Regular Pack');
    setAddCartNotification(item.name);
    setTimeout(() => setAddCartNotification(null), 3500);
  };

  const handlePurchaseRelistItem = (item: typeof relistItems[0]) => {
    const listingProduct: Product = {
      id: item.id,
      name: `[ReList] ${item.name}`,
      category: item.category,
      categoryKey: 'appliances',
      subCategoryKey: 'marketplace',
      price: item.askingPrice,
      originalPrice: item.originalPrice || item.askingPrice,
      rating: 4.5,
      reviewCount: 1,
      imageUrl: item.imageUrl,
      description: item.description || 'Peer-listed item.',
      features: ['Peer Verified', 'Second-Life'],
      inStock: true,
      brand: item.category || 'ReList'
    };
    onAddToCart(listingProduct, 'Standard', 'Regular');
    setAddCartNotification(item.name);
    setTimeout(() => setAddCartNotification(null), 3500);
  };

  // Filter lists dynamically — uses apiDeals from backend
  const floatSearch = floatSearchQuery.trim().toLowerCase();
  const relistSearch = relistSearchQuery.trim().toLowerCase();

  const filteredFloatItems = apiDeals.filter(item => {
    if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
    if (minRatingFilter && item.rating < 4.8) return false;
    if (underPriceFilter && item.price > 20000) return false;
    if (floatSearch && !item.name?.toLowerCase().includes(floatSearch) &&
        !item.hub_name?.toLowerCase().includes(floatSearch) &&
        !item.category?.toLowerCase().includes(floatSearch)) return false;
    if (excludePurchaseIds.includes(item.id)) return false;
    return true;
  });

  // Merge persona's own listings with session-created listings (visible to all personas).
  // Deduplicate by id so persona's own items don't double-up.
  const allRelistItems = [
    ...SESSION_LISTINGS,
    ...relistItems.filter(item => !SESSION_LISTINGS.find(s => s.id === item.id)),
  ];

  const filteredRelistItems = allRelistItems.filter(item => {
    if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
    if (minRatingFilter && item.condition !== 'Like New') return false;
    if (underPriceFilter && item.askingPrice > 15000) return false;
    if (relistSearch && !item.name?.toLowerCase().includes(relistSearch) &&
        !item.category?.toLowerCase().includes(relistSearch) &&
        !item.location?.toLowerCase().includes(relistSearch)) return false;
    if (excludePurchaseIds.includes(item.id)) return false;
    return true;
  });

  return (
    <div id="marketplace-page-portal" className="max-w-7xl mx-auto px-4 py-8 select-none font-sans text-left bg-slate-50 min-h-screen">
      
      {/* Hidden real file picker for ReList photo upload */}
      <input
        ref={relistFileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleRelistFileSelect}
      />
      <AnimatePresence>
        {addCartNotification && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            className="fixed bottom-6 right-6 z-50 bg-[#fffc40] border-3 border-black p-4 max-w-sm text-black flex gap-3 shadow-[8px_8px_0px_#000] rotate-[-1deg] font-sans"
          >
            <div className="w-10 h-10 bg-white border-2 border-black flex items-center justify-center shrink-0">
              <CheckCircle className="w-6 h-6 text-black" />
            </div>
            <div>
              <p className="font-black text-xs uppercase tracking-wider">Acquired via Basket!</p>
              <p className="text-[11px] font-bold line-clamp-1 mt-0.5">{addCartNotification}</p>
              <p className="text-red-650 font-black mt-1 text-[10px] uppercase">Second-Life Savings Locked!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Header Block (Modern Neo-Brutalist Jumbotron) */}
      <div className="bg-white border-3 border-black p-6 md:p-8 mb-8 shadow-[8px_8px_0px_rgba(0,0,0,1)] relative overflow-hidden transition-all">
        {/* Background visual graphics */}
        <div className="absolute top-0 right-0 w-32 h-full bg-[#fffc40] border-l-3 border-black opacity-10 hidden md:block transform skew-x-12" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-black tracking-tighter uppercase leading-none">
              Amazon <span className="underline decoration-[#fffc40] decoration-6">Marketplace</span>
            </h1>
            <p className="text-xs md:text-sm text-gray-700 font-mono font-bold mt-2 max-w-2xl leading-relaxed">
              Skip traditional routes. Grab factory-graded inventory via <span className="text-emerald-600 font-black">FLOAT</span> returns or preowned products on the <span className="text-amber-600 font-black">RELIST</span> directory.
            </p>
          </div>

          <button
            onClick={onGoHome}
            className="group relative bg-[#fffc40] border-2 border-black text-black text-xs font-black px-5 py-3 shadow-[4px_4px_0px_rgba(0,0,0,1)] cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all uppercase tracking-wider"
          >
            ← Back to Retail
          </button>
          {onOpenSimulation && (
            <button
              onClick={onOpenSimulation}
              className="group relative bg-black border-2 border-black text-[#00ff9d] text-xs font-black px-5 py-3 shadow-[4px_4px_0px_rgba(0,0,0,1)] cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all uppercase tracking-wider"
            >
              ⚡ Float Simulation
            </button>
          )}
        </div>
      </div>

      {/* ==================== ZOMATO / SWIGGY-STYLE TABS SYSTEM (FULL WIDTH) ==================== */}
      <div className="border-b-3 border-black mb-6 flex flex-wrap gap-2 md:gap-4 font-sans bg-white p-2">
        
        {/* Float Tab Trigger */}
        <button 
          onClick={() => {
            handleTabSwitch('float');
            setRelistPage('feed');
          }}
          className={`pb-3 pt-2 px-4 md:px-6 text-lg md:text-2xl font-black relative transition-all cursor-pointer flex items-center gap-2.5 outline-none ${
            activeTab === 'float' ? 'text-black font-extrabold' : 'text-gray-400 hover:text-black'
          }`}
        >
          <div className={`w-8 h-8 flex items-center justify-center border-2 border-black rounded-sm shadow-[2px_2px_0px_rgba(0,0,0,1)] ${
            activeTab === 'float' ? 'bg-[#00ff9d]' : 'bg-gray-100'
          }`}>
            <BadgePercent className="w-5 h-5 text-black" />
          </div>
          <div className="flex flex-col items-start leading-none text-left">
            <span className="uppercase text-sm md:text-lg font-black tracking-tight">Float Deals</span>
            <span className="text-[10px] font-bold text-gray-500 hidden md:block mt-0.5">Live Transit Deals</span>
          </div>

          {activeTab === 'float' && (
            <motion.div 
              layoutId="activeZomatoUnderline"
              className="absolute bottom-[-3px] left-0 right-0 h-[4px] bg-black"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
        </button>

        {/* ReList Tab Trigger */}
        <button 
          onClick={() => handleTabSwitch('relist')}
          className={`pb-3 pt-2 px-4 md:px-6 text-lg md:text-2xl font-black relative transition-all cursor-pointer flex items-center gap-2.5 outline-none ${
            activeTab === 'relist' ? 'text-black font-extrabold' : 'text-gray-400 hover:text-black'
          }`}
        >
          <div className={`w-8 h-8 flex items-center justify-center border-2 border-black rounded-sm shadow-[2px_2px_0px_rgba(0,0,0,1)] ${
            activeTab === 'relist' ? 'bg-[#ff5c00]' : 'bg-gray-100'
          }`}>
            <ShoppingBag className="w-5 h-5 text-black" />
          </div>
          <div className="flex flex-col items-start leading-none text-left">
            <span className="uppercase text-sm md:text-lg font-black tracking-tight">ReList </span>
            <span className="text-[10px] font-bold text-gray-500 hidden md:block mt-0.5">Preowned Items</span>
          </div>

          {activeTab === 'relist' && (
            <motion.div 
              layoutId="activeZomatoUnderline"
              className="absolute bottom-[-3px] left-0 right-0 h-[4px] bg-black"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
        </button>
      </div>

      {/* ==================== SWIGGY / ZOMATO CRITICAL FILTERS & OPTIONAL ACTIONS (FULL WIDTH) ==================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white border-2 border-black p-3 shadow-[4px_4px_0px_#000] font-sans">
        
        {/* Horizontal filters feed */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-black font-mono">
          <div className="flex items-center gap-1.5 bg-black text-white px-2.5 py-1.5 uppercase tracking-wider mr-2 text-[10px]">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Quick Filters</span>
          </div>

          {/* Category filter pills */}
          {['All', 'Electronics', 'Fashion', 'Home Essentials', 'Sports'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 border-2 border-black hover:bg-slate-150 transition-all cursor-pointer ${
                selectedCategory === cat ? 'bg-[#fffc40] text-black shadow-[2px_2px_0px_#000]' : 'bg-white text-gray-700'
              }`}
            >
              {cat}
            </button>
          ))}

          <span className="h-5 w-0.5 bg-black hidden md:inline mx-1" />

          {/* Rating filter pill button */}
          <button
            onClick={() => setMinRatingFilter(!minRatingFilter)}
            className={`px-3 py-1.5 border-2 border-black transition-all cursor-pointer flex items-center gap-1 ${
              minRatingFilter ? 'bg-[#00ff9d] text-black shadow-[2px_2px_0px_#000]' : 'bg-white text-gray-700 hover:bg-slate-50'
            }`}
          >
            <span>{activeTab === 'float' ? '⭐ Rating 4.8+' : '✨ Like New Condition'}</span>
            {minRatingFilter && <span className="bg-black text-[9px] text-white px-1 font-black">ON</span>}
          </button>

          {/* Budget filter pill */}
          <button
            onClick={() => setUnderPriceFilter(!underPriceFilter)}
            className={`px-3 py-1.5 border-2 border-black transition-all cursor-pointer flex items-center gap-1 ${
              underPriceFilter ? 'bg-[#00e0ff] text-black shadow-[2px_2px_0px_#000]' : 'bg-white text-gray-700 hover:bg-slate-50'
            }`}
          >
            <span>{activeTab === 'float' ? '💸 Under ₹20,000' : '🏷️ Under ₹15,000'}</span>
            {underPriceFilter && <span className="bg-black text-[9px] text-white px-1 font-black">ON</span>}
          </button>
        </div>

        {/* Dynamic Action Trigger directly aligned with the row (Zomato-style) */}
        {activeTab === 'relist' && (
          <div className="shrink-0 self-end md:self-auto">
            {relistPage === 'feed' ? (
              <button
                onClick={() => openListingFlow()}
                className="bg-[#ff5c00] hover:bg-[#e04f00] text-white font-extrabold text-xs px-4 py-2.5 border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
              >
                <PlusCircle className="w-4 h-4" />
                <span>List Product page</span>
              </button>
            ) : (
              <button
                onClick={() => setRelistPage('feed')}
                className="bg-white hover:bg-gray-100 text-black font-extrabold text-xs px-4 py-2.5 border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to listings</span>
              </button>
            )}
          </div>
        )}
      </div>

      {showSubmitSuccess && (
        <div className="mb-6 space-y-4">
          <GreenCreditsCard weightKg={0.5} />
          <div className="bg-emerald-50 border-3 border-emerald-400 text-emerald-900 p-3 shadow-[4px_4px_0px_rgba(16,185,129,0.25)] text-xs font-bold flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-0.5" />
            <div>
              Your second-hand item has been registered in the Noida community grid ledger. Scroll down to see it listed!
            </div>
          </div>
        </div>
      )}

      {/* ==================== CORE CONTENT VIEWPORTS SPA (FULL SCREEN WIDTH) ==================== */}
      <div className="w-full">
        <AnimatePresence mode="wait">

          {selectedDetailItem ? (
            <motion.div
              key="detailed-product-page"
              initial={{ opacity: 0, scale: 0.98, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -30 }}
              transition={{ duration: 0.2 }}
              className="bg-white border-3 border-black p-6 md:p-8 shadow-[8px_8px_0px_#000] text-left"
            >
              {/* Back button */}
              <div className="flex justify-between items-center pb-6 border-b-3 border-black mb-6 flex-wrap gap-4">
                <button
                  onClick={() => setSelectedDetailItem(null)}
                  className="bg-[#fffc40] hover:bg-[#e0de34] text-black border-2 border-black font-black text-xs px-4 py-2.5 shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all cursor-pointer uppercase flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Catalog</span>
                </button>

                <span className="font-mono text-xs font-bold uppercase py-1 px-3 bg-black text-white shrink-0 tracking-wider">
                  {selectedDetailItem.source === 'float' ? '⚡ FLOAT RETURN IN TRANSIT' : '📦 RELIST PEER UNBOXED'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                {/* Left Column: Media */}
                <div className="space-y-6">
                  <div className="bg-slate-50 border-3 border-black p-4 flex items-center justify-center min-h-[300px] sm:min-h-[400px] relative">
                    <img
                      src={selectedDetailItem.item.imageUrl}
                      alt={selectedDetailItem.item.name}
                      className="max-h-[350px] object-contain mix-blend-multiply"
                    />
                    
                    {selectedDetailItem.source === 'float' && (
                      <div className="absolute top-4 left-4 bg-[#00ff9d] text-black font-black text-xs px-3 py-1.5 border-2 border-black uppercase rotate-[-3deg] shadow-[2px_2px_0px_#000]">
                        Transit Lock
                      </div>
                    )}
                  </div>

                  {/* Extra images or media if RELIST has custom uploads — with slider */}
                  {selectedDetailItem.source === 'relist' && (
                    <div className="space-y-4 text-left">
                      {(() => {
                        const imgs: string[] = selectedDetailItem.item.uploadedImages?.length
                          ? selectedDetailItem.item.uploadedImages
                          : [selectedDetailItem.item.imageUrl];
                        return (
                          <div className="space-y-2">
                            {/* Main large image */}
                            <div className="relative border-2 border-black bg-white h-64 flex items-center justify-center overflow-hidden">
                              <img
                                src={imgs[sliderIdx] || imgs[0]}
                                className="max-h-full max-w-full object-contain"
                                alt={`Photo ${sliderIdx + 1}`}
                              />
                              {imgs.length > 1 && (
                                <>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setSliderIdx((sliderIdx - 1 + imgs.length) % imgs.length); }}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/70 text-white w-7 h-7 flex items-center justify-center font-black text-sm cursor-pointer hover:bg-black"
                                  >‹</button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setSliderIdx((sliderIdx + 1) % imgs.length); }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/70 text-white w-7 h-7 flex items-center justify-center font-black text-sm cursor-pointer hover:bg-black"
                                  >›</button>
                                  <span className="absolute bottom-2 right-2 bg-black text-white text-[10px] font-mono font-bold px-1.5 py-0.5">
                                    {sliderIdx + 1}/{imgs.length}
                                  </span>
                                </>
                              )}
                            </div>
                            {/* Thumbnail strip */}
                            {imgs.length > 1 && (
                              <div className="flex gap-2">
                                {imgs.map((img, idx) => (
                                  <div
                                    key={idx}
                                    onClick={() => setSliderIdx(idx)}
                                    className={`border-2 cursor-pointer h-14 w-14 flex-shrink-0 overflow-hidden ${sliderIdx === idx ? 'border-[#ff5c00]' : 'border-black hover:border-gray-500'}`}
                                  >
                                    <img src={img} className="w-full h-full object-cover" alt={`thumb ${idx + 1}`} />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Right Column: Information & Actions */}
                <div className="space-y-6 text-left">
                  <div>
                    <span className="bg-slate-150 border-2 border-black font-mono text-[9px] font-bold text-black uppercase tracking-widest px-2.5 py-1">
                      {selectedDetailItem.item.category}
                    </span>
                    <h2 className="text-2xl md:text-3xl font-black text-black uppercase mt-3 tracking-wide leading-tight">
                      {selectedDetailItem.item.name}
                    </h2>
                    {selectedDetailItem.source === 'relist' && (
                      <p className="text-xs font-mono font-bold mt-2 text-gray-500 flex items-center flex-wrap gap-1">
                        <span>Listed by:</span>
                        <span className="text-black font-black flex items-center gap-1">
                          {selectedDetailItem.item.listedBy}
                          {selectedDetailItem.item.verifiedSeller && (
                            <span className="inline-flex items-center gap-0.5 bg-emerald-500 text-white font-mono text-[8px] font-black px-1.5 py-0.5 rounded uppercase leading-none font-sans" title="Verified Seller Trust Badge active">
                              <CheckCircle className="w-2.5 h-2.5 stroke-[3px]" />
                              <span>Verified</span>
                            </span>
                          )}
                        </span>
                        <span className="text-gray-300 mx-1">|</span>
                        <span>Area: {selectedDetailItem.item.location}</span>
                      </p>
                    )}
                  </div>

                  <div className="bg-slate-50 border-2 border-black p-4 font-mono font-bold text-xs space-y-2.5">
                    <div className="flex justify-between items-center text-gray-500 pb-2 border-b border-gray-200">
                      <span>Marketplace Status:</span>
                      <span className={selectedDetailItem.source === 'float' ? 'text-emerald-600 font-extrabold' : 'text-amber-600 font-extrabold'}>
                        {selectedDetailItem.source === 'float' ? '✦ USER RETURN IN TRANSIT' : '✦ PEER LISTED'}
                      </span>
                    </div>
                    {selectedDetailItem.source === 'float' ? (
                      <div className="space-y-1.5 text-[11px] text-gray-700 font-sans font-medium leading-relaxed">
                        <p>{selectedDetailItem.item.description}</p>
                        <p>This item is currently being routed under standard Amazon Return Transit logistics from the original buyer back to our central hub. Restock allocation has been canceled, making this unit immediately available for locker bypass checkout.</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 text-gray-700 font-sans font-medium">
                        <p>{selectedDetailItem.item.description}</p>
                        <div className="grid grid-cols-2 gap-2 font-mono text-[10px] text-gray-500 pt-2 border-t border-dashed border-gray-300">
                          <span>Usage: {selectedDetailItem.item.yearsUsed}</span>
                          <span>Condition Rank: {selectedDetailItem.item.condition}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* AI Health Report — full card if available, compact fallback otherwise */}
                  {selectedDetailItem.source === 'relist' && (
                    selectedDetailItem.item.fullHealthCard ? (
                      <div>
                        <h4 className="font-mono text-xs font-black uppercase text-black tracking-widest mb-2 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-amzn-orange" />
                          Amazon AI Verified Health Card
                        </h4>
                        <HealthCardView
                          card={selectedDetailItem.item.fullHealthCard}
                          qrBase64={selectedDetailItem.item.fullHealthCard.qr_code_base64}
                        />
                      </div>
                    ) : (
                    <div className="bg-black text-white border-2 border-black p-4 relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-[#fffc40] text-black text-[9px] font-black px-2 py-0.5 uppercase tracking-wide rotate-12">
                        Amazon AI Verified
                      </div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Sparkles className="w-5 h-5 text-[#fffc40]" />
                        <h4 className="font-mono text-xs font-black uppercase text-white tracking-widest">
                          Amazon AI Grader Health Report
                        </h4>
                      </div>

                      {selectedDetailItem.item.aiHealthCard ? (
                        <div className="space-y-2 text-[11px] font-mono text-gray-300 leading-normal">
                          <div className="grid grid-cols-2 gap-2 text-left bg-slate-900 p-2 border border-slate-700">
                            <div>
                              <span className="text-[9px] text-gray-400 block uppercase">Functional Score</span>
                              <span className="text-xs font-extrabold text-[#00ff9d]">{selectedDetailItem.item.aiHealthCard.score}/100</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-gray-400 block uppercase">Diagnostics Grade</span>
                              <span className="text-xs font-extrabold text-[#fffc40]">{selectedDetailItem.item.aiHealthCard.grade}</span>
                            </div>
                          </div>
                          <div className="text-[10px] space-y-1 text-left bg-slate-900/50 p-2 border border-slate-800">
                            <p><strong className="text-white">Checks:</strong> {selectedDetailItem.item.aiHealthCard.functionality}</p>
                            <p><strong className="text-white">Chassis:</strong> {selectedDetailItem.item.aiHealthCard.diagnostics}</p>
                            <p className="text-[#fffc40] mt-1"><strong className="text-white">AI Valuation Resale Suggestion:</strong> ₹{selectedDetailItem.item.aiHealthCard.suggestedPrice.toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 text-[11px] font-mono text-gray-300">
                          <div className="grid grid-cols-2 gap-2 bg-slate-900 p-2 border border-slate-700">
                            <div>
                              <span className="text-[9px] text-gray-400 block">Mechanical Check</span>
                              <span className="text-xs text-[#00ff9d] font-bold">Tested 92% Integr.</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-gray-400 block">System Grade</span>
                              <span className="text-xs text-[#fffc40] font-bold">A- Very Good</span>
                            </div>
                          </div>
                          <p className="text-[10px] leading-relaxed">AI Diagnostics completed: Multi-angle physical verification passed. Fully functional network & connectivity modules. Suggested Price Valuation: ₹{(selectedDetailItem.item.askingPrice * 0.95).toFixed(0)}.</p>
                        </div>
                      )}
                    </div>
                    )
                  )}

                  {/* Float Transit Steps Progress Timeline */}
                  {selectedDetailItem.source === 'float' && (
                    <div className="bg-slate-50 border-2 border-black p-4 space-y-3 text-left">
                      <h4 className="font-mono text-xs font-black uppercase text-black tracking-wider flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-slate-700" />
                        <span>Transit Logistics Timeline</span>
                      </h4>
                      <div className="relative pl-6 space-y-4 font-mono text-[10.5px]">
                        {/* Line */}
                        <div className="absolute left-2.5 top-1.5 bottom-1.5 w-0.5 border-l-2 border-dashed border-gray-400" />

                        <div className="relative">
                          <span className="absolute left-[-21px] top-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-black shadow-[1px_1px_0px_#000]" />
                          <p className="font-bold text-black uppercase text-[10px]">Phase 1: Customer Return Triggered</p>
                          <p className="text-gray-500 text-[9.5px]">Scanned and registered at local destination cluster</p>
                        </div>

                        <div className="relative">
                          <span className="absolute left-[-21px] top-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-black shadow-[1px_1px_0px_#000] animate-pulse" />
                          <p className="font-bold text-black uppercase text-[10px]">Phase 2: Transition Logistics (In-Transit)</p>
                          <p className="text-gray-500 text-[9.5px]">Device currently riding securely in standard transit vehicle back-container.</p>
                        </div>

                        <div className="relative text-gray-400">
                          <span className="absolute left-[-21px] top-0.5 w-2.5 h-2.5 rounded-full bg-gray-200 border border-gray-350" />
                          <p className="font-bold uppercase text-[10px]">Phase 3: Noida Central Cargo Landing</p>
                          <p className="text-[9.5px]">Awaiting cargo container drop check (Bypassed if you purchase now)</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pricing and checkout block */}
                  <div className="border border-2 border-black p-4 bg-slate-50 font-mono">
                    <div className="flex justify-between items-end gap-2">
                      <div>
                        <span className="text-[9px] text-gray-500 uppercase block tracking-wider">Contract Resale Price</span>
                        <span className="text-2xl font-black text-black">
                          ₹{(selectedDetailItem.source === 'float' ? selectedDetailItem.item.price : selectedDetailItem.item.askingPrice).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9.5px] text-gray-400 uppercase line-through block">MSRP Retail Original</span>
                        <span className="text-xs text-gray-500 line-through">
                          ₹{selectedDetailItem.item.originalPrice.toLocaleString('en-IN')}
                        </span>
                        <span className="block text-[10px] text-emerald-600 font-extrabold mt-0.5 uppercase">
                          Save {Math.round(((selectedDetailItem.item.originalPrice - (selectedDetailItem.source === 'float' ? selectedDetailItem.item.price : selectedDetailItem.item.askingPrice)) / selectedDetailItem.item.originalPrice) * 100)}% Off
                        </span>
                      </div>
                    </div>

                    <div className="mt-4">
                      {selectedDetailItem.source === 'float' ? (
                        <button
                          onClick={() => {
                            handlePurchaseFloatItem(selectedDetailItem.item);
                            setSelectedDetailItem(null);
                          }}
                          className="w-full bg-[#00ff9d] hover:bg-[#00e08b] text-black border-2 border-black font-black text-xs py-3.5 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider"
                        >
                          <Tag className="w-4.5 h-4.5 text-black" />
                          <span>Assign transit item to retail basket</span>
                        </button>
                      ) : (
                        !selectedDetailItem.item.isUserListing ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handlePurchaseRelistItem(selectedDetailItem.item); }}
                            className="w-full bg-[#fffc40] hover:bg-[#e0de34] text-black border-2 border-black font-black text-xs py-3.5 shadow-[3px_3px_0px_#000] hover:shadow-[5px_5px_0px_#000] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider"
                          >
                            <ShoppingBag className="w-4 h-4 text-black" />
                            <span>Add to Cart</span>
                          </button>
                        ) : (
                          <div className="w-full bg-[#ff5c00]/10 border-2 border-[#ff5c00] text-[#ff5c00] font-black text-[11px] py-3.5 text-center uppercase tracking-wider">
                            ✦ Active Relisting Upload ✦
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <>
              
              {/* -------------------- VIEW 1: FLOAT CLEARANCE (BRUTALIST STYLE) -------------------- */}
              {activeTab === 'float' && (
            <motion.div
              key="float-grid-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              
              {/* Alert Ribbon */}
              <div className="bg-black/95 text-white p-3.5 border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row justify-between items-center gap-2 font-mono text-xs uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00ff9d] animate-ping" />
                  <span className="font-bold text-[#00ff9d]">LIVE ORDERS:</span>
                  <span className="text-gray-300"> Real-Time Transit Feed</span>
                </div>
              </div>

              {/* Float Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={floatSearchQuery}
                  onChange={(e) => setFloatSearchQuery(e.target.value)}
                  placeholder="Search float deals by name, hub or category..."
                  className="w-full pl-10 pr-10 py-3 bg-white border-2 border-black shadow-[3px_3px_0px_#000] font-mono text-sm text-black placeholder-gray-400 outline-none focus:shadow-[5px_5px_0px_#000] transition-shadow"
                />
                {floatSearchQuery && (
                  <button
                    onClick={() => setFloatSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {apiDealsLoading ? (
                <div className="bg-white border-3 border-black p-12 text-center text-gray-500 font-mono font-bold shadow-[4px_4px_0px_#000] select-none flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading transit deals from Noida Hub...
                </div>
              ) : apiDealsError ? (
                <div className="bg-red-50 border-3 border-black p-8 text-center text-red-700 font-mono font-bold shadow-[4px_4px_0px_#000]">
                  Failed to load deals: {apiDealsError}
                </div>
              ) : filteredFloatItems.length === 0 ? (
                <div className="bg-white border-3 border-black p-12 text-center text-gray-500 font-mono font-bold shadow-[4px_4px_0px_#000] select-none">
                  ✖ Match Database Negative: No items matching your select criteria. Try changing filters!
                </div>
              ) : (
                /* Beautiful 3-column brutalist card grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredFloatItems.map((item) => {
                    const discountPercentage = Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100);
                    return (
                      <div 
                        key={item.id}
                        onClick={() => setSelectedDetailItem({ item, source: 'float' })}
                        className="bg-white border-3 border-black flex flex-col relative overflow-hidden group shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:shadow-[10px_10px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 active:translate-x-0 active:translate-y-0 active:shadow-none transition-all duration-150 cursor-pointer"
                      >
                        
                        {/* Image canvas block with grid backdrop */}
                        <div className="h-60 bg-grid-slate-100 border-b-3 border-black relative flex items-center justify-center p-6 bg-slate-50">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="max-h-full max-w-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-200"
                            referrerPolicy="no-referrer"
                          />
                          
                          {/* Sustainability Badge */}
                          <div className="absolute top-4 right-4 z-20">
                            <SustainabilityBadge />
                          </div>

                          {/* Clear timer — random per listing */}
                          <div className="absolute bottom-3 right-3 bg-[#fffc40] text-black border border-black px-2 py-1 text-[9px] font-mono font-bold uppercase tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,0.3)]">
                            Clears in {(() => { const h = Math.abs((item.id || '').split('').reduce((s: number, c: string) => s + c.charCodeAt(0), 0)) % 24 + 1; return h; })()}h
                          </div>
                        </div>

                        {/* Text and stats */}
                        <div className="p-5 flex-grow flex flex-col justify-between text-left space-y-4">
                          <div>
                            <h3 className="text-sm font-black text-black group-hover:underline line-clamp-2 uppercase tracking-wide leading-tight">
                              {item.name}
                            </h3>
                            
                            <p className="text-xs text-gray-700 font-medium font-sans mt-2 line-clamp-3 leading-relaxed">
                              {item.description}
                            </p>
                          </div>

                          {/* Pricing details in monochrome brutalist grid */}
                          <div className="border-t-2 border-black pt-3">
                            <div className="grid grid-cols-2 gap-2 text-left bg-slate-50 p-2.5 border-2 border-black font-mono">
                              <div>
                                <span className="block text-[8px] text-gray-500 uppercase tracking-widest font-black">Contract Price</span>
                                <span className="text-xl font-black text-black">₹{item.price.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="text-right border-l border-gray-300 pl-2">
                                <span className="block text-[8px] text-gray-500 uppercase line-through tracking-widest">Retail Original</span>
                                <span className="text-xs text-gray-600 line-through">₹{item.originalPrice.toLocaleString('en-IN')}</span>
                                <span className="block text-[9px] text-emerald-600 font-extrabold font-sans mt-0.5">Save ₹{(item.originalPrice - item.price).toLocaleString('en-IN')}</span>
                              </div>
                            </div>

                            {/* Brutalist Checkout action button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePurchaseFloatItem(item);
                              }}
                              className="w-full mt-4 bg-[#00ff9d] hover:bg-[#00e08b] text-black border-2 border-black font-black text-xs py-3 rounded-none shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider"
                            >
                              <Tag className="w-4 h-4 text-black" />
                              <span>Add to Cart</span>
                            </button>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Secure logistics banner */}
              <div className="bg-white border-3 border-black p-5 mt-8 shadow-[4px_4px_0px_#000] flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-50 border-2 border-black flex items-center justify-center text-black shrink-0 shadow-[2px_2px_0px_#000]">
                    <PackageCheck className="w-6 h-6" />
                  </div>
                  <div className="text-left font-mono">
                    <p className="text-xs font-black uppercase text-black">100% Inspected & Verified</p>
                    <p className="text-[10px] text-gray-650 leading-tight">These products are evaluated for full diagnostic health in corporate storage hubs.</p>
                  </div>
                </div>

              </div>

            </motion.div>
          )}

          {/* -------------------- VIEW 2: RELIST PEER CLASSIFIEDS -------------------- */}
          {activeTab === 'relist' && (
            <motion.div
              key="relist-view-matrix"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              
              <AnimatePresence mode="wait">
                
                {/* PAGE 1: RE-LIST CLASSIFIEDS GRID (FEED) */}
                {relistPage === 'feed' && (
                  <motion.div
                    key="relist-feed-page"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="space-y-6"
                  >
                    
                    {/* Big brutalist banner card linking to list-form inside ReList */}
                    <div 
                      onClick={() => openListingFlow()}
                      className="bg-[#ff5c00] text-white border-3 border-black p-6 shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:shadow-[10px_10px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all"
                    >
                      <div className="text-left font-mono">
                        <h3 className="text-2xl font-black uppercase leading-none tracking-tight">Got idle appliances or electronics?</h3>
                        <p className="text-xs text-orange-100 font-bold mt-1 max-w-2xl leading-relaxed">
                          Relist them here effortlessly! Upload snaps, quote your custom price, specify condition grading, and connect with buyers securely.
                        </p>
                      </div>

                      <div className="bg-black text-[11px] font-black text-white hover:text-[#ff5c00] border-2 border-white md:px-5 py-3 shrink-0 flex items-center gap-1.5 uppercase tracking-wider shadow-[3px_3px_0px_rgba(255,255,255,0.2)]">
                        <span>Relist Product Now</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="bg-black text-white px-4 py-2 font-mono text-[11px] uppercase tracking-wider border-2 border-black shadow-[4px_4px_0px_#000] flex justify-between">
                      <span>Live Feed</span>
                      <span className="text-[#ff5c00] font-black">{filteredRelistItems.length} Available Listings</span>
                    </div>

                    {/* ReList Search Bar */}
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        value={relistSearchQuery}
                        onChange={(e) => setRelistSearchQuery(e.target.value)}
                        placeholder="Search listings by name, category, seller or location..."
                        className="w-full pl-10 pr-10 py-3 bg-white border-2 border-black shadow-[3px_3px_0px_#000] font-mono text-sm text-black placeholder-gray-400 outline-none focus:shadow-[5px_5px_0px_#000] transition-shadow"
                      />
                      {relistSearchQuery && (
                        <button
                          onClick={() => setRelistSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {filteredRelistItems.length === 0 ? (
                      <div className="bg-white border-3 border-black p-12 text-center text-gray-500 font-mono font-bold shadow-[4px_4px_0px_#000]">
                        ✖ Empty Classified Database: No second-hand Listings fit matching filters.
                      </div>
                    ) : (
                      /* Display ReList Items normally spanning full width in 3-column brutalist grid */
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredRelistItems.map((item) => (
                          <div 
                            key={item.id}
                            onClick={() => { setSelectedDetailItem({ item, source: 'relist' }); setSliderIdx(0); }}
                            className={`bg-white border-3 border-black flex flex-col justify-between overflow-hidden shadow-[5px_5px_0px_rgba(0,0,0,1)] hover:shadow-[9px_9px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all cursor-pointer ${
                              item.isUserListing ? 'bg-[#fffc40]/5 border-[#ff5c00]' : ''
                            }`}
                          >
                            <div>
                              
                              {/* Slanted condition tag badge */}
                              <div className="p-3 bg-slate-50 border-b-2 border-black flex items-center justify-between font-mono text-[10px] text-black flex-wrap gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="bg-black text-white px-1.5 py-0.5 border border-black uppercase font-bold text-[8.5px]">
                                    {item.category}
                                  </span>
                                  <SustainabilityBadge />
                                </div>
                                <div className="flex items-center gap-1.5 font-bold">
                                  <span>Condition:</span>
                                  <span className="font-black bg-[#fffc40] px-1.5 py-0.5 border border-black uppercase text-[9px] text-black">
                                    {item.condition}
                                  </span>
                                </div>
                              </div>

                              {/* Media Canvas */}
                              <div className="h-52 bg-slate-100 flex items-center justify-center p-4 border-b-2 border-black relative">
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  className="max-h-full max-w-full object-cover rounded-sm border border-black/10"
                                />

                                {item.isUserListing && (
                                  <div className="absolute top-3 left-3 bg-[#ff5c00] text-white border-2 border-black font-black text-[9px] px-2 py-0.5 uppercase tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                                    YOUR LISTING
                                  </div>
                                )}

                                {/* Delete handler if owner listing */}
                                {item.isUserListing && (
                                  <button
                                    onClick={(e) => handleDeleteUserListing(item.id, e)}
                                    className="absolute top-3 right-3 bg-white hover:bg-red-50 text-red-650 border-2 border-black p-1.5 transition-colors cursor-pointer"
                                    title="Delete Your Listing"
                                  >
                                    <Trash2 className="w-4 h-4 text-black hover:text-red-650" />
                                  </button>
                                )}
                              </div>

                              {/* Descriptions with big brutal fonts */}
                              <div className="p-5 text-left">
                                <h3 className="font-black text-black text-sm uppercase leading-tight line-clamp-1 block group-hover:underline">
                                  {item.name}
                                </h3>

                                <p className="text-xs text-gray-700 font-medium font-sans mt-2 line-clamp-2 leading-relaxed">
                                  {item.description}
                                </p>

                                <div className="border-t border-dashed border-gray-300 mt-3 pt-3 space-y-1.5 font-mono text-[10px] text-gray-650">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <User className="w-3.5 h-3.5 text-black" />
                                    <span className="flex items-center gap-1">
                                      Listed by: <strong className="text-black font-extrabold">{item.listedBy}</strong>
                                      {item.verifiedSeller && (
                                        <span className="inline-flex items-center gap-0.5 bg-emerald-500 text-white font-mono text-[8px] font-black px-1.5 py-0.5 rounded uppercase leading-none" title="Verified Seller with active Trust Checkmark">
                                          <CheckCircle className="w-2.5 h-2.5 stroke-[3px]" />
                                          <span>Verified</span>
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-[9.5px]">
                                    <span>Owned for: {item.yearsUsed}</span>
                                    <span className="flex items-center gap-0.5 text-black font-bold">
                                      <MapPin className="w-3 h-3 text-red-650" />
                                      {item.location}
                                    </span>
                                  </div>
                                </div>
                              </div>

                            </div>

                            {/* Sticky footer with price and action button */}
                            <div className="p-5 bg-slate-50 border-t-2 border-black">
                              <div className="flex items-end justify-between gap-2 mb-3">
                                <div>
                                  <span className="block text-[8px] text-gray-500 uppercase tracking-widest font-mono">Community Price</span>
                                  <span className="text-lg font-black text-black font-mono">₹{item.askingPrice.toLocaleString('en-IN')}</span>
                                </div>
                                {item.originalPrice > 0 && (
                                  <div className="text-right">
                                    <span className="block text-[8px] text-gray-400 uppercase font-mono">Orig. Price</span>
                                    <span className="text-[10px] text-gray-500 line-through font-mono">₹{item.originalPrice.toLocaleString('en-IN')}</span>
                                  </div>
                                )}
                              </div>

                              {!item.isUserListing ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handlePurchaseRelistItem(item); }}
                                  className="w-full bg-[#fffc40] hover:bg-[#e0de34] text-black border-2 border-black font-black text-xs py-2.5 shadow-[3px_3px_0px_#000] hover:shadow-[5px_5px_0px_#000] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider"
                                >
                                  <ShoppingBag className="w-4 h-4 text-black" />
                                  <span>Add to Cart</span>
                                </button>
                              ) : (
                                <div className="w-full bg-[#ff5c00]/10 border-2 border-[#ff5c00] text-[#ff5c00] font-black text-[10px] py-2 px-1 text-center font-mono uppercase tracking-wider rounded-none">
                                  ✦ ACTIVE classified upload ✦
                                </div>
                              )}
                            </div>

                          </div>
                        ))}
                      </div>
                    )}

                  </motion.div>
                )}

                {/* PAGE 2a: IDENTITY VERIFICATION GATE */}
                {relistPage === 'identity' && (
                  <motion.div
                    key="identity-gate"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-lg mx-auto bg-white border-2 border-black p-6 shadow-[4px_4px_0px_#000]"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <ShieldAlert className="w-5 h-5 text-amzn-orange" />
                      <h2 className="text-lg font-black uppercase">Seller Identity Verification</h2>
                    </div>
                    <p className="text-xs text-gray-600 mb-5">
                      Amazon requires identity verification before you can list products on ReList.
                      Your Aadhaar will be used only for seller accountability — not shared publicly.
                    </p>

                    <div className="space-y-3 mb-5">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Full Name (as on Aadhaar)</label>
                        <input type="text" value={idForm.fullName} onChange={e => setIdForm(p => ({...p, fullName: e.target.value}))}
                          className="w-full border-2 border-black p-2 text-sm font-mono"
                          placeholder="Rahul Mehta" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Aadhaar Number (12 digits)</label>
                        <input type="text" maxLength={12} value={idForm.aadhaar}
                          onChange={e => setIdForm(p => ({...p, aadhaar: e.target.value.replace(/\D/g,'').slice(0,12)}))}
                          className="w-full border-2 border-black p-2 text-sm font-mono"
                          placeholder="1234 5678 9012" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Phone Linked to Aadhaar</label>
                        <input type="text" maxLength={10} value={idForm.phone}
                          onChange={e => setIdForm(p => ({...p, phone: e.target.value.replace(/\D/g,'').slice(0,10)}))}
                          className="w-full border-2 border-black p-2 text-sm font-mono"
                          placeholder="9876543210" />
                      </div>
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input type="checkbox" checked={idForm.confirm}
                          onChange={e => setIdForm(p => ({...p, confirm: e.target.checked}))}
                          className="mt-0.5" />
                        <span className="text-[11px] text-gray-700 leading-relaxed">
                          I confirm this is my real identity. I understand that false information may result in permanent account suspension.
                        </span>
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => setRelistPage('feed')}
                        className="flex-1 bg-gray-100 border-2 border-black text-xs font-bold py-2.5 hover:bg-gray-200 transition-colors">
                        Cancel
                      </button>
                      <button onClick={handleIdentitySubmit}
                        disabled={identityLoading || !idForm.fullName || idForm.aadhaar.length !== 12 || idForm.phone.length !== 10 || !idForm.confirm}
                        className="flex-1 bg-amzn-yellow border-2 border-black text-xs font-bold py-2.5 hover:bg-amzn-orange disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                        {identityLoading ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
                        ) : (
                          'Verify Identity'
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* PAGE 2b: SELLER DECLARATION FORM */}
                {relistPage === 'declaration' && (
                  <motion.div
                    key="declaration-form"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-lg mx-auto bg-white border-2 border-black p-6 shadow-[4px_4px_0px_#000]"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span className="text-[11px] text-emerald-700 font-bold">Identity Verified</span>
                    </div>
                    <h2 className="text-lg font-black uppercase mb-1 mt-1">Seller Declaration</h2>
                    <p className="text-xs text-gray-600 mb-5">
                      Before listing, you must confirm these statements. Your declaration is legally binding
                      and will be recorded with timestamp.
                    </p>

                    <div className="space-y-3 mb-5">
                      {[
                        { key: 'functional' as const, text: 'The product is fully functional — all features work as expected' },
                        { key: 'neverRepaired' as const, text: 'The product has never been repaired or serviced by a third party' },
                        { key: 'noHiddenDefects' as const, text: 'There are no defects beyond what will appear in my uploaded photos' },
                        { key: 'allAccessories' as const, text: 'The product is complete — all original accessories are present' },
                        { key: 'misrepresentation' as const, text: 'I understand that misrepresentation may result in account suspension and chargeback of sale proceeds to Amazon' },
                      ].map(item => (
                        <label key={item.key} className="flex items-start gap-2 cursor-pointer p-2 border-2 border-gray-200 hover:border-black transition-colors">
                          <input type="checkbox" checked={declarationChecked[item.key]}
                            onChange={e => setDeclarationChecked(prev => ({...prev, [item.key]: e.target.checked}))}
                            className="mt-0.5 shrink-0" />
                          <span className="text-[12px] text-gray-800 leading-relaxed">{item.text}</span>
                        </label>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => setRelistPage('feed')}
                        className="flex-1 bg-gray-100 border-2 border-black text-xs font-bold py-2.5 hover:bg-gray-200 transition-colors">
                        Cancel
                      </button>
                      <button onClick={handleDeclarationSubmit}
                        disabled={!allDeclarationChecked}
                        className="flex-1 bg-emerald-500 border-2 border-black text-white text-xs font-bold py-2.5 hover:bg-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                        I Confirm — Continue to Listing
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* PAGE 2: SEPARATE UPLOAD FORM SCREEN (LIST PRODUCT) */}
                {relistPage === 'create-listing' && (
                  <motion.div
                    key="relist-form-page"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="max-w-3xl mx-auto"
                  >
                    
                    {/* Header Return panel */}
                    <div className="bg-white border-3 border-black p-4 mb-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] flex items-center justify-between flex-wrap gap-4 font-sans">
                      <button
                        onClick={() => setRelistPage('feed')}
                        className="bg-white hover:bg-gray-100 text-black border-2 border-black font-extrabold text-xs px-4 py-2 flex items-center gap-1.5 cursor-pointer uppercase tracking-wider transition-all"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Listings Catalog</span>
                      </button>

                      <div className="text-xs font-black text-black uppercase font-mono tracking-widest pl-2">
                        📋 Form page: upload second-hand listings
                      </div>
                    </div>

                    {/* Brutalist upload matrix container */}
                    <div className="bg-white border-3 border-black p-6 shadow-[8px_8px_0px_rgba(0,0,0,1)] text-left">
                      
                      <div className="border-b-3 border-black pb-4 mb-6">
                        <div className="flex items-center gap-2 mb-1">
                          <Coins className="w-5 h-5 text-amber-500" />
                          <h2 className="text-xl font-black uppercase text-black font-mono tracking-wide">
                            Prepare Community classified pitch
                          </h2>
                        </div>
                        <p className="text-xs text-gray-700 font-bold leading-normal">
                          Provide clear specifications. Buyers value transparent ownership history to prevent pickup dispute delays.
                        </p>
                      </div>

                      <form onSubmit={handleAddNewListing} className="space-y-5 text-xs text-left">
                        
                        <div>
                          <label className="block font-black text-black uppercase tracking-wider mb-1.5 font-mono">Product Title Description</label>
                          <input
                            type="text"
                            value={itemName}
                            onChange={(e) => setItemName(e.target.value)}
                            placeholder="e.g. IKEA Ektorp study table (Mint state, scrapeless)"
                            className="w-full bg-white border-2 border-black p-3.5 outline-none font-bold text-black focus:bg-slate-50 text-[13px] placeholder-gray-400"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block font-black text-black uppercase tracking-wider mb-1.5 font-mono">Item Category classification</label>
                            <select
                              value={itemCategory}
                              onChange={(e) => setItemCategory(e.target.value)}
                              className="w-full bg-white border-2 border-black p-3.5 cursor-pointer outline-none font-bold text-black focus:bg-slate-50 text-xs uppercase tracking-wide"
                            >
                              <option value="Home Essentials">🛋️ Home Essentials (Furniture, Decor)</option>
                              <option value="Electronics">📱 Electronics (Gadgets, Tablets, CPU)</option>
                              <option value="Fashion">🧥 Apparel & Fashion</option>
                              <option value="Books">📚 Books & Textbooks</option>
                              <option value="Sports">🚲 Sports Equipment & Gear</option>
                              <option value="Appliances">🔌 Kitchen / Appliances</option>
                            </select>
                          </div>

                          <div>
                            <label className="block font-black text-black uppercase tracking-wider mb-1.5 font-mono">Graded Condition Status</label>
                            <select
                              value={itemCondition}
                              onChange={(e) => setItemCondition(e.target.value)}
                              className="w-full bg-white border-2 border-black p-3.5 cursor-pointer outline-none font-bold text-black focus:bg-slate-50 text-xs uppercase tracking-wide"
                            >
                              <option value="Like New">Like New (Mint / Handled under 1 month)</option>
                              <option value="Very Good">Very Good (Flawless surface arrays)</option>
                              <option value="Good">Good (Shows minor normal wear patterns)</option>
                              <option value="Fair">Fair (Scratches or cosmetic dents but runs fine)</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block font-black text-black uppercase tracking-wider mb-1.5 font-mono">Original MSRP Retail Price (₹)</label>
                            <input
                              type="number"
                              value={itemOriginalPrice}
                              onChange={(e) => setItemOriginalPrice(e.target.value)}
                              placeholder="MSRP original e.g. 5000"
                              className="w-full bg-white border-2 border-black p-3.5 outline-none font-bold text-black focus:bg-slate-50 text-xs"
                            />
                          </div>

                          <div>
                            <label className="block font-black text-black uppercase tracking-wider mb-1.5 font-mono">Asking listing Price (₹)</label>
                            <input
                              type="number"
                              value={itemAskingPrice}
                              onChange={(e) => setItemAskingPrice(e.target.value)}
                              placeholder="Your price e.g. 1900"
                              className="w-full bg-white border-2 border-black p-3.5 border-black outline-none font-black text-black focus:bg-slate-50 text-sm placeholder-gray-450"
                              required
                            />
                          </div>

                          <div>
                            <label className="block font-black text-black uppercase tracking-wider mb-1.5 font-mono">Owned duration / usage time</label>
                            <input
                              type="text"
                              value={itemYearsUsed}
                              onChange={(e) => setItemYearsUsed(e.target.value)}
                              placeholder="e.g. 1.2 Years, 6 months"
                              className="w-full bg-white border-2 border-black p-3.5 outline-none font-bold text-black focus:bg-slate-50 text-xs"
                            />
                          </div>
                        </div>

                        {/* Required Media Upload Section */}
                        <div className="bg-slate-50 border-2 border-black p-4 space-y-4">
                          <div className="flex justify-between items-center">
                            <h3 className="font-mono font-black uppercase text-xs text-black tracking-wider flex items-center gap-1.5">
                              <Camera className="w-4 h-4 text-orange-600" />
                              <span>Upload Product Photos (1–3)</span>
                            </h3>
                            {uploadedImages.length === 0 && (
                              <button
                                type="button"
                                onClick={simulateMediaUpload}
                                className="bg-[#fffc40] hover:bg-[#e0de34] text-black border-2 border-black px-3 py-1 text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0px_#000] cursor-pointer"
                              >
                                📷 Select Photos
                              </button>
                            )}
                          </div>

                          {/* Images grid uploader layout */}
                          <div className="grid grid-cols-3 gap-3">
                            {Array.from({ length: 3 }).map((_, index) => {
                              const imgUrl = uploadedImages[index];
                              return (
                                <div 
                                  key={index}
                                  onClick={!imgUrl ? simulateMediaUpload : undefined}
                                  className={`h-24 border-2 border-dashed border-black flex flex-col items-center justify-center p-1 text-center cursor-pointer bg-white overflow-hidden ${
                                    imgUrl ? 'border-solid border-emerald-500 bg-emerald-50/10' : 'hover:bg-slate-100'
                                  }`}
                                >
                                  {imgUrl ? (
                                    <div className="relative w-full h-full">
                                      <img src={imgUrl} className="w-full h-full object-cover" alt={`Photo ${index + 1}`} />
                                      <span className="absolute bottom-1 right-1 bg-black text-white font-black text-[7.5px] px-1 uppercase leading-none">Photo {index + 1}</span>
                                    </div>
                                  ) : (
                                    <>
                                      <Camera className="w-5 h-5 text-gray-400 mb-1" />
                                      <span className="text-[8px] font-mono leading-none font-bold uppercase text-gray-500">
                                        {uploadedImages.length > 0 ? <>Optional<br/>+ Add photo</> : <>Click to<br/>Upload</>}
                                      </span>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          {uploadedImages.length > 0 && uploadedImages.length < 3 && (
                            <p className="text-[10px] text-emerald-700 font-bold">
                              ✓ {uploadedImages.length} photo{uploadedImages.length > 1 ? 's' : ''} ready — you can add up to {3 - uploadedImages.length} more, or proceed to grading.
                            </p>
                          )}

                          {/* Video uploader layout */}
                          <div>
                            <label className="block font-black text-black uppercase tracking-wider mb-1.5 font-mono text-[10px]">Active Functionality Checking Video</label>
                            {uploadedVideo ? (
                              <div className="border-2 border-emerald-500 bg-emerald-50/10 p-3 flex items-center justify-between text-left">
                                <div className="flex items-center gap-2">
                                  <Video className="w-5 h-5 text-emerald-600 animate-pulse" />
                                  <div>
                                    <p className="font-mono text-xs font-black text-black uppercase">diagnostics_loop.mp4</p>
                                    <p className="text-[9px] text-gray-500">Video uploaded • Standard 12s demo scan integrity</p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setUploadedVideo(null)}
                                  className="text-[9px] text-red-650 hover:underline font-bold uppercase"
                                >
                                  Clear
                                </button>
                              </div>
                            ) : (
                              <div 
                                onClick={simulateMediaUpload}
                                className="border-2 border-dashed border-black p-4 bg-white hover:bg-slate-100 cursor-pointer text-center text-gray-400"
                              >
                                <Video className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                                <span className="text-[10px] font-mono font-bold uppercase">Click or Drag & Drop 1 Verification Video clip</span>
                              </div>
                            )}
                          </div>

                          {/* AI grading trigger — shows once any photo is uploaded */}
                          {uploadedImages.length >= 1 && (
                            <div className="border-t-2 border-black pt-4">
                              {apiGradingError && (
                                <div className="mb-3 bg-red-100 border-2 border-red-500 text-red-700 text-[10px] font-mono font-bold p-2.5 uppercase tracking-wide leading-snug">
                                  ⚠ {apiGradingError}
                                </div>
                              )}
                              {!aiHealthCard ? (
                                <button
                                  type="button"
                                  onClick={triggerAIEvaluation}
                                  disabled={isAnalyzingAI}
                                  className="w-full bg-black text-[#fffc40] border-2 border-black font-black py-2.5 shadow-[3px_3px_0px_#000] hover:shadow-[5px_5px_0px_#000] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all cursor-pointer text-center text-xs uppercase tracking-wide font-mono flex items-center justify-center gap-1.5"
                                >
                                  {isAnalyzingAI ? (
                                    <>
                                      <span className="w-3.5 h-3.5 border-2 border-dashed border-[#fffc40] rounded-full animate-spin" />
                                      <span>Sending to our AI-grader...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="w-4.5 h-4.5" />
                                      <span>Generate Health Card</span>
                                    </>
                                  )}
                                </button>
                              ) : (
                                <div className="bg-black text-white p-4 border-2 border-black relative overflow-hidden text-left">
                                  <div className="absolute top-0 right-0 bg-[#00ff9d] text-black text-[8px] font-black px-2 py-0.5 uppercase tracking-wide rotate-12">
                                    Trusted Diagnosis
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs text-[#fffc40] font-black uppercase font-mono mb-2">
                                    <Sparkles className="w-4 h-4 text-[#fffc40]" />
                                    <span>AI Grader generated Health Card report</span>
                                  </div>

                                  <div className="space-y-2 text-[10.5px] font-mono text-gray-300">
                                    <div className="grid grid-cols-2 gap-2 text-left bg-slate-900 p-2 border border-slate-700">
                                      <div>
                                        <span className="text-[8px] text-gray-400 block uppercase">Functional Score</span>
                                        <span className="text-xs font-black text-[#00ff9d]">{aiHealthCard.score}/100</span>
                                      </div>
                                      <div>
                                        <span className="text-[8px] text-gray-400 block uppercase">Graded Condition</span>
                                        <span className="text-xs font-black text-[#fffc40]">{aiHealthCard.grade}</span>
                                      </div>
                                    </div>
                                    <div className="text-[10px] space-y-1 text-left bg-slate-900/50 p-2 border border-slate-800 leading-tight">
                                      <p><strong className="text-white">FUNCTIONALITY:</strong> {aiHealthCard.functionality}</p>
                                      <p><strong className="text-white">DIAGNOSTICS:</strong> {aiHealthCard.diagnostics}</p>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 border-t border-dashed border-slate-700 pt-2.5 mt-2">
                                      <div>
                                        <span className="text-[8px] text-gray-400 block">AI Valuation suggest:</span>
                                        <span className="text-[#00ff9d] font-black text-sm">₹{aiHealthCard.suggestedPrice.toLocaleString('en-IN')}</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => setItemAskingPrice(String(aiHealthCard.suggestedPrice))}
                                        className="bg-[#00ff9d] hover:bg-[#00d180] text-black text-[9.5px] font-black px-2.5 py-1 uppercase shadow-[2px_2px_0px_white] cursor-pointer"
                                      >
                                        Apply Resale Pricing
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                        {/* ─── Real API Health Card + Review Status ─── */}
                        {apiHealthCard && (
                          <div className="mt-4 space-y-3">
                            <HealthCardView card={apiHealthCard} qrBase64={apiHealthCard.qr_code_base64} />
                            
                            {/* Review status banner */}
                            {apiHealthCard.review_status === 'pending_review' && (
                              <div className="bg-amber-50 border-2 border-amber-400 p-3 text-xs font-bold text-amber-800">
                                Your listing is under review. Our team will verify within 24 hours.
                                {apiHealthCard.review_reason && (
                                  <span className="block text-[11px] font-normal mt-1 text-amber-700">{apiHealthCard.review_reason}</span>
                                )}
                              </div>
                            )}
                            {apiHealthCard.review_status === 'auto_approved' && (
                              <div className="bg-emerald-50 border-2 border-emerald-400 p-3 text-xs font-bold text-emerald-800">
                                Listed successfully! AI confidence: {Math.round(apiHealthCard.confidence * 100)}%.
                                Your declaration has been recorded and is legally binding.
                              </div>
                            )}
                            {apiHealthCard.review_status === 'reviewed_approved' && (
                              <div className="bg-emerald-50 border-2 border-emerald-400 p-3 text-xs font-bold text-emerald-800">
                                Admin approved! Your listing is now live on ReList.
                              </div>
                            )}
                            {apiHealthCard.review_status === 'reviewed_rejected' && (
                              <div className="bg-red-50 border-2 border-red-400 p-3 text-xs font-bold text-red-800">
                                Listing rejected by admin. Reason: {apiHealthCard.review_reason || 'Not specified'}.
                              </div>
                            )}
                          </div>
                        )}
                        </div>

                        <div>
                          <label className="block font-black text-black uppercase tracking-wider mb-1.5 font-mono">Detailed seller remarks & Locker guidelines</label>
                          <textarea
                            rows={4}
                            value={itemDescription}
                            onChange={(e) => setItemDescription(e.target.value)}
                            placeholder="Condition notes, why you are selling, pricing flexibility limits, Noida Sector 62 pickup hand-off details..."
                            className="w-full bg-white border-2 border-black p-3.5 outline-none font-sans font-bold text-black text-xs"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmitListing}
                          className="w-full bg-[#ff5c00] text-white border-3 border-black font-black py-4 select-none shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all cursor-pointer text-center text-xs uppercase tracking-widest font-mono"
                        >
                          {isSubmitListing ? 'Disseminating classified blocks...' : '✦ RELIST ✦'}
                        </button>

                      </form>
                    </div>

                  </motion.div>
                )}

              </AnimatePresence>

            </motion.div>
          )}

          </>
          )}

        </AnimatePresence>
      </div>



    </div>
  );
}
