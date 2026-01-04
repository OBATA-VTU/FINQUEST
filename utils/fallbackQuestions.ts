
// This file contains a larger, more robust set of fallback questions for the CBT practice test.
// These questions are used when the AI generation fails for any reason.

export interface FallbackQuestion {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
  level: 100 | 200 | 300 | 400;
  topic: string;
}

export const fallbackQuestions: FallbackQuestion[] = [
  // 100 Level - Introduction to Finance
  { id: 1, text: "What is the primary goal of financial management?", options: ["Maximize profits", "Maximize shareholder wealth", "Minimize costs", "Maximize sales"], correctAnswer: 1, level: 100, topic: "Intro to Finance" },
  { id: 2, text: "Which of the following is a current asset?", options: ["Land", "Machinery", "Inventory", "Bonds Payable"], correctAnswer: 2, level: 100, topic: "Financial Statements" },
  { id: 3, text: "The concept of 'Time Value of Money' suggests that...", options: ["A dollar today is worth more than a dollar tomorrow", "A dollar today is worth less than a dollar tomorrow", "A dollar's value is constant over time", "Inflation has no effect on money"], correctAnswer: 0, level: 100, topic: "Time Value of Money" },
  { id: 4, text: "Which financial statement shows a company's financial position at a specific point in time?", options: ["Income Statement", "Statement of Cash Flows", "Balance Sheet", "Statement of Retained Earnings"], correctAnswer: 2, level: 100, topic: "Financial Statements" },
  { id: 5, text: "Working Capital is defined as:", options: ["Total Assets - Total Liabilities", "Current Assets - Current Liabilities", "Fixed Assets - Long-term Debt", "Total Revenue - Total Expenses"], correctAnswer: 1, level: 100, topic: "Working Capital" },

  // 200 Level - Corporate Finance
  { id: 6, text: "What does NPV stand for in capital budgeting?", options: ["Net Profit Value", "Nominal Present Value", "Net Present Value", "Net Past Value"], correctAnswer: 2, level: 200, topic: "Capital Budgeting" },
  { id: 7, text: "If a project's NPV is positive, the project should be:", options: ["Rejected", "Accepted", "Re-evaluated", "Delayed"], correctAnswer: 1, level: 200, topic: "Capital Budgeting" },
  { id: 8, text: "The discount rate that makes the NPV of an investment zero is called the:", options: ["Payback Period", "Accounting Rate of Return", "Profitability Index", "Internal Rate of Return (IRR)"], correctAnswer: 3, level: 200, topic: "Capital Budgeting" },
  { id: 9, text: "Cost of capital is the:", options: ["Cost of issuing new stock", "Rate of return a firm must earn on its investments", "Interest rate on a company's debt", "Dividend paid to shareholders"], correctAnswer: 1, level: 200, topic: "Cost of Capital" },
  { id: 10, text: "Financial leverage refers to the use of:", options: ["Equity financing", "Retained earnings", "Borrowed funds", "Current assets"], correctAnswer: 2, level: 200, topic: "Leverage" },
  { id: 11, text: "A company's dividend policy is primarily concerned with:", options: ["How much to borrow", "How much to invest in new projects", "How much of its earnings to pay out to shareholders", "How to manage its cash flow"], correctAnswer: 2, level: 200, topic: "Dividend Policy" },

  // 300 Level - Investments
  { id: 12, text: "Systematic risk is also known as:", options: ["Diversifiable risk", "Unsystematic risk", "Market risk", "Specific risk"], correctAnswer: 2, level: 300, topic: "Risk and Return" },
  { id: 13, text: "The Capital Asset Pricing Model (CAPM) describes the relationship between:", options: ["Inflation and interest rates", "Systematic risk and expected return", "A company's assets and liabilities", "Dividend yield and stock price"], correctAnswer: 1, level: 300, topic: "CAPM" },
  { id: 14, text: "A stock's beta measures its:", options: ["Total risk", "Volatility relative to the market", "Dividend yield", "Liquidity"], correctAnswer: 1, level: 300, topic: "Risk and Return" },
  { id: 15, text: "The Efficient Market Hypothesis (EMH) suggests that:", options: ["Stock prices are always inflated", "It is easy to consistently beat the market", "Stock prices fully reflect all available information", "Past price movements can predict future prices"], correctAnswer: 2, level: 300, topic: "EMH" },
  { id: 16, text: "A bond's price will decrease when:", options: ["Market interest rates decrease", "The bond's coupon rate increases", "Market interest rates increase", "The bond reaches maturity"], correctAnswer: 2, level: 300, topic: "Bonds" },
  { id: 17, text: "What is a 'call option'?", options: ["An obligation to buy an asset", "A right to sell an asset", "An obligation to sell an asset", "A right to buy an asset"], correctAnswer: 3, level: 300, topic: "Derivatives" },
  { id: 18, text: "Diversification is most effective when security returns are:", options: ["Positively correlated", "Uncorrelated", "Negatively correlated", "Perfectly correlated"], correctAnswer: 2, level: 300, topic: "Portfolio Management" },

  // 400 Level - Advanced Topics
  { id: 19, text: "A merger in which a firm acquires a supplier or a customer is called a:", options: ["Horizontal merger", "Vertical merger", "Conglomerate merger", "Congeneric merger"], correctAnswer: 1, level: 400, topic: "Mergers & Acquisitions" },
  { id: 20, text: "In international finance, the 'spot exchange rate' refers to:", options: ["The exchange rate for future delivery", "The exchange rate for immediate delivery", "The average exchange rate over a period", "The exchange rate set by the central bank"], correctAnswer: 1, level: 400, topic: "International Finance" },
  { id: 21, text: "What is the primary purpose of a 'swap' in financial markets?", options: ["To speculate on currency movements", "To exchange a series of cash flows", "To buy stocks on margin", "To issue new corporate bonds"], correctAnswer: 1, level: 400, topic: "Derivatives" },
  { id: 22, text: "The Modigliani-Miller theorem, in a world without taxes, states that:", options: ["A firm's value is affected by its capital structure", "A firm's value is independent of its capital structure", "A firm should use 100% debt financing", "A firm should use 100% equity financing"], correctAnswer: 1, level: 400, topic: "Capital Structure" },
  { id: 23, text: "Black-Scholes is a model used for pricing:", options: ["Bonds", "Stocks", "Options", "Real Estate"], correctAnswer: 2, level: 400, topic: "Derivatives" },
  { id: 24, text: "What is 'venture capital'?", options: ["Long-term government bonds", "Financing for established, large corporations", "Financing for new, high-risk businesses", "Short-term loans between banks"], correctAnswer: 2, level: 400, topic: "Venture Capital" },
  { id: 25, text: "A 'leveraged buyout' (LBO) is the acquisition of another company using a significant amount of:", options: ["Equity", "Retained earnings", "Borrowed money (debt)", "Government grants"], correctAnswer: 2, level: 400, topic: "Mergers & Acquisitions" },
  
  // More questions to reach a decent number
  { id: 26, text: "The financial ratio that measures a company's ability to pay its short-term obligations is the:", options: ["Debt-to-Equity Ratio", "Current Ratio", "Price-to-Earnings Ratio", "Return on Equity"], correctAnswer: 1, level: 200, topic: "Ratio Analysis" },
  { id: 27, text: "An annuity is a series of:", options: ["Single, large payments", "Equal payments made at regular intervals", "Random, unscheduled payments", "Payments that increase over time"], correctAnswer: 1, level: 100, topic: "Time Value of Money" },
  { id: 28, text: "In portfolio theory, the 'optimal portfolio' is the one that:", options: ["Has the highest possible return", "Has zero risk", "Maximizes return for a given level of risk", "Is composed of only one stock"], correctAnswer: 2, level: 300, topic: "Portfolio Management" },
  { id: 29, text: "What is a 'junk bond'?", options: ["A bond issued by the government", "A bond with a very high credit rating", "A bond with a low credit rating and high risk", "A zero-coupon bond"], correctAnswer: 2, level: 300, topic: "Bonds" },
  { id: 30, text: "Hedging is a strategy designed to:", options: ["Maximize potential gains", "Reduce or eliminate risk", "Speculate on price movements", "Increase financial leverage"], correctAnswer: 1, level: 400, topic: "Risk Management" },
  { id: 31, text: "What is the formula for the Price-to-Earnings (P/E) Ratio?", options: ["Market Price per Share / Earnings per Share", "Earnings per Share / Market Price per Share", "Total Earnings / Number of Shares", "Market Capitalization / Total Revenue"], correctAnswer: 0, level: 200, topic: "Ratio Analysis" },
  { id: 32, text: "Which entity is primarily responsible for monetary policy in Nigeria?", options: ["The Nigerian Stock Exchange (NSE)", "The Securities and Exchange Commission (SEC)", "The Central Bank of Nigeria (CBN)", "The Ministry of Finance"], correctAnswer: 2, level: 100, topic: "Financial Markets" },
  { id: 33, text: "If a company issues a 2-for-1 stock split, an investor who owned 100 shares will now own:", options: ["50 shares at double the price", "100 shares at the same price", "200 shares at half the price", "200 shares at the same price"], correctAnswer: 2, level: 200, topic: "Corporate Actions" },
  { id: 34, text: "Which of these is considered the most liquid asset?", options: ["Real Estate", "Stocks", "Bonds", "Cash"], correctAnswer: 3, level: 100, topic: "Intro to Finance" },
  { id: 35, text: "The process of planning and managing a firm's long-term investments is known as:", options: ["Working Capital Management", "Capital Budgeting", "Capital Structure", "Dividend Policy"], correctAnswer: 1, level: 200, topic: "Capital Budgeting" },
  { id: 36, text: "A 'bear market' is characterized by:", options: ["Rising stock prices and investor optimism", "Falling stock prices and investor pessimism", "Stable stock prices", "High trading volume"], correctAnswer: 1, level: 300, topic: "Financial Markets" },
  { id: 37, text: "The risk that a company will be unable to make its debt payments is known as:", options: ["Market Risk", "Interest Rate Risk", "Credit Risk (or Default Risk)", "Liquidity Risk"], correctAnswer: 2, level: 200, topic: "Risk Management" },
  { id: 38, text: "Which of the following is a key feature of a common stock?", options: ["Fixed dividend payments", "Priority in liquidation", "Voting rights", "Maturity date"], correctAnswer: 2, level: 100, topic: "Stocks" },
  { id: 39, text: "The 'yield to maturity' (YTM) of a bond is:", options: ["The same as its coupon rate", "The total return an investor can expect if they hold the bond until it matures", "The annual interest payment", "The price of the bond in the secondary market"], correctAnswer: 1, level: 300, topic: "Bonds" },
  { id: 40, text: "Agency problem in corporate finance refers to the conflict of interest between:", options: ["The company and its customers", "The company and its suppliers", "The company's management and its shareholders", "The company and the government"], correctAnswer: 2, level: 200, topic: "Corporate Governance" },
  { id: 41, text: "What is an 'index fund'?", options: ["A fund that tries to beat the market with active stock picking", "A fund that aims to replicate the performance of a specific market index (e.g., S&P 500)", "A fund that invests only in government bonds", "A fund that uses high-risk derivatives"], correctAnswer: 1, level: 300, topic: "Investments" },
  { id: 42, text: "Which of the following describes a 'put option'?", options: ["The right to buy an asset at a specified price", "The obligation to buy an asset at a specified price", "The right to sell an asset at a specified price", "The obligation to sell an asset at a specified price"], correctAnswer: 2, level: 400, topic: "Derivatives" },
  { id: 43, text: "Depreciation is a non-cash expense that:", options: ["Increases a company's cash flow", "Reduces a company's taxable income", "Is paid out to shareholders", "Represents a new source of funding"], correctAnswer: 1, level: 200, topic: "Financial Statements" },
  { id: 44, text: "The 'money market' is the market for:", options: ["Long-term debt and equity", "Short-term borrowing and lending", "Foreign currencies", "Company stocks"], correctAnswer: 1, level: 100, topic: "Financial Markets" },
  { id: 45, text: "In project evaluation, if IRR is greater than the cost of capital, you should:", options: ["Reject the project", "Be indifferent about the project", "Accept the project", "Invest more in the project"], correctAnswer: 2, level: 200, topic: "Capital Budgeting" },
  { id: 46, text: "What does 'EBIT' stand for?", options: ["Earnings Before Inflation and Taxes", "Earnings Before Interest and Taxes", "Equity, Bonds, Interest, and Treasury", "Estimated Break-even Investment Time"], correctAnswer: 1, level: 200, topic: "Financial Statements" },
  { id: 47, text: "A portfolio that lies on the 'efficient frontier' is one that:", options: ["Provides the highest possible return", "Provides the lowest possible risk", "Provides the maximum return for its level of risk", "Is 100% invested in risk-free assets"], correctAnswer: 2, level: 300, topic: "Portfolio Management" },
  { id: 48, text: "The 'secondary market' is where:", options: ["New securities are issued for the first time", "Previously issued securities are traded among investors", "Only government securities are traded", "Companies borrow short-term funds"], correctAnswer: 1, level: 100, topic: "Financial Markets" },
  { id: 49, text: "Corporate governance is the system of rules and practices by which:", options: ["A company manages its daily operations", "A company is directed and controlled", "A company markets its products", "A company handles its human resources"], correctAnswer: 1, level: 400, topic: "Corporate Governance" },
  { id: 50, text: "A 'forward contract' is:", options: ["A standardized contract traded on an exchange", "A customized contract between two parties to buy or sell an asset at a specified price on a future date", "The same as a futures contract", "An option to buy an asset in the future"], correctAnswer: 1, level: 400, topic: "Derivatives" },
];
