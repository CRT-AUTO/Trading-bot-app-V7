// Trade interface
export interface Trade {
  tradeId: string;
  symbol: string;
  entryPrice: number;
  direction: 'long' | 'short';
  positionSize: number;
  stopLoss: number;
  riskAmount: number;
  riskPercentage: number;
  leverage: number;
  fee: number;
  systemName: string;
  entryPicUrl: string;
  notes: string;
  takeProfitPrice: number;
  timestamp: number;
  orderId?: string;
}

/**
 * Save trade to journal by calling the API
 * @param trade Trade data to save
 * @returns Result of the operation
 */
export const saveTradeToJournal = async (trade: Trade): Promise<{ success: boolean; error?: string }> => {
  try {
    // Map trade data to the format expected by the API
    const payload = {
      symbol: trade.symbol,
      side: trade.direction === 'long' ? 'Buy' : 'Sell',
      entry_price: trade.entryPrice,
      quantity: Math.abs(trade.positionSize),
      stop_loss: trade.stopLoss || null,
      take_profit: trade.takeProfitPrice || null,
      max_risk: trade.riskAmount,
      leverage: trade.leverage,
      system_id: trade.systemName || null,
      notes: trade.notes || null,
      pic_entry: trade.entryPicUrl || null,
      order_type: 'Market',
      user_id: null, // Will be filled by the edge function
    };

    // Call the edge function to save the trade
    const response = await fetch('/.netlify/functions/saveManualTrade', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.error || 'Failed to save trade' };
    }

    const result = await response.json();
    return { success: true };
  } catch (error: any) {
    console.error('Error saving trade:', error);
    return { success: false, error: error.message || 'An unknown error occurred' };
  }
};

/**
 * Close a trade via webhook
 * @param tradeId ID of the trade to close
 * @param notes Exit notes for the trade
 * @returns Result of the operation
 */
export const closeTradeViaWebhook = async (
  tradeId: string, 
  notes: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Call the edge function to close the trade
    const response = await fetch(`/.netlify/functions/closeManualTrade/${tradeId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        notes,
        // Can include exit price and exit pic URL if needed
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.error || 'Failed to close trade' };
    }

    const result = await response.json();
    return { success: true };
  } catch (error: any) {
    console.error('Error closing trade:', error);
    return { success: false, error: error.message || 'An unknown error occurred' };
  }
};