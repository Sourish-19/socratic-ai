import os
import torch
import argparse
from model import GPTLanguageModel
from dataset import get_dataloader

def train():
    parser = argparse.ArgumentParser()
    parser.add_argument('--batch_size', type=int, default=8)
    parser.add_argument('--block_size', type=int, default=256)
    parser.add_argument('--max_iters', type=int, default=5000)
    parser.add_argument('--learning_rate', type=float, default=3e-4)
    parser.add_argument('--eval_interval', type=int, default=500)
    parser.add_argument('--eval_iters', type=int, default=200)
    parser.add_argument('--n_embd', type=int, default=384)
    parser.add_argument('--n_head', type=int, default=6)
    parser.add_argument('--n_layer', type=int, default=6)
    parser.add_argument('--dropout', type=float, default=0.2)
    parser.add_argument('--vocab_size', type=int, default=50257) # For BPE
    args = parser.parse_args()

    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    print(f"Using device: {device}")

    # Initialize dataloaders
    try:
        train_loader = get_dataloader('data/train_socratic.bin', args.block_size, args.batch_size, shuffle=True)
        val_loader = get_dataloader('data/validation_socratic.bin', args.block_size, args.batch_size, shuffle=True)
    except FileNotFoundError:
        print("Data bin files not found. Please run data_prep.py first.")
        return

    train_iter = iter(train_loader)
    val_iter = iter(val_loader)

    def get_batch(split):
        nonlocal train_iter, val_iter
        loader_iter = train_iter if split == 'train' else val_iter
        try:
            x, y = next(loader_iter)
        except StopIteration:
            if split == 'train':
                train_iter = iter(train_loader)
                x, y = next(train_iter)
            else:
                val_iter = iter(val_loader)
                x, y = next(val_iter)
        return x.to(device), y.to(device)

    model = GPTLanguageModel(args.vocab_size, args.n_embd, args.n_layer, args.n_head, args.block_size, args.dropout)
    model.to(device)

    optimizer = torch.optim.AdamW(model.parameters(), lr=args.learning_rate)

    @torch.no_grad()
    def estimate_loss():
        out = {}
        model.eval()
        for split in ['train', 'val']:
            losses = torch.zeros(args.eval_iters)
            for k in range(args.eval_iters):
                X, Y = get_batch(split)
                logits, loss = model(X, Y)
                losses[k] = loss.item()
            out[split] = losses.mean()
        model.train()
        return out

    print("Starting training...")
    for iter_num in range(args.max_iters):
        if iter_num % args.eval_interval == 0 or iter_num == args.max_iters - 1:
            losses = estimate_loss()
            print(f"step {iter_num}: train loss {losses['train']:.4f}, val loss {losses['val']:.4f}")
            # Checkpoint model
            if iter_num > 0:
                os.makedirs('checkpoints', exist_ok=True)
                torch.save(model.state_dict(), f"checkpoints/ckpt_iter_{iter_num}.pt", _use_new_zipfile_serialization=False)

        xb, yb = get_batch('train')

        logits, loss = model(xb, yb)
        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        optimizer.step()

if __name__ == '__main__':
    train()
