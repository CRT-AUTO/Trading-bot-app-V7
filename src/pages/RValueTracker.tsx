import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { format, parseISO, subDays, subMonths, startOfMonth, endOfMonth, startOfDay, endOfDay, getYear, getMonth, getDate } from 'date-fns';
import { 
  BarChart, 
  RefreshCw, 
  Calendar, 
  ChevronDown, 
  TrendingUp, 
  TrendingDown, 
  Filter,
  Clock,
  PieChart
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
  Legend 
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

type Trade = {
  id: string;
  symbol: string;
  side: string;
  entry_date: string;
  entry_price: number;
  close_time?: string;
  close_price?: number;
  finish_r?: number | null;
  system_id: string | null;
  status: string;
  win_loss?: string | null;
};

type TimeFrame = 'day' | 'month' | 'year';
type ViewMode = 'table' | 'chart';

type DailyRValue = {
  date: string;
  formattedDate: string;
  r: number;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
};

type MonthlyRValue = {
  month: string;
  formattedMonth: string;
  r: number;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
};

type YearlyRValue = {
  year: string;
  r: number;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
};

type SystemRValue = {
  system: string;
  r: number;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgR: number;
};

const RValueTracker: React.FC = () => {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters and view options
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('day');
  const [viewMode, setViewMode] = useState<ViewMode>('chart');
  const [systemFilter, setSystemFilter] = useState<string>('all');
  const [lookbackPeriod, setLookbackPeriod] = useState<number>(30); // days or months depending on timeFrame
  const [availableSystems, setAvailableSystems] = useState<string[]>([]);

  // Calculated data
  const [dailyRValues, setDailyRValues] = useState<DailyRValue[]>([]);
  const [monthlyRValues, setMonthlyRValues] = useState<MonthlyRValue[]>([]);
  const [yearlyRValues, setYearlyRValues] = useState<YearlyRValue[]>([]);
  const [systemRValues, setSystemRValues] = useState<SystemRValue[]>([]);
  
  // Summary metrics
  const [summaryMetrics, setSummaryMetrics] = useState({
    totalR: 0,
    todayR: 0,
    weeklyR: 0,
    monthlyR: 0,
    yearlyR: 0,
    winRate: 0,
    avgWinR: 0,
    avgLossR: 0,
    totalTrades: 0,
    profitFactor: 0,
    totalWins: 0,
    totalLosses: 0
  });

  // Fetch trades from Supabase
  useEffect(() => {
    const fetchTrades = async () => {
      if (!user) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch only closed trades with valid finish_r values
        const { data, error } = await supabase
          .from('manual_trades')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'closed')
          .not('finish_r', 'is', null)
          .order('entry_date', { ascending: false });
          
        if (error) throw error;
        
        setTrades(data || []);
        
        // Extract unique systems
        const systems = [...new Set(data?.map(trade => trade.system_id).filter(Boolean))];
        setAvailableSystems(['all', ...systems]);
        
        // Calculate R values for different time frames
        calculateRValues(data || []);
      } catch (err: any) {
        console.error('Error fetching trades:', err);
        setError(err.message || 'Failed to fetch trades');
      } finally {
        setLoading(false);
      }
    };

    fetchTrades();
  }, [user, supabase]);

  // Calculate R values when trades, timeFrame or filters change
  useEffect(() => {
    calculateRValues(trades);
  }, [trades, systemFilter]);

  // Calculate R values for different time frames
  const calculateRValues = (tradeData: Trade[]) => {
    if (!tradeData.length) return;
    
    // Apply system filter if not 'all'
    const filteredTrades = systemFilter === 'all' 
      ? tradeData 
      : tradeData.filter(trade => trade.system_id === systemFilter);

    // Group by day
    const byDay = new Map<string, { 
      r: number; 
      trades: number; 
      wins: number; 
      losses: number;
    }>();
    
    // Group by month
    const byMonth = new Map<string, { 
      r: number; 
      trades: number; 
      wins: number; 
      losses: number;
    }>();
    
    // Group by year
    const byYear = new Map<string, { 
      r: number; 
      trades: number; 
      wins: number; 
      losses: number;
    }>();

    // Group by system
    const bySystem = new Map<string, { 
      r: number; 
      trades: number; 
      wins: number; 
      losses: number;
    }>();

    // Summary variables
    let totalR = 0;
    let totalTrades = 0;
    let totalWins = 0;
    let totalLosses = 0;
    let totalWinR = 0;
    let totalLossR = 0;
    let todayR = 0;
    let weeklyR = 0;
    let monthlyR = 0;
    let yearlyR = 0;
    
    // Current date reference
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    const thisMonth = format(now, 'yyyy-MM');
    const thisYear = format(now, 'yyyy');
    const weekAgo = subDays(now, 7);
    
    // Process each trade
    filteredTrades.forEach(trade => {
      if (!trade.finish_r) return; // Skip trades without R values
      
      const closeDate = trade.close_time ? parseISO(trade.close_time) : parseISO(trade.entry_date);
      const day = format(closeDate, 'yyyy-MM-dd');
      const month = format(closeDate, 'yyyy-MM');
      const year = format(closeDate, 'yyyy');
      const system = trade.system_id || 'Unknown';
      
      // Update daily data
      if (!byDay.has(day)) {
        byDay.set(day, { r: 0, trades: 0, wins: 0, losses: 0 });
      }
      const dayData = byDay.get(day)!;
      dayData.r += trade.finish_r;
      dayData.trades += 1;
      if (trade.finish_r > 0) {
        dayData.wins += 1;
      } else if (trade.finish_r < 0) {
        dayData.losses += 1;
      }
      
      // Update monthly data
      if (!byMonth.has(month)) {
        byMonth.set(month, { r: 0, trades: 0, wins: 0, losses: 0 });
      }
      const monthData = byMonth.get(month)!;
      monthData.r += trade.finish_r;
      monthData.trades += 1;
      if (trade.finish_r > 0) {
        monthData.wins += 1;
      } else if (trade.finish_r < 0) {
        monthData.losses += 1;
      }
      
      // Update yearly data
      if (!byYear.has(year)) {
        byYear.set(year, { r: 0, trades: 0, wins: 0, losses: 0 });
      }
      const yearData = byYear.get(year)!;
      yearData.r += trade.finish_r;
      yearData.trades += 1;
      if (trade.finish_r > 0) {
        yearData.wins += 1;
      } else if (trade.finish_r < 0) {
        yearData.losses += 1;
      }
      
      // Update system data
      if (!bySystem.has(system)) {
        bySystem.set(system, { r: 0, trades: 0, wins: 0, losses: 0 });
      }
      const systemData = bySystem.get(system)!;
      systemData.r += trade.finish_r;
      systemData.trades += 1;
      if (trade.finish_r > 0) {
        systemData.wins += 1;
      } else if (trade.finish_r < 0) {
        systemData.losses += 1;
      }
      
      // Update summary metrics
      totalR += trade.finish_r;
      totalTrades += 1;
      
      if (trade.finish_r > 0) {
        totalWins += 1;
        totalWinR += trade.finish_r;
      } else if (trade.finish_r < 0) {
        totalLosses += 1;
        totalLossR += Math.abs(trade.finish_r);
      }
      
      // Today's R
      if (day === today) {
        todayR += trade.finish_r;
      }
      
      // Weekly R
      if (closeDate >= weekAgo) {
        weeklyR += trade.finish_r;
      }
      
      // Monthly R
      if (month === thisMonth) {
        monthlyR += trade.finish_r;
      }
      
      // Yearly R
      if (year === thisYear) {
        yearlyR += trade.finish_r;
      }
    });
    
    // Convert daily data to sorted array
    const dailyArray: DailyRValue[] = Array.from(byDay.entries())
      .map(([date, data]) => ({
        date,
        formattedDate: format(parseISO(date), 'MMM dd'),
        r: parseFloat(data.r.toFixed(2)),
        trades: data.trades,
        wins: data.wins,
        losses: data.losses,
        winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Convert monthly data to sorted array
    const monthlyArray: MonthlyRValue[] = Array.from(byMonth.entries())
      .map(([month, data]) => ({
        month,
        formattedMonth: format(parseISO(`${month}-01`), 'MMM yyyy'),
        r: parseFloat(data.r.toFixed(2)),
        trades: data.trades,
        wins: data.wins,
        losses: data.losses,
        winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
    
    // Convert yearly data to sorted array
    const yearlyArray: YearlyRValue[] = Array.from(byYear.entries())
      .map(([year, data]) => ({
        year,
        r: parseFloat(data.r.toFixed(2)),
        trades: data.trades,
        wins: data.wins,
        losses: data.losses,
        winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0
      }))
      .sort((a, b) => a.year.localeCompare(b.year));
    
    // Convert system data to array
    const systemArray: SystemRValue[] = Array.from(bySystem.entries())
      .map(([system, data]) => ({
        system,
        r: parseFloat(data.r.toFixed(2)),
        trades: data.trades,
        wins: data.wins,
        losses: data.losses,
        winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
        avgR: data.trades > 0 ? data.r / data.trades : 0
      }))
      .sort((a, b) => b.r - a.r); // Sort by total R, highest first
    
    // Update state with calculated values
    setDailyRValues(dailyArray);
    setMonthlyRValues(monthlyArray);
    setYearlyRValues(yearlyArray);
    setSystemRValues(systemArray);
    
    // Set summary metrics
    setSummaryMetrics({
      totalR: parseFloat(totalR.toFixed(2)),
      todayR: parseFloat(todayR.toFixed(2)),
      weeklyR: parseFloat(weeklyR.toFixed(2)),
      monthlyR: parseFloat(monthlyR.toFixed(2)),
      yearlyR: parseFloat(yearlyR.toFixed(2)),
      winRate: totalTrades > 0 ? parseFloat(((totalWins / totalTrades) * 100).toFixed(1)) : 0,
      avgWinR: totalWins > 0 ? parseFloat((totalWinR / totalWins).toFixed(2)) : 0,
      avgLossR: totalLosses > 0 ? parseFloat((totalLossR / totalLosses).toFixed(2)) : 0,
      totalTrades,
      profitFactor: totalLossR > 0 ? parseFloat((totalWinR / totalLossR).toFixed(2)) : totalWinR > 0 ? Infinity : 0,
      totalWins,
      totalLosses
    });
  };

  // Get data for the current time frame
  const getCurrentTimeFrameData = () => {
    switch(timeFrame) {
      case 'day':
        // Get the last [lookbackPeriod] days
        return dailyRValues
          .filter((_, index) => index >= Math.max(0, dailyRValues.length - lookbackPeriod))
          .reverse();
      case 'month':
        // Get the last [lookbackPeriod] months
        return monthlyRValues
          .filter((_, index) => index >= Math.max(0, monthlyRValues.length - lookbackPeriod))
          .reverse();
      case 'year':
        // Get all years
        return yearlyRValues.reverse();
      default:
        return [];
    }
  };

  // Prepare chart data
  const prepareChartData = () => {
    const data = getCurrentTimeFrameData();
    
    if (!data.length) return null;
    
    const labels = data.map(item => 
      timeFrame === 'day' ? (item as DailyRValue).formattedDate : 
      timeFrame === 'month' ? (item as MonthlyRValue).formattedMonth : 
      (item as YearlyRValue).year
    );
    
    const rValues = data.map(item => item.r);
    
    // Calculate cumulative R values
    const cumulativeR = rValues.reduce((acc: number[], curr, idx) => {
      const prevValue = idx > 0 ? acc[idx - 1] : 0;
      acc.push(parseFloat((prevValue + curr).toFixed(2)));
      return acc;
    }, []);
    
    return {
      labels,
      datasets: [
        {
          type: 'bar' as const,
          label: 'R Value',
          data: rValues,
          backgroundColor: rValues.map(value => value >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)'),
          borderColor: rValues.map(value => value >= 0 ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)'),
          borderWidth: 1,
          yAxisID: 'y'
        },
        {
          type: 'line' as const,
          label: 'Cumulative R',
          data: cumulativeR,
          borderColor: 'rgba(59, 130, 246, 1)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointRadius: 3,
          yAxisID: 'y1'
        }
      ]
    };
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    scales: {
      y: {
        type: 'linear' as const,
        position: 'left' as const,
        title: {
          display: true,
          text: 'R Value per Period'
        }
      },
      y1: {
        type: 'linear' as const,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Cumulative R'
        },
        grid: {
          drawOnChartArea: false,
        },
      },
      x: {
        title: {
          display: true,
          text: timeFrame === 'day' ? 'Day' : timeFrame === 'month' ? 'Month' : 'Year'
        }
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const datasetLabel = context.dataset.label || '';
            const value = context.parsed.y;
            
            if (datasetLabel === 'R Value') {
              const item = getCurrentTimeFrameData()[context.dataIndex];
              return [
                `${datasetLabel}: ${value.toFixed(2)}R`,
                `Trades: ${item.trades}`,
                `Win Rate: ${item.winRate.toFixed(1)}%`
              ];
            }
            return `${datasetLabel}: ${value.toFixed(2)}R`;
          }
        }
      }
    }
  };

  // Prepare system performance chart data
  const prepareSystemChartData = () => {
    if (!systemRValues.length) return null;
    
    return {
      labels: systemRValues.map(item => item.system),
      datasets: [
        {
          label: 'Total R',
          data: systemRValues.map(item => item.r),
          backgroundColor: systemRValues.map(item => item.r >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)'),
          borderColor: systemRValues.map(item => item.r >= 0 ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)'),
          borderWidth: 1,
        }
      ]
    };
  };

  // System chart options
  const systemChartOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const value = context.raw;
            const item = systemRValues[context.dataIndex];
            return [
              `Total R: ${value.toFixed(2)}`,
              `Trades: ${item.trades}`,
              `Win Rate: ${item.winRate.toFixed(1)}%`,
              `Average R: ${item.avgR.toFixed(2)}`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Total R'
        }
      }
    }
  };

  const chartData = prepareChartData();
  const systemChartData = prepareSystemChartData();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <BarChart className="mr-2" />
          R Value Tracker
        </h1>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <RefreshCw size={32} className="text-blue-600 animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center mb-2">
                <Calendar size={18} className="text-blue-600 mr-2" />
                <h3 className="text-sm font-medium text-gray-500">Today's R</h3>
              </div>
              <div className={`text-2xl font-bold ${summaryMetrics.todayR >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summaryMetrics.todayR.toFixed(2)}R
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center mb-2">
                <Calendar size={18} className="text-blue-600 mr-2" />
                <h3 className="text-sm font-medium text-gray-500">Weekly R</h3>
              </div>
              <div className={`text-2xl font-bold ${summaryMetrics.weeklyR >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summaryMetrics.weeklyR.toFixed(2)}R
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center mb-2">
                <Calendar size={18} className="text-blue-600 mr-2" />
                <h3 className="text-sm font-medium text-gray-500">Monthly R</h3>
              </div>
              <div className={`text-2xl font-bold ${summaryMetrics.monthlyR >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summaryMetrics.monthlyR.toFixed(2)}R
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center mb-2">
                <Calendar size={18} className="text-blue-600 mr-2" />
                <h3 className="text-sm font-medium text-gray-500">Yearly R</h3>
              </div>
              <div className={`text-2xl font-bold ${summaryMetrics.yearlyR >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summaryMetrics.yearlyR.toFixed(2)}R
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center mb-2">
                <TrendingUp size={18} className="text-blue-600 mr-2" />
                <h3 className="text-sm font-medium text-gray-500">Total R</h3>
              </div>
              <div className={`text-2xl font-bold ${summaryMetrics.totalR >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summaryMetrics.totalR.toFixed(2)}R
              </div>
            </div>
          </div>
          
          {/* Detailed Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
              <div className="grid grid-cols-2 gap-y-4">
                <div>
                  <p className="text-sm text-gray-500">Total Trades</p>
                  <p className="text-lg font-medium">{summaryMetrics.totalTrades}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Win Rate</p>
                  <p className="text-lg font-medium">{summaryMetrics.winRate.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Average Win</p>
                  <p className="text-lg font-medium text-green-600">{summaryMetrics.avgWinR.toFixed(2)}R</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Average Loss</p>
                  <p className="text-lg font-medium text-red-600">{summaryMetrics.avgLossR.toFixed(2)}R</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Profit Factor</p>
                  <p className="text-lg font-medium">{summaryMetrics.profitFactor === Infinity ? '∞' : summaryMetrics.profitFactor}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Expected Value</p>
                  <p className="text-lg font-medium">
                    {((summaryMetrics.winRate / 100) * summaryMetrics.avgWinR - 
                      ((100 - summaryMetrics.winRate) / 100) * summaryMetrics.avgLossR).toFixed(2)}R
                  </p>
                </div>
              </div>
            </div>
            
            {/* System Performance Chart */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold mb-4">System Performance</h3>
              <div className="h-64">
                {systemChartData ? (
                  <Bar 
                    data={systemChartData}
                    options={systemChartOptions}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">No system data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Chart Controls */}
          <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
            <div className="flex flex-wrap gap-4">
              {/* Time Frame Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time Frame</label>
                <div className="relative inline-block w-40">
                  <select
                    className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md appearance-none pr-8 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={timeFrame}
                    onChange={(e) => setTimeFrame(e.target.value as TimeFrame)}
                  >
                    <option value="day">Daily</option>
                    <option value="month">Monthly</option>
                    <option value="year">Yearly</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <ChevronDown size={16} className="text-gray-500" />
                  </div>
                </div>
              </div>
              
              {/* Lookback Period */}
              {timeFrame !== 'year' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lookback Period</label>
                  <div className="relative inline-block w-40">
                    <select
                      className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md appearance-none pr-8 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={lookbackPeriod}
                      onChange={(e) => setLookbackPeriod(parseInt(e.target.value))}
                    >
                      {timeFrame === 'day' ? (
                        <>
                          <option value="7">Last 7 days</option>
                          <option value="14">Last 14 days</option>
                          <option value="30">Last 30 days</option>
                          <option value="60">Last 60 days</option>
                          <option value="90">Last 90 days</option>
                        </>
                      ) : (
                        <>
                          <option value="3">Last 3 months</option>
                          <option value="6">Last 6 months</option>
                          <option value="12">Last 12 months</option>
                          <option value="24">Last 24 months</option>
                        </>
                      )}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <ChevronDown size={16} className="text-gray-500" />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Trading System Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trading System</label>
                <div className="relative inline-block w-40">
                  <select
                    className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md appearance-none pr-8 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={systemFilter}
                    onChange={(e) => setSystemFilter(e.target.value)}
                  >
                    <option value="all">All Systems</option>
                    {availableSystems
                      .filter(system => system !== 'all')
                      .map(system => (
                        <option key={system} value={system}>{system}</option>
                      ))
                    }
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <ChevronDown size={16} className="text-gray-500" />
                  </div>
                </div>
              </div>
              
              {/* View Mode Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">View Mode</label>
                <div className="flex border border-gray-300 rounded-md">
                  <button
                    className={`px-3 py-2 text-sm ${viewMode === 'chart' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                    onClick={() => setViewMode('chart')}
                  >
                    <PieChart size={16} className="inline mr-1" />
                    Chart
                  </button>
                  <button
                    className={`px-3 py-2 text-sm ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                    onClick={() => setViewMode('table')}
                  >
                    <Filter size={16} className="inline mr-1" />
                    Table
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Main Content - Chart or Table */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">
              {timeFrame === 'day' ? 'Daily' : timeFrame === 'month' ? 'Monthly' : 'Yearly'} R Value Tracker
            </h2>
            
            {viewMode === 'chart' ? (
              <div className="h-96">
                {chartData ? (
                  <Bar 
                    data={chartData}
                    options={chartOptions}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">No data available for the selected time frame</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {timeFrame === 'day' ? 'Date' : timeFrame === 'month' ? 'Month' : 'Year'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        R Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trades
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Wins
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Losses
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Win Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg R per Trade
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getCurrentTimeFrameData().map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {timeFrame === 'day' 
                            ? (item as DailyRValue).formattedDate 
                            : timeFrame === 'month' 
                              ? (item as MonthlyRValue).formattedMonth
                              : (item as YearlyRValue).year
                          }
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                          item.r >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {item.r.toFixed(2)}R
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.trades}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.wins}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.losses}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.winRate.toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {(item.r / item.trades).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    
                    {/* Totals row */}
                    <tr className="bg-gray-100 font-semibold">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        Total
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        summaryMetrics.totalR >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {summaryMetrics.totalR.toFixed(2)}R
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {summaryMetrics.totalTrades}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {summaryMetrics.totalWins}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {summaryMetrics.totalLosses}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {summaryMetrics.winRate.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {summaryMetrics.totalTrades > 0 ? (summaryMetrics.totalR / summaryMetrics.totalTrades).toFixed(2) : '0.00'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          {/* System Breakdown Table */}
          <div className="bg-white p-6 rounded-lg shadow-sm mt-6">
            <h2 className="text-xl font-semibold mb-4">
              System Performance Breakdown
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      System
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total R
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trades
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg R
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Win Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Profit Factor
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {systemRValues.map((system, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {system.system}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        system.r >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {system.r.toFixed(2)}R
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {system.trades}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        system.avgR >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {system.avgR.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {system.winRate.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {system.losses ? (system.wins / system.losses).toFixed(2) : system.wins ? '∞' : '0.00'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RValueTracker;
