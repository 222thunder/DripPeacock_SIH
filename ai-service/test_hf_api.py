"""
Test script for Option A: Hugging Face InferenceClient API
Usage:
    export HF_TOKEN="hf_your_token_here"
    python test_hf_api.py
"""
import os
from huggingface_hub import InferenceClient

def main():
    token = os.getenv("HF_TOKEN")
    if not token:
        print("❌ HF_TOKEN environment variable is not set!")
        print("Please set it with: export HF_TOKEN=\"hf_...\"")
        return

    print("🔑 Using HF Token:", token[:7] + "..." + token[-4:])
    model_id = "meta-llama/Meta-Llama-3.1-8B-Instruct"
    print(f"🚀 Connecting to Hugging Face Inference API for: {model_id}...")

    client = InferenceClient(
        provider="hf-inference",
        api_key=token
    )

    messages = [
        {
            "role": "system",
            "content": "You are a Legal Metrology Packaged Commodities extraction expert. Output only valid JSON."
        },
        {
            "role": "user",
            "content": "Extract MRP, Net Quantity, and Manufacturer from: 'Manufactured by Organic India Pvt Ltd, Plot 10, Okhla, New Delhi. Net Wt: 500 g. MRP Rs. 250.00 incl. of all taxes.'"
        }
    ]

    try:
        response = client.chat.completions.create(
            model=model_id,
            messages=messages,
            max_tokens=300,
            temperature=0.1
        )
        print("\n✅ API Response received successfully:\n")
        print(response.choices[0].message.content)
    except Exception as e:
        print(f"\n❌ API call failed: {e}")
        print("\nTroubleshooting tips:")
        print("1. Did you accept access terms at: https://huggingface.co/meta-llama/Llama-3.1-8B-Instruct ?")
        print("2. Is your token valid with 'Read' permissions?")

if __name__ == "__main__":
    main()
