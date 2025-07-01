import { Transaction } from './types';

export const SAMPLE_TRANSACTIONS: Transaction[] = [
  {
    id: 'test_1',
    date: '2024-01-15',
    description: 'POS PURCHASE TIM HORTONS #0183 TORONTO ON CA',
    originalDescription: 'POS PURCHASE TIM HORTONS #0183 TORONTO ON CA',
    amount: -12.47,
    confidence: 0,
    isApproved: false,
    isManuallyEdited: false
  },
  {
    id: 'test_2',
    date: '2024-01-15',
    description: 'SHELL #4567 MISSISSAUGA ON CA',
    originalDescription: 'SHELL #4567 MISSISSAUGA ON CA',
    amount: -45.00,
    confidence: 0,
    isApproved: false,
    isManuallyEdited: false
  },
  {
    id: 'test_3',
    date: '2024-01-16',
    description: 'MONTHLY SERVICE CHARGE',
    originalDescription: 'MONTHLY SERVICE CHARGE',
    amount: -16.95,
    confidence: 0,
    isApproved: false,
    isManuallyEdited: false
  },
  {
    id: 'test_4',
    date: '2024-01-16',
    description: 'AMAZON.CA ORDER 123-4567890',
    originalDescription: 'AMAZON.CA ORDER 123-4567890',
    amount: -29.99,
    confidence: 0,
    isApproved: false,
    isManuallyEdited: false
  },
  {
    id: 'test_5',
    date: '2024-01-17',
    description: 'PAYROLL DEPOSIT COMPANY XYZ',
    originalDescription: 'PAYROLL DEPOSIT COMPANY XYZ',
    amount: 2500.00,
    confidence: 0,
    isApproved: false,
    isManuallyEdited: false
  }
];

export const testAIEngine = async () => {
  const { AIEngine } = await import('./aiEngine');
  const aiEngine = new AIEngine();
  
  console.log('🧪 Testing AI Engine with sample transactions...\n');
  
  const results = await aiEngine.categorizeBatch(SAMPLE_TRANSACTIONS);
  
  results.forEach((transaction, index) => {
    console.log(`Transaction ${index + 1}:`);
    console.log(`  Description: ${transaction.description}`);
    console.log(`  Merchant: ${transaction.merchant || 'Unknown'}`);
    console.log(`  Category: ${transaction.category || 'Uncategorized'}`);
    console.log(`  Confidence: ${transaction.confidence}%`);
    console.log('');
  });
  
}; 