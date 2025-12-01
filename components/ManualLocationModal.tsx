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
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-cyan-400">Enter Location Manually</h3>
        <p className="text-sm text-gray-400">
          Set your starting point by name (e.g., "Main Market", "Railway Station"). Leave blank to clear and use GPS.
        </p>
        <div>
          <label htmlFor="manual-location" className="sr-only">Manual Location</label>
          <input
            id="manual-location"
            type="text"
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            placeholder="e.g., Town Center"
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:ring-cyan-500 focus:border-cyan-500"
            autoFocus
          />
        </div>
        <div className="flex justify-end space-x-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-md transition-colors"
          >
            Save Location
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualLocationModal;
