import os
import json
import uuid
import torch
import spaces
import gradio as gr
from typing import List, Dict, Optional
from transformers import pipeline

# ==========================================
# 1. CORE SOCRATIC LOGIC (Hint Engine, Scorer)
# ==========================================
class SessionManager:
    def __init__(self):
        from diskcache import Cache
        self.cache = Cache("./session_cache")
        
    def create_session(self, session_id: str, topic: str):
        self.cache.set(session_id, {
            'topic': topic,
            'stage': 1,
            'hints_given': 0,
            'history': [],
            'subject': topic
        })
        return self.cache.get(session_id)
        
    def get_session(self, session_id: str):
        return self.cache.get(session_id)
        
    def update_session(self, session_id: str, data: dict):
        self.cache.set(session_id, data)

PROMPT_TEMPLATES = {
    1: 'You are a Socratic tutor. The student wants to learn about {subject}. Start by asking a broad, open-ended question to assess their current understanding. Do NOT provide the answer.',
    2: 'The student has provided an initial thought. Ask a probing question to guide them deeper into {subject}. Do NOT give away the answer.',
    3: 'The student is struggling slightly. Provide a minor hint about {subject} in the form of a question.',
    4: 'The student is still struggling. Provide a more direct hint about {subject}, but still require them to do the final reasoning.',
    5: 'The student is highly confused. Break down the concept of {subject} into the smallest possible step and ask them to solve just that step.',
    6: 'The student appears to understand {subject}. Ask them to explain the concept in their own words. Do NOT provide a model answer.',
    7: 'The student has successfully understood {subject}. Affirm their understanding and ask if they have any other questions.'
}

class ConfidenceScorer:
    def score(self, student_response: str) -> float:
        score = 0.5
        if len(student_response.split()) < 5: score -= 0.2
        if len(student_response.split()) > 20: score += 0.2
        for marker in ['because', 'therefore', 'so', 'means']:
            if marker in student_response.lower(): score += 0.1
        if '?' in student_response: score -= 0.1
        return max(0.0, min(1.0, score))

class HintProgressionEngine:
    def __init__(self):
        self.scorer = ConfidenceScorer()

    def determine_next_stage(self, current_stage, student_response):
        confidence = self.scorer.score(student_response)
        if current_stage == 1: return 2
        elif current_stage == 2: return 3 if confidence < 0.6 else 6
        elif current_stage == 3:
            if confidence < 0.4: return 4
            if confidence >= 0.6: return 6
            return 3
        elif current_stage == 4:
            if confidence < 0.5: return 5
            if confidence >= 0.6: return 6
            return 4
        elif current_stage == 5: return 6 if confidence >= 0.7 else 5
        elif current_stage == 6: return 7 if confidence >= 0.7 else 2
        return current_stage

class SocraticFilter:
    def __init__(self):
        self.classifier = None
        self.leak_hypothesis = 'provides the direct answer to a concept the student has not figured out yet'
        self.socratic_hypothesis = 'asks a guiding question or confirms a correct answer from the student'
        
    def blocks_direct_answer(self, ai_response: str) -> bool:
        if self.classifier is None:
            print("Lazy-loading Socratic Filter model...")
            self.classifier = pipeline('zero-shot-classification', model='facebook/bart-large-mnli', device=-1)
        res = self.classifier(ai_response[:512], [self.leak_hypothesis, self.socratic_hypothesis])
        return res['labels'][0] == self.leak_hypothesis and res['scores'][0] > 0.6

# ==========================================
# 2. STATE AND INIT
# ==========================================
session_manager = SessionManager()
hint_engine = HintProgressionEngine()
socratic_filter = SocraticFilter()

MODEL_ID = "Qwen/Qwen2.5-7B-Instruct"
ADAPTER_ID = "sourishsrivignesh/Socratic-Tutor-Adapter"

from huggingface_hub import snapshot_download

