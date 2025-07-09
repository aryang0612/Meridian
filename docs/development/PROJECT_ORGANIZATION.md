# 📁 Project Organization Guide

## 🎯 Purpose
This document explains the organized folder structure of the Meridian AI project for better maintainability and development workflow.

## 📂 Folder Structure Overview

### 💼 `/meridian/` - Main Application
**The core Next.js application - your primary development area**
- Contains all source code, components, and application logic
- This is where you'll spend most of your development time
- Has its own package.json and dependencies

### 📋 `/documentation/` - All Documentation
**Centralized location for all project documentation**
- `XERO_IMPORT_GUIDE.md` - Step-by-step Xero integration instructions
- `DEVELOPMENT.md` - Development setup and workflow
- `SYSTEM_AUDIT_REPORT.md` - Technical health and metrics
- `EXPORT_CLEANUP.md` - Export format improvements
- `STABILITY_FIXES.md` - Bug fixes and stability improvements
- `ARCHITECTURE_FIXES_COMPLETE.md` - Architecture documentation

### 📊 `/data-templates/` - Data & Training Materials
**All data files, templates, and training materials**
- `Training Materials/` - Real bank statements for AI training (142 merchants extracted)
- `sample-data/` - Sample CSV files for testing
- `test-csvs/` - Edge case test files
- `assets/` - Images and static assets
- Various CSV templates for Xero imports

### 🧪 `/testing-utilities/` - Development Tools
**Scripts and utilities for development and testing**
- `start-dev.sh` - Quick development server startup script
- `.meridian-aliases` - Useful command aliases for development

### ⚙️ Root Configuration Files
**Project-wide configuration and setup**
- `package.json` - Workspace-level dependencies and scripts
- `package-lock.json` - Dependency lock file
- `README.md` - Main project overview

## 🚀 Quick Commands

### Start Development
```bash
# From project root
npm run dev

# Or from meridian folder
cd meridian && npm run dev

# Clean restart if issues
cd meridian && npm run dev:clean
```

### Find Documentation
```bash
# All docs are now in one place
ls documentation/

# Quick access to guides
open documentation/XERO_IMPORT_GUIDE.md
open documentation/DEVELOPMENT.md
```

### Access Training Data
```bash
# Training materials for AI improvement
ls data-templates/Training\ Materials/

# Sample data for testing
ls data-templates/sample-data/
```

## 🎯 Benefits of This Organization

### ✅ **Improved Navigation**
- Clear separation of concerns
- Easy to find specific types of files
- Logical grouping of related materials

### ✅ **Better Maintenance**
- All documentation in one place
- Training data organized and accessible
- Development tools separated from core app

### ✅ **Cleaner Root Directory**
- Only essential files at root level
- Less clutter when browsing the project
- Clear project structure overview

### ✅ **Preserved Functionality**
- All existing functionality maintained
- No breaking changes to the application
- Development workflow unchanged

## 🔍 File Location Quick Reference

| What you're looking for | Where to find it |
|-------------------------|------------------|
| Main application code | `/meridian/src/` |
| Documentation & guides | `/documentation/` |
| Training data for AI | `/data-templates/Training Materials/` |
| Sample CSV files | `/data-templates/sample-data/` |
| Test files | `/data-templates/test-csvs/` |
| Development scripts | `/testing-utilities/` |
| Xero templates | `/data-templates/*.csv` |
| Project images | `/data-templates/assets/` |

## 🚨 Important Notes

### ⚠️ **What Hasn't Changed**
- The meridian application works exactly the same
- All your development commands still work
- No functionality has been lost or modified

### ⚠️ **What Has Improved**
- Much cleaner and more organized structure
- Easier to find specific files and documentation
- Better separation of different types of content
- More professional project layout

### ⚠️ **Development Workflow**
- Continue working in `/meridian/` as usual
- Check `/documentation/` for guides and references
- Use `/data-templates/` when you need sample data or training materials

---

**This organization makes the project more maintainable while preserving all existing functionality.** 