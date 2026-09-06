import pytest
from services.deterministic_parser import DeterministicParser
from services.ocr_service import OCRLine, OCRBoundingBox, OCRToken


def test_mrp_extraction_with_taxes():
    parser = DeterministicParser()
    lines = [
        OCRLine(
            text="MRP Rs. 145.50 (incl. of all taxes)",
            confidence=0.95,
            bbox=OCRBoundingBox(x=10, y=10, width=200, height=20),
            tokens=[]
        )
    ]
    raw_text = "MRP Rs. 145.50 (incl. of all taxes)"
    result = parser.parse(lines, raw_text)

    assert "mrp" in result
    assert result["mrp"]["value"]["amount"] == 145.50
    assert result["mrp"]["value"]["currency"] == "INR"
    assert result["mrp"]["value"]["inclusive_of_taxes"] is True
    assert result["mrp"]["confidence"] == 0.95
    assert result["mrp"]["bounding_box"] == {"x": 10, "y": 10, "width": 200, "height": 20}
    assert result["mrp"]["raw_text"] == "MRP Rs. 145.50"


def test_mrp_detects_missing_tax_inclusive_text():
    parser = DeterministicParser()
    lines = [
        OCRLine(
            text="MRP Rs. 99.00",
            confidence=0.97,
            bbox=OCRBoundingBox(x=10, y=10, width=150, height=20),
            tokens=[]
        )
    ]
    result = parser.parse(lines, "MRP Rs. 99.00")
    assert result["mrp"]["value"]["amount"] == 99.0
    assert result["mrp"]["value"]["inclusive_of_taxes"] is False


def test_net_quantity_standardization():
    parser = DeterministicParser()
    lines = [
        OCRLine(
            text="Net Qty: 500 gms",
            confidence=0.98,
            bbox=OCRBoundingBox(x=10, y=35, width=150, height=20),
            tokens=[]
        )
    ]
    raw_text = "Net Qty: 500 gms"
    result = parser.parse(lines, raw_text)

    assert "net_quantity" in result
    assert result["net_quantity"]["value"]["value"] == 500.0
    assert result["net_quantity"]["value"]["unit"] == "g"
    assert result["net_quantity"]["bounding_box"] == {"x": 10, "y": 35, "width": 150, "height": 20}


def test_dates_and_consumer_care():
    parser = DeterministicParser()
    lines = [
        OCRLine(
            text="Mfg Date: 08/2026 Best Before 12 months from mfg",
            confidence=0.92,
            bbox=OCRBoundingBox(x=10, y=60, width=300, height=20),
            tokens=[]
        ),
        OCRLine(
            text="Consumer Care: care@brandfoods.com Toll Free: 1800-200-1122",
            confidence=0.96,
            bbox=OCRBoundingBox(x=10, y=85, width=400, height=20),
            tokens=[]
        )
    ]
    raw_text = "\n".join([l.text for l in lines])
    result = parser.parse(lines, raw_text)

    assert "mfg_date" in result
    assert result["mfg_date"]["value"] == "08/2026"
    assert "best_before" in result
    assert "12 months" in result["best_before"]["value"].lower()

    assert "consumer_care" in result
    assert result["consumer_care"]["value"]["email"] == "care@brandfoods.com"
    assert "1800" in result["consumer_care"]["value"]["phone"]
    assert result["consumer_care"]["is_deterministic"] is True
    # Combined bounding box covers the consumer-care line
    assert result["consumer_care"]["bounding_box"]["y"] == 85
    assert result["consumer_care"]["bounding_box"]["height"] == 20


def test_fssai_and_country_of_origin():
    parser = DeterministicParser()
    lines = [
        OCRLine(
            text="FSSAI Lic. No. 10014011000234",
            confidence=0.97,
            bbox=OCRBoundingBox(x=10, y=110, width=250, height=20),
            tokens=[]
        ),
        OCRLine(
            text="Country of Origin: India",
            confidence=0.99,
            bbox=OCRBoundingBox(x=10, y=135, width=200, height=20),
            tokens=[]
        )
    ]
    raw_text = "\n".join([l.text for l in lines])
    result = parser.parse(lines, raw_text)

    assert "fssai_license" in result
    assert result["fssai_license"]["value"] == "10014011000234"
    assert "country_of_origin" in result
    assert result["country_of_origin"]["value"] == "India"


def test_low_confidence_ocr_preserved_and_not_fabricated():
    """Low-confidence lines keep their real confidence; no fake high value is invented."""
    parser = DeterministicParser()
    lines = [
        OCRLine(
            text="MRP Rs. 250",
            confidence=0.41,
            bbox=OCRBoundingBox(x=5, y=5, width=100, height=15),
            tokens=[]
        )
    ]
    result = parser.parse(lines, "MRP Rs. 250")
    assert "mrp" in result
    assert result["mrp"]["confidence"] == 0.41
    assert result["mrp"]["raw_text"] == "MRP Rs. 250"


def test_absent_fields_return_empty_without_fabrication():
    parser = DeterministicParser()
    result = parser.parse([], "This label contains no legal declarations at all.")
    assert result == {}


def test_unknown_confidence_when_no_ocr_line_evidence():
    """Raw-text-only parsing must not invent a confidence or bounding box."""
    parser = DeterministicParser()
    result = parser.parse([], "MRP Rs. 145.50")
    assert "mrp" in result
    assert result["mrp"]["confidence"] is None
    assert result["mrp"]["bounding_box"] is None
    assert result["mrp"]["source_line"] is None