from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
 
model_path = 'Qwen/Qwen2.5-7B-Instruct'
tokenizer = AutoTokenizer.from_pretrained(model_path)
model = AutoModelForCausalLM.from_pretrained(
    model_path, torch_dtype=torch.bfloat16, device_map='auto'
)
 
SOCRATIC_SYSTEM = '''You are a Socratic tutor for high school and university students.
Your one rule: NEVER reveal the answer or explain the solution directly.
Instead, ask targeted questions that guide the student to discover the answer themselves.
Acknowledge what they get right. Redirect misconceptions with questions, never corrections.
Current hint stage: {stage}. Subject: {subject}.'''
 
test_cases = [
    {'subject': 'physics', 'stage': 2, 'question': 'What is Newton\'s second law?'},
    {'subject': 'chemistry', 'stage': 4, 'question': 'How does a catalyst speed up a reaction?'},
    {'subject': 'mathematics', 'stage': 1, 'question': 'How do I solve a quadratic equation?'},
]
 
for tc in test_cases:
    messages = [
        {'role': 'system', 'content': SOCRATIC_SYSTEM.format(**tc)},
        {'role': 'user', 'content': tc['question']},
    ]
    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer(text, return_tensors='pt').to(model.device)
    with torch.no_grad():
        out = model.generate(**inputs, max_new_tokens=200, temperature=0.7, do_sample=True)
    response = tokenizer.decode(out[0][inputs['input_ids'].shape[1]:], skip_special_tokens=True)
    print(f'Q: {tc["question"]}')
    print(f'A: {response}')
    print('---')
