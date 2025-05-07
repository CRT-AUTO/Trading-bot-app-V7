import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { RefreshCw, Search, Download, ArrowUp, ArrowDown, Info, Calculator, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

type ManualTrade = {
  id: string;
  symbol: string;
  side: 'Buy' | 'Sell';
  entry_date: string;
  entry_price: number;
  take_profit: number | null;
  stop_loss: number | null;
  quantity: number;
  r_multiple: number | null;
  system_id: string | null;
  notes: string | null;
  pic_entry: string | null;
  pic_exit: string | null;
  win_loss: string | null;
  finish_r: number | null;
  finish_usd: number | null;
  max_risk: number | null;
  leverage: number | null;
  status: string;
  close_price: number | null;
  pnl: number | null;
  open_time: string | null;
  close_time: string | null;
};

const ManualTradeHistory: React.FC = () => {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [trades, setTrades] = useState<ManualTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [symbolFilter, setSymbolFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [uniqueSymbols, setUniqueSymbols] = useState<string[]>([]);
  const [totalPnl, setTotalPnl] = useState(0);
  const [selectedTrade, setSelectedTrade] = useState<ManualTrade | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [updatedNotes, setUpdatedNotes] = useState('');
  const [updatedEntryPicUrl, setUpdatedEntryPicUrl] = useState('');
  const [updatedExitPicUrl, setUpdatedExitPicUrl] = useState('');
  const [updatedTakeProfit, setUpdatedTakeProfit] = useState<string>('');
  const [sortField, setSortField] = useState<string>('entry_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [updatingTradeId, setUpdatingTradeId] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Fetch trade data on component mount and when user changes
  const fetchTrades = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('manual_trades')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false });
        
      if (error) throw error;
      
      setTrades(data || []);
      
      // Extract unique symbols
      const symbols = [...new Set((data || []).map(trade => trade.symbol))];
      setUniqueSymbols(symbols);
      
      // Calculate total PnL
      const total = (data || []).reduce((sum, trade) => {
        return sum + (trade.pnl || 0);
      }, 0);
      setTotalPnl(total);
      
    } catch (error) {
      console.error('Error fetching manual trades:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrades();
  }, [supabase, user]);

  // Filter trades based on search term and filters
  const filteredTrades = trades.filter(trade => {
    const matchesSearch = searchTerm === '' || 
      trade.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (trade.system_id && trade.system_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      trade.side.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesSymbol = symbolFilter === '' || trade.symbol === symbolFilter;
    const matchesState = stateFilter === '' || 
      (stateFilter === 'open' && trade.status === 'open') ||
      (stateFilter === 'closed' && trade.status === 'closed');
    
    return matchesSearch && matchesSymbol && matchesState;
  });

  // Export to CSV
  const exportToCsv = () => {
    if (filteredTrades.length === 0) return;
    
    const headers = [
      'Date', 'Symbol', 'Side', 'Entry Price', 'Close Price', 'Quantity', 
      'Stop Loss', 'Take Profit', 'P/L', 'R Multiple', 'System', 'Notes',
      'Status', 'Max Risk', 'Leverage'
    ];
    
    const csvRows = [
      headers.join(','),
      ...filteredTrades.map(trade => [
        format(new Date(trade.entry_date), 'yyyy-MM-dd HH:mm:ss'),
        trade.symbol,
        trade.side,
        trade.entry_price,
        trade.close_price || '',
        trade.quantity,
        trade.stop_loss || '',
        trade.take_profit || '',
        trade.pnl || 0,
        trade.finish_r || '',
        `"${trade.system_id || ''}"`,
        `"${trade.notes?.replace(/"/g, '""') || ''}"`,
        trade.status,
        trade.max_risk || '',
        trade.leverage || ''
      ].join(','))
    ];
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `manual_trades_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.click();
  };

  // Show trade details in modal
  const viewTradeDetails = (trade: ManualTrade) => {
    setSelectedTrade(trade);
    setUpdatedNotes(trade.notes || '');
    setUpdatedEntryPicUrl(trade.pic_entry || '');
    setUpdatedExitPicUrl(trade.pic_exit || '');
    setUpdatedTakeProfit(trade.take_profit ? trade.take_profit.toString() : '');
    setEditMode(false);
    setShowDetailsModal(true);
    setUpdateSuccess(false);
    setUpdateError(null);
  };

  // Close the details modal
  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedTrade(null);
    setEditMode(false);
    setUpdateSuccess(false);
    setUpdateError(null);
  };

  // Handle sort
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Update trade details
  const updateTradeDetails = async () => {
    if (!selectedTrade || !user) return;
    
    try {
      const { error } = await supabase
        .from('manual_trades')
        .update({
          notes: updatedNotes,
          pic_entry: updatedEntryPicUrl,
          pic_exit: updatedExitPicUrl,
          take_profit: updatedTakeProfit ? parseFloat(updatedTakeProfit) : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTrade.id)
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      // Update the trade in the local state
      setTrades(trades.map(trade => 
        trade.id === selectedTrade.id 
          ? { 
              ...trade, 
              notes: updatedNotes, 
              pic_entry: updatedEntryPicUrl, 
              pic_exit: updatedExitPicUrl,
              take_profit: updatedTakeProfit ? parseFloat(updatedTakeProfit) : null
            } 
          : trade
      ));
      
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
      
      // Update the selectedTrade state
      setSelectedTrade({
        ...selectedTrade,
        notes: updatedNotes,
        pic_entry: updatedEntryPicUrl,
        pic_exit: updatedExitPicUrl,
        take_profit: updatedTakeProfit ? parseFloat(updatedTakeProfit) : null
      });
      
      setEditMode(false);
    } catch (error: any) {
      console.error('Error updating trade:', error);
      setUpdateError(error.message || 'Failed to update trade');
    }
  };

  // Function to manually update trade PnL
  const handleManualUpdate = async (trade: ManualTrade) => {
    try {
      setUpdatingTradeId(trade.id);
      
      // Call the manualUpdateTradePnl edge function
      const response = await fetch(`/.netlify/functions/closeManualTrade/${trade.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          exitPicUrl: trade.pic_exit,
          notes: trade.notes
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to update trade PnL:', errorText);
        throw new Error(errorText);
      }
      
      const result = await response.json();
      console.log('Trade PnL update result:', result);
      
      if (result.success) {
        // Refresh the trades list
        fetchTrades();
        
        if (result.pnl_found) {
          alert(`Trade closed successfully! PnL: ${result.realized_pnl.toFixed(2)} USDT`);
        } else {
          alert('Trade marked as closed, but no matching PnL data was found. The PnL data will be updated when it becomes available from the exchange.');
        }
      } else {
        alert(result.message || 'Failed to update trade PnL');
      }
    } catch (error: any) {
      console.error('Error updating trade PnL:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setUpdatingTradeId(null);
    }
  };

  // Sort trades
  const sortedTrades = [...filteredTrades].sort((a, b) => {
    if (sortField === 'entry_date') {
      const dateA = new Date(a.entry_date).getTime();
      const dateB = new Date(b.entry_date).getTime();
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    }
    
    if (sortField === 'close_time') {
      const dateA = a.close_time ? new Date(a.close_time).getTime() : 0;
      const dateB = b.close_time ? new Date(b.close_time).getTime() : 0;
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    }
    
    if (sortField === 'pnl') {
      const pnlA = a.pnl || 0;
      const pnlB = b.pnl || 0;
      return sortDirection === 'asc' ? pnlA - pnlB : pnlB - pnlA;
    }
    
    if (sortField === 'quantity') {
      return sortDirection === 'asc' ? a.quantity - b.quantity : b.quantity - a.quantity;
    }
    
    if (sortField === 'entry_price') {
      return sortDirection === 'asc' ? a.entry_price - b.entry_price : b.entry_price - a.entry_price;
    }
    
    if (sortField === 'close_price') {
      const priceA = a.close_price || 0;
      const priceB = b.close_price || 0;
      return sortDirection === 'asc' ? priceA - priceB : priceB - priceA;
    }
    
    if (sortField === 'r_multiple' || sortField === 'finish_r') {
      const rA = a[sortField as keyof ManualTrade] as number || 0;
      const rB = b[sortField as keyof ManualTrade] as number || 0;
      return sortDirection === 'asc' ? rA - rB : rB - rA;
    }
    
    // Default sorting for string fields
    const aValue = (a[sortField as keyof ManualTrade] || '').toString();
    const bValue = (b[sortField as keyof ManualTrade] || '').toString();
    
    return sortDirection === 'asc'
      ? aValue.localeCompare(bValue)
      : bValue.localeCompare(aValue);
  });

  // Render sort indicator
  const renderSortIndicator = (field: string) => {
    if (sortField !== field) return null;
    
    return sortDirection === 'asc' 
      ? <ArrowUp size={14} className="ml-1 inline" /> 
      : <ArrowDown size={14} className="ml-1 inline" />;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manual Trades History</h1>
        
        <div className="flex gap-3">
          <Link
            to="/manual-trades"
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Calculator size={18} className="mr-2" />
            <span>Trading Calculator</span>
          </Link>
          
          <button
            onClick={exportToCsv}
            disabled={filteredTrades.length === 0}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400"
          >
            <Download size={18} className="mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search trades..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <div className="w-40">
              <select
                value={symbolFilter}
                onChange={(e) => setSymbolFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All Symbols</option>
                {uniqueSymbols.map(symbol => (
                  <option key={symbol} value={symbol}>{symbol}</option>
                ))}
              </select>
            </div>
            
            <div className="w-40">
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All States</option>
                <option value="open">Open Trades</option>
                <option value="closed">Closed Trades</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-3">
            <div className="text-sm text-gray-500">Total Trades</div>
            <div className="text-xl font-semibold">{filteredTrades.length}</div>
          </div>
          
          <div className="p-3">
            <div className="text-sm text-gray-500">Total Profit/Loss</div>
            <div className={`text-xl font-semibold ${totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalPnl.toFixed(2)} USDT
            </div>
          </div>
          
          <div className="p-3">
            <div className="text-sm text-gray-500">Average P/L per Trade</div>
            <div className={`text-xl font-semibold ${totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {filteredTrades.length > 0 ? (totalPnl / filteredTrades.length).toFixed(2) : '0.00'} USDT
            </div>
          </div>
          
          <div className="p-3">
            <div className="text-sm text-gray-500">Win Rate</div>
            <div className="text-xl font-semibold text-blue-600">
              {(() => {
                const closedTrades = filteredTrades.filter(t => t.status === 'closed');
                if (closedTrades.length === 0) return '0.00%';
                const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
                return ((winningTrades.length / closedTrades.length) * 100).toFixed(1) + '%';
              })()}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <RefreshCw size={32} className="text-blue-600 animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {filteredTrades.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">No trades found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('entry_date')}
                    >
                      Entry Date {renderSortIndicator('entry_date')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('symbol')}
                    >
                      Symbol {renderSortIndicator('symbol')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('side')}
                    >
                      Side {renderSortIndicator('side')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('entry_price')}
                    >
                      Entry Price {renderSortIndicator('entry_price')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('close_price')}
                    >
                      Exit Price {renderSortIndicator('close_price')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('quantity')}
                    >
                      Quantity {renderSortIndicator('quantity')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('pnl')}
                    >
                      P/L {renderSortIndicator('pnl')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('finish_r')}
                    >
                      R Multiple {renderSortIndicator('finish_r')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('system_id')}
                    >
                      System {renderSortIndicator('system_id')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('status')}
                    >
                      Status {renderSortIndicator('status')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('close_time')}
                    >
                      Close Date {renderSortIndicator('close_time')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedTrades.map((trade) => (
                    <tr key={trade.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(trade.entry_date), 'MMM dd, HH:mm')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {trade.symbol}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          trade.side === 'Buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {trade.side}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {trade.entry_price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {trade.close_price !== null ? trade.close_price.toFixed(2) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {trade.quantity.toFixed(4)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`font-medium ${
                          (trade.pnl || 0) > 0 ? 'text-green-600' : 
                          (trade.pnl || 0) < 0 ? 'text-red-600' : 'text-gray-500'
                        }`}>
                          {trade.pnl !== null ? trade.pnl.toFixed(2) : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`font-medium ${
                          (trade.finish_r || 0) > 0 ? 'text-green-600' : 
                          (trade.finish_r || 0) < 0 ? 'text-red-600' : 'text-gray-500'
                        }`}>
                          {trade.finish_r !== null ? `${trade.finish_r.toFixed(2)}R` : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {trade.system_id || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          trade.status === 'open' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {trade.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {trade.close_time ? format(new Date(trade.close_time), 'MMM dd, HH:mm') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-3">
                          <button
                            onClick={() => viewTradeDetails(trade)}
                            className="text-blue-600 hover:text-blue-900 flex items-center"
                          >
                            <Info size={16} className="mr-1" /> Details
                          </button>
                          
                          {trade.status === 'open' && (
                            <button
                              onClick={() => handleManualUpdate(trade)}
                              disabled={updatingTradeId === trade.id}
                              className={`text-red-600 hover:text-red-900 flex items-center ${updatingTradeId === trade.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {updatingTradeId === trade.id ? (
                                <>
                                  <RefreshCw size={16} className="mr-1 animate-spin" /> Updating...
                                </>
                              ) : (
                                'Close Trade'
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedTrade && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-xl font-bold">Trade Details: {selectedTrade.symbol}</h3>
              <button 
                onClick={closeDetailsModal}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
            
            {updateSuccess && (
              <div className="m-4 p-2 bg-green-50 border border-green-200 rounded-md flex items-center">
                <CheckCircle size={16} className="text-green-600 mr-2" />
                <p className="text-sm text-green-700">Trade updated successfully!</p>
              </div>
            )}
            
            {updateError && (
              <div className="m-4 p-2 bg-red-50 border border-red-200 rounded-md flex items-center">
                <XCircle size={16} className="text-red-600 mr-2" />
                <p className="text-sm text-red-700">{updateError}</p>
              </div>
            )}
            
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-lg">{selectedTrade.symbol}</h4>
                      <div className="flex items-center mt-1">
                        <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          selectedTrade.side === 'Buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {selectedTrade.side}
                        </span>
                        <span className={`ml-2 px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          selectedTrade.status === 'open' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedTrade.status}
                        </span>
                      </div>
                    </div>
                    
                    {selectedTrade.pnl !== null && (
                      <div className={`text-xl font-bold ${
                        selectedTrade.pnl > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {selectedTrade.pnl.toFixed(2)} USDT
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Entry Date</p>
                  <p className="font-medium">
                    {format(new Date(selectedTrade.entry_date), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
                
                {selectedTrade.close_time && (
                  <div>
                    <p className="text-sm text-gray-500">Close Date</p>
                    <p className="font-medium">
                      {format(new Date(selectedTrade.close_time), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                )}
                
                <div>
                  <p className="text-sm text-gray-500">Entry Price</p>
                  <p className="font-medium">{selectedTrade.entry_price.toFixed(2)}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Close Price</p>
                  <p className="font-medium">
                    {selectedTrade.close_price !== null ? selectedTrade.close_price.toFixed(2) : '-'}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Quantity</p>
                  <p className="font-medium">{selectedTrade.quantity.toFixed(4)}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Leverage</p>
                  <p className="font-medium">
                    {selectedTrade.leverage !== null ? `${selectedTrade.leverage.toFixed(2)}x` : '-'}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Stop Loss</p>
                  <p className="font-medium">
                    {selectedTrade.stop_loss !== null ? selectedTrade.stop_loss.toFixed(2) : '-'}
                  </p>
                </div>
                
                {editMode ? (
                  <div>
                    <p className="text-sm text-gray-500">Take Profit</p>
                    <input
                      type="number"
                      value={updatedTakeProfit}
                      onChange={(e) => setUpdatedTakeProfit(e.target.value)}
                      className="mt-1 px-3 py-2 text-sm w-full border border-gray-300 rounded-md"
                      placeholder="Enter take profit price"
                      step="0.01"
                      min="0"
                    />
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-500">Take Profit</p>
                    <p className="font-medium">
                      {selectedTrade.take_profit !== null ? selectedTrade.take_profit.toFixed(2) : '-'}
                    </p>
                  </div>
                )}
                
                <div>
                  <p className="text-sm text-gray-500">Max Risk</p>
                  <p className="font-medium">
                    {selectedTrade.max_risk !== null ? `${selectedTrade.max_risk.toFixed(2)} USDT` : '-'}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">R-Multiple</p>
                  <p className={`font-medium ${
                    (selectedTrade.finish_r || 0) > 0 ? 'text-green-600' : 
                    (selectedTrade.finish_r || 0) < 0 ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    {selectedTrade.finish_r !== null ? `${selectedTrade.finish_r.toFixed(2)}R` : '-'}
                  </p>
                </div>
                
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Trading System</p>
                  <p className="font-medium">{selectedTrade.system_id || '-'}</p>
                </div>
                
                {editMode ? (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Notes</p>
                    <textarea
                      value={updatedNotes}
                      onChange={(e) => setUpdatedNotes(e.target.value)}
                      rows={3}
                      className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                      placeholder="Add notes about this trade..."
                    />
                  </div>
                ) : (
                  selectedTrade.notes && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500">Notes</p>
                      <p className="p-2 bg-gray-50 rounded-md border border-gray-200 mt-1">
                        {selectedTrade.notes}
                      </p>
                    </div>
                  )
                )}
                
                {editMode ? (
                  <div className="col-span-2 mt-2">
                    <p className="text-sm text-gray-500 mb-1">Entry Picture URL</p>
                    <input
                      type="text"
                      value={updatedEntryPicUrl}
                      onChange={(e) => setUpdatedEntryPicUrl(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                      placeholder="https://example.com/entry-chart.png"
                    />
                    {updatedEntryPicUrl && (
                      <div className="mt-2 p-2 border border-gray-200 rounded-md">
                        <img 
                          src={updatedEntryPicUrl} 
                          alt="Entry chart" 
                          className="max-h-48 object-contain mx-auto"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=Invalid+Image+URL';
                          }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  selectedTrade.pic_entry && (
                    <div className="col-span-2 mt-2">
                      <p className="text-sm text-gray-500 mb-1">Entry Chart</p>
                      <img 
                        src={selectedTrade.pic_entry} 
                        alt="Entry chart" 
                        className="max-h-64 object-contain rounded border border-gray-200"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=Invalid+Image+URL';
                        }}
                      />
                    </div>
                  )
                )}
                
                {editMode ? (
                  <div className="col-span-2 mt-2">
                    <p className="text-sm text-gray-500 mb-1">Exit Picture URL</p>
                    <input
                      type="text"
                      value={updatedExitPicUrl}
                      onChange={(e) => setUpdatedExitPicUrl(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                      placeholder="https://example.com/exit-chart.png"
                    />
                    {updatedExitPicUrl && (
                      <div className="mt-2 p-2 border border-gray-200 rounded-md">
                        <img 
                          src={updatedExitPicUrl} 
                          alt="Exit chart" 
                          className="max-h-48 object-contain mx-auto"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=Invalid+Image+URL';
                          }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  selectedTrade.pic_exit && (
                    <div className="col-span-2 mt-2">
                      <p className="text-sm text-gray-500 mb-1">Exit Chart</p>
                      <img 
                        src={selectedTrade.pic_exit} 
                        alt="Exit chart" 
                        className="max-h-64 object-contain rounded border border-gray-200"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=Invalid+Image+URL';
                        }}
                      />
                    </div>
                  )
                )}
              </div>
            </div>
            
            <div className="p-4 border-t bg-gray-50 flex justify-between">
              <div>
                {selectedTrade.status === 'open' && (
                  <button
                    onClick={() => handleManualUpdate(selectedTrade)}
                    disabled={updatingTradeId === selectedTrade.id}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-400 mr-2"
                  >
                    {updatingTradeId === selectedTrade.id ? (
                      <>
                        <RefreshCw size={16} className="inline mr-1 animate-spin" /> Closing...
                      </>
                    ) : (
                      'Close Trade'
                    )}
                  </button>
                )}
              </div>
              
              <div className="flex space-x-2">
                {editMode ? (
                  <>
                    <button
                      onClick={updateTradeDetails}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => setEditMode(false)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setEditMode(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Edit Details
                    </button>
                    <button
                      onClick={closeDetailsModal}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      Close
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualTradeHistory;