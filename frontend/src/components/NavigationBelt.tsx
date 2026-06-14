import React, { useState } from 'react';
import { Menu, X, ChevronRight, User, ShoppingBag, Landmark, Percent, Star, Settings } from 'lucide-react';
import { UserSession } from '../types';

interface NavigationBeltProps {
  session: UserSession;
  onOpenAmazonPay: () => void;
  onSelectCategory: (category: string) => void;
  onOpenSignIn: () => void;
  onOpenCart: () => void;
  onOpenOrders: () => void;
  onOpenAccount: () => void;
  onOpenMarketplace: () => void;
}

export default function NavigationBelt({
  session,
  onOpenAmazonPay,
  onSelectCategory,
  onOpenSignIn,
  onOpenCart,
  onOpenOrders,
  onOpenAccount,
  onOpenMarketplace,
}: NavigationBeltProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const navLinks = [
    { label: 'Fresh', cat: 'Appliances' },
    { label: 'Marketplace 🆕', isMarketplaceTrigger: true },
    { label: 'MX Player', cat: 'Electronics' },
    { label: 'Sell', cat: 'Amazon Brands' },
    { label: 'Bestsellers', cat: 'All' },
    { label: 'Today\'s Deals', cat: 'Home Essentials' },
    { label: 'Mobiles', cat: 'Mobiles' },
    { label: 'Prime', cat: 'All' },
    { label: 'New Releases', cat: 'All' },
    { label: 'Customer Service', cat: 'All' },
    { label: 'Electronics', cat: 'Electronics' },
    { label: 'Amazon Pay', isPayTrigger: true },
    { label: 'Fashion', cat: 'Fashion' },
    { label: 'Home & Kitchen', cat: 'Home Essentials' },
    { label: 'Computers', cat: 'Computers' },
    { label: 'Toys & Games', cat: 'All' },
  ];

  const handleLinkClick = (link: typeof navLinks[0]) => {
    if (link.isPayTrigger) {
      onOpenAmazonPay();
    } else if (link.isMarketplaceTrigger) {
      onOpenMarketplace();
    } else if (link.cat) {
      onSelectCategory(link.cat);
    }
  };

  const departments = [
    { title: 'Trending', items: ['Best Sellers', 'New Releases', 'Movers and Shakers'] },
    { title: 'Digital Content And Devices', items: ['Echo & Alexa', 'Fire TV', 'Kindle E-Readers', 'Audible Audiobooks', 'Amazon Prime Video', 'Amazon Prime Music'] },
    { title: 'Special Programs', items: ['Marketplace (Float & ReList)', 'Amazon Pay', 'Gift Cards & Mobile Recharges', 'Flight Tickets'] },
    { title: 'Shop By Category', items: ['Mobiles, Computers', 'TV, Appliances, Electronics', 'Men\'s Fashion', 'Women\'s Fashion', 'Home, Kitchen, Pets', 'Beauty, Health, Grocery'] },
    { title: 'Help & Settings', items: ['Your Account', 'Your Orders', 'Customer Service'] }
  ];

  return (
    <>
      <div className="bg-[#232f3e] text-white flex items-center px-4 py-2 text-sm gap-4 overflow-x-auto select-none font-medium h-[39px] whitespace-nowrap scrollbar-none border-t border-[#131921]">
        
        {/* All Hamburger Menu Toggle */}
        <button 
          onClick={() => setIsDrawerOpen(true)}
          className="flex items-center gap-1 border border-transparent hover:border-white px-2 py-1 -my-1 rounded cursor-pointer transition-all font-bold shrink-0 text-white"
        >
          <Menu className="w-4.5 h-4.5" />
          <span>All</span>
        </button>

        {/* Dynamic Nav Belt Links */}
        <div className="flex items-center gap-4 text-xs">
          {navLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => handleLinkClick(link)}
              className="border border-transparent hover:border-white px-2 py-1 -my-1 rounded cursor-pointer transition-all shrink-0 text-[#f5f5f5] hover:text-white"
            >
              {link.label}
            </button>
          ))}
        </div>
      </div>

      {/* IN-SITE LEFT SIDE DEPARTMENTS DRAWER */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex select-none">
          {/* Backdrop Layer */}
          <div 
            onClick={() => setIsDrawerOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
          ></div>

          {/* Drawer Container Panel */}
          <div className="relative bg-white text-gray-800 w-80 max-w-[85vw] h-full flex flex-col shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            
            {/* Drawer Welcome Header */}
            <div 
              onClick={() => {
                if (!session.isLoggedIn) onOpenSignIn();
                setIsDrawerOpen(false);
              }}
              className="bg-[#232f3e] text-white p-4 flex items-center gap-3 cursor-pointer select-none shrink-0"
            >
              <div className="bg-white/10 p-1.5 rounded-full border border-white/20">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-[#ccc]">Hello,</p>
                <p className="text-sm font-bold text-white -mt-0.5">
                  {session.isLoggedIn ? session.name : 'Sign In to your account'}
                </p>
              </div>
            </div>

            {/* Department Categories List */}
            <div className="flex-1 overflow-y-auto py-4 px-1 scrollbar-thin">
              {departments.map((dept, idx) => (
                <div key={idx} className="mb-4 border-b pb-4 last:border-b-0">
                  <h4 className="text-sm font-bold text-gray-900 px-4 mb-2 tracking-wide uppercase text-xs">
                    {dept.title}
                  </h4>
                  <ul className="space-y-0.5">
                    {dept.items.map((item, itemIdx) => (
                      <li key={itemIdx}>
                        <button
                          onClick={() => {
                            if (item === 'Your Account') {
                              onOpenAccount();
                            } else if (item === 'Your Orders') {
                              onOpenOrders();
                            } else if (item === 'Amazon Pay') {
                              onOpenAmazonPay();
                            } else if (item === 'Marketplace (Float & ReList)') {
                              onOpenMarketplace();
                            } else if (item.includes('Mobile') || item === 'Echo & Alexa') {
                              onSelectCategory('Mobiles');
                            } else if (item.includes('Appliances') || item.includes('Electronics')) {
                              onSelectCategory('Appliances');
                            } else if (item.includes('Fashion')) {
                              onSelectCategory('Fashion');
                            } else if (item.includes('Home') || item.includes('Kitchen')) {
                              onSelectCategory('Home Essentials');
                            } else {
                              onSelectCategory('All');
                            }
                            setIsDrawerOpen(false);
                          }}
                          className="w-full flex items-center justify-between text-left px-4 py-2.5 hover:bg-gray-100 text-sm transition-colors cursor-pointer text-gray-700"
                        >
                          <span>{item}</span>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Close Accent Floating Button */}
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="absolute top-4 -right-12 text-white hover:text-orange-400 transition-colors p-1"
              title="Close Menu"
            >
              <X className="w-8 h-8" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
