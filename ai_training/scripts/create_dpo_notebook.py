import json

notebook = {
 "nbformat": 4,
 "nbformat_minor": 0,
 "cells": [
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "# Phase 4: Direct Preference Optimization (DPO)\n",
    "\n",
    "This notebook trains your tutor to explicitly prefer Socratic answers over direct answers using DPO.\n",
    "\n",
    "### Step 1: Upload your files\n",
    "1. Open the Colab folder sidebar.\n",
    "2. Upload your `dpo_pairs.jsonl` dataset.\n",
    "3. Upload your `checkpoints/socratic-sft/final` folder from Phase 3 into a folder called `sft_adapter`."
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "!pip install -q transformers peft trl bitsandbytes accelerate datasets\n",
    "!pip install -q flash-attn --no-build-isolation"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "import torch\n",
    "import json\n",
    "from datasets import Dataset\n",
    "from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig\n",
    "from peft import PeftModel, LoraConfig, get_peft_model, prepare_model_for_kbit_training\n",
    "from trl import DPOTrainer, DPOConfig\n",
    "\n",
    "BASE_MODEL = 'Qwen/Qwen2.5-7B-Instruct'\n",
    "SFT_ADAPTER_PATH = './sft_adapter'\n",
    "OUTPUT_DIR = './checkpoints/socratic-dpo'"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "# ── Load DPO Dataset ────────────────────────────────────────────\n",
    "def load_dpo_dataset(path, tokenizer):\n",
    "    examples = []\n",
    "    with open(path) as f:\n",
    "        for line in f:\n",
    "            ex = json.loads(line)\n",
    "            # DPOTrainer requires 'prompt', 'chosen', and 'rejected' string columns\n",
    "            prompt = tokenizer.apply_chat_template(ex['prompt'], tokenize=False, add_generation_prompt=True)\n",
    "            chosen = ex['chosen'] + tokenizer.eos_token\n",
    "            rejected = ex['rejected'] + tokenizer.eos_token\n",
    "            examples.append({\n",
    "                'prompt': prompt,\n",
    "                'chosen': chosen,\n",
    "                'rejected': rejected\n",
    "            })\n",
    "    return Dataset.from_list(examples)\n",
    "\n",
    "tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL, trust_remote_code=True)\n",
    "tokenizer.pad_token = tokenizer.eos_token\n",
    "tokenizer.padding_side = 'right'\n",
    "\n",
    "dpo_ds = load_dpo_dataset('dpo_pairs.jsonl', tokenizer)"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "# ── 4-bit Quantization (Using our perfected Colab settings) ─────\n",
    "bnb_config = BitsAndBytesConfig(\n",
    "    load_in_4bit=True,\n",
    "    bnb_4bit_quant_type='nf4',\n",
    "    bnb_4bit_compute_dtype=torch.float16,\n",
    "    bnb_4bit_use_double_quant=True,\n",
    ")\n",
    "\n",
    "model = AutoModelForCausalLM.from_pretrained(\n",
    "    BASE_MODEL,\n",
    "    quantization_config=bnb_config,\n",
    "    device_map={'': 0},\n",
    "    trust_remote_code=True,\n",
    "    torch_dtype=torch.float16,\n",
    "    low_cpu_mem_usage=True,\n",
    ")\n",
    "\n",
    "# Nuke BFloat16 buffers from the base model\n",
    "model.config.torch_dtype = torch.float32\n",
    "for name, buffer in model.named_buffers():\n",
    "    if buffer.dtype == torch.bfloat16:\n",
    "        buffer.data = buffer.data.to(torch.float32)\n",
    "\n",
    "model = prepare_model_for_kbit_training(model)"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "# ── Apply SFT Adapter & Prepare for DPO ─────────────────────────\n",
    "# We load our Phase 3 weights, and let DPOTrainer manage the reference model automatically\n",
    "model = PeftModel.from_pretrained(model, SFT_ADAPTER_PATH, is_trainable=True)\n",
    "\n",
    "# Ensure all trainable params are float32 to avoid BFloat16 scaler errors\n",
    "for name, param in model.named_parameters():\n",
    "    if param.requires_grad or 'lora' in name:\n",
    "        param.data = param.data.to(torch.float32)"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "# ── DPO Training Config ─────────────────────────────────────────\n",
    "dpo_config = DPOConfig(\n",
    "    output_dir=OUTPUT_DIR,\n",
    "    num_train_epochs=1,                  # 1 epoch is standard for DPO\n",
    "    per_device_train_batch_size=1,\n",
    "    gradient_accumulation_steps=16,\n",
    "    learning_rate=5e-5,                  # DPO uses a much smaller LR than SFT\n",
    "    beta=0.1,                            # standard DPO KL penalty\n",
    "    max_length=2048,\n",
    "    max_prompt_length=1024,\n",
    "    fp16=False,                          # Bypass AMP to prevent scaling errors\n",
    "    bf16=False,\n",
    "    gradient_checkpointing=True,\n",
    "    logging_steps=10,\n",
    "    save_steps=100,\n",
    "    report_to='none',\n",
    "    run_name='socratic-dpo-qwen25-7b',\n",
    ")\n",
    "\n",
    "trainer = DPOTrainer(\n",
    "    model=model,\n",
    "    args=dpo_config,\n",
    "    train_dataset=dpo_ds,\n",
    "    processing_class=tokenizer,\n",
    ")\n",
    "\n",
    "print(\"Starting DPO training!\")\n",
    "trainer.train()\n",
    "trainer.save_model(OUTPUT_DIR + '/final')"
   ]
  }
 ],
 "metadata": {
  "kernelspec": {
   "display_name": "Python 3",
   "language": "python",
   "name": "python3"
  }
 }
}

with open('c:/Users/Sourish/Documents/Projects/Socratic AI/Phase4_DPO_Colab.ipynb', 'w') as f:
    json.dump(notebook, f, indent=1)
