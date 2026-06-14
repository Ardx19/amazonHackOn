import React, { useState } from 'react';
import { 
  CreditCard, Package, User, MapPin, Shield, Star, Award, 
  Mail, Phone, Edit3, Key, Check, ShoppingBag, ArrowLeft, 
  Trash2, Camera, Sparkles, ShieldCheck, CheckCircle, Video, Eye, Edit2 
} from 'lucide-react';
import { UserSession } from '../types';

interface YourAccountViewProps {
  session: UserSession;
  setSession: React.Dispatch<React.SetStateAction<UserSession>>;
  ordersCount: number;
  walletBalance: number;
  onViewOrders: () => void;
  onOpenAmazonPay: () => void;
  onOpenSignIn: () => void;
  onOpenMarketplace: () => void;
  onOpenMarketplaceRelist: () => void;
  relistItems: any[];
  setRelistItems: React.Dispatch<React.SetStateAction<any[]>>;
}

export default function YourAccountView({
  session,
  setSession,
  ordersCount,
  walletBalance,
  onViewOrders,
  onOpenAmazonPay,
  onOpenSignIn,
  onOpenMarketplace,
  onOpenMarketplaceRelist,
  relistItems,
  setRelistItems,
}: YourAccountViewProps) {
  // Navigation tab state inside Account View: 'main' dashboard vs 'listings' catalog vs 'listing-detail'
  const [accountSubView, setAccountSubView] = useState<'main' | 'listings' | 'detail'>('main');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  
  // Profile editing
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(session.name);
  const [profileEmail, setProfileEmail] = useState(session.email);
  const [profilePincode, setProfilePincode] = useState(session.pincode);
  const [profileCity, setProfileCity] = useState(session.city);
  const [showStatusText, setShowStatusText] = useState(false);

  // Verified Seller Form status
  const [govPhone, setGovPhone] = useState(session.verifiedPhone || '');
  const [govIdType, setGovIdType] = useState(session.verifiedIdType || 'Aadhaar Card');
  const [govIdNum, setGovIdNum] = useState(session.verifiedIdNum || '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifError, setVerifError] = useState('');
  const [showVerifToast, setShowVerifToast] = useState(false);

  // Listing editor form states
  const [isEditingListing, setIsEditingListing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editOrigPrice, setEditOrigPrice] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCondition, setEditCondition] = useState('Very Good');
  const [editYears, setEditYears] = useState('1 year');
  const [editCategory, setEditCategory] = useState('Home Essentials');

  const userListings = relistItems.filter(item => item.isUserListing);

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSession((prev) => ({
      ...prev,
      name: profileName || 'Customer',
      email: profileEmail,
      pincode: profilePincode || '110091',
      city: profileCity || 'Noida',
    }));
    setIsEditingProfile(false);
    setShowStatusText(true);
    setTimeout(() => setShowStatusText(false), 2500);
  };

  // Trigger simulated ID scan & Verification
  const handleVerifySeller = (e: React.FormEvent) => {
    e.preventDefault();
    if (govPhone.trim().length < 10) {
      setVerifError('Please enter a valid 10-digit Indian phone number.');
      return;
    }
    if (govIdNum.trim().length < 6) {
      setVerifError('Please enter a valid document identifier.');
      return;
    }

    setVerifError('');
    setIsVerifying(true);

    // Simulate OCR Scan & Escrow Trust Verification Process (Takes 1.5 seconds)
    setTimeout(() => {
      setSession(prev => ({
        ...prev,
        isVerifiedSeller: true,
        verifiedPhone: govPhone,
        verifiedIdType: govIdType,
        verifiedIdNum: govIdNum
      }));
      
      // Retroactively verify any listings this user has loaded on the feed!
      setRelistItems(prev => prev.map(item => {
        if (item.isUserListing) {
          return { ...item, verifiedSeller: true };
        }
        return item;
      }));

      setIsVerifying(false);
      setShowVerifToast(true);
      setTimeout(() => setShowVerifToast(false), 4000);
    }, 1500);
  };

  const handleOpenListingDetail = (item: any) => {
    setSelectedItem(item);
    setAccountSubView('detail');
    setIsEditingListing(false);
    // Bind editor states
    setEditName(item.name);
    setEditPrice(String(item.askingPrice));
    setEditOrigPrice(String(item.originalPrice));
    setEditDesc(item.description);
    setEditCondition(item.condition);
    setEditYears(item.yearsUsed);
    setEditCategory(item.category);
  };

  const handleSaveListingChanges = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    const priceNum = Number(editPrice) || 0;
    const origPriceNum = Number(editOrigPrice) || 0;

    const updatedItem = {
      ...selectedItem,
      name: editName,
      askingPrice: priceNum,
      originalPrice: origPriceNum,
      description: editDesc,
      condition: editCondition,
      yearsUsed: editYears,
      category: editCategory
    };

    // Update inside relistItems array
    setRelistItems(prev => prev.map(item => item.id === selectedItem.id ? updatedItem : item));
    setSelectedItem(updatedItem);
    setIsEditingListing(false);
  };

  const handleDeleteListingItem = (id: string) => {
    if (confirm('Are you sure you want to delete this listing from Amazon Marketplace?')) {
      setRelistItems(prev => prev.filter(item => item.id !== id));
      setSelectedItem(null);
      setAccountSubView('listings');
    }
  };

  return (
    <div id="your-account-tab-view" className="max-w-4xl mx-auto px-4 py-8 select-none">
      
      {/* BRAND NEW TOAST BANNERS */}
      {showVerifToast && (
        <div className="bg-gradient-to-r from-emerald-600 to-green-600 text-white p-4 border-2 border-black rounded shadow-[4px_4px_0px_#000] mb-6 flex items-center justify-between text-left animate-bounce">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-[#00ff9d]" />
            <div>
              <p className="font-extrabold uppercase text-xs tracking-wider">Verification Complete!</p>
              <p className="text-[10px] text-emerald-100">Your Noida verification proof was verified successfully. A "Trust Checkmark" badge is now active next to your seller profile!</p>
            </div>
          </div>
          <span className="bg-black text-[#00ff9d] text-[9px] font-mono px-2 py-1 uppercase font-black">Escrow Passed</span>
        </div>
      )}

      {/* VIEWPORT HEADER ROUTER */}
      <div className="flex justify-between items-center border-b pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-905 select-none font-sans">
            {accountSubView === 'main' ? 'Your Account' : accountSubView === 'listings' ? 'Your Listings on Marketplace' : 'Listing Detailed Information'}
          </h1>
          <p className="text-xs text-gray-400 font-medium">
            {accountSubView === 'main' && 'Manage order histories, seller trust credentials, and list properties.'}
            {accountSubView === 'listings' && 'Review classified advertisements, check unboxed buyer proposals, or modify prices.'}
            {accountSubView === 'detail' && 'Product dashboard and condition rating checklist for peer-to-peer Noida secure swaps.'}
          </p>
        </div>

        {accountSubView !== 'main' && (
          <button
            onClick={() => {
              if (accountSubView === 'detail') {
                setAccountSubView('listings');
              } else {
                setAccountSubView('main');
              }
            }}
            className="flex items-center gap-1 bg-white hover:bg-gray-50 border border-gray-300 py-1.5 px-3 text-xs font-bold text-gray-700 shadow-sm cursor-pointer rounded"
          >
            <ArrowLeft className="w-4 h-4 text-gray-550" />
            <span>Go Back</span>
          </button>
        )}
      </div>

      {/* ==================================== VIEWPORT 1: MAIN PROFILE LANDING ==================================== */}
      {accountSubView === 'main' && (
        <div className="space-y-6">

          {/* Success profile update banner */}
          {showStatusText && (
            <div className="bg-emerald-50 text-emerald-800 border-l-4 border-emerald-500 p-3.5 text-xs font-semibold rounded-r shadow-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 stroke-[3px]" />
              <span>Profile configuration updated successfully and applied across current session.</span>
            </div>
          )}

          {/* Expanded Bento Grid with 5 actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            
            {/* Card 1: Your Orders */}
            <div 
              onClick={onViewOrders}
              className="bg-white border hover:bg-gray-50/50 p-5 rounded-lg shadow-xs cursor-pointer hover:border-gray-350 transition-all flex gap-4 text-left group"
            >
              <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amzn-orange shrink-0">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-gray-950 group-hover:text-amber-600">Your Orders</h3>
                <p className="text-xs text-gray-500 mt-1 leading-normal font-medium">
                  Track, return or replace products. Status: <span className="font-bold text-gray-800">{ordersCount} placed</span>
                </p>
              </div>
            </div>

            {/* Card 2: Amazon Pay Balance */}
            <div 
              onClick={onOpenAmazonPay}
              className="bg-white border hover:bg-gray-50/50 p-5 rounded-lg shadow-xs cursor-pointer hover:border-gray-350 transition-all flex gap-4 text-left group"
            >
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 shrink-0">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-gray-950 group-hover:text-emerald-700">Amazon Pay</h3>
                <p className="text-xs text-gray-500 mt-1 leading-normal font-medium">
                  Add funds or recharge mobile. Balance: <span className="font-bold text-gray-950">₹{walletBalance}</span>
                </p>
              </div>
            </div>

            {/* Card 3: Your Listings on Marketplace (NEW CRITICAL FLOW) */}
            <div 
              onClick={() => setAccountSubView('listings')}
              className="bg-white border-2 border-dashed border-amber-500 hover:border-amber-650 hover:bg-amber-50/15 p-5 rounded-lg shadow-xs cursor-pointer transition-all flex gap-4 text-left group"
            >
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 shrink-0 ring-2 ring-amber-500/10">
                <ShoppingBag className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-gray-950 group-hover:text-amber-600 flex items-center gap-1">
                  <span>Your Listings</span>
                  <span className="bg-amber-100 text-[8px] text-amber-800 font-mono px-1.5 py-0.5 rounded uppercase leading-none font-bold">Manage</span>
                </h3>
                <p className="text-xs text-gray-500 mt-1 leading-normal font-medium">
                  See, edit or clear items you listed. Active: <span className="text-amber-600 font-extrabold">{userListings.length} product{userListings.length === 1 ? '' : 's'}</span>
                </p>
              </div>
            </div>

            {/* Card 4: Open Marketplace */}
            <div 
              onClick={onOpenMarketplace}
              className="bg-white border hover:bg-emerald-50/10 p-5 rounded-lg shadow-xs cursor-pointer hover:border-emerald-450 transition-all flex gap-4 text-left group"
            >
              <div className="w-12 h-12 bg-emerald-550/10 rounded-full flex items-center justify-center text-emerald-600 shrink-0 ring-1 ring-emerald-500/10">
                <ShoppingBag className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-gray-950 group-hover:text-emerald-600 flex items-center gap-1.5">
                  Marketplace Hub
                  <span className="bg-emerald-500 text-[8px] text-white px-1 py-0.5 rounded leading-none uppercase">free</span>
                </h3>
                <p className="text-xs text-gray-500 mt-1 leading-normal font-medium">
                  Browse hot liquidations in <span className="text-emerald-600 font-bold font-sans">Float</span> & unboxed <span className="text-amber-650 font-bold font-sans">ReList</span>!
                </p>
              </div>
            </div>

            {/* Card 5: Prime Benefits */}
            <div className="bg-white border p-5 rounded-lg shadow-xs flex gap-4 text-left cursor-default sm:col-span-2 lg:col-span-1">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-gray-950">Prime Benefits</h3>
                <p className="text-xs text-gray-500 mt-1 leading-normal font-medium">
                  Status: <span className="text-blue-600 font-extrabold">Active Prime</span> · Instant Noida locker access granted automatically.
                </p>
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Login Profiles */}
            <div className="lg:col-span-2 bg-white rounded-lg border shadow-xs p-6 text-left">
              <div className="flex items-center justify-between border-b pb-3 mb-5">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-650" />
                  <h2 className="text-base font-extrabold text-gray-900">Login & Security Profile</h2>
                </div>
                {!isEditingProfile && (
                  <button
                    onClick={() => {
                      setProfileName(session.name);
                      setProfileEmail(session.email);
                      setProfilePincode(session.pincode);
                      setProfileCity(session.city);
                      setIsEditingProfile(true);
                    }}
                    className="text-xs text-amzn-blue hover:text-amzn-orange font-bold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>
                )}
              </div>

              {isEditingProfile ? (
                <form onSubmit={handleProfileSave} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-750 mb-1">Your Name</label>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="w-full border border-gray-350 focus:border-amzn-orange focus:ring-1 focus:ring-amzn-orange rounded px-3 py-1.5 text-xs outline-none text-gray-900 font-sans"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-750 mb-1">Email Address</label>
                      <input
                        type="email"
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        className="w-full border border-gray-350 focus:border-amzn-orange focus:ring-1 focus:ring-amzn-orange rounded px-3 py-1.5 text-xs outline-none text-gray-900 font-sans"
                        placeholder="e.g. name@domain.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-750 mb-1">Postal Pincode</label>
                      <input
                        type="text"
                        maxLength={6}
                        value={profilePincode}
                        onChange={(e) => setProfilePincode(e.target.value)}
                        className="w-full border border-gray-350 focus:border-amzn-orange focus:ring-1 focus:ring-amzn-orange rounded px-3 py-1.5 text-xs outline-none text-gray-900 font-sans"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-750 mb-1">State / Town</label>
                      <input
                        type="text"
                        value={profileCity}
                        onChange={(e) => setProfileCity(e.target.value)}
                        className="w-full border border-gray-350 focus:border-amzn-orange focus:ring-1 focus:ring-amzn-orange rounded px-3 py-1.5 text-xs outline-none text-gray-900 font-sans"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-3.5 border-t">
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="px-4 py-2 text-xs font-bold text-gray-750 bg-gray-100 hover:bg-gray-150 rounded border cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-amzn-yellow hover:bg-amzn-orange text-xs font-bold text-gray-950 rounded border border-amber-600/30 shadow transition-colors cursor-pointer"
                    >
                      Save Profile changes
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-8 text-xs text-gray-650">
                  <div className="flex gap-2.5">
                    <div className="p-2 bg-gray-50 border rounded text-gray-400">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block font-bold text-gray-900 text-[10px] uppercase">DisplayName</span>
                      <span className="text-gray-950 text-xs font-semibold">{session.name}</span>
                    </div>
                  </div>

                  <div className="flex gap-2.5">
                    <div className="p-2 bg-gray-50 border rounded text-gray-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block font-bold text-gray-900 text-[10px] uppercase">Registered Email</span>
                      <span className="text-gray-950 text-xs font-semibold">{session.email || 'No email associated'}</span>
                    </div>
                  </div>

                  <div className="flex gap-2.5">
                    <div className="p-2 bg-gray-50 border rounded text-gray-400">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block font-bold text-gray-900 text-[10px] uppercase">Delivery Area</span>
                      <span className="text-gray-950 text-xs font-semibold">{session.pincode} ({session.city})</span>
                    </div>
                  </div>

                  <div className="flex gap-2.5">
                    <div className="p-2 bg-gray-50 border rounded text-gray-400">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block font-bold text-gray-900 text-[10px] uppercase">Session Security</span>
                      <span className={`text-xs font-bold ${session.isLoggedIn ? 'text-green-700' : 'text-amber-600'}`}>
                        {session.isLoggedIn ? 'Logged in securely' : 'Guest mode demo'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Verified Seller & Trust badge submitter */}
            <div className="space-y-6">
              
              {/* Trust verification Card */}
              <div className="bg-white rounded-lg border-2 border-slate-900 p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)] text-left flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start gap-1 pb-3 mb-4 border-b">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-5 h-5 text-amber-500" />
                      <h3 className="font-mono text-xs font-black uppercase text-gray-900 tracking-wider">
                        Seller Trust Verification
                      </h3>
                    </div>
                    <span className={`text-[9px] font-mono uppercase font-black px-1.5 py-0.5 border ${session.isVerifiedSeller ? 'bg-emerald-50 text-emerald-800 border-emerald-500' : 'bg-red-50 text-red-800 border-red-500'}`}>
                      {session.isVerifiedSeller ? '✓ Verified' : 'Missing ID'}
                    </span>
                  </div>

                  {session.isVerifiedSeller ? (
                    <div className="space-y-3 font-sans font-medium text-xs text-slate-700">
                      <div className="bg-emerald-50 border border-emerald-250 p-3 rounded text-[11px] flex items-start gap-1.5 text-emerald-900 leading-normal">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Verified Trust Badge Active</p>
                          <p>Your listings on Noida marketplace will immediately showcase the <strong>Trust Checkmark Badge</strong> next to your username to increase buyer faith.</p>
                        </div>
                      </div>

                      <div className="text-[10.5px] font-mono space-y-1 bg-slate-50 p-2.5 border rounded">
                        <div className="flex justify-between">
                          <span className="text-gray-455">ID PROOF TYPE:</span>
                          <span className="text-gray-900 font-bold">{session.verifiedIdType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-455">DOCUMENT IDENTIFIER:</span>
                          <span className="text-gray-900 font-bold">{session.verifiedIdNum && session.verifiedIdNum.slice(0, 4) + ' - XXXX - ' + session.verifiedIdNum.slice(-4)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-455">VERIFIED PHONE:</span>
                          <span className="text-gray-900 font-bold">+91 {session.verifiedPhone}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to revoke your Seller ID verification proof?')) {
                            setSession(prev => ({
                              ...prev,
                              isVerifiedSeller: false,
                              verifiedPhone: '',
                              verifiedIdNum: ''
                            }));
                            setRelistItems(prev => prev.map(item => {
                              if (item.isUserListing) {
                                return { ...item, verifiedSeller: false };
                              }
                              return item;
                            }));
                          }
                        }}
                        className="w-full text-center text-[10px] text-red-650 font-mono hover:underline uppercase block tracking-wider"
                      >
                        Revoke ID Proof
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleVerifySeller} className="space-y-3">
                      <p className="text-[10.5px] leading-relaxed text-gray-500 font-sans font-medium">
                        Verification requires active document check. Submit your government proof to display the <strong>Trust Checkmark</strong>.
                      </p>

                      {verifError && (
                        <p className="text-[10px] text-red-600 font-mono font-bold uppercase">{verifError}</p>
                      )}

                      <div className="space-y-2">
                        <div>
                          <label className="block text-[9px] font-bold text-gray-700 uppercase mb-1">Phone Number (10 digit)</label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1.5 text-xs text-gray-400 font-mono">+91</span>
                            <input
                              type="text"
                              maxLength={10}
                              value={govPhone}
                              onChange={(e) => setGovPhone(e.target.value.replace(/\D/g, ''))}
                              placeholder="9999900000"
                              className="w-full pl-11 pr-2.5 py-1 text-xs border border-gray-350 focus:border-red-400 focus:ring-1 focus:ring-amber-500 outline-none rounded font-mono"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-gray-700 uppercase mb-1">Government ID Type</label>
                          <select
                            value={govIdType}
                            onChange={(e) => setGovIdType(e.target.value)}
                            className="w-full px-2.5 py-1 text-xs border border-gray-350 focus:border-red-400 outline-none rounded bg-white text-gray-800"
                          >
                            <option value="Aadhaar Card">Aadhaar Card (12-digit)</option>
                            <option value="PAN Card">PAN Card (Alphanumeric)</option>
                            <option value="Passport">Indian Passport</option>
                            <option value="Driving License">Driving License</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-gray-700 uppercase mb-1">Document proof ID Number</label>
                          <input
                            type="text"
                            value={govIdNum}
                            onChange={(e) => setGovIdNum(e.target.value)}
                            placeholder={govIdType === 'Aadhaar Card' ? '4829 1048 2910' : 'ABCD1234E'}
                            className="w-full px-2.5 py-1 text-xs border border-gray-350 focus:border-red-400 outline-none rounded font-mono text-gray-900"
                            required
                          />
                        </div>

                        {/* Drag and Drop Mock File input */}
                        <div className="border border-dashed border-gray-300 p-2 text-center text-[10px] bg-slate-50 text-gray-500 hover:bg-gray-100 cursor-pointer">
                          <Camera className="w-4 h-4 mx-auto text-gray-400 mb-0.5" />
                          <span className="font-mono text-[8.5px] uppercase">Optional ID Front Image Attached</span>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isVerifying}
                        className="w-full bg-[#121921] hover:bg-black text-[#fffc40] py-2 border border-black font-mono text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_#000] cursor-pointer flex items-center justify-center gap-1"
                      >
                        {isVerifying ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-dashed border-[#fffc40] rounded-full animate-spin shrink-0" />
                            <span>OCR Scanner verifying proof...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Activate Trust Badge</span>
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* Stats card */}
              <div className="bg-amber-50/50 rounded-lg p-5 border border-amber-200 text-gray-700 text-left">
                <HeaderStats ordersCount={ordersCount} walletBalance={walletBalance} session={session} />
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ==================================== VIEWPORT 2: SELLER LISTINGS OVERVIEW ==================================== */}
      {accountSubView === 'listings' && (
        <div className="bg-white border-2 border-black p-5 md:p-6 shadow-[5px_5px_0px_rgba(0,0,0,1)] text-left">
          
          <div className="flex justify-between items-center pb-4 border-b border-gray-200 mb-5 flex-wrap gap-2 text-left">
            <div>
              <h2 className="font-extrabold text-sm uppercase text-gray-900 font-mono flex items-center gap-1.5">
                <ShoppingBag className="w-4.5 h-4.5 text-amber-500" />
                <span>Your Classified listings ({userListings.length})</span>
              </h2>
              <p className="text-[11px] text-gray-400 leading-none">Click any Listed Product card to modify prices, inspect uploaded diagnostics or change descriptions.</p>
            </div>
            <button
              onClick={onOpenMarketplaceRelist}
              className="bg-[#00ff9d] hover:bg-[#00e08b] text-black border border-black px-3.5 py-1 text-xs font-black uppercase tracking-wide cursor-pointer"
            >
              + List New Item
            </button>
          </div>

          {userListings.length === 0 ? (
            <div className="py-12 text-center rounded bg-slate-50 border border-slate-200">
              <ShoppingBag className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="font-mono text-xs font-bold uppercase text-gray-700">No Listings Created Yet</p>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto font-sans leading-normal">
                You haven't listed any customer return units or unboxed hardware on Noida ReList. Click on "List New Item" or go to Marketplace ReList page to construct your catalog listings.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userListings.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => handleOpenListingDetail(item)}
                  className="bg-white border-2 border-black p-4 flex gap-4 hover:bg-slate-50 cursor-pointer shadow-[3px_3px_0px_#000] hover:shadow-[5px_5px_0px_#000] transition-all relative group"
                >
                  {/* Verified Seller status indicator */}
                  {(item.verifiedSeller || session.isVerifiedSeller) && (
                    <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm flex items-center justify-center" title="Verified Trust Checkmark active">
                      <ShieldCheck className="w-4 text-emerald-100 fill-emerald-600 stroke-2" />
                    </div>
                  )}

                  <div className="w-20 h-20 bg-slate-50 border border-slate-200 rounded overflow-hidden flex items-center justify-center bg-white shrink-0 p-1">
                    <img src={item.imageUrl} className="max-h-16 max-w-full object-contain mix-blend-multiply" alt={item.name} />
                  </div>

                  <div className="space-y-1 text-left flex-grow min-w-0">
                    <span className="inline-block bg-slate-900 text-white text-[8px] font-mono uppercase px-1.5 py-0.5 leading-none">
                      {item.category}
                    </span>
                    <h4 className="font-sans font-black text-xs text-gray-900 uppercase truncate leading-snug group-hover:underline">
                      {item.name}
                    </h4>
                    
                    <div className="flex items-baseline gap-2 pt-0.5">
                      <span className="text-xs font-black text-amber-600">₹{item.askingPrice.toLocaleString('en-IN')}</span>
                      <span className="text-[10px] text-gray-400 line-through">MSRP ₹{item.originalPrice.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="pt-1 flex items-center justify-between font-mono text-[9px] text-gray-400">
                      <span>Condition: <strong className="text-gray-800">{item.condition}</strong></span>
                      <span className="flex items-center gap-1.5 text-amzn-blue hover:text-amzn-orange font-bold uppercase">
                        <Eye className="w-3 h-3" />
                        <span>Manage Details & Edit</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* ==================================== VIEWPORT 3: SELLER DETAILED PRODUCT PAGE ==================================== */}
      {accountSubView === 'detail' && selectedItem && (
        <div className="bg-white border-3 border-black p-6 md:p-8 shadow-[8px_8px_0px_#000] text-left">
          
          <div className="flex justify-between items-center pb-4 border-b-2 border-black mb-6">
            <button
              onClick={() => {
                setAccountSubView('listings');
                setIsEditingListing(false);
              }}
              className="bg-gray-100 hover:bg-gray-200 border border-gray-450 px-3 py-1.5 text-xs font-mono font-bold uppercase flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Listing Catalog</span>
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => handleDeleteListingItem(selectedItem.id)}
                className="bg-red-50 hover:bg-red-100 text-red-650 border border-red-500 px-3.5 py-1.5 text-xs font-mono font-bold uppercase flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Product</span>
              </button>
              {!isEditingListing && (
                <button
                  onClick={() => setIsEditingListing(true)}
                  className="bg-amzn-yellow hover:bg-amzn-orange text-[#111] border border-amber-600 px-4 py-1.5 text-xs font-mono font-bold uppercase flex items-center gap-1 cursor-pointer shadow-[2px_2px_0px_#000]"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Edit Details</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Left Box: Product Visual Showcase */}
            <div className="space-y-4">
              <div className="bg-slate-50 border-2 border-black p-5 flex items-center justify-center min-h-[250px] relative">
                <img 
                  src={selectedItem.imageUrl} 
                  className="max-h-[220px] object-contain mix-blend-multiply" 
                  alt={selectedItem.name} 
                />
                {(selectedItem.verifiedSeller || session.isVerifiedSeller) && (
                  <div className="absolute top-3 left-3 bg-emerald-50 text-emerald-800 border-2 border-emerald-500 font-mono text-[9px] font-black px-2 py-1 uppercase rotate-[-3deg] shadow-[2px_2px_0px_#005] flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verified Seller Match</span>
                  </div>
                )}
              </div>

              {/* Angle snaps diagnostics showcase box */}
              <div className="bg-slate-900 text-white p-4 border border-black space-y-3 font-mono text-[10.5px]">
                <h4 className="text-xs font-black uppercase text-[#fffc40] tracking-wider flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-[#fffc40] animate-pulse" />
                  <span>Interactive Diagnostics Storage Buffer</span>
                </h4>
                <p className="text-[10px] text-gray-400">Classified angle photos which are passed down to safety engines to check mechanical parameters are stored securely.</p>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="border border-slate-700 p-1 bg-slate-950 text-center">
                    <img src={selectedItem.imageUrl} className="h-10 w-full object-cover rounded mb-0.5 opacity-80" alt="S1" />
                    <span className="text-[7.5px] uppercase text-gray-400">Main</span>
                  </div>
                  <div className="border border-dashed border-slate-700 p-1 flex flex-col items-center justify-center bg-slate-950 text-gray-500 text-center">
                    <Camera className="w-4 h-4 mb-0.5 text-slate-500" />
                    <span className="text-[7.5px] uppercase leading-none">Side Snap</span>
                  </div>
                  <div className="border border-dashed border-slate-700 p-1 flex flex-col items-center justify-center bg-slate-950 text-gray-500 text-center">
                    <Video className="w-4 h-4 mb-0.5 text-slate-500" />
                    <span className="text-[7.5px] uppercase leading-none">Scout Clip</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Box: Info Display OR Edit form */}
            <div className="text-left space-y-4">
              
              {isEditingListing ? (
                <form onSubmit={handleSaveListingChanges} className="space-y-4 bg-slate-50 border-2 border-black p-5">
                  <h3 className="font-mono text-xs font-black uppercase text-black tracking-widest pb-2 border-b-2 border-dashed border-black">
                    Interactive Listing Editor Form
                  </h3>

                  <div className="space-y-3 font-sans">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-700 mb-1">Product Title</label>
                      <input 
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full text-xs font-sans px-3 py-2 border-2 border-black outline-none"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-gray-700 mb-1">Resale Asking Price (₹)</label>
                        <input 
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-full text-xs font-mono px-3 py-2 border-2 border-black outline-none font-bold"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-gray-700 mb-1">Original MSRP (₹)</label>
                        <input 
                          type="number"
                          value={editOrigPrice}
                          onChange={(e) => setEditOrigPrice(e.target.value)}
                          className="w-full text-xs font-mono px-3 py-2 border-2 border-black outline-none text-gray-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-gray-700 mb-1">State Condition</label>
                        <select
                          value={editCondition}
                          onChange={(e) => setEditCondition(e.target.value)}
                          className="w-full text-xs px-2 py-1.5 border-2 border-black outline-none bg-white font-sans font-medium"
                        >
                          <option value="Like New">Like New</option>
                          <option value="Very Good">Very Good</option>
                          <option value="Good">Good</option>
                          <option value="Fair">Fair</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-gray-700 mb-1">Years or Months Used</label>
                        <input 
                          type="text"
                          value={editYears}
                          onChange={(e) => setEditYears(e.target.value)}
                          className="w-full text-xs font-sans px-3 py-1.5 border-2 border-black outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-700 mb-1">Product Category</label>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 border-2 border-black outline-none bg-white font-sans font-medium"
                      >
                        <option value="Home Essentials">Home Essentials</option>
                        <option value="Electronics">Electronics</option>
                        <option value="Fashion">Fashion</option>
                        <option value="Sports">Sports</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-700 mb-1">Detailed Item Specifications</label>
                      <textarea
                        rows={3}
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="w-full text-xs font-sans px-3 py-2 border-2 border-black outline-none leading-relaxed"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t pt-3">
                    <button 
                      type="button"
                      onClick={() => setIsEditingListing(false)}
                      className="px-4 py-1.5 border-2 border-black text-xs font-mono font-bold uppercase hover:bg-gray-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="px-5 py-1.5 bg-emerald-500 hover:bg-emerald-650 text-white border-2 border-black text-xs font-mono font-black uppercase shadow-[2px_2px_0px_#000] cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <span className="bg-slate-100 border-2 border-black font-mono text-[9px] font-bold text-gray-700 uppercase tracking-widest px-2.5 py-1">
                      {selectedItem.category}
                    </span>
                    <h2 className="text-xl md:text-2xl font-black text-black uppercase mt-2.5 tracking-wide leading-tight">
                      {selectedItem.name}
                    </h2>
                    <p className="text-[10px] font-mono text-gray-400 mt-1 uppercase">
                      Unique Code: {selectedItem.id} | Region: {selectedItem.location}
                    </p>
                  </div>

                  <div className="bg-slate-50 border-2 border-black p-4 font-mono font-bold text-xs space-y-2">
                    <div className="flex justify-between border-b pb-1.5">
                      <span className="text-gray-455">Selling Price:</span>
                      <span className="text-amber-600 font-extrabold text-sm">₹{selectedItem.askingPrice.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1.5">
                      <span className="text-gray-455">MSRP Original:</span>
                      <span className="text-gray-500 line-through">₹{selectedItem.originalPrice.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1.5">
                      <span className="text-gray-455">Condition:</span>
                      <span className="text-gray-950">{selectedItem.condition}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-455">Years Used:</span>
                      <span className="text-gray-950">{selectedItem.yearsUsed}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-700 font-sans leading-relaxed">
                    <p className="font-extrabold uppercase text-[10px] tracking-wider text-slate-500">Listed Description:</p>
                    <p className="bg-slate-50 p-3 italic border-l-4 border-slate-400 font-medium">"{selectedItem.description}"</p>
                  </div>

                  {/* Trust Badge Matches indicators */}
                  {(selectedItem.verifiedSeller || session.isVerifiedSeller) ? (
                    <div className="bg-emerald-50 text-emerald-900 border-2 border-emerald-500 p-4 font-sans text-xs flex gap-2.5 leading-snug">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-bold uppercase text-[10.5px] block text-emerald-800">Verified Seller Connected</span>
                        <p className="text-[11px] mt-0.5">This listing has successfully passed standard phone number & government credential checks. The <strong>Trust Checkmark</strong> badge is fully highlighted on Noida ReList catalogs.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 text-amber-900 border-2 border-dashed border-amber-400 p-4 font-sans text-xs flex gap-2.5 leading-snug">
                      <Shield className="w-5 h-5 text-amber-650 shrink-0 animate-pulse" />
                      <div>
                        <span className="font-bold uppercase text-[10.5px] block text-amber-800">Unverified Seller Status</span>
                        <p className="text-[11px] mt-0.5">Verify your government credentials in your account dashboard to activate the <strong>Trust Checkmark</strong> badge on this and all other active listings.</p>
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t">
                    <p className="text-[10px] text-gray-500 font-mono italic">
                      Note: When you listed this item, a central escrow box was provisioned at the Sector 62, Noida hub. Changes to details update in real-time.
                    </p>
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

// Stats widget helper function
function HeaderStats({ ordersCount, walletBalance, session }: { ordersCount: number; walletBalance: number; session: UserSession }) {
  return (
    <div className="space-y-3.5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
        <Star className="w-4 h-4 fill-amber-500 text-amber-600 animate-spin" style={{ animationDuration: '4s' }} />
        <span>Session Activity Stats</span>
      </h3>
      <div className="text-xs space-y-2 text-gray-600 font-semibold font-mono">
        <div className="flex justify-between border-b pb-1.5 border-amber-150">
          <span>Active Orders Placed:</span>
          <span className="font-extrabold text-gray-900">{ordersCount}</span>
        </div>
        <div className="flex justify-between border-b pb-1.5 border-amber-150">
          <span>Wallet Pay Balance:</span>
          <span className="font-extrabold text-gray-900">₹{walletBalance}</span>
        </div>
        <div className="flex justify-between border-b pb-1.5 border-amber-150">
          <span>Delivery Region Tag:</span>
          <span className="font-extrabold text-gray-900">{session.city}</span>
        </div>
        <div className="flex justify-between">
          <span>Seller Badge status:</span>
          <span className={`font-extrabold uppercase text-[10px] ${session.isVerifiedSeller ? 'text-emerald-700' : 'text-amber-600'}`}>
            {session.isVerifiedSeller ? '✦ Verified Checkmark' : '✦ No checkmark'}
          </span>
        </div>
      </div>
    </div>
  );
}
