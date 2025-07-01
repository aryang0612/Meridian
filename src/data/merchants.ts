import { MerchantPattern } from '../lib/types';

export const MERCHANT_PATTERNS: MerchantPattern[] = [
  // =============================================================================
  // FOOD & RESTAURANTS (High Confidence - Very Specific Patterns)
  // =============================================================================
  
  // Canadian Coffee Chains
  { pattern: /TIM\s*HORTONS?/i, merchant: 'Tim Hortons', category: 'Meals & Entertainment', confidence: 96 },
  { pattern: /TIMS\s*HORTONS?/i, merchant: 'Tim Hortons', category: 'Meals & Entertainment', confidence: 94 },
  { pattern: /STARBUCKS/i, merchant: 'Starbucks', category: 'Meals & Entertainment', confidence: 96 },
  { pattern: /SECOND\s*CUP/i, merchant: 'Second Cup', category: 'Meals & Entertainment', confidence: 95 },
  { pattern: /COUNTRY\s*STYLE/i, merchant: 'Country Style', category: 'Meals & Entertainment', confidence: 95 },
  
  // Fast Food Chains
  { pattern: /MCDONALD'?S/i, merchant: 'McDonalds', category: 'Meals & Entertainment', confidence: 96 },
  { pattern: /SUBWAY/i, merchant: 'Subway', category: 'Meals & Entertainment', confidence: 94 },
  { pattern: /BURGER\s*KING/i, merchant: 'Burger King', category: 'Meals & Entertainment', confidence: 95 },
  { pattern: /KFC/i, merchant: 'KFC', category: 'Meals & Entertainment', confidence: 95 },
  { pattern: /TACO\s*BELL/i, merchant: 'Taco Bell', category: 'Meals & Entertainment', confidence: 95 },
  { pattern: /A&W/i, merchant: 'A&W', category: 'Meals & Entertainment', confidence: 95 },
  { pattern: /HARVEY'?S/i, merchant: 'Harveys', category: 'Meals & Entertainment', confidence: 95 },
  
  // NEW: Specific A&W locations from training data
  { pattern: /A&W\s*1613/i, merchant: 'A&W', category: 'Meals & Entertainment', confidence: 96 },
  { pattern: /A&W\s*1393/i, merchant: 'A&W', category: 'Meals & Entertainment', confidence: 96 },
  { pattern: /A&W\s*STORE\s*1729/i, merchant: 'A&W', category: 'Meals & Entertainment', confidence: 96 },
  { pattern: /BONNYVILLE\s*A&W/i, merchant: 'A&W', category: 'Meals & Entertainment', confidence: 96 },
  
  // NEW: Wendy's locations from training data
  { pattern: /WENDYS?\s*6167/i, merchant: 'Wendys', category: 'Meals & Entertainment', confidence: 96 },
  { pattern: /WENDY'?S\s*LACOMBE/i, merchant: 'Wendys', category: 'Meals & Entertainment', confidence: 96 },
  
  // Canadian Restaurant Chains
  { pattern: /SWISS\s*CHALET/i, merchant: 'Swiss Chalet', category: 'Meals & Entertainment', confidence: 96 },
  { pattern: /BOSTON\s*PIZZA/i, merchant: 'Boston Pizza', category: 'Meals & Entertainment', confidence: 95 },
  { pattern: /EAST\s*SIDE\s*MARIO'?S/i, merchant: 'East Side Marios', category: 'Meals & Entertainment', confidence: 95 },
  { pattern: /KELSEY'?S/i, merchant: 'Kelseys', category: 'Meals & Entertainment', confidence: 95 },
  { pattern: /MONTANA'?S/i, merchant: 'Montanas', category: 'Meals & Entertainment', confidence: 95 },
  
  // NEW: Restaurant chains from training data
  { pattern: /THE\s*KEG/i, merchant: 'The Keg', category: 'Meals & Entertainment', confidence: 95 },
  { pattern: /THE\s*CANADIAN\s*BR/i, merchant: 'The Canadian Brewhouse', category: 'Meals & Entertainment', confidence: 94 },
  { pattern: /MR\s*MIKES\s*STEAKH/i, merchant: 'Mr. Mikes', category: 'Meals & Entertainment', confidence: 94 },
  { pattern: /OLIVE\s*GARDEN/i, merchant: 'Olive Garden', category: 'Meals & Entertainment', confidence: 95 },
  { pattern: /EARLS/i, merchant: 'Earls', category: 'Meals & Entertainment', confidence: 94 },
  
  // Pizza Chains
  { pattern: /PIZZA\s*HUT/i, merchant: 'Pizza Hut', category: 'Meals & Entertainment', confidence: 95 },
  { pattern: /DOMINO'?S/i, merchant: 'Dominos', category: 'Meals & Entertainment', confidence: 95 },
  { pattern: /PIZZA\s*PIZZA/i, merchant: 'Pizza Pizza', category: 'Meals & Entertainment', confidence: 95 },
  { pattern: /LITTLE\s*CAESARS/i, merchant: 'Little Caesars', category: 'Meals & Entertainment', confidence: 95 },
  
  // NEW: Pizza places from training data
  { pattern: /BUSTER'?S\s*PIZZA/i, merchant: 'Busters Pizza', category: 'Meals & Entertainment', confidence: 95 },
  { pattern: /NORTH\s*SIDE\s*PIZZ/i, merchant: 'North Side Pizza', category: 'Meals & Entertainment', confidence: 94 },
  
  // NEW: Dairy Queen locations from training data
  { pattern: /DAIRY\s*QUEEN/i, merchant: 'Dairy Queen', category: 'Meals & Entertainment', confidence: 95 },
  
  // NEW: Local restaurants and food places from training data
  { pattern: /PHAT\s*BOY\s*CHEESE/i, merchant: 'Phat Boy Cheesesteak', category: 'Meals & Entertainment', confidence: 94 },
  { pattern: /FRANKLIN\s*DONAIR/i, merchant: 'Franklin Donair', category: 'Meals & Entertainment', confidence: 94 },
  { pattern: /HA\s*NOI\s*PHO/i, merchant: 'Ha Noi Pho Restaurant', category: 'Meals & Entertainment', confidence: 94 },
  { pattern: /BANH\s*MI\s*ZON/i, merchant: 'Banh Mi Zon', category: 'Meals & Entertainment', confidence: 94 },
  { pattern: /MEXICO\s*LINDO/i, merchant: 'Mexico Lindo', category: 'Meals & Entertainment', confidence: 94 },
  { pattern: /GAYATRI\s*RESTAUR/i, merchant: 'Gayatri Restaurant', category: 'Meals & Entertainment', confidence: 94 },
  { pattern: /VIVO\s*RISTORANTE/i, merchant: 'Vivo Ristorante', category: 'Meals & Entertainment', confidence: 94 },
  { pattern: /WALLY'?S\s*(?:FAST\s*FOO|BURGER)/i, merchant: 'Wallys Fast Food', category: 'Meals & Entertainment', confidence: 94 },
  { pattern: /LUNAR\s*FLORA\s*CAF/i, merchant: 'Lunar Flora Cafe', category: 'Meals & Entertainment', confidence: 94 },
  { pattern: /02'?S\s*TAP\s*HOUSE/i, merchant: 'O2s Tap House', category: 'Meals & Entertainment', confidence: 94 },
  { pattern: /PEDAL\s*AND\s*TAP/i, merchant: 'Pedal and Tap', category: 'Meals & Entertainment', confidence: 94 },
  { pattern: /FIRE\s*HALL\s*KITCH/i, merchant: 'Fire Hall Kitchen', category: 'Meals & Entertainment', confidence: 94 },
  { pattern: /SQ\s*\*?FRENCHIES/i, merchant: 'Frenchies', category: 'Meals & Entertainment', confidence: 94 },
  { pattern: /SQ\s*\*?WOW!\s*FACTOR/i, merchant: 'Wow! Factor', category: 'Meals & Entertainment', confidence: 94 },
  
  // =============================================================================
  // GAS STATIONS & AUTOMOTIVE (High Confidence)
  // =============================================================================
  
  { pattern: /SHELL(?:\s|$)/i, merchant: 'Shell', category: 'Motor Vehicle Expenses', confidence: 96 },
  { pattern: /PETRO[\s-]?CANADA/i, merchant: 'Petro-Canada', category: 'Motor Vehicle Expenses', confidence: 96 },
  { pattern: /ESSO/i, merchant: 'Esso', category: 'Motor Vehicle Expenses', confidence: 96 },
  { pattern: /HUSKY/i, merchant: 'Husky', category: 'Motor Vehicle Expenses', confidence: 95 },
  { pattern: /MOHAWK/i, merchant: 'Mohawk', category: 'Motor Vehicle Expenses', confidence: 95 },
  { pattern: /PIONEER/i, merchant: 'Pioneer', category: 'Motor Vehicle Expenses', confidence: 93 },
  { pattern: /ULTRAMAR/i, merchant: 'Ultramar', category: 'Motor Vehicle Expenses', confidence: 95 },
  { pattern: /CHEVRON/i, merchant: 'Chevron', category: 'Motor Vehicle Expenses', confidence: 95 },
  { pattern: /SUNOCO/i, merchant: 'Sunoco', category: 'Motor Vehicle Expenses', confidence: 95 },
  { pattern: /CO-?OP\s*GAS/i, merchant: 'Co-op Gas', category: 'Motor Vehicle Expenses', confidence: 94 },
  
  // NEW: Specific gas station locations from training data
  { pattern: /SHELL\s*C\d+/i, merchant: 'Shell', category: 'Motor Vehicle Expenses', confidence: 96 },
  { pattern: /PETRO\s*CANADA\d+/i, merchant: 'Petro-Canada', category: 'Motor Vehicle Expenses', confidence: 96 },
  { pattern: /CHEVRON\s*\d+/i, merchant: 'Chevron', category: 'Motor Vehicle Expenses', confidence: 96 },
  { pattern: /FAS\s*GAS/i, merchant: 'Fas Gas', category: 'Motor Vehicle Expenses', confidence: 95 },
  { pattern: /GRASSLAND\s*ESSO/i, merchant: 'Esso', category: 'Motor Vehicle Expenses', confidence: 96 },
  { pattern: /MOBIL@?\s*-?\s*\d+/i, merchant: 'Mobil', category: 'Motor Vehicle Expenses', confidence: 95 },
  
  // Auto Services
  { pattern: /CANADIAN\s*TIRE/i, merchant: 'Canadian Tire', category: 'Motor Vehicle Expenses', confidence: 85 },
  { pattern: /JIFFY\s*LUBE/i, merchant: 'Jiffy Lube', category: 'Motor Vehicle Expenses', confidence: 94 },
  { pattern: /MR\.?\s*LUBE/i, merchant: 'Mr. Lube', category: 'Motor Vehicle Expenses', confidence: 94 },
  { pattern: /VALVOLINE/i, merchant: 'Valvoline', category: 'Motor Vehicle Expenses', confidence: 92 },
  
  // NEW: Auto services from training data
  { pattern: /PARTSOURCE/i, merchant: 'PartsSource', category: 'Motor Vehicle Expenses', confidence: 94 },
  { pattern: /SHERWOOD\s*FORD/i, merchant: 'Sherwood Ford', category: 'Motor Vehicle Expenses', confidence: 94 },
  { pattern: /MING\s*AUTO/i, merchant: 'Ming Auto', category: 'Motor Vehicle Expenses', confidence: 94 },
  { pattern: /TIRES\s*NOW/i, merchant: 'Tires Now', category: 'Motor Vehicle Expenses', confidence: 94 },
  { pattern: /MISTER\s*TIRE/i, merchant: 'Mister Tire', category: 'Motor Vehicle Expenses', confidence: 94 },
  { pattern: /FTN\s*TIRE/i, merchant: 'FTN Tire', category: 'Motor Vehicle Expenses', confidence: 94 },
  { pattern: /KINOSOO\s*CAR\s*WAS/i, merchant: 'Kinosoo Car Wash', category: 'Motor Vehicle Expenses', confidence: 94 },
  { pattern: /THE\s*TINT\s*STUDIO/i, merchant: 'The Tint Studio', category: 'Motor Vehicle Expenses', confidence: 94 },
  { pattern: /ALBERTA\s*WELDING/i, merchant: 'Alberta Welding', category: 'Motor Vehicle Expenses', confidence: 92 },
  { pattern: /ALBERTA\s*DRIVELI/i, merchant: 'Alberta Drive Test', category: 'Motor Vehicle Expenses', confidence: 94 },
  
  // =============================================================================
  // BANKING & FINANCIAL SERVICES (Very High Confidence)
  // =============================================================================
  
  { pattern: /MONTHLY\s*FEE/i, merchant: 'Bank Fee', category: 'Bank Fees', confidence: 98 },
  { pattern: /SERVICE\s*CHARGE/i, merchant: 'Bank Fee', category: 'Bank Fees', confidence: 97 },
  { pattern: /OVERDRAFT/i, merchant: 'Bank Fee', category: 'Bank Fees', confidence: 98 },
  { pattern: /NSF\s*FEE/i, merchant: 'Bank Fee', category: 'Bank Fees', confidence: 98 },
  { pattern: /NSF\s*CHARGE/i, merchant: 'Bank Fee', category: 'Bank Fees', confidence: 98 },
  { pattern: /INSUFFICIENT\s*FUNDS/i, merchant: 'Bank Fee', category: 'Bank Fees', confidence: 98 },
  { pattern: /ACCOUNT\s*FEE/i, merchant: 'Bank Fee', category: 'Bank Fees', confidence: 95 },
  { pattern: /TRANSACTION\s*FEE/i, merchant: 'Bank Fee', category: 'Bank Fees', confidence: 95 },
  { pattern: /ATM\s*FEE/i, merchant: 'ATM Fee', category: 'Bank Fees', confidence: 97 },
  { pattern: /INTERAC\s*FEE/i, merchant: 'Interac Fee', category: 'Bank Fees', confidence: 96 },
  { pattern: /WIRE\s*TRANSFER/i, merchant: 'Wire Transfer', category: 'Bank Fees', confidence: 95 },
  
  // NEW: Specific bank fees from training data
  { pattern: /ACC\s*FEE[-\s]*SELF\s*SERV/i, merchant: 'Bank Fee', category: 'Bank Fees', confidence: 98 },
  { pattern: /LOAN\s*ADMIN\s*FEE/i, merchant: 'Loan Fee', category: 'Bank Fees', confidence: 97 },
  { pattern: /OVERDRAFT\s*INTEREST/i, merchant: 'Overdraft Interest', category: 'Bank Fees', confidence: 98 },
  { pattern: /E-TRANSFER\s*(?:NWK\s*)?FEE/i, merchant: 'E-Transfer Fee', category: 'Bank Fees', confidence: 97 },
  { pattern: /DEBIT\s*MEMO/i, merchant: 'Bank Fee', category: 'Bank Fees', confidence: 95 },
  
  // Interest & Investment
  { pattern: /INTEREST\s*INCOME/i, merchant: 'Interest Income', category: 'Interest Income', confidence: 98 },
  { pattern: /DIVIDEND/i, merchant: 'Dividend', category: 'Investment Income', confidence: 95 },
  { pattern: /INVESTMENT/i, merchant: 'Investment', category: 'Investments', confidence: 90 },
  
  // =============================================================================
  // RETAIL & SHOPPING (Medium-High Confidence)
  // =============================================================================
  
  // Major Canadian Retailers
  { pattern: /WALMART/i, merchant: 'Walmart', category: 'General Expenses', confidence: 88 },
  { pattern: /COSTCO/i, merchant: 'Costco', category: 'General Expenses', confidence: 88 },
  { pattern: /LOBLAWS/i, merchant: 'Loblaws', category: 'General Expenses', confidence: 87 },
  { pattern: /REAL\s*CANADIAN\s*SUPERSTORE/i, merchant: 'Real Canadian Superstore', category: 'General Expenses', confidence: 88 },
  { pattern: /NO\s*FRILLS/i, merchant: 'No Frills', category: 'General Expenses', confidence: 87 },
  { pattern: /METRO/i, merchant: 'Metro', category: 'General Expenses', confidence: 85 },
  { pattern: /SOBEYS/i, merchant: 'Sobeys', category: 'General Expenses', confidence: 87 },
  { pattern: /SAFEWAY/i, merchant: 'Safeway', category: 'General Expenses', confidence: 87 },
  { pattern: /IGA/i, merchant: 'IGA', category: 'General Expenses', confidence: 85 },
  
  // NEW: Specific grocery store locations from training data
  { pattern: /COLD\s*LAKE\s*SOBEY/i, merchant: 'Sobeys', category: 'General Expenses', confidence: 88 },
  { pattern: /SOBEYS\s*LAKELAND/i, merchant: 'Sobeys', category: 'General Expenses', confidence: 88 },
  { pattern: /BONNYVILLE\s*SOBE/i, merchant: 'Sobeys', category: 'General Expenses', confidence: 88 },
  { pattern: /SAVE\s*ON\s*FOODS/i, merchant: 'Save-On-Foods', category: 'General Expenses', confidence: 88 },
  { pattern: /FRESHCO/i, merchant: 'FreshCo', category: 'General Expenses', confidence: 87 },
  { pattern: /REAL\s*CDN\.?\s*SUPER/i, merchant: 'Real Canadian Superstore', category: 'General Expenses', confidence: 88 },
  { pattern: /LOCA\s*QUALITY\s*MA/i, merchant: 'Local Quality Market', category: 'General Expenses', confidence: 85 },
  { pattern: /GOLD\s*CREEK\s*MARK/i, merchant: 'Gold Creek Market', category: 'General Expenses', confidence: 85 },
  { pattern: /FORT\s*MACKAY\s*GEN/i, merchant: 'Fort MacKay General Store', category: 'General Expenses', confidence: 85 },
  
  // Department Stores
  { pattern: /THE\s*BAY/i, merchant: 'The Bay', category: 'General Expenses', confidence: 87 },
  { pattern: /SEARS/i, merchant: 'Sears', category: 'General Expenses', confidence: 87 },
  { pattern: /WINNERS/i, merchant: 'Winners', category: 'General Expenses', confidence: 87 },
  { pattern: /MARSHALL'?S/i, merchant: 'Marshalls', category: 'General Expenses', confidence: 87 },
  
  // NEW: Home improvement stores from training data
  { pattern: /THE\s*HOME\s*DEPOT/i, merchant: 'Home Depot', category: 'General Expenses', confidence: 88 },
  { pattern: /LOWE'?S/i, merchant: 'Lowes', category: 'General Expenses', confidence: 88 },
  { pattern: /RONA/i, merchant: 'Rona', category: 'General Expenses', confidence: 87 },
  { pattern: /WINDSOR\s*PLYWOOD/i, merchant: 'Windsor Plywood', category: 'General Expenses', confidence: 87 },
  
  // Office Supplies
  { pattern: /STAPLES/i, merchant: 'Staples', category: 'Office Supplies', confidence: 92 },
  { pattern: /OFFICE\s*DEPOT/i, merchant: 'Office Depot', category: 'Office Supplies', confidence: 92 },
  { pattern: /BEST\s*BUY/i, merchant: 'Best Buy', category: 'Office Supplies', confidence: 85 },
  
  // NEW: Electronics and computer stores from training data
  { pattern: /VISIONS\s*ELECTRO/i, merchant: 'Visions Electronics', category: 'Office Supplies', confidence: 87 },
  { pattern: /UNIWAY\s*COMPUTER/i, merchant: 'Uniway Computer', category: 'Office Supplies', confidence: 87 },
  
  // Online Retail
  { pattern: /AMAZON\.CA/i, merchant: 'Amazon Canada', category: 'Office Supplies', confidence: 78 },
  { pattern: /AMAZON\.COM/i, merchant: 'Amazon', category: 'Office Supplies', confidence: 76 },
  { pattern: /EBAY/i, merchant: 'eBay', category: 'General Expenses', confidence: 75 },
  
  // NEW: Convenience stores from training data
  { pattern: /7-?ELEVEN/i, merchant: '7-Eleven', category: 'General Expenses', confidence: 88 },

  // =============================================================================
  // BUSINESS & PROFESSIONAL SERVICES (From Training Data)
  // =============================================================================
  
  // Property & Rent
  { pattern: /IXL\s*BUILDING/i, merchant: 'IXL Building', category: 'Rent', confidence: 95 },
  
  // Fuel/Gas Specific Patterns
  { pattern: /SHELL\s*C\d+/i, merchant: 'Shell', category: 'Motor Vehicle Expenses', confidence: 96 },
  { pattern: /PETRO[\-\s]?CANADA/i, merchant: 'Petro-Canada', category: 'Motor Vehicle Expenses', confidence: 96 },
  
  // Generic Business Expense Patterns
  { pattern: /BUILDING\s*(?:PR|PROP)/i, merchant: 'Building Property', category: 'Rent', confidence: 92 },
  { pattern: /PROPERTY\s*(?:RENT|MGMT)/i, merchant: 'Property Management', category: 'Rent', confidence: 92 },
  
  // NEW: Additional merchants from bank training data
  { pattern: /ZEHRS\s*MARKETS/i, merchant: 'Zehrs Markets', category: 'General Expenses', confidence: 88 },
  { pattern: /SHOPPERS\s*DRUG\s*MART/i, merchant: 'Shoppers Drug Mart', category: 'General Expenses', confidence: 88 },
  { pattern: /LCBO/i, merchant: 'LCBO', category: 'Meals & Entertainment', confidence: 90 },
  
  // =============================================================================
  // TELECOMMUNICATIONS & UTILITIES (High Confidence)
  // =============================================================================
  
  // Canadian Telecom
  { pattern: /BELL\s*CANADA/i, merchant: 'Bell Canada', category: 'Telecommunications', confidence: 94 },
  { pattern: /ROGERS/i, merchant: 'Rogers', category: 'Telecommunications', confidence: 92 },
  { pattern: /TELUS/i, merchant: 'Telus', category: 'Telecommunications', confidence: 94 },
  { pattern: /SHAW/i, merchant: 'Shaw', category: 'Telecommunications', confidence: 92 },
  { pattern: /VIDEOTRON/i, merchant: 'Videotron', category: 'Telecommunications', confidence: 93 },
  { pattern: /FIDO/i, merchant: 'Fido', category: 'Telecommunications', confidence: 92 },
  { pattern: /VIRGIN\s*MOBILE/i, merchant: 'Virgin Mobile', category: 'Telecommunications', confidence: 93 },
  { pattern: /KOODO/i, merchant: 'Koodo', category: 'Telecommunications', confidence: 92 },
  
  // Utilities
  { pattern: /HYDRO\s*ONE/i, merchant: 'Hydro One', category: 'Utilities', confidence: 95 },
  { pattern: /ONTARIO\s*HYDRO/i, merchant: 'Ontario Hydro', category: 'Utilities', confidence: 95 },
  { pattern: /BC\s*HYDRO/i, merchant: 'BC Hydro', category: 'Utilities', confidence: 95 },
  { pattern: /ALBERTA\s*ENERGY/i, merchant: 'Alberta Energy', category: 'Utilities', confidence: 93 },
  { pattern: /ENBRIDGE/i, merchant: 'Enbridge', category: 'Utilities', confidence: 93 },
  { pattern: /UNION\s*GAS/i, merchant: 'Union Gas', category: 'Utilities', confidence: 94 },
  
  // NEW: Utility companies from training data
  { pattern: /CITY\s*OF\s*COLD\s*LA/i, merchant: 'City of Cold Lake', category: 'Utilities', confidence: 95 },
  
  // =============================================================================
  // TRANSPORTATION (Medium-High Confidence)
  // =============================================================================
  
  { pattern: /UBER/i, merchant: 'Uber', category: 'Transportation', confidence: 94 },
  { pattern: /LYFT/i, merchant: 'Lyft', category: 'Transportation', confidence: 94 },
  { pattern: /TTC/i, merchant: 'TTC', category: 'Transportation', confidence: 95 },
  { pattern: /GO\s*TRANSIT/i, merchant: 'GO Transit', category: 'Transportation', confidence: 95 },
  { pattern: /VIA\s*RAIL/i, merchant: 'VIA Rail', category: 'Transportation', confidence: 95 },
  { pattern: /AIR\s*CANADA/i, merchant: 'Air Canada', category: 'Transportation', confidence: 94 },
  { pattern: /WESTJET/i, merchant: 'WestJet', category: 'Transportation', confidence: 94 },
  { pattern: /PORTER\s*AIRLINES/i, merchant: 'Porter Airlines', category: 'Transportation', confidence: 94 },
  
  // NEW: Taxi and transportation from training data
  { pattern: /TAXI\s*SHERWOOD/i, merchant: 'Sherwood Park Taxi', category: 'Transportation', confidence: 94 },
  { pattern: /AIRPORT\s*TAXI/i, merchant: 'Airport Taxi', category: 'Transportation', confidence: 94 },
  { pattern: /FLAT\s*R(?:IDE|ATE)\s*(?:TAXI|CABS)/i, merchant: 'Flat Rate Taxi', category: 'Transportation', confidence: 94 },
  { pattern: /ASTRO\s*TAXI/i, merchant: 'Astro Taxi', category: 'Transportation', confidence: 94 },
  
  // =============================================================================
  // PROFESSIONAL SERVICES (Medium-High Confidence)
  // =============================================================================
  
  // NEW: Professional services from training data
  { pattern: /SO\s*INDUSTRIAL\s*SERVICES/i, merchant: 'SO Industrial Services', category: 'Professional Services', confidence: 95 },
  { pattern: /SO\s*INDUSTRIAL\s*PROJECTS/i, merchant: 'SO Industrial Projects', category: 'Professional Services', confidence: 95 },
  { pattern: /ED-LAM\s*MECHANICAL/i, merchant: 'Ed-lam Mechanical', category: 'Professional Services', confidence: 95 },
  { pattern: /FLINT\s*ENERGY\s*SERVICES/i, merchant: 'Flint Energy Services', category: 'Professional Services', confidence: 95 },
  { pattern: /CLEARSTREAM\s*ENERGY/i, merchant: 'ClearStream Energy Services', category: 'Professional Services', confidence: 95 },
  { pattern: /HOLTZMAN\s*HUNTER/i, merchant: 'Holtzman Hunter', category: 'Professional Services', confidence: 92 },
  { pattern: /BARTLE\s*&\s*GIBSON/i, merchant: 'Bartle & Gibson', category: 'Professional Services', confidence: 92 },
  { pattern: /WOLSELEY\s*CANADA/i, merchant: 'Wolseley Canada', category: 'Professional Services', confidence: 92 },
  { pattern: /SANSARSOLUTIONS/i, merchant: 'Sansar Solutions', category: 'Professional Services', confidence: 92 },
  
  // =============================================================================
  // HEALTH & PERSONAL CARE (Medium-High Confidence)
  // =============================================================================
  
  // NEW: Health and personal care from training data
  { pattern: /MR\.?\s*BARBER/i, merchant: 'Mr. Barber', category: 'Personal Care', confidence: 94 },
  { pattern: /DEDICATE\s*HEALTH/i, merchant: 'Dedicated Health', category: 'Medical Expenses', confidence: 94 },
  { pattern: /VISIONARY\s*EYE/i, merchant: 'Visionary Eye Care', category: 'Medical Expenses', confidence: 94 },
  { pattern: /ESS-RICHARDSON/i, merchant: 'Ess Richardson Pharmacy', category: 'Medical Expenses', confidence: 94 },
  
  // =============================================================================
  // GOVERNMENT & OFFICIAL SERVICES (Very High Confidence)
  // =============================================================================
  
  // NEW: Government services from training data
  { pattern: /GOVERNMENT\s*(?:OF\s*)?CANADA/i, merchant: 'Government of Canada', category: 'Government Services', confidence: 98 },
  { pattern: /REGISTRY\s*ON\s*WYE/i, merchant: 'Registry Office', category: 'Government Services', confidence: 95 },
  { pattern: /SQ\s*\*?THE\s*REGISTR/i, merchant: 'Registry Office', category: 'Government Services', confidence: 95 },
  { pattern: /CALGARYUNITEDCA/i, merchant: 'Calgary United Church', category: 'Donations', confidence: 92 },
  
  // =============================================================================
  // ENTERTAINMENT & RECREATION (Medium Confidence)
  // =============================================================================
  
  // NEW: Entertainment venues from training data
  { pattern: /ST\s*EUGENE\s*GOLF/i, merchant: 'St Eugene Golf Course', category: 'Meals & Entertainment', confidence: 93 },
  { pattern: /CRANBROOK\s*GOLF/i, merchant: 'Cranbrook Golf Course', category: 'Meals & Entertainment', confidence: 93 },
  { pattern: /COUNTRY\s*SIDE\s*GO/i, merchant: 'Country Side Golf', category: 'Meals & Entertainment', confidence: 93 },
  { pattern: /BANFF\s*SPRINGS\s*H/i, merchant: 'Banff Springs Hotel', category: 'Travel & Accommodation', confidence: 95 },
  { pattern: /PARK\s*INN\s*BY\s*RAD/i, merchant: 'Park Inn by Radisson', category: 'Travel & Accommodation', confidence: 95 },
  { pattern: /NORTH\s*CENTRAL\s*C/i, merchant: 'North Central Co-op', category: 'General Expenses', confidence: 85 },
  { pattern: /CENTEX\s*PIIKANI/i, merchant: 'Centex Piikani', category: 'General Expenses', confidence: 80 },
  
  // =============================================================================
  // ONLINE SERVICES & SOFTWARE (Medium Confidence)
  // =============================================================================
  
  { pattern: /PAYPAL/i, merchant: 'PayPal', category: 'Online Services', confidence: 88 },
  { pattern: /GOOGLE/i, merchant: 'Google', category: 'Online Services', confidence: 82 },
  { pattern: /MICROSOFT/i, merchant: 'Microsoft', category: 'Software', confidence: 85 },
  { pattern: /ADOBE/i, merchant: 'Adobe', category: 'Software', confidence: 87 },
  { pattern: /NETFLIX/i, merchant: 'Netflix', category: 'Subscriptions', confidence: 94 },
  { pattern: /SPOTIFY/i, merchant: 'Spotify', category: 'Subscriptions', confidence: 94 },
  { pattern: /DROPBOX/i, merchant: 'Dropbox', category: 'Software', confidence: 88 },
  
  // NEW: Online services from training data
  { pattern: /SQ\s*\*?LOCAL\s*SHERW/i, merchant: 'Local Business (Square)', category: 'General Expenses', confidence: 80 },
  { pattern: /SQ\s*\*?COLD\s*LAKE/i, merchant: 'Cold Lake Business (Square)', category: 'General Expenses', confidence: 80 },
  { pattern: /SQ\s*\*?ACTIVATE\s*ED/i, merchant: 'Activate Education (Square)', category: 'Education', confidence: 85 },
  
  // =============================================================================
  // RETAIL SPECIALTY STORES (Medium Confidence)
  // =============================================================================
  
  // NEW: Specialty retail from training data
  { pattern: /PREMIUM\s*MEATS/i, merchant: 'Premium Meats', category: 'General Expenses', confidence: 87 },
  { pattern: /EAST\s*VILLAGE\s*PU/i, merchant: 'East Village Pub', category: 'Meals & Entertainment', confidence: 90 },
  { pattern: /SUN\s*GLASS\s*HUT/i, merchant: 'Sunglass Hut', category: 'General Expenses', confidence: 87 },
  { pattern: /RED\s*WING\s*SHOES/i, merchant: 'Red Wing Shoes', category: 'General Expenses', confidence: 87 },
  { pattern: /ALCURVE\s*STORE/i, merchant: 'Alcurve Store', category: 'General Expenses', confidence: 85 },
  { pattern: /SHERWOOD\s*FLOORI/i, merchant: 'Sherwood Flooring', category: 'General Expenses', confidence: 85 },
  { pattern: /LS\s*HOUSE\s*OF\s*WHE/i, merchant: 'LS House of Wheels', category: 'General Expenses', confidence: 85 },
  { pattern: /ASPEN\s*TRAILS\s*DE/i, merchant: 'Aspen Trails Dental', category: 'Medical Expenses', confidence: 92 },
  { pattern: /THE\s*CAPTAIN'?S\s*B/i, merchant: 'The Captains Boil', category: 'Meals & Entertainment', confidence: 90 },
  { pattern: /GRAND\s*CENTRE\s*GO/i, merchant: 'Grand Centre Go', category: 'General Expenses', confidence: 80 },
  { pattern: /KB\s*&\s*CO/i, merchant: 'KB & Co', category: 'General Expenses', confidence: 80 },
  { pattern: /POPEYES/i, merchant: 'Popeyes', category: 'Meals & Entertainment', confidence: 95 },
  { pattern: /CORA\s*BREAKFAST/i, merchant: 'Cora Breakfast', category: 'Meals & Entertainment', confidence: 94 },
  
  // =============================================================================
  // GENERIC PATTERNS (Lower Confidence - Catch-All)
  // =============================================================================
  
  // Generic Food Keywords
  { pattern: /RESTAURANT/i, merchant: 'Restaurant', category: 'Meals & Entertainment', confidence: 70 },
  { pattern: /CAFE/i, merchant: 'Cafe', category: 'Meals & Entertainment', confidence: 72 },
  { pattern: /COFFEE/i, merchant: 'Coffee Shop', category: 'Meals & Entertainment', confidence: 75 },
  { pattern: /PIZZA/i, merchant: 'Pizza Place', category: 'Meals & Entertainment', confidence: 78 },
  { pattern: /DELI/i, merchant: 'Deli', category: 'Meals & Entertainment', confidence: 75 },
  { pattern: /BAKERY/i, merchant: 'Bakery', category: 'Meals & Entertainment', confidence: 75 },
  
  // Generic Gas Patterns
  { pattern: /GAS\s*STATION/i, merchant: 'Gas Station', category: 'Motor Vehicle Expenses', confidence: 80 },
  { pattern: /FUEL/i, merchant: 'Fuel Station', category: 'Motor Vehicle Expenses', confidence: 78 },
  { pattern: /PETROL/i, merchant: 'Gas Station', category: 'Motor Vehicle Expenses', confidence: 78 },
  
  // Generic Retail
  { pattern: /PHARMACY/i, merchant: 'Pharmacy', category: 'Medical Expenses', confidence: 82 },
  { pattern: /DRUGSTORE/i, merchant: 'Drugstore', category: 'Medical Expenses', confidence: 80 },
  { pattern: /GROCERY/i, merchant: 'Grocery Store', category: 'General Expenses', confidence: 78 },
  { pattern: /SUPERMARKET/i, merchant: 'Supermarket', category: 'General Expenses', confidence: 78 },
  
  // Generic Services
  { pattern: /INSURANCE/i, merchant: 'Insurance', category: 'Insurance', confidence: 85 },
  { pattern: /LEGAL/i, merchant: 'Legal Services', category: 'Professional Services', confidence: 80 },
  { pattern: /ACCOUNTING/i, merchant: 'Accounting Services', category: 'Professional Services', confidence: 85 },
  { pattern: /CONSULTING/i, merchant: 'Consulting', category: 'Professional Services', confidence: 80 },

  // =============================================================================
  // CUSTOM BUSINESS PATTERNS - ADD YOUR OWN HERE!
  // =============================================================================
  
  // Example: Local businesses you frequently use
  { pattern: /YOUR\s*LOCAL\s*RESTAURANT/i, merchant: 'Local Restaurant', category: 'Meals & Entertainment', confidence: 95 },
  { pattern: /FAVORITE\s*MECHANIC/i, merchant: 'Auto Repair Shop', category: 'Motor Vehicle Expenses', confidence: 90 },
  { pattern: /OFFICE\s*RENT/i, merchant: 'Office Landlord', category: 'Rent', confidence: 98 },
  
  // Example: Subscription services
  { pattern: /ZOOM/i, merchant: 'Zoom', category: 'Software', confidence: 92 },
  { pattern: /SLACK/i, merchant: 'Slack', category: 'Software', confidence: 92 },
  { pattern: /QUICKBOOKS/i, merchant: 'QuickBooks', category: 'Software', confidence: 95 },
  
  // Example: Professional services
  { pattern: /LAWYER\s*FEES/i, merchant: 'Legal Fees', category: 'Professional Services', confidence: 95 },
  { pattern: /ACCOUNTANT/i, merchant: 'Accountant', category: 'Professional Services', confidence: 90 },
  
  // Example: Travel & accommodation
  { pattern: /HOTEL/i, merchant: 'Hotel', category: 'Travel & Accommodation', confidence: 85 },
  { pattern: /AIRBNB/i, merchant: 'Airbnb', category: 'Travel & Accommodation', confidence: 90 },
  { pattern: /BOOKING\.COM/i, merchant: 'Booking.com', category: 'Travel & Accommodation', confidence: 88 },
];

// Add named export for merchants
export const merchants = MERCHANT_PATTERNS;

// Helper functions for pattern matching
export const findMerchantPattern = (description: string): MerchantPattern | null => {
  const cleanDescription = description.toUpperCase().trim();
  
  // Sort by confidence (highest first) to get best match
  const sortedPatterns = [...MERCHANT_PATTERNS].sort((a, b) => b.confidence - a.confidence);
  
  for (const pattern of sortedPatterns) {
    if (pattern.pattern.test(cleanDescription)) {
      return pattern;
    }
  }
  
  return null;
};

export const getMerchantCategories = (): string[] => {
  const categories = new Set(MERCHANT_PATTERNS.map(p => p.category));
  return Array.from(categories).sort();
};

export const getPatternsByCategory = (category: string): MerchantPattern[] => {
  return MERCHANT_PATTERNS.filter(p => p.category === category);
};

// Default export for backwards compatibility
export default MERCHANT_PATTERNS; 