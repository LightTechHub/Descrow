import React, { useState } from 'react';
import { X, Download, FileText, FileSpreadsheet, Receipt, Loader, Building, Code } from 'lucide-react';
import exportService from 'services/exportService';
import toast from 'react-hot-toast';

const ExportModal = ({ transactions, user, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    format: 'csv',
    dateRange: 'all',
    startDate: '',
    endDate: '',
    includeColumns: {
      id: true,
      title: true,
      amount: true,
      status: true,
      parties: true,
      dates: true
    },
    taxYear: new Date().getFullYear()
  });

  const isBusinessAccount = user?.accountType === 'business';

  const handleExport = async () => {
    try {
      setLoading(true);

      // Filter transactions by date range
      let filteredTransactions = [...transactions];

      if (exportOptions.dateRange === 'custom' && exportOptions.startDate && exportOptions.endDate) {
        const start = new Date(exportOptions.startDate);
        const end = new Date(exportOptions.endDate);
        
        filteredTransactions = transactions.filter(t => {
          const date = new Date(t.createdAt);
          return date >= start && date <= end;
        });
      } else if (exportOptions.dateRange === 'month') {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        
        filteredTransactions = transactions.filter(t => {
          return new Date(t.createdAt) >= oneMonthAgo;
        });
      } else if (exportOptions.dateRange === 'year') {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        
        filteredTransactions = transactions.filter(t => {
          return new Date(t.createdAt) >= oneYearAgo;
        });
      }

      if (filteredTransactions.length === 0) {
        toast.error('No transactions found in selected date range');
        return;
      }

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `dealcross-transactions-${timestamp}`;

      // Export based on format
      switch (exportOptions.format) {
        case 'csv':
          exportService.exportToCSV(filteredTransactions, `${filename}.csv`);
          toast.success('CSV exported successfully!');
          break;

        case 'pdf':
          exportService.exportToPDF(filteredTransactions, user, `${filename}.pdf`);
          toast.success('PDF exported successfully!');
          break;

        case 'excel':
          exportService.exportToExcel(filteredTransactions, `${filename}.xlsx`);
          toast.success('Excel file exported successfully!');
          break;

        case 'tax':
          exportService.generateTaxReport(transactions, user, exportOptions.taxYear);
          toast.success('Tax report generated successfully!');
          break;

        case 'api_report':
          exportService.generateAPIReport(filteredTransactions, user, `${filename}-api-report.pdf`);
          toast.success('API report generated successfully!');
          break;

        case 'invoice_batch':
          exportService.generateBulkInvoices(filteredTransactions, user);
          toast.success('Bulk invoices generated successfully!');
          break;

        default:
          toast.error('Invalid export format');
      }

      onClose();

    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  // Base export formats
  const baseFormats = [
    { value: 'csv', icon: FileSpreadsheet, label: 'CSV', desc: 'Compatible with Excel' },
    { value: 'pdf', icon: FileText, label: 'PDF', desc: 'Print-ready format' },
    { value: 'excel', icon: FileSpreadsheet, label: 'Excel', desc: 'Native XLSX format' },
    { value: 'tax', icon: Receipt, label: 'Tax Report', desc: 'Annual tax summary' }
  ];

  // Business-specific export formats
  const businessFormats = isBusinessAccount ? [
    { value: 'api_report', icon: Code, label: 'API Report', desc: 'Integration analytics' },
    { value: 'invoice_batch', icon: Building, label: 'Bulk Invoices', desc: 'Multiple invoices' }
  ] : [];

  const allFormats = [...baseFormats, ...businessFormats];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Export Transactions
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isBusinessAccount 
                ? `Download your business transaction history - ${user.businessInfo?.companyName || 'Business Account'}`
                : 'Download your transaction history in various formats'
              }
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
          >
            <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Business Account Notice */}
          {isBusinessAccount && (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Building className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-purple-900 dark:text-purple-200 mb-1">
                    Business Export Options Available
                  </p>
                  <p className="text-purple-700 dark:text-purple-300">
                    Additional export formats are available for business accounts including API reports and bulk invoice generation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Export Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              {allFormats.map((format) => {
                const Icon = format.icon;
                const isSelected = exportOptions.format === format.value;

                return (
                  <button
                    key={format.value}
                    onClick={() => setExportOptions({ ...exportOptions, format: format.value })}
                    className={`p-4 border-2 rounded-lg text-left transition ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Icon className={`w-6 h-6 mb-2 ${
                      isSelected ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <p className={`font-semibold ${
                      isSelected ? 'text-blue-900 dark:text-blue-200' : 'text-gray-900 dark:text-white'
                    }`}>
                      {format.label}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {format.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tax Year (if tax format selected) */}
          {exportOptions.format === 'tax' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tax Year
              </label>
              <select
                value={exportOptions.taxYear}
                onChange={(e) => setExportOptions({ ...exportOptions, taxYear: parseInt(e.target.value) })}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition text-gray-900 dark:text-white"
              >
                {[...Array(5)].map((_, i) => {
                  const year = new Date().getFullYear() - i;
                  return <option key={year} value={year}>{year}</option>;
                })}
              </select>
            </div>
          )}

          {/* Date Range (if not tax format) */}
          {exportOptions.format !== 'tax' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Date Range
              </label>
              <div className="space-y-3">
                {[
                  { value: 'all', label: 'All Time' },
                  { value: 'month', label: 'Last Month' },
                  { value: 'year', label: 'Last Year' },
                  { value: 'custom', label: 'Custom Range' }
                ].map((range) => (
                  <label key={range.value} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      value={range.value}
                      checked={exportOptions.dateRange === range.value}
                      onChange={(e) => setExportOptions({ ...exportOptions, dateRange: e.target.value })}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="text-gray-900 dark:text-white">{range.label}</span>
                  </label>
                ))}
              </div>

              {exportOptions.dateRange === 'custom' && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={exportOptions.startDate}
                      onChange={(e) => setExportOptions({ ...exportOptions, startDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={exportOptions.endDate}
                      onChange={(e) => setExportOptions({ ...exportOptions, endDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Summary */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
              Export Summary
            </p>
            <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
              <p>• Format: {exportOptions.format.toUpperCase()}</p>
              <p>• Transactions: {transactions.length}</p>
              {exportOptions.format === 'tax' && (
                <p>• Tax Year: {exportOptions.taxYear}</p>
              )}
              {isBusinessAccount && ['api_report', 'invoice_batch'].includes(exportOptions.format) && (
                <p>• Business Account: {user.businessInfo?.companyName}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Export
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;