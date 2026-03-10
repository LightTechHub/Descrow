// src/components/DeliveryTracking.jsx
import React from 'react';
import { Truck, Package, MapPin, Calendar, Camera, ExternalLink } from 'lucide-react';

// FIX: courier tracking URL map — each courier has a different URL format
const COURIER_TRACKING_URLS = {
  DHL:        (n) => `https://www.dhl.com/en/express/tracking.html?AWB=${n}`,
  FedEx:      (n) => `https://www.fedex.com/apps/fedextrack/?tracknumbers=${n}`,
  UPS:        (n) => `https://www.ups.com/track?tracknum=${n}`,
  USPS:       (n) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`,
  'EMS':      (n) => `https://www.ems.com.cn/english/mailquery/external_mailquery.html?mailno=${n}`,
  'SF Express':(n) => `https://www.sf-international.com/us/en/dynamic_function/waybill/#search/bill-number/${n}`,
  '4PX':      (n) => `https://track.4px.com/#/result/0/${n}`,
  Yanwen:     (n) => `https://www.yanwen.com/en/main/querypack.do?wbcode=${n}`,
  Other:      (n) => `https://www.17track.net/en/track#nums=${n}`
};

const getCourierTrackingUrl = (courierName, trackingNumber) => {
  const builder = COURIER_TRACKING_URLS[courierName] || COURIER_TRACKING_URLS.Other;
  return builder(encodeURIComponent(trackingNumber));
};

// FIX: format ISO date string into readable format
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

const DeliveryTracking = ({ deliveryProof }) => {
  if (!deliveryProof) return null;

  const getMethodIcon = () => {
    switch (deliveryProof.method) {
      case 'courier': return <Truck className="w-6 h-6" />;
      case 'personal': return <MapPin className="w-6 h-6" />;
      default: return <Package className="w-6 h-6" />;
    }
  };

  const handleTrackCourier = () => {
    const url = getCourierTrackingUrl(
      deliveryProof.courierName,
      deliveryProof.trackingNumber
    );
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // FIX: real-time GPS would need a backend integration — for now show a meaningful message
  const handleViewLiveLocation = () => {
    if (deliveryProof.gpsTrackingUrl) {
      window.open(deliveryProof.gpsTrackingUrl, '_blank', 'noopener,noreferrer');
    } else {
      alert('Live tracking link will be sent to you via email and notification once the driver starts the journey.');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
          {getMethodIcon()}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Delivery Tracking</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
            {deliveryProof.method} Delivery
          </p>
        </div>
      </div>

      <div className="space-y-0">
        {/* Courier info */}
        {deliveryProof.method === 'courier' && (
          <>
            <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Courier Company</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {deliveryProof.courierName || '—'}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Tracking Number</span>
              <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                {deliveryProof.trackingNumber || '—'}
              </span>
            </div>
          </>
        )}

        {/* Personal delivery info */}
        {deliveryProof.method === 'personal' && (
          <>
            <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Vehicle Type</span>
              <span className="font-semibold text-gray-900 dark:text-white capitalize">
                {deliveryProof.vehicleType || '—'}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Plate Number</span>
              <span className="font-mono font-semibold text-gray-900 dark:text-white">
                {deliveryProof.plateNumber || '—'}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Driver Name</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {deliveryProof.driverName || '—'}
              </span>
            </div>
            {deliveryProof.gpsEnabled && (
              <div className="py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4 flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                      Live GPS Tracking Active
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      You can track the delivery in real-time
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Other method */}
        {deliveryProof.method === 'other' && deliveryProof.methodDescription && (
          <div className="flex justify-between items-start py-3 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400">Method</span>
            <span className="font-semibold text-gray-900 dark:text-white text-right max-w-[60%]">
              {deliveryProof.methodDescription}
            </span>
          </div>
        )}

        {/* Estimated delivery — FIX: formatted readable date */}
        <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>Expected Delivery</span>
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">
            {formatDate(deliveryProof.estimatedDelivery)}
          </span>
        </div>

        {/* Additional notes */}
        {deliveryProof.additionalNotes && (
          <div className="py-3 border-b border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Notes</p>
            <p className="text-sm text-gray-900 dark:text-white">{deliveryProof.additionalNotes}</p>
          </div>
        )}

        {/* FIX: photos now use photo.url / photo.fileUrl — not placeholder images */}
        {deliveryProof.photos && deliveryProof.photos.length > 0 && (
          <div className="py-4">
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 mb-3">
              <Camera className="w-4 h-4" />
              <span className="font-medium">
                Delivery Photos ({deliveryProof.photos.length})
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {deliveryProof.photos.map((photo, index) => {
                // FIX: use actual photo URL from backend — supports both field name conventions
                const photoUrl = photo.url || photo.fileUrl || photo.path || photo;
                return (
                  <a key={index} href={photoUrl} target="_blank" rel="noopener noreferrer"
                    className="block aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:opacity-90 transition group relative">
                    <img
                      src={photoUrl}
                      alt={`Delivery proof ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    {/* Fallback if image fails to load */}
                    <div style={{ display: 'none' }}
                      className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                      <div className="text-center text-gray-500 text-xs">
                        <Camera className="w-6 h-6 mx-auto mb-1" />
                        Photo {index + 1}
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition flex items-center justify-center">
                      <ExternalLink className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition drop-shadow" />
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-4 space-y-2">
        {/* FIX: working onClick that opens the correct courier tracking URL */}
        {deliveryProof.method === 'courier' && deliveryProof.trackingNumber && (
          <button onClick={handleTrackCourier}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2">
            <ExternalLink className="w-5 h-5" />
            Track on {deliveryProof.courierName || 'Courier'} Website
          </button>
        )}

        {/* FIX: working onClick for GPS tracking */}
        {deliveryProof.gpsEnabled && (
          <button onClick={handleViewLiveLocation}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2">
            <MapPin className="w-5 h-5" />
            View Live Location
          </button>
        )}
      </div>
    </div>
  );
};

export default DeliveryTracking;
