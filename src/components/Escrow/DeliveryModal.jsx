// src/components/Escrow/DeliveryModal.jsx
import React, { useState, useRef } from 'react';
import { X, Package, Loader, Upload, Trash2, FileImage, Car, Phone, User, Hash, Truck, MapPin, AlertCircle } from 'lucide-react';
import axios from 'axios';
import escrowService from 'services/escrowService';
import toast from 'react-hot-toast';

const DELIVERY_METHODS = [
  { value: 'courier', label: 'Courier Service (DHL, FedEx, UPS, etc.)' },
  { value: 'dispatch', label: 'Dispatch Rider / Motorbike' },
  { value: 'vehicle', label: 'Personal Vehicle / Car' },
  { value: 'in_person', label: 'In-Person Handover' },
  { value: 'digital', label: 'Digital Delivery (email / download link)' },
  { value: 'other', label: 'Other' },
];

const DeliveryModal = ({ escrow, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 = proof details, 2 = confirm
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [formData, setFormData] = useState({
    method: '',
    trackingNumber: '',
    courierName: '',
    driverName: '',
    driverPhone: '',
    vehicleType: '',
    plateNumber: '',
    methodDescription: '',
    additionalNotes: '',
  });
  const [errors, setErrors] = useState({});

  // FIX: Hidden real <input type="file"> ref — clicking the styled div triggers this.
  // A plain styled div onClick cannot open the OS file picker; only a real input can.
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    addFiles(Array.from(e.target.files));
    e.target.value = ''; // reset so same file can be re-added after removal
  };

  const addFiles = (newFiles) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'video/mp4', 'video/quicktime'];
    const valid = newFiles.filter(f => {
      if (!allowed.includes(f.type)) { toast.error(`${f.name}: unsupported type`); return false; }
      if (f.size > 20 * 1024 * 1024) { toast.error(`${f.name}: max 20MB`); return false; }
      return true;
    });
    if (files.length + valid.length > 10) { toast.error('Max 10 files'); return; }

    const newPreviews = valid.map(f => ({
      name: f.name,
      size: (f.size / 1024).toFixed(0) + ' KB',
      url: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
      isVideo: f.type.startsWith('video/'),
      isPdf: f.type === 'application/pdf',
    }));
    setFiles(prev => [...prev, ...valid]);
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeFile = (idx) => {
    if (previews[idx]?.url) URL.revokeObjectURL(previews[idx].url);
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    addFiles(Array.from(e.dataTransfer.files));
  };

  const validate = () => {
    const errs = {};
    if (!formData.method) errs.method = 'Select a delivery method';
    if (files.length === 0) errs.files = 'At least one proof photo or document is required';
    // Require driver phone for dispatch/vehicle deliveries
    if (['dispatch', 'vehicle'].includes(formData.method) && !formData.driverPhone.trim()) {
      errs.driverPhone = 'Driver phone number is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      
      // Step 1: Upload proof (multipart) while escrow is still 'funded'
      const fd = new FormData();
      files.forEach(f => fd.append('photos', f)); // backend uses req.files
      Object.entries(formData).forEach(([key, val]) => {
        if (val) fd.append(key, val);
      });

      await axios.post(
        `${API_URL}/escrow/${escrow._id}/upload-delivery-proof`,
        fd,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Step 2: Mark as delivered
      await escrowService.markDelivered(escrow._id, {
        trackingNumber: formData.trackingNumber,
        notes: formData.additionalNotes,
        method: formData.method,
      });

      toast.success('Marked as delivered! Buyer has been notified.');
      onSuccess?.();
      onClose();
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to mark delivery';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const showDriverFields = ['dispatch', 'vehicle'].includes(formData.method);
  const showCourierFields = formData.method === 'courier';
  const showDigitalFields = formData.method === 'digital';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Package className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Mark as Delivered</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Provide full delivery proof to protect yourself</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ── DELIVERY METHOD ── */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Delivery Method <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.method}
              onChange={e => setFormData({ ...formData, method: e.target.value })}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-gray-900 dark:text-white"
            >
              <option value="">Select delivery method...</option>
              {DELIVERY_METHODS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            {errors.method && <p className="mt-1 text-xs text-red-500">{errors.method}</p>}
          </div>

          {/* ── COURIER FIELDS ── */}
          {showCourierFields && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  <Truck className="w-4 h-4 inline mr-1" />Courier Company
                </label>
                <input
                  type="text"
                  value={formData.courierName}
                  onChange={e => setFormData({ ...formData, courierName: e.target.value })}
                  placeholder="e.g. DHL, FedEx, GIG Logistics"
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  <Hash className="w-4 h-4 inline mr-1" />Tracking Number
                </label>
                <input
                  type="text"
                  value={formData.trackingNumber}
                  onChange={e => setFormData({ ...formData, trackingNumber: e.target.value })}
                  placeholder="e.g. 1Z999AA10123456784"
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-gray-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* ── DISPATCH / VEHICLE FIELDS ── */}
          {showDriverFields && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  <User className="w-4 h-4 inline mr-1" />Driver / Rider Name
                </label>
                <input
                  type="text"
                  value={formData.driverName}
                  onChange={e => setFormData({ ...formData, driverName: e.target.value })}
                  placeholder="Full name of the driver or rider"
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  <Phone className="w-4 h-4 inline mr-1" />Driver Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.driverPhone}
                  onChange={e => setFormData({ ...formData, driverPhone: e.target.value })}
                  placeholder="+234 xxx xxx xxxx"
                  className={`w-full px-4 py-2.5 bg-white dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-gray-900 dark:text-white ${errors.driverPhone ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                />
                {errors.driverPhone && <p className="mt-1 text-xs text-red-500">{errors.driverPhone}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  <Car className="w-4 h-4 inline mr-1" />Vehicle Type
                </label>
                <input
                  type="text"
                  value={formData.vehicleType}
                  onChange={e => setFormData({ ...formData, vehicleType: e.target.value })}
                  placeholder="e.g. Honda CBR 2020, Toyota Camry"
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  <Hash className="w-4 h-4 inline mr-1" />Plate Number
                </label>
                <input
                  type="text"
                  value={formData.plateNumber}
                  onChange={e => setFormData({ ...formData, plateNumber: e.target.value })}
                  placeholder="e.g. LAG-234-XY"
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-gray-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* ── DIGITAL DELIVERY ── */}
          {showDigitalFields && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Delivery Description / Link
              </label>
              <textarea
                value={formData.methodDescription}
                onChange={e => setFormData({ ...formData, methodDescription: e.target.value })}
                placeholder="Describe how the digital item was delivered (e.g. link sent via email, file shared on Google Drive...)"
                rows={3}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-gray-900 dark:text-white resize-none"
              />
            </div>
          )}

          {/* ── PHOTO/FILE UPLOAD ── */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Proof Photos / Documents <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Upload: photos of the item, vehicle plate, driver with parcel, receipt, screenshot, tracking page, etc. Up to 10 files.
            </p>

            {/* Real hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf,video/mp4,video/quicktime"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Drop zone — clicking triggers hidden input */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); }}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/10
                ${errors.files ? 'border-red-400 bg-red-50 dark:bg-red-900/10' : 'border-gray-300 dark:border-gray-700'}`}
            >
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Click to upload or drag & drop</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Images, PDF, Video • Max 20MB each</p>
            </div>
            {errors.files && <p className="mt-1 text-xs text-red-500">{errors.files}</p>}

            {/* File previews */}
            {previews.length > 0 && (
              <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
                {previews.map((p, idx) => (
                  <div key={idx} className="relative group border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800">
                    {p.url ? (
                      <img src={p.url} alt={p.name} className="w-full h-20 object-cover" />
                    ) : (
                      <div className="w-full h-20 flex flex-col items-center justify-center gap-1">
                        <FileImage className="w-6 h-6 text-gray-400" />
                        <span className="text-xs text-gray-400">{p.isPdf ? 'PDF' : p.isVideo ? 'Video' : 'File'}</span>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 truncate px-1 pb-1">{p.name}</p>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); removeFile(idx); }}
                      className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {/* Add more */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg h-20 flex flex-col items-center justify-center gap-1 hover:border-purple-400 transition"
                >
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-xs text-gray-400">Add more</span>
                </button>
              </div>
            )}
          </div>

          {/* ── ADDITIONAL NOTES ── */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Additional Notes
            </label>
            <textarea
              value={formData.additionalNotes}
              onChange={e => setFormData({ ...formData, additionalNotes: e.target.value })}
              placeholder="Any extra delivery info — gate code, handover instructions, recipient's name who collected, etc."
              rows={3}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-gray-900 dark:text-white resize-none"
            />
          </div>

          {/* ── INFO BOX ── */}
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-purple-900 dark:text-purple-200">
                <p className="font-semibold mb-1">What happens next?</p>
                <p className="text-purple-700 dark:text-purple-300">
                  The buyer will be notified and can confirm receipt. Once confirmed, payment is released to you. 
                  Strong proof (plate number, driver photo, tracking screenshot) protects you if a dispute is raised.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader className="w-5 h-5 animate-spin" />Submitting...</>
            ) : (
              <><Package className="w-5 h-5" />Confirm Delivery</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeliveryModal;
