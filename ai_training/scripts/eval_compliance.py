import json
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline, BitsAndBytesConfig
from peft import PeftModel
from tqdm import tqdm

print("Initializing 4-bit Base Model...")
# 1. Load Base Model in 4-bit (so it doesn't crash the laptop)
base_model_name = "Qwen/Qwen2.5-7B-Instruct"
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_use_double_quant=True,
    llm_int8_enable_fp32_cpu_offload=True
)

tokenizer = AutoTokenizer.from_pretrained(base_model_name)
base_model = AutoModelForCausalLM.from_pretrained(
    base_model_name,
    quantization_config=bnb_config,
    device_map='auto',
    offload_folder="offload"
)

print("Loading DPO Adapter...")
# 2. Apply the local DPO Adapter from Phase 4
adapter_path = r"C:\Users\Sourish\Documents\Projects\Socratic AI\socratic-qwen25-7b-merged\final"
model = PeftModel.from_pretrained(base_model, adapter_path, offload_folder="offload")

print("Loading NLI Evaluator...")
# 3. Load Zero-shot NLI classifier to act as the automated judge
nli = pipeline('zero-shot-classification', model='facebook/bart-large-mnli', device_map='auto')

LEAKAGE_HYPOTHESIS = 'This response directly reveals the answer or solution to the student.'
SOCRATIC_HYPOTHESIS = 'This response asks a guiding question without revealing the answer.'

results = {'compliant': 0, 'leaked': 0, 'total': 0}

print("\nStarting Evaluation against SFT Validation Set...")
# 4. Run Evaluation
with open(r"C:\Users\Sourish\Documents\Projects\Socratic AI\data\processed\sft_eval.jsonl") as f:
    lines = f.readlines()

# Limit to 50 samples for speed during local laptop eval
samples = lines[:50]

for line in tqdm(samples, desc="Evaluating"):
    ex = json.loads(line)
    
    # We only have 'prompt', 'chosen', and 'rejected' in the DPO dataset, but for sft_eval.jsonl we have 'messages'.
    if 'messages' in ex:
        prompt_msgs = ex['messages'][:3]
        text = tokenizer.apply_chat_template(prompt_msgs, tokenize=False, add_generation_prompt=True)
    else:
        # Fallback if it's formatted differently
        text = ex.get('prompt', '')

    inputs = tokenizer(text, return_tensors='pt').to(model.device)
    
    with torch.no_grad():
        out = model.generate(**inputs, max_new_tokens=150, temperature=0.7, do_sample=True, pad_token_id=tokenizer.eos_token_id)
        
    response = tokenizer.decode(out[0][inputs['input_ids'].shape[1]:], skip_special_tokens=True)
    
    # Classify the generated response
    res = nli(response, [LEAKAGE_HYPOTHESIS, SOCRATIC_HYPOTHESIS])
    top_label = res['labels'][0]
    
    if 'guiding question' in top_label:
        results['compliant'] += 1
    else:
        results['leaked'] += 1
        print(f"\n[LEAK DETECTED]: {response}")
        
    results['total'] += 1

print("\n" + "="*50)
print(f"Socratic Compliance: {results['compliant']/results['total']*100:.1f}%")
print(f"Answer Leak Rate:    {results['leaked']/results['total']*100:.1f}%")
print("TARGET: Compliance >= 95%, Leak Rate <= 2%")
print("="*50)
