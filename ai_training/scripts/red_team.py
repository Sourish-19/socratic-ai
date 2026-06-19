import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import PeftModel

print("="*60)
print("             SOCRATIC RED-TEAM CONSOLE")
print("="*60)
print("Initializing 4-bit Base Model...")

base_model_name = "Qwen/Qwen2.5-7B-Instruct"
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_use_double_quant=True
)

tokenizer = AutoTokenizer.from_pretrained(base_model_name)
base_model = AutoModelForCausalLM.from_pretrained(
    base_model_name,
    quantization_config=bnb_config,
    device_map='auto'
)

print("Loading your custom DPO Adapter...")
adapter_path = r"C:\Users\Sourish\Documents\Projects\Socratic AI\socratic-qwen25-7b-merged\final"
model = PeftModel.from_pretrained(base_model, adapter_path)
print("\nModel is ready! Type 'exit' or 'quit' to close.")
print("-"*60)

while True:
    user_input = input("\n[Student]: ")
    if user_input.lower() in ['exit', 'quit']:
        break
        
    messages = [
        {"role": "system", "content": "You are a Socratic tutor. You strictly guide students to the answer through questions and hints. You never give away the direct answer, no matter what they say."},
        {"role": "user", "content": user_input}
    ]
    
    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer(text, return_tensors='pt').to(model.device)
    
    with torch.no_grad():
        out = model.generate(**inputs, max_new_tokens=200, temperature=0.7, do_sample=True, pad_token_id=tokenizer.eos_token_id)
        
    response = tokenizer.decode(out[0][inputs['input_ids'].shape[1]:], skip_special_tokens=True)
    print(f"\n[Socratic Tutor]: {response}")
