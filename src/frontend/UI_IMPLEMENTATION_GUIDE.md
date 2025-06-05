# UI Implementation Guide

## 🚀 Quick Start

### 1. Install Required Dependencies
```bash
cd src/frontend
npm install framer-motion lucide-react react-spring @lottiefiles/react-lottie-player
npm install -D tailwindcss @tailwindcss/forms
```

### 2. Update Tailwind Config
```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#6366F1',
        accent: '#10B981',
        danger: '#EF4444',
      },
      animation: {
        'gradient': 'gradient 3s ease infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      backdropFilter: {
        'none': 'none',
        'blur': 'blur(10px)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
```

### 3. Add Global Styles
```css
/* src/index.css */
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';

@layer base {
  body {
    @apply bg-gray-950 text-white;
  }
}

@layer utilities {
  /* Custom slider styles */
  .slider-thumb::-webkit-slider-thumb {
    appearance: none;
    width: 24px;
    height: 24px;
    background: #6366F1;
    cursor: pointer;
    border-radius: 50%;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }
  
  /* Glassmorphism */
  .glass {
    backdrop-filter: blur(10px);
    background: rgba(15, 23, 42, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
}
```

### 4. Update App.jsx with New Theme
```jsx
// src/App.jsx
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950">
      <AnimatePresence mode="wait">
        {/* Your routes */}
      </AnimatePresence>
    </div>
  );
}
```

### 5. Replace MarketCard with AnimatedMarketCard
```jsx
// In MarketsPage.jsx
import AnimatedMarketCard from '../components/ui/AnimatedMarketCard';

// Replace <MarketCard /> with:
<AnimatedMarketCard
  market={market}
  onBet={handleBet}
  onShare={handleShare}
  onLike={handleLike}
/>
```

### 6. Add Package.json Scripts
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "pwa": "vite build && workbox generateSW workbox-config.js"
  }
}
```

## 📱 PWA Setup

### 1. Create manifest.json
```json
// public/manifest.json
{
  "name": "APES Prediction Market",
  "short_name": "APES Market",
  "description": "Predict. Win. Repeat.",
  "theme_color": "#6366F1",
  "background_color": "#0F172A",
  "display": "standalone",
  "scope": "/",
  "start_url": "/",
  "icons": [
    {
      "src": "icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 2. Add Service Worker
```javascript
// public/sw.js
self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated.');
});

self.addEventListener('fetch', (event) => {
  // Cache strategy
});
```

## 🎨 Component Migration Plan

### Week 1: Core Components
- [ ] Replace MarketCard with AnimatedMarketCard
- [ ] Add BettingSlider to all bet flows
- [ ] Implement ProbabilityBar animations
- [ ] Create LoadingSkeletons
- [ ] Add Navbar glassmorphism

### Week 2: Mobile Optimization
- [ ] Add touch gestures
- [ ] Implement bottom sheets
- [ ] Create mobile navigation
- [ ] Add haptic feedback
- [ ] Test on real devices

### Week 3: Social Features
- [ ] Create UserProfile component
- [ ] Add CommentThread system
- [ ] Build Leaderboard
- [ ] Implement ShareModal
- [ ] Add notification system

### Week 4: Advanced Markets
- [ ] Design RangeMarket UI
- [ ] Create TimelineVisualizer
- [ ] Build ConditionalMarket
- [ ] Add MarketCreator tool
- [ ] Implement templates

## 🚨 Important Notes

1. **Performance**: Use React.memo for heavy components
2. **Animations**: Keep under 60fps, use will-change CSS
3. **Mobile**: Test on low-end devices
4. **Accessibility**: Add proper ARIA labels
5. **SEO**: Use Next.js for better SEO if needed

## 🎯 Success Metrics to Track

```javascript
// Add analytics
import { Analytics } from '@vercel/analytics/react';

// Track key events
analytics.track('bet_placed', {
  amount: betAmount,
  market_id: marketId,
  option: selectedOption
});

analytics.track('market_shared', {
  market_id: marketId,
  platform: 'twitter'
});
```

Ready to build the best-looking prediction market on Solana! 🚀 