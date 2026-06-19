import os
import requests
import numpy as np
from datasets import load_dataset
from custom_tokenizers import BPETokenizer

def download_starter_corpus(output_path="data/starter.txt"):
    """Download a small starter corpus (e.g. tiny shakespeare) for testing."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    if not os.path.exists(output_path):
        url = "https://raw.githubusercontent.com/karpathy/char-rnn/master/data/tinyshakespeare/input.txt"
        data = requests.get(url).text
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(data)
        print(f"Downloaded starter corpus to {output_path}")

def prep_data(input_file, train_bin, val_bin, tokenizer):
    """Tokenize and split data into train/val memory-mapped bin files."""
    os.makedirs(os.path.dirname(train_bin), exist_ok=True)
    with open(input_file, 'r', encoding='utf-8') as f:
        data = f.read()

    print("Tokenizing data...")
    # For large datasets, tokenizing all at once might use a lot of memory, 
    # but for starter it's fine.
    tokens = tokenizer.encode(data)
    
    n = len(tokens)
    train_data = tokens[:int(n*0.9)]
    val_data = tokens[int(n*0.9):]

    # export to bin files
    train_ids = np.array(train_data, dtype=np.uint16)
    val_ids = np.array(val_data, dtype=np.uint16)
    
    train_ids.tofile(train_bin)
    val_ids.tofile(val_bin)
    print(f"Saved train {len(train_ids)} tokens to {train_bin}")
    print(f"Saved val {len(val_ids)} tokens to {val_bin}")

if __name__ == "__main__":
    download_starter_corpus("data/starter.txt")
    tokenizer = BPETokenizer()
    prep_data("data/starter.txt", "data/train.bin", "data/val.bin", tokenizer)
