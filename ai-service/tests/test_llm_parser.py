import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from services.llm_parser import LLMParser

@pytest.mark.asyncio
async def test_llm_parser_huggingface_option_a():
    with patch.dict("os.environ", {
        "HF_TOKEN": "hf_test_mock_token_12345",
        "LLM_MODEL": "meta-llama/Meta-Llama-3.1-8B-Instruct",
        "LLM_PROVIDER": "huggingface"
    }):
        parser = LLMParser()
        assert parser.is_configured() is True
        assert parser.mode == "huggingface"
        assert parser.hf_client is not None

        mock_response = MagicMock()
        mock_choice = MagicMock()
        mock_choice.message.content = '```json\n{"manufacturer": {"name": "ABC Foods Pvt Ltd", "address": "123 Industrial Area, Mumbai", "pincode": "400001"}, "commodity_name": "Almonds"}\n```'
        mock_response.choices = [mock_choice]

        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        parser.hf_client = mock_client

        result = await parser.parse_unstructured_text(
            raw_text="Manufactured and marketed by ABC Foods Pvt Ltd at 123 Industrial Area, Mumbai - 400001",
            missing_fields=["manufacturer", "commodity_name"]
        )

        assert "manufacturer" in result
        assert result["manufacturer"]["value"]["name"] == "ABC Foods Pvt Ltd"
        assert result["manufacturer"]["value"]["pincode"] == "400001"
        assert result["manufacturer"]["is_deterministic"] is False
        assert result["manufacturer"]["confidence"] is None
        assert "commodity_name" in result
        assert result["commodity_name"]["value"] == "Almonds"

@pytest.mark.asyncio
async def test_llm_parser_flattens_dates_and_drops_unknown_fields():
    with patch.dict("os.environ", {
        "HF_TOKEN": "hf_test_mock_token_12345",
        "LLM_MODEL": "meta-llama/Meta-Llama-3.1-8B-Instruct",
        "LLM_PROVIDER": "huggingface"
    }):
        parser = LLMParser()

        mock_response = MagicMock()
        mock_choice = MagicMock()
        mock_choice.message.content = '```json\n{"dates": {"mfg_date": "06/2026", "expiry_date": null}, "mrp": {"value": 120, "currency": "INR", "inclusive_of_taxes": true}}\n```'
        mock_response.choices = [mock_choice]

        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        parser.hf_client = mock_client

        result = await parser.parse_unstructured_text(
            raw_text="Mfg: 06/2026  MRP Rs. 120 (incl of taxes)",
            missing_fields=["mrp", "mfg_date", "expiry_date"]
        )

        assert "mfg_date" in result
        assert result["mfg_date"]["value"] == "06/2026"
        assert "expiry_date" not in result  # null values are dropped
        assert "mrp" in result
        assert result["mrp"]["value"]["amount"] == 120
        assert result["mrp"]["confidence"] is None

@pytest.mark.asyncio
async def test_llm_parser_unconfigured():
    with patch.dict("os.environ", {}, clear=True):
        parser = LLMParser()
        assert parser.is_configured() is False
        assert parser.mode == "unconfigured"
        result = await parser.parse_unstructured_text("Sample text", ["mrp"])
        assert result == {}
