import json, random
import re, time

print("Loading datasets...")
from datasets import load_dataset

print("Loading MATH...")
math_ds   = load_dataset('gsm8k', 'main', split='train')
print("Loading ScienceQA...")
sci_ds    = load_dataset('derek-thomas/ScienceQA', split='train', trust_remote_code=True)
print("Loading TriviaQA...")
trivia_ds = load_dataset('mandarjoshi/trivia_qa', 'rc', split='train[:5000]')

print("Datasets loaded. Importing torch and loading model...")
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
# ── Step 2: Load Qwen2.5-1.5B-Instruct locally in 4-bit ──────────
MODEL_PATH = 'Qwen/Qwen2.5-1.5B-Instruct'
bnb = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_compute_dtype=torch.bfloat16)
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH, trust_remote_code=True)
print("Tokenizer loaded. Loading CausalLM...")
model = AutoModelForCausalLM.from_pretrained(
    MODEL_PATH, quantization_config=bnb, device_map={'': 0}, trust_remote_code=True
)
print("Model loaded successfully.")
 
STAGES = {
    1: 'Ask what the student already knows about this topic.',
    2: 'Surface the student initial guess or hypothesis.',
    3: 'Probe for specific misconceptions the student holds.',
    4: 'Ask the student to explain their current reasoning.',
    5: 'Provide an analogy hint — no direct explanation.',
    6: 'Point the student at a specific concept to research or recall.',
    7: 'Give a near-direct scaffold — very close to the answer but still a question.',
    8: 'Ask the student to explain the full concept back in their own words.',
}
 
GENERATOR_SYSTEM = '''You generate training data for a Socratic AI tutor.
Given a question and its answer, generate a realistic 4-6 turn tutoring conversation.
Stage goal: {stage_desc}
STRICT RULES:
- The AI tutor NEVER reveals the answer, solution, or derivation.
- The AI only asks questions and provides scaffolding.
- FORBIDDEN phrases: the answer is, the solution is, therefore X equals.
Output the conversation EXACTLY in this format, with no markdown or preamble:
User: [question]
Assistant: [response]
User: [response]
Assistant: [response]'''
 
def build_prompt(question, answer, stage):
    user_content = f'Question: {question}\nCorrect answer (DO NOT reveal): {answer}\nStage: {stage} -- {STAGES[stage]}'
    messages = [
        {'role': 'system', 'content': GENERATOR_SYSTEM.format(stage_desc=STAGES[stage])},
        {'role': 'user',   'content': user_content},
    ]
    return tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
 
def generate_one(question, answer, stage):
    prompt = build_prompt(question, answer, stage)
    inputs = tokenizer(prompt, return_tensors='pt').to(model.device)
    with torch.no_grad():
        out = model.generate(
            **inputs, max_new_tokens=800, temperature=0.85,
            do_sample=True, top_p=0.92, repetition_penalty=1.05
        )
    text = tokenizer.decode(out[0][inputs['input_ids'].shape[1]:], skip_special_tokens=True)
    
    messages = [{'role': 'system', 'content': GENERATOR_SYSTEM.format(stage_desc=STAGES[stage])}]
    
    parts = re.split(r'^(User|Assistant):\s*', text.strip(), flags=re.MULTILINE)
    
    # parts will be ['', 'User', 'text...', 'Assistant', 'text...']
    for i in range(1, len(parts)-1, 2):
        role = 'user' if parts[i] == 'User' else 'assistant'
        content = parts[i+1].strip()
        if content:
            messages.append({'role': role, 'content': content})
            
    if len(messages) <= 1:
        raise ValueError("Failed to parse conversation")
        
    return {'messages': messages}
 
# ── Step 3: Build a flat pool of (question, answer, subject) tuples ─
pool = []
for ex in math_ds.select(range(700)):
    pool.append(('mathematics', ex['question'], ex['answer']))
for ex in sci_ds.select(range(800)):
    pool.append((ex.get('subject','science'), ex['question'], ex['choices'][ex['answer']]))
for ex in trivia_ds.select(range(500)):
    pool.append(('general knowledge', ex['question'], ex['answer']['value']))
 
# ── Step 4: Generate and save ───────────────────────────────────
random.shuffle(pool)
saved = 0
with open('data/raw/sft_data.jsonl', 'w', encoding='utf-8') as f:
    for subject, question, answer in pool:
        stage = random.randint(1, 8)
        try:
            torch.cuda.empty_cache()
            ex = generate_one(question, answer, stage)
            ex['metadata'] = {'subject': subject, 'stage': stage}
            f.write(json.dumps(ex) + '\n')
            saved += 1
            if saved % 100 == 0:
                print(f'Generated {saved} examples...')
        except Exception as e:
            print(f"Error generating example: {e}")
            continue
 
print(f'Done. {saved} examples saved to data/raw/sft_data.jsonl')
