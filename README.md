# HackHazards Project

# 🚀 Cumpair - AI-Powered Price Comparison Platform

> Empowering consumers with cyberpunk-styled, AI-enhanced price comparisons across multiple retailers.

---

## 📌 Problem Statement

**Problem Statement: Transform the Future of Retail Shopping Experience**

---

## 🎯 Objective

Cumpair addresses the challenge consumers face when trying to find the best prices for products across different retailers. Our platform uses cutting-edge AI technology to help users search for products via text queries or image uploads, delivering real-time price comparisons across major retailers including Amazon, Flipkart, Meesho, Reliance Digital, and Croma.

Our solution serves budget-conscious shoppers, enabling them to make informed purchasing decisions based on accurate price data, saving both time and money while promoting fair market competition.

---

## 🧠 Team & Approach

### Team Name:  
`CODE RONIN`

### Team Members:  
- Sid (GitHub: sid1887 / Role: Lead Developer)
- [Add additional team members]

### Our Approach:  
- We chose this problem because price comparison remains a fragmented experience for consumers, requiring multiple apps and websites
- Key challenges include scraping real-time pricing data from various sources and normalizing it for accurate comparisons
- Our breakthrough was integrating Groq's AI to enhance web scraping capabilities through multi-tiered fallback strategies and provide intelligent product recommendations

---

## 🛠️ Tech Stack

### Core Technologies Used:
- **Frontend**: React with TypeScript, Tailwind CSS, and shadcn/ui for a cyberpunk-themed UI
- **Backend**: Node.js with Express
- **AI Integration**: Groq API for advanced AI capabilities, including LLaMA-3 models
- **Data Scraping**: Multi-tiered web scraping system using:
  - Direct API calls to retailer endpoints
  - Network payload interception with headless browsers
  - DOM scraping with Playwright/Puppeteer
- **State Management**: React Query for frontend data fetching and caching
- **Animation**: Custom CSS animations and transitions for UI elements
- **Hosting**: Vercel/Netlify for frontend, Render for backend

### Sponsor Technologies Used:
- [✅] **Groq:** _Powering AI-assisted web scraping, image recognition, and product recommendations using LLaMA-3 8B & 70B models_  
- [ ] **Monad:** _Blockchain implementation_  
- [ ] **Fluvio:** _Real-time data handling_  
- [ ] **Base:** _AgentKit / OnchainKit / Smart Wallet usage_  
- [ ] **Screenpipe:** _Screen-based analytics or workflows_  
- [ ] **Stellar:** _Payments, identity, or token usage_
*(Mark with ✅ if completed)*

---

## ✨ Key Features

### Core Functionality:
- ✅ Text and image-based product search with AI-powered product identification  
- ✅ Real-time price comparison from multiple retailers with tiered scraping system
- ✅ AI-enhanced web scraping using Groq with fallback strategies for reliable data
- ✅ Detailed product specifications and price history charts
- ✅ Best deal detection and lowest price highlighting
- ✅ Multi-retailer support: Amazon, Flipkart, Meesho, Croma, Reliance Digital

### UI/UX Highlights:
- ✅ Cyberpunk-themed interface with neon accents, glitch effects, and circuit patterns
- ✅ Responsive design optimized for both desktop and mobile
- ✅ Interactive product cards with hover effects and shimmer animations
- ✅ Animated glitch headers, scanlines, and dynamic visual elements
- ✅ Staggered animations for smooth content loading and enhanced user experience

---

## 📽️ Demo & Deliverables

- **Demo Video Link:** [To be added]  
- **Pitch Deck / PPT Link:** [To be added]  

---

## ✅ Tasks & Bonus Checklist

- [ ] **All members of the team completed the mandatory task - Followed at least 2 of our social channels and filled the form** (Details in Participant Manual)  
- [ ] **All members of the team completed Bonus Task 1 - Sharing of Badges and filled the form (2 points)**  (Details in Participant Manual)
- [ ] **All members of the team completed Bonus Task 2 - Signing up for Sprint.dev and filled the form (3 points)**  (Details in Participant Manual)

