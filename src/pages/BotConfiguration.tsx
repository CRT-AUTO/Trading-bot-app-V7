import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useParams, useNavigate } from 'react-router-dom';
import { Bot, Copy, AlertTriangle, RefreshCw, CheckCircle, XCircle, Play, Pause, Trash2, ArrowLeft, Key, Info } from 'lucide-react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext';

type ApiKey = {
  id: string;
  name: string;
  exchange: string;
  account_type: string;
  is_default: boolean;
};

type BotFormData = {
  name: string;
  symbol: string;
  default_quantity: number;
  default_order_type: 'Market' | 'Limit';
  default_side: 'Buy' | 'Sell' | '';
  default_stop_loss: number;
  default_take_profit: number;
  test_mode: boolean;
  description: string;
  daily_loss_limit?: number;
  max_position_size?: number;
  position_sizing_enabled: boolean;
  risk_per_trade: number;
  market_fee_percentage: number;
  limit_fee_percentage: number;
  api_key_id?: string; // New field for API key selection
};

interface BotConfigurationProps {
  isNew?: boolean;
}

const BotConfiguration: React.FC<BotConfigurationProps> = ({ isNew = false }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { supabase } = useSupabase();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [botStatus, setBotStatus] = useState<'active' | 'paused' | 'error'>('paused');
  const [generateLoading, setGenerateLoading] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<BotFormData>({
    defaultValues: {
      name: '',
      symbol: 'BTCUSDT',
      default_quantity: 0.001,
      default_order_type: 'Market',
      default_side: '',
      default_stop_loss: 0,
      default_take_profit: 0,
      test_mode: true,
      description: '',
      daily_loss_limit: 0,
      max_position_size: 0,
      position_sizing_enabled: false,
      risk_per_trade: 10,
      market_fee_percentage: 0.075,
      limit_fee_percentage: 0.025,
      api_key_id: undefined
    }
  });

  const watchTestMode = watch('test_mode');
  const watchPositionSizingEnabled = watch('position_sizing_enabled');

  // Fetch API keys
  useEffect(() => {
    const fetchApiKeys = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('api_keys')
          .select('id, name, exchange, account_type, is_default')
          .eq('user_id', user.id)
          .eq('exchange', 'bybit')
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: true });
          
        if (error) throw error;
        
        setApiKeys(data || []);
      } catch (error) {
        console.error('Error fetching API keys:', error);
      }
    };
    
    fetchApiKeys();
  }, [user, supabase]);

  // Fetch bot data if editing
  useEffect(() => {
    const fetchBotData = async () => {
      if (isNew || !id || !user) {
        console.log('Creating new bot or missing id/user, skipping data fetch');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        console.log(`Fetching bot data for id: ${id}`);
        // Fetch bot data
        const { data: botData, error: botError } = await supabase
          .from('bots')
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();
          
        if (botError) {
          console.error('Error fetching bot data:', botError);
          throw botError;
        }
        
        if (botData) {
          console.log('Bot data fetched successfully:', botData);
          // Set form values
          setValue('name', botData.name);
          setValue('symbol', botData.symbol);
          setValue('default_quantity', botData.default_quantity);
          setValue('default_order_type', botData.default_order_type);
          setValue('default_side', botData.default_side || '');
          setValue('default_stop_loss', botData.default_stop_loss || 0);
          setValue('default_take_profit', botData.default_take_profit || 0);
          setValue('test_mode', botData.test_mode || false);
          setValue('description', botData.description || '');
          setValue('daily_loss_limit', botData.daily_loss_limit || 0);
          setValue('max_position_size', botData.max_position_size || 0);
          setValue('position_sizing_enabled', botData.position_sizing_enabled || false);
          setValue('risk_per_trade', botData.risk_per_trade || 10);
          setValue('market_fee_percentage', botData.market_fee_percentage || 0.075);
          setValue('limit_fee_percentage', botData.limit_fee_percentage || 0.025);
          setValue('api_key_id', botData.api_key_id || undefined);
          
          // Set bot status
          setBotStatus(botData.status || 'paused');
          
          // Fetch webhook URL if exists
          const { data: webhookData } = await supabase
            .from('webhooks')
            .select('webhook_token')
            .eq('bot_id', id)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
            
          if (webhookData?.webhook_token) {
            // Construct webhook URL
            const baseUrl = window.location.origin;
            setWebhookUrl(`${baseUrl}/.netlify/functions/processAlert/${webhookData.webhook_token}`);
          }
        }
      } catch (error) {
        console.error('Error fetching bot data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBotData();
  }, [isNew, id, user, supabase, setValue]);

  const onSubmit = async (data: BotFormData) => {
    if (!user) return;
    
    console.log('Form submitted with data:', data);
    setSaving(true);
    
    try {
      if (isNew) {
        console.log('Creating new bot with data:', data);
        // Create new bot
        const { data: newBot, error } = await supabase
          .from('bots')
          .insert({
            user_id: user.id,
            name: data.name,
            symbol: data.symbol,
            default_quantity: data.default_quantity,
            default_order_type: data.default_order_type,
            default_side: data.default_side || null,
            default_stop_loss: data.default_stop_loss || null,
            default_take_profit: data.default_take_profit || null,
            test_mode: data.test_mode,
            description: data.description,
            daily_loss_limit: data.daily_loss_limit || null,
            max_position_size: data.max_position_size || null,
            position_sizing_enabled: data.position_sizing_enabled,
            risk_per_trade: data.risk_per_trade || 10,
            market_fee_percentage: data.market_fee_percentage || 0.075,
            limit_fee_percentage: data.limit_fee_percentage || 0.025,
            api_key_id: data.api_key_id || null,
            status: 'paused',
            created_at: new Date().toISOString()
          })
          .select()
          .single();
          
        if (error) {
          console.error('Error creating bot:', error);
          throw error;
        }
        
        console.log('New bot created successfully:', newBot);
        
        // Navigate to the edit page
        navigate(`/bots/${newBot.id}`);
      } else if (id) {
        console.log('Updating existing bot with data:', data);
        // Update existing bot
        const { error } = await supabase
          .from('bots')
          .update({
            name: data.name,
            symbol: data.symbol,
            default_quantity: data.default_quantity,
            default_order_type: data.default_order_type,
            default_side: data.default_side || null,
            default_stop_loss: data.default_stop_loss || null,
            default_take_profit: data.default_take_profit || null,
            test_mode: data.test_mode,
            description: data.description,
            daily_loss_limit: data.daily_loss_limit || null,
            max_position_size: data.max_position_size || null,
            position_sizing_enabled: data.position_sizing_enabled,
            risk_per_trade: data.risk_per_trade || 10,
            market_fee_percentage: data.market_fee_percentage || 0.075,
            limit_fee_percentage: data.limit_fee_percentage || 0.025,
            api_key_id: data.api_key_id || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .eq('user_id', user.id);
          
        if (error) {
          console.error('Error updating bot:', error);
          throw error;
        }
        
        console.log('Bot updated successfully');
      }
    } catch (error) {
      console.error('Error saving bot:', error);
      alert('Failed to save bot configuration');
    } finally {
      setSaving(false);
    }
  };

  const generateWebhook = async () => {
    if (!id || !user) return;
    
    setGenerateLoading(true);
    try {
      // First, check if we already have a valid webhook
      const { data: existingWebhook } = await supabase
        .from('webhooks')
        .select('*')
        .eq('bot_id', id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (existingWebhook) {
        // Use existing webhook
        const baseUrl = window.location.origin;
        setWebhookUrl(`${baseUrl}/.netlify/functions/processAlert/${existingWebhook.webhook_token}`);
      } else {
        // Generate a new webhook via the edge function
        const response = await fetch('/.netlify/functions/generateWebhook', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            botId: id,
            expirationDays: 30
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to generate webhook: ${response.statusText}`);
        }
        
        const data = await response.json();
        setWebhookUrl(data.webhookUrl);
      }
    } catch (error) {
      console.error('Error generating webhook:', error);
      alert('Failed to generate webhook URL');
    } finally {
      setGenerateLoading(false);
    }
  };

  const copyWebhookUrl = () => {
    if (!webhookUrl) return;
    
    navigator.clipboard.writeText(webhookUrl);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const toggleBotStatus = async () => {
    if (!id || !user) return;
    
    const newStatus = botStatus === 'active' ? 'paused' : 'active';
    
    try {
      const { error } = await supabase
        .from('bots')
        .update({ status: newStatus })
        .eq('id', id)
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      setBotStatus(newStatus);
    } catch (error) {
      console.error('Error toggling bot status:', error);
      alert('Failed to update bot status');
    }
  };

  const deleteBot = async () => {
    if (!id || !user || !confirm('Are you sure you want to delete this bot?')) return;
    
    try {
      // Delete webhooks first
      await supabase
        .from('webhooks')
        .delete()
        .eq('bot_id', id)
        .eq('user_id', user.id);
      
      // Then delete the bot
      const { error } = await supabase
        .from('bots')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      // Navigate back to bots list
      navigate('/bots');
    } catch (error) {
      console.error('Error deleting bot:', error);
      alert('Failed to delete bot');
    }
  };

  // Helper to generate a random token (simplified version)
  const generateRandomToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw size={32} className="text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/bots')}
            className="mr-4 p-2 rounded-full hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold flex items-center">
            <Bot className="mr-2" />
            {isNew ? 'Create New Bot' : 'Edit Bot'}
          </h1>
        </div>
        
        {!isNew && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleBotStatus}
              className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                botStatus === 'active'
                  ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                  : 'bg-green-100 text-green-800 hover:bg-green-200'
              }`}
            >
              {botStatus === 'active' ? (
                <>
                  <Pause size={18} className="mr-2" />
                  Pause Bot
                </>
              ) : (
                <>
                  <Play size={18} className="mr-2" />
                  Activate Bot
                </>
              )}
            </button>
            <button
              type="button"
              onClick={deleteBot}
              className="flex items-center px-4 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200 transition-colors"
            >
              <Trash2 size={18} className="mr-2" />
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bot Name</label>
              <input
                type="text"
                className={`w-full px-3 py-2 border rounded-md ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="My Trading Bot"
                {...register('name', { required: 'Bot name is required' })}
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trading Symbol</label>
              <input
                type="text"
                className={`w-full px-3 py-2 border rounded-md ${errors.symbol ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="BTCUSDT"
                {...register('symbol', { required: 'Symbol is required' })}
              />
              {errors.symbol && <p className="mt-1 text-xs text-red-600">{errors.symbol.message}</p>}
            </div>
          </div>

          {/* API Key Selection */}
          <div className="mb-6">
            <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
              API Key
              <div className="relative ml-2 group">
                <Info size={16} className="text-gray-400 cursor-help" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 bg-black bg-opacity-75 text-white text-xs rounded p-2 z-10">
                  Select which API key this bot should use. If not specified, it will use the default API key.
                </div>
              </div>
            </label>
            <div className="flex items-center space-x-2">
              <select
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                {...register('api_key_id')}
              >
                <option value="">Use Default API Key</option>
                {apiKeys.map((key) => (
                  <option key={key.id} value={key.id}>
                    {key.name} {key.is_default && '(Default)'} - {key.account_type === 'main' ? 'Main' : 'Sub'} Account
                  </option>
                ))}
              </select>
              
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center"
              >
                <Key size={16} className="mr-1" />
                Manage Keys
              </button>
            </div>

            {apiKeys.length === 0 && (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-start">
                <AlertTriangle size={16} className="text-yellow-500 mr-2 mt-0.5" />
                <p className="text-sm text-yellow-700">
                  No API keys found. Please add your Bybit API keys in the Account Settings.
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Order Type</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                {...register('default_order_type')}
              >
                <option value="Market">Market</option>
                <option value="Limit">Limit</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Quantity</label>
              <input
                type="number"
                step="0.000001"
                className={`w-full px-3 py-2 border rounded-md ${errors.default_quantity ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="0.001"
                {...register('default_quantity', {
                  required: 'Quantity is required',
                  valueAsNumber: true,
                  min: { value: 0.000001, message: 'Quantity must be greater than 0' }
                })}
              />
              {errors.default_quantity && <p className="mt-1 text-xs text-red-600">{errors.default_quantity.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Side (optional)</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                {...register('default_side')}
              >
                <option value="">No default</option>
                <option value="Buy">Buy</option>
                <option value="Sell">Sell</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Stop Loss % (optional)</label>
              <input
                type="number"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="0"
                {...register('default_stop_loss', { valueAsNumber: true })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Take Profit % (optional)</label>
              <input
                type="number"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="0"
                {...register('default_take_profit', { valueAsNumber: true })}
              />
            </div>
          </div>

          {/* Position Sizing Settings */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-3">Position Sizing</h3>
            
            <div className="mb-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="position_sizing_enabled"
                  className="h-4 w-4 text-blue-600 rounded"
                  {...register('position_sizing_enabled')}
                />
                <label htmlFor="position_sizing_enabled" className="ml-2 block text-sm text-gray-700">
                  Enable Automatic Position Sizing
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                When enabled, the bot will calculate position size based on risk amount and stop loss level.
              </p>
            </div>
            
            {watchPositionSizingEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-blue-50 border border-blue-100 rounded-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Risk Per Trade (USDT)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="10"
                    {...register('risk_per_trade', { 
                      valueAsNumber: true,
                      min: { value: 0, message: 'Risk amount must be positive' } 
                    })}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Maximum amount to risk per trade, including fees.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Market Fee (%)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="0.075"
                      {...register('market_fee_percentage', { 
                        valueAsNumber: true,
                        min: { value: 0, message: 'Fee must be positive' } 
                      })}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Limit Fee (%)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="0.025"
                      {...register('limit_fee_percentage', { 
                        valueAsNumber: true,
                        min: { value: 0, message: 'Fee must be positive' } 
                      })}
                    />
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <div className="flex items-start p-3 bg-yellow-50 border border-yellow-100 rounded-md">
                    <AlertTriangle size={16} className="text-yellow-600 mr-2 mt-0.5" />
                    <p className="text-sm text-yellow-700">
                      Position sizing requires a stop loss value in your TradingView alerts. If no stop loss is provided, the default quantity will be used.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Risk Management Settings */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-3">Risk Management</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Daily Loss Limit (USDT)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="0 (no limit)"
                  {...register('daily_loss_limit', { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'Daily loss limit must be positive' } 
                  })}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Maximum amount the bot can lose in one day before stopping. Set to 0 for no limit.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Position Size (USDT)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="0 (no limit)"
                  {...register('max_position_size', { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'Max position size must be positive' } 
                  })}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Maximum position size for a single trade. Set to 0 for no limit.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
              placeholder="Enter a description for this bot..."
              {...register('description')}
            />
          </div>

          <div className="mb-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="test_mode"
                className="h-4 w-4 text-blue-600 rounded"
                {...register('test_mode')}
              />
              <label htmlFor="test_mode" className="ml-2 block text-sm text-gray-700">
                Test Mode
              </label>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              In test mode, no real trades will be executed. This is useful for testing your TradingView alerts.
            </p>
            {watchTestMode && (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-start">
                <AlertTriangle size={16} className="text-yellow-500 mr-2 mt-0.5" />
                <p className="text-sm text-yellow-700">
                  Test mode is enabled. The bot will process incoming signals but will not execute actual trades.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
            >
              {saving && <RefreshCw size={16} className="mr-2 animate-spin" />}
              {isNew ? 'Create Bot' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {!isNew && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">TradingView Webhook</h2>
          
          {webhookUrl ? (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Webhook URL</label>
              <div className="flex">
                <input
                  type="text"
                  value={webhookUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50"
                />
                <button
                  type="button"
                  onClick={copyWebhookUrl}
                  className="px-3 py-2 bg-gray-100 border border-gray-300 border-l-0 rounded-r-md hover:bg-gray-200 transition-colors flex items-center"
                >
                  {copySuccess ? <CheckCircle size={18} className="text-green-600" /> : <Copy size={18} />}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Use this URL in your TradingView alerts to send signals to this bot.
              </p>
            </div>
          ) : (
            <div className="mb-4">
              <p className="text-sm text-gray-700 mb-3">
                Generate a webhook URL to connect this bot with TradingView alerts.
              </p>
              <button
                type="button"
                onClick={generateWebhook}
                disabled={generateLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center"
              >
                {generateLoading ? (
                  <RefreshCw size={16} className="mr-2 animate-spin" />
                ) : (
                  <Bot size={16} className="mr-2" />
                )}
                Generate Webhook URL
              </button>
            </div>
          )}
          
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="font-medium text-blue-800 mb-2">TradingView Alert JSON Format</h3>
            <pre className="bg-gray-800 text-gray-200 p-3 rounded-md text-xs overflow-x-auto">
{`{
  "symbol": "BTCUSDT",
  "side": "Buy",
  "orderType": "Market",
  "quantity": 0.001,
  "price": 50000,
  "stopLoss": 49000,
  "takeProfit": 52000,
  "state": "open"
}`}
            </pre>
            <p className="mt-2 text-sm text-blue-700">
              Copy this format to your TradingView alert message, replacing the values as needed.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BotConfiguration;