import tiktoken
from typing import List

class CharTokenizer:
    def __init__(self, text: str):
        chars = sorted(list(set(text)))
        self.vocab_size = len(chars)
        self.stoi = {ch: i for i, ch in enumerate(chars)}
        self.itos = {i: ch for i, ch in enumerate(chars)}

    def encode(self, s: str) -> List[int]:
        return [self.stoi[c] for c in s if c in self.stoi]

    def decode(self, l: List[int]) -> str:
        return ''.join([self.itos[i] for i in l if i in self.itos])

class BPETokenizer:
    def __init__(self, encoding_name: str = "gpt2"):
        self.encoder = tiktoken.get_encoding(encoding_name)
        self.vocab_size = self.encoder.n_vocab
        
    def encode(self, text: str) -> List[int]:
        return self.encoder.encode(text)

    def decode(self, ids: List[int]) -> str:
        return self.encoder.decode(ids)
