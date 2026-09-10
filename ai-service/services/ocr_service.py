import io
import cv2
import numpy as np
import pytesseract
from PIL import Image
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class OCRBoundingBox(BaseModel):
    x: int
    y: int
    width: int
    height: int

class OCRToken(BaseModel):
    text: str
    confidence: float
    bbox: OCRBoundingBox

class OCRLine(BaseModel):
    text: str
    confidence: float
    bbox: OCRBoundingBox
    tokens: List[OCRToken] = Field(default_factory=list)

class OCRResult(BaseModel):
    raw_text: str
    lines: List[OCRLine] = Field(default_factory=list)
    image_width: int
    image_height: int
    engine: str = "tesseract"

class OCRService:
    # Minimum dimension (px) for reliable Tesseract output (~300 DPI equivalent)
    MIN_DIMENSION = 1500

    def __init__(self, tesseract_cmd: Optional[str] = None):
        if tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd

    def _upscale_if_needed(self, img: np.ndarray) -> np.ndarray:
        """Upscale small images so Tesseract has enough pixel data."""
        h, w = img.shape[:2]
        max_dim = max(h, w)
        if max_dim < self.MIN_DIMENSION:
            scale = self.MIN_DIMENSION / max_dim
            new_w, new_h = int(w * scale), int(h * scale)
            img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
        return img

    def preprocess_image(self, pil_img: Image.Image) -> List[np.ndarray]:
        """
        Generate preprocessed variants of the image for OCR.
        Single grayscale variant only — halves CPU time on free tier.
        Adaptive threshold is skipped: marginal accuracy gain, high cost.
        """
        img_np = np.array(pil_img.convert("RGB"))
        gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
        gray = self._upscale_if_needed(gray)
        return [gray]

    def _run_tesseract(self, img: np.ndarray, lang: str, psm: int) -> Dict[str, Any]:
        """Run pytesseract with a specific PSM mode and return the data dict."""
        return pytesseract.image_to_data(
            img,
            lang=lang,
            output_type=pytesseract.Output.DICT,
            config=f"--psm {psm} --oem 3"
        )

    def _count_good_tokens(self, data: Dict[str, Any], min_conf: float = 30.0) -> int:
        """Count tokens with confidence above the threshold."""
        count = 0
        for i in range(len(data["text"])):
            text = data["text"][i].strip()
            try:
                conf = float(data["conf"][i])
            except (ValueError, TypeError):
                continue
            if text and conf >= min_conf:
                count += 1
        return count

    def extract_text_from_bytes(self, image_bytes: bytes, lang: str = "eng") -> OCRResult:
        pil_image = Image.open(io.BytesIO(image_bytes))
        width, height = pil_image.size

        # Generate preprocessed variants
        variants = self.preprocess_image(pil_image)

        best_data: Optional[Dict[str, Any]] = None
        best_score = -1

        # PSM 6 (uniform block) is best for product labels — single pass.
        for variant in variants:
            try:
                data = self._run_tesseract(variant, lang, 6)
                score = self._count_good_tokens(data)
                if score > best_score:
                    best_score = score
                    best_data = data
            except Exception:
                continue

        if best_data is None:
            # Absolute fallback: run on raw grayscale
            raw_gray = np.array(pil_image.convert("L"))
            best_data = self._run_tesseract(raw_gray, lang, 3)

        data = best_data

        n_boxes = len(data["text"])
        lines_dict: Dict[int, List[Dict[str, Any]]] = {}

        # Group tokens into lines based on block_num and line_num
        for i in range(n_boxes):
            text = data["text"][i].strip()
            conf_str = data["conf"][i]
            
            try:
                conf = float(conf_str)
            except (ValueError, TypeError):
                conf = -1.0

            if not text or conf < 0:
                continue

            line_key = (data["block_num"][i], data["line_num"][i])
            token_info = {
                "text": text,
                "confidence": round(conf / 100.0, 3),
                "x": data["left"][i],
                "y": data["top"][i],
                "width": data["width"][i],
                "height": data["height"][i]
            }

            if line_key not in lines_dict:
                lines_dict[line_key] = []
            lines_dict[line_key].append(token_info)

        ocr_lines: List[OCRLine] = []
        all_lines_text: List[str] = []

        for line_key, tokens in lines_dict.items():
            if not tokens:
                continue
            
            line_text = " ".join([t["text"] for t in tokens])
            all_lines_text.append(line_text)
            
            min_x = min(t["x"] for t in tokens)
            min_y = min(t["y"] for t in tokens)
            max_r = max(t["x"] + t["width"] for t in tokens)
            max_b = max(t["y"] + t["height"] for t in tokens)
            avg_conf = round(sum(t["confidence"] for t in tokens) / len(tokens), 3)

            ocr_tokens = [
                OCRToken(
                    text=t["text"],
                    confidence=t["confidence"],
                    bbox=OCRBoundingBox(x=t["x"], y=t["y"], width=t["width"], height=t["height"])
                )
                for t in tokens
            ]

            ocr_lines.append(OCRLine(
                text=line_text,
                confidence=avg_conf,
                bbox=OCRBoundingBox(x=min_x, y=min_y, width=max_r - min_x, height=max_b - min_y),
                tokens=ocr_tokens
            ))

        # Full raw text
        raw_text = "\n".join(all_lines_text)

        return OCRResult(
            raw_text=raw_text,
            lines=ocr_lines,
            image_width=width,
            image_height=height,
            engine="tesseract"
        )
