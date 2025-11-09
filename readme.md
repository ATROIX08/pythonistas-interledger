# 🏦 Pythonistas Interledger — STP Multi-Currency Demo

**Pythonistas Interledger** is a prototype for a **multi-currency STP (Sistema de Transferencias y Pagos)** built with **Flask (Python)** and **HTML/JavaScript frontend**.  
The goal is to **enable cross-currency transfers and optimize exchange rates**, simulating a **multi-network payment system** inspired by **Open Payments** and the **Interledger Protocol (ILP)**.  

> ⚙️ Developed for a hackathon — functional demo, not production-ready.

---

## 🚀 Overview

This project demonstrates how **domestic and international transfers** can be unified under a single architecture capable of:
- Supporting **multiple fiat or digital currencies** (MXN, USD, etc.).
- Handling **real-time exchange rate optimization** via algorithmic conversion.
- Integrating **STP logic** (domestic transfer simulation) and **Interledger-style settlement**.
- Working with **modular APIs** for easy extension into financial applications.

The design allows users to simulate **wallet creation, transfer requests, and rate optimization** between participants, even when using distinct ledgers.

---

## 🧩 Architecture

/stp_offline_app/
│
├── main.py # Flask app entry point (UI + logic)
├── wallet_offline.py # Core transaction logic (Outbox + Sync)
├── stp.kv # UI layout (for mobile/demo integration)
├── static/ # Frontend assets (JS, CSS)
├── templates/ # HTML templates for the web UI
└── buildozer.spec # Android build configuration (optional)


**Frontend:** Plain HTML, JS, and CSS  
**Backend:** Flask (Python 3.10+)  
**Integration target:** Open Payments / Interledger-compatible APIs  
**Database:** Local JSON or in-memory simulation for demo purposes  

---

## ⚙️ How It Works

1. **User Authentication / Wallet Setup**  
   Each user creates or loads a wallet with a defined base currency.  

2. **Payment Request**  
   The app sends payment instructions through the STP module (`wallet_offline.py`) and simulates ledger verification.  

3. **Exchange Optimization**  
   The backend fetches or simulates exchange rates, selecting the most efficient path between currencies.  

4. **Settlement**  
   Transactions are recorded and confirmed with an Interledger-like routing structure.

---

## 🧠 Core Components

| Module | Description |
|--------|-------------|
| `main.py` | Launches the Flask web app, routes requests, handles UI interaction. |
| `wallet_offline.py` | Core of transaction logic, manages pending and confirmed payments, rate optimization. |
| `open-payments/` | (Planned) Integration layer for GNAP / Open Payments standards. |
| `front/` | Frontend prototype (HTML/CSS/JS). |
| `keys/` | Demo key storage for local development. |

---

## 🔧 Installation & Setup

```bash
# Clone the repository
git clone https://github.com/ATROIX08/pythonistas-interledger.git
cd pythonistas-interledger

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate   # Linux/Mac
venv\Scripts\activate      # Windows

# Install dependencies
pip install -r requirements.txt

# Run the app
python main.py
Once running, open http://localhost:5000 to view the demo UI.

💱 Example Use Case
Goal: Send $100 USD to a recipient using MXN, selecting the optimal route.

Sender inputs amount and currency.

Flask backend checks simulated FX data (e.g., USD→EUR→MXN vs USD→MXN).

System executes the route with the best conversion rate and lowest cost.

Transaction logs are updated and displayed in UI.

🧭 Roadmap
 Integrate real-time exchange rate API (e.g., Open Exchange Rates, Banxico API).

 Implement GNAP authorization flow for secure transactions.

 Add persistent database (SQLite/PostgreSQL).

 Build mobile APK version via Kivy + Buildozer.

 Connect with STP sandbox for real-world testing.

👥 Authors
Pythonistas Team
Developed by participants of a financial technology hackathon (2025).
Ana Raquel Lopez Hurtado
Bryan Alexis Prieto Suárez
Humberto Silva Baltazar
Rey David Morales Pachuca

🧾 License
This project is currently shared under the MIT License — feel free to fork, learn, and expand it with proper attribution.

🌐 References

Frankfurter Exchange Rate API

Open Payments Overview

Interledger Protocol


🧩 Pythonistas Interledger: building open, inclusive, and borderless payments from Mexico to the world.

---
