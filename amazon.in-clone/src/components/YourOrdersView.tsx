import React, { useState } from 'react';
import { Search, ChevronDown, Package, Check, RotateCcw, MessageSquare, Clipboard, ExternalLink, RefreshCw } from 'lucide-react';
import { Order, CartItem } from '../types';

interface YourOrdersViewProps {
  orders: Order[];
  onAddToCart: (product: any, color?: string, size?: string) => void;
  onGoHome: () => void;
  onReturnReplace?: (orderId: string, status: 'Returned' | 'Return Requested' | 'Replacement In-Transit', refundAmount?: number) => void;
}

export default function YourOrdersView({ orders, onAddToCart, onGoHome, onReturnReplace }: YourOrdersViewProps) {
  const [activeTab, setActiveTab] = useState<'orders' | 'notShipped' | 'cancelled'>('orders');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('2026');
  const [showInvoiceId, setShowInvoiceId] = useState<string | null>(null);
  const [showTrackingId, setShowTrackingId] = useState<string | null>(null);
  const [reviewOrderAndProduct, setReviewOrderAndProduct] = useState<{ orderId: string; productId: string } | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Return and replacement states
  const [selectedReturnOrder, setSelectedReturnOrder] = useState<Order | null>(null);
  const [returnReason, setReturnReason] = useState('Item defective / doesn\'t work');
  const [returnActionType, setReturnActionType] = useState<'refund' | 'replace'>('refund');
  const [isSubmitProcess, setIsSubmitProcess] = useState(false);
  const [returnSuccessMessage, setReturnSuccessMessage] = useState<string | null>(null);

  // Formats address cleanly
  const formatCompactAddress = (address: string) => {
    return address.split(',')[0] + ', ' + address.split(',')[1] || 'Sector 62, Noida';
  };

  const handleCopyOrderId = (id: string) => {
    navigator.clipboard.writeText(id).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  const submitReview = (e: React.FormEvent) => {
    e.preventDefault();
    setReviewSubmitted(true);
    setTimeout(() => {
      setReviewOrderAndProduct(null);
      setReviewSubmitted(false);
      setReviewText('');
      setRating(5);
    }, 2000);
  };

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReturnOrder) return;
    setIsSubmitProcess(true);

    setTimeout(() => {
      const statusValue = returnActionType === 'refund' ? 'Returned' : 'Replacement In-Transit';
      const refundAmount = returnActionType === 'refund' ? selectedReturnOrder.subtotal : 0;

      if (onReturnReplace) {
        onReturnReplace(selectedReturnOrder.id, statusValue, refundAmount);
      }

      setIsSubmitProcess(false);
      setSelectedReturnOrder(null);
      setReturnSuccessMessage(`Successfully registered your request for Order #${selectedReturnOrder.id}! ${
        returnActionType === 'refund'
          ? `₹${refundAmount.toLocaleString('en-IN')} has been refunded instantly to your Amazon Pay balance.`
          : 'Replacement dispatch initiated! An expedited replacement package was scheduled for Noida Sector 62.'
      }`);

      setTimeout(() => {
        setReturnSuccessMessage(null);
      }, 6000);
    }, 1500);
  };

  // Filter orders based on tabs, search queries and filters
  const filteredOrders = orders.filter((order) => {
    // Search query matching
    const matchesSearch = order.items.some((item) =>
      item.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Filter by tab
    if (activeTab === 'notShipped') {
      return matchesSearch && (order.status === 'Preparing' || order.status === 'Shipped');
    }
    if (activeTab === 'cancelled') {
      return false; // Simulation has no order cancellations yet
    }
    return matchesSearch;
  });

  return (
    <div id="your-orders-tab-view" className="max-w-4xl mx-auto px-4 py-8 select-none">
      
      {/* Breadcrumb utility */}
      <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
        <span onClick={onGoHome} className="hover:underline cursor-pointer">Your Account</span>
        <span>&gt;</span>
        <span className="text-gray-900 font-bold">Your Orders</span>
      </div>

      {/* Success Return Toast Alerts */}
      {returnSuccessMessage && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 p-4 rounded shadow-sm text-xs font-semibold mb-5 flex items-start gap-2.5 animate-in slide-in-from-top duration-300">
          <Check className="w-4 h-4 text-emerald-600 stroke-[3px] mt-0.5 shrink-0" />
          <div>
            <p className="font-extrabold text-emerald-950">Return Processed Successfully</p>
            <p className="mt-0.5 font-normal text-[11px] text-emerald-700">{returnSuccessMessage}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-sans">Your Orders</h1>
        
        {/* Amazon-style Grey Search Orders Bar */}
        <div className="relative flex items-center max-w-sm w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all orders"
            className="w-full pl-8 pr-16 py-1.5 bg-white border border-gray-400 focus:border-amzn-orange focus:ring-1 focus:ring-amzn-orange rounded text-xs outline-none text-gray-900 font-sans"
          />
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5" />
          <button className="bg-[#303740] hover:bg-[#20252b] text-white text-[11px] font-bold px-4 py-1.5 rounded-r border border-gray-450 absolute right-0 top-0 bottom-0 transition-colors uppercase tracking-wider">
            Search
          </button>
        </div>
      </div>

      {/* Tabs list matching Amazon style */}
      <div className="border-b border-gray-300 flex items-center gap-6 text-xs font-semibold mb-5 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-2 px-1 border-b-2 transition-all cursor-pointer ${
            activeTab === 'orders' ? 'border-amzn-orange text-gray-900 font-bold' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Orders
        </button>
        <button
          onClick={() => setActiveTab('notShipped')}
          className={`pb-2 px-1 border-b-2 transition-all cursor-pointer ${
            activeTab === 'notShipped' ? 'border-amzn-orange text-gray-900 font-bold' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Not Yet Shipped
        </button>
        <button
          onClick={() => setActiveTab('cancelled')}
          className={`pb-2 px-1 border-b-2 transition-all cursor-pointer ${
            activeTab === 'cancelled' ? 'border-amzn-orange text-gray-900 font-bold' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Cancelled Orders
        </button>
      </div>

      {/* Timeline Selector Description */}
      <div className="flex items-center gap-2 text-xs text-gray-600 mb-6">
        <span><span className="font-extrabold text-gray-900">{filteredOrders.length} orders</span> placed in </span>
        <select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value)}
          className="bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded px-2 py-1 text-xs outline-none font-semibold cursor-pointer text-gray-800"
        >
          <option value="2026">the past 30 days (Session)</option>
          <option value="2025">2025</option>
          <option value="2024">2024</option>
        </select>
      </div>

      {/* Orders List renderer */}
      {filteredOrders.length === 0 ? (
        <div className="border rounded-lg bg-white p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-gray-50 border rounded-full flex items-center justify-center text-gray-300 mb-4">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1">Looks like you haven't placed any orders in this session.</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mb-6 leading-relaxed">
            Fill your basket, choose from our home appliances or decor, and complete checkout to see real-time mock tracking pipelines here!
          </p>
          <button
            onClick={onGoHome}
            className="bg-amzn-yellow hover:bg-amzn-orange text-gray-950 font-extrabold text-xs px-5 py-2.5 rounded shadow border border-amber-600/30 cursor-pointer active:scale-95 transition-all"
          >
            Explore Today's Catalog
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map((order) => (
            <div key={order.id} className="border border-gray-300 rounded-lg bg-white overflow-hidden shadow-xs">
              
              {/* Order Card Header Meta Grid */}
              <div className="bg-[#f0f2f2] px-4 py-3 border-b border-gray-300 text-xs flex flex-wrap justify-between items-center gap-y-3 gap-x-6 text-gray-600">
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <div>
                    <span className="block text-[10px] text-gray-500 uppercase font-medium">Order Placed</span>
                    <span className="font-semibold text-gray-800">{order.orderDate}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-500 uppercase font-medium">Total Price</span>
                    <span className="font-extrabold text-gray-900">₹{order.subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="relative group">
                    <span className="block text-[10px] text-gray-500 uppercase font-medium">Ship To</span>
                    <span className="font-semibold text-amzn-blue hover:text-amzn-orange cursor-pointer hover:underline flex items-center gap-0.5">
                      {formatCompactAddress(order.shippingAddress)}
                      <ChevronDown className="w-3.5 h-3.5" />
                    </span>
                    {/* Floating Hover Address Details */}
                    <div className="opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto absolute left-0 mt-1 bg-white border shadow-xl p-3.5 rounded z-30 w-56 text-gray-700 font-normal leading-relaxed text-[11px] transition-all">
                      <p className="font-bold text-gray-950 text-xs mb-1">Simulated Mail Receipt</p>
                      <p className="font-medium">Direct Delivery Express</p>
                      <p className="mt-1">{order.shippingAddress}</p>
                    </div>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end leading-tight">
                  <span className="text-[10px] text-gray-500 uppercase">Order ID #{order.id}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <button
                      onClick={() => handleCopyOrderId(order.id)}
                      className="text-[11px] text-amzn-blue hover:text-amzn-orange font-bold flex items-center gap-0.5"
                    >
                      <Clipboard className="w-3 h-3" />
                      {copiedId === order.id ? 'Copied' : 'Copy'}
                    </button>
                    <span className="text-gray-400">|</span>
                    <button
                      onClick={() => setShowInvoiceId(showInvoiceId === order.id ? null : order.id)}
                      className="text-[11px] text-amzn-blue hover:text-amzn-orange font-bold flex items-center gap-0.5"
                    >
                      <span>Invoice</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Invoice Breakdown sheet Overlay section */}
              {showInvoiceId === order.id && (
                <div className="bg-amber-50/50 border-b p-4 text-xs text-gray-700 animate-in slide-in-from-top duration-200">
                  <div className="flex items-center justify-between font-bold text-gray-900 border-b pb-2 mb-3">
                    <span>Invoice Statement - #{order.id}</span>
                    <span className="text-emerald-700 text-[11px] bg-emerald-100/50 px-2 py-0.5 rounded">Paid via {order.paymentMethod}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="font-bold text-gray-800 text-[10px] uppercase mb-1">Registered Address</p>
                      <p className="leading-relaxed text-gray-600">{order.shippingAddress}</p>
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-[10px] uppercase mb-1 font-sans">Payment Details</p>
                      <p className="text-gray-600">{order.paymentMethod}</p>
                      <p className="font-bold text-gray-900 mt-2">Paid Amount: ₹{order.subtotal.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Card Content list */}
              <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Product details Column */}
                <div className="md:col-span-2 space-y-4">
                  
                  {/* Fulfillment Title status */}
                  <div className="text-base font-extrabold text-gray-950 flex items-center gap-1.5 flex-wrap">
                    <span className={
                      order.status === 'Preparing' ? 'text-amber-600' :
                      order.status === 'Shipped' ? 'text-blue-600' :
                      order.status === 'Out for Delivery' ? 'text-purple-600' :
                      order.status === 'Returned' ? 'text-red-650 bg-red-50/50 px-2 py-0.5 rounded border border-red-100' :
                      order.status === 'Return Requested' ? 'text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200' :
                      order.status === 'Replacement In-Transit' ? 'text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-bold' :
                      'text-green-700'
                    }>
                      {order.status}
                    </span>
                    <span className="text-xs text-gray-500 font-normal">
                      &bull; Expected standard arrival: <span className="font-semibold text-gray-850">{order.expectedDelivery}</span>
                    </span>
                  </div>

                  {/* Items list inside order */}
                  <div className="space-y-3">
                    {order.items.map((item) => (
                      <div key={item.product.id} className="flex gap-4 p-2 bg-gray-50/50 rounded border border-gray-100">
                        <div className="w-16 h-16 bg-white p-1 rounded flex items-center justify-center border shrink-0">
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            className="max-h-full max-w-full object-contain referrer-override"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-grow min-w-0">
                          <h4 className="text-xs font-bold text-gray-900 line-clamp-2 leading-tight">
                            {item.product.name}
                          </h4>
                          <p className="text-[10px] text-gray-500 mt-1 font-medium">
                            Quantity: <span className="font-semibold text-gray-800">{item.quantity}</span> &bull; Price: <span className="font-bold text-gray-900">₹{item.product.price.toLocaleString('en-IN')}</span>
                          </p>
                          <div className="flex gap-2.5 mt-2">
                            <button
                              onClick={() => onAddToCart(item.product, item.selectedColor, item.selectedSize)}
                              className="px-2.5 py-1 bg-amzn-yellow hover:bg-amzn-orange text-[10px] font-semibold text-gray-900 rounded border border-amber-600/30 shadow-xs transition-colors cursor-pointer"
                            >
                              Add to Basket again
                            </button>
                            <button
                              onClick={() => setReviewOrderAndProduct({ orderId: order.id, productId: item.product.id })}
                              className="px-2.5 py-1 text-gray-700 hover:text-gray-900 border border-gray-300 hover:bg-gray-150 text-[10px] font-semibold rounded bg-white transition-all cursor-pointer flex items-center gap-0.5"
                            >
                              <MessageSquare className="w-3 h-3 text-amzn-orange" />
                              <span>Write Customer Review</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>

                {/* Tracking & Quick Actions Right Column */}
                <div className="flex flex-col gap-2 bg-gray-50/50 p-4 rounded-lg border">
                  <p className="font-bold text-gray-950 text-xs tracking-wide border-b pb-1.5 mb-2 uppercase">Actions Panel</p>
                  
                  <button
                    onClick={() => setShowTrackingId(showTrackingId === order.id ? null : order.id)}
                    className="w-full text-center bg-white hover:bg-gray-50 text-gray-800 border rounded py-1.5 text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 hover:border-gray-400"
                  >
                    <Package className="w-3.5 h-3.5 text-amzn-orange" />
                    <span>Track Simulated Shipment</span>
                  </button>

                  <button
                    onClick={() => {
                      if (order.status === 'Returned' || order.status === 'Return Requested') return;
                      setSelectedReturnOrder(order);
                      setReturnReason('Item defective / doesn\'t work');
                      setReturnActionType('refund');
                    }}
                    disabled={order.status === 'Returned' || order.status === 'Return Requested'}
                    className={`w-full text-center border rounded py-1.5 text-xs font-medium shadow-xs transition-all flex items-center justify-center gap-1.5 ${
                      order.status === 'Returned' || order.status === 'Return Requested'
                        ? 'bg-gray-100 text-gray-400 border-gray-250 cursor-not-allowed'
                        : 'bg-white hover:bg-gray-50 text-gray-850 cursor-pointer hover:border-gray-400 active:scale-98'
                    }`}
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${order.status === 'Returned' || order.status === 'Return Requested' ? 'text-gray-300' : 'text-gray-400'}`} />
                    <span>
                      {order.status === 'Returned' ? 'Return Complete' :
                       order.status === 'Return Requested' ? 'Return Requested' :
                       order.status === 'Replacement In-Transit' ? 'Configure Replacement' :
                       'Return or Replace Item'}
                    </span>
                  </button>

                  <div className="text-[10px] text-gray-500 leading-normal font-medium p-1 mt-1 text-center bg-amber-50 border border-amber-100/70 rounded">
                    Enjoy our localization. Return eligibility is free and open inside our portfolios.
                  </div>
                </div>

              </div>

              {/* Dynamic shipment tracking stepper */}
              {showTrackingId === order.id && (
                <div className="border-t bg-slate-900 text-white p-5 animate-in slide-in-from-top duration-250">
                  <div className="flex items-center justify-between mb-4.5 border-b border-white/10 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amzn-orange">Real-Time Transit Stepper Tracker</span>
                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-gray-300">Carrier: Amazon Digital Logistics</span>
                  </div>

                  <div className="relative flex flex-col md:flex-row justify-between items-center gap-6 md:gap-2 max-w-2xl mx-auto pt-4 pb-2">
                    {/* Stepper progress connector line */}
                    <div className="absolute top-[22px] left-8 right-8 h-1 bg-white/20 hidden md:block z-0">
                      <div className="bg-amzn-orange h-full transition-all" style={{
                        width: order.status === 'Preparing' ? '15%' :
                               order.status === 'Shipped' ? '45%' :
                               order.status === 'Out for Delivery' ? '75%' : '100%'
                      }}></div>
                    </div>

                    {/* Step 1: Placed */}
                    <div className="flex flex-row md:flex-col items-center gap-3 md:gap-1.5 text-center relative z-10 w-full md:w-auto">
                      <div className="w-10 h-10 rounded-full bg-amzn-orange border-2 border-slate-950 flex items-center justify-center shrink-0">
                        <Check className="w-5 h-5 text-gray-900 stroke-[3px]" />
                      </div>
                      <div className="text-left md:text-center leading-tight">
                        <p className="text-xs font-bold text-white">Order Placed</p>
                        <p className="text-[10px] text-gray-400 font-medium">Verified Receipt</p>
                      </div>
                    </div>

                    {/* Step 2: Preparing */}
                    <div className="flex flex-row md:flex-col items-center gap-3 md:gap-1.5 text-center relative z-10 w-full md:w-auto">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 border-slate-950 ${
                        ['Preparing', 'Shipped', 'Out for Delivery', 'Delivered'].includes(order.status)
                          ? 'bg-amzn-orange' : 'bg-slate-800'
                      }`}>
                        {['Shipped', 'Out for Delivery', 'Delivered'].includes(order.status) ? (
                          <Check className="w-5 h-5 text-gray-900 stroke-[3px]" />
                        ) : (
                          <span className="text-xs font-extrabold text-[#333]">2</span>
                        )}
                      </div>
                      <div className="text-left md:text-center leading-tight">
                        <p className={`text-xs font-bold ${['Preparing', 'Shipped', 'Out for Delivery', 'Delivered'].includes(order.status) ? 'text-white' : 'text-gray-500'}`}>Preparing</p>
                        <p className="text-[10px] text-gray-400 font-medium">Boxed & Labelled</p>
                      </div>
                    </div>

                    {/* Step 3: Shipped */}
                    <div className="flex flex-row md:flex-col items-center gap-3 md:gap-1.5 text-center relative z-10 w-full md:w-auto">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 border-slate-950 ${
                        ['Shipped', 'Out for Delivery', 'Delivered'].includes(order.status)
                          ? 'bg-amzn-orange' : 'bg-slate-800'
                      }`}>
                        {['Out for Delivery', 'Delivered'].includes(order.status) ? (
                          <Check className="w-5 h-5 text-gray-900 stroke-[3px]" />
                        ) : (
                          <span className="text-xs font-extrabold text-[#333]">3</span>
                        )}
                      </div>
                      <div className="text-left md:text-center leading-tight">
                        <p className={`text-xs font-bold ${['Shipped', 'Out for Delivery', 'Delivered'].includes(order.status) ? 'text-white' : 'text-gray-500'}`}>Shipped</p>
                        <p className="text-[10px] text-gray-400 font-medium">In Transit Noida</p>
                      </div>
                    </div>

                    {/* Step 4: Delivered */}
                    <div className="flex flex-row md:flex-col items-center gap-3 md:gap-1.5 text-center relative z-10 w-full md:w-auto">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 border-slate-950 ${
                        order.status === 'Delivered' ? 'bg-amzn-orange' : 'bg-slate-800'
                      }`}>
                        {order.status === 'Delivered' ? (
                          <Check className="w-5 h-5 text-gray-900 stroke-[3px]" />
                        ) : (
                          <span className="text-xs font-extrabold text-[#333]">4</span>
                        )}
                      </div>
                      <div className="text-left md:text-center leading-tight">
                        <p className={`text-xs font-bold ${order.status === 'Delivered' ? 'text-white' : 'text-gray-500'}`}>Delivered</p>
                        <p className="text-[10px] text-gray-400 font-medium font-sans">Handed to Buyer</p>
                      </div>
                    </div>

                  </div>
                </div>
              )}

            </div>
          ))}
        </div>
      )}

      {/* Write a product review popup modal */}
      {reviewOrderAndProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full border shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-extrabold text-gray-900 mb-2">Write simulated customer review</h3>
            <p className="text-xs text-gray-500 leading-relaxed mb-4">
              Amazon uses true verified ratings to highlight reliable product configurations. Share your thoughts!
            </p>

            <form onSubmit={submitReview} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-750 mb-1.5">Rating stars</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRating(star)}
                      className="text-amber-500 hover:scale-110 transition-transform p-1"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill={star <= rating ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        className="w-8 h-8 pointer-events-none"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.48 3.499c.174-.427.802-.427.976 0l2.22 5.454 5.918.452c.473.036.663.618.321.956l-4.28 4.234 1.294 5.86c.104.472-.405.842-.818.571l-5.18-3.414-5.18 3.414c-.413.271-.922-.099-.818-.571l1.293-5.86-4.28-4.234c-.342-.338-.152-.92.32-.956l5.919-.452 2.22-5.454z" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-755 mb-1">Your review body</label>
                <textarea
                  rows={4}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="What did you like or dislike about the shipping, style, features, and performance?"
                  className="w-full border border-gray-450 focus:border-amzn-orange focus:ring-1 focus:ring-amzn-orange rounded px-3 py-2 text-xs outline-none text-gray-900 font-sans"
                  required
                ></textarea>
              </div>

              {reviewSubmitted && (
                <div className="text-xs text-green-700 font-semibold bg-green-50 p-2.5 rounded flex items-center gap-1.5 border border-green-200">
                  <Check className="w-4 h-4 text-green-600 stroke-[3px]" />
                  <span>Review logged successfully to session logs!</span>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewOrderAndProduct(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-150 rounded border cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amzn-yellow hover:bg-amzn-orange text-xs font-bold text-gray-950 rounded border border-amber-600/30 shadow transition-colors cursor-pointer"
                >
                  Post Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Choose Return or Replacement Dialog Modal */}
      {selectedReturnOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full border shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-gray-900 font-sans">Return or Replace Items</h3>
                <p className="text-[10.5px] text-gray-500 font-medium">Order ID: #{selectedReturnOrder.id}</p>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedReturnOrder(null)}
                className="text-gray-400 hover:text-gray-700 text-lg font-bold p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleReturnSubmit} className="space-y-4 text-xs">
              
              {/* Reason list selector dropdown */}
              <div>
                <label className="block font-bold text-gray-800 mb-1.5 text-xs text-left">Why are you returning this?</label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full bg-white border border-gray-350 rounded px-2.5 py-2 text-xs text-gray-900 font-medium outline-none focus:border-amzn-orange focus:ring-1 focus:ring-amzn-orange cursor-pointer"
                >
                  <option value="Item defective / doesn't work">Item defective / doesn't work</option>
                  <option value="Incorrect size or color received">Incorrect size or color received</option>
                  <option value="Better price available elsewhere">Better price available elsewhere</option>
                  <option value="Product performance was not satisfactory">Product performance was not satisfactory</option>
                  <option value="No longer needed / bought by mistake">No longer needed / bought by mistake</option>
                </select>
              </div>

              {/* Items checklist */}
              <div>
                <label className="block font-bold text-gray-800 mb-1 text-xs text-left">Items to process:</label>
                <div className="border rounded bg-gray-50/50 p-2.5 max-h-36 overflow-y-auto space-y-2">
                  {selectedReturnOrder.items.map((item) => (
                    <div key={item.product.id} className="flex gap-2.5 items-center bg-white p-1.5 rounded border border-gray-200">
                      <div className="w-8 h-8 border rounded shrink-0 p-0.5 bg-white">
                        <img 
                          src={item.product.imageUrl} 
                          alt="" 
                          className="max-h-full max-w-full object-contain mx-auto"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-gray-900 truncate">{item.product.name}</p>
                        <p className="text-[10px] text-gray-500 font-medium">Quantity selected: {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action layout selectors */}
              <div>
                <label className="block font-bold text-gray-800 mb-2 text-xs text-left">Select shipment resolution:</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Refund Card */}
                  <div 
                    onClick={() => setReturnActionType('refund')}
                    className={`p-3 border rounded-lg cursor-pointer transition-all text-left flex flex-col justify-between ${
                      returnActionType === 'refund' 
                        ? 'border-amzn-orange bg-amber-50/30 ring-1 ring-amzn-orange' 
                        : 'border-gray-250 hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <p className="font-extrabold text-gray-950 text-xs">Refund to Amazon Pay</p>
                      <p className="text-[10px] text-gray-500 leading-relaxed mt-1 font-medium">
                        Instant refund of <span className="font-bold text-gray-800">₹{selectedReturnOrder.subtotal.toLocaleString('en-IN')}</span> will be credited directly to your digital wallet balance.
                      </p>
                    </div>
                    <span className={`text-[10px] mt-2 font-bold ${returnActionType === 'refund' ? 'text-amzn-orange' : 'text-gray-400'}`}>
                      {returnActionType === 'refund' ? '● Selected Option' : '○ Choose Refund'}
                    </span>
                  </div>

                  {/* Replacement Card */}
                  <div 
                    onClick={() => setReturnActionType('replace')}
                    className={`p-3 border rounded-lg cursor-pointer transition-all text-left flex flex-col justify-between ${
                      returnActionType === 'replace' 
                        ? 'border-amzn-orange bg-amber-50/30 ring-1 ring-amzn-orange' 
                        : 'border-gray-250 hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <p className="font-extrabold text-gray-950 text-xs">Expedited Replacement</p>
                      <p className="text-[10px] text-gray-500 leading-relaxed mt-1 font-medium">
                        We will dispatch an exchange package of the identical selections for instant Noida express drop-off today.
                      </p>
                    </div>
                    <span className={`text-[10px] mt-2 font-bold ${returnActionType === 'replace' ? 'text-amzn-orange' : 'text-gray-400'}`}>
                      {returnActionType === 'replace' ? '● Selected Option' : '○ Choose Replacement'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Loader processes */}
              {isSubmitProcess && (
                <div className="text-xs text-gray-700 bg-gray-50 border p-2.5 rounded flex items-center justify-center gap-2 font-semibold">
                  <RefreshCw className="w-4 h-4 text-amzn-orange animate-spin" />
                  <span>Transmitting return logs securely with Amazon systems...</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setSelectedReturnOrder(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-150 rounded border cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSubmitProcess}
                  className="px-5 py-2 bg-amzn-yellow hover:bg-amzn-orange text-xs font-bold text-gray-950 rounded border border-amber-600/30 shadow transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  Confirm Return & Replace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
