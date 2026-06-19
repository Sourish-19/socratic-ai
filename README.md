# Socratic AI 🦉

Socratic AI is a modern, privacy-focused AI tutor. Instead of handing out direct answers and short-circuiting the learning process, it uses the Socratic method to guide students through problems. It encourages critical thinking, hypothesis generation, and deep conceptual understanding.

This project uses a fine-tuned LLM (`Qwen2.5-7B-Instruct-Turbo`) alongside a multi-stage **Hint Progression Engine** and a **Zero-Shot Socratic Filter** to ensure the AI never leaks the final answer before the student earns it.

---

## 🏗️ Monorepo Architecture

This project is structured as a modern monorepo, cleanly separating the web interface, the local API, production deployment code, and the underlying AI training infrastructure.

```text
socratic-ai/
├── frontend/                   # 🖥️ The React/Vite web application
├── backend/                    # ⚙️ The local FastAPI server and Socratic layer
├── deployment/                 
│   └── render/                 # 🚀 The lightweight production backend (Together AI + Render)
├── ai_training/                # 🧠 Custom model training scripts, datasets, and notebooks
└── logs/                       # 📝 Logs generated during model training/eval
```

---

## 💻 Local Development Setup

To run Socratic AI locally, you need to run both the Python backend and the React frontend.

### 1. Start the Backend
The backend requires Python 3.10+ and uses a local SQLite database (`diskcache`) to manage session state.

1. Open a terminal in the root directory.
2. Activate your virtual environment (if you have one).
3. Install the root requirements:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the local server:
   ```bash
   cd backend
   python src/server.py
   ```
   *The backend will now be running on `http://localhost:8000`.*

### 2. Start the Frontend
The frontend is a React application built with Vite and Tailwind CSS.

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the Node dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   *The web app will now be accessible at `http://localhost:5173`.*

---

## 🚀 Zero-Cost Production Deployment

You can deploy this entire application to the internet for **$0/month** using Vercel, Render, and Together AI.

### The API Pivot (Backend)
Because loading a 15GB Language Model requires expensive GPUs, the production deployment in `deployment/render/app.py` acts as a lightweight proxy. It uses the `openai` Python SDK to securely forward requests to the **Together AI** server farm, which provides extremely fast, free inference for the open-source `Qwen2.5-7B-Instruct-Turbo` model. 

Additionally, the heavy local ML `SocraticFilter` has been swapped for a zero-RAM **Serverless LLM Filter**, allowing the backend to run perfectly on Render's 512MB free tier.

### Deployment Steps:
1. **GitHub:** Push this entire repository to your personal GitHub account.
2. **Together AI API:** Create a free account at [Together AI](https://api.together.ai/) and generate an API Key.
3. **Deploy Backend (Render):**
   - Create a new **Free Web Service** on [Render.com](https://render.com/).
   - Connect your GitHub repo.
   - **Root Directory:** `deployment/render`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app:app --host 0.0.0.0 --port $PORT`
   - **Environment Variables:** Add `TOGETHER_API_KEY` with your API key.
4. **Deploy Frontend (Vercel):**
   - Create a new **Project** on [Vercel](https://vercel.com/) and import your GitHub repo.
   - **Root Directory:** `frontend`
   - **Environment Variables:** Add `VITE_API_URL` and set it to your new Render backend URL (e.g., `https://socratic-backend.onrender.com`).

---

## 🧠 AI Training Infrastructure

If you wish to re-train the underlying models, explore the `ai_training/` directory. It contains all the necessary datasets, training scripts (Supervised Fine-Tuning and Direct Preference Optimization), and evaluation metrics used to create the Socratic behavior.
