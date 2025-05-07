// Netlify Edge Function for executing manual trades on Bybit
import { createClient } from '@supabase/supabase-js';
import { executeBybitOrder, MAINNET_URL, TESTNET_URL } from './utils/bybit.edge.mjs';

// CORS headers to include in all responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

// Helper function to log events to the database
async function logEvent(supabase, level, message, details, userId = null, tradeId = null) {
  try {
    const { error } = await supabase
      .from('logs')
      .insert({
        level,
        message,
        details,
        user_id: userId,
        trade_id: tradeId,
        created_at: new Date().toISOString()
      });
      
    if (error) {
      console.error('Error logging event:', error);
    }
  } catch (e) {
    console.error('Exception logging event:', e);
  }
}

// Helper function to format symbol for Bybit API
function formatSymbolForBybit(symbol) {
  // Remove the "PERP" suffix if it exists
  if (symbol.endsWith('PERP')) {
    return symbol.replace('PERP', '');
  }
  return symbol;
}

// Helper function to fetch instrument info from Bybit API
async function fetchInstrumentInfo(symbol, category = 'linear') {
  try {
    const response = await fetch(
      `${MAINNET_URL}/v5/market/instruments-info?symbol=${symbol}&category=${category}`
    );
    
    const data = await response.json();
    if (data.retCode !== 0 || !data.result || !data.result.list || data.result.list.length === 0) {
      throw new Error(`Failed to fetch instrument info: ${data.retMsg || 'No data returned'}`);
    }
    
    return data.result.list[0];
  } catch (error) {
    console.error(`Error fetching instrument info for ${symbol}:`, error);
    throw error;
  }
}

// Helper function to adjust quantity based on min and step
function adjustQuantity(quantity, minQty, qtyStep, decimals) {
  console.log(`Adjusting quantity: original=${quantity}, minQty=${minQty}, qtyStep=${qtyStep}, decimals=${decimals}`);
  
  // Convert to numbers if they're strings
  const qtyNum = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
  const minQtyNum = typeof minQty === 'string' ? parseFloat(minQty) : minQty;
  const qtyStepNum = typeof qtyStep === 'string' ? parseFloat(qtyStep) : qtyStep;
  
  // Check if we need to use minQty
  if (qtyNum < minQtyNum) {
    console.log(`Quantity ${qtyNum} is below minimum ${minQtyNum}, using minimum quantity`);
    return minQtyNum;
  }
  
  // Round down to the nearest step
  const stepsCount = Math.floor(qtyNum / qtyStepNum);
  const adjustedQty = stepsCount * qtyStepNum;
  
  // Apply precision
  const finalQty = parseFloat(adjustedQty.toFixed(decimals));
  
  console.log(`Adjusted quantity: ${qtyNum} -> ${finalQty}`);
  return finalQty;
}

