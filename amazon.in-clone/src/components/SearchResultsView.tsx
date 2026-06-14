import React, { useState, useMemo } from 'react';
import { Star, ShieldCheck, CornerDownRight, Check, ShoppingCart } from 'lucide-react';
import { Product } from '../types';

interface SearchResultsViewProps {
  products: Product[];
  searchQuery: string;
  selectedCategory: string;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

export default function SearchResultsView({
  products,
  searchQuery,
  selectedCategory,
  onSelectProduct,
  onAddToCart,
}: SearchResultsViewProps) {
  const [minRating, setMinRating] = useState<number>(0);
  const [priceRange, setPriceRange] = useState<'all' | 'under-500' | '500-10000' | 'above-10000'>('all');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

  // 1. Filter products based on search query text & category filter
  const filteredProductsByQuery = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (selectedCategory !== 'All') {
        if (p.category.toLowerCase() !== selectedCategory.toLowerCase() && 
            p.categoryKey.toLowerCase() !== selectedCategory.toLowerCase()) {
          // Additional checks
          if (selectedCategory === 'Home Essentials' && p.category !== 'Home Essentials') return false;
          if (selectedCategory === 'Amazon Brands' && p.category !== 'Amazon Brands') return false;
          if (selectedCategory !== 'Home Essentials' && selectedCategory !== 'Amazon Brands') return false;
        }
      }

      // Query filter
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.brand.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [products, searchQuery, selectedCategory]);

  // 2. Extra unique brands present in current search
  const uniqueBrands = useMemo(() => {
    const brands = filteredProductsByQuery.map((p) => p.brand);
    return Array.from(new Set(brands));
  }, [filteredProductsByQuery]);

  // 3. Now apply sidebar filter presets (Min rating, price intervals, brand selection)
  const fullyFilteredProducts = useMemo(() => {
    return filteredProductsByQuery.filter((p) => {
      // Min Rating
      if (p.rating < minRating) return false;

      // Price ranges
      if (priceRange === 'under-500' && p.price >= 500) return false;
      if (priceRange === '500-10000' && (p.price < 500 || p.price > 10000)) return false;
      if (priceRange === 'above-10000' && p.price <= 10000) return false;

      // Brands checklist selector
      if (selectedBrands.length > 0 && !selectedBrands.includes(p.brand)) return false;

      return true;
    });
  }, [filteredProductsByQuery, minRating, priceRange, selectedBrands]);

  const handleBrandCheck = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const handleResetFilters = () => {
    setMinRating(0);
    setPriceRange('all');
    setSelectedBrands([]);
  };

