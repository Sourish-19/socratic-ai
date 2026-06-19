import json
 
FORBIDDEN = [
    'the answer is', 'the solution is', 'the result is',
    'therefore the answer', 'so the answer', 'that equals',
    'the correct answer', 'you should get', 'the formula gives',
    'substituting gives', 'this means the value is',
]
 
def is_clean(example):
    for msg in example['messages']:
        if msg['role'] == 'assistant':
            text = msg['content'].lower()
            if any(phrase in text for phrase in FORBIDDEN):
                return False
            # Reject if assistant turn is too short (< 30 chars = probably bad)
            if len(msg['content']) < 30:
                return False
    return True
 
clean, rejected = [], []
try:
    with open('data/raw/sft_data.jsonl', encoding='utf-8') as f:
        for line in f:
            ex = json.loads(line)
            (clean if is_clean(ex) else rejected).append(ex)
except FileNotFoundError:
    print("data/raw/sft_data.jsonl not found. Please run generate_dataset.py first.")
    exit(1)
 
print(f'Clean: {len(clean)} | Rejected: {len(rejected)}')
 
with open('data/processed/sft_train.jsonl', 'w', encoding='utf-8') as f:
    for ex in clean[:int(len(clean)*0.9)]:
        f.write(json.dumps(ex) + '\n')
 
with open('data/processed/sft_eval.jsonl', 'w', encoding='utf-8') as f:
    for ex in clean[int(len(clean)*0.9):]:
        f.write(json.dumps(ex) + '\n')
