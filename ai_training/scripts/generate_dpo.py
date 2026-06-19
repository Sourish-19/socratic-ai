import json, torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
 
MODEL_PATH = 'Qwen/Qwen2.5-1.5B-Instruct'
bnb = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_compute_dtype=torch.bfloat16)
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH, trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained(
    MODEL_PATH, quantization_config=bnb, device_map='auto', trust_remote_code=True
)
 
# System prompt that FORCES a direct answer — produces the 'rejected' side of DPO pairs
DIRECT_SYSTEM = '''You are a standard AI assistant.
Answer the student's question directly and completely.
Explain the full solution with all steps shown.
Do NOT ask any questions back to the student.'''
 
def generate_direct(convo_msgs):
    # Strip the Socratic system prompt, replace with direct-answer prompt
    direct_msgs = [{'role': 'system', 'content': DIRECT_SYSTEM}]
    direct_msgs += [m for m in convo_msgs if m['role'] in ('user',)][-2:]  # last user turn only
    prompt = tokenizer.apply_chat_template(direct_msgs, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer(prompt, return_tensors='pt').to(model.device)
    with torch.no_grad():
        out = model.generate(**inputs, max_new_tokens=300, temperature=0.4, do_sample=True)
    return tokenizer.decode(out[0][inputs['input_ids'].shape[1]:], skip_special_tokens=True).strip()
 
dpo_pairs = []
try:
    with open('data/processed/sft_train.jsonl', encoding='utf-8') as f:
        for i, line in enumerate(f):
            if i >= 2000: break
            ex = json.loads(line)
            msgs = ex['messages']
            chosen = msgs[-1]['content']        # Socratic response from SFT data
            rejected = generate_direct(msgs)    # Direct-answer response generated locally
            # Sanity check: rejected must be meaningfully different from chosen
            if len(rejected) > 30 and rejected != chosen:
                dpo_pairs.append({
                    'prompt': [m for m in msgs[:-1]],  # all turns except last assistant
                    'chosen': chosen,
                    'rejected': rejected,
                })
            if i % 100 == 0:
                print(f'DPO pairs generated: {len(dpo_pairs)}')
except FileNotFoundError:
    print("data/processed/sft_train.jsonl not found.")
    exit(1)
 
with open('data/processed/dpo_pairs.jsonl', 'w', encoding='utf-8') as f:
    for p in dpo_pairs:
        f.write(json.dumps(p) + '\n')
print(f'Done. {len(dpo_pairs)} DPO pairs saved.')
