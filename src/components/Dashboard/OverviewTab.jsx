import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  ShoppingCart, 
  Store, 
  DollarSign,
  Clock,
  CheckCircle,
  Package,
  Plus,
  ArrowRight
} from 'lucide-react';

import StatsCard from 'components/Dashboard/StatsCard';
import EscrowCard from 'components/Dashboard/EscrowCard';
import escrowService from 'services/escrowService';
import toast from 'react-hot-toast';

// ✅ Added imports
import VolumeChart from 'components/Dashboard/Charts/VolumeChart';
import PieChartComponent from 'components/Dashboard/Charts/PieChartComponent';
import StatusDonutChart from 'components/Dashboard/Charts/StatusDonutChart';

const OverviewTab = ({ user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  
  // ✅ Add ref to prevent duplicate fetches
  const hasFetchedData = useRef(false);

  useEffect(() => {
    // ✅ Only fetch once
    if (!hasFetchedData.current) {
      hasFetchedData.current = true;
      fetchOverviewData();
    }
  }, []); // ✅ Empty dependency array is fine now

  const fetchOverviewData = async () => {
    try {
      setLoading(true);
      const response = await escrowService.getDashboardStats();
      
      if (response.success) {
        setStats(response.data);
        setRecentTransactions(response.data.recentTransactions || []);
      }
    } catch (error) {
      console.error('Failed to fetch overview data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = async (escrowId, action) => {
    navigate(`/escrow/${escrowId}`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <StatsCard key={i} loading={true} />
          ))}
        </div>
      </div>
    );
  }

  const buyingStats = stats?.buying || {};
  const sellingStats = stats?.selling || {};
  const totalTransactions = stats?.totalTransactions || 0;
  const totalValue = stats?.totalValue || 0;

  return (
    <div className="space-y-8">
      {/* Quick Stats Grid */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Transactions"
            value={totalTransactions}
            icon={Package}
            color="blue"
            trend="up"
            trendValue="+12%"
          />
          <StatsCard
            title="Total Volume"
            value={`$${totalValue.toLocaleString()}`}
            icon={DollarSign}
            color="green"
            trend="up"
            trendValue="+8%"
          />
          <StatsCard
            title="Active Deals"
            value={(buyingStats.pending || 0) + (buyingStats.funded || 0) + (sellingStats.pending || 0) + (sellingStats.funded || 0)}
            icon={Clock}
            color="orange"
          />
          <StatsCard
            title="Completed"
            value={(buyingStats.completed || 0) + (sellingStats.completed || 0)}
            icon={CheckCircle}
            color="purple"
            trend="up"
            trendValue="+15%"
          />
        </div>
      </div>

      {/* Buying vs Selling Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Buying Summary */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Buying</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Your purchases</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/dashboard?tab=buying')}
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
            >
              View all →
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Purchases</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">{buyingStats.total || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">In Progress</span>
              <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                {(buyingStats.funded || 0) + (buyingStats.delivered || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">Completed</span>
              <span className="text-lg font-bold text-green-600 dark:text-green-400">{buyingStats.completed || 0}</span>
            </div>
          </div>
        </div>

        {/* Selling Summary */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Store className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Selling</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Your sales</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/dashboard?tab=selling')}
              className="text-purple-600 dark:text-purple-400 hover:underline text-sm font-medium"
            >
              View all →
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Sales</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">{sellingStats.total || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">In Progress</span>
              <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                {(sellingStats.funded || 0) + (sellingStats.delivered || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Earned</span>
              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                ${(buyingStats.totalValue || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Charts Section */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Analytics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <PieChartComponent 
            data={[
              { name: 'Buying', value: buyingStats.totalValue || 0, color: '#3B82F6' },
              { name: 'Selling', value: sellingStats.totalValue || 0, color: '#8B5CF6' }
            ]}
          />
          <StatusDonutChart 
            data={[
              { name: 'Completed', value: (buyingStats.completed || 0) + (sellingStats.completed || 0), color: '#10B981' },
              { name: 'In Progress', value: (buyingStats.funded || 0) + (buyingStats.delivered || 0), color: '#F59E0B' },
              { name: 'Pending', value: (buyingStats.pending || 0) + (sellingStats.pending || 0), color: '#3B82F6' },
              { name: 'Disputed', value: (buyingStats.disputed || 0) + (sellingStats.disputed || 0), color: '#EF4444' }
            ]}
          />
        </div>
        <VolumeChart />
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Activity</h2>
          <button
            onClick={() => navigate('/dashboard?tab=all')}
            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
          >
            View all transactions
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {recentTransactions.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {recentTransactions.slice(0, 6).map((escrow) => {
              const userRole = escrow.buyer._id === user.id ? 'buyer' : 'seller';
              return (
                <EscrowCard
                  key={escrow._id}
                  escrow={escrow}
                  userRole={userRole}
                  onQuickAction={handleQuickAction}
                />
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No transactions yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Get started by creating your first escrow transaction
            </p>
            <button
              onClick={() => navigate('/dashboard?action=create')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              <Plus className="w-5 h-5" />
              Create Escrow
            </button>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <h3 className="text-xl font-bold mb-2">Ready to transact safely?</h3>
        <p className="text-blue-100 mb-4">Create an escrow deal and let us handle the security</p>
        <button
          onClick={() => navigate('/dashboard?action=create')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition"
        >
          <Plus className="w-5 h-5" />
          Create New Escrow
        </button>
      </div>
    </div>
  );
};

export default OverviewTab;