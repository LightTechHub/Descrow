import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, DollarSign, Users, Clock, Package, 
  ArrowUpRight, ArrowDownRight, Activity, Calendar,
  BarChart3, PieChart
} from 'lucide-react';
import axios from 'axios';

const BusinessOverviewTab = ({ user }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    fetchBusinessStats();
    // Refresh every 30 seconds for live feel
    const interval = setInterval(fetchBusinessStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchBusinessStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/escrow/stats`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setStats(response.data.data);
        
        // Simulate recent activity (you can replace with real API call)
        setRecentActivity([
          { type: 'sale', amount: 2500, time: '2 hours ago', status: 'completed' },
          { type: 'purchase', amount: 1200, time: '5 hours ago', status: 'in_progress' },
          { type: 'sale', amount: 3400, time: '1 day ago', status: 'completed' }
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch business stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner with Company Info */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-3xl font-bold mb-2">
                {user.businessInfo?.companyName || 'Your Business'}
              </h2>
              <p className="text-purple-100 flex items-center gap-2">
                <Package className="w-4 h-4" />
                {user.businessInfo?.industry || 'Business Account'}
              </p>
            </div>
            {user.isKYCVerified && (
              <div className="bg-green-500/20 backdrop-blur-sm px-4 py-2 rounded-lg border border-green-400/30">
                <p className="text-sm font-semibold">✓ Verified Business</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <p className="text-purple-200 text-sm mb-1">Total Revenue</p>
              <p className="text-2xl font-bold">
                ${stats?.selling?.totalValue?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <p className="text-purple-200 text-sm mb-1">Active Deals</p>
              <p className="text-2xl font-bold">
                {(stats?.selling?.inProgress || 0) + (stats?.buying?.inProgress || 0)}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <p className="text-purple-200 text-sm mb-1">Success Rate</p>
              <p className="text-2xl font-bold">
                {stats?.selling?.total > 0 
                  ? Math.round((stats.selling.completed / stats.selling.total) * 100) 
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Sales This Month"
          value={`$${stats?.selling?.totalValue?.toLocaleString() || '0'}`}
          change="+12.5%"
          trend="up"
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Active Transactions"
          value={stats?.selling?.inProgress || 0}
          subtitle={`${stats?.buying?.inProgress || 0} purchases`}
          icon={Activity}
          color="blue"
        />
        <StatCard
          title="Pending Payments"
          value={stats?.buying?.pendingPayment || 0}
          subtitle="Awaiting action"
          icon={Clock}
          color="orange"
        />
        <StatCard
          title="Completed Deals"
          value={stats?.selling?.completed || 0}
          change="+8 this week"
          trend="up"
          icon={Package}
          color="purple"
        />
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Live Activity Feed
          </h3>
          <span className="flex items-center gap-2 text-sm text-gray-500">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Live
          </span>
        </div>

        <div className="space-y-3">
          {recentActivity.map((activity, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:shadow-md transition-all duration-200 animate-fadeIn"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${
                  activity.type === 'sale' 
                    ? 'bg-green-100 dark:bg-green-900/30' 
                    : 'bg-blue-100 dark:bg-blue-900/30'
                }`}>
                  {activity.type === 'sale' ? (
                    <ArrowUpRight className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <ArrowDownRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {activity.type === 'sale' ? 'Sale' : 'Purchase'} - ${activity.amount.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{activity.time}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                activity.status === 'completed'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              }`}>
                {activity.status.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Monthly Performance
          </h3>
          <div className="h-48 flex items-end justify-between gap-2">
            {[65, 45, 80, 55, 70, 85, 90].map((height, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div 
                  className="w-full bg-gradient-to-t from-blue-600 to-purple-600 rounded-t-lg transition-all duration-500 hover:opacity-80"
                  style={{ height: `${height}%` }}
                ></div>
                <span className="text-xs text-gray-500">W{i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-purple-600" />
            Transaction Distribution
          </h3>
          <div className="flex items-center justify-center h-48">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="20"
                  className="text-gray-200 dark:text-gray-700"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="20"
                  strokeDasharray="439.8"
                  strokeDashoffset="110"
                  className="text-blue-600 transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">75%</p>
                  <p className="text-xs text-gray-500">Completed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, subtitle, change, trend, icon: Icon, color }) => {
  const colorClasses = {
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        {change && (
          <span className={`flex items-center gap-1 text-sm font-semibold ${
            trend === 'up' ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {change}
          </span>
        )}
      </div>
      <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">{title}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{value}</p>
      {subtitle && (
        <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
      )}
    </div>
  );
};

export default BusinessOverviewTab;
