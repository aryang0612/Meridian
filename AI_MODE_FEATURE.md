# AI Mode Feature - Auto-ChatGPT Categorization

## Overview

The AI Mode feature enables automatic categorization of uncategorized transactions using OpenAI's ChatGPT API. When enabled, the system will automatically process transactions that couldn't be categorized by the built-in pattern matching system.

## How It Works

### 1. **AI Mode Toggle**
- Located in the upload section of the main dashboard
- Toggle between "Auto-ChatGPT ON" and "Manual Only" modes
- Default: Enabled (ON)

### 2. **Processing Flow**
When AI Mode is enabled and a CSV file is uploaded:

1. **Phase 1**: Standard CSV parsing and validation (0-50% progress)
2. **Phase 2**: Built-in AI categorization using pattern matching (50-95% progress)  
3. **Phase 3**: **NEW** - Auto-ChatGPT for uncategorized transactions (96-99% progress)

### 3. **Auto-ChatGPT Criteria**
Transactions are sent to ChatGPT if:
- No account code assigned, OR
- Account code is "453" (default fallback) with confidence < 70%

### 4. **Processing Details**
- **Batch Processing**: Processes up to 3 transactions simultaneously
- **Rate Limiting**: 1-second delay between batches to avoid API limits
- **Error Handling**: Graceful fallback if ChatGPT API fails
- **Progress Tracking**: Real-time progress updates during processing

## Technical Implementation

### Files Modified
- `src/app/page.tsx` - Added AI mode toggle UI and state
- `src/components/FileUpload.tsx` - Pass AI mode to CSV processor
- `src/lib/csvProcessor.ts` - Added auto-ChatGPT processing logic

### Key Features
- **Safe Implementation**: Only processes truly uncategorized transactions
- **Cost Effective**: Minimal API calls (only for failed categorizations)
- **User Control**: Easy toggle to disable feature
- **Performance**: Non-blocking processing with progress updates

## Usage Examples

### Example Transactions (AI Mode ON)
```csv
Date,Description,Amount
2024-01-15,UNKNOWN MERCHANT LOCATION,-25.00
2024-01-16,WEIRD BUSINESS NAME INC,-89.99
2024-01-17,POINT OF SALE PURCHASE MYSTERY STORE,-45.75
```

**Result**: These transactions will be automatically sent to ChatGPT for categorization

### Example Transactions (AI Mode OFF)
Same transactions will remain uncategorized and require manual assignment.

## Benefits

### ✅ **Advantages**
- **Higher Accuracy**: ChatGPT provides 90-100% confidence categorizations
- **Time Saving**: Reduces manual categorization work
- **Smart Processing**: Only processes transactions that truly need help
- **Cost Efficient**: Minimal API usage (only for uncategorized transactions)

### ⚠️ **Considerations**
- **API Costs**: Each ChatGPT call has a cost (minimal for typical usage)
- **Processing Time**: Additional 1-3 seconds per uncategorized transaction
- **Internet Required**: Requires active internet connection for ChatGPT API

## Configuration

No additional configuration required. The feature uses the existing OpenAI API key configured in the system environment variables.

## Testing

A test CSV file has been created at `test-ai-mode.csv` with various transaction types to verify the functionality works correctly.

---

**Implementation Date**: January 2025  
**Status**: ✅ Complete and Ready for Use 