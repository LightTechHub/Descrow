// src/pages/admin/AnalyticsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, TrendingUp, DollarSign, Users, Activity,
  Download, BarChart3, PieChart, Loader, RefreshCw,
  TrendingDown, AlertCircle
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import toast from 'react-hot-toast';

const AnalyticsPage = ({ admin }) => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState('30d');
  const [analytics, setAnalytics] = useState(null);
  const [platformStats, setPlatformStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [analyticsRes, statsRes] = await Promise.all([
        adminService.getAnalytics({ period: dateRange }),
        adminService.getPlatformStats()
      ]);
      const aData = analyticsRes.data || analyticsRes;
      const sData = statsRes.data || statsRes;
      setAnalytics(aData);
      setPlatformStats(sData);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError('Failed to load analytics data');
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-10 h-10 text-red-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-white font-semibold mb-2">{error}</p>
          <button onClick={fetchData} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Safe accessors ──────────────────────────────────────────────────────────
  const overview = analytics?.overview || {};
  const transactionsOverTime = analytics?.transactionsOverTime || [];
  const revenueByTier = analytics?.revenueByTier || [];
  const paymentMethods = analytics?.paymentMethods || [];
  const disputeStats = analytics?.disputeStats || {};
  const userGrowth = analytics?.userGrowth || [];
  const statusDistribution = analytics?.statusDistribution || [];

  const usersByTier = platformStats?.usersByTier || {};
  const escrowStats = platformStats?.escrowStats || {};
  const transactionStats = platformStats?.transactionStats || {};

  const totalUsers = Object.values(usersByTier).reduce((a, b) => a + (Number(b) || 0), 0);

  // ── Simple bar chart renderer ────────────────────────────────────────────────
  const BarChart = ({ data, valueKey, labelKey, colorClass = 'bg-red-600', height = 200 }) => {
    if (!data?.length) return <p className="text-gray-500 text-sm text-center py-8">No data available</p>;
    const maxVal = Math.max(...data.map(d => d[valueKey] || 0), 1);
    return (
      <div style={{ height }} className="flex items-end gap-1">
        {data.map((item, i) => {
          const pct = ((item[valueKey] || 0) / maxVal) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div className={`w-full ${colorClass} rounded-t transition-all hover:opacity-80 relative`}
                style={{ height: `${Math.max(pct, 2)}%` }}>
                <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-gray-950 text-white text-xs px-2 py-1 rounded
                  opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10 border border-gray-700">
                  {typeof item[valueKey] === 'number' && item[valueKey] > 999
                    ? `${(item[valueKey]).toLocaleString()}`
                    : item[valueKey]}
                </div>
              </div>
              <p className="text-xs text-gray-500 truncate w-full text-center">{item[labelKey]}</p>
            </div>
          );
        })}
      </div>
    );
  };

  const StatCard = ({ icon: Icon, label, value, sub, color, growth }) => (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {growth !== undefined && (
          <span className={`text-sm font-semibold flex items-center gap-1 ${Number(growth) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {Number(growth) >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(growth)}%
          </span>
        )}
      </div>
      <p className="text-gray-400 text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/admin/dashboard')}
              className="p-2 hover:bg-gray-700 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Analytics & Reports</h1>
              <p className="text-sm text-gray-400">Platform performance overview</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Date range selector */}
            <div className="flex gap-1 bg-gray-900 rounded-lg p-1 border border-gray-700">
              {[
                { value: '7d', label: '7D' },
                { value: '30d', label: '30D' },
                { value: '90d', label: '90D' },
                { value: '1y', label: '1Y' }
              ].map(r => (
                <button key={r.value} onClick={() => setDateRange(r.value)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                    dateRange === r.value ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}>
                  {r.label}
                </button>
              ))}
            </div>
            <button onClick={fetchData} className="p-2 hover:bg-gray-700 rounded-lg transition">
              <RefreshCw className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* Overview Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={DollarSign} label="Total Revenue" color="bg-green-600"
            value={`₦${(overview.totalRevenue || transactionStats.totalVolume || 0).toLocaleString()}`}
            growth={overview.revenueGrowth} />
          <StatCard icon={Activity} label="Total Escrows" color="bg-blue-600"
            value={(escrowStats.total || overview.totalTransactions || 0).toLocaleString()}
            sub={`${escrowStats.completed || 0} completed`} />
          <StatCard icon={Users} label="Total Users" color="bg-purple-600"
            value={totalUsers.toLocaleString() || (overview.totalUsers || 0).toLocaleString()}
            growth={overview.usersGrowth} />
          <StatCard icon={AlertCircle} label="Open Disputes" color="bg-red-600"
            value={(disputeStats.open || disputeStats.total || 0).toLocaleString()}
            sub={`${disputeStats.resolved || 0} resolved`} />
        </div>

        {/* Users by Tier */}
        {Object.keys(usersByTier).length > 0 && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h2 className="text-lg font-bold text-white mb-4">Users by Tier</h2>
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(usersByTier).map(([tier, count]) => (
                <div key={tier} className="bg-gray-900 rounded-lg p-4 border border-gray-700 text-center">
                  <p className="text-2xl font-bold text-white">{(count || 0).toLocaleString()}</p>
                  <p className="text-gray-400 text-sm capitalize mt-1">{tier}</p>
                  <p className="text-gray-600 text-xs">
                    {totalUsers > 0 ? ((count / totalUsers) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transactions Over Time */}
        {transactionsOverTime.length > 0 && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-5">
              <BarChart3 className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-bold text-white">Transactions Over Time</h2>
            </div>
            <BarChart
              data={transactionsOverTime}
              valueKey="count"
              labelKey="date"
              colorClass="bg-red-600"
              height={200}
            />
          </div>
        )}

        {/* Two-column: Revenue by Tier + Status Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {revenueByTier.length > 0 && (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h2 className="text-lg font-bold text-white mb-4">Revenue by Tier</h2>
              <div className="space-y-3">
                {revenueByTier.map((item, i) => {
                  const max = Math.max(...revenueByTier.map(r => r.revenue || 0), 1);
                  const pct = ((item.revenue || 0) / max) * 100;
                  const colors = ['bg-red-600', 'bg-blue-600', 'bg-green-600', 'bg-purple-600'];
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-300 capitalize">{item.tier || item._id}</span>
                        <span className="text-white font-semibold">₦{(item.revenue || 0).toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div className={`${colors[i % colors.length]} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {statusDistribution.length > 0 && (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center gap-2 mb-4">
                <PieChart className="w-5 h-5 text-gray-400" />
                <h2 className="text-lg font-bold text-white">Transaction Status</h2>
              </div>
              <div className="space-y-3">
                {statusDistribution.map((item, i) => {
                  const total = statusDistribution.reduce((s, x) => s + (x.count || 0), 0);
                  const pct = total > 0 ? ((item.count || 0) / total) * 100 : 0;
                  const colors = ['bg-green-500', 'bg-yellow-500', 'bg-blue-500', 'bg-red-500', 'bg-purple-500', 'bg-gray-500'];
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-300 capitalize">{(item.status || item._id)?.replace(/_/g, ' ')}</span>
                        <span className="text-white font-semibold">{item.count} ({pct.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div className={`${colors[i % colors.length]} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Payment Methods */}
        {paymentMethods.length > 0 && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h2 className="text-lg font-bold text-white mb-4">Payment Methods</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {paymentMethods.map((item, i) => (
                <div key={i} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                  <p className="text-white font-semibold capitalize">{item.method || item._id}</p>
                  <p className="text-2xl font-bold text-white mt-1">{(item.count || 0).toLocaleString()}</p>
                  <p className="text-gray-400 text-sm">transactions</p>
                  <p className="text-green-400 text-sm font-semibold mt-1">
                    ₦{(item.volume || item.amount || 0).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User Growth Chart */}
        {userGrowth.length > 0 && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h2 className="text-lg font-bold text-white mb-4">User Growth</h2>
            <BarChart data={userGrowth} valueKey="count" labelKey="date" colorClass="bg-purple-600" height={180} />
          </div>
        )}

        {/* Empty state if all sections are empty */}
        {!transactionsOverTime.length && !revenueByTier.length && !statusDistribution.length && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
            <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-white font-semibold mb-1">No analytics data yet</p>
            <p className="text-gray-500 text-sm">Data will appear here once transactions start flowing through the platform.</p>
          </div>
        )}

      </main>
    </div>
  );
};

export default AnalyticsPage;
