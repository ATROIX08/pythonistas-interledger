# 🏦 Pythonistas Interledger — IL-Cash

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
[![Interledger](https://img.shields.io/badge/Interledger-Open%20Payments-orange.svg)](https://openpayments.guide/)

**Pythonistas Interledger (IL-Cash)** is a functional prototype of a **multi-currency payment system** that leverages the **Interledger Protocol (ILP)** and **Open Payments** to enable seamless cross-border and cross-currency transfers. This project demonstrates how domestic payment systems (like Mexico's STP) can be integrated with international payment networks using open standards.

> ⚙️ **Hackathon Project** — This is a functional demonstration built for a financial technology hackathon. While fully operational, it is not production-ready.

> ⚠️ **IMPORTANT SECURITY NOTE FOR EVALUATORS**: This repository includes `.env` and private key files (`.key`) for hackathon evaluation purposes ONLY. This is NOT a security best practice. In production environments, these files should NEVER be committed to version control. We've included them here to facilitate testing and evaluation by hackathon judges.

---

## 🚀 Overview

**IL-Cash** unifies domestic and international transfers under a single architecture capable of:

- ✅ **Multi-Currency Support**: Handle multiple fiat currencies (MXN, USD, EUR, GBP, CAD, SGD, ZAR, and more)
- ✅ **Real-Time Exchange Rate Optimization**: Compare Open Payments rates with market rates (via Frankfurter API) to identify arbitrage opportunities
- ✅ **Interledger Protocol Integration**: Enable cross-ledger transfers using Open Payments standard
- ✅ **STP Simulation**: Simulate domestic transfer logic (Sistema de Transferencias y Pagos - Mexico)
- ✅ **Wallet Management**: Create and manage payment pointers for different currencies
- ✅ **Transaction History**: Track all transfers with SQLite database
- ✅ **Modern Web Interface**: Responsive HTML/JavaScript frontend with real-time updates

The system allows users to simulate wallet creation, cross-currency transfers, and rate optimization between participants across different payment networks.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (HTML/JS)                      │
│  • Wallet Selection UI                                      │
│  • Transfer Form                                            │
│  • Rate Comparison Dashboard                               │
│  • Transaction History                                      │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ HTTP/REST API
                 │
┌────────────────▼────────────────────────────────────────────┐
│              Node.js Backend (Express)                      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Interledger Client (@interledger/open-payments)    │  │
│  │  • Wallet Address Discovery                         │  │
│  │  • Quote Generation                                  │  │
│  │  • Payment Processing                                │  │
│  │  • Grant Management                                  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Rate Arbitrage Engine                               │  │
│  │  • Market Rate Fetching (Frankfurter API)           │  │
│  │  • Rate Comparison                                   │  │
│  │  • Spread Analysis                                   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Database Layer (better-sqlite3)                     │  │
│  │  • Wallet Registry                                   │  │
│  │  • Transaction Logs                                  │  │
│  └─────────────────────────────────────────────────────┘  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ REST API
                 │
┌────────────────▼────────────────────────────────────────────┐
│           Python Backend (Flask) - Optional                 │
│  • Additional Wallet Discovery                              │
│  • User Management                                          │
│  • Database Management Tools                                │
└─────────────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                Interledger Test Network                     │
│           (https://ilp-test.openpayments.com)               │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚙️ How It Works

### 1. **Wallet Discovery**
The system discovers payment pointers (wallet addresses) using the Open Payments protocol. Each wallet is associated with a specific currency and account.

### 2. **Quote Generation**
When a user initiates a transfer:
- The system queries the receiver's wallet to get payment capabilities
- Creates an incoming payment request
- Requests a quote from the sender's wallet with the exact amounts
- The quote includes exchange rates, fees, and estimated delivery time

### 3. **Rate Optimization**
The arbitrage engine:
- Fetches real-time market rates from Frankfurter API
- Compares them with Open Payments network rates
- Identifies arbitrage opportunities (spreads > 0.1%)
- Provides recommendations for optimal transfer routes

### 4. **Payment Execution**
- Obtains necessary grants (authorization) from both wallets
- Executes the outgoing payment from sender
- Monitors the payment status
- Confirms successful delivery to receiver

### 5. **Transaction Logging**
All transfers are recorded in a SQLite database with:
- Sender and receiver wallet information
- Amount, currency, and exchange rate
- Transaction status and timestamps
- Quote details and fees

---

## 🧠 Core Components

### **Backend Services**

#### `server.js` (Node.js/Express)
- Main API server handling all Interledger operations
- Endpoints for wallet management, quotes, and transfers
- Rate comparison and arbitrage detection
- SQLite database integration

#### `open-payments/app.py` (Python/Flask)
- Alternative API for wallet discovery
- Database management utilities
- Additional user management features

### **Frontend**

#### `public/index.html`
- Complete web interface for the payment system
- Real-time wallet balance display
- Transfer form with validation
- Rate comparison dashboard
- Transaction history viewer

### **Database**

#### SQLite Schema
- `wallets`: Stores wallet addresses and user information
- `transactions`: Logs all payment operations
- `rates`: Historical exchange rate data

### **Configuration**

#### Environment Variables (`.env`)
Contains all wallet configurations, API keys, and private key paths.

#### Private Keys (`keys/`)
Stores cryptographic keys for signing Open Payments requests.

---

## ⚡ Quick Start

Get started in 4 simple steps:

```bash
# 1. Clone the repository
git clone https://github.com/ATROIX08/pythonistas-interledger.git
cd pythonistas-interledger

# 2. Install dependencies
npm install

# 3. Download keys from Google Drive and place them in keys/
# https://drive.google.com/drive/folders/14xjVuIWSyNo_S_A-LOtkUYTfI4MI8cki?usp=sharing

# 4. Start the server
npm start

# 5. Open http://localhost:3000 in your browser
```

The `.env` file is already configured - just add the keys and run!

---

## 🔧 Installation & Setup

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** v18+ ([Download](https://nodejs.org/))
- **npm** v9+ (comes with Node.js)
- **Python** 3.8+ ([Download](https://www.python.org/)) - _Optional, for Flask backend_
- **Git** ([Download](https://git-scm.com/))
- **Open Payments Account** - Create wallets at [https://rafiki.money/](https://rafiki.money/) or another Open Payments provider

### Step 1: Clone the Repository

```bash
git clone https://github.com/ATROIX08/pythonistas-interledger.git
cd pythonistas-interledger
```

### Step 2: Install Node.js Dependencies

```bash
npm install
```

### Step 3: Install Python Dependencies (Optional)

If you want to use the Flask backend:

```bash
cd open-payments
pip install -r requirements.txt
cd ..
```

### Step 4: Create Keys Directory

```bash
mkdir -p keys
```

### Step 5: Download Private Keys

🔑 **Download all keys from Google Drive**: [Keys Folder](https://drive.google.com/drive/folders/14xjVuIWSyNo_S_A-LOtkUYTfI4MI8cki?usp=sharing)

Place all downloaded `.key` files directly in the `keys/` directory.

### Step 6: Initialize the Database (Optional)

If starting fresh, you can regenerate the database:

```bash
node regenerate_database.js
```

### Step 8: Start the Server

```bash
npm start
# or
npm run dev
# or
node server.js
```

The server will start on `http://localhost:3000` (or the port specified in `.env`).

### Step 9: Start Python Backend (Optional)

In a separate terminal:

```bash
cd open-payments
python app.py
```

The Flask server will start on `http://localhost:5000`.

### Step 10: Open the Web Interface

Navigate to `http://localhost:3000` in your web browser.

---

## 🔐 Environment Variables & Keys

### Environment Variables

The `.env` file is **already included** in this repository with all necessary configurations:
- Server settings (PORT, NODE_ENV)
- Multiple currency wallets (USD, EUR, MXN, GBP, CAD, SGD, ZAR, PKR, PEN)
- API endpoints and database paths

**No configuration needed** - the file is ready to use.

### Private Keys

🔑 **Download all private keys from Google Drive**: [Keys Folder](https://drive.google.com/drive/folders/14xjVuIWSyNo_S_A-LOtkUYTfI4MI8cki?usp=sharing)

After downloading, place all `.key` files in the `keys/` directory. The repository will work immediately once the keys are in place.

---

## 📂 Project Structure

```
pythonistas-interledger/
├── server.js                 # Main Node.js/Express server
├── package.json              # Node.js dependencies
├── .env                      # Environment variables (create from env.template)
├── env.template              # Environment variables template
├── .gitignore               # Git ignore rules
├── readme.md                # This file
│
├── public/                  # Frontend files
│   └── index.html          # Main web interface
│
├── src/                     # Source utilities
│   └── utils.js            # Helper functions
│
├── keys/                    # Private/public keys directory
│   ├── README.md           # Key management instructions
│   ├── private_*.key       # Private keys for wallets (add your own)
│   └── public_*.key        # Public keys for wallets (add your own)
│
├── open-payments/           # Python Flask backend (optional)
│   ├── app.py              # Flask API server
│   ├── database_setup.py   # Database initialization
│   ├── manage_database.py  # Database management tools
│   ├── requirements.txt    # Python dependencies
│   ├── test_backend.py     # Backend tests
│   └── wallets.db          # SQLite database
│
├── others/                  # Additional experiments
│   ├── Front/              # Alternative frontend implementations
│   ├── openpay-demo/       # React demo app
│   └── test_integration.js # Integration tests
│
├── regenerate_database.js   # Database regeneration script
└── test_integration.js      # Integration tests
```

---

## 🎯 Usage Examples

### Example 1: Simple Transfer

1. Open the web interface at `http://localhost:3000`
2. Select a **sender wallet** (e.g., USD)
3. Enter the **receiver's payment pointer** (e.g., `$ilp-test.openpayments.com/receiver-eur`)
4. Enter the **amount** to send
5. Click **Get Quote** to see the exchange rate and fees
6. Click **Send Payment** to execute the transfer

### Example 2: Rate Comparison

1. Navigate to the **Rate Comparison** section
2. View real-time comparison between Open Payments rates and market rates
3. Identify arbitrage opportunities (highlighted in the dashboard)
4. Use optimal routes for your transfers

### Example 3: Transaction History

1. Go to the **Transaction History** tab
2. View all completed transfers
3. Filter by date, currency, or status
4. Export transaction data for analysis

---

## 🔌 API Endpoints

### Node.js Backend (Port 3000)

#### Get Available Wallets
```http
GET /api/wallets
```

Response:
```json
{
  "success": true,
  "wallets": [
    {
      "id": "USD",
      "name": "USD",
      "url": "https://ilp-test.openpayments.com/user-usd",
      "currency": "USD"
    }
  ]
}
```

#### Get Quote for Transfer
```http
POST /api/quote
Content-Type: application/json

{
  "senderWalletId": "USD",
  "receiverWalletAddress": "$ilp-test.openpayments.com/receiver-eur",
  "amount": "100",
  "amountType": "send"
}
```

#### Execute Payment
```http
POST /api/pay
Content-Type: application/json

{
  "senderWalletId": "USD",
  "receiverWalletAddress": "$ilp-test.openpayments.com/receiver-eur",
  "amount": "100"
}
```

#### Get Exchange Rates
```http
GET /api/rates
```

#### Get Arbitrage Opportunities
```http
GET /api/arbitrage
```

#### Get Transaction History
```http
GET /api/transactions
```

### Python Backend (Port 5000) - Optional

#### Get User by Public Name
```http
GET /api/user/<public_name>
```

#### Wallet Discovery
```http
POST /api/discover
Content-Type: application/json

{
  "wallet_url": "https://ilp-test.openpayments.com/user"
}
```

---

## 🧪 Testing

### Run Integration Tests

```bash
node test_integration.js
```

### Test Python Backend

```bash
cd open-payments
python test_backend.py
```

### Manual Testing Checklist

- [ ] Server starts without errors
- [ ] Web interface loads correctly
- [ ] Wallet list displays configured wallets
- [ ] Quote generation works
- [ ] Payment execution succeeds
- [ ] Transaction history updates
- [ ] Rate comparison displays data
- [ ] Arbitrage opportunities are calculated

---

## 🐛 Troubleshooting

### Common Issues

#### "Cannot find module" error
```bash
# Solution: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### "Invalid private key" error
- Ensure your private key is in PEM format
- Check that the key path in `.env` is correct
- Verify the key has proper permissions: `chmod 600 keys/*.key`

#### "Wallet not found" error
- Verify your wallet URL is correct
- Check that the wallet exists on the Open Payments provider
- Ensure the Key ID matches your uploaded public key

#### Database errors
```bash
# Solution: Regenerate the database
node regenerate_database.js
```

#### Port already in use
```bash
# Solution: Change the port in .env
PORT=3001
```

---

## 🚀 Deployment

### Deploying to Production

**⚠️ Warning**: This is a hackathon prototype. For production use, you should:

1. Add proper authentication and authorization
2. Implement rate limiting
3. Add comprehensive error handling
4. Use a production-grade database (PostgreSQL, MySQL)
5. Implement proper logging and monitoring
6. Add SSL/TLS encryption
7. Secure your private keys (use secrets management)
8. Add input validation and sanitization
9. Implement proper CORS policies
10. Add comprehensive testing

### Docker Deployment (Coming Soon)

```bash
# Build the image
docker build -t pythonistas-interledger .

# Run the container
docker run -p 3000:3000 --env-file .env pythonistas-interledger
```

---

## 🤝 Contributing

This is a hackathon project, but contributions are welcome! We'd love your help to improve and expand IL-Cash.

### Quick Contribution Guide

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Areas We Need Help

- 🧪 Testing and quality assurance
- 📚 Documentation improvements
- 🎨 UI/UX enhancements
- 🔒 Security audits
- 🌐 Internationalization
- 📱 Mobile app development

📖 **For detailed contribution guidelines**, see [CONTRIBUTING.md](CONTRIBUTING.md)

---

## 👥 Authors

**Pythonistas Team**  
Developed for a financial technology hackathon (2025)

- **Ana Raquel Lopez Hurtado** - Developer
- **Bryan Alexis Prieto Suárez** - Developer
- **Humberto Silva Baltazar** - Developer
- **Rey David Morales Pachuca** - Developer

---

## 📄 License

This project is licensed under the **MIT License** - feel free to fork, learn, and expand with proper attribution.

```
MIT License

Copyright (c) 2025 Pythonistas Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🌐 References

### Interledger & Open Payments

- **Open Payments Guide**: [https://openpayments.guide/](https://openpayments.guide/)
- **Interledger Foundation**: [https://interledger.org/](https://interledger.org/)
- **Rafiki (Open Payments Provider)**: [https://rafiki.money/](https://rafiki.money/)
- **Open Payments Specification**: [https://openpayments.dev/](https://openpayments.dev/)
- **Interledger Protocol (ILP)**: [https://interledger.org/developers/rfcs/ilp-protocol/](https://interledger.org/developers/rfcs/ilp-protocol/)

### APIs & Tools

- **Frankfurter API** (Exchange Rates): [https://www.frankfurter.app/](https://www.frankfurter.app/)
- **@interledger/open-payments** (npm): [https://www.npmjs.com/package/@interledger/open-payments](https://www.npmjs.com/package/@interledger/open-payments)
- **Better SQLite3**: [https://github.com/WiseLibs/better-sqlite3](https://github.com/WiseLibs/better-sqlite3)

### Financial Technology

- **STP (Sistema de Transferencias y Pagos)**: Mexico's domestic payment system
- **Cross-Border Payments**: [https://www.bis.org/cpmi/publ/d193.htm](https://www.bis.org/cpmi/publ/d193.htm)
- **Payment Service Provider (PSP)**: Industry standards and best practices

### Learning Resources

- **Open Payments Tutorial**: [https://openpayments.guide/introduction/](https://openpayments.guide/introduction/)
- **Building with Interledger**: [https://interledger.org/developers/get-started/](https://interledger.org/developers/get-started/)
- **Web Monetization**: [https://webmonetization.org/](https://webmonetization.org/)

---

## 🎯 Project Goals

**IL-Cash** demonstrates the potential of open payment protocols to:

1. **Reduce friction** in cross-border payments
2. **Increase transparency** in exchange rates and fees
3. **Enable interoperability** between different payment networks
4. **Lower costs** through competition and optimization
5. **Improve access** to international payment services

---

## 🔮 Future Enhancements

Potential improvements for future versions:

- [ ] Add multi-signature wallet support
- [ ] Implement payment streaming (Web Monetization)
- [ ] Add support for more currencies and payment networks
- [ ] Create mobile application (React Native)
- [ ] Add AI-powered route optimization
- [ ] Implement recurring payments
- [ ] Add payment request templates
- [ ] Create merchant dashboard
- [ ] Add webhook notifications
- [ ] Implement payment splits
- [ ] Add support for conditional payments
- [ ] Create analytics dashboard

---

## 🎓 For Hackathon Evaluators

Thank you for reviewing our project! Here's everything you need to know:

### 🚀 Quick Evaluation Setup

```bash
# 1. Clone and install
git clone https://github.com/ATROIX08/pythonistas-interledger.git
cd pythonistas-interledger
npm install

# 2. Download keys from Google Drive
# https://drive.google.com/drive/folders/14xjVuIWSyNo_S_A-LOtkUYTfI4MI8cki?usp=sharing
# Place all .key files in the keys/ directory

# 3. Start the application (.env is already configured)
npm start

# 4. Open http://localhost:3000
```

### 📋 What We Built

**IL-Cash** is a proof-of-concept multi-currency payment system demonstrating:

1. **Interledger Protocol Integration**: Real implementation using `@interledger/open-payments`
2. **Multi-Currency Support**: Handles 7+ currencies (USD, EUR, MXN, GBP, CAD, SGD, ZAR)
3. **Rate Arbitrage Detection**: Compares Open Payments rates vs market rates (Frankfurter API)
4. **Cross-Border Transfers**: Seamless payments between different currencies and wallets
5. **Modern Architecture**: Node.js backend + responsive HTML/JS frontend + optional Python backend

### 🎯 Key Features to Test

- **Wallet Management**: `/api/wallets` - View configured wallets
- **Rate Comparison**: `/api/rates` - Real-time exchange rates
- **Arbitrage Detection**: `/api/arbitrage` - Identify profitable opportunities
- **Quote Generation**: Create transfer quotes with live rates
- **Payment Execution**: Execute cross-currency transfers
- **Transaction History**: View all completed transfers

### 🔐 About Configuration

For this hackathon, we've designed the system to work with the **Open Payments test network**:

- **Test Network**: https://ilp-test.openpayments.com
- **Wallet Provider**: https://rafiki.money/
- **No Real Money**: All transactions use test funds

**Configuration Files**:
- `.env` - Already included in the repository with all wallet configurations
- **Private Keys** - Available on [Google Drive](https://drive.google.com/drive/folders/14xjVuIWSyNo_S_A-LOtkUYTfI4MI8cki?usp=sharing) (download and place in `keys/` directory)

### 📊 Technical Highlights

1. **Real Interledger Integration**: Not a simulation - uses actual ILP network
2. **Authenticated Requests**: Implements HTTP Message Signatures for security
3. **Rate Optimization**: Smart routing based on real-time rate comparison
4. **Database Persistence**: SQLite for transaction logging
5. **RESTful API**: Clean, documented endpoints
6. **Error Handling**: Comprehensive error messages and fallbacks

### 🧪 Testing the System

1. **API Health Check**:
   ```bash
   curl http://localhost:3000/api/wallets
   ```

2. **Get Exchange Rates**:
   ```bash
   curl http://localhost:3000/api/rates
   ```

3. **Check Arbitrage Opportunities**:
   ```bash
   curl http://localhost:3000/api/arbitrage
   ```

### 📝 Code Quality

- **Modular Design**: Separation of concerns (server, utils, frontend)
- **Documentation**: Comprehensive README and inline comments
- **Error Handling**: Try-catch blocks with meaningful messages
- **Security**: Environment variables, key separation, .gitignore
- **Scalability**: Easy to add new currencies and payment providers

### 🌟 Innovation Points

1. **Rate Arbitrage Engine**: Novel approach to finding optimal transfer routes
2. **Multi-Provider Support**: Can work with any Open Payments provider
3. **Dual Backend**: Node.js (primary) + Python (optional) for flexibility
4. **Real-World Application**: Designed for Mexico's remittance market (STP integration concept)
5. **Open Standards**: Built entirely on open protocols (no vendor lock-in)

### 🇲🇽 Mexican Context

This project addresses real challenges in Mexico's financial ecosystem:

- **Remittances**: Mexico is one of the world's top remittance recipients
- **Exchange Rate Transparency**: Often hidden fees in traditional services
- **STP Integration**: Demonstrates how Interledger can work with domestic systems
- **Financial Inclusion**: Lower barriers for cross-border payments

### ⚠️ Known Limitations (Hackathon Scope)

As a hackathon project, we acknowledge:

- **No Authentication System**: Would need user login/auth for production
- **Limited Error UI**: Backend handles errors well, frontend could be enhanced
- **No Rate Limiting**: Would need for production API
- **SQLite Database**: Would use PostgreSQL/MySQL in production
- **No Monitoring/Logging**: Would add APM tools in production
- **Test Network Only**: Works with ILP test network, not production yet

### 💡 Future Roadmap

If we continue this project, we'd add:

- User authentication and authorization
- Mobile application (React Native)
- Payment streaming support
- Multi-signature wallets
- AI-powered routing optimization
- Integration with Mexican banks (real STP)
- Merchant payment solutions
- Analytics dashboard

### 📧 Contact the Team

**Pythonistas Team**:
- Ana Raquel Lopez Hurtado
- Bryan Alexis Prieto Suárez
- Humberto Silva Baltazar
- Rey David Morales Pachuca

**GitHub**: [https://github.com/ATROIX08/pythonistas-interledger](https://github.com/ATROIX08/pythonistas-interledger)

---

## 💬 Support

For questions, issues, or suggestions:

- **GitHub Issues**: [https://github.com/ATROIX08/pythonistas-interledger/issues](https://github.com/ATROIX08/pythonistas-interledger/issues)
- **Interledger Forum**: [https://forum.interledger.org/](https://forum.interledger.org/)

---

## 🙏 Acknowledgments

Special thanks to:

- **Interledger Foundation** for creating open payment protocols
- **Rafiki Team** for providing test infrastructure
- **Hackathon Organizers** for the opportunity to build this project
- **Open Source Community** for the amazing tools and libraries

---

<div align="center">

### 🧩 Pythonistas Interledger: Building open, inclusive, and borderless payments from Mexico to the world.

**Made with ❤️ for the future of financial inclusion**

[⭐ Star this repo](https://github.com/ATROIX08/pythonistas-interledger) | [🐛 Report Bug](https://github.com/ATROIX08/pythonistas-interledger/issues) | [✨ Request Feature](https://github.com/ATROIX08/pythonistas-interledger/issues)

</div>
