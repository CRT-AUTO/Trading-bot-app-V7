import React, { useState, useEffect, useMemo } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { format, parseISO, startOfDay, startOfWeek, startOfMonth, startOfYear, subWeeks, subMonths, subYears } from 'date-fns';
import { Link } from 'react-router-dom';
import {
  RefreshCw,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  BarChart2,
  Download,
  Filter,
  Clock,
  LineChart,
  PieChart,
  ChevronDown,
  ChevronUp,
  BarChart
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TimeScale
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TimeScale
);

// Type for manual trade
type ManualTrade = {
  id: string;
  symbol: string;
  side: 'Buy' | 'Sell';
  entry_date: string;
  entry_price: number;
  close_price?: number | null;
  take_profit?: number | null;
  stop_loss?: number | null;
  quantity: number;
  finish_r?: number | null;
  finish_usd?: number | null;
  system_id?: string | null;
  status: 'open' | 'closed';
  open_time?: string | null;
  close_time?: string | null;
  total_trade_time?: string | null;
  total_trade_time_seconds?: number | null;
  pnl?: number | null;
  win_loss?: string | null;
  max_risk?: number | null;
  leverage?: number | null;
  trade_metrics?: any;
  deviation?: number | null;
};

// Types for aggregated metrics
type TimeframeMetrics = {
  totalR: number;
  tradeCount: number;
};

type SystemMetrics = {
  totalTrades: number;
  closedTrades: number;
  openTrades: number;
  sumR: number;
  avgR: number;
  winRate: number;
  profitFactor: number;
  ev: number;
  avgDuration: string;
};

type DayOfWeekMetrics = SystemMetrics & {
  day: string;
};

type HourOfDayMetrics = SystemMetrics & {
  hour: string;
};

type TickerMetrics = SystemMetrics & {
  ticker: string;
};

// Time frame options
const timeFrameOptions = [
  { value: 'all', label: 'All Time' },
  { value: '1w', label: 'Last Week' },
  { value: '1m', label: 'Last Month' },
  { value: '3m', label: 'Last 3 Months' },
  { value: '6m', label: 'Last 6 Months' },
  { value: '1y', label: 'Last Year' },
];

