import React from 'react';
import { useState } from 'react';
import { Bot, AlertTriangle, Code, Copy, CheckCircle, ArrowRight, Github, BookOpen } from 'lucide-react';

const Documentation: React.FC = () => {
  const [copySuccess, setCopySuccess] = useState<Record<string, boolean>>({});

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess({ ...copySuccess, [id]: true });
    setTimeout(() => {
      setCopySuccess({ ...copySuccess, [id]: false });
    }, 2000);
  };

  const codeSnippets = {
    tradingViewAlert: `{
  "symbol": "BTCUSDT",
  "side": "Buy",
  "orderType": "Market",
  "quantity": 0.001,
  "price": 50000,
  "stopLoss": 49000,
  "takeProfit": 52000,
  "state": "open"
}`,
    tradingViewCloseAlert: `{
  "symbol": "BTCUSDT",
  "state": "close"
}`,
    tradingViewVariables: `{
  "symbol": "{{ticker}}",
  "side": "{{strategy.order.action}}",
  "price": {{close}},
  "quantity": {{strategy.position_size}},
  "state": "{{if(strategy.position_size > 0, 'open', 'close')}}"
}`,
    positionSizingAlert: `{
  "symbol": "BTCUSDT",
  "side": "Buy",
  "price": 50000, 
  "stopLoss": 49000,
  "state": "open"
}`,
    tradingViewStrategy: `//─────────────────────────────
// ALERT MESSAGE FOR JSON OUTPUT
//────────────────────────────-------------
// For Long Trades:
if strategy.position_size > 0 and strategy.position_size[1] <= 0 and not na(lockedLongTP) and not na(longStopFixed)
    jsonMsg = "{" +
              "\"symbol\": \"" + syminfo.ticker + "\", " +
              "\"side\": \"Buy\", " +
              "\"orderType\": \"Market\", " +
              "\"quantity\": \"" + str.tostring(strategy.position_size) + "\", " +
              "\"price\": \"" + str.tostring(close, format.mintick) + "\", " +
              "\"stopLoss\": " + str.tostring(longStopFixed, format.mintick) + ", " +
              "\"takeProfit\": " + str.tostring(lockedLongTP, format.mintick) + ", " +
              "\"state\": \"open\", " +
              "\"closeReason\": \"none\", " +
              "\"bot_name\": \"-----\", " +
              "\"webhook_url\": \"-----\"" +
              "}"
    alert(jsonMsg, alert.freq_once_per_bar)

if strategy.position_size == 0 and strategy.position_size[1] > 0
    jsonMsg = "{" +
              "\"symbol\": \"" + syminfo.ticker + "\", " +
              "\"side\": \"Sell\", " +
              "\"quantity\": \"" + str.tostring(strategy.position_size[1]) + "\", " +
              "\"price\": \"" + str.tostring(close, format.mintick) + "\", " +
              "\"state\": \"close\", " +
              "\"closeReason\": \"none\", " +
              "\"bot_name\": \"-----\", " +
              "\"webhook_url\": \"-----\"" +
              "}"
    alert(jsonMsg, alert.freq_once_per_bar)

// For Short Trades:
if strategy.position_size < 0 and strategy.position_size[1] >= 0 and not na(lockedShortTP) and not na(shortStopFixed)
    jsonMsg = "{" +
              "\"symbol\": \"" + syminfo.ticker + "\", " +
              "\"side\": \"Sell\", " +
              "\"orderType\": \"Market\", " +
              "\"quantity\": \"" + str.tostring(math.abs(strategy.position_size)) + "\", " +
              "\"price\": \"" + str.tostring(close, format.mintick) + "\", " +
              "\"stopLoss\": " + str.tostring(shortStopFixed, format.mintick) + ", " +
              "\"takeProfit\": " + str.tostring(lockedShortTP, format.mintick) + ", " +
              "\"state\": \"open\", " +
              "\"closeReason\": \"none\", " +
              "\"bot_name\": \"-----\", " +
              "\"webhook_url\": \"-----\"" +
              "}"
    alert(jsonMsg, alert.freq_once_per_bar)

if strategy.position_size == 0 and strategy.position_size[1] < 0
    jsonMsg = "{" +
              "\"symbol\": \"" + syminfo.ticker + "\", " +
              "\"side\": \"Buy\", " +
              "\"quantity\": \"" + str.tostring(strategy.position_size[1]) + "\", " +
              "\"price\": \"" + str.tostring(close, format.mintick) + "\", " +
              "\"state\": \"close\", " +
              "\"closeReason\": \"none\", " +
              "\"bot_name\": \"-----\", " +
              "\"webhook_url\": \"-----\"" +
              "}"
    alert(jsonMsg, alert.freq_once_per_bar)`
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Documentation</h1>
      
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Getting Started</h2>
        
        <div className="space-y-4">
          <p className="text-gray-700">
            Welcome to the Trading Bot Platform! This guide will help you set up your trading bots and connect them to TradingView for automated trade execution on Bybit.
          </p>
          
          <div className="flex items-start p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <AlertTriangle size={20} className="text-yellow-500 mr-3 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-800">Important Safety Notice</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Always start with small amounts and test your setup thoroughly before using larger sums. Trading involves risk of financial loss. Use Test Mode for initial setup.
              </p>
            </div>
          </div>
          
          <h3 className="font-medium text-lg mt-6">Platform Overview</h3>
          <ul className="list-disc list-inside ml-4 text-gray-700 space-y-2">
            <li>Create multiple trading bots with custom configurations</li>
            <li>Connect each bot to TradingView alerts via unique webhook URLs</li>
            <li>Execute trades automatically on Bybit based on TradingView signals</li>
            <li>Monitor performance and trade history</li>
            <li>Test your strategy without risking real funds</li>
          </ul>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Setting Up TradingView Alerts</h2>
        
        <div className="space-y-4">
          <h3 className="font-medium text-lg">Step 1: Generate Your Webhook URL</h3>
          <p className="text-gray-700">
            Before setting up alerts in TradingView, you need to generate a unique webhook URL for your bot:
          </p>
          <ol className="list-decimal list-inside ml-4 text-gray-700 space-y-2">
            <li>Go to the "Bots" section of the dashboard</li>
            <li>Select the bot you want to connect to TradingView</li>
            <li>Click "Generate Webhook URL"</li>
            <li>Copy the generated URL</li>
          </ol>
          
          <h3 className="font-medium text-lg mt-6">Step 2: Create an Alert in TradingView</h3>
          <p className="text-gray-700">
            Now that you have your webhook URL, you need to create an alert in TradingView:
          </p>
          <ol className="list-decimal list-inside ml-4 text-gray-700 space-y-2">
            <li>Open TradingView and navigate to the chart of your chosen symbol</li>
            <li>Create your strategy or indicator</li>
            <li>Click the "Alerts" button (bell icon) in the top right</li>
            <li>Create a new alert</li>
            <li>Set your alert conditions</li>
            <li>Scroll down to "Notifications"</li>
            <li>Enable "Webhook URL"</li>
            <li>Paste your webhook URL</li>
            <li>Add the JSON payload in the "Message" field (see below)</li>
          </ol>
          
          <h3 className="font-medium text-lg mt-6">Step 3: JSON Payload Format</h3>
          <p className="text-gray-700 mb-2">
            Your TradingView alert message must follow this JSON format for opening trades:
          </p>
          
          <div className="relative">
            <pre className="bg-gray-800 text-gray-200 p-4 rounded-md text-sm overflow-x-auto">
              {codeSnippets.tradingViewAlert}
            </pre>
            <button
              onClick={() => copyToClipboard(codeSnippets.tradingViewAlert, 'alert')}
              className="absolute top-2 right-2 p-1.5 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 transition-colors"
              aria-label="Copy code"
            >
              {copySuccess['alert'] ? <CheckCircle size={16} /> : <Copy size={16} />}
            </button>
          </div>
          
          <p className="text-gray-700 mt-4 mb-2">
            For closing trades, use this format:
          </p>
          
          <div className="relative">
            <pre className="bg-gray-800 text-gray-200 p-4 rounded-md text-sm overflow-x-auto">
              {codeSnippets.tradingViewCloseAlert}
            </pre>
            <button
              onClick={() => copyToClipboard(codeSnippets.tradingViewCloseAlert, 'closeAlert')}
              className="absolute top-2 right-2 p-1.5 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 transition-colors"
              aria-label="Copy code"
            >
              {copySuccess['closeAlert'] ? <CheckCircle size={16} /> : <Copy size={16} />}
            </button>
          </div>
          
          <p className="text-gray-700 mt-4 mb-2">
            You can use TradingView variables in your payload:
          </p>
          
          <div className="relative">
            <pre className="bg-gray-800 text-gray-200 p-4 rounded-md text-sm overflow-x-auto">
              {codeSnippets.tradingViewVariables}
            </pre>
            <button
              onClick={() => copyToClipboard(codeSnippets.tradingViewVariables, 'variables')}
              className="absolute top-2 right-2 p-1.5 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 transition-colors"
              aria-label="Copy code"
            >
              {copySuccess['variables'] ? <CheckCircle size={16} /> : <Copy size={16} />}
            </button>
          </div>
          
          <h3 className="font-medium text-lg mt-6">Position Sizing Format</h3>
          <p className="text-gray-700 mb-2">
            If you've enabled position sizing on your bot, your alert must include at least the stopLoss value:
          </p>
          
          <div className="relative">
            <pre className="bg-gray-800 text-gray-200 p-4 rounded-md text-sm overflow-x-auto">
              {codeSnippets.positionSizingAlert}
            </pre>
            <button
              onClick={() => copyToClipboard(codeSnippets.positionSizingAlert, 'positionSizing')}
              className="absolute top-2 right-2 p-1.5 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 transition-colors"
              aria-label="Copy code"
            >
              {copySuccess['positionSizing'] ? <CheckCircle size={16} /> : <Copy size={16} />}
            </button>
          </div>
          
          <h3 className="font-medium text-lg mt-6">TradingView Strategy Code</h3>
          <p className="text-gray-700 mb-2">
            Copy and paste this code into your TradingView Pine Script strategy to automatically generate the correct JSON format for alerts:
          </p>
          
          <div className="relative">
            <pre className="bg-gray-800 text-gray-200 p-4 rounded-md text-sm overflow-x-auto">
              {codeSnippets.tradingViewStrategy}
            </pre>
            <button
              onClick={() => copyToClipboard(codeSnippets.tradingViewStrategy, 'strategy')}
              className="absolute top-2 right-2 p-1.5 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 transition-colors"
              aria-label="Copy code"
            >
              {copySuccess['strategy'] ? <CheckCircle size={16} /> : <Copy size={16} />}
            </button>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-medium text-blue-800 mb-2">How to Implement the Strategy Code</h4>
            <ol className="list-decimal list-inside text-sm text-blue-700">
              <li className="mb-2">Add this code at the end of your TradingView strategy</li>
              <li className="mb-2">Replace <code>"SUPER15"</code> with your bot's name</li>
              <li className="mb-2">Replace <code>"none"</code> with "signal" and the bot will execute the close order</li>
              <li className="mb-2">Ensure your strategy defines <code>lockedLongTP</code>, <code>longStopFixed</code>, <code>lockedShortTP</code>, and <code>shortStopFixed</code> variables</li>
              <li className="mb-2">Adapt conditional checks based on your strategy's entry/exit logic</li>
              <li>Set alerts to trigger "Once Per Bar Close" for consistent execution</li>
            </ol>
          </div>
          
          <div className="flex items-start p-4 bg-blue-50 border border-blue-200 rounded-md mt-4">
            <Bot size={20} className="text-blue-500 mr-3 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-800">Trade State Tracking</h3>
              <p className="text-sm text-blue-700 mt-1">
                The <code>state</code> field is important for tracking whether a trade is being opened or closed:
              </p>
              <ul className="list-disc list-inside ml-4 text-sm text-blue-700 mt-2">
                <li><code>"state": "open"</code> - Opens a new trade position</li>
                <li><code>"state": "close"</code> - Closes an existing open position</li>
              </ul>
              <p className="text-sm text-blue-700 mt-2">
                When opening a trade with stop loss and take profit values, the exchange will handle these automatically.
                For trades without stop loss/take profit, you must send a closing signal when you want to exit the position.
              </p>
            </div>
          </div>
          
          <h3 className="font-medium text-lg mt-6">Testing Your Webhook</h3>
          <p className="text-gray-700">
            To test your webhook before using it with real money:
          </p>
          <ol className="list-decimal list-inside ml-4 text-gray-700 space-y-2">
            <li>Create a bot with the "Test Mode" option enabled</li>
            <li>Generate a webhook URL for this test bot</li>
            <li>Set up your TradingView alert with this URL</li>
            <li>Trigger the alert manually or wait for it to trigger</li>
            <li>Check the "Trade History" section to see if the test order was processed correctly</li>
          </ol>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Bot Configuration Options</h2>
        
        <div className="space-y-4">
          <p className="text-gray-700">
            Each bot can be configured with the following options:
          </p>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-700">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                <tr>
                  <th scope="col" className="px-6 py-3">Option</th>
                  <th scope="col" className="px-6 py-3">Description</th>
                  <th scope="col" className="px-6 py-3">Default</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-6 py-4 font-medium">Bot Name</td>
                  <td className="px-6 py-4">A descriptive name for your bot</td>
                  <td className="px-6 py-4">-</td>
                </tr>
                <tr className="border-b">
                  <td className="px-6 py-4 font-medium">Trading Symbol</td>
                  <td className="px-6 py-4">The trading pair (e.g., BTCUSDT)</td>
                  <td className="px-6 py-4">BTCUSDT</td>
                </tr>
                <tr className="border-b">
                  <td className="px-6 py-4 font-medium">Default Order Type</td>
                  <td className="px-6 py-4">Market or Limit order</td>
                  <td className="px-6 py-4">Market</td>
                </tr>
                <tr className="border-b">
                  <td className="px-6 py-4 font-medium">Default Quantity</td>
                  <td className="px-6 py-4">Size of each trade</td>
                  <td className="px-6 py-4">0.001</td>
                </tr>
                <tr className="border-b">
                  <td className="px-6 py-4 font-medium">Default Side</td>
                  <td className="px-6 py-4">Buy, Sell, or none (use signal)</td>
                  <td className="px-6 py-4">None</td>
                </tr>
                <tr className="border-b">
                  <td className="px-6 py-4 font-medium">Default Stop Loss %</td>
                  <td className="px-6 py-4">Automatic stop loss percentage</td>
                  <td className="px-6 py-4">0 (disabled)</td>
                </tr>
                <tr className="border-b">
                  <td className="px-6 py-4 font-medium">Default Take Profit %</td>
                  <td className="px-6 py-4">Automatic take profit percentage</td>
                  <td className="px-6 py-4">0 (disabled)</td>
                </tr>
                <tr className="border-b">
                  <td className="px-6 py-4 font-medium">Position Sizing</td>
                  <td className="px-6 py-4">Automatically calculate position size based on risk</td>
                  <td className="px-6 py-4">Disabled</td>
                </tr>
                <tr className="border-b">
                  <td className="px-6 py-4 font-medium">Risk Per Trade</td>
                  <td className="px-6 py-4">Maximum USDT amount to risk on each trade</td>
                  <td className="px-6 py-4">10 USDT</td>
                </tr>
                <tr className="border-b">
                  <td className="px-6 py-4 font-medium">Market/Limit Fee %</td>
                  <td className="px-6 py-4">Fee percentages for order types</td>
                  <td className="px-6 py-4">0.075% / 0.025%</td>
                </tr>
                <tr className="border-b">
                  <td className="px-6 py-4 font-medium">Daily Loss Limit</td>
                  <td className="px-6 py-4">Maximum loss allowed in a single day</td>
                  <td className="px-6 py-4">0 (no limit)</td>
                </tr>
                <tr className="border-b">
                  <td className="px-6 py-4 font-medium">Max Position Size</td>
                  <td className="px-6 py-4">Maximum position size for a single trade</td>
                  <td className="px-6 py-4">0 (no limit)</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium">Test Mode</td>
                  <td className="px-6 py-4">Process signals without executing real trades</td>
                  <td className="px-6 py-4">Enabled</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <p className="text-gray-700 mt-4">
            While these settings provide defaults for your bot, you can override them in each TradingView alert by including the specific values in your alert message.
          </p>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Advanced Features</h2>
        
        <div className="space-y-4">
          <h3 className="font-medium text-lg">Automatic Position Sizing</h3>
          <p className="text-gray-700">
            The platform includes powerful position sizing capabilities to help manage your risk consistently:
          </p>
          <ul className="list-disc list-inside ml-4 text-gray-700 space-y-2">
            <li><strong>Risk-Based Sizing:</strong> Set a fixed USDT amount to risk per trade. The system calculates position size based on the difference between entry and stop loss.</li>
            <li><strong>Fee Integration:</strong> Position sizing accounts for trading fees to ensure accurate risk calculation.</li>
            <li><strong>Exchange Compliance:</strong> Final position sizes are always adjusted to comply with exchange minimum quantity and step size requirements.</li>
            <li><strong>Maximum Controls:</strong> Position sizing respects your maximum position size settings for additional risk management.</li>
          </ul>
          
          <div className="flex items-start p-4 bg-blue-50 border border-blue-200 rounded-md mt-4">
            <Bot size={20} className="text-blue-500 mr-3 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-800">Position Sizing Requirements</h3>
              <p className="text-sm text-blue-700 mt-1">
                For position sizing to work properly, your TradingView alerts must include:
              </p>
              <ul className="list-disc list-inside ml-4 text-sm text-blue-700 mt-2">
                <li>A <code>stopLoss</code> value (exact price, not percentage)</li>
                <li>The <code>side</code> of the trade (Buy/Sell)</li>
                <li>Ideally, the current <code>price</code> for more accurate calculations</li>
              </ul>
              <p className="text-sm text-blue-700 mt-2">
                Without these values, the system will fall back to using your default quantity settings.
              </p>
            </div>
          </div>
          
          <h3 className="font-medium text-lg mt-4">Real Profit/Loss Data</h3>
          <p className="text-gray-700">
            For actual trades (non-test mode), the platform automatically fetches the real profit/loss data directly from the Bybit API. This ensures that your trade history and analytics display accurate P/L figures that match your exchange account.
          </p>
          
          <h3 className="font-medium text-lg mt-4">Risk Management</h3>
          <p className="text-gray-700">
            The platform includes built-in risk management features to help protect your capital:
          </p>
          <ul className="list-disc list-inside ml-4 text-gray-700 space-y-2">
            <li><strong>Daily Loss Limit:</strong> Set a maximum amount your bot can lose in a single day before it stops trading.</li>
            <li><strong>Maximum Position Size:</strong> Limit the size of individual trades to prevent oversized positions.</li>
          </ul>
          
          <div className="flex items-start p-4 bg-blue-50 border border-blue-200 rounded-md mt-4">
            <Bot size={20} className="text-blue-500 mr-3 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-800">Position Sizing Tips</h3>
              <p className="text-sm text-blue-700 mt-1">
                For responsible risk management, consider these position sizing guidelines:
              </p>
              <ul className="list-disc list-inside ml-4 text-sm text-blue-700 mt-2">
                <li>Limit individual trades to 1-2% of your total account value</li>
                <li>Set your daily loss limit to a maximum of 5% of your account</li>
                <li>Always start with smaller positions when testing a new strategy</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Bybit API Setup</h2>
        
        <div className="space-y-4">
          <p className="text-gray-700">
            To connect your Trading Bot Platform to Bybit, you need to generate API keys from your Bybit account:
          </p>
          
          <h3 className="font-medium text-lg">Steps to Generate Bybit API Keys:</h3>
          <ol className="list-decimal list-inside ml-4 text-gray-700 space-y-2">
            <li>Log in to your Bybit account</li>
            <li>Navigate to "API Management" in your account settings</li>
            <li>Click "Create New Key"</li>
            <li>
              Set the permissions:
              <ul className="list-disc list-inside ml-6 mt-1">
                <li>Read - Mandatory</li>
                <li>Trade - Mandatory</li>
                <li>Withdraw - <span className="font-medium text-red-600">NOT recommended</span></li>
              </ul>
            </li>
            <li>Enter your 2FA code to confirm</li>
            <li>Copy both the API Key and API Secret</li>
            <li>Enter these credentials in the Account Settings page of this platform</li>
          </ol>
          
          <div className="flex items-start p-4 bg-blue-50 border border-blue-200 rounded-md mt-4">
            <Bot size={20} className="text-blue-500 mr-3 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-800">Testing with Bybit Testnet</h3>
              <p className="text-sm text-blue-700 mt-1">
                We recommend using Bybit Testnet for initial setup and testing. Create a Testnet account at <a href="https://testnet.bybit.com" target="_blank" rel="noopener noreferrer" className="underline">testnet.bybit.com</a> and generate API keys there. Enable "Use Bybit Testnet" in your account settings.
              </p>
            </div>
          </div>
          
          <div className="flex items-start p-4 bg-red-50 border border-red-200 rounded-md mt-4">
            <AlertTriangle size={20} className="text-red-500 mr-3 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-800">Security Warning</h3>
              <p className="text-sm text-red-700 mt-1">
                Never share your API keys or secrets with anyone. This platform securely encrypts your keys, but you should still follow security best practices. Do not enable withdrawal permissions for API keys used with this platform.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documentation;