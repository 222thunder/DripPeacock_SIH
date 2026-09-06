# Legal Metrology Packaged Commodity Compliance System (SIH 2026)

**SIH Problem Statement ID:** 26034
**Title:** Software System to check compliance of Packaged Commodities under Legal Metrology (Packaged Commodities) Rules, 2011 by scanning products, images and labels.

This project is an AI-assisted software platform that scans packaged commodity images, extracts mandatory declarations via OCR and AI, validates them against the Legal Metrology Rules, and identifies potential non-compliances.

## 🚀 How to Run the Demo

We have provided a unified script to start the **AI Service**, **Backend**, and **Frontend** simultaneously.

1. Ensure you have Python 3 and Node.js installed.
2. Open your terminal at the root of the project.
3. Run the demo script:
   ```bash
   ./start_demo.sh
   ```
4. The script will start all services. Open your browser and go to:
   **[http://localhost:3000](http://localhost:3000)**

_(To stop the services, simply press `Ctrl+C` in the terminal)._

## 🏗️ Architecture

- **Frontend:** Next.js / React, TailwindCSS, Framer Motion (Runs on Port 3000)
- **Backend:** Node.js, Express, MongoDB (Runs on Port 5001)
- **AI Service:** FastAPI, Python, OCR (Tesseract), LLM-assisted parsing (Runs on Port 8000)

## ✨ Key Features for the Demo

1. **Smart Scanner:** Upload multiple images (front, back, nutritional label) of a product.
2. **AI-Powered OCR:** Automatically extracts text and uses AI to map it to structured Legal Metrology fields (MRP, Net Quantity, Manufacturer, etc.).
3. **Rule Engine Validation:** Checks extracted fields against mandatory rules and flags non-compliance.
4. **Resilient Backend:** Even if MongoDB isn't running locally on your machine, the backend handles it gracefully to ensure the demo continues working seamlessly.

## 👥 Team

- **Team Name:** DripPeakcock
- **Hackathon:** Smart India Hackathon (SIH) 2026
