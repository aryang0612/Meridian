# 📁 MERIDIAN AI - PROJECT ORGANIZATION

## 🎯 **CLEAN PROJECT STRUCTURE**

This document outlines the organized structure of the Meridian AI project after comprehensive cleanup and reorganization.

---

## 📂 **ROOT DIRECTORY STRUCTURE**

```
meridian/
├── 🔧 Core Application Files
│   ├── package.json                 # Dependencies and scripts
│   ├── tsconfig.json               # TypeScript configuration
│   ├── next.config.ts              # Next.js configuration
│   ├── eslint.config.mjs           # ESLint configuration
│   ├── postcss.config.mjs          # PostCSS configuration
│   ├── next-env.d.ts               # Next.js type definitions
│   ├── .gitignore                  # Git ignore rules
│   ├── README.md                   # Project overview
│   └── restart-server.sh           # Development helper script
│
├── 📱 Application Source Code
│   └── src/                        # Main source directory
│       ├── app/                    # Next.js App Router
│       ├── components/             # React components
│       ├── lib/                    # Utility libraries
│       ├── data/                   # Static data files
│       └── context/                # React contexts
│
├── 🌐 Public Assets
│   └── public/                     # Static assets (images, CSV files)
│
├── 📚 Documentation
│   └── docs/
│       ├── setup/                  # Environment & setup guides
│       ├── development/            # Development documentation
│       ├── deployment/             # Deployment guides
│       ├── cleanup/                # Cleanup reports & plans
│       └── features/               # Feature documentation
│
├── 🚀 Deployment Configuration
│   └── deployment/
│       ├── docker/                 # Docker configuration
│       ├── vercel/                 # Vercel deployment
│       └── database/               # Database setup scripts
│
├── 🧪 Testing & Development
│   └── testing/
│       ├── data/                   # Test data files
│       ├── scripts/                # Test scripts
│       └── csv-samples/            # Sample CSV files
│
├── 💾 Backups & Safety
│   ├── backups/                    # Automated backups
│   └── SAFE_BACKUP/                # Manual backup storage
│
├── 🔄 Build & Cache
│   ├── .next/                      # Next.js build cache
│   └── tsconfig.tsbuildinfo        # TypeScript build info
│
└── 📋 Version Control
    ├── .git/                       # Git repository
    └── .github/                    # GitHub workflows
```

---

## 📁 **DETAILED DIRECTORY DESCRIPTIONS**

### **🔧 Core Application**
- **Purpose**: Essential configuration and setup files
- **Contents**: Package management, TypeScript config, build settings
- **Maintenance**: Update as needed for dependencies and build requirements

### **📱 Source Code (`src/`)**
- **Purpose**: All application source code
- **Structure**:
  - `app/` - Next.js pages and API routes
  - `components/` - Reusable React components
  - `lib/` - Utility functions and services
  - `data/` - Static data (chart of accounts, patterns)
  - `context/` - React context providers

### **📚 Documentation (`docs/`)**
- **`setup/`** - Environment setup, Supabase configuration
- **`development/`** - Project structure, development guides
- **`deployment/`** - Vercel, Docker deployment instructions
- **`cleanup/`** - Cleanup reports and maintenance plans
- **`features/`** - Feature documentation and specifications

### **🚀 Deployment (`deployment/`)**
- **`docker/`** - Dockerfile, docker-compose.yml
- **`vercel/`** - Vercel deployment configuration
- **`database/`** - SQL scripts, database setup

### **🧪 Testing (`testing/`)**
- **`data/`** - Test datasets and sample files
- **`scripts/`** - Testing and debugging scripts
- **`csv-samples/`** - Sample CSV files for testing

---

## 🎯 **ORGANIZATION BENEFITS**

### **✅ Improved Developer Experience**
- **Clear Structure**: Easy to find files and understand project layout
- **Logical Grouping**: Related files are grouped together
- **Clean Root**: Minimal clutter in the root directory

### **✅ Better Maintainability**
- **Separated Concerns**: Documentation, testing, and deployment are isolated
- **Easy Navigation**: Developers can quickly locate relevant files
- **Scalable Structure**: Easy to add new features and components

### **✅ Enhanced Collaboration**
- **Consistent Organization**: Team members can easily understand the structure
- **Clear Documentation**: All guides are organized by purpose
- **Version Control**: Clean Git history with organized file structure

---

## 🔄 **MAINTENANCE GUIDELINES**

### **📁 File Placement Rules**
1. **Source Code**: Always goes in `src/`
2. **Documentation**: Always goes in `docs/` with appropriate subdirectory
3. **Test Files**: Always goes in `testing/` with appropriate subdirectory
4. **Deployment Config**: Always goes in `deployment/` with appropriate subdirectory
5. **Public Assets**: Always goes in `public/`

### **🧹 Regular Cleanup**
- **Monthly**: Review and organize any loose files
- **Before Releases**: Ensure all documentation is up to date
- **After Features**: Update relevant documentation and tests

### **📋 Adding New Features**
1. Create components in `src/components/`
2. Add documentation in `docs/features/`
3. Create tests in `testing/`
4. Update this organization document if structure changes

---

## 🚀 **READY FOR DEVELOPMENT**

The project is now **perfectly organized** and ready for:
- ✅ **Feature Development** - Clean source code structure
- ✅ **Team Collaboration** - Clear documentation and organization
- ✅ **Deployment** - Organized deployment configurations
- ✅ **Testing** - Dedicated testing environment
- ✅ **Maintenance** - Easy to find and update files

**Status**: 🎉 **FULLY ORGANIZED AND READY FOR CONTINUED DEVELOPMENT**

---

*Last updated: $(date)*
*Project organization completed successfully* 