import React, { useState } from 'react';
import { X, Smartphone, TrendingUp, ShieldCheck, CheckCircle2, History, CreditCard, Gift } from 'lucide-react';

interface AmazonPayModalProps {
  onClose: () => void;
  walletBalance: number;
  setWalletBalance: React.Dispatch<React.SetStateAction<number>>;
}

interface Transaction {
  id: string;
  title: string;
  date: string;
  amount: number;
  type: 'credit' | 'debit';
  status: 'Completed' | 'Refunded';
}

export default function AmazonPayModal({
  onClose,
  walletBalance,
  setWalletBalance,
}: AmazonPayModalProps) {
  const [mobileNum, setMobileNum] = useState('');
  const [operator, setOperator] = useState('Jio');
  const [packPrice, setPackPrice] = useState('239');
  const [rechargingState, setRechargingState] = useState<'idle' | 'processing' | 'done'>('idle');
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: 'TX-902', title: 'Refund for Voltas Multi-Filter', date: 'June 10, 2026', amount: 800, type: 'credit', status: 'Completed' },
    { id: 'TX-811', title: 'Cashback: Cotton Bedsheets order', date: 'June 08, 2026', amount: 45, type: 'credit', status: 'Completed' },
    { id: 'TX-322', title: 'Mobile Recharge Airtel Postpaid', date: 'May 28, 2026', amount: 399, type: 'debit', status: 'Completed' },
    { id: 'TX-105', title: 'Wallet Balance Top-up', date: 'May 04, 2026', amount: 1500, type: 'credit', status: 'Completed' },
  ]);

  const rechargePacks = [
    { price: '239', desc: '1.5 GB/Day, Unlimited Calls, 28 Days' },
    { price: '299', desc: '2.0 GB/Day, Unlimited Calls, 28 Days + Prime Video' },
    { price: '666', desc: '1.5 GB/Day, Unlimited Call sweeps, 84 Days' },
    { price: '1299', desc: '2.5 GB/Day, Unlimited 5G speed, 365 Days' },
  ];

  const handleRechargeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mobileNum.trim().length !== 10 || isNaN(Number(mobileNum))) {
      alert('Please enter a valid 10-digit Indian Mobile phone number.');
      return;
    }

    const price = Number(packPrice);
    if (walletBalance < price) {
      alert('Insufficient Amazon Pay wallet balance. Please top up your wallet or add a debit card.');
      return;
    }

    setRechargingState('processing');
    
    setTimeout(() => {
      // Deduct balance
      setWalletBalance((prev) => prev - price);
      // Append transaction
      const newTx: Transaction = {
        id: `TX-${(Math.floor(100 + Math.random() * 900))}`,
        title: `Mobile Recharge ${operator} (${mobileNum})`,
        date: 'Today',
        amount: price,
        type: 'debit',
        status: 'Completed',
      };
      setTransactions((prev) => [newTx, ...prev]);
      setRechargingState('done');
    }, 1500);
  };

  const handleWalletAddMoney = () => {
    setWalletBalance((prev) => prev + 1000);
    const newTx: Transaction = {
      id: `TX-${(Math.floor(100 + Math.random() * 900))}`,
      title: 'Wallet Top-up via Simulated NetBanking',
      date: 'Today',
      amount: 1000,
      type: 'credit',
      status: 'Completed',
    };
    setTransactions((prev) => [newTx, ...prev]);
    alert('Simulated payment of ₹1,000 processed! Your Amazon Pay balance has been credited.');
  };

  return (
    <div id="amazon-pay-modal" className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs select-none text-gray-800">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col relative animate-in fade-in zoom-in-95 duration-200 border">
        
        {/* Close Modal Header */}
        <div className="bg-gradient-to-r from-[#141b24] to-[#253243] text-white px-6 py-4 flex items-center justify-between border-b shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xl font-black tracking-tight text-white font-sans">
              amazon<span className="text-amzn-orange text-sm font-medium"> pay</span>
            </span>
            <span className="text-xs bg-emerald-600 text-white font-bold px-2 py-0.5 rounded">UPI Live</span>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-300 hover:text-white transition-colors p-1"
            title="Close Pay Modal"
          >
            <X className="w-5.5 h-5.5" />
          </button>
        </div>

        {/* Dashboard Panels */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Column 1: Balance Details */}
          <div className="lg:col-span-1 border rounded-lg p-5 bg-gradient-to-b from-gray-50 to-white flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Gift className="w-5 h-5 text-amber-500" />
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Active Balance</h4>
              </div>

              <div className="space-y-1">
                <p className="text-3xl font-extrabold text-blue-950">
                  ₹{walletBalance.toLocaleString('en-IN')}
                </p>
                <span className="text-[11px] text-gray-500 block font-medium">Amazon Pay Balance (Stored Wallet)</span>
              </div>

              <div className="mt-5 border-t pt-4 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Active UPI ID:</span>
                  <span className="font-bold text-gray-800">ishaan@apl</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Savings Earned:</span>
                  <span className="font-extrabold text-emerald-650">₹240</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Account status:</span>
                  <span className="text-emerald-700 font-bold">KYC Verified</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleWalletAddMoney}
              className="mt-6 w-full text-center bg-gray-100 hover:bg-gray-200 text-gray-800 border py-2 text-xs font-semibold rounded cursor-pointer transition-colors"
            >
              + Load ₹1,000 Simulated Cash
            </button>
          </div>

          {/* Column 2: Mobile Recharge Action Form */}
          <div className="lg:col-span-1 border rounded-lg p-5 bg-white shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <Smartphone className="w-5 h-5 text-blue-600" />
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Mobile Recharge</h4>
            </div>

            {rechargingState === 'idle' && (
              <form onSubmit={handleRechargeSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-750 mb-1 font-sans">Mobile Number</label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="Ten digit cellphone number"
                    value={mobileNum}
                    onChange={(e) => setMobileNum(e.target.value)}
                    className="w-full border border-gray-300 focus:border-amzn-orange focus:ring-1 focus:ring-amzn-orange rounded px-3 py-2 text-xs outline-none text-gray-950 font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-755 mb-1">Operator</label>
                    <select
                      title="Mobile Operator"
                      value={operator}
                      onChange={(e) => setOperator(e.target.value)}
                      className="w-full border rounded px-2.5 py-1.5 text-xs bg-white text-gray-900 border-gray-300 outline-none"
                    >
                      <option value="Jio">Jio India</option>
                      <option value="Airtel">Airtel</option>
                      <option value="Vi">Vi (Vodafone Idea)</option>
                      <option value="BSNL">BSNL</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-755 mb-1">Circle</label>
                    <select title="Mobile Circle" className="w-full border rounded px-2.5 py-1.5 text-xs bg-white text-gray-900 border-gray-300">
                      <option>Delhi NCR</option>
                      <option>Mumbai</option>
                      <option>Karnataka</option>
                      <option>Maharashtra</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-755 mb-1.5 font-medium">Select package</label>
                  <div className="flex flex-col gap-2 max-h-32 overflow-y-auto border rounded p-1.5 scrollbar-thin bg-gray-50">
                    {rechargePacks.map((pk) => (
                      <label key={pk.price} className="flex items-start gap-2 text-xs cursor-pointer hover:bg-white p-1.5 rounded transition-colors">
                        <input
                          type="radio"
                          name="pack"
                          value={pk.price}
                          checked={packPrice === pk.price}
                          onChange={() => setPackPrice(pk.price)}
                          className="accent-amzn-orange mt-0.5 shrink-0"
                        />
                        <div className="leading-normal">
                          <span className="font-extrabold text-gray-950">₹{pk.price}</span>
                          <span className="block text-[10px] text-gray-500">{pk.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full text-center bg-amzn-yellow hover:bg-amzn-orange text-gray-900 border border-amber-600/30 rounded py-2 text-xs font-bold shadow-xs cursor-pointer transition-colors"
                >
                  Confirm & Pay ₹{packPrice}
                </button>
              </form>
            )}

            {rechargingState === 'processing' && (
              <div className="py-12 text-center flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <h5 className="text-sm font-bold text-gray-900">Routing simulated payment...</h5>
                <p className="text-[11px] text-gray-500 mt-1">Deducting ₹{packPrice} from pay ledger</p>
              </div>
            )}

            {rechargingState === 'done' && (
              <div className="py-8 text-center flex flex-col items-center justify-center">
                <div className="bg-green-100 text-green-700 p-2.5 rounded-full border border-green-200 mb-3 animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h5 className="text-sm font-bold text-green-700">Recharge Successful!</h5>
                <p className="text-[11px] text-gray-500 px-4 leading-normal mt-1">
                  Recharge of ₹{packPrice} sent to mobile {mobileNum} successfully. Statement credited.
                </p>
                <button
                  onClick={() => {
                    setMobileNum('');
                    setRechargingState('idle');
                  }}
                  className="mt-5 border px-4 py-1.5 text-xs text-blue-600 font-bold hover:underline hover:bg-gray-50 rounded"
                >
                  Pay Another
                </button>
              </div>
            )}

          </div>

          {/* Column 3: Transactions List */}
          <div className="lg:col-span-1 border rounded-lg p-5 bg-white shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-purple-600" />
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Payments History</h4>
            </div>

            <div className="space-y-3.5 max-h-[300px] overflow-y-auto scrollbar-thin">
              {transactions.map((tx) => (
                <div key={tx.id} className="border-b pb-2.5 last:border-0 last:pb-0 flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-950 truncate max-w-[170px]" title={tx.title}>
                      {tx.title}
                    </p>
                    <span className="text-[10px] text-gray-400 block mt-0.5">{tx.date}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-extrabold ${tx.type === 'credit' ? 'text-green-600' : 'text-gray-900'}`}>
                      {tx.type === 'credit' ? '+' : '-'} ₹{tx.amount}
                    </span>
                    <span className="block text-[9px] text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded-xs mt-0.5 font-bold">
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer info */}
        <div className="bg-gray-50 border-t px-6 py-4.5 text-[11px] text-gray-500 leading-normal font-normal">
          This workspace provides simulated payments. Real money is never handled. Always observe strict online safety keys.
        </div>

      </div>
    </div>
  );
}
