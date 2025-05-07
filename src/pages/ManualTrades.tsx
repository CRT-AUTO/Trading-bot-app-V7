import React, { useState, useEffect } from 'react';
import { Calculator } from '../components/Calculator';
import { CryptoDropdown } from '../components/CryptoDropdown';
import { ArrowDownUp, Star, RefreshCw, History } from 'lucide-react';
import { Link } from 'react-router-dom';

const ManualTrades: React.FC = () => {
  const [livePrice, setLivePrice] = useState<string>('');
  const [selectedCrypto, setSelectedCrypto] = useState<string>('BTCUSDT');
  const [useLivePrice, setUseLivePrice] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [favoriteCryptos, setFavoriteCryptos] = useState<string[]>([]);

  // Load favorite cryptos from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('favoriteCryptos');
    if (savedFavorites) {
      setFavoriteCryptos(JSON.parse(savedFavorites));
    }
  }, []);

  // Save favorite cryptos to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('favoriteCryptos', JSON.stringify(favoriteCryptos));
  }, [favoriteCryptos]);

  const fetchPrice = async (symbol: string) => {
    if (!useLivePrice) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Format symbol for Bybit API (remove PERP suffix)
      const formattedSymbol = symbol.endsWith('PERP') 
        ? symbol.replace('PERP', '')
        : symbol;
      
      // Handle both spot and perpetual symbols
      const category = symbol.endsWith('PERP') ? 'linear' : 'spot';
      
      console.log(`Fetching price for ${formattedSymbol} in category ${category}`);
      
      // Using the orderbook API endpoint from Bybit
      const response = await fetch(`https://api.bybit.com/v5/market/orderbook?category=${category}&symbol=${formattedSymbol}&limit=1`);
      const data = await response.json();
      
      if (data.retCode === 0 && data.result && data.result.a && data.result.a.length > 0) {
        // Using the "a" (ask) price as the execution price as it's more accurate for entries
        setLivePrice(data.result.a[0][0]);
      } else {
        setError('Failed to fetch price data');
      }
    } catch (err) {
      setError('Error connecting to Bybit API');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchPrice(selectedCrypto);
    
    // Set up interval to refresh price every 1 second
    const interval = setInterval(() => {
      if (useLivePrice) {
        fetchPrice(selectedCrypto);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [selectedCrypto, useLivePrice]);

  const handleCryptoChange = (crypto: string) => {
    setSelectedCrypto(crypto);
    fetchPrice(crypto);
  };

  const toggleFavorite = (crypto: string) => {
    if (favoriteCryptos.includes(crypto)) {
      // Remove from favorites
      setFavoriteCryptos(prevFavorites => prevFavorites.filter(fav => fav !== crypto));
    } else {
      // Add to favorites (limit to 3)
      if (favoriteCryptos.length < 3) {
        setFavoriteCryptos(prevFavorites => [...prevFavorites, crypto]);
      } else {
        // If we already have 3 favorites, replace the oldest one
        setFavoriteCryptos(prevFavorites => [...prevFavorites.slice(1), crypto]);
      }
    }
  };

  // Get crypto name from symbol
  const getCryptoNameFromSymbol = (symbol: string): string => {
    // Most common cryptos
    if (symbol === 'BTCUSDT') return 'BTC';
    if (symbol === 'ETHUSDT') return 'ETH';
    if (symbol === 'SOLUSDT') return 'SOL';
    if (symbol === 'BNBUSDT') return 'BNB';
    if (symbol === 'XRPUSDT') return 'XRP';
    if (symbol === 'ADAUSDT') return 'ADA';
    if (symbol === 'DOGEUSDT') return 'DOGE';
    if (symbol === 'DOTUSDT') return 'DOT';
    
    // Perpetual markets
    if (symbol === 'BTCUSDTPERP') return 'BTC/P';
    if (symbol === 'ETHUSDTPERP') return 'ETH/P';
    if (symbol === 'SOLUSDTPERP') return 'SOL/P';
    
    // Default fallback - just show the first 3-4 characters
    return symbol.substring(0, 4);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <ArrowDownUp className="mr-2" />
          Manual Trading Calculator
        </h1>
        
        <Link
          to="/manual-trades-history"
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <History size={18} className="mr-2" />
          <span>View Trade History</span>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        {/* Favorite Cryptos Quick Buttons */}
        {favoriteCryptos.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 pb-3 border-b border-gray-200">
            <span className="text-sm text-gray-500 flex items-center mr-1">
              <Star size={16} className="mr-1 text-yellow-500"/> Favorites:
            </span>
            {favoriteCryptos.map(crypto => (
              <button
                key={crypto}
                onClick={() => handleCryptoChange(crypto)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  selectedCrypto === crypto 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {getCryptoNameFromSymbol(crypto)}
              </button>
            ))}
          </div>
        )}
        
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mb-4">
          <div className="w-full md:w-64">
            <CryptoDropdown 
              selectedCrypto={selectedCrypto} 
              onCryptoChange={handleCryptoChange}
              favoriteCryptos={favoriteCryptos}
              onToggleFavorite={toggleFavorite} 
            />
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="useLivePrice"
              checked={useLivePrice}
              onChange={(e) => setUseLivePrice(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="useLivePrice" className="text-sm text-gray-700">Use Live Price</label>
          </div>
          
          {isLoading && (
            <div className="flex items-center text-sm text-gray-500">
              <RefreshCw size={14} className="animate-spin mr-1" />
              <span>Loading...</span>
            </div>
          )}
          
          {error && (
            <span className="text-sm text-red-600">{error}</span>
          )}
          
          {livePrice && useLivePrice && !isLoading && !error && (
            <span className="text-sm text-green-600 font-medium">
              Current price: {parseFloat(livePrice).toFixed(2)} USDT
            </span>
          )}
        </div>
        
        <Calculator 
          livePrice={useLivePrice ? livePrice : ''} 
          selectedCrypto={selectedCrypto}
        />
      </div>
    </div>
  );
};

export default ManualTrades;