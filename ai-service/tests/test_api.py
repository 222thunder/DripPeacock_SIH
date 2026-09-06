import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw
from main import app

client = TestClient(app)

def create_sample_label_image():
    # Create white image with crisp black text
    img = Image.new("RGB", (600, 300), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    draw.text((20, 20), "BRAND PREMIUM ALMONDS", fill=(0, 0, 0))
    draw.text((20, 50), "Net Qty: 250 g", fill=(0, 0, 0))
    draw.text((20, 80), "MRP Rs. 350 (incl. of all taxes)", fill=(0, 0, 0))
    draw.text((20, 110), "Mfg Date: 05/2026", fill=(0, 0, 0))
    draw.text((20, 140), "Best Before 9 months from mfg", fill=(0, 0, 0))
    draw.text((20, 170), "Customer Care: help@almonds.in", fill=(0, 0, 0))
    draw.text((20, 200), "Country of Origin: India", fill=(0, 0, 0))
    
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["ocr_engine"] == "tesseract"

def test_parse_endpoint():
    response = client.post("/parse", json={
        "raw_text": "Net Qty: 100 g\nMRP Rs. 50\nEmail: contact@test.com"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "net_quantity" in data["declarations"]
    assert "mrp" in data["declarations"]
    assert "consumer_care_email" in data["declarations"]

def test_analyze_image_endpoint():
    img_buf = create_sample_label_image()
    response = client.post(
        "/analyze",
        files={"file": ("label.png", img_buf, "image/png")},
        data={"category": "food"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["image_metadata"]["filename"] == "label.png"
    assert "declarations" in data
    assert "raw_ocr" in data
    assert len(data["raw_ocr"]) > 0
    # Check that net quantity or mrp was detected
    assert "net_quantity" in data["declarations"] or "mrp" in data["declarations"]
