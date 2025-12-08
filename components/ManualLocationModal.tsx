
import React, { useState, useEffect } from 'react';

interface ManualLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (location: string) => void;
  currentLocation: string | null;
}

const ManualLocationModal: React.FC<ManualLocationModalProps> = ({ isOpen, onClose, onSave, currentLocation }) => {
  const [locationInput, setLocationInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLocationInput(currentLocation || '');
    }
  }, [isOpen, currentLocation]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(locationInput);
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
            <h3 className="text-xl font-bold text-slate-900">Enter Location Manually</h3>
            <p className="text-sm text-slate-500 mt-1">
            Set your starting point by name (e.g., "Main Market", "Railway Station"). Leave blank to clear and use GPS.
            </p>
        </div>
        
        <div>
          <label htmlFor="manual-location" className="sr-only">Manual Location</label>
          <input
            id="manual-location"
            type="text"
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            placeholder="e.g., Town Center"
            className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            autoFocus
          />
        </div>
        <div className="flex justify-end space-x-3 pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-sm"
          >
            Save Location
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualLocationModal;
