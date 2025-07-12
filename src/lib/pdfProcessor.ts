// Only import PDF.js on the client side
let pdfjsLib: any = null;

if (typeof window !== 'undefined') {
  // Dynamic import to avoid SSR issues
  import('pdfjs-dist').then((module) => {
    pdfjsLib = module;
    // Set up PDF.js worker to use the static worker file in public
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    
    // Test the parsing logic with known data
    const processor = new PDFProcessor();
    processor.testParsingWithKnownData();
  }).catch((error) => {
    console.error('Failed to load PDF.js:', error);
  });
}

export interface PDFExtractionResult {
  text: string;
  lines: string[];
  success: boolean;
  error?: string;
}

export class PDFProcessor {
  async extractTextFromPDF(file: File): Promise<PDFExtractionResult> {
    try {
      // Check if we're on the client side
      if (typeof window === 'undefined') {
        return {
          text: '',
          lines: [],
          success: false,
          error: 'PDF processing is only available on the client side'
        };
      }

      // Wait for PDF.js to be loaded
      if (!pdfjsLib) {
        await new Promise(resolve => {
          const checkPdfJs = () => {
            if (pdfjsLib) {
              resolve(true);
            } else {
              setTimeout(checkPdfJs, 100);
            }
          };
          checkPdfJs();
        });
      }

      // Convert File to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Load PDF document
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      let fullText = '';
      const allLines: string[] = [];
      
      // Extract text from all pages
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Extract text items and organize them by position
        const textItems = textContent.items.map((item: any) => ({
          text: item.str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width,
          height: item.height
        }));
        
        // Sort by Y position (top to bottom) and then by X position (left to right)
        textItems.sort((a: any, b: any) => {
          if (Math.abs(a.y - b.y) < 5) { // Same line if Y difference is small
            return a.x - b.x;
          }
          return b.y - a.y; // Higher Y values are at the top
        });
        
        // Group text items into lines
        const lines: string[] = [];
        let currentLine = '';
        let lastY = -1;
        
        for (const item of textItems) {
          if (lastY === -1 || Math.abs(item.y - lastY) < 5) {
            // Same line
            currentLine += item.text + ' ';
          } else {
            // New line
            if (currentLine.trim()) {
              lines.push(currentLine.trim());
            }
            currentLine = item.text + ' ';
          }
          lastY = item.y;
        }
        
        // Add the last line
        if (currentLine.trim()) {
          lines.push(currentLine.trim());
        }
        
        allLines.push(...lines);
        fullText += lines.join('\n') + '\n';
      }
      
      return {
        text: fullText,
        lines: allLines,
        success: true
      };
      
    } catch (error) {
      console.error('PDF extraction error:', error);
      return {
        text: '',
        lines: [],
        success: false,
        error: error instanceof Error ? error.message : 'Failed to extract text from PDF'
      };
    }
  }
  
  async convertPDFToCSV(file: File): Promise<{ csvText: string; success: boolean; error?: string }> {
    try {
      const extraction = await this.extractTextFromPDF(file);
      
      if (!extraction.success) {
        return {
          csvText: '',
          success: false,
          error: extraction.error
        };
      }
      
      // Debug: Log extracted lines to console
      if (typeof window !== 'undefined') {
        console.log('Extracted PDF lines:', extraction.lines);
        console.log('Number of lines extracted:', extraction.lines.length);
      }
      
      // Parse the extracted text to find transaction data
      const transactions = this.parseBankStatementText(extraction.lines);
      
      // Debug: Log found transactions
      if (typeof window !== 'undefined') {
        console.log('Found transactions:', transactions);
        console.log('Number of transactions found:', transactions.length);
        
        // Log sample transactions for quality check
        if (transactions.length > 0) {
          console.log('Sample transactions:');
          transactions.slice(0, 3).forEach((tx, index) => {
            console.log(`${index + 1}. Date: ${tx.date}, Amount: ${tx.amount}, Description: "${tx.description}"`);
          });
        }
      }
      
      if (transactions.length === 0) {
        return {
          csvText: '',
          success: false,
          error: 'No transaction data found in the PDF. Please ensure this is a bank statement with transaction details.'
        };
      }
      
      // Convert to CSV format
      const csvText = this.transactionsToCSV(transactions);
      
      return {
        csvText,
        success: true
      };
      
    } catch (error) {
      console.error('PDF to CSV conversion error:', error);
      return {
        csvText: '',
        success: false,
        error: error instanceof Error ? error.message : 'Failed to convert PDF to CSV'
      };
    }
  }
  
  // Test function to verify parsing logic
  testParsingWithKnownData(): void {
    if (typeof window !== 'undefined') {
      const testLines = [
        'Date,Description,Amount',
        '30/12/2022,BALANCE FORWARD,26414.94',
        '03/01/2023,TDMS STMT DEC BUS,-64.12',
        '06/01/2023,JW374 TFR-TO C/C,-1000.00',
        '09/01/2023,SEND E-TFR,-1100.00',
        '09/01/2023,DOMINION PREM MSP,-316.90'
      ];
      
      // Testing parsing with known data
      
      const transactions = this.parseBankStatementText(testLines);
      console.log('Parsed transactions:', transactions);
      console.log('Number of transactions found:', transactions.length);
    }
  }
  
  private parseBankStatementText(lines: string[]): Array<{ date: string; description: string; amount: string }> {
    const transactions: Array<{ date: string; description: string; amount: string }> = [];
    
    // Debug: Log first few lines to understand format
    if (typeof window !== 'undefined') {
      console.log('=== PDF PARSING DEBUG INFO ===');
      console.log(`Total lines extracted: ${lines.length}`);
      console.log('First 20 lines for parsing:');
      lines.slice(0, 20).forEach((line, index) => {
        console.log(`${index + 1}: "${line}"`);
      });
      console.log('=====================================');
    }
    
    // Enhanced date patterns - more flexible
    const datePatterns = [
      // Standard formats
      /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/g, // DD/MM/YYYY or MM/DD/YYYY
      /(\d{4})-(\d{1,2})-(\d{1,2})/g, // YYYY-MM-DD
      /(\d{1,2})-(\d{1,2})-(\d{2,4})/g, // DD-MM-YYYY
      /(\d{1,2})\/(\d{1,2})\/(\d{2})/g, // DD/MM/YY or MM/DD/YY
      
      // Month abbreviations
      /(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*(\d{2,4})?/gi,
      /(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*(\d{1,2}),?\s*(\d{2,4})?/gi,
      /(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(\d{1,2})/gi,
      
      // Variations with dots
      /(\d{1,2})\.(\d{1,2})\.(\d{2,4})/g, // DD.MM.YYYY
      /(\d{4})\.(\d{1,2})\.(\d{1,2})/g, // YYYY.MM.DD
      
      // Variations with spaces
      /(\d{1,2})\s+(\d{1,2})\s+(\d{2,4})/g, // DD MM YYYY
      /(\d{2,4})\s+(\d{1,2})\s+(\d{1,2})/g, // YYYY MM DD
    ];
    
    // Enhanced amount patterns - more flexible
    const amountPatterns = [
      // Standard currency formats
      /\$?\s*([+-]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g, // $1,234.56 or 1,234.56
      /([+-]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:CR|DR)?/gi, // 1,234.56 CR/DR
      /([+-]?\d+(?:\.\d{2})?)/g, // Simple amounts like 123.45
      
      // Special formats
      /\(\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*\)/g, // (1,234.56) - negative amounts
      /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*-/g, // 1,234.56- - negative amounts
      /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g, // $ 1,234.56
    ];
    
    let processedCount = 0;
    let skippedCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line || line.length < 5) {
        continue;
      }
      
      // Skip obvious header/summary lines but be more lenient
      if (this.isHeaderOrSummaryLineEnhanced(line)) {
        skippedCount++;
        continue;
      }
      
      // Try to find date patterns
      let dateMatch = null;
      let foundDate = '';
      
      for (const pattern of datePatterns) {
        pattern.lastIndex = 0; // Reset regex
        const match = pattern.exec(line);
        if (match) {
          dateMatch = match;
          foundDate = match[0];
          break;
        }
      }
      
      if (!dateMatch) {
        continue;
      }
      
      // Try to find amount patterns
      let amountMatch = null;
      let foundAmount = '';
      
      for (const pattern of amountPatterns) {
        pattern.lastIndex = 0; // Reset regex
        const match = pattern.exec(line);
        if (match) {
          amountMatch = match;
          foundAmount = match[1] || match[0];
          break;
        }
      }
      
      if (!amountMatch) {
        continue;
      }
      
      // Extract description (everything else)
      let description = line;
      
      // Remove the date from the line
      description = description.replace(foundDate, '').trim();
      
      // Remove the amount from the line
      description = description.replace(foundAmount, '').trim();
      description = description.replace(/^\$/, '').trim(); // Remove $ signs
      description = description.replace(/\s+/g, ' ').trim(); // Normalize whitespace
      
      // Clean up description
      description = description.replace(/^[-.,|:;]\s*/, ''); // Remove leading punctuation
      description = description.replace(/[-.,|:;]\s*$/, ''); // Remove trailing punctuation
      description = description.replace(/^\s*\d+\s*$/, ''); // Remove standalone numbers
      description = description.trim();
      
      // More lenient validation
      if (description.length >= 2 && this.isValidTransactionEnhanced(description, foundAmount, foundDate)) {
        // Normalize the date
        const normalizedDate = this.normalizeDateEnhanced(foundDate);
        
        // Determine transaction sign
        const finalAmount = this.determineTransactionSign(description, foundAmount);
        
        transactions.push({
          date: normalizedDate,
          description: description,
          amount: finalAmount
        });
        
        // Debug: Log successful transaction parsing
        if (typeof window !== 'undefined' && processedCount < 10) {
          console.log(`✅ Parsed transaction ${processedCount + 1}:`, {
            lineNumber: i + 1,
            originalLine: line,
            foundDate,
            normalizedDate,
            description,
            foundAmount,
            finalAmount
          });
        }
        processedCount++;
      }
    }
    
    // Debug: Log comprehensive summary
    if (typeof window !== 'undefined') {
      console.log('=== PDF PARSING SUMMARY ===');
      console.log(`Total lines processed: ${lines.length}`);
      console.log(`Lines skipped (headers/summaries): ${skippedCount}`);
      console.log(`Valid transactions found: ${transactions.length}`);
      console.log('===============================');
      
      if (transactions.length === 0) {
        console.log('❌ No transactions found. This could be due to:');
        console.log('1. The PDF format is not recognized');
        console.log('2. The PDF contains only account summaries, not transaction details');
        console.log('3. The date/amount patterns are too different from expected formats');
        console.log('');
        console.log('Sample lines that were NOT parsed:');
        lines.slice(0, 10).forEach((line, index) => {
          if (line.trim() && !this.isHeaderOrSummaryLineEnhanced(line)) {
            console.log(`${index + 1}: "${line}"`);
          }
        });
      }
    }
    
    return transactions;
  }

  private isHeaderOrSummaryLineEnhanced(line: string): boolean {
    const lowerLine = line.toLowerCase();
    
    // Skip common header/summary keywords - but be more lenient
    const skipKeywords = [
      'statement period', 'account number', 'account summary', 'page',
      'customer service', 'branch', 'transit', 'institution',
      'opening balance', 'closing balance', 'beginning balance', 'ending balance',
      'total deposits', 'total withdrawals', 'total debits', 'total credits',
      'service charges', 'interest earned', 'summary of account activity',
      'account details', 'contact information', 'important notices'
    ];
    
    // Skip lines that are too short (likely headers)
    if (line.trim().length < 8) {
      return true;
    }
    
    // Skip lines that are mostly uppercase and look like headers
    if (line === line.toUpperCase() && line.length < 50) {
      return true;
    }
    
    // Check for header keywords
    const keywordCount = skipKeywords.filter(keyword => lowerLine.includes(keyword)).length;
    if (keywordCount > 0) {
      return true;
    }
    
    // Skip lines that are just "Date Description Amount" or similar
    if (lowerLine.includes('date') && lowerLine.includes('description') && lowerLine.includes('amount')) {
      return true;
    }
    
    return false;
  }
  
  private isValidTransactionEnhanced(description: string, amount: string, date: string): boolean {
    // More lenient validation
    
    // Skip if description is too short
    if (description.length < 2) {
      return false;
    }
    
    // Skip obvious non-transaction descriptions
    const invalidKeywords = [
      'page', 'continued', 'subtotal', 'total', 'summary',
      'account number', 'statement period', 'branch', 'transit'
    ];
    
    const lowerDesc = description.toLowerCase();
    const hasInvalidKeyword = invalidKeywords.some(keyword => lowerDesc.includes(keyword));
    
    if (hasInvalidKeyword) {
      return false;
    }
    
    // Validate amount format - more flexible
    const cleanAmount = amount.replace(/[,$\s]/g, '');
    const amountRegex = /^[+-]?\d+\.?\d*$/;
    if (!amountRegex.test(cleanAmount)) {
      return false;
    }
    
    // Don't validate date format too strictly - just check if it looks like a date
    if (!date || date.length < 3) {
      return false;
    }
    
    return true;
  }
  
  private normalizeDateEnhanced(dateStr: string): string {
    // Handle various date formats more flexibly
    const monthMap: { [key: string]: string } = {
      'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
      'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
      'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
    };
    
    const currentYear = new Date().getFullYear();
    
    // Handle month abbreviations
    const monthAbbrevMatch = dateStr.match(/(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*(\d{2,4})?/i);
    if (monthAbbrevMatch) {
      const day = monthAbbrevMatch[1].padStart(2, '0');
      const month = monthMap[monthAbbrevMatch[2].toUpperCase()];
      const year = monthAbbrevMatch[3] || currentYear.toString();
      return `${day}/${month}/${year}`;
    }
    
    // Handle other patterns
    const patterns = [
      { regex: /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/, format: 'DD/MM/YYYY' },
      { regex: /(\d{4})-(\d{1,2})-(\d{1,2})/, format: 'YYYY-MM-DD' },
      { regex: /(\d{1,2})-(\d{1,2})-(\d{2,4})/, format: 'DD-MM-YYYY' },
      { regex: /(\d{1,2})\.(\d{1,2})\.(\d{2,4})/, format: 'DD.MM.YYYY' }
    ];
    
    for (const pattern of patterns) {
      const match = dateStr.match(pattern.regex);
      if (match) {
        let day, month, year;
        
        if (pattern.format === 'DD/MM/YYYY' || pattern.format === 'DD-MM-YYYY' || pattern.format === 'DD.MM.YYYY') {
          day = match[1].padStart(2, '0');
          month = match[2].padStart(2, '0');
          year = match[3];
        } else if (pattern.format === 'YYYY-MM-DD') {
          year = match[1];
          month = match[2].padStart(2, '0');
          day = match[3].padStart(2, '0');
        }
        
        // Handle 2-digit years
        if (year && year.length === 2) {
          year = '20' + year;
        }
        
        return `${day}/${month}/${year}`;
      }
    }
    
    return dateStr; // Return as-is if no pattern matches
  }
  
  private determineTransactionSign(description: string, amount: string): string {
    const lowerDesc = description.toLowerCase();
    
    // Convert amount to number for processing
    const numericAmount = Math.abs(parseFloat(amount.replace(/[^0-9.-]/g, '')));
    
    // Keywords that typically indicate INFLOWS (should be positive)
    const inflowKeywords = [
      'deposit', 'credit', 'refund', 'return', 'rebate', 'cashback', 'cash back',
      'payment received', 'incoming transfer', 'salary', 'payroll', 'wage',
      'interest earned', 'dividend', 'bonus', 'settlement', 'reimbursement',
      'tax refund', 'government payment', 'federal payment', 'insurance claim',
      'loan proceeds', 'deposit slip', 'wire transfer in', 'ach credit',
      'direct deposit', 'check deposit', 'mobile deposit', 'atm deposit'
    ];
    
    // Keywords that typically indicate OUTFLOWS (should be negative)  
    const outflowKeywords = [
      'withdrawal', 'purchase', 'payment', 'transfer', 'fee', 'charge', 'debit',
      'atm', 'pos', 'point of sale', 'check', 'cheque', 'bill payment', 'autopay',
      'pre-authorized', 'paypal', 'e-transfer', 'interac', 'wire transfer',
      'service charge', 'monthly fee', 'overdraft', 'nsf', 'interest charge',
      'loan payment', 'mortgage', 'credit card', 'insurance premium', 'tax payment',
      'subscription', 'membership', 'utility', 'rent', 'gas', 'grocery', 'restaurant',
      'amazon', 'walmart', 'costco', 'shoppers', 'loblaws', 'metro', 'sobeys',
      'tim hortons', 'starbucks', 'mcdonalds', 'shell', 'esso', 'petro-canada',
      'canadian tire', 'home depot', 'rona', 'ikea', 'best buy'
    ];
    
    // Check for inflow keywords first (these are less common, so prioritize them)
    const hasInflowKeyword = inflowKeywords.some(keyword => lowerDesc.includes(keyword));
    
    // Check for outflow keywords
    const hasOutflowKeyword = outflowKeywords.some(keyword => lowerDesc.includes(keyword));
    
    // Special handling for specific patterns
    if (lowerDesc.includes('balance forward')) {
      return numericAmount.toString(); // Opening balances are typically positive
    }
    
    // If amount already has a negative sign, preserve it
    if (amount.includes('-')) {
      return `-${numericAmount}`;
    }
    
    // If amount already has a positive sign, preserve it  
    if (amount.includes('+')) {
      return numericAmount.toString();
    }
    
    // Apply logic based on keywords
    if (hasInflowKeyword && !hasOutflowKeyword) {
      return numericAmount.toString(); // Positive for inflows
    }
    
    if (hasOutflowKeyword && !hasInflowKeyword) {
      return `-${numericAmount}`; // Negative for outflows
    }
    
    // Default assumption: Most bank statement transactions are outflows (expenses)
    // This is the typical case for personal/business banking
    return `-${numericAmount}`;
  }
  
  private transactionsToCSV(transactions: Array<{ date: string; description: string; amount: string }>): string {
    const csvLines = ['Date,Description,Amount'];
    
    for (const tx of transactions) {
      // Escape description if it contains commas or quotes
      let description = tx.description;
      if (description.includes(',') || description.includes('"')) {
        description = `"${description.replace(/"/g, '""')}"`;
      }
      
      csvLines.push(`${tx.date},${description},${tx.amount}`);
    }
    
    return csvLines.join('\n');
  }
} 