// File: src/components/DisputeModal.jsx
import React, { useState } from 'react';
import { X, AlertTriangle, Upload } from 'lucide-react';

const DisputeModal = ({ escrowId, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    reason: '',
    description: '',
    evidence: []
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setFormData((prev) => ({ ...prev, evidence: [...prev.evidence, ...files] }));
  };

  const removeFile = (index) => {
    setFormData((prev) => ({
      ...prev,
      evidence: prev.evidence.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      escrowId,
      reason: formData.reason,
      description: formData.description,
      evidence: formData.evidence.map((f) => f.name),
      timestamp: new Date().toISOString()
    });
  };

  const canSubmit =
    formData.reason &&
    formData.description.length >= 50 &&
    formData.evidence.length > 0;

  const disputeReasons = [
    { value: 'not_received',    label: 'Item Not Received' },
    { value: 'wrong_item',      label: 'Wrong Item Delivered' },
    { value: 'damaged',         label: 'Item Damaged / Defective' },
    { value: 'not_as_described',label: 'Item Not As Described' },
    { value: 'counterfeit',     label: 'Counterfeit / Fake Item' },
    { value: 'service_issue',   label: 'Service Not Delivered' },
    { value: 'other',           label: 'Other Issue' }
  ];

  const inputClass =
    'w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Open Dispute</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Escrow ID: {escrowId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dispute dialog"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition p-1"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* Warning notice */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Important:</strong> Opening a dispute will pause this transaction.
              Our team will review your case within 24–48 hours and make a fair decision
              based on the evidence provided by both parties.
            </p>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reason for Dispute <span className="text-red-500">*</span>
            </label>
            <select
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              className={inputClass}
              required
            >
              <option value="">Select a reason…</option>
              {disputeReasons.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Detailed Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={6}
              className={inputClass}
              placeholder="Describe the issue in detail. Include dates, specific problems, and any communication with the other party…"
              required
            />
            <div className="flex justify-between mt-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">Minimum 50 characters. Be as specific as possible.</p>
              <p className={`text-xs ${formData.description.length < 50 ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                {formData.description.length} / 50+
              </p>
            </div>
          </div>

          {/* Evidence */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Evidence (Photos / Videos / Documents) <span className="text-red-500">*</span>
            </label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition">
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <input
                type="file"
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
                id="evidence-upload"
              />
              <label
                htmlFor="evidence-upload"
                className="cursor-pointer text-blue-600 dark:text-blue-400 hover:underline font-semibold"
              >
                Click to upload evidence
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Photos, videos, PDFs, or documents — max 10MB each
              </p>
            </div>

            {formData.evidence.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Uploaded Files ({formData.evidence.length}):
                </p>
                {formData.evidence.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-lg">
                        {file.type.startsWith('image/') ? '🖼️' : file.type.startsWith('video/') ? '🎥' : '📄'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">{file.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      aria-label={`Remove ${file.name}`}
                      className="text-red-500 hover:text-red-700 transition p-1"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Next steps */}
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">What happens next?</p>
            <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-decimal list-inside">
              <li>Your dispute is reviewed by our resolution team</li>
              <li>We may contact both parties for additional information</li>
              <li>A decision is made within 24–48 hours</li>
              <li>Funds are released based on the investigation outcome</li>
            </ol>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Submit Dispute
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DisputeModal;
