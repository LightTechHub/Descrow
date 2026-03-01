// src/components/DeliveryProofUpload.jsx
import React, { useState } from 'react';
import { X, Upload, Camera, MapPin, Loader, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

// FIX: use REACT_APP_API_URL which already includes /api, matching all other services
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const DeliveryProofUpload = ({ escrowId, onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    method: 'courier',
    courierName: '',
    trackingNumber: '',
    vehicleType: '',
    plateNumber: '',
    driverName: '',
    driverPhoto: null,
    vehiclePhoto: null,
    methodDescription: '',
    estimatedDelivery: '',
    packagePhotos: [],
    enableGPS: false,
    additionalNotes: ''
  });
  const [stepErrors, setStepErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error on change
    if (stepErrors[name]) {
      setStepErrors(prev => { const e = { ...prev }; delete e[name]; return e; });
    }
  };

  const handleFileUpload = (e, fieldName) => {
    const files = Array.from(e.target.files);
    if (fieldName === 'packagePhotos') {
      // FIX: use functional update to avoid stale closure on rapid calls
      setFormData(prev => ({ ...prev, packagePhotos: [...prev.packagePhotos, ...files] }));
    } else {
      setFormData(prev => ({ ...prev, [fieldName]: files[0] }));
    }
  };

  // FIX: validate Step 1 fields before advancing — type="button" ignores HTML required
  const validateStep1 = () => {
    const errors = {};
    if (!formData.estimatedDelivery) errors.estimatedDelivery = 'Expected delivery date is required';

    if (formData.method === 'courier') {
      if (!formData.courierName) errors.courierName = 'Courier company is required';
      if (!formData.trackingNumber.trim()) errors.trackingNumber = 'Tracking number is required';
    } else if (formData.method === 'personal') {
      if (!formData.vehicleType) errors.vehicleType = 'Vehicle type is required';
      if (!formData.plateNumber.trim()) errors.plateNumber = 'Plate number is required';
      if (!formData.driverName.trim()) errors.driverName = 'Driver name is required';
    } else if (formData.method === 'other') {
      if (!formData.methodDescription.trim()) errors.methodDescription = 'Description is required';
    }

    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep1()) setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.packagePhotos.length === 0) {
      toast.error('Please upload at least one package photo');
      return;
    }

    try {
      setLoading(true);

      const formDataObj = new FormData();
      formDataObj.append('method', formData.method);
      formDataObj.append('courierName', formData.courierName);
      formDataObj.append('trackingNumber', formData.trackingNumber);
      formDataObj.append('vehicleType', formData.vehicleType);
      formDataObj.append('plateNumber', formData.plateNumber);
      formDataObj.append('driverName', formData.driverName);
      formDataObj.append('methodDescription', formData.methodDescription);
      formDataObj.append('estimatedDelivery', formData.estimatedDelivery);
      formDataObj.append('gpsEnabled', formData.enableGPS);
      formDataObj.append('additionalNotes', formData.additionalNotes);

      formData.packagePhotos.forEach(file => formDataObj.append('photos', file));
      if (formData.driverPhoto)  formDataObj.append('driverPhoto', formData.driverPhoto);
      if (formData.vehiclePhoto) formDataObj.append('vehiclePhoto', formData.vehiclePhoto);

      // FIX: use axios instead of fetch — gets auth interceptors and consistent error handling
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/escrow/${escrowId}/upload-delivery-proof`,
        formDataObj,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        toast.success('Delivery proof uploaded successfully!');
        onSuccess(response.data.data);
      } else {
        toast.error(response.data.message || 'Failed to upload delivery proof');
      }

    } catch (error) {
      console.error('Upload error:', error);
      const status = error.response?.status;
      if (status === 401) {
        toast.error('Session expired — please log in again');
      } else {
        toast.error(error.response?.data?.message || 'Failed to upload delivery proof');
      }
    } finally {
      setLoading(false);
    }
  };

  const removePackagePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      packagePhotos: prev.packagePhotos.filter((_, i) => i !== index)
    }));
  };

  const FieldError = ({ field }) =>
    stepErrors[field] ? (
      <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
        <AlertCircle className="w-3.5 h-3.5" />{stepErrors[field]}
      </p>
    ) : null;

  const renderMethodFields = () => {
    switch (formData.method) {
      case 'courier':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Courier Company <span className="text-red-500">*</span>
              </label>
              <select name="courierName" value={formData.courierName} onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${stepErrors.courierName ? 'border-red-500' : 'border-gray-300'}`}>
                <option value="">Select courier...</option>
                <option value="DHL">DHL Express</option>
                <option value="FedEx">FedEx</option>
                <option value="UPS">UPS</option>
                <option value="USPS">USPS</option>
                <option value="EMS">EMS / China Post</option>
                <option value="SF Express">SF Express</option>
                <option value="4PX">4PX Express</option>
                <option value="Yanwen">Yanwen</option>
                <option value="Other">Other</option>
              </select>
              <FieldError field="courierName" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tracking Number <span className="text-red-500">*</span>
              </label>
              <input type="text" name="trackingNumber" value={formData.trackingNumber}
                onChange={handleChange} placeholder="Enter tracking number"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${stepErrors.trackingNumber ? 'border-red-500' : 'border-gray-300'}`}
              />
              <FieldError field="trackingNumber" />
            </div>
          </>
        );

      case 'personal':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vehicle Type <span className="text-red-500">*</span>
              </label>
              <select name="vehicleType" value={formData.vehicleType} onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${stepErrors.vehicleType ? 'border-red-500' : 'border-gray-300'}`}>
                <option value="">Select vehicle type...</option>
                <option value="car">Car</option>
                <option value="motorcycle">Motorcycle</option>
                <option value="truck">Truck</option>
                <option value="van">Van</option>
                <option value="bicycle">Bicycle</option>
              </select>
              <FieldError field="vehicleType" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vehicle Plate Number <span className="text-red-500">*</span>
              </label>
              <input type="text" name="plateNumber" value={formData.plateNumber}
                onChange={handleChange} placeholder="ABC-1234"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${stepErrors.plateNumber ? 'border-red-500' : 'border-gray-300'}`}
              />
              <FieldError field="plateNumber" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Driver Name <span className="text-red-500">*</span>
              </label>
              <input type="text" name="driverName" value={formData.driverName}
                onChange={handleChange} placeholder="John Doe"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${stepErrors.driverName ? 'border-red-500' : 'border-gray-300'}`}
              />
              <FieldError field="driverName" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Driver Photo <span className="text-gray-500 font-normal">Optional</span>
              </label>
              <input type="file" accept="image/*"
                onChange={(e) => handleFileUpload(e, 'driverPhoto')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
              {formData.driverPhoto && (
                <p className="text-sm text-green-600 mt-1.5">✓ {formData.driverPhoto.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vehicle Photo <span className="text-gray-500 font-normal">Optional</span>
              </label>
              <input type="file" accept="image/*"
                onChange={(e) => handleFileUpload(e, 'vehiclePhoto')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
              {formData.vehiclePhoto && (
                <p className="text-sm text-green-600 mt-1.5">✓ {formData.vehiclePhoto.name}</p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" name="enableGPS" checked={formData.enableGPS}
                  onChange={handleChange} className="mt-1" />
                <div>
                  <p className="font-medium text-blue-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Enable Live GPS Tracking
                    <span className="text-gray-500 font-normal text-sm">Optional</span>
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Allow buyer to track your location in real-time during delivery
                  </p>
                </div>
              </label>
            </div>
          </>
        );

      case 'other':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Delivery Method Description <span className="text-red-500">*</span>
            </label>
            <textarea name="methodDescription" value={formData.methodDescription}
              onChange={handleChange} rows="3"
              placeholder="e.g., Bus service, Cargo company, Pickup..."
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${stepErrors.methodDescription ? 'border-red-500' : 'border-gray-300'}`}
            />
            <FieldError field="methodDescription" />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Upload Delivery Proof</h2>
            <p className="text-sm text-gray-600 mt-1">Step {step} of 2</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition" disabled={loading}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {step === 1 && (
            <div className="space-y-6">
              {/* Method selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Method <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'courier', Icon: Upload, label: 'Courier', sub: 'DHL, FedEx, etc.' },
                    { value: 'personal', Icon: MapPin, label: 'Personal', sub: 'Car, bike, etc.' },
                    { value: 'other', Icon: Camera, label: 'Other', sub: 'Custom method' }
                  ].map(({ value, Icon, label, sub }) => (
                    <label key={value} className={`border-2 rounded-lg p-4 cursor-pointer hover:border-blue-500 transition ${formData.method === value ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}>
                      <input type="radio" name="method" value={value}
                        checked={formData.method === value} onChange={handleChange} className="sr-only" />
                      <div className={`text-center ${formData.method === value ? 'text-blue-600' : 'text-gray-600'}`}>
                        <Icon className="w-8 h-8 mx-auto mb-2" />
                        <p className="font-semibold">{label}</p>
                        <p className="text-xs mt-1">{sub}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {renderMethodFields()}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Delivery Date <span className="text-red-500">*</span>
                </label>
                <input type="date" name="estimatedDelivery" value={formData.estimatedDelivery}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${stepErrors.estimatedDelivery ? 'border-red-500' : 'border-gray-300'}`}
                />
                <FieldError field="estimatedDelivery" />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={onClose} disabled={loading}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition disabled:opacity-50">
                  Cancel
                </button>
                {/* FIX: validateStep1() runs before advancing — type="button" won't trigger HTML required */}
                <button type="button" onClick={handleNextStep} disabled={loading}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50">
                  Next: Add Photos
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Package Photos <span className="text-red-500">* (At least 1 required)</span>
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Camera className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <input type="file" accept="image/*" multiple
                    onChange={(e) => handleFileUpload(e, 'packagePhotos')}
                    className="hidden" id="package-photos" />
                  <label htmlFor="package-photos"
                    className="cursor-pointer text-blue-600 hover:text-blue-700 font-semibold">
                    Click to upload package photos
                  </label>
                  <p className="text-sm text-gray-500 mt-2">PNG, JPG up to 10MB each</p>
                </div>

                {formData.packagePhotos.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {formData.packagePhotos.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-green-50 px-3 py-2 rounded">
                        <p className="text-sm text-green-600">✓ {file.name}</p>
                        <button type="button" onClick={() => removePackagePhoto(index)}
                          className="text-red-500 hover:text-red-700">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes <span className="text-gray-500 font-normal">Optional</span>
                </label>
                <textarea name="additionalNotes" value={formData.additionalNotes}
                  onChange={handleChange} rows="3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Any additional information about the delivery..." />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Important:</strong> After marking as shipped, the buyer will have 3 days
                  after the expected delivery date to confirm receipt. If no action is taken,
                  payment will be automatically released to you.
                </p>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} disabled={loading}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition disabled:opacity-50">
                  Back
                </button>
                <button type="submit"
                  disabled={formData.packagePhotos.length === 0 || loading}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {loading ? (
                    <><Loader className="w-5 h-5 animate-spin" />Uploading...</>
                  ) : 'Submit & Mark as Shipped'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default DeliveryProofUpload;
