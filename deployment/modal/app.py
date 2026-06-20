import modal
import json
import os

# ==========================================
# 1. MODAL APP + IMAGE DEFINITION
# ==========================================
app = modal.App("socratic-ai")

# Define the container image with all dependencies
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "torch==2.3.1",
        "transformers==4.44.0",
        "peft==0.12.0",
        "accelerate==0.33.0",
        "bitsandbytes==0.43.3",
        "huggingface_hub>=0.24.0",
        "sentencepiece",
        "protobuf",
        "scipy",
        "diskcache",
        "fastapi[standard]",
    )
)

# Persistent volume to cache the 15GB model weights between cold starts
volume = modal.Volume.from_name("socratic-model-cache", create_if_missing=True)
MODEL_DIR = "/model-cache"

MODEL_ID = "Qwen/Qwen2.5-7B-Instruct"
ADAPTER_ID = "sourishsrivignesh/Socratic-Tutor-Adapter"


# ==========================================
# 2. SOCRATIC ENGINE LOGIC
# ==========================================
PROMPT_TEMPLATES = {
    1: "You are a Socratic tutor. The student wants to learn about {subject}. Start by asking a broad, open-ended question to assess their current understanding. Do NOT provide the answer directly.",
    2: "The student has provided an initial thought. Ask a probing question to guide them deeper into {subject}. Do NOT give away the answer.",
    3: "The student is struggling slightly. Provide a minor hint about {subject} in the form of a question.",
    4: "The student is still struggling. Provide a more direct hint about {subject}, but still require them to do the final reasoning.",
    5: "The student is highly confused. Break down the concept of {subject} into the smallest possible step and ask them to solve just that step.",
    6: "The student appears to understand {subject}. Ask them to explain the concept in their own words to confirm understanding.",
    7: "The student has successfully understood {subject}. Affirm their understanding and invite further questions.",
}


class ConfidenceScorer:
    def score(self, student_response: str) -> float:
        score = 0.5
        words = student_response.split()
        if len(words) < 5:
            score -= 0.2
        if len(words) > 20:
            score += 0.2
        for marker in ["because", "therefore", "so", "means", "since", "thus"]:
            if marker in student_response.lower():
                score += 0.1
        if "?" in student_response:
            score -= 0.1
        return max(0.0, min(1.0, score))


class HintProgressionEngine:
    def __init__(self):
        self.scorer = ConfidenceScorer()

    def determine_next_stage(self, current_stage: int, student_response: str) -> int:
        confidence = self.scorer.score(student_response)
        if current_stage == 1:
            return 2
        elif current_stage == 2:
            return 3 if confidence < 0.6 else 6
        elif current_stage == 3:
            if confidence < 0.4:
                return 4
            if confidence >= 0.6:
                return 6
            return 3
        elif current_stage == 4:
            if confidence < 0.5:
                return 5
            if confidence >= 0.6:
                return 6
            return 4
        elif current_stage == 5:
            return 6 if confidence >= 0.7 else 5
        elif current_stage == 6:
            return 7 if confidence >= 0.7 else 2
        return current_stage


# ==========================================
# 3. MODAL SERVERLESS CLASS
# ==========================================
@app.cls(
    image=image,
    gpu="T4",
    volumes={MODEL_DIR: volume},
    timeout=300,
    scaledown_window=60,
    secrets=[modal.Secret.from_name("huggingface-secret")],
)
class SocraticModel:
    @modal.enter()
    def load_model(self):
        """Runs once when the container boots. Downloads and loads the model."""
        import torch
        from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
        from peft import PeftModel
        from huggingface_hub import snapshot_download
        import diskcache

        self.hint_engine = HintProgressionEngine()
        self.scorer = ConfidenceScorer()
        self.sessions = diskcache.Cache(f"{MODEL_DIR}/sessions")

        # Check if model already cached in the volume
        base_cache = f"{MODEL_DIR}/base"
        adapter_cache = f"{MODEL_DIR}/adapter"

        if not os.path.exists(f"{base_cache}/config.json"):
            print("Downloading base model to persistent volume...")
            snapshot_download(MODEL_ID, local_dir=base_cache)
            print("Downloading adapter to persistent volume...")
            snapshot_download(ADAPTER_ID, local_dir=adapter_cache)
        else:
            print("Model already cached in volume. Loading...")

        print("Loading model into GPU...")
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16,
        )
        self.tokenizer = AutoTokenizer.from_pretrained(base_cache)
        base_model = AutoModelForCausalLM.from_pretrained(
            base_cache,
            quantization_config=bnb_config,
            device_map="auto",
        )
        self.model = PeftModel.from_pretrained(base_model, adapter_cache)
        self.model.eval()
        print("Model ready!")

    def _generate(self, messages: list) -> str:
        import torch

        text = self.tokenizer.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )
        inputs = self.tokenizer([text], return_tensors="pt").to("cuda")
        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=512,
                temperature=0.7,
                do_sample=True,
                pad_token_id=self.tokenizer.eos_token_id,
            )
        generated = outputs[0][inputs.input_ids.shape[1]:]
        return self.tokenizer.decode(generated, skip_special_tokens=True).strip()

    @modal.fastapi_endpoint(method="POST")
    def chat(self, request: dict) -> dict:
        """The main permanent HTTPS endpoint. Accepts JSON, returns JSON."""
        try:
            session_id = request.get("session_id")
            message = request.get("message", "")
            system_prompt = request.get("system_prompt")

            if not session_id or not message:
                return {"error": "Missing session_id or message"}

            # Get or create session
            session = self.sessions.get(session_id)
            if not session:
                session = {
                    "topic": "general",
                    "stage": 1,
                    "hints_given": 0,
                    "history": [],
                    "subject": "general",
                }

            stage = session["stage"]
            subject = session.get("subject", "general")

            if system_prompt:
                system_content = system_prompt
            else:
                template = PROMPT_TEMPLATES.get(stage, PROMPT_TEMPLATES[1])
                system_content = template.format(subject=subject)

            messages = [{"role": "system", "content": system_content}]
            messages += session["history"][-10:]  # Keep last 10 turns for context
            messages.append({"role": "user", "content": message})

            response = self._generate(messages)

            # Update session
            session["history"].append({"role": "user", "content": message})
            session["history"].append({"role": "assistant", "content": response})
            next_stage = self.hint_engine.determine_next_stage(stage, message)
            session["stage"] = next_stage
            if next_stage in [3, 4, 5]:
                session["hints_given"] += 1
            self.sessions.set(session_id, session)

            confidence = self.scorer.score(message)
            return {
                "response": response,
                "stage": next_stage,
                "hints_given": session["hints_given"],
                "confidence": confidence,
            }
        except Exception as e:
            return {"error": str(e)}

    @modal.fastapi_endpoint(method="GET")
    def health(self) -> dict:
        """Simple health check endpoint."""
        return {"status": "ok", "model": MODEL_ID, "adapter": ADAPTER_ID}
