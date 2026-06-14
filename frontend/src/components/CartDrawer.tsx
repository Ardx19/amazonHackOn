import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ShieldCheck, CheckCircle2 } from 'lucide-react';
import GreenCreditsCard from './GreenCreditsCard';
import { CartItem } from '../types';

interface CartDrawerProps {
  cartItems: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (productId: string, newQty: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onPlaceOrder: (items: CartItem[], amount: number, paymentMethod: string, address: string, orderId: string) => void;
}

export default function CartDrawer({
  cartItems,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onPlaceOrder,
}: CartDrawerProps) {
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'loading' | 'success'>('cart');
  const [address, setAddress] = useState('Sector 62, Noida, Uttar Pradesh, 201301');
  const [paymentMethod, setPaymentMethod] = useState('Amazon Pay Later Balance');
  const [orderId, setOrderId] = useState('');

  // Calculates subtotal
  const subtotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const handleCheckoutInit = () => {
    if (cartItems.length === 0) return;
    const generatedId = `AMZN-IN-${Math.floor(100000 + Math.random() * 900000)}`;
    setOrderId(generatedId);
    setCheckoutStep('loading');
    setTimeout(() => {
      setCheckoutStep('success');
      onPlaceOrder(cartItems, subtotal, paymentMethod, address, generatedId);
    }, 1800);
  };

  const handleSuccessDone = () => {
    onClearCart();
    setCheckoutStep('cart');
    onClose();
  };

  return (
    <div id="shopping-cart-drawer" className="fixed inset-0 z-50 flex justify-end select-none">
      
      {/* Backdrop */}
      <div 
        onClick={() => { if (checkoutStep !== 'loading') onClose(); }}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      ></div>

      {/* Cart Drawer Panel Container */}
      <div className="relative bg-[#f3f3f3] text-gray-800 w-full max-w-[480px] h-full flex flex-col shadow-2xl z-10 animate-in slide-in-from-right duration-250">
        
        {/* Header bar */}
        <div className="bg-white border-b px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-gray-900">Your Shopping Cart ({totalItems})</h3>
          </div>
          <button 
            onClick={onClose} 
            disabled={checkoutStep === 'loading'}
            className="text-gray-500 hover:text-gray-800 transition-colors p-1"
            title="Close Drawer"
          >
            <X className="w-5.5 h-5.5" />
          </button>
        </div>

        {/* --- STEP 1: CART OVERVIEW VIEW --- */}
        {checkoutStep === 'cart' && (
          <>
            {/* Free Delivery Promo offer banner */}
            {subtotal >= 499 ? (
              <div className="bg-green-50 px-5 py-2.5 border-b border-green-100 flex items-center gap-2 shrink-0">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                <span className="text-[11px] text-green-800 font-medium">
                  Your order qualifies for <span className="font-extrabold">FREE Standard Delivery</span>. Choose this option at checker.
                </span>
              </div>
            ) : (
              <div className="bg-amber-50 px-5 py-2.5 border-b border-amber-100/70 flex flex-col gap-0.5 shrink-0">
                <span className="text-[11px] text-amber-800 font-semibold">
                  Add ₹{(499 - subtotal).toLocaleString('en-IN')} more to unlock FREE Standard Delivery!
                </span>
                {/* Micro progress bar */}
                <div className="w-full bg-gray-200 h-1 rounded-full overflow-hidden mt-1 max-w-xs">
                  <div className="bg-amzn-orange h-full" style={{ width: `${(subtotal / 499) * 100}%` }}></div>
                </div>
              </div>
            )}

            {/* List entries */}
            <div className="flex-grow overflow-y-auto px-5 py-4 space-y-3.5 scrollbar-thin">
              {cartItems.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center justify-center p-6">
                  <div className="text-gray-300 mb-4 bg-white p-5 rounded-full border">
                    <ShoppingBag className="w-14 h-14" />
                  </div>
                  <h4 className="text-base font-bold text-gray-900 mb-1">Your Amazon Cart has no items</h4>
                  <p className="text-xs text-gray-500 max-w-xs leading-relaxed mb-4">
                    Explore appliances, home styler revamps, decor brands, or search for items above to add to your cart.
                  </p>
                  <button
                    onClick={onClose}
                    className="bg-amber-400 hover:bg-amber-500 text-gray-900 text-xs font-semibold px-5 py-2 rounded shadow cursor-pointer transition-colors"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div
                    key={item.product.id}
                    className="bg-white border rounded p-3.5 flex gap-3.5 relative shadow-xs hover:border-gray-300"
                  >
                    {/* Item Image */}
                    <div className="w-20 h-20 bg-gray-50 p-1 rounded flex items-center justify-center border shrink-0">
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="max-h-full max-w-full object-contain referrer-override"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    {/* Item Info columns */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-gray-950 line-clamp-2 leading-tight">
                          {item.product.name}
                        </h4>
                        <div className="text-[10px] text-gray-500 flex flex-wrap gap-x-2.5 gap-y-0.5 mt-1 font-medium">
                          <span>Color: <span className="font-bold text-gray-800">{item.selectedColor || 'Classic'}</span></span>
                          {item.selectedSize && (
                            <>
                              <span className="text-gray-300">|</span>
                              <span>Config: <span className="font-bold text-gray-800">{item.selectedSize}</span></span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        {/* Price Subtotal info */}
                        <span className="text-sm font-extrabold text-gray-950">
                          ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                        </span>

                        {/* Quantity trigger elements */}
                        <div className="flex items-center border border-gray-300 rounded overflow-hidden shadow-xs h-7 bg-[#f0f2f2]">
                          <button
                            onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                            className="px-2 hover:bg-gray-200 text-gray-600 font-bold transition-colors cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-3 bg-white text-xs font-extrabold text-gray-800">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                            className="px-2 hover:bg-gray-200 text-gray-600 font-bold transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Absolute Delete Button */}
                    <button
                      onClick={() => onRemoveItem(item.product.id)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-600 p-1 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                      title="Delete Item"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>

                  </div>
                ))
              )}
            </div>

            {/* Subtotal Checkout Action controls */}
            {cartItems.length > 0 && (
              <div className="bg-white border-t p-5 shadow-inner shrink-0">
                <div className="flex items-center justify-between mb-4.5 text-slate-900">
                  <span className="text-sm font-semibold">Subtotal ({totalItems} items):</span>
                  <span className="text-lg font-extrabold">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>

                <div className="space-y-2.5">
                  <button
                    onClick={handleCheckoutInit}
                    className="w-full text-center bg-amzn-yellow hover:bg-amzn-orange text-gray-900 border border-amber-600/30 rounded py-2.5 text-xs font-bold shadow-md hover:shadow-lg transition-colors cursor-pointer"
                  >
                    Proceed to Buy
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* --- STEP 2: SIMULATED LOADER VIEW --- */}
        {checkoutStep === 'loading' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white text-center">
            {/* Standard Spinner */}
            <div className="relative w-16 h-16 mb-6">
              <div className="absolute inset-0 border-4 border-[#131921]/10 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-amzn-orange border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h4 className="text-base font-bold text-gray-900 mb-1">Confirming Simulated Order</h4>
            <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
              Reserving items across merchant channels and securing simulated payment token. Please hold on...
            </p>
          </div>
        )}

        {/* --- STEP 3: ORDER SUCCESS RECEIPT --- */}
        {checkoutStep === 'success' && (
          <div className="flex-1 flex flex-col justify-between p-6 bg-white overflow-y-auto">
            <div className="text-center pt-8">
              <div className="bg-green-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 border border-green-200 shadow-sm">
                <ShieldCheck className="w-10 h-10 text-green-600 animate-pulse" />
              </div>
              <h4 className="text-lg font-extrabold text-green-700 mb-1">Simulated Checkout Success!</h4>
              <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                Thank you for trying out our Amazon.in UI Clone! Your order has been registered in local browser state.
              </p>

              {/* Green Credits Card */}
              <div className="mt-6 max-w-sm mx-auto">
                <GreenCreditsCard weightKg={0.5} />
              </div>

              {/* Order specifications sheet */}
              <div className="mt-8 border text-left rounded-lg bg-gray-50 overflow-hidden text-xs">
                <div className="bg-gray-100 px-4 py-3 border-b flex justify-between font-semibold text-gray-700">
                  <span>Simulated Invoice Number</span>
                  <span className="text-gray-900 font-bold">#{orderId}</span>
                </div>
                
                <div className="p-4 space-y-3 font-normal text-gray-600">
                  <div>
                    <span className="block font-bold text-gray-800 text-[11px] uppercase tracking-wide">Shipment Destination:</span>
                    <span className="block leading-relaxed mt-0.5">{address}</span>
                  </div>
                  <div>
                    <span className="block font-bold text-gray-800 text-[11px] uppercase tracking-wide">Simulated Payment:</span>
                    <span className="block mt-0.5">{paymentMethod}</span>
                  </div>
                  <div className="border-t pt-3">
                    <span className="block font-bold text-gray-800 text-[11px] uppercase tracking-wide mb-1.5">Purchased Subproducts:</span>
                    <ul className="space-y-1.5">
                      {cartItems.map((c) => (
                        <li key={c.product.id} className="flex justify-between items-baseline gap-4 leading-normal">
                          <span className="truncate flex-1 font-medium">{c.product.name} (x{c.quantity})</span>
                          <span className="font-bold text-gray-900 shrink-0">₹{(c.product.price * c.quantity).toLocaleString('en-IN')}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="border-t pt-3 flex justify-between font-bold text-sm text-gray-900">
                    <span>Simulated Bill Amount:</span>
                    <span>₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleSuccessDone}
              className="w-full bg-amzn-yellow hover:bg-amzn-orange text-gray-900 border border-amber-600/30 rounded py-2.5 text-xs font-bold shadow-md cursor-pointer transition-colors mt-8"
            >
              Back to Catalog list
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
