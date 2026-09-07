import asyncio
import os
import json
import logging
from typing import Dict, Any, List, Optional
import google.generativeai as genai
from huggingface_hub import AsyncInferenceClient
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("llm_parser")

class LLMParser:
    """
    LLM Parser supporting:
    - Google Gemini (Primary multimodal model)
    - Hugging Face InferenceClient
    - OpenAI-compatible endpoints
    """
    def __init__(self):
        # API Keys
        self.gemini_key = os.getenv("GEMINI_API_KEY")
        self.hf_token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_TOKEN")
        self.api_key = os.getenv("LLM_API_KEY")
        self.provider = os.getenv("LLM_PROVIDER", "gemini").lower()
        
        # Clients
        self.hf_client: Optional[AsyncInferenceClient] = None
        self.openai_client: Optional[AsyncOpenAI] = None

        if self.gemini_key and (self.provider == "gemini" or not self.provider):
            genai.configure(api_key=self.gemini_key)
            self.mode = "gemini"
            self.model = os.getenv("LLM_MODEL", "gemini-1.5-flash")
            logger.info(f"LLMParser initialized with Gemini API for model: {self.model}")
            return

        # Check if HF Token is set or LLM_API_KEY starts with 'hf_'
        effective_hf_token = self.hf_token or (self.api_key if self.api_key and self.api_key.startswith("hf_") else None)

        if effective_hf_token and (self.provider == "huggingface" or not os.getenv("LLM_BASE_URL")):
            # Option A: Official Hugging Face InferenceClient
            self.hf_client = AsyncInferenceClient(
                token=effective_hf_token,
                provider="hf-inference"
            )
            self.mode = "huggingface"
            self.model = os.getenv("LLM_MODEL", "meta-llama/Meta-Llama-3.1-8B-Instruct")
            logger.info(f"LLMParser initialized with Hugging Face InferenceClient for model: {self.model}")
        elif self.api_key:
            # Fallback / Alternative: OpenAI-compatible client (e.g. Groq, Together, OpenAI)
            base_url = os.getenv("LLM_BASE_URL", "https://api-inference.huggingface.co/v1")
            self.openai_client = AsyncOpenAI(
                api_key=self.api_key,
                base_url=base_url
            )
            self.mode = "openai_compatible"
            self.model = os.getenv("LLM_MODEL", "meta-llama/Meta-Llama-3.1-8B-Instruct")
            logger.info(f"LLMParser initialized with OpenAI-compatible API for model: {self.model} at {base_url}")
        else:
            self.mode = "unconfigured"
            logger.warning("No API keys configured. LLM fallback will be skipped until configured.")

    def is_configured(self) -> bool:
        return self.mode != "unconfigured"

    async def parse_unstructured_text(
        self,
        raw_text: str,
        missing_fields: List[str],
        image_bytes: Optional[bytes] = None,
        mime_type: str = "image/jpeg"
    ) -> Dict[str, Any]:
        """
        Calls the LLM API via Hugging Face InferenceClient (or OpenAI client)
        to extract complex declarations that deterministic regex could not resolve.
        """
        if not self.is_configured():
            return {}

        if not raw_text or not raw_text.strip():
            return {}

        system_prompt = (
            "You are an expert Legal Metrology compliance assistant under the Legal Metrology (Packaged Commodities) Rules, 2011 of India. "
            "Your task is to parse raw OCR text extracted from product packaging labels and extract mandatory legal declarations. "
            "Extract ONLY information that is explicitly stated or strongly supported by the OCR text. DO NOT fabricate or hallucinate values. "
            "If a field cannot be determined from the text, return null for that field. "
            "Respond ONLY with a valid, parseable JSON object without markdown fences or extra explanations."
        )

        user_prompt = f"""
Raw OCR Text from package:
\"\"\"
{raw_text}
\"\"\"

Please extract the following specific missing fields:
{json.dumps(missing_fields, indent=2)}

Format your response as a JSON object with keys corresponding to the fields requested.
Field definitions:
- "manufacturer": {{"name": string|null, "address": string|null, "pincode": string|null}}
- "packer": {{"name": string|null, "address": string|null}}
- "importer": {{"name": string|null, "address": string|null}}
- "commodity_name": string|null (generic/common name of the product)
- "consumer_care": {{"name_or_designation": string|null, "phone": string|null, "email": string|null, "address": string|null}}
- "country_of_origin": string|null
- "mrp": {{"value": number|null, "currency": string|null, "inclusive_of_taxes": boolean|null}}
- "net_quantity": {{"value": number|null, "unit": string|null}}
- "dates": {{"mfg_date": string|null, "pkd_date": string|null, "expiry_date": string|null, "best_before": string|null}}

Return JSON:
"""
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        try:
            content = ""
            if self.mode == "gemini":
                logger.info(f"[LLM] Sending request to Gemini model: {self.model}")
                logger.info(f"[LLM] Missing fields requested: {missing_fields}")
                
                # We use the generate_content_async for async support
                model = genai.GenerativeModel(self.model, system_instruction=system_prompt)
                
                prompt_parts = [user_prompt]
                if image_bytes:
                    logger.info(f"[LLM] Attaching image ({len(image_bytes)} bytes) to Gemini prompt")
                    prompt_parts.insert(0, {"mime_type": mime_type, "data": image_bytes})
                
                response = await asyncio.wait_for(model.generate_content_async(
                    prompt_parts, 
                    generation_config={"temperature": 0.1, "response_mime_type": "application/json"}
                ), timeout=30.0)
                content = response.text
                logger.info(f"[LLM] Raw response:\n{content}")
                
            elif self.hf_client:
                # Option A: Hugging Face AsyncInferenceClient
                logger.info(f"[LLM] Sending request to Hugging Face model: {self.model}")
                logger.info(f"[LLM] Missing fields requested: {missing_fields}")
                response = await asyncio.wait_for(self.hf_client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    max_tokens=800,
                    temperature=0.1
                ), timeout=30.0)
                content = response.choices[0].message.content or ""
                logger.info(f"[LLM] Raw response:\n{content}")
            elif self.openai_client:
                # Option B: OpenAI-compatible client
                logger.info(f"[LLM] Sending request to OpenAI-compatible endpoint, model: {self.model}")
                logger.info(f"[LLM] Missing fields requested: {missing_fields}")
                response = await asyncio.wait_for(self.openai_client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    max_tokens=800,
                    temperature=0.1
                ), timeout=30.0)
                content = response.choices[0].message.content or ""
                logger.info(f"[LLM] Raw response:\n{content}")

            content = content.strip()

            # Clean markdown JSON fences if model wraps them
            if content.startswith("```json"):
                content = content[7:]
            elif content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()

            parsed = json.loads(content)
            logger.info(f"[LLM] Parsed JSON: {json.dumps(parsed, indent=2, default=str)}")

            # Format output into standardized ExtractedField structures.
            # There is no measurable confidence score for LLM extraction, so we
            # store None (unknown) instead of a fabricated value.
            formatted_declarations: Dict[str, Any] = {}
            for k, v in parsed.items():
                if v is None or v == "":
                    continue

                if k == "dates" and isinstance(v, dict):
                    for date_key, date_val in v.items():
                        if date_val is not None and date_val != "":
                            formatted_declarations[date_key] = {
                                "value": str(date_val),
                                "raw_text": str(date_val),
                                "confidence": None,
                                "is_deterministic": False,
                                "source": f"LLM ({self.model})",
                            }
                    continue

                # Normalize LLM mrp shape ({value,...}) to the canonical {amount,...}
                if k == "mrp" and isinstance(v, dict) and "amount" not in v and "value" in v:
                    v = {**v, "amount": v.pop("value")}

                formatted_declarations[k] = {
                    "value": v,
                    "raw_text": json.dumps(v) if isinstance(v, (dict, list)) else str(v),
                    "confidence": None,
                    "is_deterministic": False,
                    "source": f"LLM ({self.model})",
                }

            logger.info(f"[LLM] Formatted declarations keys: {list(formatted_declarations.keys())}")
            return formatted_declarations

        except Exception as e:
            logger.error(f"[LLM] Error calling LLM API: {str(e)}")
            return {
                "_llm_error": {
                    "message": str(e),
                    "model": self.model,
                    "provider": self.mode
                }
            }
