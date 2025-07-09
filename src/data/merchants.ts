import { MerchantPattern } from '../lib/types';

// Map of old categories to account codes (based on categoryMappings.ts)
const CATEGORY_TO_ACCOUNT_MAP: { [key: string]: string } = {
  'Meals & Entertainment': '420',
  'Motor Vehicle Expenses': '449',
  'Office Supplies': '455',
  'Bank Fees': '404',
  'Telecommunications': '489',
  'Utilities': '442',
  'Transportation': '493',
  'Professional Services': '412',
  'Insurance': '433',
  'Software': '455',
  'Online Services': '485',
  'Subscriptions': '485',
  'General Expenses': '453',
  'Tax Payments': '505',
  'Revenue': '200',
  'Payroll': '477',
  'Bank Related': '404',
  'Interest Income': '270',
  'Advertising': '400',
  'Rent': '469',
  'Cleaning': '408',
  'Repairs and Maintenance': '473',
  'Freight & Courier': '425',
  'Training and Continuing Education': '487',
  'Business Licenses, Taxes, and Memberships': '482',
  'Depreciation': '416',
  'Interest Expense': '437',
  'Cost of Goods Sold': '310',
  'Sales Revenue': '200',
  'Service Revenue': '220',
  'Other Revenue': '260',
  'Investment Income': '270',
  'Investments': '270',
  'Medical Expenses': '453',
  'Personal Care': '453',
  'Government Services': '505',
  'Travel & Accommodation': '493',
  'Education': '487'
};

