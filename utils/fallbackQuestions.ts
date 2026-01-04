export interface FallbackQuestion {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
  level: 100 | 200 | 300 | 400;
  topic: string;
}

export const fallbackQuestions: FallbackQuestion[] = [
  // 100 LEVEL: INTRODUCTION TO FINANCE
  { id: 1, text: "Which financial statement reports a company's financial position at a point in time?", options: ["Income Statement", "Balance Sheet", "Cash Flow Statement", "Retained Earnings"], correctAnswer: 1, level: 100, topic: "General" },
  { id: 2, text: "The concept that 'a Naira today is worth more than a Naira tomorrow' is known as:", options: ["Inflation", "Time Value of Money", "Opportunity Cost", "Liquidity Preference"], correctAnswer: 1, level: 100, topic: "General" },
  { id: 3, text: "Which of the following is a primary market transaction?", options: ["Buying stock on the NSE", "Buying an IPO", "Selling shares to a friend", "Corporate buy-back"], correctAnswer: 1, level: 100, topic: "Financial Markets" },
  { id: 4, text: "What is the primary objective of a firm in financial management?", options: ["Profit Maximization", "Cost Minimization", "Shareholder Wealth Maximization", "Tax Evasion"], correctAnswer: 2, level: 100, topic: "General" },
  { id: 5, text: "The ratio of Current Assets to Current Liabilities is known as:", options: ["Quick Ratio", "Current Ratio", "Debt Ratio", "Profitability Ratio"], correctAnswer: 1, level: 100, topic: "Ratio Analysis" },
  { id: 6, text: "Which entity regulates the Nigerian capital market?", options: ["Central Bank of Nigeria (CBN)", "Security and Exchange Commission (SEC)", "Federal Ministry of Finance", "Standard Organization of Nigeria"], correctAnswer: 1, level: 100, topic: "Financial Markets" },
  { id: 7, text: "Compound interest is calculated on:", options: ["Principal only", "Accrued interest only", "Principal and accumulated interest", "None of the above"], correctAnswer: 2, level: 100, topic: "General" },
  { id: 8, text: "Which of these is considered a 'Paper Asset'?", options: ["Real Estate", "Gold", "Stocks", "Machinery"], correctAnswer: 2, level: 100, topic: "General" },
  { id: 9, text: "A market where long-term debt and equity are traded is the:", options: ["Money Market", "Capital Market", "Commodity Market", "Black Market"], correctAnswer: 1, level: 100, topic: "Financial Markets" },
  { id: 10, text: "What does 'ROI' stand for?", options: ["Rate Of Interest", "Return On Investment", "Revenue Of Industry", "Ratio Of Income"], correctAnswer: 1, level: 100, topic: "General" },

  // 200 LEVEL: CORPORATE FINANCE & ACCOUNTING
  { id: 11, text: "Net Present Value (NPV) is positive when:", options: ["IRR > Cost of Capital", "IRR < Cost of Capital", "Cost of Capital = 0", "Cash inflows are zero"], correctAnswer: 0, level: 200, topic: "Capital Budgeting" },
  { id: 12, text: "Which capital budgeting technique considers the Time Value of Money?", options: ["Payback Period", "Accounting Rate of Return", "Profitability Index", "Average Return"], correctAnswer: 2, level: 200, topic: "Capital Budgeting" },
  { id: 13, text: "Working capital management involves managing:", options: ["Long term assets", "Shareholder equity", "Short term assets and liabilities", "Tax liabilities"], correctAnswer: 2, level: 200, topic: "Working Capital" },
  { id: 14, text: "Operating leverage measures the effect of fixed costs on:", options: ["EBIT", "EPS", "Net Income", "Sales"], correctAnswer: 0, level: 200, topic: "Leverage" },
  { id: 15, text: "What is 'WACC' in corporate finance?", options: ["Weighted Average Cost of Capital", "Weekly Average Cash Collection", "Western African Currency Code", "Weighted Asset Credit Cost"], correctAnswer: 0, level: 200, topic: "Cost of Capital" },
  { id: 16, text: "The mix of a firm's permanent long-term financing is called:", options: ["Financial structure", "Capital structure", "Asset structure", "Owner structure"], correctAnswer: 1, level: 200, topic: "Capital Structure" },
  { id: 17, text: "Modigliani-Miller Theorem suggests that in a perfect market, capital structure is:", options: ["Extremely important", "Irrelevant to firm value", "The only thing that matters", "Dependent on tax"], correctAnswer: 1, level: 200, topic: "Capital Structure" },
  { id: 18, text: "The point where a project's NPV is zero is the:", options: ["Break-even point", "Optimal point", "Internal Rate of Return (IRR)", "Profitability threshold"], correctAnswer: 2, level: 200, topic: "Capital Budgeting" },
  { id: 19, text: "Inventory turnover is a measure of:", options: ["Liquidity", "Efficiency", "Profitability", "Leverage"], correctAnswer: 1, level: 200, topic: "Ratio Analysis" },
  { id: 20, text: "Agency problem arises due to conflict of interest between:", options: ["Bankers and customers", "Managers and Shareholders", "Government and Firms", "Suppliers and Buyers"], correctAnswer: 1, level: 200, topic: "Corporate Governance" },

  // 300 LEVEL: INVESTMENTS & FINANCIAL ANALYSIS
  { id: 21, text: "Systematic risk is also known as:", options: ["Diversifiable risk", "Market risk", "Unique risk", "Asset risk"], correctAnswer: 1, level: 300, topic: "Risk & Return" },
  { id: 22, text: "A stock's beta measures its:", options: ["Total risk", "Sensitivity to market movements", "Dividend yield", "Earnings growth"], correctAnswer: 1, level: 300, topic: "Risk & Return" },
  { id: 23, text: "According to CAPM, expected return is a function of:", options: ["Alpha", "Beta", "Gamma", "Standard Deviation"], correctAnswer: 1, level: 300, topic: "Investments" },
  { id: 24, text: "The 'Efficient Frontier' represents portfolios with:", options: ["Highest risk", "Lowest return", "Highest return for given risk", "Zero risk"], correctAnswer: 2, level: 300, topic: "Portfolio Theory" },
  { id: 25, text: "A bond sold at a price higher than its face value is at a:", options: ["Discount", "Premium", "Par", "Yield"], correctAnswer: 1, level: 300, topic: "Bonds" },
  { id: 26, text: "The inverse relationship between bond prices and interest rates is:", options: ["Direct", "Linear", "Inverse", "Irrelevant"], correctAnswer: 2, level: 300, topic: "Bonds" },
  { id: 27, text: "Technical analysis involves studying:", options: ["Balance sheets", "Market trends and price charts", "Management quality", "Macroeconomics"], correctAnswer: 1, level: 300, topic: "Investments" },
  { id: 28, text: "A portfolio with a beta of 1.0 is expected to:", options: ["Outperform the market", "Move exactly with the market", "Be risk-free", "Have zero return"], correctAnswer: 1, level: 300, topic: "Investments" },
  { id: 29, text: "The primary tool for diversifying risk in a portfolio is:", options: ["Leverage", "Asset Allocation", "Short Selling", "Margin Trading"], correctAnswer: 1, level: 300, topic: "Portfolio Theory" },
  { id: 30, text: "Intrinsic value is most associated with:", options: ["Fundamental Analysis", "Technical Analysis", "Efficient Market Hypothesis", "Speculation"], correctAnswer: 0, level: 300, topic: "Investments" },

  // 400 LEVEL: ADVANCED FINANCE & DERIVATIVES
  { id: 31, text: "A contract giving the right but not obligation to buy an asset is a:", options: ["Forward", "Future", "Call Option", "Put Option"], correctAnswer: 2, level: 400, topic: "Derivatives" },
  { id: 32, text: "Black-Scholes model is used primarily for pricing:", options: ["Bonds", "Stocks", "Options", "Real Estate"], correctAnswer: 2, level: 400, topic: "Derivatives" },
  { id: 33, text: "In a merger, if the acquirer pays more than fair value, the excess is:", options: ["Operating profit", "Goodwill", "Capital gain", "Badwill"], correctAnswer: 1, level: 400, topic: "M&A" },
  { id: 34, text: "A 'LBO' stands for:", options: ["Liquid Business Option", "Leveraged Buyout", "Large Bank Overdraft", "Long-term Bond Obligation"], correctAnswer: 1, level: 400, topic: "Corporate Finance" },
  { id: 35, text: "Exchange Rate Risk is also called:", options: ["Translation Risk", "Inflation Risk", "Political Risk", "Currency Risk"], correctAnswer: 3, level: 400, topic: "International Finance" },
  { id: 36, text: "The 'Golden Rule' of accumulation in growth theory is about maximizing:", options: ["Savings", "Consumption", "Investment", "Output"], correctAnswer: 1, level: 400, topic: "Advanced Theory" },
  { id: 37, text: "Arbitrage involves profiting from:", options: ["Long-term growth", "Market inefficiencies/price differences", "High interest rates", "Government subsidies"], correctAnswer: 1, level: 400, topic: "Investments" },
  { id: 38, text: "A currency swap involves exchanging:", options: ["Interest rates only", "Principal and interest in different currencies", "Equity for debt", "Physical cash"], correctAnswer: 1, level: 400, topic: "International Finance" },
  { id: 39, text: "Which derivative is traded on an exchange with daily marking-to-market?", options: ["Forward", "Future", "Swap", "OTC Option"], correctAnswer: 1, level: 400, topic: "Derivatives" },
  { id: 40, text: "Capital Flight refers to:", options: ["Government spending abroad", "Large scale exit of assets from a country", "Aviation industry investment", "Stock market crash"], correctAnswer: 1, level: 400, topic: "Macro-Finance" },

  // ... (Expanding further to 80 questions to provide a solid base for variety)
  { id: 41, text: "Which component of GDP is most volatile in Nigeria?", options: ["Consumption", "Investment", "Government Spending", "Net Exports"], correctAnswer: 1, level: 100, topic: "Economics" },
  { id: 42, text: "What is 'Fiat Money'?", options: ["Money backed by gold", "Money backed by silver", "Money with no intrinsic value, decreed by government", "Commodity money"], correctAnswer: 2, level: 100, topic: "Money & Banking" },
  { id: 43, text: "The 'Double Entry' system means:", options: ["Recording two items", "Recording once in two places", "Debit and Credit for every transaction", "Entry for two persons"], correctAnswer: 2, level: 100, topic: "Accounting" },
  { id: 44, text: "A 'Bull Market' refers to:", options: ["Rising prices", "Falling prices", "Sideways prices", "Market closure"], correctAnswer: 0, level: 100, topic: "General" },
  { id: 45, text: "Dividends are paid out of:", options: ["Capital", "Retained Earnings", "Sales Revenue", "Loans"], correctAnswer: 1, level: 100, topic: "General" },
  { id: 46, text: "The primary source of revenue for the Nigerian government is:", options: ["Agriculture", "Manufacturing", "Crude Oil", "Tourism"], correctAnswer: 2, level: 100, topic: "General" },
  { id: 47, text: "What is the 'Spread' in banking?", options: ["Bank expansion", "Difference between lending and deposit rates", "ATM fees", "Staff salary"], correctAnswer: 1, level: 100, topic: "Banking" },
  { id: 48, text: "Which of these is NOT a function of money?", options: ["Medium of exchange", "Store of value", "Measure of weight", "Standard of deferred payment"], correctAnswer: 2, level: 100, topic: "General" },
  { id: 49, text: "Macroeconomics deals with:", options: ["Single firms", "Aggregates of the economy", "Individual consumers", "Specific markets"], correctAnswer: 1, level: 100, topic: "Economics" },
  { id: 50, text: "Inflation is defined as:", options: ["Increase in price of one good", "Persistent rise in general price level", "Fall in value of stock", "Increase in population"], correctAnswer: 1, level: 100, topic: "General" },
  
  // 200+
  { id: 51, text: "The IRR of a project is the discount rate that makes NPV equal to:", options: ["One", "Negative", "Zero", "Positive"], correctAnswer: 2, level: 200, topic: "Capital Budgeting" },
  { id: 52, text: "Which ratio measures a firm's ability to meet long-term obligations?", options: ["Current Ratio", "Solvency Ratio", "Liquidity Ratio", "Operating Ratio"], correctAnswer: 1, level: 200, topic: "Ratio Analysis" },
  { id: 53, text: "Stock split increases:", options: ["Market cap", "Number of shares", "Total earnings", "Value per share"], correctAnswer: 1, level: 200, topic: "Equities" },
  { id: 54, text: "Zero-based budgeting starts from:", options: ["Previous year's budget", "Current inflation rate", "Zero base every period", "Departmental request"], correctAnswer: 2, level: 200, topic: "Management" },
  { id: 55, text: "Cost of debt is typically lower than cost of equity because:", options: ["Debt is riskier", "Interest is tax-deductible", "Dividends are high", "Bankers are friendly"], correctAnswer: 1, level: 200, topic: "Cost of Capital" },

  // 300+
  { id: 61, text: "Standard deviation measures:", options: ["Average return", "Expected return", "Total risk", "Beta"], correctAnswer: 2, level: 300, topic: "Risk" },
  { id: 62, text: "If a stock has a beta of 0.5, it is:", options: ["Twice as volatile as market", "Half as volatile as market", "Risk-free", "Uncorrelated"], correctAnswer: 1, level: 300, topic: "Investments" },
  { id: 63, text: "Financial analysts use DuPont analysis to break down:", options: ["Net Profit", "ROE", "Current Ratio", "Debt"], correctAnswer: 1, level: 300, topic: "Analysis" },
  { id: 64, text: "Growth stocks typically have:", options: ["Low P/E ratios", "High dividend yields", "High P/E ratios", "Low growth potential"], correctAnswer: 2, level: 300, topic: "Equities" },
  { id: 65, text: "An investor who 'Shorts' a stock expects the price to:", options: ["Rise", "Stay same", "Fall", "Double"], correctAnswer: 2, level: 300, topic: "Trading" },

  // 400+
  { id: 71, text: "The main objective of 'Hedging' is:", options: ["Profit maximization", "Risk reduction", "Tax avoidance", "Speculation"], correctAnswer: 1, level: 400, topic: "Risk Management" },
  { id: 72, text: "In a 'Vertical Merger', the firms are:", options: ["In the same industry", "At different stages of production", "Unrelated", "Competitors"], correctAnswer: 1, level: 400, topic: "M&A" },
  { id: 73, text: "Purchasing Power Parity (PPP) relates:", options: ["GDP and population", "Inflation and exchange rates", "Exports and imports", "Taxes and subsidies"], correctAnswer: 1, level: 400, topic: "International Finance" },
  { id: 74, text: "The 'J-Curve' effect explains the lag in:", options: ["Investment returns", "Trade balance after devaluation", "Population growth", "Inflation targets"], correctAnswer: 1, level: 400, topic: "International Finance" },
  { id: 75, text: "A 'Poison Pill' is a strategy used to:", options: ["Increase sales", "Prevent hostile takeovers", "Incentivize staff", "Lower tax"], correctAnswer: 1, level: 400, topic: "M&A" },
  { id: 76, text: "Game theory is often used in finance to analyze:", options: ["Accounting errors", "Oligopolistic competition", "Stock price history", "Tax laws"], correctAnswer: 1, level: 400, topic: "Advanced Theory" },
  { id: 77, text: "What is 'Moral Hazard' in finance?", options: ["Lying on tax forms", "Risk-taking knowing others bear the cost", "Giving to charity", "Buying risky stocks"], correctAnswer: 1, level: 400, topic: "Advanced Theory" },
  { id: 78, text: "Which model assumes constant growth in dividends forever?", options: ["CAPM", "Gordon Growth Model", "Black-Scholes", "DuPont"], correctAnswer: 1, level: 200, topic: "Valuation" },
  { id: 79, text: "A 'Repo' (Repurchase Agreement) is:", options: ["Long term bond", "Short term collateralized loan", "Equity swap", "Type of dividend"], correctAnswer: 1, level: 300, topic: "Financial Markets" },
  { id: 80, text: "Under the Capital Asset Pricing Model, the 'Market Risk Premium' is:", options: ["Rm", "Rf", "Rm - Rf", "Beta * Rm"], correctAnswer: 2, level: 300, topic: "Investments" },
];