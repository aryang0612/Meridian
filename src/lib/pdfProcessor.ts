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
      console.log('First 10 lines for parsing:');
      lines.slice(0, 10).forEach((line, index) => {
        console.log(`${index + 1}: "${line}"`);
      });
    }
    
    // RBC-specific date patterns
    const rbcDatePatterns = [
      /(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)/i, // 11 Dec, 15 Jan, etc.
    ];
    
    // More flexible date patterns - including month abbreviations
    const datePatterns = [
      /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/, // DD/MM/YYYY or MM/DD/YYYY
      /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
      /(\d{1,2})-(\d{1,2})-(\d{2,4})/, // DD-MM-YYYY
      /(\d{1,2})\/(\d{1,2})\/(\d{2})/, // DD/MM/YY or MM/DD/YY
      /(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(\d{1,2})/, // MAY02, JAN15, etc.
    ];
    
    // RBC-specific amount patterns for separate withdrawal/deposit columns
    const rbcAmountPatterns = [
      /([-+]?[\d,]+\.?\d*)\s*,\s*$/, // Withdrawal amount at end (e.g., "12.00,")
      /,\s*([-+]?[\d,]+\.?\d*)\s*$/, // Deposit amount at end (e.g., ",600.00")
      /,\s*([-+]?[\d,]+\.?\d*)\s*,/, // Deposit amount in middle (e.g., ",600.00,")
      /([-+]?[\d,]+\.?\d*)\s*,\s*[-+]?[\d,]*\.?\d*\s*$/, // Withdrawal followed by balance
      /,\s*([-+]?[\d,]+\.?\d*)\s*,\s*[-+]?[\d,]*\.?\d*\s*$/, // Deposit followed by balance
      /([-+]?[\d,]+\.?\d*)\s*$/, // Any amount at end
    ];
    
    // More flexible amount patterns
    const amountPatterns = [
      /([-+]?[\d,]+\.?\d*)\s*[A-Z]{3}\d{1,2}/, // Amount followed by date like "2,500.00 MAY04"
      /([-+]?[\d,]+\.?\d*)\s*$/, // Amount at end with optional spaces
      /([-+]?[\d,]+\.?\d*)/, // Any amount in line
    ];
    
    // Add new regex patterns for more PDF layouts
    const ADDITIONAL_DATE_PATTERNS = [
      // e.g., 2023-05-01, 01-05-2023, 01.05.2023, 2023/05/01
      /\b\d{4}[-\/.]\d{2}[-\/.]\d{2}\b/, // YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
      /\b\d{2}[-\/.]\d{2}[-\/.]\d{4}\b/, // DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY
      /\b\d{2}[-\/.]\d{2}[-\/.]\d{2}\b/, // DD-MM-YY, DD/MM/YY, DD.MM.YY
      // e.g., 1 May 2023, May 1, 2023
      /\b\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}\b/,
      /\b[A-Za-z]{3,9}\s+\d{1,2},\s+\d{4}\b/
    ];
    
    let processedCount = 0;
    
    for (const line of lines) {
      // Skip header lines, balance lines, and summary lines
      if (this.isHeaderOrSummaryLine(line)) {
        continue;
      }
      
      // First try RBC-specific date pattern
      let dateMatch = null;
      let datePattern = null;
      let isRbcFormat = false;
      
      for (const pattern of rbcDatePatterns) {
        dateMatch = line.match(pattern);
        if (dateMatch) {
          datePattern = pattern;
          isRbcFormat = true;
          break;
        }
      }
      
      if (!dateMatch) {
        // Try regular date patterns
        for (const pattern of datePatterns) {
          dateMatch = line.match(pattern);
          if (dateMatch) {
            datePattern = pattern;
            break;
          }
        }
      }
      
      if (!dateMatch) {
        // Try additional date patterns
        for (const additionalPattern of ADDITIONAL_DATE_PATTERNS) {
          dateMatch = line.match(additionalPattern);
          if (dateMatch) {
            datePattern = additionalPattern;
            break;
          }
        }
      }
      
      if (!dateMatch) continue;
      
      // Extract date and handle month abbreviations
      let date = dateMatch[0];
      if (isRbcFormat) {
        // Handle RBC format: "11 Dec" -> "11/12/2024" (assuming current year)
        const day = dateMatch[1];
        const month = dateMatch[2].toUpperCase();
        const monthMap: { [key: string]: string } = {
          'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
          'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
          'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
        };
        const monthNum = monthMap[month] || '01';
        const currentYear = new Date().getFullYear();
        date = `${day}/${monthNum}/${currentYear}`;
      } else if (datePattern && datePattern.toString().includes('JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC')) {
        const monthMap: { [key: string]: string } = {
          'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
          'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
          'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
        };
        const month = date.substring(0, 3);
        const day = date.substring(3);
        const monthNum = monthMap[month] || '01';
        date = `${day}/${monthNum}/2022`; // Assuming 2022 based on your data
      }
      
      // Look for amount - try RBC patterns first if it's RBC format
      let amountMatch = null;
      if (isRbcFormat) {
        for (const pattern of rbcAmountPatterns) {
          amountMatch = line.match(pattern);
          if (amountMatch) break;
        }
      }
      
      if (!amountMatch) {
        // Try regular amount patterns
        for (const pattern of amountPatterns) {
          amountMatch = line.match(pattern);
          if (amountMatch) break;
        }
      }
      
      if (!amountMatch) continue;
      
      const amount = amountMatch[1];
      
      // Extract description (everything except date and amount)
      let description = line;
      
      // Remove the date from the line
      description = description.replace(dateMatch[0], '').trim();
      
      // Remove the amount from the line - be more careful to avoid partial matches
      try {
        const escapedAmount = amount.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const amountRegex = new RegExp(`\\b${escapedAmount}\\b`);
        description = description.replace(amountRegex, '').trim();
      } catch (regexError) {
        console.warn('Regex error with amount:', amount, regexError);
        // Fallback: simple string replacement
        description = description.replace(amount, '').trim();
      }
      
      // Clean up description more thoroughly
      description = description.replace(/^\s*[-.,|]\s*/, ''); // Remove leading punctuation
      description = description.replace(/[-.,|]\s*$/, ''); // Remove trailing punctuation
      description = description.replace(/\s+/, ' '); // Normalize whitespace
      description = description.replace(/^\s*[0-9]+\s*$/, ''); // Remove standalone numbers
      description = description.trim();
      
      if (description.length > 2 && this.isValidTransaction(description, amount, date)) {
        transactions.push({
          date: this.normalizeDate(date),
          description,
          amount
        });
        
        // Debug: Log successful transaction parsing
        if (typeof window !== 'undefined' && processedCount < 5) {
          console.log(`Parsed transaction ${processedCount + 1}:`, {
            originalLine: line,
            date: this.normalizeDate(date),
            description,
            amount,
            isRbcFormat
          });
        }
        processedCount++;
      }
    }
    
    // Debug: Log summary
    if (typeof window !== 'undefined') {
      console.log(`Parsing complete. Found ${transactions.length} transactions from ${processedCount} processed lines.`);
    }
    
    return transactions;
  }
  
  private isHeaderOrSummaryLine(line: string): boolean {
    const lowerLine = line.toLowerCase();
    
    // Skip common header/summary keywords - but be more specific
    const skipKeywords = [
      'statement period', 'account number', 'date description amount',
      'balance forward', 'page', 'summary', 'total', 'bank branch',
      'customer service', 'service charge', 'opening balance'
    ];
    
    // Only skip if the line contains multiple header keywords or is clearly a header
    const keywordCount = skipKeywords.filter(keyword => lowerLine.includes(keyword)).length;
    
    // Also skip lines that are too short (likely headers) - but be more lenient for RBC format
    if (line.trim().length < 5) {
      return true;
    }
    
    // Skip lines that are all uppercase and contain typical header words
    if (line === line.toUpperCase() && (lowerLine.includes('date') || lowerLine.includes('amount'))) {
      return true;
    }
    
    // Skip lines that are just "Opening Balance" or similar
    if (lowerLine.trim() === 'opening balance') {
      return true;
    }
    
    return keywordCount >= 2; // Only skip if multiple header keywords are found
  }
  
  private isValidTransaction(description: string, amount: string, date: string): boolean {
    // Skip transactions that are likely not real transactions
    const invalidKeywords = [
      'balance', 'forward', 'page', 'summary', 'total', 'statement',
      'account', 'number', 'branch', 'customer', 'service'
    ];
    
    const lowerDesc = description.toLowerCase();
    const hasInvalidKeyword = invalidKeywords.some(keyword => lowerDesc.includes(keyword));
    
    // Skip if description is too short or contains invalid keywords
    if (description.length < 3 || hasInvalidKeyword) {
      return false;
    }
    
    // Validate amount format
    const amountRegex = /^[-+]?[\d,]+\.?\d*$/;
    if (!amountRegex.test(amount)) {
      return false;
    }
    
    // Validate date format
    const dateRegex = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
    if (!dateRegex.test(date)) {
      return false;
    }
    
    return true;
  }
  
  private normalizeDate(dateStr: string): string {
    // Convert various date formats to DD/MM/YYYY
    const patterns = [
      { regex: /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/, format: 'DD/MM/YYYY' },
      { regex: /(\d{4})-(\d{1,2})-(\d{1,2})/, format: 'YYYY-MM-DD' },
      { regex: /(\d{1,2})-(\d{1,2})-(\d{2,4})/, format: 'DD-MM-YYYY' }
    ];
    
    for (const pattern of patterns) {
      const match = dateStr.match(pattern.regex);
      if (match) {
        if (pattern.format === 'DD/MM/YYYY') {
          return dateStr; // Already in correct format
        } else if (pattern.format === 'YYYY-MM-DD') {
          const [, year, month, day] = match;
          return `${day}/${month}/${year}`;
        } else if (pattern.format === 'DD-MM-YYYY') {
          const [, day, month, year] = match;
          return `${day}/${month}/${year}`;
        }
      }
    }
    
    return dateStr; // Return as-is if no pattern matches
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