print("Pre-downloading models to disk cache during boot to avoid ZeroGPU timeouts...")
snapshot_download(MODEL_ID)
snapshot_download(ADAPTER_ID)
snapshot_download("facebook/bart-large-mnli")
print("Pre-downloads complete!")

model = None
tokenizer = None

# ==========================================
# 3. HUGGINGFACE ZEROGPU INFERENCE
# ==========================================
def generate_response(messages: List[Dict]) -> str:
    global model, tokenizer
    if model is None:
        print("Lazy-loading base model in bfloat16 (this is much faster than 4-bit quantization)...")
        from transformers import AutoTokenizer, AutoModelForCausalLM
        from peft import PeftModel
        import torch
        
        tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
        base_model = AutoModelForCausalLM.from_pretrained(
            MODEL_ID, 
            torch_dtype=torch.bfloat16
        )
        print("Loading custom Socratic LoRA adapter...")
        model = PeftModel.from_pretrained(base_model, ADAPTER_ID)
        model.to("cuda")
        
    text_messages = []
    for msg in messages:
        if isinstance(msg['content'], list):
            text_content = " ".join([c.get("text", "") for c in msg['content'] if c.get("type") == "text"])
            text_messages.append({"role": msg["role"], "content": text_content})
        else:
            text_messages.append({"role": msg["role"], "content": msg["content"]})
            
    text = tokenizer.apply_chat_template(
        text_messages,
        tokenize=False,
        add_generation_prompt=True
    )
    model_inputs = tokenizer([text], return_tensors="pt").to("cuda")
    
    generated_ids = model.generate(
        **model_inputs,
        max_new_tokens=512,
        temperature=0.7
    )
    generated_ids = [
        output_ids[len(input_ids):] for input_ids, output_ids in zip(model_inputs.input_ids, generated_ids)
    ]
    
    response = tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0]
    return response

# ==========================================
# 4. PURE GRADIO API
# ==========================================
@spaces.GPU(duration=120)
def handle_chat(request_json: str) -> str:
    try:
        req = json.loads(request_json)
        session_id = req.get("session_id")
        message = req.get("message")
        system_prompt = req.get("system_prompt")
        
        if not session_id or not message:
            return json.dumps({"error": "Missing session_id or message"})

        session = session_manager.get_session(session_id)
        if not session:
            session = session_manager.create_session(session_id, "general")

        stage = session['stage']
        subject = session.get('subject', 'general')
        
        if system_prompt:
            system_content = system_prompt
        else:
            template = PROMPT_TEMPLATES.get(stage, PROMPT_TEMPLATES[1])
            system_content = template.format(subject=subject)
    
        messages = [{'role': 'system', 'content': system_content}]
        messages += session['history']
        messages.append({'role': 'user', 'content': message})
    
        response = generate_response(messages)
    
        if socratic_filter.blocks_direct_answer(response):
            print("[FILTER] Model leaked answer! Intervening...")
            messages.append({'role': 'assistant', 'content': response})
            messages.append({'role': 'user', 'content': 'That was too direct. Please try again and ask a guiding question instead without revealing the answer.'})
            response = generate_response(messages)
    
        session['history'].append({'role': 'user', 'content': message})
        session['history'].append({'role': 'assistant', 'content': response})
        
        next_stage = hint_engine.determine_next_stage(stage, message)
        session['stage'] = next_stage
        
        if next_stage in [3, 4, 5]:
            session['hints_given'] += 1

        session_manager.update_session(session_id, session)
        confidence = hint_engine.scorer.score(message)

        return json.dumps({
            "response": response, 
            "stage": next_stage,
            "hints_given": session['hints_given'],
            "confidence": confidence
        })
    except Exception as e:
        return json.dumps({"error": str(e)})

# Create the Gradio interface
demo = gr.Interface(
    fn=handle_chat,
    inputs=gr.Textbox(label="JSON Request"),
    outputs=gr.Textbox(label="JSON Response"),
    title="Socratic AI ZeroGPU API",
    description="Send a JSON string with session_id and message to get a Socratic response."
)

if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860)
