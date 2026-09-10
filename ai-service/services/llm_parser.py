import asyncio
import os
import json
import logging
from typing import Dict, Any, List, Optional
from google import genai
from google.genai import types as genai_types
from huggingface_hub import AsyncInferenceClient
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("llm_parser")

class LLMParser:
    """
    LLM Parser supporting:
    - Google Gemini (Primary multimodal model) with fallback chain + retry
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
        self.gemini_client: Optional[genai.Client] = None
        self.fallback_models: List[str] = []

        if self.gemini_key and (self.provider == "gemini" or not self.provider):
            self.gemini_client = genai.Client(api_key=self.gemini_key)
            self.mode = "gemini"
            self.model = os.getenv("LLM_MODEL", "gemini-3.8-flash")
            # Fallback chain: tried in order if primary returns 503/429
            self.fallback_models = ["gemini-3.1-pro-preview", "gemini-3.5-flash-lite"]
            logger.info(f"LLMParser initialized with Gemini API (google.genai) for model: {self.model}")
            logger.info(f"LLMParser fallback chain: {self.fallback_models}")
            return

        # Check if HF Token is set or LLM_API_KEY starts with 'hf_'
        effective_hf_token = self.hf_token or (self.api_key if self.api_key and self.api_key.startswith("hf_") else None)

        if effective_hf_token and (self.provider == "huggingface" or not os.getenv("LLM_BASE_URL")):
            self.hf_client = AsyncInferenceClient(
                token=effective_hf_token,
                provider="hf-inference"
            )
            self.mode = "huggingface"
            self.model = os.getenv("LLM_MODEL", "meta-llama/Meta-Llama-3.1-8B-Instruct")
            logger.info(f"LLMParser initialized with Hugging Face InferenceClient for model: {self.model}")
        elif self.api_key:
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

    def _is_transient_error(self, err_str: str) -> bool:
        """Returns True for errors worth retrying (overload, rate limit)."""
        transient_codes = ("503", "429", "UNAVAILABLE", "RESOURCE_EXHAUSTED", "overloaded")
        return any(code in err_str for code in transient_codes)

    async def _call_gemini_model(
        self,
        model: str,
        parts: list,
        system_instruction: str,
        temperature: float,
    ) -> str:
        """Single Gemini call with a 60s timeout.

        Note: temperature is not a supported field in generation_config for the
        Interactions API. The prompt itself constrains the output format.
        """
        response = await asyncio.wait_for(
            self.gemini_client.aio.interactions.create(
                model=model,
                input=parts,
                system_instruction=system_instruction,
            ),
            timeout=60.0,
        )
        return response.output_text

    async def _call_gemini_with_fallback(
        self,
        parts: list,
        system_instruction: str,
        temperature: float,
    ) -> tuple[str, str]:
        """
        Tries the primary model, then fallback models.
        Returns a tuple of (content, model_name).
        For transient errors (503, 429) retries up to 3 times with exponential backoff
        before moving to the next model in the chain.
        """
        models_to_try = [self.model] + self.fallback_models
        last_error: Optional[Exception] = None

        for attempt_model in models_to_try:
            for retry in range(3):
                try:
                    content = await self._call_gemini_model(
                        attempt_model, 
                        parts, 
                        system_instruction, 
                        temperature
                    )
                    logger.info(f"[LLM] Success with model: {attempt_model} (attempt {retry + 1})")
                    return content, attempt_model
                except Exception as e:
                    err_str = str(e)
                    last_error = e
                    if self._is_transient_error(err_str) and retry < 2:
                        wait = 2 ** retry  # 1s, then 2s
                        logger.warning(
                            f"[LLM] {attempt_model} transient error (attempt {retry + 1}/3), "
                            f"retrying in {wait}s: {e}"
                        )
                        await asyncio.sleep(wait)
                    else:
                        logger.warning(f"[LLM] {attempt_model} failed, moving to next model: {e}")
                        break  # try next model

        raise last_error or Exception("All Gemini models in the fallback chain failed.")

    async def parse_unstructured_text(
        self,
        raw_text: str,
        missing_fields: List[str],
        image_bytes: Optional[bytes] = None,
        mime_type: str = "image/jpeg"
    ) -> Dict[str, Any]:
        """
        Calls the LLM API to extract complex declarations that deterministic regex
        could not resolve. Uses Gemini with fallback chain, or HF/OpenAI clients.
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
            actual_model = self.model  # Default, might change if fallback succeeds
            if self.mode == "gemini":
                logger.info(f"[LLM] Sending request to Gemini model: {self.model}")
                logger.info(f"[LLM] Missing fields requested: {missing_fields}")

                # Build input parts
                parts = []
                if image_bytes:
                    import base64
                    b64_data = base64.b64encode(image_bytes).decode("utf-8")
                    logger.info(f"[LLM] Attaching image ({len(image_bytes)} bytes) to Gemini prompt")
                    parts.append({"type": "image", "data": b64_data, "mime_type": mime_type})
                parts.append({"type": "text", "text": user_prompt})

                content, actual_model = await self._call_gemini_with_fallback(
                    parts=parts,
                    system_instruction=system_prompt,
                    temperature=0.1
                )
                logger.info(f"[LLM] Raw response:\n{content}")

            elif self.hf_client:
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
                                "source": f"LLM ({actual_model})",
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
                    "source": f"LLM ({actual_model})",
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
