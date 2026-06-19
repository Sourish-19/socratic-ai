import os
import numpy as np
from datasets import load_dataset
from custom_tokenizers import BPETokenizer

def prepare_edu_data():
    # We will use the SciQ dataset (Science Questions & Contexts) as our educational corpus.
    # It contains scientific passages which are perfect for a tutor to learn from!
    print("Downloading Educational Corpus (SciQ)...")
    dataset = load_dataset("sciq")
    
    tokenizer = BPETokenizer()
    
    def process_split(split_name):
        print(f"Processing {split_name} split...")
        data = dataset[split_name]
        
        # We will format the data exactly like the inference prompt
        all_text = []
        for row in data:
            if row['support']:
                text = (
                    "You are a Socratic tutor teaching science.\n"
                    f"student: Based on the following context, can you explain this to me?\n"
                    f"Context: {row['support']}\n"
                    f"Question: {row['question']}\n"
                    f"tutor: {row['correct_answer']}\n\n"
                )
                all_text.append(text)
        
        full_text = "".join(all_text)
        print(f"Tokenizing {len(full_text)} characters for {split_name}...")
        
        tokens = tokenizer.encode(full_text)
        print(f"Total tokens in {split_name}: {len(tokens)}")
        
        # Convert to numpy array
        arr = np.array(tokens, dtype=np.uint16)
        
        # Save to binary file
        os.makedirs('data', exist_ok=True)
        arr.tofile(os.path.join('data', f'{split_name}_socratic.bin'))
        print(f"Saved {split_name}_socratic.bin successfully!\n")

    # SciQ has train and validation splits
    process_split('train')
    process_split('validation')

if __name__ == '__main__':
    prepare_edu_data()