const ManualTradeAnalytics: React.FC = () => {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [trades, setTrades] = useState<ManualTrade[]>([]);
  const [timeFrame, setTimeFrame] = useState('all');
  const [symbolFilter, setSymbolFilter] = useState('all');
  const [systemFilter, setSystemFilter] = useState('all');
  const [showTickerBreakdown, setShowTickerBreakdown] = useState(false);
  const [showDayOfWeekBreakdown, setShowDayOfWeekBreakdown] = useState(false);
  const [showHourOfDayBreakdown, setShowHourOfDayBreakdown] = useState(false);
  const [uniqueSymbols, setUniqueSymbols] = useState<string[]>([]);
  const [uniqueSystems, setUniqueSystems] = useState<string[]>([]);
  const [equityCurveData, setEquityCurveData] = useState<any>(null);
  const [rMultipleDistribution, setRMultipleDistribution] = useState<any>(null);
  const [winLossPieData, setWinLossPieData] = useState<any>(null);
  const [hourlyPerformanceData, setHourlyPerformanceData] = useState<any>(null);
  const [dailyPerformanceData, setDailyPerformanceData] = useState<any>(null);

  // Fetch trades data
  useEffect(() => {
    const fetchTrades = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        // Determine date filter based on timeFrame
        let dateFilter;
        const now = new Date();
        
        if (timeFrame === '1w') {
          dateFilter = subWeeks(now, 1).toISOString();
        } else if (timeFrame === '1m') {
          dateFilter = subMonths(now, 1).toISOString();
        } else if (timeFrame === '3m') {
          dateFilter = subMonths(now, 3).toISOString();
        } else if (timeFrame === '6m') {
          dateFilter = subMonths(now, 6).toISOString();
        } else if (timeFrame === '1y') {
          dateFilter = subYears(now, 1).toISOString();
        } else {
          // All time - no date filter
          dateFilter = null;
        }
        
        let query = supabase
          .from('manual_trades')
          .select('*')
          .eq('user_id', user.id);
          
        if (dateFilter) {
          query = query.gte('entry_date', dateFilter);
        }
          
        const { data, error } = await query;
        
        if (error) throw error;
        
        setTrades(data || []);
        
        // Extract unique symbols and systems
        const symbols = [...new Set((data || []).map(t => t.symbol))];
        setUniqueSymbols(symbols);
        
        const systems = [...new Set((data || []).map(t => t.system_id).filter(Boolean))];
        setUniqueSystems(systems);
        
        // Generate chart data
        generateChartData(data || []);
        
      } catch (error) {
        console.error('Error fetching manual trades:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTrades();
  }, [supabase, user, timeFrame]);
  
  // Apply filters to trades
  const filteredTrades = useMemo(() => {
    return trades.filter(trade => {
      const matchesSymbol = symbolFilter === 'all' || trade.symbol === symbolFilter;
      const matchesSystem = systemFilter === 'all' || trade.system_id === systemFilter;
      return matchesSymbol && matchesSystem;
    });
  }, [trades, symbolFilter, systemFilter]);

  // Generate chart data
  const generateChartData = (trades: ManualTrade[]) => {
    // Equity curve data
    generateEquityCurveData(trades);
    
    // R Multiple distribution
    generateRMultipleDistribution(trades);
    
    // Win/Loss pie chart
    generateWinLossPieData(trades);
    
    // Hourly and daily performance
    generateTimePerformanceData(trades);
  };
  
  // Generate equity curve data
  const generateEquityCurveData = (trades: ManualTrade[]) => {
    if (trades.length === 0) {
      setEquityCurveData(null);
      return;
    }
    
    // Sort trades by date
    const sortedTrades = [...trades].sort((a, b) => 
      new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime()
    );
    
    let equity = 0;
    const dates: string[] = [];
    const equityPoints: number[] = [];
    const rMultiplePoints: number[] = [];
    
    // Calculate cumulative equity
    sortedTrades.forEach(trade => {
      if (trade.status === 'closed' && trade.pnl !== null) {
        equity += trade.pnl;
        dates.push(format(new Date(trade.entry_date), 'MM/dd/yy'));
        equityPoints.push(equity);
        
        // Add R-multiple point if available
        if (trade.finish_r !== null) {
          rMultiplePoints.push(trade.finish_r);
        } else {
          rMultiplePoints.push(0);
        }
      }
    });
    
    setEquityCurveData({
      labels: dates,
      datasets: [
        {
          label: 'Cumulative P/L (USDT)',
          data: equityPoints,
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.4,
          fill: true,
        }
      ]
    });
  };
  
  // Generate R-multiple distribution
  const generateRMultipleDistribution = (trades: ManualTrade[]) => {
    if (trades.length === 0) {
      setRMultipleDistribution(null);
      return;
    }
    
    // Filter out trades without finish_r
    const tradesWithR = trades.filter(trade => 
      trade.status === 'closed' && trade.finish_r !== null
    );
    
    if (tradesWithR.length === 0) {
      setRMultipleDistribution(null);
      return;
    }
    
    // Define R-multiple ranges
    const ranges = [
      { label: '< -3R', count: 0, color: 'rgba(255, 99, 132, 0.8)' }, // Deep red
      { label: '-3R to -2R', count: 0, color: 'rgba(255, 99, 132, 0.6)' }, // Red
      { label: '-2R to -1R', count: 0, color: 'rgba(255, 159, 64, 0.7)' }, // Orange
      { label: '-1R to 0R', count: 0, color: 'rgba(255, 205, 86, 0.7)' }, // Yellow
      { label: '0R to 1R', count: 0, color: 'rgba(75, 192, 192, 0.5)' }, // Light green
      { label: '1R to 2R', count: 0, color: 'rgba(54, 162, 235, 0.6)' }, // Light blue
      { label: '2R to 3R', count: 0, color: 'rgba(54, 162, 235, 0.8)' }, // Blue
      { label: '> 3R', count: 0, color: 'rgba(153, 102, 255, 0.7)' }, // Purple
    ];
    
    // Count trades in each range
    tradesWithR.forEach(trade => {
      const r = trade.finish_r as number;
      
      if (r < -3) ranges[0].count++;
      else if (r < -2) ranges[1].count++;
      else if (r < -1) ranges[2].count++;
      else if (r < 0) ranges[3].count++;
      else if (r < 1) ranges[4].count++;
      else if (r < 2) ranges[5].count++;
      else if (r < 3) ranges[6].count++;
      else ranges[7].count++;
    });
    
    setRMultipleDistribution({
      labels: ranges.map(r => r.label),
      datasets: [
        {
          label: 'Trade Count',
          data: ranges.map(r => r.count),
          backgroundColor: ranges.map(r => r.color),
          borderColor: 'rgba(255, 255, 255, 0.7)',
          borderWidth: 1,
        }
      ]
    });
  };
  
  // Generate win/loss pie chart
  const generateWinLossPieData = (trades: ManualTrade[]) => {
    // Filter to closed trades only
    const closedTrades = trades.filter(trade => trade.status === 'closed');
    
    if (closedTrades.length === 0) {
      setWinLossPieData(null);
      return;
    }
    
    // Count wins, losses, and break-evens
    const wins = closedTrades.filter(trade => (trade.pnl || 0) > 0).length;
    const losses = closedTrades.filter(trade => (trade.pnl || 0) < 0).length;
    const breakEven = closedTrades.filter(trade => (trade.pnl || 0) === 0).length;
    
    setWinLossPieData({
      labels: ['Wins', 'Losses', 'Break Even'],
      datasets: [
        {
          data: [wins, losses, breakEven],
          backgroundColor: [
            'rgba(75, 192, 192, 0.7)', // Green for wins
            'rgba(255, 99, 132, 0.7)', // Red for losses
            'rgba(201, 203, 207, 0.7)', // Grey for break even
          ],
          borderColor: [
            'rgba(75, 192, 192, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(201, 203, 207, 1)',
          ],
          borderWidth: 1,
        },
      ],
    });
  };
  
  // Generate time-based performance data (hourly and daily)
  const generateTimePerformanceData = (trades: ManualTrade[]) => {
    // Filter to closed trades only
    const closedTrades = trades.filter(trade => trade.status === 'closed');
    
    if (closedTrades.length === 0) {
      setHourlyPerformanceData(null);
      setDailyPerformanceData(null);
      return;
    }
    
    // Hourly performance
    const hourlyData = new Array(24).fill(0).map((_, i) => {
      return { hour: i, totalR: 0, tradeCount: 0 };
    });
    
    // Daily performance
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dailyData = dayNames.map(day => {
      return { day, totalR: 0, tradeCount: 0 };
    });
    
    // Populate data
    closedTrades.forEach(trade => {
      const date = new Date(trade.entry_date);
      const hour = date.getHours();
      const dayOfWeek = date.getDay();
      
      if (trade.finish_r !== null) {
        hourlyData[hour].totalR += trade.finish_r;
        hourlyData[hour].tradeCount++;
        
        dailyData[dayOfWeek].totalR += trade.finish_r;
        dailyData[dayOfWeek].tradeCount++;
      }
    });
    
    // Calculate averages and prepare chart data
    setHourlyPerformanceData({
      labels: hourlyData.map(d => `${d.hour}:00`),
      datasets: [
        {
          label: 'Avg R per Hour',
          data: hourlyData.map(d => d.tradeCount > 0 ? d.totalR / d.tradeCount : 0),
          backgroundColor: hourlyData.map(d => 
            d.tradeCount > 0 && d.totalR / d.tradeCount >= 0 
              ? 'rgba(75, 192, 192, 0.7)' // Green for positive
              : 'rgba(255, 99, 132, 0.7)' // Red for negative
          ),
          borderColor: 'rgba(255, 255, 255, 0.7)',
          borderWidth: 1,
        }
      ]
    });
    
    setDailyPerformanceData({
      labels: dayNames,
      datasets: [
        {
          label: 'Avg R per Day',
          data: dailyData.map(d => d.tradeCount > 0 ? d.totalR / d.tradeCount : 0),
          backgroundColor: dailyData.map(d => 
            d.tradeCount > 0 && d.totalR / d.tradeCount >= 0 
              ? 'rgba(75, 192, 192, 0.7)' // Green for positive
              : 'rgba(255, 99, 132, 0.7)' // Red for negative
          ),
          borderColor: 'rgba(255, 255, 255, 0.7)',
          borderWidth: 1,
        }
      ]
    });
  };
  
  // Calculate key metrics
  const calculateMetrics = useMemo(() => {
    const metrics = {
      todayR: 0,
      weeklyR: 0,
      monthlyR: 0,
      yearlyR: 0,
      winRate: 0,
      lossRate: 0,
      breakEvenRate: 0,
      averageWin: 0,
      averageLoss: 0,
      totalR: 0,
      ev: 0,
      profitFactor: 0,
      totalTrades: filteredTrades.length,
      totalWins: 0,
      totalLosses: 0,
      totalBreakEven: 0,
      openTrades: 0,
      maxDrawdown: 0,
      maxWinStreak: 0,
      maxLossStreak: 0,
      avgTradeDuration: '00:00:00'
    };
    
    if (filteredTrades.length === 0) {
      return metrics;
    }
    
    // Today's date
    const today = startOfDay(new Date());
    const startOfCurrentWeek = startOfWeek(new Date());
    const startOfCurrentMonth = startOfMonth(new Date());
    const startOfCurrentYear = startOfYear(new Date());
    
    // Calculated values
    let totalWinsR = 0;
    let totalLossesR = 0;
    let totalWinPnl = 0;
    let totalLossPnl = 0;
    let currentStreak = 0;
    let winStreak = 0;
    let lossStreak = 0;
    let totalTradeDurationSeconds = 0;
    let tradesWithDuration = 0;
    
    // Drawdown calculation
    let peak = 0;
    let currentDrawdown = 0;
    let maxDrawdown = 0;
    let cumulativeR = 0;
    
    // Process each trade
    filteredTrades.forEach(trade => {
      // Open/Closed trades count
      if (trade.status === 'open') {
        metrics.openTrades++;
        return; // Skip further processing for open trades
      }
      
      // Process R values
      if (trade.finish_r !== null) {
        const tradeDate = new Date(trade.entry_date);
        
        // Add to appropriate time period
        if (tradeDate >= today) {
          metrics.todayR += trade.finish_r;
        }
        if (tradeDate >= startOfCurrentWeek) {
          metrics.weeklyR += trade.finish_r;
        }
        if (tradeDate >= startOfCurrentMonth) {
          metrics.monthlyR += trade.finish_r;
        }
        if (tradeDate >= startOfCurrentYear) {
          metrics.yearlyR += trade.finish_r;
        }
        
        metrics.totalR += trade.finish_r;
        
        // Update win/loss counters
        if (trade.finish_r > 0) {
          metrics.totalWins++;
          totalWinsR += trade.finish_r;
          if (trade.pnl) totalWinPnl += trade.pnl;
          
          // Track win streak
          currentStreak = currentStreak > 0 ? currentStreak + 1 : 1;
          winStreak = Math.max(winStreak, currentStreak);
        } else if (trade.finish_r < 0) {
          metrics.totalLosses++;
          totalLossesR += Math.abs(trade.finish_r);
          if (trade.pnl) totalLossPnl += Math.abs(trade.pnl);
          
          // Track loss streak
          currentStreak = currentStreak < 0 ? currentStreak - 1 : -1;
          lossStreak = Math.max(lossStreak, Math.abs(currentStreak));
        } else {
          metrics.totalBreakEven++;
          // Reset streak on break-even
          currentStreak = 0;
        }
        
        // Calculate drawdown
        cumulativeR += trade.finish_r;
        if (cumulativeR > peak) {
          peak = cumulativeR;
        } else {
          currentDrawdown = peak - cumulativeR;
          maxDrawdown = Math.max(maxDrawdown, currentDrawdown);
        }
      }
      
      // Calculate trade duration
      if (trade.total_trade_time_seconds) {
        totalTradeDurationSeconds += trade.total_trade_time_seconds;
        tradesWithDuration++;
      } else if (trade.open_time && trade.close_time) {
        const durationSeconds = (new Date(trade.close_time).getTime() - new Date(trade.open_time).getTime()) / 1000;
        totalTradeDurationSeconds += durationSeconds;
        tradesWithDuration++;
      }
    });
    
    // Calculate derived metrics
    const closedTrades = filteredTrades.length - metrics.openTrades;
    
    if (closedTrades > 0) {
      metrics.winRate = metrics.totalWins / closedTrades;
      metrics.lossRate = metrics.totalLosses / closedTrades;
      metrics.breakEvenRate = metrics.totalBreakEven / closedTrades;
    }
    
    if (metrics.totalWins > 0) {
      metrics.averageWin = totalWinsR / metrics.totalWins;
    }
    
    if (metrics.totalLosses > 0) {
      metrics.averageLoss = totalLossesR / metrics.totalLosses;
    }
    
    // Expected value calculation
    metrics.ev = (metrics.winRate * metrics.averageWin) - (metrics.lossRate * metrics.averageLoss);
    
    // Profit factor
    metrics.profitFactor = totalLossPnl > 0 ? totalWinPnl / totalLossPnl : totalWinPnl > 0 ? Infinity : 0;
    
    // Max drawdown
    metrics.maxDrawdown = maxDrawdown;
    
    // Max streaks
    metrics.maxWinStreak = winStreak;
    metrics.maxLossStreak = lossStreak;
    
    // Average trade duration
    if (tradesWithDuration > 0) {
      const avgSeconds = Math.floor(totalTradeDurationSeconds / tradesWithDuration);
      const days = Math.floor(avgSeconds / 86400);
      const hours = Math.floor((avgSeconds % 86400) / 3600);
      const minutes = Math.floor((avgSeconds % 3600) / 60);
      metrics.avgTradeDuration = `${days.toString().padStart(2, '0')}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    return metrics;
  }, [filteredTrades]);

  // Calculate per-ticker breakdown
  const tickerBreakdown = useMemo(() => {
    const tickerMap = new Map<string, TickerMetrics>();
    
    filteredTrades.forEach(trade => {
      const symbol = trade.symbol;
      
      if (!tickerMap.has(symbol)) {
        tickerMap.set(symbol, {
          ticker: symbol,
          totalTrades: 0,
          closedTrades: 0,
          openTrades: 0,
          sumR: 0,
          avgR: 0,
          winRate: 0,
          profitFactor: 0,
          ev: 0,
          avgDuration: '00:00:00'
        });
      }
      
      const metrics = tickerMap.get(symbol)!;
      metrics.totalTrades++;
      
      if (trade.status === 'closed') {
        metrics.closedTrades++;
        
        if (trade.finish_r !== null) {
          metrics.sumR += trade.finish_r;
          
          // Update win/loss for profit factor
          if (trade.finish_r > 0) {
            metrics.winRate = (metrics.winRate * (metrics.closedTrades - 1) + 1) / metrics.closedTrades;
          } else {
            metrics.winRate = (metrics.winRate * (metrics.closedTrades - 1)) / metrics.closedTrades;
          }
        }
      } else {
        metrics.openTrades++;
      }
    });
    
    // Calculate derived metrics for each ticker
    tickerMap.forEach(metrics => {
      if (metrics.closedTrades > 0) {
        metrics.avgR = metrics.sumR / metrics.closedTrades;
        
        // EV calculation
        metrics.ev = (metrics.winRate * metrics.avgR) - ((1 - metrics.winRate) * metrics.avgR);
        
        // Profit factor
        const wins = filteredTrades
          .filter(t => t.symbol === metrics.ticker && t.status === 'closed' && (t.finish_r || 0) > 0)
          .reduce((sum, t) => sum + (t.pnl || 0), 0);
          
        const losses = filteredTrades
          .filter(t => t.symbol === metrics.ticker && t.status === 'closed' && (t.finish_r || 0) < 0)
          .reduce((sum, t) => sum + Math.abs(t.pnl || 0), 0);
          
        metrics.profitFactor = losses > 0 ? wins / losses : wins > 0 ? Infinity : 0;
        
        // Average duration
        const tradesWithDuration = filteredTrades.filter(
          t => t.symbol === metrics.ticker && t.status === 'closed' && t.total_trade_time_seconds
        );
        
        if (tradesWithDuration.length > 0) {
          const totalSeconds = tradesWithDuration.reduce((sum, t) => sum + (t.total_trade_time_seconds || 0), 0);
          const avgSeconds = Math.floor(totalSeconds / tradesWithDuration.length);
          const days = Math.floor(avgSeconds / 86400);
          const hours = Math.floor((avgSeconds % 86400) / 3600);
          const minutes = Math.floor((avgSeconds % 3600) / 60);
          metrics.avgDuration = `${days.toString().padStart(2, '0')}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
      }
    });
    
    return Array.from(tickerMap.values());
  }, [filteredTrades]);

  // Calculate day-of-week breakdown
  const dayOfWeekBreakdown = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayMap = new Map<string, DayOfWeekMetrics>();
    
    // Initialize map with all days
    days.forEach(day => {
      dayMap.set(day, {
        day,
        totalTrades: 0,
        closedTrades: 0,
        openTrades: 0,
        sumR: 0,
        avgR: 0,
        winRate: 0,
        profitFactor: 0,
        ev: 0,
        avgDuration: '00:00:00'
      });
    });
    
    filteredTrades.forEach(trade => {
      const date = new Date(trade.entry_date);
      const day = days[date.getDay()];
      const metrics = dayMap.get(day)!;
      
      metrics.totalTrades++;
      
      if (trade.status === 'closed') {
        metrics.closedTrades++;
        
        if (trade.finish_r !== null) {
          metrics.sumR += trade.finish_r;
          
          // Update win rate
          if (trade.finish_r > 0) {
            metrics.winRate = (metrics.winRate * (metrics.closedTrades - 1) + 1) / metrics.closedTrades;
          } else {
            metrics.winRate = (metrics.winRate * (metrics.closedTrades - 1)) / metrics.closedTrades;
          }
        }
      } else {
        metrics.openTrades++;
      }
    });
    
    // Calculate derived metrics
    dayMap.forEach(metrics => {
      if (metrics.closedTrades > 0) {
        metrics.avgR = metrics.sumR / metrics.closedTrades;
        
        // EV calculation
        metrics.ev = (metrics.winRate * metrics.avgR) - ((1 - metrics.winRate) * metrics.avgR);
        
        // Profit factor
        const wins = filteredTrades
          .filter(t => {
            const tradeDay = days[new Date(t.entry_date).getDay()];
            return tradeDay === metrics.day && t.status === 'closed' && (t.finish_r || 0) > 0;
          })
          .reduce((sum, t) => sum + (t.pnl || 0), 0);
          
        const losses = filteredTrades
          .filter(t => {
            const tradeDay = days[new Date(t.entry_date).getDay()];
            return tradeDay === metrics.day && t.status === 'closed' && (t.finish_r || 0) < 0;
          })
          .reduce((sum, t) => sum + Math.abs(t.pnl || 0), 0);
          
        metrics.profitFactor = losses > 0 ? wins / losses : wins > 0 ? Infinity : 0;
        
        // Average duration
        const tradesWithDuration = filteredTrades.filter(t => {
          const tradeDay = days[new Date(t.entry_date).getDay()];
          return tradeDay === metrics.day && t.status === 'closed' && t.total_trade_time_seconds;
        });
        
        if (tradesWithDuration.length > 0) {
          const totalSeconds = tradesWithDuration.reduce((sum, t) => sum + (t.total_trade_time_seconds || 0), 0);
          const avgSeconds = Math.floor(totalSeconds / tradesWithDuration.length);
          const day = Math.floor(avgSeconds / 86400);
          const hours = Math.floor((avgSeconds % 86400) / 3600);
          const minutes = Math.floor((avgSeconds % 3600) / 60);
          metrics.avgDuration = `${day.toString().padStart(2, '0')}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
      }
    });
    
    return Array.from(dayMap.values());
  }, [filteredTrades]);

  // Calculate hour-of-day breakdown
  const hourOfDayBreakdown = useMemo(() => {
    const hourMap = new Map<string, HourOfDayMetrics>();
    
    // Initialize map with all hours
    for (let i = 0; i < 24; i++) {
      const hourStr = `${i.toString().padStart(2, '0')}:00`;
      hourMap.set(hourStr, {
        hour: hourStr,
        totalTrades: 0,
        closedTrades: 0,
        openTrades: 0,
        sumR: 0,
        avgR: 0,
        winRate: 0,
        profitFactor: 0,
        ev: 0,
        avgDuration: '00:00:00'
      });
    }
    
    filteredTrades.forEach(trade => {
      const date = new Date(trade.entry_date);
      const hour = date.getHours();
      const hourStr = `${hour.toString().padStart(2, '0')}:00`;
      const metrics = hourMap.get(hourStr)!;
      
      metrics.totalTrades++;
      
      if (trade.status === 'closed') {
        metrics.closedTrades++;
        
        if (trade.finish_r !== null) {
          metrics.sumR += trade.finish_r;
          
          // Update win rate
          if (trade.finish_r > 0) {
            metrics.winRate = (metrics.winRate * (metrics.closedTrades - 1) + 1) / metrics.closedTrades;
          } else {
            metrics.winRate = (metrics.winRate * (metrics.closedTrades - 1)) / metrics.closedTrades;
          }
        }
      } else {
        metrics.openTrades++;
      }
    });
    
    // Calculate derived metrics
    hourMap.forEach(metrics => {
      if (metrics.closedTrades > 0) {
        metrics.avgR = metrics.sumR / metrics.closedTrades;
        
        // EV calculation
        metrics.ev = (metrics.winRate * metrics.avgR) - ((1 - metrics.winRate) * metrics.avgR);
        
        // Profit factor
        const hour = parseInt(metrics.hour.split(':')[0]);
        
        const wins = filteredTrades
          .filter(t => {
            const tradeHour = new Date(t.entry_date).getHours();
            return tradeHour === hour && t.status === 'closed' && (t.finish_r || 0) > 0;
          })
          .reduce((sum, t) => sum + (t.pnl || 0), 0);
          
        const losses = filteredTrades
          .filter(t => {
            const tradeHour = new Date(t.entry_date).getHours();
            return tradeHour === hour && t.status === 'closed' && (t.finish_r || 0) < 0;
          })
          .reduce((sum, t) => sum + Math.abs(t.pnl || 0), 0);
          
        metrics.profitFactor = losses > 0 ? wins / losses : wins > 0 ? Infinity : 0;
        
        // Average duration
        const tradesWithDuration = filteredTrades.filter(t => {
          const tradeHour = new Date(t.entry_date).getHours();
          return tradeHour === hour && t.status === 'closed' && t.total_trade_time_seconds;
        });
        
        if (tradesWithDuration.length > 0) {
          const totalSeconds = tradesWithDuration.reduce((sum, t) => sum + (t.total_trade_time_seconds || 0), 0);
          const avgSeconds = Math.floor(totalSeconds / tradesWithDuration.length);
          const day = Math.floor(avgSeconds / 86400);
          const hours = Math.floor((avgSeconds % 86400) / 3600);
          const minutes = Math.floor((avgSeconds % 3600) / 60);
          metrics.avgDuration = `${day.toString().padStart(2, '0')}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
      }
    });
    
    // Filter out hours with no trades
    return Array.from(hourMap.values()).filter(metric => metric.totalTrades > 0);
  }, [filteredTrades]);

  // Export to CSV function
  const exportToCsv = () => {
    if (filteredTrades.length === 0) return;
    
    // Create CSV content
    const headers = [
      'Date', 'Symbol', 'Side', 'Entry Price', 'Exit Price', 'Quantity', 
      'PnL', 'R Multiple', 'System', 'Max Risk', 'Status', 'Duration', 'Leverage'
    ];
    
    const rows = [
      headers.join(','),
      ...filteredTrades.map(trade => [
        format(new Date(trade.entry_date), 'yyyy-MM-dd HH:mm:ss'),
        trade.symbol,
        trade.side,
        trade.entry_price,
        trade.close_price || '',
        trade.quantity,
        trade.pnl || '',
        trade.finish_r || '',
        trade.system_id || '',
        trade.max_risk || '',
        trade.status,
        trade.total_trade_time || '',
        trade.leverage || ''
      ].join(','))
    ];
    
    const csvContent = rows.join('\n');
    
    // Create and download the CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `trade_analytics_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.click();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <BarChart2 className="mr-2" />
          Manual Trade Analytics
        </h1>
        
        <div className="flex space-x-2">
          <Link
            to="/manual-trades-history"
            className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors text-sm flex items-center"
          >
            <BarChart size={16} className="mr-1" />
            Trade History
          </Link>
          <button
            onClick={exportToCsv}
            className="px-3 py-1.5 bg-green-50 text-green-600 rounded-md hover:bg-green-100 transition-colors text-sm flex items-center"
            disabled={filteredTrades.length === 0}
          >
            <Download size={16} className="mr-1" />
            Export CSV
          </button>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Time Period</label>
            <select
              value={timeFrame}
              onChange={(e) => setTimeFrame(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm min-w-32"
            >
              {timeFrameOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">Symbol</label>
            <select
              value={symbolFilter}
              onChange={(e) => setSymbolFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm min-w-32"
            >
              <option value="all">All Symbols</option>
              {uniqueSymbols.map(symbol => (
                <option key={symbol} value={symbol}>{symbol}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">Trading System</label>
            <select
              value={systemFilter}
              onChange={(e) => setSystemFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm min-w-32"
            >
              <option value="all">All Systems</option>
              {uniqueSystems.map(system => (
                <option key={system} value={system}>{system}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <RefreshCw size={32} className="text-blue-600 animate-spin" />
        </div>
      ) : filteredTrades.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <BarChart size={48} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-lg font-semibold text-gray-700">No Trade Data Found</h2>
          <p className="text-gray-500 mt-2">
            No trades match your current filters. Try adjusting your filters or create some trades.
          </p>
        </div>
      ) : (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Performance Metrics */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-medium text-gray-500 flex items-center mb-3">
                <Calendar size={16} className="mr-2 text-blue-500" />
                Time-Based Performance
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-gray-500">Today's R</p>
                  <p className={`text-lg font-semibold ${calculateMetrics.todayR >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {calculateMetrics.todayR.toFixed(2)}R
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Weekly R</p>
                  <p className={`text-lg font-semibold ${calculateMetrics.weeklyR >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {calculateMetrics.weeklyR.toFixed(2)}R
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Monthly R</p>
                  <p className={`text-lg font-semibold ${calculateMetrics.monthlyR >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {calculateMetrics.monthlyR.toFixed(2)}R
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Yearly R</p>
                  <p className={`text-lg font-semibold ${calculateMetrics.yearlyR >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {calculateMetrics.yearlyR.toFixed(2)}R
                  </p>
                </div>
              </div>
            </div>
            
            {/* Win/Loss Metrics */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-medium text-gray-500 flex items-center mb-3">
                <Activity size={16} className="mr-2 text-blue-500" />
                Win/Loss Metrics
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-gray-500">Win Rate</p>
                  <p className="text-lg font-semibold text-blue-600">
                    {(calculateMetrics.winRate * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Loss Rate</p>
                  <p className="text-lg font-semibold text-red-600">
                    {(calculateMetrics.lossRate * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Average Win</p>
                  <p className="text-lg font-semibold text-green-600">
                    {calculateMetrics.averageWin.toFixed(2)}R
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Average Loss</p>
                  <p className="text-lg font-semibold text-red-600">
                    {calculateMetrics.averageLoss.toFixed(2)}R
                  </p>
                </div>
              </div>
            </div>
            
            {/* Risk Metrics */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-medium text-gray-500 flex items-center mb-3">
                <TrendingUp size={16} className="mr-2 text-blue-500" />
                Risk Metrics
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-gray-500">Profit Factor</p>
                  <p className="text-lg font-semibold text-blue-600">
                    {calculateMetrics.profitFactor === Infinity 
                      ? '∞' 
                      : calculateMetrics.profitFactor.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Expected Value</p>
                  <p className={`text-lg font-semibold ${calculateMetrics.ev >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {calculateMetrics.ev.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Max Drawdown</p>
                  <p className="text-lg font-semibold text-red-600">
                    {calculateMetrics.maxDrawdown.toFixed(2)}R
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total R</p>
                  <p className={`text-lg font-semibold ${calculateMetrics.totalR >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {calculateMetrics.totalR.toFixed(2)}R
                  </p>
                </div>
              </div>
            </div>
            
            {/* Trade Statistics */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-medium text-gray-500 flex items-center mb-3">
                <DollarSign size={16} className="mr-2 text-blue-500" />
                Trade Statistics
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-gray-500">Total Trades</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {calculateMetrics.totalTrades}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Open Trades</p>
                  <p className="text-lg font-semibold text-blue-600">
                    {calculateMetrics.openTrades}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Max Win Streak</p>
                  <p className="text-lg font-semibold text-green-600">
                    {calculateMetrics.maxWinStreak}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Max Loss Streak</p>
                  <p className="text-lg font-semibold text-red-600">
                    {calculateMetrics.maxLossStreak}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Additional Metrics */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h3 className="text-lg font-semibold border-b pb-2 mb-4">Detailed Metrics</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <p className="text-sm text-gray-500">Win/Loss Ratio</p>
                <p className="text-lg font-semibold">
                  {calculateMetrics.averageLoss > 0 
                    ? (calculateMetrics.averageWin / calculateMetrics.averageLoss).toFixed(2)
                    : calculateMetrics.averageWin > 0 ? '∞' : '0'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Wins</p>
                <p className="text-lg font-semibold text-green-600">{calculateMetrics.totalWins}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Losses</p>
                <p className="text-lg font-semibold text-red-600">{calculateMetrics.totalLosses}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Break-Even Trades</p>
                <p className="text-lg font-semibold text-gray-600">{calculateMetrics.totalBreakEven}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg Trade Duration</p>
                <p className="text-lg font-semibold text-gray-800">{calculateMetrics.avgTradeDuration}</p>
              </div>
            </div>
          </div>
          
          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Equity Curve */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold mb-4">Equity Curve (R-Multiple)</h3>
              <div className="h-80">
                {equityCurveData ? (
                  <Line
                    data={equityCurveData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top',
                        },
                      },
                      scales: {
                        x: {
                          title: {
                            display: true,
                            text: 'Date'
                          },
                          ticks: {
                            maxRotation: 45,
                            minRotation: 45
                          }
                        },
                        y: {
                          title: {
                            display: true,
                            text: 'Cumulative P/L (USDT)'
                          }
                        }
                      }
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">No data available for equity curve</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Win/Loss Distribution */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold mb-4">Win/Loss Distribution</h3>
              <div className="h-80">
                {winLossPieData ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="h-60 w-60">
                      <Pie
                        data={winLossPieData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: true,
                          plugins: {
                            legend: {
                              position: 'bottom',
                            },
                            tooltip: {
                              callbacks: {
                                label: function(context) {
                                  const label = context.label || '';
                                  const value = context.raw || 0;
                                  const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                                  const percentage = Math.round((value as number / total) * 100);
                                  return `${label}: ${value} (${percentage}%)`;
                                }
                              }
                            }
                          }
                        }}
                      />
                    </div>
                    <div className="mt-4 grid grid-cols-3 w-full gap-4 text-center">
                      <div>
                        <p className="text-xs text-gray-500">Wins</p>
                        <p className="text-lg font-semibold text-green-600">{calculateMetrics.totalWins}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Losses</p>
                        <p className="text-lg font-semibold text-red-600">{calculateMetrics.totalLosses}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Win Rate</p>
                        <p className="text-lg font-semibold text-blue-600">
                          {(calculateMetrics.winRate * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">No data available for win/loss distribution</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* R-Multiple Distribution */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold mb-4">R-Multiple Distribution</h3>
              <div className="h-80">
                {rMultipleDistribution ? (
                  <Bar
                    data={rMultipleDistribution}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false,
                        },
                      },
                      scales: {
                        x: {
                          title: {
                            display: true,
                            text: 'R-Multiple Range'
                          }
                        },
                        y: {
                          title: {
                            display: true,
                            text: 'Number of Trades'
                          },
                          beginAtZero: true
                        }
                      }
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">No data available for R-Multiple distribution</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Time-Based Performance (Hourly) */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold mb-4">Hourly Performance (Avg R)</h3>
              <div className="h-80">
                {hourlyPerformanceData ? (
                  <Bar
                    data={hourlyPerformanceData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false,
                        },
                      },
                      scales: {
                        x: {
                          title: {
                            display: true,
                            text: 'Hour of Day'
                          }
                        },
                        y: {
                          title: {
                            display: true,
                            text: 'Average R'
                          }
                        }
                      }
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">No data available for hourly performance</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Charts Row 3 */}
          <div className="grid grid-cols-1 gap-6 mb-6">
            {/* Day of Week Performance */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold mb-4">Day of Week Performance (Avg R)</h3>
              <div className="h-80">
                {dailyPerformanceData ? (
                  <Bar
                    data={dailyPerformanceData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false,
                        },
                      },
                      scales: {
                        x: {
                          title: {
                            display: true,
                            text: 'Day of Week'
                          }
                        },
                        y: {
                          title: {
                            display: true,
                            text: 'Average R'
                          }
                        }
                      }
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">No data available for daily performance</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Breakdown Tables */}
          <div className="space-y-6">
            {/* Per-Ticker Breakdown */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b flex justify-between items-center cursor-pointer" onClick={() => setShowTickerBreakdown(!showTickerBreakdown)}>
                <h3 className="text-lg font-semibold">Per-Ticker Breakdown</h3>
                {showTickerBreakdown ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
              
              {showTickerBreakdown && (
                <div className="p-4 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticker</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Trades</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Closed Trades</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Open Trades</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sum R</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg R</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Win Rate</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit Factor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">EV</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Duration</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tickerBreakdown.map((ticker) => (
                        <tr key={ticker.ticker}>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{ticker.ticker}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-900">{ticker.totalTrades}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-900">{ticker.closedTrades}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-900">{ticker.openTrades}</td>
                          <td className={`px-6 py-4 whitespace-nowrap font-medium ${ticker.sumR >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {ticker.sumR.toFixed(2)}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap font-medium ${ticker.avgR >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {ticker.avgR.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-blue-600 font-medium">
                            {(ticker.winRate * 100).toFixed(1)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                            {ticker.profitFactor === Infinity ? '∞' : ticker.profitFactor.toFixed(2)}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap font-medium ${ticker.ev >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {ticker.ev.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-900">{ticker.avgDuration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            {/* Day-of-Week Breakdown */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b flex justify-between items-center cursor-pointer" onClick={() => setShowDayOfWeekBreakdown(!showDayOfWeekBreakdown)}>
                <h3 className="text-lg font-semibold">Day-of-Week Breakdown</h3>
                {showDayOfWeekBreakdown ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
              
              {showDayOfWeekBreakdown && (
                <div className="p-4 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day of Week</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Trades</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Closed Trades</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Open Trades</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sum R</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg R</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Win Rate</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit Factor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">EV</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Duration</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {dayOfWeekBreakdown.map((day) => (
                        <tr key={day.day}>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{day.day}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-900">{day.totalTrades}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-900">{day.closedTrades}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-900">{day.openTrades}</td>
                          <td className={`px-6 py-4 whitespace-nowrap font-medium ${day.sumR >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {day.sumR.toFixed(2)}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap font-medium ${day.avgR >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {day.avgR.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-blue-600 font-medium">
                            {(day.winRate * 100).toFixed(1)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                            {day.profitFactor === Infinity ? '∞' : day.profitFactor.toFixed(2)}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap font-medium ${day.ev >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {day.ev.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-900">{day.avgDuration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            {/* Hour-of-Day Breakdown */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b flex justify-between items-center cursor-pointer" onClick={() => setShowHourOfDayBreakdown(!showHourOfDayBreakdown)}>
                <h3 className="text-lg font-semibold">Hour-of-Day Breakdown</h3>
                {showHourOfDayBreakdown ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
              
              {showHourOfDayBreakdown && (
                <div className="p-4 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hour of Day</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Trades</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Closed Trades</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Open Trades</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sum R</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg R</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Win Rate</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit Factor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">EV</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Duration</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {hourOfDayBreakdown.map((hour) => (
                        <tr key={hour.hour}>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{hour.hour}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-900">{hour.totalTrades}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-900">{hour.closedTrades}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-900">{hour.openTrades}</td>
                          <td className={`px-6 py-4 whitespace-nowrap font-medium ${hour.sumR >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {hour.sumR.toFixed(2)}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap font-medium ${hour.avgR >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {hour.avgR.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-blue-600 font-medium">
                            {(hour.winRate * 100).toFixed(1)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                            {hour.profitFactor === Infinity ? '∞' : hour.profitFactor.toFixed(2)}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap font-medium ${hour.ev >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {hour.ev.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-900">{hour.avgDuration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ManualTradeAnalytics;
