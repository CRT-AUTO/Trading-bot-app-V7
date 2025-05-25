import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { format, parseISO, subDays, addDays, isToday } from 'date-fns';
import { RefreshCw, Save, Calendar, ChevronLeft, ChevronRight, Book, PencilLine, DollarSign, ImageIcon, ExternalLink, ArrowDown, ArrowUp } from 'lucide-react';

// Trade interface for displaying trades in the journal
interface Trade {
  id: string;
  symbol: string;
  side: 'Buy' | 'Sell';
  entry_price: number;
  quantity: number;
  stop_loss?: number | null;
  take_profit?: number | null;
  close_price?: number | null;
  pnl?: number | null;
  status: string;
  finish_r?: number | null;
  system_id?: string | null;
}

// Separate components for different sections of the journal
const DailyProgramming: React.FC<{value: string, onChange: (value: string) => void}> = ({value, onChange}) => (
  <div className="mb-4">
    <h3 className="font-medium text-sm bg-cyan-500 text-white py-2 px-4 mb-2">Daily Programming</h3>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
      rows={4}
      placeholder="I have the potential to lose a lot of money today if I am impatient and not professional..."
    />
  </div>
);

const MorningThoughts: React.FC<{value: string, onChange: (value: string) => void}> = ({value, onChange}) => (
  <div className="mb-4">
    <h3 className="font-medium text-sm bg-cyan-500 text-white py-2 px-4 mb-2">Morning thoughts</h3>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
      rows={6}
      placeholder="Your morning thoughts and plans for the trading day..."
    />
  </div>
);

