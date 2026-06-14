import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { CAROUSEL_BANNERS } from '../data/products';
import { CarouselBanner } from '../types';

interface HeroCarouselProps {
  onBannerAction: (category: string) => void;
}

export default function HeroCarousel({ onBannerAction }: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(0); // -1 for left, 1 for right

  const banners = CAROUSEL_BANNERS;

  useEffect(() => {
    const timer = setInterval(() => {
      handleNext();
    }, 7000);
    return () => clearInterval(timer);
  }, [activeIndex]);

  const handlePrev = () => {
    setDirection(-1);
    setActiveIndex((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setDirection(1);
    setActiveIndex((prev) => (prev === banners.length - 1 ? 0 : prev + 1));
  };

  const currentBanner = banners[activeIndex];

  // Framer Motion spring/slide configurations
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  return (
    <div className="relative w-full h-[320px] sm:h-[380px] md:h-[450px] overflow-hidden select-none bg-[#eaeded]">
      
      {/* Slider Carousel Engine */}
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={activeIndex}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: 'spring', stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 },
          }}
          className={`absolute inset-0 w-full h-full flex items-stretch ${currentBanner.bgColor}`}
        >
          {/* Main Banner Content */}
          <div className="w-full max-w-7xl mx-auto px-6 md:px-12 py-8 flex flex-col md:flex-row justify-between items-center relative gap-4">
            
            {/* Left text column */}
            <div className={`flex flex-col max-w-lg justify-center h-full z-10 ${currentBanner.textPosition === 'left' ? 'order-1 text-left' : 'order-2 text-right'}`}>
              <span className="text-gray-800 text-sm md:text-base font-light tracking-wide uppercase">
                {currentBanner.title}
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mt-1">
                {currentBanner.subtitle}
              </h2>

              {currentBanner.tagline && (
                <div className="flex items-center gap-4 mt-3 text-xs md:text-sm font-semibold text-gray-700 tracking-wider">
                  <span>{currentBanner.tagline.split('|')[0]}</span>
                  {currentBanner.tagline.includes('|') && (
                    <>
                      <div className="w-[1.5px] h-4 bg-gray-400"></div>
                      <span>{currentBanner.tagline.split('|')[1]}</span>
                    </>
                  )}
                </div>
              )}

              {currentBanner.accentText && (
                <div className="mt-5 bg-white/70 backdrop-blur-xs border border-gray-200 shadow-xs rounded px-3 py-2 max-w-xs md:max-w-md">
                  <span className="text-[10px] md:text-xs text-slate-800 font-medium">
                    {currentBanner.accentText}
                  </span>
                </div>
              )}

              <button
                onClick={() => {
                  const filterCat = currentBanner.id === 'banner-kurtas' ? 'Fashion' : currentBanner.id === 'banner-mobiles' ? 'Mobiles' : 'Home Essentials';
                  onBannerAction(filterCat);
                }}
                className="mt-6 self-start bg-[#131921] text-white hover:bg-[#232f3e] px-5 py-2.5 rounded-md text-xs font-bold transition-all shadow cursor-pointer active:scale-95"
              >
                {currentBanner.linkText}
              </button>
            </div>

            {/* Right graphic column */}
            <div className={`relative h-full flex items-center justify-center shrink-0 w-full md:w-1/2 max-h-[220px] md:max-h-full ${currentBanner.textPosition === 'left' ? 'order-2' : 'order-1'}`}>
              <div className="absolute inset-0 bg-radial-gradient from-white/30 to-transparent blur-xl rounded-full"></div>
              <img
                src={currentBanner.image}
                alt={currentBanner.subtitle}
                className="h-[180px] sm:h-[220px] md:h-[280px] object-cover rounded-lg shadow-xl border-4 border-white transform hover:rotate-1 hover:scale-[1.03] transition-transform duration-300 referrer-override"
                referrerPolicy="no-referrer"
              />
            </div>

          </div>
        </motion.div>
      </AnimatePresence>

      {/* Control Arrows */}
      <button
        onClick={handlePrev}
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/60 p-3 rounded-full hover:shadow-lg transition-all text-gray-800 border border-white/25 cursor-pointer z-20 group active:scale-95"
        title="Previous banner"
      >
        <ChevronLeft className="w-6 h-6 group-hover:scale-110" />
      </button>

      <button
        onClick={handleNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/60 p-3 rounded-full hover:shadow-lg transition-all text-gray-800 border border-white/25 cursor-pointer z-20 group active:scale-95"
        title="Next banner"
      >
        <ChevronRight className="w-6 h-6 group-hover:scale-110" />
      </button>

      {/* Bottom slide dots indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
        {banners.map((_, dotIdx) => (
          <button
            key={dotIdx}
            onClick={() => {
              setDirection(dotIdx > activeIndex ? 1 : -1);
              setActiveIndex(dotIdx);
            }}
            className={`w-2 h-2 rounded-full transition-all ${
              activeIndex === dotIdx ? 'bg-amzn-orange w-6' : 'bg-gray-400'
            }`}
          />
        ))}
      </div>

      {/* Gradient Bottom overlay (Feather fade into white catalog cards) */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#eaeded] to-transparent pointer-events-none z-10" />

    </div>
  );
}
