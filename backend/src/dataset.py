import torch
from torch.utils.data import Dataset, DataLoader
import numpy as np

class GPTDataset(Dataset):
    def __init__(self, data_path, block_size):
        # Using memory-mapped numpy array for large datasets like OpenWebText
        self.data = np.memmap(data_path, dtype=np.uint16, mode='r')
        self.block_size = block_size

    def __len__(self):
        return len(self.data) - self.block_size

    def __getitem__(self, idx):
        # We fetch block_size + 1 items to get both input and target (shifted by 1)
        chunk = self.data[idx:idx + self.block_size + 1].astype(np.int64)
        x = torch.tensor(chunk[:-1], dtype=torch.long)
        y = torch.tensor(chunk[1:], dtype=torch.long)
        return x, y

def get_dataloader(data_path, block_size, batch_size, shuffle=True):
    dataset = GPTDataset(data_path, block_size)
    return DataLoader(dataset, batch_size=batch_size, shuffle=shuffle, num_workers=0)
