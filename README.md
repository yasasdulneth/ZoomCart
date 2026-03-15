# ZoomCart - Smart Supermarket Scan & Go App

A premium React Native + Expo application featuring a minimalist design with glassmorphism effects, smooth animations, and modern UI/UX.

## Features

- 🎨 **Premium Design**: Glassmorphism effects with liquid glass aesthetics
- 📱 **4 Core Screens**: Home, Product Scan, Shared Cart, Payment QR
- ✨ **Smooth Animations**: Powered by react-native-reanimated
- 🎯 **Interactive Gestures**: Swipe-to-delete cart items
- 🌈 **Gradient Accents**: Beautiful purple/blue gradient themes
- 📐 **Responsive Layout**: Fully responsive design

## Tech Stack

- **React Native** (Expo SDK 54)
- **TypeScript**
- **expo-blur** - Glassmorphism effects
- **expo-linear-gradient** - Gradient backgrounds
- **react-native-reanimated** - Smooth animations
- **react-native-gesture-handler** - Interactive gestures
- **expo-font** - Custom typography
- **@react-navigation/native** - Navigation

## Project Structure

```
ZOOMCART/
├── App.tsx                 # Main app entry point
├── components/             # Reusable components
│   ├── GlassCard.tsx       # Glassmorphism card component
│   ├── AnimatedButton.tsx  # Animated button with press effects
│   └── GradientHeader.tsx  # Gradient header component
├── screens/                # App screens
│   ├── HomeScreen.tsx      # Main home screen
│   ├── ProductScanScreen.tsx  # Product scan result screen
│   ├── SharedCartScreen.tsx   # Cart with swipe gestures
│   └── PaymentQRScreen.tsx    # Payment QR code screen
├── constants/              # Theme and constants
│   └── theme.ts            # Colors, typography, spacing
└── utils/                  # Utility functions
    └── fonts.ts            # Font helper utilities
```

## Installation

1. Install dependencies:
```bash
npm install
```

   Or use the setup script to ensure everything is installed correctly:
```bash
npm run setup
```

2. Install fonts (optional):
   - Download Poppins, Inter, and Montserrat fonts
   - Place them in `assets/fonts/` directory
   - Or the app will use system fonts as fallback

3. Start the development server:
```bash
npm start
```

   `npm start` runs a script that forces the dev server to use your PC’s LAN IP (so the QR code and URL are never 127.0.0.1). Always connect by scanning the QR code shown in the terminal; avoid opening from Expo Go’s “Recent” if it previously showed 127.0.0.1.

   **Alternative ways to start:**
   - Windows: Double-click `start-expo.bat`
   - Mac/Linux: Run `./start-expo.sh` or `bash start-expo.sh`
   - Manual: `npm run start:lan` or `npx expo start --lan`

## Troubleshooting

### Issue: "Expo is missing" or "expo command not found"

**Solution:**
```bash
# Run the setup script
npm run setup

# Or manually install
npm install
npx expo install --fix
```

### Issue: "Could not connect to the server"

**Solutions:**

1. **If the error shows `exp://127.0.0.1:8081` (wrong URL saved in Expo Go)**
   - **Do not** open the project from Expo Go’s “Recent” or a saved link that used 127.0.0.1.
   - On your PC run `npm start`, then in Expo Go **scan the new QR code** (or type the `exp://192.168.x.x:8081` URL printed in the terminal). That uses your computer’s LAN address so your phone can connect.

2. **Ensure both devices are on the same Wi-Fi network**
   - Your computer and phone must be on the same network

3. **Try different connection modes:**
   ```bash
   # LAN mode (same network)
   npm run start:lan
   
   # Tunnel mode (works across networks, slower)
   npm run start:tunnel
   
   # Clear cache and restart
   npm run start:clear
   ```

4. **Check Windows Firewall:**
   - Allow Node.js through Windows Firewall
   - Allow port 8081

5. **Check if port 8081 is in use:**
   ```powershell
   # Windows
   netstat -ano | findstr :8081
   ```

6. **Update Expo Go app:**
   - Make sure Expo Go on your phone supports SDK 54
   - Update from App Store (iOS) or Play Store (Android)

7. **Verify Expo Go version:**
   - Open Expo Go → Settings → About
   - Should support SDK 54.0.0

### Quick Fix Commands

```bash
# Complete reset
npm run setup
npm run start:clear

# If still having issues, try tunnel mode
npm run start:tunnel
```

## Design System

### Colors
- **Dark Theme**: Deep blacks and grays (#0A0A0F, #151520)
- **Accent Gradient**: Purple to Pink (#6366F1 → #8B5CF6 → #EC4899)
- **Glass Effects**: Translucent white overlays with blur

### Typography
- **Primary**: Poppins (Regular, Medium, SemiBold, Bold)
- **Secondary**: Inter (Regular, Medium)
- **Accent**: Montserrat (Regular, Bold)

### Spacing & Border Radius
- Consistent spacing scale (4px, 8px, 16px, 24px, 32px, 48px, 64px)
- Rounded corners (12px, 20px, 24px, 30px)

## Key Components

### GlassCard
A reusable card component with blur effects and gradient overlays. Supports floating animations.

### AnimatedButton
Button component with scale animations on press, gradient backgrounds, and multiple variants.

### GradientHeader
Header component with animated gradient background and shimmer effect.

## Screens

1. **Home Screen**: Main dashboard with scan button, cart summary, and quick action cards
2. **Product Scan Screen**: Product details with price comparison and nutrition info
3. **Shared Cart Screen**: Cart items with swipe-to-delete gesture
4. **Payment QR Screen**: Animated QR code reveal with payment information

## Development Notes

- All animations use `react-native-reanimated` for 60fps performance
- Gestures use `react-native-gesture-handler` for native feel
- Glass effects use `expo-blur` with custom intensity levels
- Fonts are loaded asynchronously with fallback to system fonts

## License

MIT