const MarketAnalysis: React.FC<{
  tradFiOpen: string, setTradFiOpen: (value: string) => void,
  news: string, setNews: (value: string) => void,
  options: string, setOptions: (value: string) => void,
  bybitOI: string, setBybitOI: (value: string) => void,
  bybitFunding: string, setBybitFunding: (value: string) => void,
  binanceOI: string, setBinanceOI: (value: string) => void,
  binanceFunding: string, setBinanceFunding: (value: string) => void
}> = ({ 
  tradFiOpen, setTradFiOpen,
  news, setNews,
  options, setOptions,
  bybitOI, setBybitOI,
  bybitFunding, setBybitFunding,
  binanceOI, setBinanceOI,
  binanceFunding, setBinanceFunding
}) => (
  <div className="mb-4">
    <h3 className="font-medium text-sm bg-cyan-500 text-white py-2 px-4 mb-2">Morning Market Analysis</h3>
    <div className="grid grid-cols-5 border border-gray-300 divide-x divide-gray-300">
      <div className="col-span-1 p-2 bg-gray-100 font-medium">Trad FI open?</div>
      <div className="col-span-1 p-2 bg-gray-100 font-medium">News?</div>
      <div className="col-span-1 p-2 bg-gray-100 font-medium">Options</div>
      <div className="col-span-2 p-2 bg-gray-100 font-medium">Funding</div>
    </div>
    
    <div className="grid grid-cols-5 border-x border-b border-gray-300 divide-x divide-gray-300">
      <div className="col-span-1 p-2">
        <textarea 
          value={tradFiOpen} 
          onChange={(e) => setTradFiOpen(e.target.value)}
          className="w-full px-2 py-1 border border-gray-300 text-sm"
          rows={3}
        />
      </div>
      <div className="col-span-1 p-2">
        <textarea 
          value={news} 
          onChange={(e) => setNews(e.target.value)}
          className="w-full px-2 py-1 border border-gray-300 text-sm"
          rows={3}
        />
      </div>
      <div className="col-span-1 p-2">
        <textarea 
          value={options} 
          onChange={(e) => setOptions(e.target.value)}
          className="w-full px-2 py-1 border border-gray-300 text-sm"
          rows={3}
        />
      </div>
      <div className="col-span-2 grid grid-cols-2">
        <div className="border-b border-gray-300 p-2 text-center font-bold text-red-600">BYBIT</div>
        <div className="border-b border-gray-300 p-2 text-center font-bold text-yellow-600">BINANCE</div>
        
        <div className="p-2">
          <textarea 
            value={bybitOI} 
            onChange={(e) => setBybitOI(e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 text-sm"
            rows={1}
            placeholder="OI"
          />
        </div>
        <div className="p-2">
          <textarea 
            value={binanceOI} 
            onChange={(e) => setBinanceOI(e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 text-sm"
            rows={1}
            placeholder="OI"
          />
        </div>
        <div className="p-2">
          <textarea 
            value={bybitFunding} 
            onChange={(e) => setBybitFunding(e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 text-sm"
            rows={1}
            placeholder="Funding"
          />
        </div>
        <div className="p-2">
          <textarea 
            value={binanceFunding} 
            onChange={(e) => setBinanceFunding(e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 text-sm"
            rows={1}
            placeholder="Funding"
          />
        </div>
      </div>
    </div>
  </div>
);

// Enhanced CoinAnalysis component with image uploads
const CoinAnalysis: React.FC<{
  coin: string,
  structure: string, setStructure: (value: string) => void,
  first2H: string, setFirst2H: (value: string) => void,
  sentiment15M: string, setSentiment15M: (value: string) => void,
  emas15M: string, setEmas15M: (value: string) => void,
  atr15M: string, setAtr15M: (value: string) => void,
  sentiment1H: string, setSentiment1H: (value: string) => void,
  macd1H: string, setMacd1H: (value: string) => void,
  score: string, setScore: (value: string) => void,
  notes: string, setNotes: (value: string) => void,
  entryChartUrl: string, setEntryChartUrl: (value: string) => void,
  exitChartUrl: string, setExitChartUrl: (value: string) => void,
  dataChartUrl: string, setDataChartUrl: (value: string) => void,
  isExpanded: boolean, toggleExpand: () => void
}> = ({
  coin,
  structure, setStructure,
  first2H, setFirst2H,
  sentiment15M, setSentiment15M,
  emas15M, setEmas15M,
  atr15M, setAtr15M,
  sentiment1H, setSentiment1H,
  macd1H, setMacd1H,
  score, setScore,
  notes, setNotes,
  entryChartUrl, setEntryChartUrl,
  exitChartUrl, setExitChartUrl,
  dataChartUrl, setDataChartUrl,
  isExpanded, toggleExpand
}) => (
  <div className="mb-4 bg-gray-200 p-2">
    <div className="grid grid-cols-6">
      <div className="col-span-1 font-bold text-center py-2 flex items-center justify-between px-2">
        <span className="text-lg">{coin}</span>
        <button 
          onClick={toggleExpand}
          className="p-1 rounded hover:bg-gray-300"
          title={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
        </button>
      </div>
      <div className="col-span-5">
        <div className="grid grid-cols-5 gap-1">
          <div className="col-span-5 flex">
            <div className="w-24 text-sm">-Structure -</div>
            <div className="w-8 text-sm text-center">1D:</div>
            <input 
              type="text" 
              value={structure} 
              onChange={(e) => setStructure(e.target.value)}
              className="flex-1 px-2 py-0.5 border border-gray-300 text-sm"
            />
            <div className="w-8 text-sm text-center">5H:</div>
            <input 
              type="text" 
              className="flex-1 px-2 py-0.5 border border-gray-300 text-sm"
            />
            <div className="w-8 text-sm text-center">1H:</div>
            <input 
              type="text" 
              className="flex-1 px-2 py-0.5 border border-gray-300 text-sm"
            />
            <div className="w-10 text-sm text-center">15M:</div>
            <input 
              type="text" 
              className="flex-1 px-2 py-0.5 border border-gray-300 text-sm"
            />
          </div>
          <div className="col-span-5 flex">
            <div className="w-24 text-sm">-First 2H (15M) -</div>
            <input 
              type="text" 
              value={first2H} 
              onChange={(e) => setFirst2H(e.target.value)}
              className="flex-1 px-2 py-0.5 border border-gray-300 text-sm"
            />
          </div>
          <div className="col-span-5 flex">
            <div className="w-24 text-sm">-15M Sentiment -</div>
            <input 
              type="text" 
              value={sentiment15M} 
              onChange={(e) => setSentiment15M(e.target.value)}
              className="flex-1 px-2 py-0.5 border border-gray-300 text-sm"
            />
            <div className="w-14 text-sm text-center">EMA's:</div>
            <input 
              type="text" 
              value={emas15M} 
              onChange={(e) => setEmas15M(e.target.value)}
              className="flex-1 px-2 py-0.5 border border-gray-300 text-sm"
            />
            <div className="w-12 text-sm text-center">ATR:</div>
            <input 
              type="text" 
              value={atr15M} 
              onChange={(e) => setAtr15M(e.target.value)}
              className="flex-1 px-2 py-0.5 border border-gray-300 text-sm"
            />
          </div>
          <div className="col-span-5 flex">
            <div className="w-24 text-sm">-1H Sentiment -</div>
            <input 
              type="text" 
              value={sentiment1H} 
              onChange={(e) => setSentiment1H(e.target.value)}
              className="flex-1 px-2 py-0.5 border border-gray-300 text-sm"
            />
            <div className="w-14 text-sm text-center">MACD :</div>
            <input 
              type="text" 
              value={macd1H} 
              onChange={(e) => setMacd1H(e.target.value)}
              className="flex-1 px-2 py-0.5 border border-gray-300 text-sm"
            />
          </div>
          <div className="col-span-5 flex">
            <div className="w-24 text-sm">-Score -</div>
            <input 
              type="text" 
              value={score} 
              onChange={(e) => setScore(e.target.value)}
              className="flex-1 px-2 py-0.5 border border-gray-300 text-sm"
            />
          </div>
        </div>
      </div>
    </div>

    {/* Expanded section with image uploads and notes */}
    {isExpanded && (
      <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-3 border border-gray-300 rounded-md">
        {/* Image section for Entry Chart */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="font-medium text-sm text-gray-700">Entry Chart</label>
            {entryChartUrl && (
              <a 
                href={entryChartUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-xs flex items-center"
              >
                <ExternalLink size={12} className="mr-1" /> Open
              </a>
            )}
          </div>
          <input
            type="text"
            value={entryChartUrl}
            onChange={(e) => setEntryChartUrl(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
            placeholder="https://example.com/chart.png"
          />
          {entryChartUrl && (
            <div className="mt-1 border border-gray-200 rounded overflow-hidden">
              <div className="relative pt-[75%] bg-gray-100">
                <img 
                  src={entryChartUrl} 
                  alt={`${coin} Entry Chart`}
                  className="absolute inset-0 h-full w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=Invalid+Image+URL';
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Image section for Exit Chart */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="font-medium text-sm text-gray-700">Exit Chart</label>
            {exitChartUrl && (
              <a 
                href={exitChartUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-xs flex items-center"
              >
                <ExternalLink size={12} className="mr-1" /> Open
              </a>
            )}
          </div>
          <input
            type="text"
            value={exitChartUrl}
            onChange={(e) => setExitChartUrl(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
            placeholder="https://example.com/chart.png"
          />
          {exitChartUrl && (
            <div className="mt-1 border border-gray-200 rounded overflow-hidden">
              <div className="relative pt-[75%] bg-gray-100">
                <img 
                  src={exitChartUrl} 
                  alt={`${coin} Exit Chart`}
                  className="absolute inset-0 h-full w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=Invalid+Image+URL';
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Image section for Data Chart */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="font-medium text-sm text-gray-700">Data Chart</label>
            {dataChartUrl && (
              <a 
                href={dataChartUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-xs flex items-center"
              >
                <ExternalLink size={12} className="mr-1" /> Open
              </a>
            )}
          </div>
          <input
            type="text"
            value={dataChartUrl}
            onChange={(e) => setDataChartUrl(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
            placeholder="https://example.com/chart.png"
          />
          {dataChartUrl && (
            <div className="mt-1 border border-gray-200 rounded overflow-hidden">
              <div className="relative pt-[75%] bg-gray-100">
                <img 
                  src={dataChartUrl} 
                  alt={`${coin} Data Chart`}
                  className="absolute inset-0 h-full w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=Invalid+Image+URL';
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Coin-specific notes section */}
        <div className="md:col-span-3 space-y-2">
          <label className="font-medium text-sm text-gray-700">{coin} Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
            rows={4}
            placeholder={`Add notes specific to ${coin} here...`}
          />
        </div>
      </div>
    )}
  </div>
);

const HealthMetrics: React.FC<{value: string, onChange: (value: string) => void}> = ({value, onChange}) => (
  <div className="mb-4 grid grid-cols-6">
    <div className="col-span-1 bg-gray-300 p-2 flex items-center justify-center font-medium">
      Health
    </div>
    <div className="col-span-5 p-2">
      <textarea 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
        rows={2}
      />
    </div>
  </div>
);

const TotalMetrics: React.FC<{value: string, onChange: (value: string) => void}> = ({value, onChange}) => (
  <div className="mb-4 grid grid-cols-6">
    <div className="col-span-1 bg-gray-300 p-2 flex items-center justify-center font-medium">
      TOTAL
    </div>
    <div className="col-span-5 p-2">
      <textarea 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
        rows={2}
      />
    </div>
  </div>
);

const AfterThoughts: React.FC<{value: string, onChange: (value: string) => void}> = ({value, onChange}) => (
  <div className="mb-4 grid grid-cols-6">
    <div className="col-span-1 bg-gray-300 p-2 flex items-center justify-center font-medium">
      After thoughts
    </div>
    <div className="col-span-5 p-2">
      <textarea 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
        rows={2}
      />
    </div>
  </div>
);

const EndOfDayReview: React.FC<{
  tradeReview: string, setTradeReview: (value: string) => void,
  mistakes: string, setMistakes: (value: string) => void,
  winsLearns: string, setWinsLearns: (value: string) => void,
  solutions: string, setSolutions: (value: string) => void,
}> = ({
  tradeReview, setTradeReview,
  mistakes, setMistakes,
  winsLearns, setWinsLearns,
  solutions, setSolutions
}) => (
  <div className="mb-4">
    <h3 className="font-medium text-sm bg-cyan-500 text-white py-2 px-4 mb-2 text-center">End Of Day Review</h3>
    <div className="grid grid-cols-4 border border-gray-300 divide-x divide-gray-300">
      <div className="p-2 bg-gray-100 font-medium">Trade Review</div>
      <div className="p-2 bg-gray-100 font-medium">Mistakes</div>
      <div className="p-2 bg-gray-100 font-medium">Wins/learns</div>
      <div className="p-2 bg-gray-100 font-medium">Solutions</div>
    </div>
    <div className="grid grid-cols-4 border-x border-b border-gray-300 divide-x divide-gray-300">
      <div className="p-2">
        <textarea 
          value={tradeReview} 
          onChange={(e) => setTradeReview(e.target.value)}
          className="w-full px-2 py-1 border border-gray-300 text-sm"
          rows={4}
        />
      </div>
      <div className="p-2">
        <textarea 
          value={mistakes} 
          onChange={(e) => setMistakes(e.target.value)}
          className="w-full px-2 py-1 border border-gray-300 text-sm"
          rows={4}
        />
      </div>
      <div className="p-2">
        <textarea 
          value={winsLearns} 
          onChange={(e) => setWinsLearns(e.target.value)}
          className="w-full px-2 py-1 border border-gray-300 text-sm"
          rows={4}
        />
      </div>
      <div className="p-2">
        <textarea 
          value={solutions} 
          onChange={(e) => setSolutions(e.target.value)}
          className="w-full px-2 py-1 border border-gray-300 text-sm"
          rows={4}
        />
      </div>
    </div>
  </div>
);

const EmotionalScorecard: React.FC<{
  feelingScore: string, setFeelingScore: (value: string) => void,
  tradingScore: string, setTradingScore: (value: string) => void,
  powerScore: string, setPowerScore: (value: string) => void,
  howFelt: string, setHowFelt: (value: string) => void,
  random: string, setRandom: (value: string) => void,
  remember: string, setRemember: (value: string) => void
}> = ({
  feelingScore, setFeelingScore,
  tradingScore, setTradingScore,
  powerScore, setPowerScore,
  howFelt, setHowFelt,
  random, setRandom,
  remember, setRemember
}) => (
  <div className="mb-4">
    <div className="grid grid-cols-4 border border-gray-300 divide-x divide-gray-300">
      <div className="p-2 bg-cyan-500 font-medium text-white">Emotional Score (1/5)</div>
      <div className="p-2 bg-cyan-500 font-medium text-white">How did I feel today?</div>
      <div className="p-2 bg-cyan-500 font-medium text-white">Random/Observations</div>
      <div className="p-2 bg-cyan-500 font-medium text-white">Things to remember</div>
    </div>
    
    <div className="grid grid-cols-12 border-x border-b border-gray-300">
      <div className="col-span-3 border-r border-gray-300">
        <div className="grid grid-cols-1">
          <div className="p-2 bg-gray-100 font-medium border-b border-gray-300">Feeling</div>
          <div className="p-2">
            <input 
              type="text" 
              value={feelingScore} 
              onChange={(e) => setFeelingScore(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 text-sm"
              placeholder="1-5"
            />
          </div>
          <div className="p-2 bg-gray-100 font-medium border-y border-gray-300">Trading</div>
          <div className="p-2">
            <input 
              type="text" 
              value={tradingScore} 
              onChange={(e) => setTradingScore(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 text-sm"
              placeholder="1-5"
            />
          </div>
          <div className="p-2 bg-gray-100 font-medium border-y border-gray-300">Power</div>
          <div className="p-2">
            <input 
              type="text" 
              value={powerScore} 
              onChange={(e) => setPowerScore(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 text-sm"
              placeholder="1-5"
            />
          </div>
        </div>
      </div>
      <div className="col-span-3 border-r border-gray-300 p-2">
        <textarea 
          value={howFelt} 
          onChange={(e) => setHowFelt(e.target.value)}
          className="w-full h-full px-2 py-1 border border-gray-300 text-sm"
          rows={6}
        />
      </div>
      <div className="col-span-3 border-r border-gray-300 p-2">
        <textarea 
          value={random} 
          onChange={(e) => setRandom(e.target.value)}
          className="w-full h-full px-2 py-1 border border-gray-300 text-sm"
          rows={6}
        />
      </div>
      <div className="col-span-3 p-2">
        <textarea 
          value={remember} 
          onChange={(e) => setRemember(e.target.value)}
          className="w-full h-full px-2 py-1 border border-gray-300 text-sm"
          rows={6}
        />
      </div>
    </div>
  </div>
);

const FinalThoughts: React.FC<{value: string, onChange: (value: string) => void}> = ({value, onChange}) => (
  <div className="mb-4">
    <h3 className="font-medium text-sm bg-cyan-500 text-white py-2 px-4 mb-2 text-center">Final Daily Thoughts</h3>
    <textarea 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
      rows={3}
    />
  </div>
);

// Updated Trades component to display actual trades from database
const Trades: React.FC<{trades: Trade[], manualNotes: string, onChange: (value: string) => void}> = ({trades, manualNotes, onChange}) => (
  <div className="mb-4">
    <h3 className="font-medium text-sm bg-cyan-500 text-white py-2 px-4 mb-2 text-center">Trades</h3>
    
    {trades.length > 0 ? (
      <div className="mb-3">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Side</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entry</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exit</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PnL</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">R</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">System</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trades.map((trade) => (
                <tr key={trade.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap font-medium">{trade.symbol}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      trade.side === 'Buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {trade.side}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{trade.entry_price.toFixed(2)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {trade.close_price ? trade.close_price.toFixed(2) : '-'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{trade.quantity.toFixed(4)}</td>
                  <td className={`px-3 py-2 whitespace-nowrap font-medium ${
                    (trade.pnl || 0) > 0 ? 'text-green-600' : 
                    (trade.pnl || 0) < 0 ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {trade.pnl ? `$${trade.pnl.toFixed(2)}` : '-'}
                  </td>
                  <td className={`px-3 py-2 whitespace-nowrap font-medium ${
                    (trade.finish_r || 0) > 0 ? 'text-green-600' : 
                    (trade.finish_r || 0) < 0 ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {trade.finish_r ? `${trade.finish_r.toFixed(2)}R` : '-'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{trade.system_id || '-'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      trade.status === 'open' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {trade.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ) : (
      <div className="mb-3 p-4 bg-gray-50 border border-gray-200 rounded-md text-center text-gray-500">
        No trades found for this date
      </div>
    )}
    
    <div>
      <p className="text-sm text-gray-600 mb-2">Additional Trade Notes:</p>
      <textarea 
        value={manualNotes} 
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
        rows={2}
        placeholder="Add any additional notes about your trades here..."
      />
    </div>
  </div>
);

// Define the format of our journal entry in the database
interface JournalData {
  dailyProgramming: string;
  morningThoughts: string;
  tradFiOpen: string;
  news: string;
  options: string;
  bybitOI: string;
  bybitFunding: string;
  binanceOI: string;
  binanceFunding: string;
  
  // BTC fields
  btcStructure: string;
  btcFirst2H: string;
  btcSentiment15M: string;
  btcEmas15M: string;
  btcAtr15M: string;
  btcSentiment1H: string;
  btcMacd1H: string;
  btcScore: string;
  btcNotes: string;  // Added
  btcEntryChartUrl: string;  // Added
  btcExitChartUrl: string;  // Added
  btcDataChartUrl: string;  // Added
  
  // ETH fields
  ethStructure: string;
  ethFirst2H: string;
  ethSentiment15M: string;
  ethEmas15M: string;
  ethAtr15M: string;
  ethSentiment1H: string;
  ethMacd1H: string;
  ethScore: string;
  ethNotes: string;  // Added
  ethEntryChartUrl: string;  // Added
  ethExitChartUrl: string;  // Added
  ethDataChartUrl: string;  // Added
  
  // SOL fields
  solStructure: string;
  solFirst2H: string;
  solSentiment15M: string;
  solEmas15M: string;
  solAtr15M: string;
  solSentiment1H: string;
  solMacd1H: string;
  solScore: string;
  solNotes: string;  // Added
  solEntryChartUrl: string;  // Added
  solExitChartUrl: string;  // Added
  solDataChartUrl: string;  // Added
  
  // BNB fields
  bnbStructure: string;
  bnbFirst2H: string;
  bnbSentiment15M: string;
  bnbEmas15M: string;
  bnbAtr15M: string;
  bnbSentiment1H: string;
  bnbMacd1H: string;
  bnbScore: string;
  bnbNotes: string;  // Added
  bnbEntryChartUrl: string;  // Added
  bnbExitChartUrl: string;  // Added
  bnbDataChartUrl: string;  // Added
  
  health: string;
  total: string;
  afterThoughts: string;
  tradeReview: string;
  mistakes: string;
  winsLearns: string;
  solutions: string;
  feelingScore: string;
  tradingScore: string;
  powerScore: string;
  howFelt: string;
  random: string;
  remember: string;
  finalThoughts: string;
  trades: string;
}

// Main component
const TradingJournal: React.FC = () => {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [hasPrevious, setHasPrevious] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const [dailyTrades, setDailyTrades] = useState<Trade[]>([]); // Added to store trades
  
  // State for expanded/collapsed coin sections
  const [expandedCoins, setExpandedCoins] = useState<Record<string, boolean>>({
    BTC: false,
    ETH: false,
    SOL: false,
    BNB: false
  });

  // Toggle expansion of a coin section
  const toggleCoinExpand = (coin: string) => {
    setExpandedCoins(prev => ({
      ...prev,
      [coin]: !prev[coin]
    }));
  };

  // State for all journal sections
  const [journalData, setJournalData] = useState<JournalData>({
    dailyProgramming: '',
    morningThoughts: '',
    tradFiOpen: '',
    news: '',
    options: '',
    bybitOI: '',
    bybitFunding: '',
    binanceOI: '',
    binanceFunding: '',
    
    btcStructure: '',
    btcFirst2H: '',
    btcSentiment15M: '',
    btcEmas15M: '',
    btcAtr15M: '',
    btcSentiment1H: '',
    btcMacd1H: '',
    btcScore: '',
    btcNotes: '',  // Added
    btcEntryChartUrl: '',  // Added
    btcExitChartUrl: '',  // Added
    btcDataChartUrl: '',  // Added
    
    ethStructure: '',
    ethFirst2H: '',
    ethSentiment15M: '',
    ethEmas15M: '',
    ethAtr15M: '',
    ethSentiment1H: '',
    ethMacd1H: '',
    ethScore: '',
    ethNotes: '',  // Added
    ethEntryChartUrl: '',  // Added
    ethExitChartUrl: '',  // Added
    ethDataChartUrl: '',  // Added
    
    solStructure: '',
    solFirst2H: '',
    solSentiment15M: '',
    solEmas15M: '',
    solAtr15M: '',
    solSentiment1H: '',
    solMacd1H: '',
    solScore: '',
    solNotes: '',  // Added
    solEntryChartUrl: '',  // Added
    solExitChartUrl: '',  // Added
    solDataChartUrl: '',  // Added
    
    bnbStructure: '',
    bnbFirst2H: '',
    bnbSentiment15M: '',
    bnbEmas15M: '',
    bnbAtr15M: '',
    bnbSentiment1H: '',
    bnbMacd1H: '',
    bnbScore: '',
    bnbNotes: '',  // Added
    bnbEntryChartUrl: '',  // Added
    bnbExitChartUrl: '',  // Added
    bnbDataChartUrl: '',  // Added
    
    health: '',
    total: '',
    afterThoughts: '',
    tradeReview: '',
    mistakes: '',
    winsLearns: '',
    solutions: '',
    feelingScore: '',
    tradingScore: '',
    powerScore: '',
    howFelt: '',
    random: '',
    remember: '',
    finalThoughts: '',
    trades: ''
  });

  // Helper to update a field in the journal data
  const updateField = (field: keyof JournalData, value: string) => {
    setJournalData(prev => ({ ...prev, [field]: value }));
  };

  // Fetch trades for the current journal date
  const fetchDailyTrades = async (entryDate: string) => {
    if (!user) return;

    try {
      // Convert entryDate to Date objects for comparison
      const startDate = new Date(entryDate);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(entryDate);
      endDate.setHours(23, 59, 59, 999);
      
      // Format as ISO strings for the query
      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();
      
      // Fetch trades that were opened on this date
      const { data: trades, error } = await supabase
        .from('manual_trades')
        .select('*')
        .eq('user_id', user.id)
        .gte('entry_date', startISO)
        .lte('entry_date', endISO)
        .order('entry_date', { ascending: false });
        
      if (error) throw error;
      
      setDailyTrades(trades || []);
    } catch (err: any) {
      console.error('Error fetching daily trades:', err);
    }
  };

  // Fetch journal entry for the current date
  const fetchJournalEntry = async (entryDate: string) => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // First fetch the journal entry
      const { data, error } = await supabase
        .from('trading_journal')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', entryDate);

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        // Parse the JSON entry data from the first result
        const parsedData = JSON.parse(data[0].entry);
        setJournalData(parsedData);
      } else {
        // Reset to empty state for a new entry
        setJournalData({
          dailyProgramming: '',
          morningThoughts: '',
          tradFiOpen: '',
          news: '',
          options: '',
          bybitOI: '',
          bybitFunding: '',
          binanceOI: '',
          binanceFunding: '',
          
          btcStructure: '',
          btcFirst2H: '',
          btcSentiment15M: '',
          btcEmas15M: '',
          btcAtr15M: '',
          btcSentiment1H: '',
          btcMacd1H: '',
          btcScore: '',
          btcNotes: '',  // Added
          btcEntryChartUrl: '',  // Added
          btcExitChartUrl: '',  // Added
          btcDataChartUrl: '',  // Added
          
          ethStructure: '',
          ethFirst2H: '',
          ethSentiment15M: '',
          ethEmas15M: '',
          ethAtr15M: '',
          ethSentiment1H: '',
          ethMacd1H: '',
          ethScore: '',
          ethNotes: '',  // Added
          ethEntryChartUrl: '',  // Added
          ethExitChartUrl: '',  // Added
          ethDataChartUrl: '',  // Added
          
          solStructure: '',
          solFirst2H: '',
          solSentiment15M: '',
          solEmas15M: '',
          solAtr15M: '',
          solSentiment1H: '',
          solMacd1H: '',
          solScore: '',
          solNotes: '',  // Added
          solEntryChartUrl: '',  // Added
          solExitChartUrl: '',  // Added
          solDataChartUrl: '',  // Added
          
          bnbStructure: '',
          bnbFirst2H: '',
          bnbSentiment15M: '',
          bnbEmas15M: '',
          bnbAtr15M: '',
          bnbSentiment1H: '',
          bnbMacd1H: '',
          bnbScore: '',
          bnbNotes: '',  // Added
          bnbEntryChartUrl: '',  // Added
          bnbExitChartUrl: '',  // Added
          bnbDataChartUrl: '',  // Added
          
          health: '',
          total: '',
          afterThoughts: '',
          tradeReview: '',
          mistakes: '',
          winsLearns: '',
          solutions: '',
          feelingScore: '',
          tradingScore: '',
          powerScore: '',
          howFelt: '',
          random: '',
          remember: '',
          finalThoughts: '',
          trades: ''
        });
      }

      // Then fetch trades for this date
      await fetchDailyTrades(entryDate);

      // Check if there's an entry for previous day
      const prevDate = format(subDays(parseISO(entryDate), 1), 'yyyy-MM-dd');
      const { count: prevCount } = await supabase
        .from('trading_journal')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('date', prevDate);
      
      setHasPrevious(!!prevCount);

      // Check if there's an entry for next day
      const nextDate = format(addDays(parseISO(entryDate), 1), 'yyyy-MM-dd');
      const { count: nextCount } = await supabase
        .from('trading_journal')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('date', nextDate);
      
      setHasNext(!!nextCount);
      
      // Don't allow navigation to future dates
      if (nextDate > format(new Date(), 'yyyy-MM-dd')) {
        setHasNext(false);
      }

    } catch (err: any) {
      console.error('Error fetching journal entry:', err);
      setError(err.message || 'Failed to fetch journal entry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJournalEntry(date);
  }, [supabase, user, date]);

  // Save journal entry
  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('trading_journal')
        .upsert({
          user_id: user.id,
          date: date,
          entry: JSON.stringify(journalData),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // Check if next day entry exists (might have been created in the meantime)
      const nextDate = format(addDays(parseISO(date), 1), 'yyyy-MM-dd');
      const { count: nextCount } = await supabase
        .from('trading_journal')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('date', nextDate);
      
      setHasNext(!!nextCount && nextDate <= format(new Date(), 'yyyy-MM-dd'));

    } catch (err: any) {
      console.error('Error saving journal entry:', err);
      setError(err.message || 'Failed to save journal entry');
    } finally {
      setSaving(false);
    }
  };

  // Navigate to previous entry
  const goToPreviousEntry = () => {
    if (hasPrevious) {
      const prevDate = format(subDays(parseISO(date), 1), 'yyyy-MM-dd');
      setDate(prevDate);
    }
  };

  // Navigate to next entry
  const goToNextEntry = () => {
    if (hasNext) {
      const nextDate = format(addDays(parseISO(date), 1), 'yyyy-MM-dd');
      setDate(nextDate);
    }
  };

  // Create a new entry for today
  const createNewEntry = () => {
    setDate(format(new Date(), 'yyyy-MM-dd'));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <Book className="mr-2" />
          Trading Journal
        </h1>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={createNewEntry}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center"
          >
            <PencilLine size={16} className="mr-2" />
            New Entry
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={goToPreviousEntry}
            disabled={!hasPrevious || loading}
            className={`px-4 py-2 rounded-md flex items-center ${
              hasPrevious 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            } transition-colors`}
          >
            <ChevronLeft size={16} className="mr-1" />
            Previous Entry
          </button>
          
          <div className="flex items-center">
            <Calendar size={18} className="text-blue-600 mr-2" />
            <label htmlFor="date" className="mr-2 text-sm font-medium text-gray-700">
              Journal Date:
            </label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          
          <button
            onClick={goToNextEntry}
            disabled={!hasNext || loading}
            className={`px-4 py-2 rounded-md flex items-center ${
              hasNext 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            } transition-colors`}
          >
            Next Entry
            <ChevronRight size={16} className="ml-1" />
          </button>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <RefreshCw size={32} className="text-blue-600 animate-spin" />
          </div>
        ) : (
          <div>
            <div className="text-center bg-gray-800 text-white py-3 text-xl font-bold mb-4">
              DAILY JOURNAL
            </div>

            <DailyProgramming 
              value={journalData.dailyProgramming} 
              onChange={(value) => updateField('dailyProgramming', value)}
            />
            
            <MorningThoughts
              value={journalData.morningThoughts}
              onChange={(value) => updateField('morningThoughts', value)}
            />

            <MarketAnalysis 
              tradFiOpen={journalData.tradFiOpen}
              setTradFiOpen={(value) => updateField('tradFiOpen', value)}
              news={journalData.news}
              setNews={(value) => updateField('news', value)}
              options={journalData.options}
              setOptions={(value) => updateField('options', value)}
              bybitOI={journalData.bybitOI}
              setBybitOI={(value) => updateField('bybitOI', value)}
              bybitFunding={journalData.bybitFunding}
              setBybitFunding={(value) => updateField('bybitFunding', value)}
              binanceOI={journalData.binanceOI}
              setBinanceOI={(value) => updateField('binanceOI', value)}
              binanceFunding={journalData.binanceFunding}
              setBinanceFunding={(value) => updateField('binanceFunding', value)}
            />

            <CoinAnalysis
              coin="BTC"
              structure={journalData.btcStructure}
              setStructure={(value) => updateField('btcStructure', value)}
              first2H={journalData.btcFirst2H}
              setFirst2H={(value) => updateField('btcFirst2H', value)}
              sentiment15M={journalData.btcSentiment15M}
              setSentiment15M={(value) => updateField('btcSentiment15M', value)}
              emas15M={journalData.btcEmas15M}
              setEmas15M={(value) => updateField('btcEmas15M', value)}
              atr15M={journalData.btcAtr15M}
              setAtr15M={(value) => updateField('btcAtr15M', value)}
              sentiment1H={journalData.btcSentiment1H}
              setSentiment1H={(value) => updateField('btcSentiment1H', value)}
              macd1H={journalData.btcMacd1H}
              setMacd1H={(value) => updateField('btcMacd1H', value)}
              score={journalData.btcScore}
              setScore={(value) => updateField('btcScore', value)}
              notes={journalData.btcNotes}
              setNotes={(value) => updateField('btcNotes', value)}
              entryChartUrl={journalData.btcEntryChartUrl}
              setEntryChartUrl={(value) => updateField('btcEntryChartUrl', value)}
              exitChartUrl={journalData.btcExitChartUrl}
              setExitChartUrl={(value) => updateField('btcExitChartUrl', value)}
              dataChartUrl={journalData.btcDataChartUrl}
              setDataChartUrl={(value) => updateField('btcDataChartUrl', value)}
              isExpanded={expandedCoins.BTC}
              toggleExpand={() => toggleCoinExpand('BTC')}
            />

            <CoinAnalysis
              coin="ETH"
              structure={journalData.ethStructure}
              setStructure={(value) => updateField('ethStructure', value)}
              first2H={journalData.ethFirst2H}
              setFirst2H={(value) => updateField('ethFirst2H', value)}
              sentiment15M={journalData.ethSentiment15M}
              setSentiment15M={(value) => updateField('ethSentiment15M', value)}
              emas15M={journalData.ethEmas15M}
              setEmas15M={(value) => updateField('ethEmas15M', value)}
              atr15M={journalData.ethAtr15M}
              setAtr15M={(value) => updateField('ethAtr15M', value)}
              sentiment1H={journalData.ethSentiment1H}
              setSentiment1H={(value) => updateField('ethSentiment1H', value)}
              macd1H={journalData.ethMacd1H}
              setMacd1H={(value) => updateField('ethMacd1H', value)}
              score={journalData.ethScore}
              setScore={(value) => updateField('ethScore', value)}
              notes={journalData.ethNotes}
              setNotes={(value) => updateField('ethNotes', value)}
              entryChartUrl={journalData.ethEntryChartUrl}
              setEntryChartUrl={(value) => updateField('ethEntryChartUrl', value)}
              exitChartUrl={journalData.ethExitChartUrl}
              setExitChartUrl={(value) => updateField('ethExitChartUrl', value)}
              dataChartUrl={journalData.ethDataChartUrl}
              setDataChartUrl={(value) => updateField('ethDataChartUrl', value)}
              isExpanded={expandedCoins.ETH}
              toggleExpand={() => toggleCoinExpand('ETH')}
            />

            <CoinAnalysis
              coin="SOL"
              structure={journalData.solStructure}
              setStructure={(value) => updateField('solStructure', value)}
              first2H={journalData.solFirst2H}
              setFirst2H={(value) => updateField('solFirst2H', value)}
              sentiment15M={journalData.solSentiment15M}
              setSentiment15M={(value) => updateField('solSentiment15M', value)}
              emas15M={journalData.solEmas15M}
              setEmas15M={(value) => updateField('solEmas15M', value)}
              atr15M={journalData.solAtr15M}
              setAtr15M={(value) => updateField('solAtr15M', value)}
              sentiment1H={journalData.solSentiment1H}
              setSentiment1H={(value) => updateField('solSentiment1H', value)}
              macd1H={journalData.solMacd1H}
              setMacd1H={(value) => updateField('solMacd1H', value)}
              score={journalData.solScore}
              setScore={(value) => updateField('solScore', value)}
              notes={journalData.solNotes}
              setNotes={(value) => updateField('solNotes', value)}
              entryChartUrl={journalData.solEntryChartUrl}
              setEntryChartUrl={(value) => updateField('solEntryChartUrl', value)}
              exitChartUrl={journalData.solExitChartUrl}
              setExitChartUrl={(value) => updateField('solExitChartUrl', value)}
              dataChartUrl={journalData.solDataChartUrl}
              setDataChartUrl={(value) => updateField('solDataChartUrl', value)}
              isExpanded={expandedCoins.SOL}
              toggleExpand={() => toggleCoinExpand('SOL')}
            />

            <CoinAnalysis
              coin="BNB"
              structure={journalData.bnbStructure}
              setStructure={(value) => updateField('bnbStructure', value)}
              first2H={journalData.bnbFirst2H}
              setFirst2H={(value) => updateField('bnbFirst2H', value)}
              sentiment15M={journalData.bnbSentiment15M}
              setSentiment15M={(value) => updateField('bnbSentiment15M', value)}
              emas15M={journalData.bnbEmas15M}
              setEmas15M={(value) => updateField('bnbEmas15M', value)}
              atr15M={journalData.bnbAtr15M}
              setAtr15M={(value) => updateField('bnbAtr15M', value)}
              sentiment1H={journalData.bnbSentiment1H}
              setSentiment1H={(value) => updateField('bnbSentiment1H', value)}
              macd1H={journalData.bnbMacd1H}
              setMacd1H={(value) => updateField('bnbMacd1H', value)}
              score={journalData.bnbScore}
              setScore={(value) => updateField('bnbScore', value)}
              notes={journalData.bnbNotes}
              setNotes={(value) => updateField('bnbNotes', value)}
              entryChartUrl={journalData.bnbEntryChartUrl}
              setEntryChartUrl={(value) => updateField('bnbEntryChartUrl', value)}
              exitChartUrl={journalData.bnbExitChartUrl}
              setExitChartUrl={(value) => updateField('bnbExitChartUrl', value)}
              dataChartUrl={journalData.bnbDataChartUrl}
              setDataChartUrl={(value) => updateField('bnbDataChartUrl', value)}
              isExpanded={expandedCoins.BNB}
              toggleExpand={() => toggleCoinExpand('BNB')}
            />

            <HealthMetrics
              value={journalData.health}
              onChange={(value) => updateField('health', value)}
            />

            <TotalMetrics
              value={journalData.total}
              onChange={(value) => updateField('total', value)}
            />

            <AfterThoughts
              value={journalData.afterThoughts}
              onChange={(value) => updateField('afterThoughts', value)}
            />

            <EndOfDayReview
              tradeReview={journalData.tradeReview}
              setTradeReview={(value) => updateField('tradeReview', value)}
              mistakes={journalData.mistakes}
              setMistakes={(value) => updateField('mistakes', value)}
              winsLearns={journalData.winsLearns}
              setWinsLearns={(value) => updateField('winsLearns', value)}
              solutions={journalData.solutions}
              setSolutions={(value) => updateField('solutions', value)}
            />

            <EmotionalScorecard
              feelingScore={journalData.feelingScore}
              setFeelingScore={(value) => updateField('feelingScore', value)}
              tradingScore={journalData.tradingScore}
              setTradingScore={(value) => updateField('tradingScore', value)}
              powerScore={journalData.powerScore}
              setPowerScore={(value) => updateField('powerScore', value)}
              howFelt={journalData.howFelt}
              setHowFelt={(value) => updateField('howFelt', value)}
              random={journalData.random}
              setRandom={(value) => updateField('random', value)}
              remember={journalData.remember}
              setRemember={(value) => updateField('remember', value)}
            />

            <FinalThoughts
              value={journalData.finalThoughts}
              onChange={(value) => updateField('finalThoughts', value)}
            />

            {/* Trades component with actual trade data */}
            <div className="mb-6">
              <h3 className="font-medium text-sm bg-cyan-500 text-white py-2 px-4 mb-2 text-center">Trades</h3>
              
              {dailyTrades.length > 0 ? (
                <div className="mb-3">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Side</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entry</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exit</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PnL</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">R</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">System</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {dailyTrades.map((trade) => (
                          <tr key={trade.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 whitespace-nowrap font-medium">{trade.symbol}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                trade.side === 'Buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {trade.side}
                              </span>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">{trade.entry_price.toFixed(2)}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {trade.close_price ? trade.close_price.toFixed(2) : '-'}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">{trade.quantity.toFixed(4)}</td>
                            <td className={`px-3 py-2 whitespace-nowrap font-medium ${
                              (trade.pnl || 0) > 0 ? 'text-green-600' : 
                              (trade.pnl || 0) < 0 ? 'text-red-600' : 'text-gray-500'
                            }`}>
                              {trade.pnl ? `$${trade.pnl.toFixed(2)}` : '-'}
                            </td>
                            <td className={`px-3 py-2 whitespace-nowrap font-medium ${
                              (trade.finish_r || 0) > 0 ? 'text-green-600' : 
                              (trade.finish_r || 0) < 0 ? 'text-red-600' : 'text-gray-500'
                            }`}>
                              {trade.finish_r ? `${trade.finish_r.toFixed(2)}R` : '-'}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">{trade.system_id || '-'}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                trade.status === 'open' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {trade.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : isToday(parseISO(date)) ? (
                <div className="mb-3 p-4 bg-gray-50 border border-gray-200 rounded-md text-center">
                  <div className="text-gray-500 mb-2">No trades found for today</div>
                  <a 
                    href="/manual-trades" 
                    className="inline-flex items-center text-blue-600 hover:text-blue-800"
                  >
                    <DollarSign size={16} className="mr-1" />
                    Go to manual trading page
                  </a>
                </div>
              ) : (
                <div className="mb-3 p-4 bg-gray-50 border border-gray-200 rounded-md text-center text-gray-500">
                  No trades found for this date
                </div>
              )}
              
              <div>
                <p className="text-sm text-gray-600 mb-2">Additional Trade Notes:</p>
                <textarea 
                  value={journalData.trades} 
                  onChange={(e) => updateField('trades', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
                  rows={2}
                  placeholder="Add any additional notes about your trades here..."
                />
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
              >
                {saving && <RefreshCw size={16} className="mr-2 animate-spin" />}
                <Save size={16} className="mr-2" />
                Save Journal Entry
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TradingJournal;
