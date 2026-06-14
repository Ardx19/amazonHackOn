import React, { useState } from 'react';
import { ArrowUp, Star, HelpCircle, ShieldAlert, BadgeInfo } from 'lucide-react';
import Header from './components/Header';
import NavigationBelt from './components/NavigationBelt';
import HeroCarousel from './components/HeroCarousel';
import BentoContainer from './components/BentoContainer';
import SearchResultsView from './components/SearchResultsView';
import ProductDetailModal from './components/ProductDetailModal';
import CartDrawer from './components/CartDrawer';
import MockSignIn from './components/MockSignIn';
import AmazonPayModal from './components/AmazonPayModal';
import YourOrdersView from './components/YourOrdersView';
import YourAccountView from './components/YourAccountView';
import MarketplaceView from './components/MarketplaceView';
import AdminReviewView from './components/AdminReviewView';

import { INITIAL_PRODUCTS } from './data/products';
import { Product, CartItem, UserSession, Order } from './types';

export default function App() {
  // Global States
  const [session, setSession] = useState<UserSession>({
    isLoggedIn: false,
    name: 'Sign In',
    email: '',
    pincode: '110091',
    city: 'Noida',
    isVerifiedSeller: false,
    verifiedPhone: '',
    verifiedIdType: 'Aadhaar Card',
    verifiedIdNum: ''
  });
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState<'landing' | 'search' | 'orders' | 'account' | 'marketplace' | 'admin'>('landing');

  // Shared Relist items state
  const [relistItems, setRelistItems] = useState<any[]>([
    {
      id: 'relist-1',
      name: 'IKEA Ektorp 3-Seater Sofa Set (Linen Grey)',
      category: 'Home Essentials',
      listedBy: 'Aarav Sharma',
      location: 'Sector 15, Noida',
      originalPrice: 38000,
      askingPrice: 11500,
      condition: 'Very Good',
      yearsUsed: '1.5 years',
      imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&auto=format&fit=crop&q=60',
      description: 'Super plush, covers are completely removable and machine washable. Urgent sale due to relocation to Bengaluru!',
      likes: 14,
      isUserListing: false,
      verifiedSeller: true
    },
    {
      id: 'relist-2',
      name: 'Raleigh Detour Hybrid Commuter Bicycle (21 Gears)',
      category: 'Sports',
      listedBy: 'Priya Patel',
      location: 'Indirapuram, Ghaziabad',
      originalPrice: 22500,
      askingPrice: 7900,
      condition: 'Good',
      yearsUsed: '2 years',
      imageUrl: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=400&auto=format&fit=crop&q=60',
      description: 'Shimano Tourney gearset works beautifully. Brand new front tires, minor chain rust. Selling because outgrown.',
      likes: 8,
      isUserListing: false,
      verifiedSeller: false
    },
    {
      id: 'relist-3',
      name: 'Apple iPad Air (4th Generation, 64GB, Sky Blue)',
      category: 'Electronics',
      listedBy: 'Rohan Verma',
      location: 'Sector 62, Noida',
      originalPrice: 54900,
      askingPrice: 23000,
      condition: 'Like New',
      yearsUsed: '8 months',
      imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&auto=format&fit=crop&q=60',
      description: 'Always maintained inside rugged Spigen armor. Scratchless retina panel. Unused original power brick. 92% battery cycle.',
      likes: 29,
      isUserListing: false,
      verifiedSeller: true
    },
    {
      id: 'relist-user-demo',
      name: 'Sony WH-1000XM4 Noise Cancelling Premium Headphones',
      category: 'Electronics',
      listedBy: 'You (Session Seller)',
      location: 'Sector 62, Noida',
      originalPrice: 29990,
      askingPrice: 12500,
      condition: 'Like New',
      yearsUsed: '6 months',
      imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&auto=format&fit=crop&q=60',
      description: 'Excellent condition Sony ANC headphones. Complete original premium leather carry case and gold-plated aux cable. Absolutely no battery degrade.',
      likes: 4,
      isUserListing: true,
      verifiedSeller: false
    }
  ]);
  
  // Initial populated orders + session-tracked list
  const [orders, setOrders] = useState<Order[]>([
    {
      id: 'AMZN-IN-482910',
      orderDate: 'June 12, 2026',
      items: [
        {
          product: INITIAL_PRODUCTS[0],
          quantity: 1,
          selectedColor: 'Jet Black',
          selectedSize: 'Premium Pack',
        }
      ],
      subtotal: INITIAL_PRODUCTS[0].price,
      paymentMethod: 'Amazon Pay Balance',
      shippingAddress: 'Sector 62, Noida, Uttar Pradesh, 201301',
      status: 'Delivered',
      expectedDelivery: 'Delivered Yesterday',
    }
  ]);
  
  // Triggers/Modals
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeModal, setActiveModal] = useState<'signin' | 'pay' | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(2500);

  // Computed Cart Quantities
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // Session-bound placement tracker
  const handlePlaceOrder = (items: CartItem[], amount: number, paymentMethod: string, address: string, orderId: string) => {
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    
    const deliveryDate = new Date();
    deliveryDate.setDate(today.getDate() + 2);
    const formattedDelivery = deliveryDate.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });

    const newOrder: Order = {
      id: orderId,
      orderDate: formattedDate,
      items: [...items],
      subtotal: amount,
      paymentMethod,
      shippingAddress: address,
      status: 'Preparing',
      expectedDelivery: formattedDelivery,
    };

    setOrders((prev) => [newOrder, ...prev]);

    if (paymentMethod.toLowerCase().includes('balance') || paymentMethod.toLowerCase().includes('pay')) {
      setWalletBalance((prev) => Math.max(0, prev - amount));
    }
  };

  const handleReturnReplace = (
    orderId: string,
    status: 'Returned' | 'Return Requested' | 'Replacement In-Transit',
    refundAmount?: number
  ) => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          return {
            ...ord,
            status,
            expectedDelivery: status === 'Returned' ? 'Refund Credited to Wallet' : 'Arriving Tuesday (Expedited)',
          };
        }
        return ord;
      })
    );
    if (refundAmount && refundAmount > 0) {
      setWalletBalance((prev) => prev + refundAmount);
    }
  };

  // Cart operations
  const handleAddToCart = (product: Product, color?: string, size?: string) => {
    setCartItems((prev) => {
      const existingIdx = prev.findIndex((item) => item.product.id === product.id);
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        return updated;
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          selectedColor: color || 'Classic Silver',
          selectedSize: size || 'Standard Fit',
        },
      ];
    });
  };

  const handleUpdateQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(productId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: newQty } : item
      )
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  // Auth Operations
  const handleLoginSuccess = (name: string, email: string) => {
    setSession((prev) => ({
      ...prev,
      isLoggedIn: true,
      name,
      email,
    }));
  };

  // Search Flow Actions
  const handleTriggerSearch = () => {
    setActiveSearchQuery(searchQuery);
    setCurrentView('search');
  };

  const handleSelectBeltCategory = (category: string) => {
    if (category === 'All') {
      setSelectedCategory('All');
      setActiveSearchQuery('');
      setCurrentView('landing');
    } else {
      setSelectedCategory(category);
      setActiveSearchQuery(category);
      setCurrentView('search');
    }
  };

  const handleExploreCategory = (categoryKey: string) => {
    const matchingProduct = INITIAL_PRODUCTS.find((p) => p.categoryKey === categoryKey);
    const categoryName = matchingProduct?.category || 'Appliances';
    setSelectedCategory(categoryName);
    setActiveSearchQuery(categoryName);
    setCurrentView('search');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleHomeClick = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setActiveSearchQuery('');
    setCurrentView('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="bg-gray-100 min-h-screen text-gray-800 flex flex-col justify-between font-sans antialiased">
      
      {/* 1. Header Navigation elements */}
      <div className="flex flex-col">
        <Header
          session={session}
          setSession={setSession}
          cartCount={cartCount}
          onOpenCart={() => setCartOpen(true)}
          onOpenSignIn={() => setActiveModal('signin')}
          onOpenAmazonPay={() => setActiveModal('pay')}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          onTriggerSearch={handleTriggerSearch}
          onHomeClick={handleHomeClick}
          onOpenOrders={() => setCurrentView('orders')}
          onOpenAccount={() => setCurrentView('account')}
          onOpenMarketplace={() => setCurrentView('marketplace')}
          onOpenAdmin={() => setCurrentView('admin')}
        />

        {/* 2. Secondary Navigation category band */}
        <NavigationBelt
          session={session}
          onOpenAmazonPay={() => setActiveModal('pay')}
          onSelectCategory={handleSelectBeltCategory}
          onOpenSignIn={() => setActiveModal('signin')}
          onOpenCart={() => setCartOpen(true)}
          onOpenOrders={() => setCurrentView('orders')}
          onOpenAccount={() => setCurrentView('account')}
          onOpenMarketplace={() => setCurrentView('marketplace')}
        />
      </div>

      {/* 3. Main Body Canvas */}
      <main className="flex-grow">
        {currentView === 'search' ? (
          /* Search results listing page */
          <SearchResultsView
            products={INITIAL_PRODUCTS}
            searchQuery={activeSearchQuery}
            selectedCategory={selectedCategory}
            onSelectProduct={setSelectedProduct}
            onAddToCart={(prod) => handleAddToCart(prod)}
          />
        ) : currentView === 'orders' ? (
          /* Orders history listing view portal */
          <YourOrdersView
            orders={orders}
            onAddToCart={handleAddToCart}
            onGoHome={() => setCurrentView('account')}
            onReturnReplace={handleReturnReplace}
          />
        ) : currentView === 'account' ? (
          /* Account detailed profile configuration view portal */
          <YourAccountView
            session={session}
            setSession={setSession}
            ordersCount={orders.length}
            walletBalance={walletBalance}
            onViewOrders={() => setCurrentView('orders')}
            onOpenAmazonPay={() => setActiveModal('pay')}
            onOpenSignIn={() => setActiveModal('signin')}
            onOpenMarketplace={() => setCurrentView('marketplace')}
            relistItems={relistItems}
            setRelistItems={setRelistItems}
          />
        ) : currentView === 'marketplace' ? (
          /* High-fidelity full screen Marketplace View */
          <MarketplaceView
            onAddToCart={(prod) => handleAddToCart(prod)}
            onGoHome={() => setCurrentView('landing')}
            session={session}
            relistItems={relistItems}
            setRelistItems={setRelistItems}
          />
        ) : currentView === 'admin' ? (
          /* Internal Admin Review Queue */
          <AdminReviewView />
        ) : (
          /* Landing page index: Slides, grids, categorizers */
          <>
            <HeroCarousel onBannerAction={handleSelectBeltCategory} />
            <BentoContainer
              products={INITIAL_PRODUCTS}
              onSelectProduct={setSelectedProduct}
              onExploreCategory={handleExploreCategory}
            />
            
            {/* Trust Banner Promo */}
            <div className="bg-[#121921] text-white py-12 px-6 shadow-inner tracking-wide border-t border-gray-800 select-none">
              <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
                <div className="flex items-center gap-4 flex-col md:flex-row">
                  <div className="p-3.5 bg-white/10 rounded-full text-amber-500">
                    <Star className="w-8 h-8 fill-current" />
                  </div>
                  <div>
                    <h4 className="text-lg font-extrabold text-amzn-orange">Complete Amazon India shopping experience</h4>
                    <p className="text-xs text-gray-400 mt-1 max-w-xl leading-relaxed font-sans">
                      Enjoy guaranteed high speed shipping slots, customized delivery settings to Noida, interactive wallet balance recharges, and secure checkout receipts across our localized clone.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleHomeClick}
                  className="bg-amzn-yellow hover:bg-amzn-orange text-gray-950 font-extrabold text-xs px-6 py-3 rounded-md shadow-md active:scale-95 transition-all text-center shrink-0 cursor-pointer"
                >
                  Explore Catalog
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* 4. Complete, high-fidelity Amazon Footer */}
      <footer className="bg-[#232f3e] text-white pt-0 select-none border-t border-gray-800 mt-12 shrink-0">
        
        {/* Back to top banner */}
        <button
          onClick={handleBackToTop}
          className="w-full text-center bg-[#37475a] hover:bg-[#485769] transition-colors py-3.5 text-xs text-[#ddd] font-semibold hover:text-white flex items-center justify-center gap-1.5 cursor-pointer border-b border-gray-700/50"
        >
          <ArrowUp className="w-4 h-4" />
          <span>Back to top</span>
        </button>

        {/* Footer Link directory */}
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-xs text-[#ddd] font-normal leading-relaxed">
          <div>
            <h5 className="font-bold text-white text-sm mb-3.5 tracking-wide">Get to Know Us</h5>
            <ul className="space-y-2 text-[11px] font-medium text-gray-300">
              <li className="hover:underline cursor-pointer">About Us</li>
              <li className="hover:underline cursor-pointer">Careers</li>
              <li className="hover:underline cursor-pointer">Press Releases</li>
              <li className="hover:underline cursor-pointer">Amazon Science</li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-white text-sm mb-3.5 tracking-wide">Connect with Us</h5>
            <ul className="space-y-2 text-[11px] font-medium text-gray-300">
              <li className="hover:underline cursor-pointer">Facebook</li>
              <li className="hover:underline cursor-pointer">Twitter</li>
              <li className="hover:underline cursor-pointer">Instagram</li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-white text-sm mb-3.5 tracking-wide">Make Money with Us</h5>
            <ul className="space-y-2 text-[11px] font-medium text-gray-300">
              <li className="hover:underline cursor-pointer">Sell on Amazon</li>
              <li className="hover:underline cursor-pointer">Sell under Amazon Accelerator</li>
              <li className="hover:underline cursor-pointer">Protect and Build Your Brand</li>
              <li className="hover:underline cursor-pointer">Amazon Global Selling</li>
              <li className="hover:underline cursor-pointer">Become an Affiliate</li>
              <li className="hover:underline cursor-pointer">Fulfillment by Amazon</li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-white text-sm mb-3.5 tracking-wide">Let Us Help You</h5>
            <ul className="space-y-2 text-[11px] font-medium text-gray-300">
              <li className="hover:underline cursor-pointer">COVID-19 and Amazon</li>
              <li onClick={() => { setCurrentView('account'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:underline cursor-pointer">Your Account</li>
              <li onClick={() => { setCurrentView('orders'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:underline cursor-pointer">Returns Centre</li>
              <li className="hover:underline cursor-pointer">100% Purchase Protection</li>
              <li className="hover:underline cursor-pointer">Amazon App Download</li>
              <li className="hover:underline cursor-pointer">Help</li>
            </ul>
          </div>
        </div>

        {/* Amazon Global Links */}
        <div className="border-t border-gray-700/60 py-8 text-center bg-[#131a22]">
          <div className="max-w-4xl mx-auto px-6 flex flex-col items-center gap-4 text-xs font-normal text-gray-400">
            {/* Centers Logo */}
            <span className="text-lg font-bold text-white tracking-tight cursor-pointer font-sans" onClick={handleHomeClick}>
              amazon<span className="text-amzn-orange text-xs font-medium">.in</span>
            </span>
            <div className="flex flex-wrap justify-center gap-2.5 text-[10px] text-gray-300">
              <span>Australia</span>
              <span>Brazil</span>
              <span>Canada</span>
              <span>China</span>
              <span>France</span>
              <span>Germany</span>
              <span>Italy</span>
              <span>Japan</span>
              <span>Mexico</span>
              <span>Netherlands</span>
              <span>Poland</span>
              <span>Singapore</span>
              <span>Spain</span>
              <span>Turkey</span>
              <span>United Kingdom</span>
              <span>United States</span>
            </div>
            <p className="text-[10.5px] text-gray-500 leading-normal max-w-2xl mt-2 font-light">
              Conditions of Use & Sale · Privacy Notice · Interest-Based Ads
              <br />
              © 2013-2026, Amazon.com, Inc. or its affiliates. UI replica simulated lovingly for creative portfolios.
            </p>
          </div>
        </div>

      </footer>

      {/* --- ALL INTERACTIVE POPUPS MODALS DRAWERS --- */}

      {/* 1. SHOPPING PRODUCT DETAIL MODAL */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* 2. CORE CUSTOMER AUTH SECURE DIALOG */}
      {activeModal === 'signin' && (
        <MockSignIn
          onClose={() => setActiveModal(null)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {/* 3. MOBILE AMAZON PAY WALLET AND RECHARGE SERVICES */}
      {activeModal === 'pay' && (
        <AmazonPayModal
          onClose={() => setActiveModal(null)}
          walletBalance={walletBalance}
          setWalletBalance={setWalletBalance}
        />
      )}

      {/* 4. CHECKOUT BASKET SLIDER DRAWER */}
      {cartOpen && (
        <CartDrawer
          cartItems={cartItems}
          onClose={() => setCartOpen(false)}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onClearCart={handleClearCart}
          onPlaceOrder={handlePlaceOrder}
        />
      )}

    </div>
  );
}
