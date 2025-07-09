# 🧹 Meridian AI Data Cleanup Plan

## 🚨 **Current Issues Identified**

### **1. Account Code Conflicts**
- **Multiple Sources**: Hardcoded accounts.ts + CSV files + category mappings
- **Inconsistent Codes**: Different account codes for same categories
- **Province Handling**: Multiple CSV files but inconsistent loading

### **2. Category Conflicts**
- **3 Different Category Systems**: categories.ts, merchants.ts, customKeywords.ts
- **Naming Inconsistencies**: Same categories with different names
- **Duplicate Definitions**: Categories defined in multiple places

### **3. Caching & Storage Issues**
- **Multiple Storage Keys**: Custom keywords stored in different places
- **Inconsistent Loading**: Chart of accounts loaded from different sources
- **Memory Conflicts**: Multiple instances of same data

## 🎯 **Cleanup Strategy**

### **Phase 1: Consolidate Account Codes (SAFE)**
1. **Keep CSV-based Chart of Accounts** (most comprehensive)
2. **Remove hardcoded accounts.ts** (redundant)
3. **Update categoryMappings.ts** to use CSV account codes
4. **Standardize province handling**

### **Phase 2: Consolidate Categories (SAFE)**
1. **Use categories.ts as single source of truth**
2. **Update merchants.ts** to reference categories.ts
3. **Update customKeywords.ts** to validate against categories.ts
4. **Remove duplicate category definitions**

### **Phase 3: Fix Caching (SAFE)**
1. **Consolidate storage keys**
2. **Implement proper cache invalidation**
3. **Standardize data loading patterns**

## 📋 **Detailed Action Plan**

### **Step 1: Backup Current State**
```bash
# Create backups of all data files
cp src/data/accounts.ts src/data/accounts.ts.backup
cp src/data/categories.ts src/data/categories.ts.backup
cp src/data/merchants.ts src/data/merchants.ts.backup
cp src/data/categoryMappings.ts src/data/categoryMappings.ts.backup
cp src/data/customKeywords.ts src/data/customKeywords.ts.backup
```

### **Step 2: Consolidate Account Codes**
1. **Remove accounts.ts** - Use CSV-based system only
2. **Update categoryMappings.ts** - Map to CSV account codes
3. **Standardize chartOfAccounts.ts** - Single loading pattern

### **Step 3: Consolidate Categories**
1. **Update merchants.ts** - Reference categories.ts categories
2. **Update customKeywords.ts** - Validate against categories.ts
3. **Remove duplicate category definitions**

### **Step 4: Fix Caching**
1. **Consolidate storage keys**
2. **Implement proper cache management**
3. **Standardize data loading**

## 🔒 **Safety Measures**

### **Before Each Change**
- ✅ Create backup of file being modified
- ✅ Test with sample data
- ✅ Verify no regressions

### **Rollback Plan**
- ✅ Keep all backup files
- ✅ Document each change
- ✅ Can revert individual files if needed

## 📊 **Expected Benefits**

### **Categorization Accuracy**
- **Eliminate conflicts** between different category systems
- **Consistent account codes** across all transactions
- **Better AI training** with unified data

### **Performance**
- **Reduced memory usage** from duplicate data
- **Faster loading** with consolidated sources
- **Better caching** with proper invalidation

### **Maintainability**
- **Single source of truth** for each data type
- **Easier updates** with consolidated files
- **Clearer codebase** with removed redundancy

## 🚀 **Implementation Order**

1. **Backup everything** ✅
2. **Consolidate account codes** (accounts.ts → CSV)
3. **Update category mappings** (use CSV codes)
4. **Consolidate categories** (merchants.ts → categories.ts)
5. **Fix custom keywords** (validate against categories.ts)
6. **Consolidate caching** (single storage pattern)
7. **Test thoroughly** (sample data + real data)
8. **Deploy changes** (monitor for issues)

## ⚠️ **Risk Assessment**

### **Low Risk**
- Removing accounts.ts (CSV system is more comprehensive)
- Updating category mappings (preserves functionality)
- Consolidating storage keys (improves consistency)

### **Medium Risk**
- Updating merchants.ts (affects categorization)
- Updating custom keywords (affects user data)

### **Mitigation**
- ✅ Comprehensive backups
- ✅ Gradual rollout
- ✅ Easy rollback process
- ✅ Thorough testing

## 📈 **Success Metrics**

### **Before Cleanup**
- Multiple conflicting data sources
- Inconsistent categorization
- Memory inefficiency
- Maintenance complexity

### **After Cleanup**
- Single source of truth for each data type
- Consistent categorization across all transactions
- Optimized memory usage
- Simplified maintenance

---

**Status**: Ready for implementation
**Priority**: High (fixing core categorization issues)
**Estimated Time**: 2-3 hours
**Risk Level**: Low-Medium (with proper backups) 