import React from 'react';

interface JournalEntryProps {
  notes: string;
  setNotes: (notes: string) => void;
  systemName: string;
  setSystemName: (systemName: string) => void;
  entryPicUrl: string;
  setEntryPicUrl: (entryPicUrl: string) => void;
  takeProfitPrice: string;
  setTakeProfitPrice: (takeProfitPrice: string) => void;
  isDisabled: boolean;
}

export const JournalEntry: React.FC<JournalEntryProps> = ({
  notes,
  setNotes,
  systemName,
  setSystemName,
  entryPicUrl,
  setEntryPicUrl,
  takeProfitPrice,
  setTakeProfitPrice,
  isDisabled
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 space-y-4 w-full">
      <h3 className="text-sm font-medium text-gray-700">Trade Details</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            System Name
          </label>
          <input
            type="text"
            value={systemName}
            onChange={(e) => setSystemName(e.target.value)}
            disabled={isDisabled}
            className={`w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
              isDisabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            placeholder="Enter trading system name"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Take Profit Price
          </label>
          <input
            type="number"
            value={takeProfitPrice}
            onChange={(e) => setTakeProfitPrice(e.target.value)}
            disabled={isDisabled}
            className={`w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
              isDisabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            placeholder="Enter take profit price"
            step="0.01"
            min="0"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Entry Picture URL
          </label>
          <input
            type="text"
            value={entryPicUrl}
            onChange={(e) => setEntryPicUrl(e.target.value)}
            disabled={isDisabled}
            className={`w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
              isDisabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            placeholder="https://example.com/chart-screenshot.png"
          />
          {entryPicUrl && (
            <div className="mt-2 p-2 border border-gray-200 rounded-md">
              <img 
                src={entryPicUrl} 
                alt="Entry chart" 
                className="max-h-36 object-contain mx-auto"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=Invalid+Image+URL';
                }}
              />
            </div>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isDisabled}
            rows={3}
            className={`w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none ${
              isDisabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            placeholder="Add your trade notes here..."
          />
        </div>
      </div>
    </div>
  );
};