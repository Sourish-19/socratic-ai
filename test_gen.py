import sys, json, torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

print("Loading model...")
MODEL_PATH = './models/qwen2.5-7b-instruct'
bnb = BitsAndBytesConfig(load_in_8bit=True, llm_int8_enable_fp32_cpu_offload=True)
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH, trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained(
    MODEL_PATH, quantization_config=bnb, device_map='auto', trust_remote_code=True
)

GENERATOR_SYSTEM = '''You generate training data for a Socratic AI tutor.
Given a question and its answer, generate a realistic 4-6 turn tutoring conversation.
Stage goal: Ask what the student already knows about this topic.
STRICT RULES:
- The AI tutor NEVER reveals the answer, solution, or derivation.
- The AI only asks questions and provides scaffolding.
- FORBIDDEN phrases: the answer is, the solution is, therefore X equals.
Output ONLY valid JSON: {"messages": [...]}. No markdown, no preamble.'''

user_content = "Question: 1+1\nCorrect answer (DO NOT reveal): 2\nStage: 1"
messages = [
    {'role': 'system', 'content': GENERATOR_SYSTEM},
    {'role': 'user',   'content': user_content},
]
prompt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
print("Prompt:", prompt)

inputs = tokenizer([prompt], return_tensors='pt').to(model.device)
print("Inputs keys:", inputs.keys())

with torch.no_grad():
    out = model.generate(
        **inputs, max_new_tokens=600, temperature=0.85,
        do_sample=True, top_p=0.92, repetition_penalty=1.05
    )

text = tokenizer.decode(out[0][inputs['input_ids'].shape[1]:], skip_special_tokens=True)
print("Generated text:", text)
try:
    ex = json.loads(text.strip().lstrip('```json').rstrip('```').strip())
    print("Parsed JSON:", type(ex))
    ex['metadata'] = {'test': 1}
except Exception as e:
    print("Error:", type(e).__name__, str(e))
    import traceback
    traceback.print_exc()
