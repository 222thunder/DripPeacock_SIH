import time
import logging
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from services.ocr_service import OCRService, OCRResult
from services.deterministic_parser import DeterministicParser
from services.llm_parser import LLMParser

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ai_service")

app = FastAPI(
    title="Legal Metrology AI Service",
    description="OCR and Legal Metrology Packaged Commodities Rule extraction pipeline",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
ocr_service = OCRService()
deterministic_parser = DeterministicParser()
llm_parser = LLMParser()

MANDATORY_LEGAL_METROLOGY_FIELDS = [
    "mrp",
    "net_quantity",
    "mfg_date",
    "pkd_date",
    "manufacturer",
    "packer",
    "consumer_care",
    "commodity_name",
    "country_of_origin"
]

class TextParseRequest(BaseModel):
    raw_text: str
    category: Optional[str] = None

class AnalysisResponse(BaseModel):
    status: str
    declarations: Dict[str, Any]
    raw_ocr: str
    ocr_lines_count: int
    missing_fields: List[str]
    llm_assisted: bool
    timing_ms: Dict[str, float]
    image_metadata: Dict[str, Any]

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "SIH AI Service",
        "ocr_engine": "tesseract",
        "llm_configured": llm_parser.is_configured(),
        "llm_model": llm_parser.model if llm_parser.is_configured() else None
    }

@app.post("/ocr")
async def extract_ocr(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File must be an image, got {file.content_type}"
        )
    
    try:
        contents = await file.read()
        ocr_result = ocr_service.extract_text_from_bytes(contents)
        return {
            "status": "success",
            "filename": file.filename,
            "raw_text": ocr_result.raw_text,
            "lines": [line.dict() for line in ocr_result.lines],
            "image_width": ocr_result.image_width,
            "image_height": ocr_result.image_height,
            "engine": ocr_result.engine
        }
    except Exception as e:
        logger.exception("OCR extraction failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OCR extraction failed: {str(e)}"
        )

@app.post("/parse")
async def parse_text(request: TextParseRequest):
    t0 = time.time()
    # Dummy single line structure for raw text input
    declarations = deterministic_parser.parse([], request.raw_text)

    # Check which mandatory fields are still missing
    missing_fields = [f for f in MANDATORY_LEGAL_METROLOGY_FIELDS if f not in declarations]
    llm_assisted = False

    if missing_fields and llm_parser.is_configured():
        llm_data = await llm_parser.parse_unstructured_text(request.raw_text, missing_fields)
        declarations.update(llm_data)
        llm_assisted = True

    t_total = (time.time() - t0) * 1000

    return {
        "status": "success",
        "declarations": declarations,
        "missing_fields": [f for f in MANDATORY_LEGAL_METROLOGY_FIELDS if f not in declarations],
        "llm_assisted": llm_assisted,
        "timing_ms": round(t_total, 2)
    }

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_image(
    file: UploadFile = File(...),
    category: Optional[str] = Form(None)
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Uploaded file must be an image, got {file.content_type}"
        )

    timings: Dict[str, float] = {}
    t_start = time.time()

    # 1. Read file bytes
    try:
        image_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to read image: {str(e)}")

    # 2. Run OCR
    t_ocr_start = time.time()
    try:
        ocr_result = ocr_service.extract_text_from_bytes(image_bytes)
    except Exception as e:
        logger.exception("OCR processing failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OCR processing failed: {str(e)}"
        )
    timings["ocr"] = round((time.time() - t_ocr_start) * 1000, 2)

    # 3. Deterministic Extraction
    t_det_start = time.time()
    declarations = deterministic_parser.parse(ocr_result.lines, ocr_result.raw_text)
    timings["deterministic_parsing"] = round((time.time() - t_det_start) * 1000, 2)

    # 4. Check for missing mandatory fields
    missing_fields = [f for f in MANDATORY_LEGAL_METROLOGY_FIELDS if f not in declarations]
    llm_assisted = False

    # 5. LLM Fallback (if configured and missing fields exist)
    t_llm_start = time.time()
    if missing_fields and llm_parser.is_configured():
        logger.info(f"Missing fields detected: {missing_fields}. Invoking LLM parser...")
        llm_declarations = await llm_parser.parse_unstructured_text(
            raw_text=ocr_result.raw_text, 
            missing_fields=missing_fields,
            image_bytes=image_bytes,
            mime_type=file.content_type
        )
        for k, v in llm_declarations.items():
            if k not in declarations:
                declarations[k] = v
        llm_assisted = True
        timings["llm_parsing"] = round((time.time() - t_llm_start) * 1000, 2)
    else:
        timings["llm_parsing"] = 0.0

    timings["total"] = round((time.time() - t_start) * 1000, 2)

    still_missing = [f for f in MANDATORY_LEGAL_METROLOGY_FIELDS if f not in declarations]

    return AnalysisResponse(
        status="success",
        declarations=declarations,
        raw_ocr=ocr_result.raw_text,
        ocr_lines_count=len(ocr_result.lines),
        missing_fields=still_missing,
        llm_assisted=llm_assisted,
        timing_ms=timings,
        image_metadata={
            "filename": file.filename,
            "width": ocr_result.image_width,
            "height": ocr_result.image_height,
            "category": category
        }
    )

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
