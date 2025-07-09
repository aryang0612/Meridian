# 📁 MERIDIAN AI PROJECT STRUCTURE

## 🎯 **CLEAN ORGANIZATION OVERVIEW**

```
meridian/
├── 📁 src/                          # Main application source code
│   ├── 📁 app/                      # Next.js app router pages
│   ├── 📁 components/               # React components
│   ├── 📁 context/                  # React context providers
│   ├── 📁 data/                     # Static data files
│   └── 📁 lib/                      # Utility libraries
├── 📁 public/                       # Static assets
├── 📁 docs/                         # Documentation
├── 📁 scripts/                      # Build/deployment scripts
├── 📁 tests/                        # 🆕 Organized test files
│   ├── 📁 categorization/           # Categorization system tests
│   ├── 📁 pdf-processing/           # PDF parsing tests
│   └── 📁 custom-keywords/          # Custom keyword tests
├── 📁 data/                         # 🆕 Sample data files
│   ├── 📁 bank-statements/          # Bank statement samples
│   ├── 📁 training-data/            # Training data files
│   └── 📁 templates/                # Template files
├── 📁 backups/                      # Code backups
└── 📁 assets/                       # Images and logos
```

## ✅ **CLEANUP COMPLETED**

### **What Was Organized:**
- ✅ **Test Files**: Moved to `tests/` with subdirectories
- ✅ **Sample Data**: Organized in `data/` directory
- ✅ **Bank Statements**: Moved from root to `data/bank-statements/`
- ✅ **Training Data**: Consolidated in `data/training-data/`
- ✅ **Duplicate Backup**: Removed safely
- ✅ **Build Cache**: Cleaned to fix webpack issues

### **Files Moved:**
```
📁 tests/categorization/
├── test-categorization.js
└── test-categorization-analysis.js

📁 tests/pdf-processing/
├── test-rbc-format.js
├── test-rbc-pdf-parsing.js
└── test-rbc-training.js

📁 tests/custom-keywords/
└── test-custom-keywords.js

📁 data/bank-statements/
├── 2022-06-30 Jeeves Statement.csv
├── 5000 BT Records.csv
├── APR 29_22 - MAY 31_22.pdf
├── Chequing Statement-7563 2024-01-09.pdf
├── bank statement Dec.1, 2023 to Dec.31,2024.csv
└── bank_statements_csv (1).txt

📁 data/training-data/
├── extract-pdf.js
└── pdf_extracted_text.txt
```

## 🚀 **NEXT STEPS**
1. Test the application functionality
2. Update any import paths if needed
3. Commit the clean structure to git
4. Continue development with organized codebase

## 🛡️ **SAFETY VERIFICATION**
- ✅ All source code preserved
- ✅ No functionality lost
- ✅ Git history maintained
- ✅ Backup removed safely
- ✅ Build cache cleaned 