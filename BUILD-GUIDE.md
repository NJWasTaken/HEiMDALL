# Heimdall Desktop Application - Build Guide

## 🚀 Quick Start

### Development Mode (Testing)
Simply double-click: **`start-dev.bat`**

This will:
- Install all Node.js dependencies
- Create Python virtual environment
- Install Python dependencies
- Launch the app in development mode

### Building the Installer (Distribution)
Double-click: **`build-installer.bat`**

This will create a Windows installer in the `dist` folder that you can share with others.

---

## 📋 Prerequisites

Before building, make sure you have:

1. **Node.js v20.17.0** ✅ (Already installed)
2. **Python 3.8+** (Check with `python --version`)
3. **Git** (for version control)

---

## 🛠️ Manual Setup (If needed)

### 1. Install Node.js Dependencies
```bash
npm install
```

### 2. Install Python Dependencies
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### 3. Install PyInstaller (for building)
```bash
pip install pyinstaller
```

---

## 🏗️ Building Process

The build happens in two stages:

### Stage 1: Bundle Python Backend
```bash
python build-python.py
```

This creates a standalone Python executable at:
```
python-build/dist/heimdall-backend/heimdall-backend.exe
```

**What it includes:**
- Flask server
- All Python dependencies
- Frontend files (HTML, CSS, JS)
- User data models

**Size:** ~150-200 MB

### Stage 2: Build Electron App
```bash
npm run build
```

This creates the Windows installer at:
```
dist/Heimdall Setup 1.0.0.exe
```

**What it includes:**
- Electron wrapper
- Python backend (from Stage 1)
- Application icon and branding
- NSIS installer configuration

**Final Size:** ~250-350 MB

---

## 📦 Distribution

After building, you'll find in the `dist` folder:

- **`Heimdall Setup 1.0.0.exe`** - The installer users will download
- Users double-click this file to install Heimdall on their PC
- No additional dependencies required!

### Installation for End Users:
1. Download `Heimdall Setup 1.0.0.exe`
2. Double-click to install
3. Choose installation directory (default: `C:\Program Files\Heimdall`)
4. Creates desktop shortcut
5. Launch from Start Menu or Desktop

---

## 🧪 Testing

### Development Testing
```bash
npm start
```
- Runs app with Python directly (faster startup)
- Opens DevTools for debugging
- Hot reload not available (restart to see changes)

### Production Testing (Before distribution)
```bash
npm run build:dir
```
- Creates unpacked app in `dist/win-unpacked`
- Test the bundled executable
- Faster than creating full installer

---

## 🗂️ Project Structure

```
PESU_RR_AIML_D.../
├── electron/
│   ├── main.js           # Main Electron process
│   └── preload.js        # Security bridge
├── backend/
│   ├── app.py            # Flask application
│   ├── requirements.txt  # Python dependencies
│   └── models/           # Data storage
├── frontend/
│   ├── *.html            # Web pages
│   ├── js/               # JavaScript files
│   └── css/              # Stylesheets
├── package.json          # Node.js configuration
├── build-python.py       # PyInstaller build script
├── start-dev.bat         # Development launcher
├── build-installer.bat   # Full build script
└── .env                  # Environment variables (TMDB API key)
```

---

## ⚙️ Configuration

### Environment Variables (.env)
```env
FLASK_SECRET_KEY=your-secret-key-here
TMDB_API_KEY=your-tmdb-api-key-here
```

**Important:** Make sure `.env` file exists before building!

### Build Configuration (package.json)
- App name, version, author
- Icon paths
- NSIS installer settings
- File inclusion/exclusion rules

---

## 🐛 Troubleshooting

### Issue: "Node.js not found"
**Solution:** Install Node.js from https://nodejs.org/

### Issue: "Python not found"
**Solution:** 
- Install Python 3.8+ from https://www.python.org/
- Make sure to check "Add Python to PATH" during installation

### Issue: Build fails at PyInstaller stage
**Solution:**
```bash
pip install --upgrade pyinstaller
pip install --upgrade setuptools
```

### Issue: ".env file not found"
**Solution:** 
- Copy `.env.example` to `.env`
- Add your TMDB API key

### Issue: Large file size
**Normal!** Desktop apps bundle everything:
- Python runtime (~50 MB)
- Flask + dependencies (~50 MB)
- Electron (~100 MB)
- Your application (~50 MB)

### Issue: App won't start after installation
**Solution:**
- Check Windows Defender/Antivirus (may block unsigned apps)
- Run as Administrator
- Check console output in development mode

---

## 📝 Development Commands

| Command | Description |
|---------|-------------|
| `npm start` | Run in development mode |
| `npm run build` | Build Windows installer |
| `npm run build:dir` | Build unpacked (for testing) |
| `python build-python.py` | Build Python executable only |

---

## 🔒 Security Notes

1. **Code Signing:** The app is not code-signed, so Windows may show a warning
2. **Firewall:** Windows Firewall may ask for permission (allow it)
3. **Antivirus:** Some antivirus software may flag the app (false positive)

To avoid warnings, consider purchasing a code signing certificate ($100-400/year).

---

## 📄 License

Make sure to create a `LICENSE.txt` file in the root directory. The installer expects it.

---

## 🆘 Support

If you encounter issues:
1. Check the console output in development mode
2. Look in `python-build/build` for PyInstaller logs
3. Check `dist` folder permissions
4. Ensure all dependencies are installed

---

## ✅ Pre-Distribution Checklist

Before sharing your app:
- [ ] Test the installer on a clean Windows machine
- [ ] Verify `.env` is included (or create setup wizard)
- [ ] Check all features work in production build
- [ ] Test on Windows 10 and Windows 11
- [ ] Ensure file sizes are reasonable
- [ ] Create user documentation
- [ ] Set up update mechanism (optional)

---

## 🚀 Next Steps

After successful build:
1. Test the installer thoroughly
2. Create user documentation
3. Set up distribution method (website, GitHub releases, etc.)
4. Consider implementing auto-updates (electron-updater)
5. Add crash reporting (optional)

Good luck with your deployment! 🎉
