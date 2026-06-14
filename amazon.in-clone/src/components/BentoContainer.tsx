import React from 'react';
import { Product } from '../types';
import { CATEGORY_LABELS } from '../data/products';

interface BentoContainerProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onExploreCategory: (categoryKey: string) => void;
}

export default function BentoContainer({
  products,
  onSelectProduct,
  onExploreCategory,
}: BentoContainerProps) {
  
  // Group products by their categoryKey
  const getSubProduct = (catKey: string, subKey: string): Product | undefined => {
    return products.find((p) => p.categoryKey === catKey && p.subCategoryKey === subKey);
  };

  // 4 Main Grid Cards Configured corresponding to the Amazon.in picture
  const bentoCards = [
    {
      id: 'appliances',
      title: CATEGORY_LABELS.appliances,
      linkText: 'See more',
      items: [
        { subKey: 'ac', label: 'Air conditioners' },
        { subKey: 'fridge', label: 'Refrigerators' },
        { subKey: 'microwave', label: 'Microwaves' },
        { subKey: 'wm', label: 'Washing machines' },
      ],
    },
    {
      id: 'revamp',
      title: CATEGORY_LABELS.revamp,
      linkText: 'Explore all',
      items: [
        { subKey: 'cushion', label: 'Cushion covers, bedsheets & more' },
        { subKey: 'fig', label: 'Figurines, vases & more' },
        { subKey: 'storage', label: 'Home storage' },
        { subKey: 'lighting', label: 'Lighting solutions' },
      ],
    },
    {
      id: 'essentials',
      title: CATEGORY_LABELS.essentials,
      linkText: 'Explore all',
      items: [
        { subKey: 'clean', label: 'Cleaning supplies' },
        { subKey: 'bath', label: 'Bathroom accessories' },
        { subKey: 'tools', label: 'Home tools' },
        { subKey: 'wall', label: 'Wallpapers' },
      ],
    },
    {
      id: 'brands',
      title: CATEGORY_LABELS.brands,
      linkText: 'See more',
      items: [
        { subKey: 'bedsheets', label: 'Starting ₹199 | Bedsheets' },
        { subKey: 'curtains', label: 'Starting ₹199 | Curtains' },
        { subKey: 'iron', label: 'Minimum 40% off | Ironing board & more' },
        { subKey: 'decor', label: 'Up to 60% off | Home decor' },
      ],
    },
  ];

  return (
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pb-12 z-20 -mt-20 sm:-mt-28 md:-mt-44 select-none">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {bentoCards.map((card) => (
          <div
            key={card.id}
            id={`bento-card-${card.id}`}
            className="bg-white p-4 flex flex-col justify-between shadow rounded-sm border border-gray-200"
          >
            {/* Title */}
            <div>
              <h3 className="text-lg md:text-xl font-bold tracking-tight text-gray-900 mb-3.5 leading-snug">
                {card.title}
              </h3>

              {/* 2x2 Grid of Subproducts */}
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                {card.items.map((cell) => {
                  const product = getSubProduct(card.id, cell.subKey);
                  if (!product) return null;

                  return (
                    <div
                      key={cell.subKey}
                      onClick={() => onSelectProduct(product)}
                      className="group cursor-pointer flex flex-col gap-1.5 justify-between"
                    >
                      {/* Image container box */}
                      <div className="bg-gray-50 flex items-center justify-center p-2 rounded-xs overflow-hidden h-[100px] sm:h-[110px] md:h-[120px] relative border border-gray-100 hover:brightness-95 transition-all">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300 referrer-override"
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute top-1 right-1 bg-amber-500/90 text-gray-900 font-extrabold text-[9px] px-1 py-0.5 rounded-xs">
                          ★ {product.rating}
                        </span>
                      </div>
                      
                      {/* Cell Caption Label */}
                      <p className="text-[11px] font-medium text-gray-700 leading-tight group-hover:text-amber-700">
                        {cell.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* See more Link */}
            <button
              onClick={() => onExploreCategory(card.id)}
              className="mt-6 text-xs md:text-sm font-semibold text-blue-600 hover:text-orange-600 hover:underline text-left self-start cursor-pointer tracking-wide"
            >
              {card.linkText}
            </button>
            
          </div>
        ))}
      </div>
    </div>
  );
}
