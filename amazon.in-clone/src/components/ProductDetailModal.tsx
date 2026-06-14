import React, { useState } from 'react';
import { X, Star, Shield, Truck, RefreshCw, ShoppingCart, Check } from 'lucide-react';
import { Product } from '../types';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product, color?: string, size?: string) => void;
}

export default function ProductDetailModal({
  product,
  onClose,
  onAddToCart,
}: ProductDetailModalProps) {
  const [selectedColor, setSelectedColor] = useState('Standard');
  const [selectedSize, setSelectedSize] = useState('Default Size');
  const [added, setAdded] = useState(false);

  const colors = [
    { name: 'Classic Silver', class: 'bg-zinc-300' },
    { name: 'Titanium Grey', class: 'bg-zinc-500' },
    { name: 'Premium Gold', class: 'bg-amber-100 font-amber-950' },
    { name: 'Slate Black', class: 'bg-zinc-800' },
  ];

  const sizes = product.category === 'Appliances' 
    ? ['Standard Capacity', 'Enterprise Capacity (+ ₹8,000)']
    : ['Standard Fit', 'Premium Pack (+ ₹450)'];

  const discountVal = product.originalPrice - product.price;
  const discountPercent = Math.round((discountVal / product.originalPrice) * 100);

  const handleAddAction = () => {
    onAddToCart(product, selectedColor, selectedSize);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onClose();
    }, 1200);
  };

  return (
    <div id="product-detail-modal" className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs select-none">
      <div className="bg-white rounded-md shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col md:flex-row relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button Trigger */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 transition-all p-1.5 hover:bg-gray-100 rounded-full z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Side: Product Image & Badges */}
        <div className="w-full md:w-1/2 p-6 flex flex-col items-center justify-center bg-gray-50 border-r border-gray-100 min-h-[300px]">
          <div className="relative max-h-[340px] flex items-center justify-center p-4">
            <img 
              src={product.imageUrl} 
              alt={product.name} 
              className="max-h-[300px] object-contain rounded-lg filter drop-shadow-md transition-transform duration-300 hover:scale-105 referrer-override"
              referrerPolicy="no-referrer"
            />
            {discountPercent > 20 && (
              <span className="absolute top-4 left-4 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-sm tracking-wide shadow-sm">
                -{discountPercent}% OFF
              </span>
            )}
          </div>
          
          {/* Service icons row */}
          <div className="grid grid-cols-3 gap-3 w-full border-t pt-5 mt-5 text-center">
            <div className="flex flex-col items-center gap-1">
              <div className="bg-[#f5f5f5] p-2 rounded-full text-amber-600">
                <Truck className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-gray-800">Free Fast Delivery</span>
              <span className="text-[9px] text-gray-500">Scheduled slots</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="bg-[#f5f5f5] p-2 rounded-full text-amber-600">
                <Shield className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-gray-800">1 Year Brand Warranty</span>
              <span className="text-[9px] text-gray-500">Authorized repair</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="bg-[#f5f5f5] p-2 rounded-full text-amber-600">
                <RefreshCw className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-gray-800">7-Day Replacement</span>
              <span className="text-[9px] text-gray-500">Hassle-free collection</span>
            </div>
          </div>
        </div>

        {/* Right Side: Specifications and Purchase buttons */}
        <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-between">
          <div>
            {/* Header tags */}
            <div className="flex items-center justify-between text-xs text-blue-600 font-semibold mb-2">
              <span className="hover:text-orange-600 hover:underline cursor-pointer">Brand: {product.brand}</span>
              <span className="text-gray-400">ID: {product.id}</span>
            </div>

            {/* Title */}
            <h2 className="text-lg md:text-xl font-bold text-gray-950 leading-snug mb-2.5">
              {product.name}
            </h2>

            {/* Ratings Summary */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-4 h-4 fill-current ${
                      i < Math.floor(product.rating) ? 'text-amber-500' : 'text-gray-300'
                    }`} 
                  />
                ))}
              </div>
              <span className="text-xs font-bold text-blue-600 hover:text-orange-600 cursor-pointer hover:underline">
                {product.rating} stars ({product.reviewCount.toLocaleString()} ratings)
              </span>
            </div>

            <div className="border-t border-b py-3.5 my-3.5 space-y-1.5">
              {/* Pricing section */}
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-gray-900">
                  ₹{product.price.toLocaleString('en-IN')}
                </span>
                <span className="text-sm text-gray-500 line-through">
                  M.R.P.: ₹{product.originalPrice.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-xs text-green-700 font-semibold">
                You Save: ₹{discountVal.toLocaleString('en-IN')} ({discountPercent}% discount)
              </p>
              <p className="text-xs text-gray-600">
                Inclusive of all taxes. EMI starts at <span className="font-bold text-gray-950">₹{(Math.round(product.price / 12)).toLocaleString('en-IN')} / month</span>
              </p>
            </div>

            {/* Simulated Color Picker Option */}
            <div className="mb-4">
              <span className="text-xs text-gray-600 block mb-1.5">
                Color Variation: <span className="font-bold text-gray-950">{selectedColor}</span>
              </span>
              <div className="flex items-center gap-2">
                {colors.map((col) => (
                  <button
                    key={col.name}
                    onClick={() => setSelectedColor(col.name)}
                    className={`w-6 h-6 rounded-full ${col.class} border-2 transition-all ${
                      selectedColor === col.name ? 'border-amzn-orange scale-110 shadow' : 'border-gray-300 hover:scale-105'
                    }`}
                    title={col.name}
                  />
                ))}
              </div>
            </div>

            {/* Simulated Size Picker Option */}
            <div className="mb-5">
              <span className="text-xs text-gray-600 block mb-1.5 font-medium">Config:</span>
              <div className="flex items-center gap-2">
                {sizes.map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setSelectedSize(sz)}
                    className={`border text-[11px] font-semibold px-3 py-1.5 rounded-sm transition-all ${
                      selectedSize === sz
                        ? 'bg-[#fdf8f2] border-amzn-orange text-amzn-orange font-bold'
                        : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Description and bullets */}
            <div className="mb-6">
              <h4 className="text-xs font-bold text-gray-900 tracking-wide uppercase mb-1.5">Product Key Highlights</h4>
              <p className="text-xs text-gray-600 leading-relaxed mb-3 font-normal">
                {product.description}
              </p>
              <ul className="space-y-1.5 pl-4 list-disc text-xs text-gray-700 font-normal">
                {product.features.map((feat, fidx) => (
                  <li key={fidx}>{feat}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Action Row */}
          <div className="border-t pt-5 p-2 flex flex-col gap-2 shrink-0">
            <button
              onClick={handleAddAction}
              disabled={added}
              className={`w-full py-2.5 rounded shadow text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                added 
                  ? 'bg-green-600 text-white border-green-700' 
                  : 'bg-amzn-yellow hover:bg-amzn-orange text-gray-900 border border-amber-600/30'
              }`}
            >
              {added ? (
                <>
                  <Check className="w-4.5 h-4.5 text-white animate-bounce" />
                  <span>Added to Cart Successfully!</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4.5 h-4.5" />
                  <span>Add to Cart</span>
                </>
              )}
            </button>
            <p className="text-center text-[10px] text-gray-500 font-medium tracking-wide mt-1">
              Fulfillment and delivery handled directly by Cloud Run Amazon Merchant Express services.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
