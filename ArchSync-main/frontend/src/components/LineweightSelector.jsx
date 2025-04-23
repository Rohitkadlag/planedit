import React from 'react';
import { LINEWEIGHTS } from './constants/lineweights';

/**
 * Component for selecting standard architectural lineweights
 */
const LineweightSelector = ({ 
  selectedLineweight, 
  onLineweightChange,
  disabled = false
}) => {
  return (
    <div>
      <label htmlFor="lineweight" className="block text-sm font-medium text-gray-700 mb-1">
        Lineweight:
      </label>
      <select
        id="lineweight"
        value={selectedLineweight}
        onChange={(e) => onLineweightChange(e.target.value)}
        disabled={disabled}
        className={`block w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {LINEWEIGHTS.map((lineweight) => (
          <option key={lineweight.id} value={lineweight.id}>
            {lineweight.name} - {lineweight.description}
          </option>
        ))}
      </select>

      {/* Preview of different lineweights */}
      <div className="mt-2 p-2 border border-gray-200 bg-white rounded">
        <p className="text-xs text-gray-500 mb-1">Lineweight Preview:</p>
        <div className="flex flex-col space-y-3">
          {LINEWEIGHTS.map((lineweight) => (
            <div key={lineweight.id} className="flex items-center">
              <div className="w-12 mr-2">
                <div 
                  className="bg-black" 
                  style={{ 
                    height: Math.max(1, lineweight.size * 2.5), 
                    width: '100%',
                    opacity: lineweight.id === selectedLineweight ? 1 : 0.7
                  }}
                ></div>
              </div>
              <span className="text-xs">
                {lineweight.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LineweightSelector;