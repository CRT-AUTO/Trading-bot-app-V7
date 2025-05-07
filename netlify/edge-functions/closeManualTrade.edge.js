// Netlify Edge Function for updating manual trades with Bybit API data
import { createClient } from '@supabase/supabase-js';
import { MAINNET_URL, TESTNET_URL } from './utils/bybit.edge.mjs';

// CORS headers to include in all responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

// Maximum number of API call retries
const MAX_RETRIES = 3;

// Helper function to log events to the database
async function logEvent(supabase, level, message, details, tradeId = null, userId = null) {
  try {
    const { error } = await supabase
      .from('logs')
      .insert({
        level,
        message,
        details,
        trade_id: tradeId,
        user_id: userId,
        created_at: new Date().toISOString()
      });
      
    if (error) {
      console.error('Error logging event:', error);
    }
  } catch (e) {
    console.error('Exception logging event:', e);
  }
}

// Helper function to sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to format symbol for Bybit API
function formatSymbolForBybit(symbol) {
  // Remove the "PERP" suffix if it exists
  if (symbol.endsWith('PERP')) {
    return symbol.replace('PERP', '');
  }
  return symbol;
}

// Helper function to find the best matching PnL record
function findBestMatchingPnl(trade, closedPnlList) {
  // Format the symbol to match Bybit API format
  const formattedSymbol = formatSymbolForBybit(trade.symbol);
  
  console.log(`Finding best PnL match for trade: Symbol=${trade.symbol} (formatted as ${formattedSymbol}), Side=${trade.side}, Qty=${trade.quantity}, OrderID=${trade.order_id || 'N/A'}`);
  
  // First try exact orderId match if available
  if (trade.order_id) {
    const exactMatch = closedPnlList.find(pnl => pnl.orderId === trade.order_id);
    if (exactMatch) {
      console.log(`Found exact order ID match: ${exactMatch.orderId}`);
      return { match: exactMatch, matchType: 'exact_order_id' };
    }
  }
  
  console.log(`No exact order ID match found, trying alternative matching methods...`);
  
  // Filter by symbol
  const symbolMatches = closedPnlList.filter(pnl => pnl.symbol === formattedSymbol);
  console.log(`Found ${symbolMatches.length} trades with matching symbol: ${formattedSymbol}`);
  
  if (symbolMatches.length === 0) return { match: null, matchType: 'no_symbol_match' };
  
  // Filter by matching side 
  // Note: If trade.side = 'Buy', the closing side in Bybit would be 'Sell' and vice versa
  const oppositeSide = trade.side === 'Buy' ? 'Sell' : 'Buy';
  const sideMatches = symbolMatches.filter(pnl => pnl.side === oppositeSide);
  console.log(`Found ${sideMatches.length} trades with opposite side: ${oppositeSide}`);
  
  if (sideMatches.length === 0) {
    // If no opposite side matches, try with the same side as a fallback
    // This is because some API responses might report the original side, not the closing side
    console.log(`No opposite side matches, trying with same side: ${trade.side}`);
    const sameSideMatches = symbolMatches.filter(pnl => pnl.side === trade.side);
    if (sameSideMatches.length > 0) {
      console.log(`Found ${sameSideMatches.length} trades with same side: ${trade.side}`);
      
      // Sort by time closest to trade.entry_date
      const tradeTime = new Date(trade.entry_date).getTime();
      sameSideMatches.sort((a, b) => {
        const aTimeDiff = Math.abs(parseInt(a.createdTime) - tradeTime);
        const bTimeDiff = Math.abs(parseInt(b.createdTime) - tradeTime);
        return aTimeDiff - bTimeDiff;
      });
      
      console.log(`Best match by time with same side (${trade.side}): closedPnl=${sameSideMatches[0].closedPnl}, created=${new Date(parseInt(sameSideMatches[0].createdTime)).toISOString()}`);
      return { match: sameSideMatches[0], matchType: 'same_side_time_match' };
    }
    
    return { match: null, matchType: 'no_side_match' };
  }
  
  // Filter by quantity (if available)
  if (trade.quantity) {
    const qtyMatches = sideMatches.filter(pnl => {
      const pnlQty = parseFloat(pnl.qty);
      const tradeQty = trade.quantity;
      const qtyDiff = Math.abs(pnlQty - tradeQty);
      const qtyPct = qtyDiff / tradeQty;
      return qtyPct < 0.01; // 1% tolerance for quantity differences
    });
    
    console.log(`Found ${qtyMatches.length} trades with matching quantity (within 1%): ${trade.quantity}`);
    
    if (qtyMatches.length > 0) {
      // Sort by time closest to trade.entry_date
      const tradeTime = new Date(trade.entry_date).getTime();
      qtyMatches.sort((a, b) => {
        const aTimeDiff = Math.abs(parseInt(a.createdTime) - tradeTime);
        const bTimeDiff = Math.abs(parseInt(b.createdTime) - tradeTime);
        return aTimeDiff - bTimeDiff;
      });
      
      console.log(`Best match by quantity and time: closedPnl=${qtyMatches[0].closedPnl}, created=${new Date(parseInt(qtyMatches[0].createdTime)).toISOString()}`);
      return { match: qtyMatches[0], matchType: 'quantity_time_match' };
    }
  }
  
  // Final fallback - sort by time closest to trade.entry_date
  const tradeTime = new Date(trade.entry_date).getTime();
  sideMatches.sort((a, b) => {
    const aTimeDiff = Math.abs(parseInt(a.createdTime) - tradeTime);
    const bTimeDiff = Math.abs(parseInt(b.createdTime) - tradeTime);
    return aTimeDiff - bTimeDiff;
  });
  
  // Return the closest match by time
  console.log(`Best match by time only: closedPnl=${sideMatches[0].closedPnl}, created=${new Date(parseInt(sideMatches[0].createdTime)).toISOString()}`);
  return { match: sideMatches[0], matchType: 'time_match' };
}

