# Socratic AI 🦉

Socratic AI is a modern, privacy-focused educational artificial intelligence (AI) tutor. Instead of handing out direct answers and short-circuiting the learning process, it uses the Socratic method to guide students through problems. It encourages critical thinking, hypothesis generation, and deep conceptual understanding.

This project deploys a custom, fine-tuned Large Language Model (LLM)—specifically your custom **Socratic-Tutor-Adapter** layered on top of the **Qwen2.5-7B-Instruct** base model—directly on serverless Graphics Processing Units (GPUs) for zero running cost.

---

## 🏗️ Monorepo Architecture

This project is structured as a monorepo separating the web interface, local development server, production serverless deployment, and training infrastructure.

```text
socratic-ai/
├── frontend/                   # 🖥️ React/Vite web application (TypeScript + Tailwind CSS)
├── backend/                    # ⚙️ Local FastAPI server and Socratic session cache
├── deployment/                 
│   └── modal/                  # 🚀 Serverless GPU Deployment code (Modal.com)
├── ai_training/                # 🧠 Custom model training scripts (SFT and DPO notebooks)
└── logs/                       # 📝 Logs generated during model training and evaluation
```

---

## 💻 Local Development Setup

To run Socratic AI locally, you can run both the Python backend and the React frontend.

### 1. Start the Backend
The backend requires Python 3.10+ and uses a local SQLite database (`diskcache`) to manage session state.

1. Open a terminal in the root directory.
2. Activate your virtual environment:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the local server:
   ```bash
   cd backend
   python src/server.py
   ```
   *The backend will now be running on `http://localhost:8000`.*

### 2. Start the Frontend
The frontend is a React Single Page Application (SPA) built with Vite and Tailwind CSS.

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   *The web app will now be accessible at `http://localhost:5173`.*

---

## 🚀 Serverless Production Deployment (Modal.com + Vercel)

The production stack is designed to run completely on free tiers, serving your custom-trained LoRA (Low-Rank Adaptation) model weights directly on cloud GPUs.

### 1. Deploy the Backend to Modal
We deploy the model to [Modal.com](https://modal.com) as a serverless container class. It automatically provisions a cloud GPU (NVIDIA T4) on demand, loads your weights, and sleeps after 60 seconds of inactivity to stay within Modal's $30/month free tier.

1. Install the Modal Command Line Interface (CLI):
   ```bash
   pip install modal
   ```
2. Authenticate the CLI with your Modal account:
   ```bash
   modal token new
   ```
3. Create a Hugging Face secret in your Modal dashboard named `huggingface-secret` with your `HF_TOKEN`.
4. Deploy the backend code:
   ```bash
   $env:PYTHONUTF8=1; $env:PYTHONIOENCODING="utf-8"
   modal deploy deployment/modal/app.py
   ```
   *This outputs your permanent backend chat URL:*
   `https://sourishsrivignesh--socratic-ai-socraticmodel-chat.modal.run`

### 2. Deploy the Frontend to Vercel
The frontend React app is deployed directly on Vercel.

1. Connect your GitHub repository to Vercel.
2. Set the root directory to `frontend`.
3. Build & Deploy. Vercel automatically reads the [vercel.json](file:///c:/Users/Sourish/Documents/Projects/Socratic%20AI/frontend/public/vercel.json) configuration to handle Single Page Application (SPA) routing rewrites, preventing `404 Not Found` errors when refreshing or duplicating tabs.

---

## 🧠 Socratic Alignment & Technical Pipeline

The Socratic tutoring behavior is enforced through a hybrid neural and heuristic pipeline:

### 1. Quantized Low-Rank Adaptation (QLoRA)
To serve the 15-Gigabyte (GB) model efficiently on a budget T4 GPU, we load the base model in 4-bit NormalFloat (NF4) precision using double quantization. We overlay the custom-trained LoRA adapter (`sourishsrivignesh/Socratic-Tutor-Adapter`) onto the attention and MLP layers.

### 2. Direct Preference Optimization (DPO)
To prevent the model from leaking direct answers when students get frustrated, the model was aligned using Direct Preference Optimization (DPO). The model was trained on preference pairs containing chosen Socratic guidance and rejected direct-answer responses, optimizing the policy weights directly.

### 3. Dynamic Configuration Patching
Adapters trained with the `unsloth` library inject custom configuration parameters (e.g. `arrow_config`, `alora_invocation_tokens`) that standard Hugging Face PEFT doesn't support. The Modal container uses runtime python reflection on container boot to filter out unrecognized arguments dynamically, preventing cold-start crashes.

### 4. Stateful Dialogue Scaffolding
A heuristic state machine tracks user messages. By scoring response length and linguistic confidence markers (e.g. *"because"*, *"therefore"*), the engine determines the student's cognitive state and progresses the conversation through 7 structured scaffolding stages.
