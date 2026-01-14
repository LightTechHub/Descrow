// src/components/BusinessKYCUpload.jsx - REFINED & FIXED
import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader, Globe, X, Eye, Shield, Clock } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const BusinessKYCUpload = ({ user, onSuccess, onCancel }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [files, setFiles] = useState({
    businessRegistration: null,
    directorId: null,
    proofOfAddress: null,
    taxDocument: null,
    additionalDoc: null
  });
  const [previews, setPreviews] = useState({});
  const [dragOver, setDragOver] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // ✅ Get country-specific labels
  const getDocumentLabels = () => {
    const country = user?.address?.country || user?.businessInfo?.country || 'Global';

    const countryDocs = {
      'Nigeria': {
        registration: 'CAC Certificate of Incorporation',
        tax: 'Tax Identification Number (TIN)',
        idType: 'NIN, Driver\'s License, or International Passport'
      },
      'Kenya': {
        registration: 'Certificate of Incorporation',
        tax: 'KRA PIN Certificate',
        idType: 'National ID or Passport'
      },
      'Ghana': {
        registration: 'Company Registration Certificate',
        tax: 'TIN Certificate',
        idType: 'Ghana Card or Passport'
      },
      'South Africa': {
        registration: 'CIPC Registration Certificate',
        tax: 'Tax Clearance Certificate',
        idType: 'ID Book or Passport'
      },
      'United States': {
        registration: 'Articles of Incorporation',
        tax: 'EIN Confirmation Letter',
        idType: 'Driver\'s License or Passport'
      },
      'United Kingdom': {
        registration: 'Certificate of Incorporation',
        tax: 'UTR (Unique Taxpayer Reference)',
        idType: 'Passport or Driver\'s Licence'
      },
      'Germany': {
        registration: 'Handelsregisterauszug',
        tax: 'Steuernummer Bescheinigung',
        idType: 'Personalausweis or Reisepass'
      },
      'France': {
        registration: 'Extrait K-bis',
        tax: 'Numéro SIRET/SIREN',
        idType: 'Carte Nationale d\'Identité or Passeport'
      }
    };

    return countryDocs[country] || {
      registration: 'Business Registration Certificate',
      tax: 'Tax Identification Document',
      idType: 'Government-issued ID or Passport'
    };
  };

  const labels = getDocumentLabels();

  const requiredDocs = [
    {
      field: 'businessRegistration',
      label: labels.registration,
      required: true,
      description: 'Official certificate showing your business is registered with the government',
      icon: '🏢'
    },
    {
      field: 'directorId',
      label: `Director/Owner ID (${labels.idType})`,
      required: true,
      description: 'Valid government-issued identification of the business owner or director',
      icon: '🪪'
    },
    {
      field: 'proofOfAddress',
      label: 'Proof of Business Address',
      required: true,
      description: 'Recent utility bill, bank statement, or rental agreement (within last 3 months)',
      icon: '🏠'
    },
    {
      field: 'taxDocument',
      label: labels.tax,
      required: false,
      description: 'Tax registration certificate or tax ID number document (recommended)',
      icon: '📋'
    },
    {
      field: 'additionalDoc',
      label: 'Additional Document (Optional)',
      required: false,
      description: 'Memorandum & Articles of Association, Business License, or other relevant document',
      icon: '📄'
    }
  ];

  // ✅ Validate file
  const validateFile = (file, field) => {
    // Check file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error(`File too large: ${file.name} (max 10MB)`);
      return false;
    }

    // Check file name length
    if (file.name.length > 200) {
      toast.error('File name is too long. Please rename the file.');
      return false;
    }

    // Check for potentially dangerous file names
    const dangerousPatterns = /\.(exe|bat|cmd|sh|php|js|html|htm|vbs|scr|pif)$/i;
    if (dangerousPatterns.test(file.name)) {
      toast.error('File type not allowed for security reasons.');
      return false;
    }

    // Validate file type by extension AND mime type
    const allowedExtensions = ['.jpeg', '.jpg', '.png', '.pdf', '.jpeg', '.jpg', '.png', '.pdf'];
    const fileExt = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    
    if (!allowedExtensions.includes(fileExt)) {
      toast.error('Only JPEG, PNG, and PDF files are allowed');
      return false;
    }

    // Additional mime type validation
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/pdf'
    ];
    
    if (!allowedMimeTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload a valid document.');
      return false;
    }

    return true;
  };

  const handleFileChange = (field, event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!validateFile(file, field)) {
      return;
    }

    setFiles(prev => ({
      ...prev,
      [field]: file
    }));

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => ({
          ...prev,
          [field]: reader.result
        }));
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      setPreviews(prev => ({
        ...prev,
        [field]: 'pdf'
      }));
    }
  };

  const handleDragOver = (field, e) => {
    e.preventDefault();
    setDragOver(field);
  };

  const handleDragLeave = () => {
    setDragOver(null);
  };

  const handleDrop = (field, e) => {
    e.preventDefault();
    setDragOver(null);
    
    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (!validateFile(file, field)) {
      return;
    }

    setFiles(prev => ({
      ...prev,
      [field]: file
    }));

    // Create preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => ({
          ...prev,
          [field]: reader.result
        }));
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      setPreviews(prev => ({
        ...prev,
        [field]: 'pdf'
      }));
    }
  };

  const removeFile = (field) => {
    setFiles(prev => ({
      ...prev,
      [field]: null
    }));
    setPreviews(prev => {
      const newPreviews = { ...prev };
      delete newPreviews[field];
      return newPreviews;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required documents
    if (!files.businessRegistration || !files.directorId || !files.proofOfAddress) {
      toast.error('Please upload all required documents (marked with *)');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      // Create FormData
      const formData = new FormData();
      Object.keys(files).forEach(key => {
        if (files[key]) {
          formData.append(key, files[key]);
        }
      });

      // Add metadata
      formData.append('country', user?.address?.country || user?.businessInfo?.country || '');
      formData.append('businessName', user?.businessInfo?.companyName || '');
      formData.append('userId', user?._id || '');

      const token = localStorage.getItem('token');
      
      // Show upload progress toast
      const toastId = toast.loading('Starting upload...');

      const response = await axios.post(
        `${API_URL}/kyc/upload-business-documents`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
            toast.loading(`Uploading: ${percentCompleted}%`, { id: toastId });
          }
        }
      );

      if (response.data.success) {
        toast.success('✅ Documents uploaded successfully! We\'ll review them within 1-3 business days.', {
          duration: 5000,
          icon: '🎉'
        });
        
        // Reset form
        setFiles({
          businessRegistration: null,
          directorId: null,
          proofOfAddress: null,
          taxDocument: null,
          additionalDoc: null
        });
        setPreviews({});
        
        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess(response.data);
        }
      } else {
        toast.error(response.data.message || 'Upload failed. Please try again.');
      }

    } catch (error) {
      console.error('❌ Upload error:', error);
      
      let errorMessage = 'Failed to upload documents. Please try again.';
      
      if (error.response) {
        // Server responded with error
        if (error.response.status === 413) {
          errorMessage = 'File too large. Maximum size is 10MB per file.';
        } else if (error.response.status === 400) {
          errorMessage = error.response.data.message || 'Invalid file format.';
        } else if (error.response.status === 401) {
          errorMessage = 'Session expired. Please login again.';
        } else if (error.response.status === 429) {
          errorMessage = 'Too many upload attempts. Please try again in a few minutes.';
        }
      } else if (error.request) {
        // Request made but no response
        errorMessage = 'Network error. Please check your connection.';
      }
      
      toast.error(errorMessage);

    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Check if all required files are uploaded
  const allRequiredUploaded = files.businessRegistration && files.directorId && files.proofOfAddress;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 sm:p-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-4 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl mb-4">
            <FileText className="w-12 h-12 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Business Verification Documents
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-3">
            Upload your business documents for verification
          </p>
          {user?.address?.country && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-full text-sm text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              <Globe className="w-4 h-4" />
              <span className="font-medium">Country: {user.address.country}</span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {uploading && (
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-400">Uploading...</span>
              <span className="font-medium text-blue-600 dark:text-blue-400">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Info Banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 dark:text-blue-200 mb-1">Document Requirements:</p>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <li className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  <span>Files must be JPEG, PNG, or PDF format</span>
                </li>
                <li className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  <span>Maximum file size: 10MB per document</span>
                </li>
                <li className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  <span>Documents must be clear and readable</span>
                </li>
                <li className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  <span>Address proof must be recent (within last 3 months)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Upload Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {requiredDocs.map(doc => (
            <div 
              key={doc.field} 
              className={`border rounded-lg p-4 sm:p-6 transition-all ${
                dragOver === doc.field 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500' 
                  : files[doc.field]
                  ? 'border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-900/10'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
              }`}
              onDragOver={(e) => handleDragOver(doc.field, e)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(doc.field, e)}
            >
              
              {/* Document Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-1">
                    <span className="text-2xl">{doc.icon}</span>
                    {doc.label}
                    {doc.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <p className="text-xs text-gray-600 dark:text-gray-400 ml-10">
                    {doc.description}
                  </p>
                </div>
                {files[doc.field] && (
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                )}
              </div>

              {/* File Input or Preview */}
              {!files[doc.field] ? (
                <div className="relative">
                  <input
                    type="file"
                    id={doc.field}
                    accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/jpg,image/png,application/pdf"
                    onChange={(e) => handleFileChange(doc.field, e)}
                    className="hidden"
                  />
                  <label
                    htmlFor={doc.field}
                    className={`flex flex-col items-center justify-center gap-2 px-4 py-8 border-2 border-dashed rounded-lg cursor-pointer transition ${
                      dragOver === doc.field
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500'
                    }`}
                  >
                    <Upload className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Click to upload or drag & drop
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      JPEG, PNG, or PDF (max 10MB)
                    </span>
                  </label>
                </div>
              ) : (
                <div className="relative bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {previews[doc.field] === 'pdf' ? (
                        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                          <FileText className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                      ) : previews[doc.field] ? (
                        <img 
                          src={previews[doc.field]} 
                          alt="Preview" 
                          className="w-12 h-12 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">
                          {files[doc.field].name}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {(files[doc.field].size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(doc.field)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition"
                      disabled={uploading}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={uploading}
                className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            )}
            
            <button
              type="submit"
              disabled={uploading || !allRequiredUploaded}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition shadow-lg ${
                allRequiredUploaded && !uploading
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              {uploading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader className="w-5 h-5 animate-spin" />
                  Uploading... {uploadProgress}%
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-5 h-5" />
                  Submit for Verification
                </div>
              )}
            </button>
          </div>

          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            By submitting, you confirm that all information provided is accurate and up-to-date
          </p>
        </form>

        {/* Security & Timeline Info */}
        <div className="mt-8 space-y-6">
          <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-lg border border-green-200 dark:border-green-800">
            <Shield className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900 dark:text-white mb-1">
                Your data is secure & encrypted
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                All documents are encrypted using AES-256 encryption. We comply with GDPR, NDPR, and other international data protection regulations.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-lg border border-amber-200 dark:border-amber-800">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900 dark:text-white mb-1">
                What happens next?
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Our team reviews your documents within 1-3 business days</li>
                <li>• You'll receive an email notification once reviewed</li>
                <li>• If approved, you can start using escrow services immediately</li>
                <li>• If additional info is needed, we'll contact you</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessKYCUpload;