*(Mark with ✅ if completed)*

---

## 🧪 How to Run the Project

### Requirements:
- Node.js v16+ and npm
- MongoDB (local or Atlas)
- Groq API Key
- .env file setup

### Local Setup:
```bash
# Clone the repo
git clone https://github.com/sid1887/hackhazards-project
cd hackhazards-project

# Install all dependencies at once (backend and frontend)
npm run install-all
# OR install them separately:

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Environment Variables:
Create a `.env` file in the backend directory with the following:
```
PORT=5000
MONGODB_URI=your_mongodb_connection_string
GROQ_API_KEY=your_groq_api_key
DEBUG_SCRAPING=false
```

### Running the Application:
```bash
# Run backend and frontend in separate terminal windows

# Terminal 1 - Start the backend server:
cd backend
npm run dev

# Terminal 2 - Start the frontend server:
cd frontend
npm start
```

Backend runs on http://localhost:5000
Frontend runs on http://localhost:3000

---

## ✨ Advanced UI & Groq AI Features

Our application leverages a sophisticated cyberpunk-themed UI and Groq AI's powerful capabilities:

### UI Components:
- 🎨 **Cyberpunk Aesthetic**: Dark theme with neon blue/pink accents, glassmorphism panels, glitch effects, and animated circuit patterns
- 📱 **Responsive Design**: Fully responsive from mobile to desktop using Tailwind CSS and custom breakpoints
- 🔄 **Interactive Elements**: Animated cards with hover effects, glassmorphism panels with light effects, and micro-interactions
- 📊 **Visual Data Display**: Recharts-powered price trend visualization with cyberpunk styling
- 🎭 **Custom Animations**: Shimmer effects, neon glows, scanline overlays, and staggered animations

### Groq AI Integration:
- 🧠 **Multimodal Search**: Search for products using text or image uploads with Groq Vision API
- 👁️ **Image Recognition**: Upload product images for AI-powered analysis and automatic search
- 📊 **Price Analysis**: AI-driven detection of the best deals and value insights
- 🤖 **Smart Recommendations**: Related product suggestions based on search history
- 📝 **Enhanced Scraping**: Groq-assisted data extraction from complex webpage structures

#### Advanced Scraping Technologies:
- 🔍 **Tiered Approach**: Three-level scraping system for maximum reliability:
  1. Direct API calls (fastest, ~200ms response time)
  2. Headless browser with network sniffing (~1s)
  3. DOM scraping as fallback (~2-3s)
- 🔄 **Proxy Rotation**: Built-in proxy rotation system for avoiding rate limits
- 🕸️ **Network Interception**: Identification of hidden API endpoints through network payload analysis
- 🛡️ **Anti-Detection**: Stealth browser configurations to bypass anti-bot measures

---

## 🧬 Future Scope

Plans for future development:

- 📈 Historical price tracking and alerts  
- 🛡️ User accounts with wishlist and price drop notifications  
- 🌐 Expansion to more hypermarkets and local retailers
- 📱 Mobile app versions for iOS and Android
- 🔍 Barcode scanning for in-store price checks
- 🤖 AI-powered shopping assistant with personalized recommendations

---

## 📎 Resources / Credits

- Groq API for AI-enhanced functionality with LLaMA-3 models
- Playwright and Puppeteer for web scraping
- React, TypeScript and Tailwind CSS for frontend development
- shadcn/ui components with cyberpunk styling customizations
- Lucide React for icons
- Inter, JetBrains Mono, and Orbitron fonts for typography
- Recharts for data visualization
- This project was built for Hackhazards '25. The UI was initially scaffolded using Lovable AI to save design time and focus more on backend and AI logic. All data handling, scraping logic, API setup, and Groq AI integration were implemented manually by the team.

---

## 🏁 Final Words

The Cumpair project represents our vision for the future of retail price comparison, combining cutting-edge AI technology with a visually striking cyberpunk interface. Our goal is to empower consumers with data-driven purchasing decisions in a way that feels both futuristic and intuitive.

---