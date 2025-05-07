/**
 * Calculate compound growth based on initial capital and profit percentage
 * @param initialCapital Initial capital amount
 * @param profitPercentage Profit percentage per trade
 * @param numberOfTrades Number of trades to compound
 * @returns Final capital amount after compounding
 */
export const calculateCompoundGrowth = (
  initialCapital: number,
  profitPercentage: number,
  numberOfTrades: number
): number => {
  // Convert percentage to multiplier (e.g., 5% -> 1.05)
  const profitMultiplier = 1 + (profitPercentage / 100);
  // Compound the capital
  return initialCapital * Math.pow(profitMultiplier, numberOfTrades);
};

/**
 * Calculate compounded profits with win rate consideration
 * @param initialCapital Initial capital amount
 * @param profitPercentage Profit percentage per winning trade
 * @param numberOfTrades Number of trades to compound
 * @param winRate Win rate percentage (0-100)
 * @param feePercentage Fee percentage per trade
 * @returns Final capital amount after compounding
 */
export const calculateCompoundedProfits = (
  initialCapital: number,
  profitPercentage: number,
  numberOfTrades: number,
  winRate: number,
  feePercentage: number
): number => {
  // Convert percentages to decimals
  const winRateDecimal = winRate / 100;
  const profitMultiplier = 1 + (profitPercentage / 100);
  const lossMultiplier = 0.95; // Assuming 5% loss per losing trade
  const feeMultiplier = 1 - (feePercentage / 100);

  let capital = initialCapital;

  // Iterate through each trade
  for (let i = 0; i < numberOfTrades; i++) {
    // Apply win or loss based on win rate
    if (Math.random() < winRateDecimal) {
      // Winning trade
      capital = capital * profitMultiplier * feeMultiplier;
    } else {
      // Losing trade
      capital = capital * lossMultiplier * feeMultiplier;
    }
  }

  return capital;
};

/**
 * Calculate compounded R multiple
 * @param initialCapital Initial capital amount
 * @param rMultiple R multiple per trade
 * @param numberOfTrades Number of trades
 * @param winRate Win rate percentage (0-100)
 * @returns Final capital amount after compounding
 */
export const calculateCompoundedRMultiple = (
  initialCapital: number,
  rMultiple: number,
  numberOfTrades: number,
  winRate: number
): number => {
  // Convert win rate to decimal
  const winRateDecimal = winRate / 100;
  
  // Calculate expected value per trade
  const expectedValue = (winRateDecimal * rMultiple) - (1 - winRateDecimal);
  
  // Compound the capital
  return initialCapital * Math.pow(1 + expectedValue, numberOfTrades);
};

/**
 * Generate a table of compound growth
 * @param initialCapital Initial capital amount
 * @param profitPercentage Profit percentage per winning trade
 * @param numberOfTrades Number of trades to compound
 * @param winRate Win rate percentage (0-100)
 * @param feePercentage Fee percentage per trade
 * @returns Array of capital values after each trade
 */
export const generateCompoundGrowthTable = (
  initialCapital: number,
  profitPercentage: number,
  numberOfTrades: number,
  winRate: number,
  feePercentage: number
): number[] => {
  // Convert percentages to decimals
  const winRateDecimal = winRate / 100;
  const profitMultiplier = 1 + (profitPercentage / 100);
  const lossMultiplier = 0.95; // Assuming 5% loss per losing trade
  const feeMultiplier = 1 - (feePercentage / 100);

  const results: number[] = [initialCapital];
  let capital = initialCapital;

  // Generate a set of random outcomes based on win rate
  const outcomes: boolean[] = [];
  for (let i = 0; i < numberOfTrades; i++) {
    outcomes.push(Math.random() < winRateDecimal);
  }

  // Iterate through each trade
  for (let i = 0; i < numberOfTrades; i++) {
    // Apply win or loss based on pre-determined outcomes
    if (outcomes[i]) {
      // Winning trade
      capital = capital * profitMultiplier * feeMultiplier;
    } else {
      // Losing trade
      capital = capital * lossMultiplier * feeMultiplier;
    }
    results.push(capital);
  }

  return results;
};

/**
 * Calculate position size for a compounding strategy
 * @param capital Available capital
 * @param entryPrice Entry price
 * @param stopLoss Stop loss price
 * @param riskPercentage Risk percentage of capital
 * @param direction Trade direction ('long' or 'short')
 * @returns Calculated position size
 */
export const calculateCompoundPositionSize = (
  capital: number,
  entryPrice: number,
  stopLoss: number,
  riskPercentage: number = 2,
  direction: 'long' | 'short' = 'long'
): number => {
  // Calculate risk amount
  const riskAmount = (capital * riskPercentage) / 100;
  
  // Calculate price difference
  const priceDifference = direction === 'long' 
    ? entryPrice - stopLoss 
    : stopLoss - entryPrice;

  if (priceDifference <= 0) {
    return 0; // Invalid stop loss for direction
  }
  
  // Calculate position size
  return riskAmount / priceDifference;
};

/**
 * Check if a new trade has overlapping stop loss zones with existing trades
 * @param existingTrades Array of existing trades
 * @param newEntryPrice Entry price of new trade
 * @param newStopLoss Stop loss price of new trade
 * @returns True if there is an overlap, false otherwise
 */
export const checkOverlappingStops = (
  existingTrades: any[],
  newEntryPrice: number,
  newStopLoss: number
): boolean => {
  // Determine new trade direction
  const newDirection = newEntryPrice > newStopLoss ? 'long' : 'short';
  
  // Check each existing trade for overlap
  return existingTrades.some(trade => {
    // Skip trades without proper entry/stop data
    if (!trade.entryPrice || !trade.stopLoss) return false;
    
    const existingDirection = trade.direction || 
      (trade.entryPrice > trade.stopLoss ? 'long' : 'short');
    
    // If trades have the same direction, check if the stop loss zones overlap
    if (existingDirection === newDirection) {
      if (newDirection === 'long') {
        // For long trades, overlap if new stop is between existing entry and stop
        return newStopLoss >= trade.stopLoss && newStopLoss <= trade.entryPrice;
      } else {
        // For short trades, overlap if new stop is between existing entry and stop
        return newStopLoss <= trade.stopLoss && newStopLoss >= trade.entryPrice;
      }
    }
    
    // If trades have opposite directions, no overlap in stop loss zones
    return false;
  });
};

/**
 * Calculate combined risk profile of multiple trades
 * @param trades Array of trades
 * @param availableCapital Available trading capital
 * @returns Combined risk profile
 */
export const calculateCombinedRiskProfile = (
  trades: any[],
  availableCapital: number
): { 
  totalRiskPercentage: number; 
  risksPerTrade: { tradeId: string; riskPercentage: number }[];
  isExceedingRiskLimit: boolean;
} => {
  const risksPerTrade: { tradeId: string; riskPercentage: number }[] = [];
  let totalRiskAmount = 0;

  // Calculate risk for each trade
  trades.forEach(trade => {
    if (trade.riskAmount) {
      const riskPercentage = (trade.riskAmount / availableCapital) * 100;
      risksPerTrade.push({
        tradeId: trade.tradeId,
        riskPercentage
      });
      totalRiskAmount += trade.riskAmount;
    }
  });

  const totalRiskPercentage = (totalRiskAmount / availableCapital) * 100;
  
  return {
    totalRiskPercentage,
    risksPerTrade,
    isExceedingRiskLimit: totalRiskPercentage > 2 // Assuming 2% is the risk limit
  };
};