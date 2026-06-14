import React, { useState } from 'react';
import { Search, MapPin, ShoppingCart, ChevronDown, User, LogOut, X, CreditCard, RotateCcw, Users } from 'lucide-react';
import { UserSession } from '../types';
import { PERSONA_LIST } from '../data/personas';

interface HeaderProps {
  session: UserSession;
  setSession: React.Dispatch<React.SetStateAction<UserSession>>;
  cartCount: number;
  onOpenCart: () => void;
  onOpenSignIn: () => void;
  onOpenAmazonPay: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  onTriggerSearch: () => void;
  onHomeClick: () => void;
  onOpenOrders: () => void;
  onOpenAccount: () => void;
  onOpenMarketplace: () => void;
  onOpenAdmin?: () => void;
  onSwitchPersona: (personaId: string) => void;
}

export default function Header({
  session,
  setSession,
  cartCount,
  onOpenCart,
  onOpenSignIn,
  onOpenAmazonPay,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  onTriggerSearch,
  onHomeClick,
  onOpenOrders,
  onOpenAccount,
  onOpenMarketplace,
  onOpenAdmin,
  onSwitchPersona,
}: HeaderProps) {
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [enteredPincode, setEnteredPincode] = useState(session.pincode);
  const [enteredCity, setEnteredCity] = useState(session.city);
  const [pincodeError, setPincodeError] = useState('');
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showPersonaSwitcher, setShowPersonaSwitcher] = useState(false);

  const handlePincodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPincode.trim().length !== 6 || isNaN(Number(enteredPincode))) {
      setPincodeError('Please enter a valid 6-digit Indian PIN code.');
      return;
    }

    // Map common Indian PIN prefixes to realistic cities
    let detectedCity = 'New Delhi';
    const prefix = enteredPincode.substring(0, 2);
    if (prefix === '4x' || prefix.startsWith('40') || prefix.startsWith('41') || prefix.startsWith('42') || prefix.startsWith('43') || prefix.startsWith('44')) {
      detectedCity = 'Mumbai';
    } else if (prefix.startsWith('56') || prefix.startsWith('57')) {
      detectedCity = 'Bengaluru';
    } else if (prefix.startsWith('60') || prefix.startsWith('61') || prefix.startsWith('62')) {
      detectedCity = 'Chennai';
    } else if (prefix.startsWith('70') || prefix.startsWith('71') || prefix.startsWith('72')) {
      detectedCity = 'Kolkata';
    } else if (prefix.startsWith('50')) {
      detectedCity = 'Hyderabad';
    } else if (prefix.startsWith('11')) {
      detectedCity = 'New Delhi';
    } else if (prefix.startsWith('20') || prefix.startsWith('21')) {
      detectedCity = 'Noida';
    } else if (prefix.startsWith('38') || prefix.startsWith('39')) {
      detectedCity = 'Ahmedabad';
    } else {
      detectedCity = enteredCity.trim() || 'Noida';
    }

    setSession((prev) => ({
      ...prev,
      pincode: enteredPincode,
      city: detectedCity,
    }));
    setPincodeError('');
    setShowLocationModal(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onTriggerSearch();
    }
  };

  const handleLogout = () => {
    setSession({
      isLoggedIn: false,
      name: 'Sign In',
      email: '',
      pincode: '110091',
      city: 'Noida',
    });
    setShowAccountMenu(false);
  };

  const categories = [
    'All',
    'Mobiles',
    'Electronics',
    'Fashion',
    'Computers',
    'Appliances',
    'Home Essentials',
    'Amazon Brands',
  ];

  return (
    <>
      <header className="bg-[#131921] text-white sticky top-0 z-40 select-none">
        {/* Main top bar */}
        <div className="flex items-center justify-between px-3 py-1.5 gap-4">
          
          {/* Logo */}
          <div 
            id="nav-logo"
            onClick={onHomeClick}
            className="flex items-center border border-transparent hover:border-white p-1 cursor-pointer transition-all rounded"
          >
            <div className="flex flex-col leading-none font-sans">
              <span className="text-xl font-bold tracking-tight text-white flex items-baseline">
                amazon<span className="text-amzn-orange text-sm font-semibold">.in</span>
              </span>
              <span className="text-[10px] text-[#ccc] -mt-1 pl-1 font-semibold">Prime</span>
            </div>
          </div>

          {/* Location Delivery Selector */}
          <div 
            id="nav-delivery-selector"
            onClick={() => setShowLocationModal(true)}
            className="hidden md:flex items-center border border-transparent hover:border-white p-1.5 cursor-pointer transition-all rounded gap-1.5 text-left"
          >
            <MapPin className="w-5 h-5 text-white" />
            <div className="flex flex-col leading-tight">
              <span className="text-xs text-[#ccc] font-light">Delivering to {session.city} {session.pincode}</span>
              <span className="text-sm font-bold text-white -mt-0.5">Update location</span>
            </div>
          </div>

          {/* Search Box Bar */}
          <div id="nav-search-bar" className="flex-1 flex items-stretch h-10 rounded overflow-hidden max-w-4xl shadow-inner group focus-within:ring-2 focus-within:ring-amzn-yellow">
            {/* Category Dropdown Selection */}
            <select
              title="Search Category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-[#f3f3f3] text-gray-800 text-xs px-3 border-r border-[#ccc] outline-none cursor-pointer hover:bg-[#eaeaea] text-ellipsis max-w-[130px] font-sans"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Input Search Field */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search Amazon.in"
              className="flex-grow bg-white text-gray-900 px-3 py-2 outline-none text-sm placeholder-gray-500 font-sans"
            />

            {/* Orange Action Magnifying glass Button */}
            <button
              title="Search Action"
              onClick={onTriggerSearch}
              className="bg-amzn-yellow hover:bg-amzn-orange text-gray-900 px-6 cursor-pointer flex items-center justify-center transition-all"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>

          {/* Right Navigation Controls */}
          <div className="flex items-center gap-1.5">
            
            {/* Language Dropdown Selector */}
            <div 
              id="nav-lang-selector"
              onMouseEnter={() => setShowLangMenu(true)}
              onMouseLeave={() => setShowLangMenu(false)}
              className="relative border border-transparent hover:border-white p-2 cursor-pointer transition-all rounded flex items-center gap-1"
            >
              {/* India Flag Icon Representation */}
              <div className="flex items-center gap-1">
                <span className="text-sm">🇮🇳</span>
                <span className="text-sm font-bold text-white">EN</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
              </div>

              {/* Lang Hover Menu */}
              {showLangMenu && (
                <div className="absolute top-[38px] right-0 w-44 bg-white text-gray-800 rounded shadow-xl py-3 px-3 z-50 text-xs font-normal border border-gray-200">
                  <p className="font-bold border-b pb-2 mb-2 text-gray-900">Select language</p>
                  <label className="flex items-center gap-2 mb-2 font-semibold text-[#c45500] cursor-pointer">
                    <input type="radio" defaultChecked name="lang" className="accent-[#c45500]" />
                    <span>English - EN</span>
                  </label>
                  <label className="flex items-center gap-2 mb-2 hover:text-[#c45500] cursor-pointer">
                    <input type="radio" name="lang" className="accent-[#c45500]" />
                    <span>हिन्दी - HI</span>
                  </label>
                  <label className="flex items-center gap-2 mb-2 hover:text-[#c45500] cursor-pointer">
                    <input type="radio" name="lang" className="accent-[#c45500]" />
                    <span>தமிழ் - TA</span>
                  </label>
                  <label className="flex items-center gap-2 mb-2 hover:text-[#c45500] cursor-pointer">
                    <input type="radio" name="lang" className="accent-[#c45500]" />
                    <span>తెలుగు - TE</span>
                  </label>
                  <div className="border-t pt-2 mt-2 flex items-center justify-between text-[11px] text-gray-500">
                    <span>Active Region:</span>
                    <span className="font-bold">India</span>
                  </div>
                </div>
              )}
            </div>

            {/* Account & Lists Selector */}
            <div 
              id="nav-account-selector"
              onMouseEnter={() => setShowAccountMenu(true)}
              onMouseLeave={() => setShowAccountMenu(false)}
              onClick={onOpenAccount}
              className="relative border border-transparent hover:border-white p-2 cursor-pointer transition-all rounded text-left leading-tight"
            >
              <div className="flex flex-col">
                <span className="text-xs text-[#ccc] font-light">Hello, {session.isLoggedIn ? session.name : 'sign in'}</span>
                <span className="text-sm font-bold text-white flex items-center gap-0.5 mt-0.5">
                  Account & Lists
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </span>
              </div>

              {/* Account Dropdown Menu */}
              {showAccountMenu && (
                <div className="absolute top-[38px] right-0 w-64 bg-white text-gray-800 rounded shadow-xl pb-3 pt-4 z-50 border border-gray-200">
                  
                  {!session.isLoggedIn ? (
                    <div className="px-4 pb-3 border-b border-gray-100 flex flex-col items-center">
                      <button 
                        onClick={() => {
                          onOpenSignIn();
                          setShowAccountMenu(false);
                        }}
                        className="w-full text-center bg-amzn-yellow hover:bg-amzn-orange text-gray-900 border border-amber-600/30 rounded py-1.5 text-xs font-semibold shadow-inner cursor-pointer transition-colors"
                      >
                        Sign in
                      </button>
                      <p className="text-[10px] text-gray-600 mt-2">
                        New customer?{' '}
                        <span 
                          onClick={() => {
                            onOpenSignIn();
                            setShowAccountMenu(false);
                          }}
                          className="text-amzn-blue hover:text-amzn-orange hover:underline cursor-pointer"
                        >
                          Start here.
                        </span>
                      </p>
                    </div>
                  ) : (
                    <div className="px-4 pb-2 border-b border-gray-100 mb-2 flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-gray-900">
                        <User className="w-4 h-4 text-amzn-orange" />
                        <span>{session.name}</span>
                      </div>
                      <button 
                        onClick={handleLogout}
                        className="text-red-600 hover:text-red-700 font-semibold flex items-center gap-0.5 self-end p-1 hover:bg-red-50 rounded"
                      >
                        <LogOut className="w-3 h-3" />
                        <span>Logout</span>
                      </button>
                    </div>
                  )}

                  <div className="px-4 pt-2 text-xs flex flex-col gap-2">
                    <p 
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenAccount();
                        setShowAccountMenu(false);
                      }}
                      className="font-bold text-gray-900 text-sm hover:underline hover:text-amber-600 cursor-pointer"
                    >
                      Your Account
                    </p>
                    <div className="grid grid-cols-1 gap-1.5 text-gray-600">
                      <span 
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenAmazonPay();
                          setShowAccountMenu(false);
                        }} 
                        className="hover:text-amber-600 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <CreditCard className="w-3 h-3" /> Amazon Pay Balance
                      </span>
                      <span 
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenOrders();
                          setShowAccountMenu(false);
                        }}
                        className="hover:text-amber-600 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" /> Your Orders
                      </span>
                      <span className="hover:text-amber-600 hover:underline cursor-pointer">Your Wish List</span>
                      <span className="hover:text-amber-600 hover:underline cursor-pointer">Your Recommendations</span>
                      <span 
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenCart();
                          setShowAccountMenu(false);
                        }} 
                        className="hover:text-amber-600 hover:underline cursor-pointer"
                      >
                        Your Shopping Cart
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Marketplace Button */}
            <div 
              id="nav-marketplace-selector"
              onClick={onOpenMarketplace}
              className="border border-transparent hover:border-white p-2 cursor-pointer transition-all rounded leading-tight flex flex-col text-left"
            >
              <span className="text-xs text-[#ccc] font-light">Explore</span>
              <span className="text-sm font-bold text-[#f3a847] mt-0.5 flex items-center gap-1">
                Marketplace
                <span className="bg-red-600 text-[8px] text-white font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse scale-90">new</span>
              </span>
            </div>

            {/* Admin (subtle) */}
            {onOpenAdmin && (
              <div
                onClick={onOpenAdmin}
                className="border border-transparent hover:border-white p-2 cursor-pointer transition-all rounded leading-tight flex flex-col text-left opacity-60 hover:opacity-100"
              >
                <span className="text-[9px] text-gray-500 font-light tracking-wider">INTERNAL</span>
                <span className="text-[11px] font-bold text-gray-400 mt-0.5">Admin</span>
              </div>
            )}

            {/* Persona Switcher — visible when logged in */}
            {session.isLoggedIn && (
              <div
                className="relative"
                onMouseEnter={() => setShowPersonaSwitcher(true)}
                onMouseLeave={() => setShowPersonaSwitcher(false)}
              >
                <button
                  className="border border-transparent hover:border-white p-2 cursor-pointer transition-all rounded leading-tight flex flex-col text-left"
                  title="Switch demo persona"
                >
                  <span className="text-[9px] text-gray-400 font-light tracking-wider">Demo</span>
                  <span className="text-[11px] font-bold text-[#00ff9d] flex items-center gap-0.5 mt-0.5">
                    <Users className="w-3 h-3" /> Persona
                  </span>
                </button>

                {showPersonaSwitcher && (
                  <div className="absolute top-[42px] right-0 w-52 bg-[#1a2332] border border-gray-600 rounded shadow-2xl z-50 p-2">
                    <p className="text-[9px] font-mono font-bold text-gray-400 uppercase px-1 pb-1.5 border-b border-gray-700 mb-1.5 flex items-center gap-1">
                      <Users className="w-3 h-3" /> Switch Persona
                    </p>
                    <div className="grid grid-cols-1 gap-0.5">
                      {PERSONA_LIST.map((p) => {
                        const isActive = session.name === p.label ||
                          session.name.startsWith(p.label.split(' ')[0]);
                        return (
                          <button
                            key={p.id}
                            onClick={() => { onSwitchPersona(p.id); setShowPersonaSwitcher(false); }}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs font-medium cursor-pointer transition-all w-full ${
                              isActive
                                ? 'bg-[#00ff9d]/20 text-[#00ff9d] font-bold'
                                : 'text-gray-300 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <span className="text-sm leading-none">{p.emoji}</span>
                            <div>
                              <span className="block text-[11px] font-bold leading-tight">{p.label}</span>
                              <span className="block text-[9px] text-gray-400 leading-tight">{p.role}</span>
                            </div>
                            {isActive && (
                              <span className="ml-auto text-[8px] bg-[#00ff9d] text-black px-1 font-black rounded">YOU</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Returns & Orders */}
            <div 
              id="nav-orders-selector"
              onClick={onOpenOrders}
              className="border border-transparent hover:border-white p-2 cursor-pointer transition-all rounded leading-tight hidden sm:flex flex-col text-left"
            >
              <span className="text-xs text-[#ccc] font-light">Returns</span>
              <span className="text-sm font-bold text-white mt-0.5">& Orders</span>
            </div>

            {/* Shopping Cart Button with active total Badge */}
            <div 
              id="nav-cart-btn"
              onClick={onOpenCart}
              className="border border-transparent hover:border-white p-2 cursor-pointer transition-all rounded flex items-end gap-1.5 text-left relative"
            >
              <div className="relative">
                <span className="absolute -top-2 left-3 bg-[#131921] px-1 text-sm font-bold text-[#f3a847] leading-none rounded-full border border-transparent">
                  {cartCount}
                </span>
                <ShoppingCart className="w-7 h-7 text-white" />
              </div>
              <span className="text-sm font-extrabold text-white hidden md:inline">Cart</span>
            </div>

          </div>

        </div>
      </header>

      {/* DELIVERY LOCATION POPUP MODAL */}
      {showLocationModal && (
        <div id="location-pincode-modal" className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs select-none">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gray-100 px-6 py-4 flex items-center justify-between border-b">
              <h3 className="text-base font-bold text-gray-900">Choose your delivery location</h3>
              <button 
                onClick={() => setShowLocationModal(false)}
                className="text-gray-500 hover:text-gray-800 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <p className="text-xs text-gray-600 leading-relaxed mb-4">
                Delivery options and delivery speeds may vary for different postcodes. Please provide a valid Indian pincode to confirm current availability.
              </p>

              <form onSubmit={handlePincodeSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Enter a 6-digit Indian PIN code
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={enteredPincode}
                      onChange={(e) => {
                        setEnteredPincode(e.target.value);
                        setPincodeError('');
                      }}
                      placeholder="e.g. 560001 (Bengaluru)"
                      className="border border-gray-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded px-3 py-2 text-sm flex-grow outline-none text-gray-900"
                    />
                    <button
                      type="submit"
                      className="bg-[#f0c14b] hover:bg-[#e7b416] text-gray-900 border border-[#a88734] rounded px-5 text-sm font-semibold shadow hover:shadow-md cursor-pointer transition-all"
                    >
                      Apply
                    </button>
                  </div>
                  {pincodeError && (
                    <p className="text-red-600 text-[11px] mt-1.5 font-medium">{pincodeError}</p>
                  )}
                </div>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-gray-300"></div>
                  <span className="flex-shrink mx-4 text-gray-400 text-xs">Or select location manually</span>
                  <div className="flex-grow border-t border-gray-300"></div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Enter Town / City
                  </label>
                  <input
                    type="text"
                    value={enteredCity}
                    onChange={(e) => setEnteredCity(e.target.value)}
                    placeholder="e.g. Bengaluru, New Delhi"
                    className="w-full border border-gray-400 focus:border-amber-500 rounded px-3 py-2 text-sm outline-none text-gray-900"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSession((prev) => ({ ...prev, city: 'Noida', pincode: '110091' }));
                      setShowLocationModal(false);
                    }}
                    className="flex-1 text-center py-2 text-xs font-semibold text-blue-600 hover:text-orange-600 hover:underline border rounded border-gray-300"
                  >
                    Reset (Noida 110091)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSession((prev) => ({ ...prev, city: 'Mumbai', pincode: '400001' }));
                      setShowLocationModal(false);
                    }}
                    className="flex-1 text-center py-2 text-xs font-semibold text-blue-600 hover:text-orange-600 hover:underline border rounded border-gray-300"
                  >
                    Set Mumbai (400001)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowLocationModal(false)}
                  className="w-full text-center bg-gray-200 hover:bg-gray-300 text-gray-800 rounded py-2 text-xs font-bold border transition-colors cursor-pointer"
                >
                  Done
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
