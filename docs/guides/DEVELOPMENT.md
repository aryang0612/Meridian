# Meridian AI Development Guide

## 🚀 Quick Start (Recommended Methods)

### Method 1: Use the Root Package.json (Easiest)
From anywhere in the `Merdian AI` directory:
```bash
npm run dev
```

### Method 2: Use the Shell Script
From anywhere in the `Merdian AI` directory:
```bash
./start-dev.sh
```

### Method 3: Manual Navigation
```bash
cd meridian && npm run dev
```

## 🔧 Available Commands

From the root `Merdian AI` directory:

- `npm run dev` - Start development server
- `npm run dev:clean` - Clean restart (kills existing processes first)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run restart` - Restart development server
- `npm run install-deps` - Install dependencies

## 📁 Directory Structure

```
Merdian AI/                 ← You are here (root workspace)
├── package.json           ← Root package.json (workspace manager)
├── start-dev.sh          ← Development server script
├── meridian/             ← Next.js application
│   ├── package.json      ← App package.json
│   ├── src/
│   ├── public/
│   └── ...
└── docs/
```

## ⚠️ Common Issues

### "ENOENT: no such file or directory, open package.json"
This happens when you run `npm run dev` from the wrong directory.

**Solution:** Always use one of the recommended methods above.

### Port Already in Use
If you see "Port 3000 is in use":
```bash
npm run dev:clean
```

### Turbopack Errors
If you encounter Turbopack errors, try:
```bash
cd meridian && npm run dev -- --no-turbopack
```

## 🎯 Development Workflow

1. **Start Server:** Use `npm run dev` from root directory
2. **Open Browser:** http://localhost:3000
3. **Make Changes:** Edit files in `meridian/src/`
4. **Hot Reload:** Changes appear automatically
5. **Stop Server:** Ctrl+C or `npm run restart`

## 🌐 Server URLs

- **Local:** http://localhost:3000
- **Network:** http://172.16.203.56:3000 (for testing on other devices)

## 📊 Chart of Accounts

The application now supports province-specific chart of accounts:
- Ontario (ON): HST 13%
- British Columbia (BC): GST+PST 12%
- Alberta (AB): GST 5%

Chart of accounts CSV files are located in `meridian/public/`. 