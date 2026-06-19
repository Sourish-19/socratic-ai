from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

print("Loading base model into CPU memory...")
base = AutoModelForCausalLM.from_pretrained(
    'Qwen/Qwen2.5-7B-Instruct',
    torch_dtype=torch.float16,  # Using float16 for compatibility
    device_map='cpu',           # Merge on CPU to avoid GPU OOM
    low_cpu_mem_usage=True,
)

print("Loading DPO adapter...")
model = PeftModel.from_pretrained(base, 'checkpoints/socratic-dpo/final')

print("Fusing adapter into base model (this might take a few minutes)...")
merged = model.merge_and_unload()

print("Saving unified model...")
merged.save_pretrained('models/socratic-qwen25-7b-merged')

tokenizer = AutoTokenizer.from_pretrained('Qwen/Qwen2.5-7B-Instruct', trust_remote_code=True)
tokenizer.save_pretrained('models/socratic-qwen25-7b-merged')

print('Merge complete! Standalone tutor saved to models/socratic-qwen25-7b-merged')
