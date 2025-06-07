import React, { useState } from 'react';
import { ChevronDown, Star, Search, PlusCircle } from 'lucide-react';

interface CryptoDropdownProps {
  selectedCrypto: string;
  onCryptoChange: (crypto: string) => void;
  favoriteCryptos: string[];
  onToggleFavorite: (crypto: string) => void;
}

export const CryptoDropdown: React.FC<CryptoDropdownProps> = ({
  selectedCrypto,
  onCryptoChange,
  favoriteCryptos,
  onToggleFavorite
}) => {
  const cryptoOptions = [
    // Spot markets
    { symbol: 'BTCUSDT', name: 'Bitcoin (BTC)' },
    { symbol: 'ETHUSDT', name: 'Ethereum (ETH)' },
    { symbol: 'SOLUSDT', name: 'Solana (SOL)' },
    { symbol: 'BNBUSDT', name: 'Binance Coin (BNB)' },
    { symbol: 'XRPUSDT', name: 'Ripple (XRP)' },
    { symbol: 'ADAUSDT', name: 'Cardano (ADA)' },
    { symbol: 'DOGEUSDT', name: 'Dogecoin (DOGE)' },
    { symbol: 'DOTUSDT', name: 'Polkadot (DOT)' },
    { symbol: 'SUIUSDT', name: 'Sui (SUI)' },
    { symbol: 'AVAXUSDT', name: 'Avalanche (AVAX)' },
    { symbol: 'MATICUSDT', name: 'Polygon (MATIC)' },
    { symbol: 'NEARUSDT', name: 'Near Protocol (NEAR)' },
    { symbol: 'ATOMUSDT', name: 'Cosmos (ATOM)' },
    
    // Perpetual markets
    { symbol: 'BTCUSDTPERP', name: 'Bitcoin Perp (BTC/USDTP)' },
    { symbol: 'ETHUSDTPERP', name: 'Ethereum Perp (ETH/USDTP)' },
    { symbol: 'SOLUSDTPERP', name: 'Solana Perp (SOL/USDTP)' },
    { symbol: 'SUIUSDTPERP', name: 'Sui Perp (SUI/USDTP)' },
    { symbol: 'AVAXUSDTPERP', name: 'Avalanche Perp (AVAX/USDTP)' },
    { symbol: 'BNBUSDTPERP', name: 'Binance Coin Perp (BNB/USDTP)' },
    { symbol: 'MATICUSDTPERP', name: 'Polygon Perp (MATIC/USDTP)' },
    { symbol: 'XRPUSDTPERP', name: 'Ripple Perp (XRP/USDTP)' }
  ];
  
  // State to track if dropdown is open
  const [isOpen, setIsOpen] = useState(false);
  // State to track custom input value
  const [customInput, setCustomInput] = useState('');
  // State to filter options
  const [searchTerm, setSearchTerm] = useState('');
  
  // Handle clicking on the favorite star
  const handleStarClick = (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation(); // Prevent dropdown from closing
    onToggleFavorite(symbol);
  };

  // Handle custom input change
  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setCustomInput(value);
    
    // Only update the selected crypto if the input ends with a valid suffix
    if (value.endsWith('USDT') || value.endsWith('USDTPERP')) {
      onCryptoChange(value);
    }
  };

  // Handle custom input submission
  const handleCustomInputSubmit = () => {
    // Ensure the input has a valid suffix
    let formattedInput = customInput.toUpperCase();
    if (!formattedInput.endsWith('USDT') && !formattedInput.endsWith('USDTPERP')) {
      formattedInput += 'USDT';
    }
    
    onCryptoChange(formattedInput);
    setIsOpen(false);
  };

  // Handle selecting a predefined option
  const handleSelectOption = (symbol: string) => {
    onCryptoChange(symbol);
    setCustomInput('');
    setSearchTerm('');
    setIsOpen(false);
  };

  // Filter options based on search term
  const filteredOptions = cryptoOptions.filter(
    option => option.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
              option.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Custom dropdown implementation with stars
  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Select Cryptocurrency
      </label>
      
      {/* Custom dropdown trigger */}
      <div 
        className="relative w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md text-gray-900 cursor-pointer flex items-center justify-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>
          {/* Check if selectedCrypto is in the list of predefined options */}
          {cryptoOptions.find(c => c.symbol === selectedCrypto)?.name || selectedCrypto}
        </span>
        <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      {/* Dropdown options */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-80 overflow-auto">
          {/* Search input */}
          <div className="sticky top-0 bg-white px-3 py-2 border-b border-gray-200">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={14} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search..."
                className="pl-8 pr-3 py-1.5 w-full text-sm border border-gray-300 rounded-md"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()} // Prevent dropdown from closing
              />
            </div>
          </div>

          {/* Custom ticker input */}
          <div className="px-3 py-2 border-b border-gray-200 bg-blue-50">
            <div className="text-xs font-medium text-blue-700 mb-1">Custom Ticker</div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="e.g., FARTCOINUSDT"
                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md"
                value={customInput}
                onChange={handleCustomInputChange}
                onClick={(e) => e.stopPropagation()} // Prevent dropdown from closing
              />
              <button
                className="p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent dropdown from closing
                  handleCustomInputSubmit();
                }}
              >
                <PlusCircle size={16} />
              </button>
            </div>
            <div className="mt-1 text-xs text-blue-600">
              Enter any cryptocurrency ticker (append USDT or USDTPERP)
            </div>
          </div>

          {/* Predefined options */}
          <div className="py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">No results found</div>
            ) : (
              filteredOptions.map((crypto) => (
                <div 
                  key={crypto.symbol}
                  className={`px-3 py-2 flex items-center justify-between text-sm cursor-pointer hover:bg-gray-100 ${
                    selectedCrypto === crypto.symbol ? 'bg-blue-50 text-blue-700' : ''
                  }`}
                  onClick={() => handleSelectOption(crypto.symbol)}
                >
                  <span>{crypto.name}</span>
                  <Star 
                    size={16} 
                    onClick={(e) => handleStarClick(e, crypto.symbol)}
                    className={`cursor-pointer ${
                      favoriteCryptos.includes(crypto.symbol) 
                        ? 'fill-yellow-400 text-yellow-400' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