export const MERCHANT_PATTERNS: MerchantPattern[] = [
  // =============================================================================
  // FOOD & RESTAURANTS (High Confidence - Very Specific Patterns)
  // =============================================================================
  
  // Canadian Coffee Chains
  { pattern: /TIM\s*HORTONS?/i, merchant: 'Tim Hortons', accountCode: '420', confidence: 96 },
  { pattern: /TIMS\s*HORTONS?/i, merchant: 'Tim Hortons', accountCode: '420', confidence: 94 },
  { pattern: /STARBUCKS/i, merchant: 'Starbucks', accountCode: '420', confidence: 96 },
  { pattern: /SECOND\s*CUP/i, merchant: 'Second Cup', accountCode: '420', confidence: 95 },
  { pattern: /COUNTRY\s*STYLE/i, merchant: 'Country Style', accountCode: '420', confidence: 95 },
  
  // Fast Food Chains
  { pattern: /MCDONALD'?S/i, merchant: 'McDonalds', accountCode: '420', confidence: 96 },
  { pattern: /SUBWAY/i, merchant: 'Subway', accountCode: '420', confidence: 94 },
  { pattern: /BURGER\s*KING/i, merchant: 'Burger King', accountCode: '420', confidence: 95 },
  { pattern: /KFC/i, merchant: 'KFC', accountCode: '420', confidence: 95 },
  { pattern: /TACO\s*BELL/i, merchant: 'Taco Bell', accountCode: '420', confidence: 95 },
  { pattern: /A&W/i, merchant: 'A&W', accountCode: '420', confidence: 95 },
  { pattern: /HARVEY'?S/i, merchant: 'Harveys', accountCode: '420', confidence: 95 },
  
  // NEW: Specific A&W locations from training data
  { pattern: /A&W\s*1613/i, merchant: 'A&W', accountCode: '420', confidence: 96 },
  { pattern: /A&W\s*1393/i, merchant: 'A&W', accountCode: '420', confidence: 96 },
  { pattern: /A&W\s*STORE\s*1729/i, merchant: 'A&W', accountCode: '420', confidence: 96 },
  { pattern: /BONNYVILLE\s*A&W/i, merchant: 'A&W', accountCode: '420', confidence: 96 },
  
  // NEW: Wendy's locations from training data
  { pattern: /WENDYS?\s*6167/i, merchant: 'Wendys', accountCode: '420', confidence: 96 },
  { pattern: /WENDY'?S\s*LACOMBE/i, merchant: 'Wendys', accountCode: '420', confidence: 96 },
  
  // Canadian Restaurant Chains
  { pattern: /SWISS\s*CHALET/i, merchant: 'Swiss Chalet', accountCode: '420', confidence: 96 },
  { pattern: /BOSTON\s*PIZZA/i, merchant: 'Boston Pizza', accountCode: '420', confidence: 95 },
  { pattern: /EAST\s*SIDE\s*MARIO'?S/i, merchant: 'East Side Marios', accountCode: '420', confidence: 95 },
  { pattern: /KELSEY'?S/i, merchant: 'Kelseys', accountCode: '420', confidence: 95 },
  { pattern: /MONTANA'?S/i, merchant: 'Montanas', accountCode: '420', confidence: 95 },
  
  // NEW: Restaurant chains from training data
  { pattern: /THE\s*KEG/i, merchant: 'The Keg', accountCode: '420', confidence: 95 },
  { pattern: /THE\s*CANADIAN\s*BR/i, merchant: 'The Canadian Brewhouse', accountCode: '420', confidence: 94 },
  { pattern: /MR\s*MIKES\s*STEAKH/i, merchant: 'Mr. Mikes', accountCode: '420', confidence: 94 },
  { pattern: /OLIVE\s*GARDEN/i, merchant: 'Olive Garden', accountCode: '420', confidence: 95 },
  { pattern: /EARLS/i, merchant: 'Earls', accountCode: '420', confidence: 94 },
  
  // Pizza Chains
  { pattern: /PIZZA\s*HUT/i, merchant: 'Pizza Hut', accountCode: '420', confidence: 95 },
  { pattern: /DOMINO'?S/i, merchant: 'Dominos', accountCode: '420', confidence: 95 },
  { pattern: /PIZZA\s*PIZZA/i, merchant: 'Pizza Pizza', accountCode: '420', confidence: 95 },
  { pattern: /LITTLE\s*CAESARS/i, merchant: 'Little Caesars', accountCode: '420', confidence: 95 },
  
  // NEW: Pizza places from training data
  { pattern: /BUSTER'?S\s*PIZZA/i, merchant: 'Busters Pizza', accountCode: '420', confidence: 95 },
  { pattern: /NORTH\s*SIDE\s*PIZZ/i, merchant: 'North Side Pizza', accountCode: '420', confidence: 94 },
  
  // NEW: Dairy Queen locations from training data
  { pattern: /DAIRY\s*QUEEN/i, merchant: 'Dairy Queen', accountCode: '420', confidence: 95 },
  
  // NEW: Local restaurants and food places from training data
  { pattern: /PHAT\s*BOY\s*CHEESE/i, merchant: 'Phat Boy Cheesesteak', accountCode: '420', confidence: 94 },
  { pattern: /FRANKLIN\s*DONAIR/i, merchant: 'Franklin Donair', accountCode: '420', confidence: 94 },
  { pattern: /HA\s*NOI\s*PHO/i, merchant: 'Ha Noi Pho Restaurant', accountCode: '420', confidence: 94 },
  { pattern: /BANH\s*MI\s*ZON/i, merchant: 'Banh Mi Zon', accountCode: '420', confidence: 94 },
  { pattern: /MEXICO\s*LINDO/i, merchant: 'Mexico Lindo', accountCode: '420', confidence: 94 },
  { pattern: /GAYATRI\s*RESTAUR/i, merchant: 'Gayatri Restaurant', accountCode: '420', confidence: 94 },
  { pattern: /VIVO\s*RISTORANTE/i, merchant: 'Vivo Ristorante', accountCode: '420', confidence: 94 },
  { pattern: /WALLY'?S\s*(?:FAST\s*FOO|BURGER)/i, merchant: 'Wallys Fast Food', accountCode: '420', confidence: 94 },
  { pattern: /LUNAR\s*FLORA\s*CAF/i, merchant: 'Lunar Flora Cafe', accountCode: '420', confidence: 94 },
  { pattern: /02'?S\s*TAP\s*HOUSE/i, merchant: 'O2s Tap House', accountCode: '420', confidence: 94 },
  { pattern: /PEDAL\s*AND\s*TAP/i, merchant: 'Pedal and Tap', accountCode: '420', confidence: 94 },
  { pattern: /FIRE\s*HALL\s*KITCH/i, merchant: 'Fire Hall Kitchen', accountCode: '420', confidence: 94 },
  { pattern: /SQ\s*\*?FRENCHIES/i, merchant: 'Frenchies', accountCode: '420', confidence: 94 },
  { pattern: /SQ\s*\*?WOW!\s*FACTOR/i, merchant: 'Wow! Factor', accountCode: '420', confidence: 94 },
  
  // =============================================================================
  // GAS STATIONS & AUTOMOTIVE (High Confidence)
  // =============================================================================
  
  { pattern: /SHELL(?:\s|$)/i, merchant: 'Shell', accountCode: '449', confidence: 96 },
  { pattern: /PETRO[\s-]?CANADA/i, merchant: 'Petro-Canada', accountCode: '449', confidence: 96 },
  { pattern: /ESSO/i, merchant: 'Esso', accountCode: '449', confidence: 96 },
  { pattern: /HUSKY/i, merchant: 'Husky', accountCode: '449', confidence: 95 },
  { pattern: /MOHAWK/i, merchant: 'Mohawk', accountCode: '449', confidence: 95 },
  { pattern: /PIONEER/i, merchant: 'Pioneer', accountCode: '449', confidence: 93 },
  { pattern: /ULTRAMAR/i, merchant: 'Ultramar', accountCode: '449', confidence: 95 },
  { pattern: /CHEVRON/i, merchant: 'Chevron', accountCode: '449', confidence: 95 },
  { pattern: /SUNOCO/i, merchant: 'Sunoco', accountCode: '449', confidence: 95 },
  { pattern: /CO-?OP\s*GAS/i, merchant: 'Co-op Gas', accountCode: '449', confidence: 94 },
  
  // NEW: Specific gas station locations from training data
  { pattern: /SHELL\s*C\d+/i, merchant: 'Shell', accountCode: '449', confidence: 96 },
  { pattern: /PETRO\s*CANADA\d+/i, merchant: 'Petro-Canada', accountCode: '449', confidence: 96 },
  { pattern: /CHEVRON\s*\d+/i, merchant: 'Chevron', accountCode: '449', confidence: 96 },
  { pattern: /FAS\s*GAS/i, merchant: 'Fas Gas', accountCode: '449', confidence: 95 },
  { pattern: /GRASSLAND\s*ESSO/i, merchant: 'Esso', accountCode: '449', confidence: 96 },
  { pattern: /MOBIL@?\s*-?\s*\d+/i, merchant: 'Mobil', accountCode: '449', confidence: 95 },
  
  // Auto Services
  { pattern: /CANADIAN\s*TIRE/i, merchant: 'Canadian Tire', accountCode: '449', confidence: 85 },
  { pattern: /JIFFY\s*LUBE/i, merchant: 'Jiffy Lube', accountCode: '449', confidence: 94 },
  { pattern: /MR\.?\s*LUBE/i, merchant: 'Mr. Lube', accountCode: '449', confidence: 94 },
  { pattern: /VALVOLINE/i, merchant: 'Valvoline', accountCode: '449', confidence: 92 },
  
  // NEW: Auto services from training data
  { pattern: /PARTSOURCE/i, merchant: 'PartsSource', accountCode: '449', confidence: 94 },
  { pattern: /SHERWOOD\s*FORD/i, merchant: 'Sherwood Ford', accountCode: '449', confidence: 94 },
  { pattern: /MING\s*AUTO/i, merchant: 'Ming Auto', accountCode: '449', confidence: 94 },
  { pattern: /TIRES\s*NOW/i, merchant: 'Tires Now', accountCode: '449', confidence: 94 },
  { pattern: /MISTER\s*TIRE/i, merchant: 'Mister Tire', accountCode: '449', confidence: 94 },
  { pattern: /FTN\s*TIRE/i, merchant: 'FTN Tire', accountCode: '449', confidence: 94 },
  { pattern: /KINOSOO\s*CAR\s*WAS/i, merchant: 'Kinosoo Car Wash', accountCode: '449', confidence: 94 },
  { pattern: /THE\s*TINT\s*STUDIO/i, merchant: 'The Tint Studio', accountCode: '449', confidence: 94 },
  { pattern: /ALBERTA\s*WELDING/i, merchant: 'Alberta Welding', accountCode: '449', confidence: 92 },
  { pattern: /ALBERTA\s*DRIVELI/i, merchant: 'Alberta Drive Test', accountCode: '449', confidence: 94 },
  
  // =============================================================================
  // BANKING & FINANCIAL SERVICES (Very High Confidence)
  // =============================================================================
  
  // E-Transfer Patterns REMOVED - now require manual entry
  
  // Deposit Patterns (Enhanced)
  { pattern: /DEPOSIT/i, merchant: 'Deposit', accountCode: '200', confidence: 95 },
  { pattern: /CASH\s*DEPOSIT/i, merchant: 'Cash Deposit', accountCode: '200', confidence: 96 },
  // REMOVED: Cheque patterns now require manual entry
  { pattern: /DIRECT\s*DEPOSIT/i, merchant: 'Direct Deposit', accountCode: '200', confidence: 97 },
  { pattern: /PAYROLL\s*DEPOSIT/i, merchant: 'Payroll Deposit', accountCode: '200', confidence: 97 },
  { pattern: /SALARY\s*DEPOSIT/i, merchant: 'Salary Deposit', accountCode: '200', confidence: 97 },
  { pattern: /PAYMENT\s*RECEIVED/i, merchant: 'Payment Received', accountCode: '200', confidence: 95 },
  { pattern: /INCOMING\s*TRANSFER/i, merchant: 'Incoming Transfer', accountCode: '200', confidence: 95 },
  { pattern: /FUNDS\s*RECEIVED/i, merchant: 'Funds Received', accountCode: '200', confidence: 95 },
  
  // ATM Transactions (Fixed: should be Accounts Receivable, not Bank Fees or Revenue)
  { pattern: /ATM\s*WITHDRAWAL/i, merchant: 'ATM Withdrawal', accountCode: '610', confidence: 97 },
  { pattern: /ATM\s*DEPOSIT/i, merchant: 'ATM Deposit', accountCode: '610', confidence: 97 },
  { pattern: /ATM\s*TRANSACTION/i, merchant: 'ATM Transaction', accountCode: '610', confidence: 95 },
  { pattern: /CASH\s*WITHDRAWAL/i, merchant: 'Cash Withdrawal', accountCode: '610', confidence: 96 },
  
  // Bank Fees (Enhanced)
  { pattern: /MONTHLY\s*FEE/i, merchant: 'Bank Fee', accountCode: '404', confidence: 98 },
  { pattern: /SERVICE\s*CHARGE/i, merchant: 'Bank Fee', accountCode: '404', confidence: 97 },
  { pattern: /OVERDRAFT/i, merchant: 'Bank Fee', accountCode: '404', confidence: 98 },
  { pattern: /NSF\s*FEE/i, merchant: 'Bank Fee', accountCode: '404', confidence: 98 },
  { pattern: /NSF\s*CHARGE/i, merchant: 'Bank Fee', accountCode: '404', confidence: 98 },
  { pattern: /INSUFFICIENT\s*FUNDS/i, merchant: 'Bank Fee', accountCode: '404', confidence: 98 },
  { pattern: /ACCOUNT\s*FEE/i, merchant: 'Bank Fee', accountCode: '404', confidence: 95 },
  { pattern: /TRANSFER\s*FEE/i, merchant: 'Transfer Fee', accountCode: '404', confidence: 95 },
  { pattern: /WITHDRAWAL\s*FEE/i, merchant: 'Withdrawal Fee', accountCode: '404', confidence: 95 },
  { pattern: /INTERNATIONAL\s*TRANSACTION\s*FEE/i, merchant: 'International Fee', accountCode: '404', confidence: 95 },
  { pattern: /FOREIGN\s*EXCHANGE\s*FEE/i, merchant: 'Foreign Exchange Fee', accountCode: '404', confidence: 95 },
  
  // =============================================================================
  // RETAIL & SHOPPING (Enhanced)
  // =============================================================================
  
  // Major Retail Chains
  { pattern: /WALMART/i, merchant: 'Walmart', accountCode: '453', confidence: 96 },
  { pattern: /COSTCO/i, merchant: 'Costco', accountCode: '453', confidence: 96 },
  { pattern: /CANADIAN\s*TIRE/i, merchant: 'Canadian Tire', accountCode: '449', confidence: 85 },
  { pattern: /HOME\s*DEPOT/i, merchant: 'Home Depot', accountCode: '455', confidence: 95 },
  { pattern: /RONA/i, merchant: 'Rona', accountCode: '455', confidence: 95 },
  { pattern: /LOWE'?S/i, merchant: 'Lowes', accountCode: '455', confidence: 95 },
  { pattern: /HOMESENSE/i, merchant: 'Homesense', accountCode: '453', confidence: 94 },
  { pattern: /WINNERS/i, merchant: 'Winners', accountCode: '453', confidence: 94 },
  { pattern: /MARSHALLS/i, merchant: 'Marshalls', accountCode: '453', confidence: 94 },
  { pattern: /TJ\s*MAXX/i, merchant: 'TJ Maxx', accountCode: '453', confidence: 94 },
  
  // Grocery Stores
  { pattern: /SAFEWAY/i, merchant: 'Safeway', accountCode: '453', confidence: 96 },
  { pattern: /SOBEYS/i, merchant: 'Sobeys', accountCode: '453', confidence: 96 },
  { pattern: /SUPERSTORE/i, merchant: 'Superstore', accountCode: '453', confidence: 96 },
  { pattern: /NO\s*FRILLS/i, merchant: 'No Frills', accountCode: '453', confidence: 96 },
  { pattern: /FRESHCO/i, merchant: 'FreshCo', accountCode: '453', confidence: 96 },
  { pattern: /FOOD\s*BASICS/i, merchant: 'Food Basics', accountCode: '453', confidence: 96 },
  { pattern: /METRO/i, merchant: 'Metro', accountCode: '453', confidence: 96 },
  { pattern: /LONGO'?S/i, merchant: 'Longos', accountCode: '453', confidence: 96 },
  { pattern: /FARM\s*BOY/i, merchant: 'Farm Boy', accountCode: '453', confidence: 96 },
  { pattern: /WHOLE\s*FOODS/i, merchant: 'Whole Foods', accountCode: '453', confidence: 96 },
  { pattern: /TRADER\s*JOE'?S/i, merchant: 'Trader Joes', accountCode: '453', confidence: 96 },
  
  // Drug Stores
  { pattern: /SHOPPERS\s*DRUG\s*MART/i, merchant: 'Shoppers Drug Mart', accountCode: '453', confidence: 96 },
  { pattern: /REXALL/i, merchant: 'Rexall', accountCode: '453', confidence: 96 },
  { pattern: /LONDON\s*DRUGS/i, merchant: 'London Drugs', accountCode: '453', confidence: 96 },
  { pattern: /PHARMASAVE/i, merchant: 'Pharmasave', accountCode: '453', confidence: 96 },
  { pattern: /GUARDIAN/i, merchant: 'Guardian', accountCode: '453', confidence: 96 },
  
  // =============================================================================
  // TELECOMMUNICATIONS (Enhanced)
  // =============================================================================
  
  { pattern: /BELL\s*CANADA/i, merchant: 'Bell Canada', accountCode: '489', confidence: 96 },
  { pattern: /ROGERS/i, merchant: 'Rogers', accountCode: '489', confidence: 96 },
  { pattern: /TELUS/i, merchant: 'Telus', accountCode: '489', confidence: 96 },
  { pattern: /SHAW/i, merchant: 'Shaw', accountCode: '489', confidence: 96 },
  { pattern: /COGECO/i, merchant: 'Cogeco', accountCode: '489', confidence: 96 },
  { pattern: /FIDO/i, merchant: 'Fido', accountCode: '489', confidence: 96 },
  { pattern: /VIRGIN\s*MOBILE/i, merchant: 'Virgin Mobile', accountCode: '489', confidence: 96 },
  { pattern: /KOODO/i, merchant: 'Koodo', accountCode: '489', confidence: 96 },
  { pattern: /FREEDOM\s*MOBILE/i, merchant: 'Freedom Mobile', accountCode: '489', confidence: 96 },
  { pattern: /PUBLIC\s*MOBILE/i, merchant: 'Public Mobile', accountCode: '489', confidence: 96 },
  
  // =============================================================================
  // INSURANCE (Enhanced)
  // =============================================================================
  
  { pattern: /WAWANESA/i, merchant: 'Wawanesa Insurance', accountCode: '433', confidence: 96 },
  { pattern: /INTACT/i, merchant: 'Intact Insurance', accountCode: '433', confidence: 96 },
  { pattern: /TD\s*INSURANCE/i, merchant: 'TD Insurance', accountCode: '433', confidence: 96 },
  { pattern: /RBC\s*INSURANCE/i, merchant: 'RBC Insurance', accountCode: '433', confidence: 96 },
  { pattern: /COOPERATORS/i, merchant: 'Cooperators', accountCode: '433', confidence: 96 },
  { pattern: /MANULIFE/i, merchant: 'Manulife', accountCode: '433', confidence: 96 },
  { pattern: /SUN\s*LIFE/i, merchant: 'Sun Life', accountCode: '433', confidence: 96 },
  { pattern: /GREAT\s*WEST\s*LIFE/i, merchant: 'Great West Life', accountCode: '433', confidence: 96 },
  
  // =============================================================================
  // UTILITIES (Enhanced)
  // =============================================================================
  
  { pattern: /ENBRIDGE/i, merchant: 'Enbridge', accountCode: '442', confidence: 96 },
  { pattern: /UNION\s*GAS/i, merchant: 'Union Gas', accountCode: '442', confidence: 96 },
  { pattern: /ATCO\s*GAS/i, merchant: 'ATCO Gas', accountCode: '442', confidence: 96 },
  { pattern: /FORTIS\s*BC/i, merchant: 'Fortis BC', accountCode: '442', confidence: 96 },
  { pattern: /HYDRO\s*ONE/i, merchant: 'Hydro One', accountCode: '442', confidence: 96 },
  { pattern: /BC\s*HYDRO/i, merchant: 'BC Hydro', accountCode: '442', confidence: 96 },
  { pattern: /EPCOR/i, merchant: 'EPCOR', accountCode: '442', confidence: 96 },
  { pattern: /ATCO\s*ELECTRIC/i, merchant: 'ATCO Electric', accountCode: '442', confidence: 96 },
  
  // =============================================================================
  // ENTERTAINMENT & SUBSCRIPTIONS (Enhanced)
  // =============================================================================
  
  { pattern: /NETFLIX/i, merchant: 'Netflix', accountCode: '420', confidence: 96 },
  { pattern: /SPOTIFY/i, merchant: 'Spotify', accountCode: '420', confidence: 96 },
  { pattern: /AMAZON\s*PRIME/i, merchant: 'Amazon Prime', accountCode: '485', confidence: 96 },
  { pattern: /DISNEY\s*PLUS/i, merchant: 'Disney Plus', accountCode: '420', confidence: 96 },
  { pattern: /APPLE\s*TV/i, merchant: 'Apple TV', accountCode: '420', confidence: 96 },
  { pattern: /CRAVE/i, merchant: 'Crave', accountCode: '420', confidence: 96 },
  { pattern: /YOUTUBE\s*PREMIUM/i, merchant: 'YouTube Premium', accountCode: '420', confidence: 96 },
  { pattern: /HULU/i, merchant: 'Hulu', accountCode: '420', confidence: 96 },
  { pattern: /PARAMOUNT\s*PLUS/i, merchant: 'Paramount Plus', accountCode: '420', confidence: 96 },
  
  // =============================================================================
  // GOVERNMENT & TAXES (Enhanced)
  // =============================================================================
  
  { pattern: /CRA/i, merchant: 'Canada Revenue Agency', accountCode: '505', confidence: 96 },
  { pattern: /CANADA\s*REVENUE\s*AGENCY/i, merchant: 'Canada Revenue Agency', accountCode: '505', confidence: 96 },
  { pattern: /SERVICE\s*CANADA/i, merchant: 'Service Canada', accountCode: '505', confidence: 96 },
  { pattern: /SERVICE\s*ONTARIO/i, merchant: 'Service Ontario', accountCode: '505', confidence: 96 },
  { pattern: /GOVERNMENT\s*OF\s*CANADA/i, merchant: 'Government of Canada', accountCode: '505', confidence: 96 },
  { pattern: /GOVERNMENT\s*OF\s*ONTARIO/i, merchant: 'Government of Ontario', accountCode: '505', confidence: 96 },
  { pattern: /GOVERNMENT\s*OF\s*ALBERTA/i, merchant: 'Government of Alberta', accountCode: '505', confidence: 96 },
  { pattern: /GOVERNMENT\s*OF\s*BC/i, merchant: 'Government of BC', accountCode: '505', confidence: 96 },
  
  // =============================================================================
  // ONLINE SERVICES & SOFTWARE (Enhanced)
  // =============================================================================
  
  { pattern: /GOOGLE/i, merchant: 'Google', accountCode: '485', confidence: 95 },
  { pattern: /MICROSOFT/i, merchant: 'Microsoft', accountCode: '485', confidence: 95 },
  { pattern: /ADOBE/i, merchant: 'Adobe', accountCode: '485', confidence: 95 },
  { pattern: /ZOOM/i, merchant: 'Zoom', accountCode: '485', confidence: 95 },
  { pattern: /SLACK/i, merchant: 'Slack', accountCode: '485', confidence: 95 },
  { pattern: /DROPBOX/i, merchant: 'Dropbox', accountCode: '485', confidence: 95 },
  { pattern: /BOX/i, merchant: 'Box', accountCode: '485', confidence: 95 },
  { pattern: /SALESFORCE/i, merchant: 'Salesforce', accountCode: '485', confidence: 95 },
  { pattern: /QUICKBOOKS/i, merchant: 'QuickBooks', accountCode: '485', confidence: 95 },
  { pattern: /XERO/i, merchant: 'Xero', accountCode: '485', confidence: 95 },
  { pattern: /STRIPE/i, merchant: 'Stripe', accountCode: '200', confidence: 95 },
  { pattern: /PAYPAL/i, merchant: 'PayPal', accountCode: '200', confidence: 95 },
  
  // =============================================================================
  // TRAVEL & ACCOMMODATION (Enhanced)
  // =============================================================================
  
  { pattern: /AIR\s*CANADA/i, merchant: 'Air Canada', accountCode: '493', confidence: 96 },
  { pattern: /WESTJET/i, merchant: 'WestJet', accountCode: '493', confidence: 96 },
  { pattern: /PORTER/i, merchant: 'Porter Airlines', accountCode: '493', confidence: 96 },
  { pattern: /EXPEDIA/i, merchant: 'Expedia', accountCode: '493', confidence: 95 },
  { pattern: /BOOKING\.COM/i, merchant: 'Booking.com', accountCode: '493', confidence: 95 },
  { pattern: /AIRBNB/i, merchant: 'Airbnb', accountCode: '493', confidence: 95 },
  { pattern: /HILTON/i, merchant: 'Hilton', accountCode: '493', confidence: 95 },
  { pattern: /MARRIOTT/i, merchant: 'Marriott', accountCode: '493', confidence: 95 },
  { pattern: /HOLIDAY\s*INN/i, merchant: 'Holiday Inn', accountCode: '493', confidence: 95 },
  { pattern: /BEST\s*WESTERN/i, merchant: 'Best Western', accountCode: '493', confidence: 95 },
  
  // =============================================================================
  // EDUCATION & TRAINING (Enhanced)
  // =============================================================================
  
  { pattern: /UNIVERSITY\s*OF\s*TORONTO/i, merchant: 'University of Toronto', accountCode: '487', confidence: 96 },
  { pattern: /UNIVERSITY\s*OF\s*BRITISH\s*COLUMBIA/i, merchant: 'University of British Columbia', accountCode: '487', confidence: 96 },
  { pattern: /UNIVERSITY\s*OF\s*ALBERTA/i, merchant: 'University of Alberta', accountCode: '487', confidence: 96 },
  { pattern: /UNIVERSITY\s*OF\s*CALGARY/i, merchant: 'University of Calgary', accountCode: '487', confidence: 96 },
  { pattern: /UNIVERSITY\s*OF\s*WATERLOO/i, merchant: 'University of Waterloo', accountCode: '487', confidence: 96 },
  { pattern: /UNIVERSITY\s*OF\s*WESTERN\s*ONTARIO/i, merchant: 'University of Western Ontario', accountCode: '487', confidence: 96 },
  { pattern: /MCMASTER\s*UNIVERSITY/i, merchant: 'McMaster University', accountCode: '487', confidence: 96 },
  { pattern: /QUEEN'?S\s*UNIVERSITY/i, merchant: 'Queens University', accountCode: '487', confidence: 96 },
  { pattern: /COLLEGE/i, merchant: 'College', accountCode: '487', confidence: 90 },
  { pattern: /SCHOOL/i, merchant: 'School', accountCode: '487', confidence: 90 },
  
  // =============================================================================
  // PROFESSIONAL SERVICES (Enhanced)
  // =============================================================================
  
  { pattern: /LAWYER/i, merchant: 'Legal Services', accountCode: '412', confidence: 95 },
  { pattern: /ATTORNEY/i, merchant: 'Legal Services', accountCode: '412', confidence: 95 },
  { pattern: /LAW\s*FIRM/i, merchant: 'Legal Services', accountCode: '412', confidence: 95 },
  { pattern: /ACCOUNTANT/i, merchant: 'Accounting Services', accountCode: '412', confidence: 95 },
  { pattern: /CPA/i, merchant: 'Accounting Services', accountCode: '412', confidence: 95 },
  { pattern: /CONSULTANT/i, merchant: 'Consulting Services', accountCode: '412', confidence: 90 },
  { pattern: /CONSULTING/i, merchant: 'Consulting Services', accountCode: '412', confidence: 90 },
  { pattern: /MARKETING/i, merchant: 'Marketing Services', accountCode: '400', confidence: 90 },
  { pattern: /ADVERTISING/i, merchant: 'Advertising Services', accountCode: '400', confidence: 90 },
  
  // =============================================================================
  // HEALTH & MEDICAL (Enhanced)
  // =============================================================================
  
  { pattern: /PHARMACY/i, merchant: 'Pharmacy', accountCode: '453', confidence: 95 },
  { pattern: /DRUG\s*STORE/i, merchant: 'Drug Store', accountCode: '453', confidence: 95 },
  { pattern: /MEDICAL/i, merchant: 'Medical Services', accountCode: '453', confidence: 90 },
  { pattern: /DENTAL/i, merchant: 'Dental Services', accountCode: '453', confidence: 95 },
  { pattern: /DENTIST/i, merchant: 'Dental Services', accountCode: '453', confidence: 95 },
  { pattern: /DOCTOR/i, merchant: 'Medical Services', accountCode: '453', confidence: 90 },
  { pattern: /HOSPITAL/i, merchant: 'Hospital', accountCode: '453', confidence: 95 },
  { pattern: /CLINIC/i, merchant: 'Medical Clinic', accountCode: '453', confidence: 90 },
  
  // =============================================================================
  // AUTOMOTIVE & TRANSPORTATION (Enhanced)
  // =============================================================================
  
  { pattern: /UBER/i, merchant: 'Uber', accountCode: '493', confidence: 95 },
  { pattern: /LYFT/i, merchant: 'Lyft', accountCode: '493', confidence: 95 },
  { pattern: /TAXI/i, merchant: 'Taxi', accountCode: '493', confidence: 95 },
  { pattern: /TRANSIT/i, merchant: 'Public Transit', accountCode: '493', confidence: 95 },
  { pattern: /GO\s*TRANSIT/i, merchant: 'GO Transit', accountCode: '493', confidence: 95 },
  { pattern: /TTC/i, merchant: 'TTC', accountCode: '493', confidence: 95 },
  { pattern: /CALGARY\s*TRANSIT/i, merchant: 'Calgary Transit', accountCode: '493', confidence: 95 },
  { pattern: /EDMONTON\s*TRANSIT/i, merchant: 'Edmonton Transit', accountCode: '493', confidence: 95 },
  { pattern: /VANCOUVER\s*TRANSIT/i, merchant: 'Vancouver Transit', accountCode: '493', confidence: 95 },
  
  // =============================================================================
  // HOME & GARDEN (Enhanced)
  // =============================================================================
  
  { pattern: /IKEA/i, merchant: 'IKEA', accountCode: '455', confidence: 96 },
  { pattern: /BED\s*BATH\s*&?\s*BEYOND/i, merchant: 'Bed Bath & Beyond', accountCode: '455', confidence: 95 },
  { pattern: /WILLIAMS\s*SONOMA/i, merchant: 'Williams Sonoma', accountCode: '455', confidence: 95 },
  { pattern: /POTTERY\s*BARN/i, merchant: 'Pottery Barn', accountCode: '455', confidence: 95 },
  { pattern: /CRATE\s*&?\s*BARREL/i, merchant: 'Crate & Barrel', accountCode: '455', confidence: 95 },
  { pattern: /WEST\s*ELM/i, merchant: 'West Elm', accountCode: '455', confidence: 95 },
  
  // =============================================================================
  // SPORTS & FITNESS (Enhanced)
  // =============================================================================
  
  { pattern: /GOODLIFE/i, merchant: 'GoodLife Fitness', accountCode: '420', confidence: 95 },
  { pattern: /FITNESS\s*WORLD/i, merchant: 'Fitness World', accountCode: '420', confidence: 95 },
  { pattern: /YMCA/i, merchant: 'YMCA', accountCode: '420', confidence: 95 },
  { pattern: /YWCA/i, merchant: 'YWCA', accountCode: '420', confidence: 95 },
  { pattern: /PLANET\s*FITNESS/i, merchant: 'Planet Fitness', accountCode: '420', confidence: 95 },
  { pattern: /LA\s*FITNESS/i, merchant: 'LA Fitness', accountCode: '420', confidence: 95 },
  { pattern: /ANYTIME\s*FITNESS/i, merchant: 'Anytime Fitness', accountCode: '420', confidence: 95 },
  
  // =============================================================================
  // FINANCIAL SERVICES (Enhanced)
  // =============================================================================
  
  { pattern: /TD\s*CANADA\s*TRUST/i, merchant: 'TD Canada Trust', accountCode: '404', confidence: 96 },
  { pattern: /RBC\s*ROYAL\s*BANK/i, merchant: 'RBC Royal Bank', accountCode: '404', confidence: 96 },
  { pattern: /BMO\s*BANK\s*OF\s*MONTREAL/i, merchant: 'BMO Bank of Montreal', accountCode: '404', confidence: 96 },
  { pattern: /SCOTIABANK/i, merchant: 'Scotiabank', accountCode: '404', confidence: 96 },
  { pattern: /CIBC/i, merchant: 'CIBC', accountCode: '404', confidence: 96 },
  { pattern: /NATIONAL\s*BANK/i, merchant: 'National Bank', accountCode: '404', confidence: 96 },
  { pattern: /HSBC/i, merchant: 'HSBC', accountCode: '404', confidence: 96 },
  { pattern: /TANGERINE/i, merchant: 'Tangerine', accountCode: '404', confidence: 96 },
  { pattern: /PC\s*FINANCIAL/i, merchant: 'PC Financial', accountCode: '404', confidence: 96 },
  { pattern: /SIMPLII\s*FINANCIAL/i, merchant: 'Simplii Financial', accountCode: '404', confidence: 96 },
  { pattern: /TRANSACTION\s*FEE/i, merchant: 'Bank Fee', accountCode: '404', confidence: 95 },
  { pattern: /ATM\s*FEE/i, merchant: 'ATM Fee', accountCode: '404', confidence: 97 },
  { pattern: /INTERAC\s*FEE/i, merchant: 'Interac Fee', accountCode: '404', confidence: 96 },
  { pattern: /WIRE\s*TRANSFER/i, merchant: 'Wire Transfer', accountCode: '404', confidence: 95 },
  
  // NEW: Specific bank fees from training data
  { pattern: /ACC\s*FEE[-\s]*SELF\s*SERV/i, merchant: 'Bank Fee', accountCode: '404', confidence: 98 },
  { pattern: /LOAN\s*ADMIN\s*FEE/i, merchant: 'Loan Fee', accountCode: '404', confidence: 97 },
  { pattern: /OVERDRAFT\s*INTEREST/i, merchant: 'Overdraft Interest', accountCode: '404', confidence: 98 },
  { pattern: /E-TRANSFER\s*(?:NWK\s*)?FEE(?!\s*FREE)/i, merchant: 'E-Transfer Fee', accountCode: '404', confidence: 97 },
  { pattern: /DEBIT\s*MEMO(?!.*E-TRANSFER)/i, merchant: 'Bank Fee', accountCode: '404', confidence: 95 },
  
  // Interest & Investment (Enhanced)
  { pattern: /INTEREST\s*INCOME/i, merchant: 'Interest Income', accountCode: '270', confidence: 98 },
  { pattern: /DIVIDEND/i, merchant: 'Dividend', accountCode: '270', confidence: 95 },
  { pattern: /INVESTMENT/i, merchant: 'Investment', accountCode: '270', confidence: 90 },
  { pattern: /INTEREST\s*PAID/i, merchant: 'Interest Paid', accountCode: '437', confidence: 95 },
  { pattern: /INTEREST\s*EARNED/i, merchant: 'Interest Earned', accountCode: '270', confidence: 95 },
  { pattern: /CAPITAL\s*GAINS/i, merchant: 'Capital Gains', accountCode: '270', confidence: 90 },
  { pattern: /INVESTMENT\s*INCOME/i, merchant: 'Investment Income', accountCode: '270', confidence: 92 },
  
  // Credit Card Payments (Fixed: should be Loan account, not Bank Fees)
  { pattern: /CREDIT\s*CARD\s*PAYMENT/i, merchant: 'Credit Card Payment', accountCode: '900', confidence: 95 },
  { pattern: /CC\s*PAYMENT/i, merchant: 'Credit Card Payment', accountCode: '900', confidence: 95 },
  { pattern: /VISA\s*PAYMENT/i, merchant: 'Visa Payment', accountCode: '900', confidence: 95 },
  { pattern: /MASTERCARD\s*PAYMENT/i, merchant: 'Mastercard Payment', accountCode: '900', confidence: 95 },
  
  // Loan Payments (Fixed: should be Loan account, not Bank Fees)
  { pattern: /LOAN\s*PAYMENT/i, merchant: 'Loan Payment', accountCode: '900', confidence: 95 },
  { pattern: /MORTGAGE\s*PAYMENT/i, merchant: 'Mortgage Payment', accountCode: '900', confidence: 95 },
  { pattern: /CAR\s*LOAN\s*PAYMENT/i, merchant: 'Car Loan Payment', accountCode: '900', confidence: 95 },
  { pattern: /PRINCIPAL\s*PAYMENT/i, merchant: 'Principal Payment', accountCode: '900', confidence: 90 },
  
  // Bank Transfers (Fixed: should be Accounts Receivable, not Bank Fees or Revenue)
  { pattern: /TRANSFER\s*TO\s*SAVINGS/i, merchant: 'Transfer to Savings', accountCode: '610', confidence: 95 },
  { pattern: /TRANSFER\s*FROM\s*SAVINGS/i, merchant: 'Transfer from Savings', accountCode: '610', confidence: 95 },
  { pattern: /TRANSFER\s*TO\s*CHEQUING/i, merchant: 'Transfer to Chequing', accountCode: '610', confidence: 95 },
  { pattern: /TRANSFER\s*FROM\s*CHEQUING/i, merchant: 'Transfer from Chequing', accountCode: '610', confidence: 95 },
  { pattern: /INTERNAL\s*TRANSFER/i, merchant: 'Internal Transfer', accountCode: '610', confidence: 95 },
  
  // =============================================================================
  // RETAIL & SHOPPING (Medium-High Confidence)
  // =============================================================================
  
  // Major Canadian Retailers
  { pattern: /WALMART/i, merchant: 'Walmart', accountCode: '453', confidence: 88 },
  { pattern: /COSTCO/i, merchant: 'Costco', accountCode: '453', confidence: 88 },
  { pattern: /LOBLAWS/i, merchant: 'Loblaws', accountCode: '453', confidence: 87 },
  { pattern: /REAL\s*CANADIAN\s*SUPERSTORE/i, merchant: 'Real Canadian Superstore', accountCode: '453', confidence: 88 },
  { pattern: /NO\s*FRILLS/i, merchant: 'No Frills', accountCode: '453', confidence: 87 },
  { pattern: /METRO/i, merchant: 'Metro', accountCode: '453', confidence: 85 },
  { pattern: /SOBEYS/i, merchant: 'Sobeys', accountCode: '453', confidence: 87 },
  { pattern: /SAFEWAY/i, merchant: 'Safeway', accountCode: '453', confidence: 87 },
  { pattern: /IGA/i, merchant: 'IGA', accountCode: '453', confidence: 85 },
  
  // NEW: Specific grocery store locations from training data
  { pattern: /COLD\s*LAKE\s*SOBEY/i, merchant: 'Sobeys', accountCode: '453', confidence: 88 },
  { pattern: /SOBEYS\s*LAKELAND/i, merchant: 'Sobeys', accountCode: '453', confidence: 88 },
  { pattern: /BONNYVILLE\s*SOBE/i, merchant: 'Sobeys', accountCode: '453', confidence: 88 },
  { pattern: /SAVE\s*ON\s*FOODS/i, merchant: 'Save-On-Foods', accountCode: '453', confidence: 88 },
  { pattern: /FRESHCO/i, merchant: 'FreshCo', accountCode: '453', confidence: 87 },
  { pattern: /REAL\s*CDN\.?\s*SUPER/i, merchant: 'Real Canadian Superstore', accountCode: '453', confidence: 88 },
  { pattern: /LOCA\s*QUALITY\s*MA/i, merchant: 'Local Quality Market', accountCode: '453', confidence: 85 },
  { pattern: /GOLD\s*CREEK\s*MARK/i, merchant: 'Gold Creek Market', accountCode: '453', confidence: 85 },
  { pattern: /FORT\s*MACKAY\s*GEN/i, merchant: 'Fort MacKay General Store', accountCode: '453', confidence: 85 },
  
  // Department Stores
  { pattern: /THE\s*BAY/i, merchant: 'The Bay', accountCode: '453', confidence: 87 },
  { pattern: /SEARS/i, merchant: 'Sears', accountCode: '453', confidence: 87 },
  { pattern: /WINNERS/i, merchant: 'Winners', accountCode: '453', confidence: 87 },
  { pattern: /MARSHALL'?S/i, merchant: 'Marshalls', accountCode: '453', confidence: 87 },
  
  // NEW: Home improvement stores from training data (Fixed: removed duplicate, kept higher confidence)
  { pattern: /LOWE'?S/i, merchant: 'Lowes', accountCode: '455', confidence: 88 },
  { pattern: /RONA/i, merchant: 'Rona', accountCode: '455', confidence: 87 },
  { pattern: /WINDSOR\s*PLYWOOD/i, merchant: 'Windsor Plywood', accountCode: '455', confidence: 87 },
  
  // Office Supplies
  { pattern: /STAPLES/i, merchant: 'Staples', accountCode: '455', confidence: 92 },
  { pattern: /OFFICE\s*DEPOT/i, merchant: 'Office Depot', accountCode: '455', confidence: 92 },
  { pattern: /BEST\s*BUY/i, merchant: 'Best Buy', accountCode: '455', confidence: 85 },
  { pattern: /FUTURE\s*SHOP/i, merchant: 'Future Shop', accountCode: '455', confidence: 85 },
  
  // NEW: Office supplies from training data
  { pattern: /SHERWOOD\s*PARK\s*ST/i, merchant: 'Staples', accountCode: '455', confidence: 92 },
  { pattern: /STAPLES\s*CANADA/i, merchant: 'Staples', accountCode: '455', confidence: 92 },
  
  // =============================================================================
  // TELECOMMUNICATIONS & UTILITIES (High Confidence)
  // =============================================================================
  
  // Telecommunications
  { pattern: /ROGERS/i, merchant: 'Rogers', accountCode: '489', confidence: 95 },
  { pattern: /BELL/i, merchant: 'Bell', accountCode: '489', confidence: 95 },
  { pattern: /TELUS/i, merchant: 'Telus', accountCode: '489', confidence: 95 },
  { pattern: /SHAW/i, merchant: 'Shaw', accountCode: '489', confidence: 95 },
  { pattern: /COGECO/i, merchant: 'Cogeco', accountCode: '489', confidence: 95 },
  { pattern: /EASTLINK/i, merchant: 'Eastlink', accountCode: '489', confidence: 95 },
  { pattern: /FIDO/i, merchant: 'Fido', accountCode: '489', confidence: 95 },
  { pattern: /VIRGIN\s*MOBILE/i, merchant: 'Virgin Mobile', accountCode: '489', confidence: 95 },
  { pattern: /KOODO/i, merchant: 'Koodo', accountCode: '489', confidence: 95 },
  { pattern: /PUBLIC\s*MOBILE/i, merchant: 'Public Mobile', accountCode: '489', confidence: 95 },
  { pattern: /CHATR/i, merchant: 'Chatr', accountCode: '489', confidence: 95 },
  { pattern: /FREEDOM\s*MOBILE/i, merchant: 'Freedom Mobile', accountCode: '489', confidence: 95 },
  
  // Utilities
  { pattern: /ENMAX/i, merchant: 'Enmax', accountCode: '442', confidence: 95 },
  { pattern: /EPCOR/i, merchant: 'Epcor', accountCode: '442', confidence: 95 },
  { pattern: /ATCO\s*GAS/i, merchant: 'ATCO Gas', accountCode: '442', confidence: 95 },
  { pattern: /DIRECT\s*ENERGY/i, merchant: 'Direct Energy', accountCode: '442', confidence: 95 },
  { pattern: /ALTA\s*GAS/i, merchant: 'Alta Gas', accountCode: '442', confidence: 95 },
  { pattern: /ATCO\s*ELECTRIC/i, merchant: 'ATCO Electric', accountCode: '442', confidence: 95 },
  { pattern: /FORTIS\s*ALBERTA/i, merchant: 'Fortis Alberta', accountCode: '442', confidence: 95 },
  
  // NEW: Utilities from training data
  { pattern: /COLD\s*LAKE\s*UTIL/i, merchant: 'Cold Lake Utilities', accountCode: '442', confidence: 95 },
  { pattern: /BONNYVILLE\s*UTIL/i, merchant: 'Bonnyville Utilities', accountCode: '442', confidence: 95 },
  { pattern: /ST\s*PAUL\s*UTIL/i, merchant: 'St. Paul Utilities', accountCode: '442', confidence: 95 },
  
  // =============================================================================
  // PROFESSIONAL SERVICES (High Confidence)
  // =============================================================================
  
  { pattern: /LAWYER/i, merchant: 'Legal Services', accountCode: '412', confidence: 95 },
  { pattern: /ACCOUNTANT/i, merchant: 'Accounting Services', accountCode: '412', confidence: 95 },
  { pattern: /CONSULTANT/i, merchant: 'Consulting Services', accountCode: '412', confidence: 90 },
  { pattern: /DENTIST/i, merchant: 'Dental Services', accountCode: '453', confidence: 95 },
  { pattern: /DOCTOR/i, merchant: 'Medical Services', accountCode: '453', confidence: 95 },
  { pattern: /PHARMACY/i, merchant: 'Pharmacy', accountCode: '453', confidence: 82 },
  { pattern: /DRUGSTORE/i, merchant: 'Drugstore', accountCode: '453', confidence: 80 },
  { pattern: /GROCERY/i, merchant: 'Grocery Store', accountCode: '453', confidence: 78 },
  { pattern: /SUPERMARKET/i, merchant: 'Supermarket', accountCode: '453', confidence: 78 },
  
  // Generic Services
  { pattern: /INSURANCE/i, merchant: 'Insurance', accountCode: '433', confidence: 85 },
  { pattern: /LEGAL/i, merchant: 'Legal Services', accountCode: '412', confidence: 80 },
  { pattern: /ACCOUNTING/i, merchant: 'Accounting Services', accountCode: '412', confidence: 85 },
  { pattern: /CONSULTING/i, merchant: 'Consulting', accountCode: '412', confidence: 80 },

  // =============================================================================
  // CUSTOM BUSINESS PATTERNS - ADD YOUR OWN HERE!
  // =============================================================================
  
  // Example: Local businesses you frequently use
  { pattern: /YOUR\s*LOCAL\s*RESTAURANT/i, merchant: 'Local Restaurant', accountCode: '420', confidence: 95 },
  { pattern: /FAVORITE\s*MECHANIC/i, merchant: 'Auto Repair Shop', accountCode: '449', confidence: 90 },
  { pattern: /OFFICE\s*RENT/i, merchant: 'Office Landlord', accountCode: '469', confidence: 98 },
  
  // Example: Subscription services
  { pattern: /ZOOM/i, merchant: 'Zoom', accountCode: '485', confidence: 92 },
  { pattern: /SLACK/i, merchant: 'Slack', accountCode: '485', confidence: 92 },
  { pattern: /QUICKBOOKS/i, merchant: 'QuickBooks', accountCode: '485', confidence: 95 },
  
  // Example: Professional services
  { pattern: /LAWYER\s*FEES/i, merchant: 'Legal Fees', accountCode: '412', confidence: 95 },
  { pattern: /ACCOUNTANT/i, merchant: 'Accountant', accountCode: '412', confidence: 90 },
  
  // Example: Travel & accommodation
  { pattern: /HOTEL/i, merchant: 'Hotel', accountCode: '493', confidence: 85 },
  { pattern: /AIRBNB/i, merchant: 'Airbnb', accountCode: '493', confidence: 90 },
  { pattern: /BOOKING\.COM/i, merchant: 'Booking.com', accountCode: '493', confidence: 88 },
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

export const getMerchantAccountCodes = (): string[] => {
  const accountCodes = new Set(MERCHANT_PATTERNS.map(p => p.accountCode));
  return Array.from(accountCodes).sort();
};

export const getPatternsByAccountCode = (accountCode: string): MerchantPattern[] => {
  return MERCHANT_PATTERNS.filter(p => p.accountCode === accountCode);
};

// Default export for backwards compatibility
export default MERCHANT_PATTERNS; 