// Calculate R-multiple based on PNL and max risk
function calculateRMultiple(pnl, maxRisk) {
  if (!maxRisk || maxRisk === 0) return null;
  return pnl / maxRisk;
}

export default async function handler(request, context) {
  console.log("Edge Function: closeManualTrade started");
  
  // Handle preflight requests
  if (request.method === "OPTIONS") {
    console.log("Handling preflight request");
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  // Only allow POST requests
  if (request.method !== "POST") {
    console.log(`Invalid request method: ${request.method}`);
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }

  // Get environment variables
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_KEY');
  
  console.log(`Environment check: SUPABASE_URL=${!!supabaseUrl}, SERVICE_KEY=${!!supabaseServiceKey}`);
  
  // Check if environment variables are set
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase environment variables");
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }

  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  console.log("Supabase client initialized");

  try {
    // Get trade ID from URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const tradeId = pathParts[pathParts.length - 1];
    
    console.log(`Processing close request for trade ID: ${tradeId}`);
    
    if (!tradeId) {
      console.error("Missing trade ID in URL path");
      return new Response(
        JSON.stringify({ error: "Missing trade ID" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }
    
    // Parse request body for additional data
    const body = await request.json();
    const { notes, exitPicUrl } = body || {};
    
    console.log("Close trade request data:", { notes, exitPicUrl });
    
    // Get the trade to verify it exists and is open
    const { data: trade, error: tradeError } = await supabase
      .from('manual_trades')
      .select('*')
      .eq('id', tradeId)
      .single();
      
    if (tradeError || !trade) {
      console.error("Error fetching trade:", tradeError);
      
      await logEvent(
        supabase,
        'error',
        'Failed to update manual trade - trade not found',
        { error: tradeError?.message, trade_id: tradeId }
      );
      
      return new Response(
        JSON.stringify({ error: "Trade not found" }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }
    
    console.log(`Found trade: ${trade.symbol}, order_id: ${trade.order_id || 'N/A'}, status: ${trade.status}`);
    
    if (trade.status === 'closed') {
      console.log("Trade is already closed");
      
      await logEvent(
        supabase,
        'warning',
        'Attempted to update an already closed trade',
        { trade_id: tradeId },
        trade.user_id,
        tradeId
      );
      
      return new Response(
        JSON.stringify({ 
          success: false,
          message: "Trade is already closed",
          trade_id: tradeId
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }
    
    // Get the API key for this user
    let apiKeyQuery = supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', trade.user_id)
      .eq('exchange', 'bybit');
    
    if (trade.api_key_id) {
      // If trade has a specific API key, use that one
      apiKeyQuery = apiKeyQuery.eq('id', trade.api_key_id);
    } else {
      // Otherwise, use the default API key
      apiKeyQuery = apiKeyQuery.eq('is_default', true);
    }
    
    let apiKey;
    const { data: apiKeyData, error: apiKeyError } = await apiKeyQuery.single();
    
    if (apiKeyError || !apiKeyData) {
      // If no specific key or default key found, try fetching any key
      const { data: fallbackKey, error: fallbackError } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', trade.user_id)
        .eq('exchange', 'bybit')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();
      
      if (fallbackError || !fallbackKey) {
        console.error("API credentials not found:", apiKeyError);
        
        await logEvent(
          supabase,
          'error',
          'API credentials not found for updating manual trade',
          { error: apiKeyError?.message },
          trade.user_id,
          tradeId
        );
        
        return new Response(
          JSON.stringify({ error: "API credentials not found. Please add an API key in Settings." }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          }
        );
      }
      
      // Use fallback key
      console.log(`Using fallback API key: ${fallbackKey.name}`);
      apiKey = fallbackKey;
    } else {
      console.log(`Using API key: ${apiKeyData.name} (${apiKeyData.account_type})`);
      apiKey = apiKeyData;
    }
    
    // Prepare to call Bybit API for closed PnL
    const baseUrl = MAINNET_URL; // We use mainnet for manual trades
    let endpoint = '/v5/position/closed-pnl';
    
    // Implement retry logic with exponential backoff
    let attempts = 0;
    let bybitApiData = null;
    
    while (attempts < MAX_RETRIES) {
      try {
        // Signature components
        const timestamp = String(Date.now());
        const recvWindow = '5000';
        
        // Calculate the time range for fallback matching
        // Use a wider time window to increase chances of finding the trade
        const tradeTime = new Date(trade.entry_date).getTime();
        const startTime = tradeTime - (24 * 3600 * 1000); // 24 hours before
        const endTime = Date.now(); // Current time
        
        console.log(`Time range for PnL search: 
          Trade time: ${new Date(tradeTime).toISOString()}
          Start time: ${new Date(startTime).toISOString()} 
          End time: ${new Date(endTime).toISOString()}`
        );
        
        // Format symbol for Bybit API
        const formattedSymbol = formatSymbolForBybit(trade.symbol);
        console.log(`Using formatted symbol for API call: ${formattedSymbol} (original: ${trade.symbol})`);
        
        // Parameters for Bybit API call
        const params = new URLSearchParams({
          category: 'linear',
          symbol: formattedSymbol,
          limit: '200',  // Increased limit to find more potential matches
          startTime: startTime.toString(),
          endTime: endTime.toString(),
          timestamp,
          recv_window: recvWindow
        });
        
        // Add sub-account parameter if needed
        if (apiKey.account_type === 'sub') {
          console.log('Using sub-account API configuration');
        }
        
        // Generate HMAC SHA256 signature
        const signatureMessage = timestamp + apiKey.api_key + recvWindow + params.toString();
        const encoder = new TextEncoder();
        const keyData = encoder.encode(apiKey.api_secret);
        const messageData = encoder.encode(signatureMessage);
        
        const key = await crypto.subtle.importKey(
          'raw',
          keyData,
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );
        
        const signature = await crypto.subtle.sign('HMAC', key, messageData);
        const signatureHex = Array.from(new Uint8Array(signature))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        
        // Call Bybit API
        const apiUrl = `${baseUrl}${endpoint}?${params.toString()}`;
        console.log(`Calling Bybit API: ${apiUrl}`);
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'X-BAPI-API-KEY': apiKey.api_key,
            'X-BAPI-TIMESTAMP': timestamp,
            'X-BAPI-RECV-WINDOW': recvWindow,
            'X-BAPI-SIGN': signatureHex
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`HTTP error: ${response.status} - ${errorText}`);
          throw new Error(`HTTP error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        
        if (data.retCode !== 0) {
          console.error(`Bybit API error: ${data.retMsg}`);
          throw new Error(`Bybit API error: ${data.retMsg}`);
        }
        
        console.log(`Bybit API response: retCode=${data.retCode}, retMsg=${data.retMsg}, list length=${data.result.list?.length || 0}`);
        
        // Log a few results for debugging
        if (data.result.list && data.result.list.length > 0) {
          console.log(`First few closed PnL records:`);
          data.result.list.slice(0, 3).forEach((pnl, idx) => {
            console.log(`[${idx}] symbol=${pnl.symbol}, side=${pnl.side}, orderId=${pnl.orderId}, qty=${pnl.qty}, createdTime=${new Date(parseInt(pnl.createdTime)).toISOString()}`);
          });
        }
        
        // Log detailed response for debugging
        await logEvent(
          supabase,
          'info',
          'Bybit closed PnL API response',
          { 
            side: trade.side,
            symbol: formattedSymbol,
            order_id: trade.order_id,
            trade_id: tradeId,
            bybit_response: data
          },
          trade.user_id,
          tradeId
        );
        
        bybitApiData = data;
        break; // Success - exit retry loop
        
      } catch (error) {
        attempts++;
        console.error(`API call attempt ${attempts} failed:`, error);
        
        if (attempts >= MAX_RETRIES) {
          await logEvent(
            supabase,
            'error',
            'Failed to fetch closed PnL from Bybit API after multiple attempts',
            { 
              error: error.message,
              attempts,
              trade_id: tradeId
            },
            trade.user_id,
            tradeId
          );
          throw error;
        }
        
        // Exponential backoff with jitter
        const backoffTime = Math.min(1000 * Math.pow(2, attempts), 8000) + Math.random() * 1000;
        console.log(`Retrying in ${Math.round(backoffTime)}ms...`);
        await sleep(backoffTime);
      }
    }
    
    // Now we have the API data, find the matching trade
    const closedPnlList = bybitApiData.result.list || [];
    console.log(`Found ${closedPnlList.length} closed PnL records from Bybit API`);
    
    const { match: matchingPnl, matchType } = findBestMatchingPnl(trade, closedPnlList);
    
    if (!matchingPnl) {
      console.log(`No matching closed PnL found for trade ${tradeId}`);
      
      await logEvent(
        supabase,
        'warning',
        'No matching closed PnL found in Bybit API response',
        { 
          order_id: trade.order_id,
          symbol: trade.symbol,
          side: trade.side,
          bybit_response: bybitApiData,
          trade_id: tradeId
        },
        trade.user_id,
        tradeId
      );
      
      // Since we couldn't find PnL data, update what we can without PnL info
      const updateData = {
        status: 'closed',
        close_time: new Date().toISOString(),
        trade_close_exe_time: new Date().toISOString(),
        notes: notes || trade.notes,
        pic_exit: exitPicUrl || trade.pic_exit,
        updated_at: new Date().toISOString()
      };
      
      const { error: updateError } = await supabase
        .from('manual_trades')
        .update(updateData)
        .eq('id', tradeId);
        
      if (updateError) {
        console.error("Error updating trade:", updateError);
        throw updateError;
      }
      
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Trade marked as closed, but no matching PnL data found",
          trade_id: tradeId,
          pnl_found: false
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }
    
    console.log(`Found matching PnL record (${matchType}): ${JSON.stringify(matchingPnl)}`);
    
    // Extract PnL data
    const realizedPnl = parseFloat(matchingPnl.closedPnl);
    const avgEntryPrice = parseFloat(matchingPnl.avgEntryPrice);
    const avgExitPrice = parseFloat(matchingPnl.avgExitPrice);
    const cumEntryValue = parseFloat(matchingPnl.cumEntryValue || 0);
    const cumExitValue = parseFloat(matchingPnl.cumExitValue || 0);
    
    // Calculate additional metrics
    const fees = cumExitValue * 0.0006; // Approximate fee calculation (0.06%)
    const totalFees = fees;
    
    // Calculate R-multiple if max_risk is available
    const finishR = calculateRMultiple(realizedPnl, trade.max_risk);
    
    // Calculate trade duration
    let totalTradeTimeSeconds = null;
    let totalTradeTime = null;
    
    if (trade.entry_date) {
      const entryTime = new Date(trade.entry_date).getTime();
      const closeTime = Date.now();
      totalTradeTimeSeconds = Math.floor((closeTime - entryTime) / 1000);
      
      // Format the trade time (e.g., "02:15:30" for 2 hours, 15 minutes, 30 seconds)
      const hours = Math.floor(totalTradeTimeSeconds / 3600);
      const minutes = Math.floor((totalTradeTimeSeconds % 3600) / 60);
      const seconds = totalTradeTimeSeconds % 60;
      
      totalTradeTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // Determine win/loss
    const winLoss = realizedPnl > 0 ? 'win' : (realizedPnl < 0 ? 'loss' : 'breakeven');
    
    // Update the trade with PnL data
    const updateData = {
      status: 'closed',
      close_time: new Date().toISOString(),
      trade_close_exe_time: new Date().toISOString(),
      close_price: avgExitPrice,
      avg_entry: avgEntryPrice,
      pnl: realizedPnl,
      finish_r: finishR,
      finish_usd: realizedPnl,
      win_loss: winLoss,
      close_fee: fees,
      trade_fee: totalFees,
      total_trade_time: totalTradeTime,
      total_trade_time_seconds: totalTradeTimeSeconds,
      notes: notes || trade.notes,
      pic_exit: exitPicUrl || trade.pic_exit,
      updated_at: new Date().toISOString()
    };
    
    console.log(`Updating trade ${tradeId} with PnL data:`, updateData);
    
    const { error: updateError } = await supabase
      .from('manual_trades')
      .update(updateData)
      .eq('id', tradeId);
      
    if (updateError) {
      console.error("Error updating trade with PnL data:", updateError);
      
      await logEvent(
        supabase,
        'error',
        'Failed to update manual trade with PnL data',
        { 
          error: updateError.message,
          trade_id: tradeId
        },
        trade.user_id,
        tradeId
      );
      
      throw updateError;
    }
    
    console.log(`Successfully updated trade ${tradeId} with realized PnL: ${realizedPnl}`);
    
    await logEvent(
      supabase,
      'info',
      'Successfully updated manual trade with PnL data from Bybit API',
      { 
        trade_id: tradeId,
        realized_pnl: realizedPnl,
        avg_entry_price: avgEntryPrice,
        avg_exit_price: avgExitPrice,
        match_type: matchType,
        win_loss: winLoss,
        finish_r: finishR
      },
      trade.user_id,
      tradeId
    );
    
    return new Response(
      JSON.stringify({ 
        success: true,
        trade_id: tradeId,
        realized_pnl: realizedPnl,
        avg_entry_price: avgEntryPrice,
        avg_exit_price: avgExitPrice,
        match_type: matchType,
        finish_r: finishR,
        pnl_found: true
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
    
  } catch (error) {
    console.error('Error updating manual trade:', error);
    
    // Try to log the error even if we don't have specific trade details
    try {
      await logEvent(
        supabase,
        'error',
        'Critical error updating manual trade',
        { error: error.message }
      );
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }
}