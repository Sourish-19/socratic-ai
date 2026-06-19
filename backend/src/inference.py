import aiohttp
import json
import os
from typing import List, Dict

class TutorInference:
    def __init__(self, model_name: str = 'Qwen/Qwen2.5-7B-Instruct'):
        self.model_name = model_name
        # The URL will be loaded dynamically from the environment
        self.server_url = os.environ.get('VLLM_SERVER_URL', 'http://localhost:8000/v1')

    async def generate(self, messages: List[Dict], stage: int = 1) -> str:
        """
        Forwards the chat history to the remote Colab vLLM server which 
        runs the full 7B model and returns the text response.
        """
        # The vLLM server expects an OpenAI-compatible payload
        payload = {
            "model": self.model_name,
            "messages": messages,
            "temperature": 0.7,
            "top_p": 0.9,
            "max_tokens": 280,
            "repetition_penalty": 1.05,
            # We don't need to apply chat templates manually, vLLM does it automatically
            # based on the Qwen2.5 tokenizer!
        }
        
        headers = {"Content-Type": "application/json"}
        
        async with aiohttp.ClientSession() as session:
            try:
                base_url = self.server_url.strip()
                if base_url.endswith('/'):
                    base_url = base_url[:-1]
                if not base_url.endswith('/v1'):
                    base_url = f"{base_url}/v1"
                endpoint = f"{base_url}/chat/completions"
                
                async with session.post(endpoint, headers=headers, json=payload) as response:
                    if response.status != 200:
                        err_text = await response.text()
                        print(f"[ERROR] vLLM returned status {response.status}: {err_text}")
                        return "I'm having trouble thinking right now. Please try again."
                        
                    data = await response.json()
                    
                    # Extract the text from the OpenAI-style response
                    generated_text = data['choices'][0]['message']['content']
                    return generated_text.strip()
                    
            except Exception as e:
                print(f"[ERROR] Failed to connect to vLLM server at {endpoint}: {e}")
                return "My brain is disconnected! Did the Colab server shut down?"
