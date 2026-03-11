// File: src/components/SignatureCapture.jsx
import React, { useRef, useState, useEffect } from 'react';
import { X, RotateCcw, Check, Camera } from 'lucide-react';

const SignatureCapture = ({ onClose, onComplete }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signatureMethod, setSignatureMethod] = useState('draw'); // 'draw' | 'type' | 'photo'
  const [typedName, setTypedName] = useState('');
  const [selfiePhoto, setSelfiePhoto] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && signatureMethod === 'draw') {
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [signatureMethod]);

  // ─── Mouse helpers ──────────────────────────────────────────────────────────
  const getMousePos = (canvas, e) => {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e) => {
    if (signatureMethod !== 'draw') return;
    setIsDrawing(true);
    setHasDrawn(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getMousePos(canvas, e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing || signatureMethod !== 'draw') return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getMousePos(canvas, e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  // ─── Touch helpers (mobile) ──────────────────────────────────────────────────
  // ✅ FIXED: Added touch event support so users can sign on mobile devices
  const getTouchPos = (canvas, e) => {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  };

  const startDrawingTouch = (e) => {
    if (signatureMethod !== 'draw') return;
    e.preventDefault();
    setIsDrawing(true);
    setHasDrawn(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getTouchPos(canvas, e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const drawTouch = (e) => {
    if (!isDrawing || signatureMethod !== 'draw') return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getTouchPos(canvas, e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  // ─── Shared actions ──────────────────────────────────────────────────────────
  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasDrawn(false);
    setTypedName('');
    setSelfiePhoto(null);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelfiePhoto(URL.createObjectURL(file));
      setHasDrawn(true);
    }
  };

  const handleConfirm = () => {
    let signatureData = {};

    if (signatureMethod === 'draw') {
      signatureData = {
        type: 'drawn',
        data: canvasRef.current.toDataURL(),
        timestamp: new Date().toISOString()
      };
    } else if (signatureMethod === 'type') {
      signatureData = {
        type: 'typed',
        data: typedName,
        timestamp: new Date().toISOString()
      };
    } else if (signatureMethod === 'photo') {
      signatureData = {
        type: 'photo',
        data: selfiePhoto,
        timestamp: new Date().toISOString()
      };
    }

    onComplete(signatureData);
  };

  const canConfirm = () => {
    if (signatureMethod === 'draw') return hasDrawn;
    if (signatureMethod === 'type') return typedName.trim() !== '';
    if (signatureMethod === 'photo') return !!selfiePhoto;
    return false;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Confirm Delivery</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Sign to confirm you received the item</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition p-1"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Method Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Signature Method
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'draw', label: 'Draw', emoji: '✍️' },
                { id: 'type', label: 'Type', emoji: '⌨️' },
                { id: 'photo', label: 'Photo', icon: Camera }
              ].map(({ id, label, emoji, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => { setSignatureMethod(id); clearSignature(); }}
                  className={`p-4 border-2 rounded-xl text-center transition ${
                    signatureMethod === id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {emoji ? (
                    <div className="text-2xl mb-2">{emoji}</div>
                  ) : (
                    <Icon className="w-6 h-6 mx-auto mb-2" />
                  )}
                  <p className="font-semibold text-sm">{label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Draw */}
          {signatureMethod === 'draw' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Draw Your Signature
              </label>
              <canvas
                ref={canvasRef}
                width={600}
                height={200}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawingTouch}
                onTouchMove={drawTouch}
                onTouchEnd={stopDrawing}
                className="w-full border-2 border-gray-300 dark:border-gray-700 rounded-xl cursor-crosshair bg-white touch-none"
                style={{ touchAction: 'none' }}
              />
              <button
                type="button"
                onClick={clearSignature}
                className="mt-3 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                Clear Signature
              </button>
            </div>
          )}

          {/* Type */}
          {signatureMethod === 'type' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type Your Full Legal Name
              </label>
              <input
                type="text"
                value={typedName}
                onChange={(e) => {
                  setTypedName(e.target.value);
                  setHasDrawn(e.target.value.trim() !== '');
                }}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-2xl font-serif"
                placeholder="John Doe"
              />
              {typedName && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Preview:</p>
                  <p className="text-4xl font-serif text-center text-gray-900 dark:text-white">{typedName}</p>
                </div>
              )}
              <div className="mt-3 flex items-center gap-2">
                <input type="checkbox" id="confirm-typed" required className="rounded" />
                <label htmlFor="confirm-typed" className="text-sm text-gray-600 dark:text-gray-400">
                  I confirm this is my legal name
                </label>
              </div>
            </div>
          )}

          {/* Photo */}
          {signatureMethod === 'photo' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Take a Selfie with the Item (Optional Extra Proof)
              </label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                capture="user"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              {!selfiePhoto ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-12 text-center hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition"
                >
                  <Camera className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 font-semibold">Click to take or upload photo</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Take a selfie holding the received item</p>
                </button>
              ) : (
                <div className="relative">
                  <img src={selfiePhoto} alt="Delivery proof" className="w-full rounded-xl border-2 border-gray-300 dark:border-gray-700" />
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition"
                    aria-label="Remove photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Confirmation notice */}
          <div className="mt-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
            <p className="text-sm text-green-800 dark:text-green-200 font-semibold mb-2">By signing, you confirm that:</p>
            <ul className="text-sm text-green-700 dark:text-green-300 space-y-1 list-disc list-inside">
              <li>You have received the item or service as described</li>
              <li>You are satisfied with the delivery</li>
              <li>Payment will be released to the seller immediately</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm()}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              Confirm & Release Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignatureCapture;
