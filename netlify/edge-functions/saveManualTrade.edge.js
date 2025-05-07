// Netlify Edge Function for saving manual trades
import { createClient } from '@supabase/supabase-js';

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

export default async function handler(request, context) {
  console.log("Edge Function: saveManualTrade started");
  
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
    const tradeData = await request.json();
    console.log("Received trade data:", tradeData);
    
    // Validate required fields
    if (!tradeData.user_id || !tradeData.symbol || !tradeData.side || !tradeData.entry_price || !tradeData.quantity) {
      console.error("Missing required fields in trade data");
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
    
    // Insert the trade into the database
    const { data, error } = await supabase
      .from('manual_trades')
      .insert(tradeData)
      .select('id')
      .single();
      
    if (error) {
      console.error("Database insertion error:", error);
      
      await logEvent(
        supabase,
        'error',
        'Failed to save manual trade',
        { error: error.message, trade_data: tradeData },
        tradeData.user_id
      );
      
      throw error;
    }
    
    console.log("Manual trade successfully saved:", data);
    
    // Log successful trade creation
    await logEvent(
      supabase,
      'info',
      'Manual trade created',
      { 
        trade_id: data.id, 
        symbol: tradeData.symbol,
        side: tradeData.side,
        quantity: tradeData.quantity
      },
      tradeData.user_id,
      data.id
    );
    
    return new Response(
      JSON.stringify({
        success: true,
        tradeId: data.id,
        message: "Trade saved successfully"
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
    console.error('Error saving manual trade:', error);
    
    // Try to log the error
    try {
      await logEvent(
        supabase,
        'error',
        'Critical error saving manual trade',
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