  return (
    <div id="search-results-viewport" className="max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row gap-6 select-none bg-white">
      
      {/* 1. Left Sidebar Filter Widgets */}
      <aside className="w-full md:w-64 shrink-0 flex flex-col gap-6 border-b md:border-b-0 md:border-r border-gray-200 pr-5">
        
        {/* Title widget */}
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-bold text-gray-900 tracking-wide uppercase">Filters</h4>
          {(minRating > 0 || priceRange !== 'all' || selectedBrands.length > 0) && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-blue-600 hover:text-orange-600 font-bold hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Brand Checklist */}
        <div className="border-t pt-4">
          <h5 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2.5">Brand</h5>
          {uniqueBrands.length === 0 ? (
            <p className="text-xs text-gray-400">No brands matching query</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-40 overflow-y-auto scrollbar-thin">
              {uniqueBrands.map((brand) => (
                <label key={brand} className="flex items-center gap-2.5 text-xs text-gray-700 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(brand)}
                    onChange={() => handleBrandCheck(brand)}
                    className="accent-amzn-orange"
                  />
                  <span>{brand}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Customer Review Star thresholds */}
        <div className="border-t pt-4">
          <h5 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2.5">Customer Review</h5>
          <div className="flex flex-col gap-2">
            {[4, 3, 2].map((stars) => (
              <button
                key={stars}
                onClick={() => setMinRating(stars)}
                className={`flex items-center gap-1.5 text-xs font-medium text-left transition-colors cursor-pointer ${
                  minRating === stars ? 'text-amzn-orange font-bold' : 'text-gray-600 hover:text-orange-600'
                }`}
              >
                <div className="flex items-center text-amber-500">
                  {[...Array(5)].map((_, sIdx) => (
                    <Star
                      key={sIdx}
                      className={`w-3.5 h-3.5 fill-current ${
                        sIdx < stars ? 'text-amber-500' : 'text-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <span>& Up</span>
              </button>
            ))}
          </div>
        </div>

        {/* Price thresholds */}
        <div className="border-t pt-4">
          <h5 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2.5">Price</h5>
          <div className="flex flex-col gap-2.5 text-xs text-gray-600">
            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input
                type="radio"
                name="price"
                checked={priceRange === 'all'}
                onChange={() => setPriceRange('all')}
                className="accent-amber-500"
              />
              <span>Any Price</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input
                type="radio"
                name="price"
                checked={priceRange === 'under-500'}
                onChange={() => setPriceRange('under-500')}
                className="accent-amber-500"
              />
              <span>Under ₹500</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input
                type="radio"
                name="price"
                checked={priceRange === '500-10000'}
                onChange={() => setPriceRange('500-10000')}
                className="accent-amber-500"
              />
              <span>₹500 to ₹10,000</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input
                type="radio"
                name="price"
                checked={priceRange === 'above-10000'}
                onChange={() => setPriceRange('above-10000')}
                className="accent-amber-500"
              />
              <span>Over ₹10,000</span>
            </label>
          </div>
        </div>

      </aside>

      {/* 2. Right Products Grid Result area */}
      <section className="flex-1">
        
        {/* Results Info header banner */}
        <div className="border-b pb-3 mb-5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2.5">
          <div className="text-sm font-normal text-gray-700">
            Showing <span className="font-extrabold text-gray-900">{fullyFilteredProducts.length}</span> results for{' '}
            <span className="font-bold text-amzn-orange">
              "{searchQuery || selectedCategory}"
            </span>
          </div>
          <div className="text-xs text-gray-500">
            Fulfillment and delivery prices verified against Amazon India live rates.
          </div>
        </div>

        {/* Products lists loop */}
        {fullyFilteredProducts.length === 0 ? (
          <div className="py-20 text-center bg-gray-50 border rounded p-6">
            <h4 className="text-base font-bold text-gray-900 mb-1">No matching products found</h4>
            <p className="text-xs text-gray-500 leading-relaxed mb-4">
              Try checking your spelling or selecting an alternative category filter in our header dropdown.
            </p>
            <button
              onClick={handleResetFilters}
              className="bg-gray-200 border text-xs font-semibold px-4 py-2 hover:bg-gray-300 rounded cursor-pointer transition-colors"
            >
              Reset Filters and Try again
            </button>
          </div>
        ) : (
          <div className="space-y-4 md:space-y-5">
            {fullyFilteredProducts.map((prod) => {
              const savings = prod.originalPrice - prod.price;
              const discount = Math.round((savings / prod.originalPrice) * 100);

              return (
                <div
                  key={prod.id}
                  className="bg-white border rounded-lg hover:shadow-md transition-shadow duration-200 p-4 flex flex-col sm:flex-row gap-4 relative group"
                >
                  
                  {/* Thumbnail and Discount Badge */}
                  <div 
                    onClick={() => onSelectProduct(prod)}
                    className="w-full sm:w-44 shrink-0 bg-gray-50 rounded flex items-center justify-center p-3 cursor-pointer h-40 sm:h-auto border border-gray-100 relative"
                  >
                    <img
                      src={prod.imageUrl}
                      alt={prod.name}
                      className="max-h-full max-w-full object-contain mix-blend-multiply group-hover:scale-102 transition-transform referrer-override"
                      referrerPolicy="no-referrer"
                    />
                    {discount > 20 && (
                      <span className="absolute top-2 left-2 bg-[#cc0c39] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
                        {discount}% OFF
                      </span>
                    )}
                  </div>

                  {/* Information Details block */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      {/* Brand Label */}
                      <span className="text-xs text-gray-500 font-medium tracking-wide">
                        {prod.brand}
                      </span>

                      {/* Title heading */}
                      <h3
                        onClick={() => onSelectProduct(prod)}
                        className="text-sm md:text-base font-bold text-gray-950 hover:text-amzn-orange cursor-pointer line-clamp-2 leading-tight mt-0.5"
                      >
                        {prod.name}
                      </h3>

                      {/* Star reviews block */}
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="flex items-center text-amber-500">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 fill-current ${
                                i < Math.floor(prod.rating) ? 'text-amber-500' : 'text-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[11px] font-bold text-blue-600 hover:text-orange-600 cursor-pointer">
                          {prod.rating} ({prod.reviewCount.toLocaleString()})
                        </span>
                      </div>

                      {/* Dynamic Prime offer tag */}
                      <div className="flex items-center gap-1.5 mt-2.5">
                        <span className="bg-[#00a8e1] text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-xs leading-none">
                          PRIME
                        </span>
                        <span className="text-[11px] text-gray-500 font-normal">
                          Get it by <span className="font-extrabold text-gray-800">Tomorrow, free delivery</span>
                        </span>
                      </div>
                    </div>

                    {/* Pricing, savings information and direct ADD to Cart trigger */}
                    <div className="mt-4 flex flex-col sm:flex-row sm:items-end justify-between border-t pt-3.5 gap-3">
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xl md:text-2xl font-extrabold text-gray-900">
                            ₹{prod.price.toLocaleString('en-IN')}
                          </span>
                          <span className="text-xs text-gray-400 line-through font-normal">
                            M.R.P.: ₹{prod.originalPrice.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <p className="text-[11px] text-green-700 font-semibold leading-none mt-1">
                          Save ₹{savings.toLocaleString('en-IN')} ({discount}%)
                        </p>
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => onSelectProduct(prod)}
                          className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-sm border select-none transition-colors cursor-pointer"
                        >
                          Quick View
                        </button>
                        <button
                          onClick={() => onAddToCart(prod)}
                          className="px-4 py-1.5 bg-amzn-yellow hover:bg-amzn-orange text-gray-900 text-xs font-semibold rounded-sm border border-amber-600/30 shadow flex items-center gap-1 hover:shadow-md transition-colors cursor-pointer"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Add to Cart</span>
                        </button>
                      </div>
                    </div>

                  </div>

                </div>
              );
            })}
          </div>
        )}

      </section>

    </div>
  );
}
