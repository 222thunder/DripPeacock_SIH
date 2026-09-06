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
    assert result["mrp"]["value"] == 145.50
    assert result["mrp"]["confidence"] == 0.95
    assert "mrp_inclusive_of_taxes" in result
    assert result["mrp_inclusive_of_taxes"]["value"] is True

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
    assert result["net_quantity"]["value"] == "500.0 g"
    assert result["net_quantity_unit"]["value"] == "g"
    assert result["net_quantity_value"]["value"] == 500.0

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
    assert "consumer_care_email" in result
    assert result["consumer_care_email"]["value"] == "care@brandfoods.com"
    assert "consumer_care_phone" in result
    assert "1800" in result["consumer_care_phone"]["value"]

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