export default async function handler(request, context) {
  console.log("Edge Function: executeManualTrade started");
  
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
    // Parse request body
    const requestData = await request.json();
    console.log("Received request data:", requestData);
    
    const {
      user_id,
      api_key_id,
      symbol,
      side,
      entry_price,
      quantity,
      stop_loss,
      take_profit,
      max_risk,
      leverage,
      system_id,
      notes,
      pic_entry,
      order_type = 'Market',
      test_mode = false
    } = requestData;
    
    // Validate required fields
    if (!user_id || !symbol || !side || !entry_price || !quantity) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
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
      .eq('user_id', user_id)
      .eq('exchange', 'bybit');
    
    if (api_key_id) {
      // If specific API key ID is provided, use that one
      apiKeyQuery = apiKeyQuery.eq('id', api_key_id);
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
        .eq('user_id', user_id)
        .eq('exchange', 'bybit')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();
      
      if (fallbackError || !fallbackKey) {
        console.error("API credentials not found:", apiKeyError);
        
        await logEvent(
          supabase,
          'error',
          'API credentials not found for manual trade',
          { error: apiKeyError?.message },
          user_id
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
      console.log(`Using API key: ${apiKeyData.name}`);
      apiKey = apiKeyData;
    }

    let orderResult = null;
    
    // Execute the order on Bybit if not in test mode
    if (!test_mode) {
      try {
        // Format symbol for Bybit API
        const formattedSymbol = formatSymbolForBybit(symbol);
        console.log(`Using formatted symbol for API call: ${formattedSymbol} (original: ${symbol})`);
        
        // Determine the category based on the symbol
        const category = symbol.endsWith('PERP') ? 'linear' : 'linear';
        
        // Fetch instrument info to get min quantity and step size
        console.log(`Fetching instrument info for ${formattedSymbol} in category ${category}`);
        const instrumentInfo = await fetchInstrumentInfo(formattedSymbol, category);
        
        console.log(`Instrument info received:`, instrumentInfo);
        
        // Extract lot size filter for min qty and step size
        const lotFilter = instrumentInfo.lotSizeFilter;
        const minQtyStr = lotFilter.minOrderQty ?? lotFilter.minTrdAmt ?? "0.001";
        const stepStr = lotFilter.qtyStep ?? lotFilter.stepSize ?? "0.001";
        
        // Determine decimals from step size
        const decimals = stepStr.includes('.') ? stepStr.split('.')[1].length : 0;
        
        console.log(`Min qty: ${minQtyStr}, Step size: ${stepStr}, Decimals: ${decimals}`);
        
        // Adjust quantity to comply with exchange requirements
        const adjustedQuantity = adjustQuantity(quantity, minQtyStr, stepStr, decimals);
        
        // Check if adjusted quantity is valid
        if (adjustedQuantity <= 0) {
          throw new Error(`Adjusted quantity ${adjustedQuantity} is invalid. Please increase your order size.`);
        }
        
        console.log(`Original quantity: ${quantity}, Adjusted quantity: ${adjustedQuantity}`);
        
        // Prepare order parameters with adjusted quantity
        const orderParams = {
          apiKey: apiKey.api_key,
          apiSecret: apiKey.api_secret,
          symbol: formattedSymbol,
          side,
          orderType: order_type,
          quantity: adjustedQuantity.toString(), // Use adjusted quantity
          price: entry_price,
          stopLoss: stop_loss, // Include stop loss
          takeProfit: take_profit, // Include take profit
          testnet: false  // Using real trading for manual trades
        };
        
        console.log("Executing order with params:", {
          ...orderParams,
          apiKey: "REDACTED",
          apiSecret: "REDACTED"
        });
        
        // Execute the order
        orderResult = await executeBybitOrder(orderParams);
        
        console.log("Order executed successfully:", orderResult);
        
        await logEvent(
          supabase,
          'info',
          'Manual trade executed successfully',
          { 
            order: {
              ...orderResult,
              symbol: formattedSymbol,
              side
            }
          },
          user_id
        );
      } catch (orderError) {
        console.error("Error executing order on Bybit:", orderError);
        
        await logEvent(
          supabase,
          'error',
          'Failed to execute manual trade on Bybit',
          { error: orderError.message },
          user_id
        );
        
        return new Response(
          JSON.stringify({ 
            error: `Failed to execute trade on Bybit: ${orderError.message}` 
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          }
        );
      }
    } else {
      // Create a simulated order for test mode
      orderResult = {
        orderId: `test-${Date.now()}`,
        symbol,
        side,
        orderType: order_type,
        qty: quantity,
        price: entry_price,
        status: 'TEST_ORDER'
      };
      
      console.log("Test mode enabled, created simulated order:", orderResult);
    }

    // Insert trade into database
    const tradeData = {
      user_id,
      symbol,
      side,
      entry_price: parseFloat(entry_price),
      quantity: parseFloat(orderResult ? orderResult.qty : quantity),
      stop_loss: stop_loss ? parseFloat(stop_loss) : null,
      take_profit: take_profit ? parseFloat(take_profit) : null,
      max_risk: max_risk ? parseFloat(max_risk) : null,
      leverage: leverage ? parseFloat(leverage) : null,
      system_id,
      notes,
      pic_entry,
      order_type,
      status: 'open',
      entry_date: new Date().toISOString(),
      open_time: new Date().toISOString()
    };
    
    // Add order details if available
    if (orderResult) {
      tradeData.order_id = orderResult.orderId;
      tradeData.qty = parseFloat(orderResult.qty);
    }

    // Insert the trade into the database
    const { data: insertedTrade, error: insertError } = await supabase
      .from('manual_trades')
      .insert(tradeData)
      .select('id')
      .single();
      
    if (insertError) {
      console.error("Error inserting trade into database:", insertError);
      
      await logEvent(
        supabase,
        'error',
        'Failed to save manual trade to database',
        { 
          error: insertError.message,
          trade_data: tradeData
        },
        user_id
      );
      
      return new Response(
        JSON.stringify({ error: `Failed to save trade: ${insertError.message}` }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }
    
    console.log("Manual trade saved to database:", insertedTrade);
    
    await logEvent(
      supabase,
      'info',
      'Manual trade saved successfully',
      { 
        trade_id: insertedTrade.id,
        symbol,
        side,
        quantity: orderResult ? orderResult.qty : quantity
      },
      user_id,
      insertedTrade.id
    );
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Trade executed and saved successfully",
        tradeId: insertedTrade.id,
        orderId: orderResult?.orderId,
        adjustedQuantity: orderResult ? orderResult.qty : quantity
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
    console.error('Error processing manual trade:', error);
    
    // Try to log the error
    try {
      await logEvent(
        supabase,
        'error',
        'Critical error processing manual trade',
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