// File: src/components/DealsInProgress.jsx
import React, { useState, useEffect } from 'react';
import { Zap, TrendingUp } from 'lucide-react';
import API from '../utils/api';
import { toast } from 'react-hot-toast';

// Complete mock deals with international transactions
const mockDeals = [
  {
    buyer: 'Sarah Johnson',
    seller: 'Kelvin Ugo',
    itemName: 'iPhone 14 Pro Purchase',
    location: 'Lagos, Nigeria',
    condition: 'Fairly used',
    amount: '$1,200',
    status: 'In Escrow 🔒',
  },
  {
    buyer: 'Helena Schmidt',
    seller: 'Web Dev Agency',
    itemName: 'Web Development Services',
    location: 'Berlin, Germany',
    condition: 'New',
    amount: '$4,200',
    status: 'Locked 🔒',
  },
  {
    buyer: 'Thomas Chen',
    seller: 'Amazon Global',
    itemName: 'Amazon International Order',
    location: 'Shanghai, China',
    condition: 'New',
    amount: '$850',
    status: 'Pending ⏳',
  },
  {
    buyer: 'Bryan Rodriguez',
    seller: 'Design Co.',
    itemName: 'Design Contract',
    location: 'Mexico City, Mexico',
    condition: 'N/A',
    amount: '$1,500',
    status: 'Secured 🔒',
  },
  {
    buyer: 'Kelvin Williams',
    seller: 'Crypto Exchange',
    itemName: 'Crypto Exchange',
    location: 'Dubai, UAE',
    condition: 'N/A',
    amount: '$7,500',
    status: 'Locked 🔒',
  },
  {
    buyer: 'Mike Anderson',
    seller: 'Used Cars Ltd',
    itemName: 'Used Car Purchase',
    location: 'London, UK',
    condition: 'Good',
    amount: '$12,800',
    status: 'In Progress ⏳',
  },
  {
    buyer: 'Tina Patel',
    seller: 'Furniture Co.',
    itemName: 'Furniture Delivery',
    location: 'Mumbai, India',
    condition: 'New',
    amount: '$2,100',
    status: 'Completed ✅',
  },
  {
    buyer: 'Joe Kim',
    seller: 'Freelance Video Editor',
    itemName: 'Freelance Video Edit',
    location: 'Seoul, South Korea',
    condition: 'N/A',
    amount: '$600',
    status: 'In Escrow 🔒',
  },
  {
    buyer: 'Amanda Silva',
    seller: 'School ABC',
    itemName: 'International School Payment',
    location: 'São Paulo, Brazil',
    condition: 'N/A',
    amount: '$3,500',
    status: 'Active 🔵',
  },
  {
    buyer: 'Chloe Martin',
    seller: 'Consulting Firm',
    itemName: 'Consulting Payment',
    location: 'Paris, France',
    condition: 'N/A',
    amount: '$2,800',
    status: 'Escrowed 🔒',
  },
  {
    buyer: 'David Wilson',
    seller: 'Tech Startup',
    itemName: 'Software License',
    location: 'Toronto, Canada',
    condition: 'Digital',
    amount: '$1,200',
    status: 'Processing 🔄',
  },
  {
    buyer: 'Maria Garcia',
    seller: 'Fashion Boutique',
    itemName: 'Luxury Handbag',
    location: 'Madrid, Spain',
    condition: 'Brand New',
    amount: '$2,300',
    status: 'Shipped 📦',
  },
  {
    buyer: 'James Brown',
    seller: 'Electronics Store',
    itemName: 'Gaming Laptop',
    location: 'Sydney, Australia',
    condition: 'Refurbished',
    amount: '$1,800',
    status: 'Delivered ✅',
  },
  {
    buyer: 'Lisa Taylor',
    seller: 'Art Gallery',
    itemName: 'Original Painting',
    location: 'Rome, Italy',
    condition: 'Antique',
    amount: '$5,600',
    status: 'Verified ✅',
  },
  {
    buyer: 'Robert Lee',
    seller: 'Real Estate Co.',
    itemName: 'Property Deposit',
    location: 'Singapore',
    condition: 'N/A',
    amount: '$25,000',
    status: 'Secured 🔒',
  }
];

const DealsInProgress = () => {
  const [allDeals, setAllDeals] = useState(mockDeals);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch real deals from backend
  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const res = await API.get('/escrow/public');
        
        if (res.data.success && Array.isArray(res.data.deals) && res.data.deals.length > 0) {
          const realDeals = res.data.deals.map((deal) => ({
            buyer: 'User',
            seller: 'Seller',
            itemName: deal.title || 'Transaction',
            location: 'Online',
            condition: deal.category === 'services' ? 'N/A' : 'New',
            amount: `$${deal.amount}`,
            status: 'Completed ✅',
          }));
          setAllDeals([...realDeals, ...mockDeals]);
        }
      } catch (err) {
        console.error('Failed to fetch real deals:', err.message);
      }
    };

    fetchDeals();
  }, []);

  // Cycle through deals every 7 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % allDeals.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [allDeals]);

  const currentDeal = allDeals[currentIndex];

  return (
    <section className="py-16 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4">
        {/* Section Title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 px-4 py-2 rounded-full mb-4">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold text-green-700 dark:text-green-400">LIVE TRANSACTIONS</span>
          </div>
          <div className="flex items-center justify-center gap-3 mb-3">
            <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              Deals in Progress
            </h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time transactions happening right now on Dealcross
          </p>
        </div>

        {/* Deal Card - Professional Clean Design */}
        <div className="max-w-2xl mx-auto">
          <div
            key={currentIndex}
            className="bg-white dark:bg-gray-950 rounded-2xl shadow-lg border-2 border-gray-200 dark:border-gray-800 p-6 md:p-8 transition-all duration-500 hover:shadow-xl hover:border-blue-500 dark:hover:border-blue-400"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {currentDeal?.itemName}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{currentDeal?.buyer}</span>
                  {' '} purchasing from {' '}
                  <span className="font-semibold text-green-600 dark:text-green-400">{currentDeal?.seller}</span>
                </p>
              </div>
              <div className="flex-shrink-0 ml-4">
                <span className="inline-flex items-center px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold rounded-full">
                  {currentDeal?.status}
                </span>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-1 font-medium">Location</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {currentDeal?.location}
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-1 font-medium">Condition</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {currentDeal?.condition}
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800 sm:col-span-2">
                <p className="text-xs text-blue-600 dark:text-blue-400 mb-1 font-medium">Escrow Amount</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {currentDeal?.amount}
                </p>
              </div>
            </div>

            {/* Security Badge */}
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Protected by Dealcross Escrow</span>
            </div>
          </div>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mt-8">
          {allDeals.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'w-8 bg-blue-600 dark:bg-blue-400'
                  : 'w-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600'
              }`}
              aria-label={`Go to transaction ${index + 1}`}
            />
          ))}
        </div>

        {/* Live Stats */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700">
            <svg className="w-4 h-4 text-green-500 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Live updates every 7 seconds • <span className="font-semibold text-blue-600 dark:text-blue-400">{allDeals.length}</span> active transactions worldwide
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DealsInProgress;
