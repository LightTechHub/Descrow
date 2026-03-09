// src/components/Escrow/DeliveryModal.jsx
import React, { useState, useRef } from 'react';
import axios from 'axios';
import { X, Upload, FileImage, Trash2, Loader, CheckCircle, AlertCircle, Package } from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function DeliveryModal({ escrowId, onClose, onSuccess }) {
  const [files, setFiles] = useState([]);       // Array of File objects
  const [previews, setPreviews] = useState([]);  // Array of { name, url, size }
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // FIX: Use a real <input type="file"> ref triggered programmatically.
  // The bug was a custom div with onClick that didn't actually open any file picker.
  const fileInputRef = useRef(null);

  const handleFileInputChange = (e) => {
    addFiles(Array.from(e.target.files));
    // Reset input so same file can be re-selected if removed
    e.target.value = '';
  };

  const addFiles = (newFiles) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'video/mp4'];
    const valid = newFiles.filter(f => {
      if (!allowed.includes(f.type)) {
        toast.error(`${f.name}: unsupported file type`);
        return false;
      }
      if (f.size > 20 * 1024 * 1024) {
        toast.error(`${f.name}: file too large (max 20MB)`);
        return false;
      }
      return true;
    });

    if (files.length + valid.length > 10) {
      toast.error('Maximum 10 proof files allowed');
      return;
    }

    const newPreviews = valid.map(f => ({
      name: f.name,
      size: (f.size / 1024).toFixed(1) + ' KB',
      url: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
      type: f.type
    }));

    setFiles(prev => [...prev, ...valid]);
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeFile = (idx) => {
    // Revoke object URL to avoid memory leaks
    if (previews[idx]?.url) URL.revokeObjectURL(previews[idx].url);
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      toast.error('Please upload at least one proof of delivery file');
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token');

    try {
      // Step 1: Upload proof files (multipart/form-data)
      const formData = new FormData();
      files.forEach(f => formData.append('proofFiles', f));
      if (note.trim()) formData.append('additionalNotes', note.trim());
      formData.append('method', 'other');

      await axios.post(
        `${API_URL}/escrow/${escrowId}/upload-proof`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            // Do NOT set Content-Type — browser sets multipart boundary automatically
          }
        }
      );

      // Step 2: Mark escrow as delivered
      await axios.post(
        `${API_URL}/escrow/${escrowId}/deliver`,
        { note: note.trim() || 'Item delivered' },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      toast.success('Delivery marked successfully! Buyer has been notified.');
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to mark delivery';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
              <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Mark as Delivered</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Upload proof of delivery (required)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* FIX: Hidden real file input - this is what actually opens the OS file picker */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf,video/mp4"
            onChange={handleFileInputChange}
            className="hidden"
            aria-label="Upload proof of delivery files"
          />

          {/* Drop zone — clicking this triggers the hidden file input */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors select-none
              ${dragOver
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="font-semibold text-gray-700 dark:text-gray-300">
              Click to upload or drag & drop
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Images, PDF, or video • Up to 10 files • Max 20MB each
            </p>
          </div>

          {/* File previews */}
          {previews.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {previews.length} file{previews.length > 1 ? 's' : ''} selected
              </p>
              <div className="grid grid-cols-2 gap-2">
                {previews.map((p, idx) => (
                  <div key={idx} className="relative group border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800">
                    {p.url ? (
                      <img src={p.url} alt={p.name} className="w-full h-24 object-cover" />
                    ) : (
                      <div className="w-full h-24 flex items-center justify-center">
                        <FileImage className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <div className="p-2">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.size}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Add more files button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl h-24 flex items-center justify-center hover:border-blue-400 transition-colors"
                >
                  <div className="text-center">
                    <Upload className="w-5 h-5 mx-auto text-gray-400 mb-1" />
                    <span className="text-xs text-gray-500">Add more</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Optional note */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Delivery Note <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder="e.g. Left at front door, tracking number XYZ123..."
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Info box */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl text-xs text-amber-700 dark:text-amber-400">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>Once you mark as delivered, the buyer will have a window to confirm or raise a dispute. Upload clear proof to protect yourself.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || files.length === 0}
            className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader className="w-4 h-4 animate-spin" /> Uploading...</>
            ) : (
              <><CheckCircle className="w-4 h-4" /> Mark as Delivered</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
