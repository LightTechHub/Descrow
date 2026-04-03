// File: src/components/Profile/BankAccountTab.jsx
import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Check, AlertCircle, Building,
  Globe, CreditCard, Loader, Shield
} from 'lucide-react';
import toast from 'react-hot-toast';
import profileService from '../../services/profileService';

const BankAccountTab = ({ user, onUpdate, kycVerified }) => {
  const [accounts, setAccounts] = useState([]);
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    accountNumber: '',
    bankCode: '',
    bankName: '',
    currency: 'NGN',
    accountType: 'personal',
    swiftCode: '',
    iban: '',
    routingNumber: '',
    accountName: '',
  });
  const [verifying, setVerifying] = useState(false);
  const [currencyType, setCurrencyType] = useState('local');

  useEffect(() => {
    if (kycVerified) {
      fetchBankAccounts();
      fetchBanks('NGN'); // FIXED: pass currency explicitly
    }
  }, [kycVerified]);

  const fetchBankAccounts = async () => {
    try {
      const response = await profileService.getBankAccounts();
      if (response.success) setAccounts(response.data.accounts || []);
    } catch (error) {
      toast.error('Failed to load bank accounts');
    } finally {
      setLoading(false);
    }
  };

  // FIXED: accept currency as parameter so there is no stale closure
  const fetchBanks = async (currency) => {
    try {
      const response = await profileService.getBanks({ currency });
      if (response.success) setBanks(response.data.banks || []);
      else setBanks([]);
    } catch (error) {
      console.error('Fetch banks error:', error);
      setBanks([]);
    }
  };

  // FIXED: set state and call fetchBanks with the NEW currency value directly
  const handleCurrencyChange = (type) => {
    const currency = type === 'local' ? 'NGN' : 'USD';
    setCurrencyType(type);
    setFormData(prev => ({
      ...prev,
      currency,
      bankCode: '',
      bankName: '',
      accountName: '',
    }));
    fetchBanks(currency); // FIXED: pass currency directly, no setTimeout
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    if (!formData.accountNumber || !formData.bankCode) {
      toast.error('Please fill all required fields');
      return;
    }
    if (currencyType === 'foreign' && !formData.swiftCode) {
      toast.error('SWIFT/BIC code is required for international accounts');
      return;
    }
    if (currencyType === 'foreign' && !formData.accountName) {
      toast.error('Account name is required for international accounts');
      return;
    }
    setVerifying(true);
    try {
      const payload = { ...formData };
      if (currencyType === 'foreign') payload.accountName = formData.accountName;
      const response = await profileService.addBankAccount(payload);
      if (response.success) {
        toast.success('Bank account added and verified successfully!');
        setAccounts(prev => [...prev, response.data.bankAccount]);
        setShowAddModal(false);
        resetForm();
        onUpdate && onUpdate();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add bank account');
    } finally {
      setVerifying(false);
    }
  };

  const resetForm = () => {
    setFormData({ accountNumber: '', bankCode: '', bankName: '', currency: 'NGN', accountType: 'personal', swiftCode: '', iban: '', routingNumber: '', accountName: '' });
    setCurrencyType('local');
    fetchBanks('NGN');
  };

  const handleDeleteAccount = async (accountId) => {
    if (!window.confirm('Are you sure you want to delete this bank account?')) return;
    try {
      const response = await profileService.deleteBankAccount(accountId);
      if (response.success) {
        toast.success('Bank account deleted');
        setAccounts(prev => prev.filter(acc => acc._id !== accountId));
        onUpdate && onUpdate();
      }
    } catch { toast.error('Failed to delete bank account'); }
  };

  const handleSetPrimary = async (accountId) => {
    try {
      const response = await profileService.setPrimaryBankAccount(accountId);
      if (response.success) {
        toast.success('Primary account updated');
        fetchBankAccounts();
        onUpdate && onUpdate();
      }
    } catch { toast.error('Failed to update primary account'); }
  };

  const getPayoutMethod = (currency) => {
    const methods = {
      'NGN': { provider: 'Paystack', type: 'Bank Transfer', color: 'text-green-600' },
      'USD': { provider: 'Flutterwave', type: 'Bank/Crypto', color: 'text-blue-600' },
      'EUR': { provider: 'Flutterwave', type: 'Bank Transfer', color: 'text-blue-600' },
      'GBP': { provider: 'Flutterwave', type: 'Bank Transfer', color: 'text-blue-600' },
    };
    return methods[currency] || { provider: 'Flutterwave', type: 'Bank/Crypto', color: 'text-blue-600' };
  };

  if (!kycVerified) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-8 text-center">
        <AlertCircle className="w-16 h-16 text-yellow-600 dark:text-yellow-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-yellow-900 dark:text-yellow-200 mb-2">KYC Verification Required</h3>
        <p className="text-yellow-800 dark:text-yellow-300 mb-4">Complete KYC verification before adding bank accounts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Bank Accounts</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Manage your payout accounts for different currencies</p>
          </div>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">
            <Plus className="w-5 h-5" />Add Account
          </button>
        </div>
      </div>

      {/* Payout Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">Multi-Currency Payout System</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 text-xs">
              <div className="bg-white dark:bg-blue-900/30 rounded-lg p-3">
                <p className="font-semibold text-green-600">NGN Payouts</p>
                <p className="text-gray-600 dark:text-gray-300 mt-1">Paystack Bank Transfer</p>
              </div>
              <div className="bg-white dark:bg-blue-900/30 rounded-lg p-3">
                <p className="font-semibold text-blue-600">USD/EUR/GBP</p>
                <p className="text-gray-600 dark:text-gray-300 mt-1">Flutterwave Bank/Crypto</p>
              </div>
              <div className="bg-white dark:bg-blue-900/30 rounded-lg p-3">
                <p className="font-semibold text-purple-600">Crypto</p>
                <p className="text-gray-600 dark:text-gray-300 mt-1">NowPayments Wallet</p>
              </div>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-3">Funds auto-transfer within 24h of escrow completion</p>
          </div>
        </div>
      </div>

      {/* Accounts List */}
      {loading ? (
        <div className="text-center py-12"><Loader className="w-8 h-8 text-blue-600 animate-spin mx-auto" /></div>
      ) : accounts.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-12 text-center border border-gray-200 dark:border-gray-800">
          <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Bank Accounts Yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Add a bank account to receive payouts from completed escrows</p>
          <button onClick={() => setShowAddModal(true)} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">Add Your First Account</button>
        </div>
      ) : (
        <div className="space-y-4">
          {accounts.map((account) => {
            const payoutMethod = getPayoutMethod(account.currency);
            return (
              <div key={account._id} className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 relative">
                {account.isPrimary && (
                  <div className="absolute top-4 right-4">
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold rounded-full">PRIMARY</span>
                  </div>
                )}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{account.bankName}</h3>
                      <span className={`px-2 py-1 bg-gray-100 dark:bg-gray-800 text-xs font-medium rounded-full ${payoutMethod.color}`}>
                        {account.currency} - {payoutMethod.provider}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">{account.accountName}</p>
                    <p className="text-gray-500 dark:text-gray-500 text-sm font-mono">****{account.accountNumber?.slice(-4) || '****'}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs">
                      {account.isVerified && (
                        <div className="flex items-center gap-1 text-green-600">
                          <Check className="w-4 h-4" /><span className="font-medium">Verified</span>
                        </div>
                      )}
                      <span className="text-gray-500 dark:text-gray-500">{payoutMethod.type}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {!account.isPrimary && (
                      <button onClick={() => handleSetPrimary(account._id)}
                        className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                        Set Primary
                      </button>
                    )}
                    <button onClick={() => handleDeleteAccount(account._id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Add Bank Account</h2>

            {/* Currency Type - FIXED: immediate state update + direct fetchBanks call */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Account Currency Type *</label>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => handleCurrencyChange('local')}
                  className={`p-4 border-2 rounded-lg text-center transition ${currencyType === 'local' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100' : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'}`}>
                  <div className="text-2xl mb-1">🇳🇬</div>
                  <div className="font-semibold">NGN</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Paystack</div>
                </button>
                <button type="button" onClick={() => handleCurrencyChange('foreign')}
                  className={`p-4 border-2 rounded-lg text-center transition ${currencyType === 'foreign' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100' : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'}`}>
                  <div className="text-2xl mb-1">🌍</div>
                  <div className="font-semibold">USD/EUR/GBP</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Flutterwave</div>
                </button>
              </div>
            </div>

            {/* Currency selector for foreign */}
            {currencyType === 'foreign' && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Currency *</label>
                <select value={formData.currency}
                  onChange={(e) => {
                    const cur = e.target.value;
                    setFormData(prev => ({ ...prev, currency: cur, bankCode: '', bankName: '' }));
                    fetchBanks(cur);
                  }}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>
            )}

            <form onSubmit={handleAddAccount} className="space-y-4">
              {/* Bank Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Select Bank *</label>
                <select value={formData.bankCode}
                  onChange={(e) => {
                    const selectedBank = banks.find(b => b.code === e.target.value);
                    setFormData(prev => ({ ...prev, bankCode: e.target.value, bankName: selectedBank?.name || '' }));
                  }}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">Choose a bank...</option>
                  {banks.map((bank) => (
                    <option key={bank.code} value={bank.code}>{bank.name}</option>
                  ))}
                </select>
                {banks.length === 0 && <p className="text-xs text-amber-600 mt-1">Loading banks...</p>}
              </div>

              {/* Account Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Account Number *</label>
                <input type="text" value={formData.accountNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                  placeholder={currencyType === 'local' ? "0123456789" : "Account Number"}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                {currencyType === 'local' && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Account name will be verified automatically via Paystack</p>
                )}
              </div>

              {/* International fields */}
              {currencyType === 'foreign' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Account Name *</label>
                    <input type="text" value={formData.accountName}
                      onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
                      placeholder="Full account holder name" required
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">SWIFT/BIC Code *</label>
                    <input type="text" value={formData.swiftCode}
                      onChange={(e) => setFormData(prev => ({ ...prev, swiftCode: e.target.value }))}
                      placeholder="e.g. BOFAUS3N" required
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">IBAN (Optional)</label>
                    <input type="text" value={formData.iban}
                      onChange={(e) => setFormData(prev => ({ ...prev, iban: e.target.value }))}
                      placeholder="International Bank Account Number"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </>
              )}

              {/* Account Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Account Type</label>
                <select value={formData.accountType}
                  onChange={(e) => setFormData(prev => ({ ...prev, accountType: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="personal">Personal Account</option>
                  <option value="business">Business Account</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowAddModal(false); resetForm(); }} disabled={verifying}
                  className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-700 transition disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={verifying}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {verifying ? <><Loader className="w-5 h-5 animate-spin" />Verifying...</> : 'Add Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Security Notice */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
        <div className="flex gap-3">
          <Shield className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-900 dark:text-green-200">
            <p className="font-medium mb-1">Your bank details are secure</p>
            <p className="text-green-800 dark:text-green-300">All bank account information is encrypted using bank-level security protocols.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BankAccountTab;