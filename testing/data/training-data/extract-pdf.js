const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

async function extractPDFText() {
  try {
    const pdfPath = path.join(__dirname, '..', 'Chequing Statement-7563 2024-01-09.pdf');
    const dataBuffer = fs.readFileSync(pdfPath);
    
    const data = await pdfParse(dataBuffer);
    console.log('PDF Text (first 1000 characters):');
    console.log('='.repeat(50));
    console.log(data.text.substring(0, 1000));
    console.log('='.repeat(50));
    console.log('\nTotal pages:', data.numpages);
    console.log('Total characters:', data.text.length);
    
    // Save the full text to a file for analysis
    fs.writeFileSync('pdf_extracted_text.txt', data.text);
    console.log('\nFull text saved to pdf_extracted_text.txt');
    
  } catch (error) {
    console.error('Error extracting PDF:', error);
  }
}

extractPDFText(); 