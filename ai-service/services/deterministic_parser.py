import re
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class MRPValue(BaseModel):
    amount: float
    currency: str = "INR"
    inclusive_of_taxes: bool = False


class NetQuantityValue(BaseModel):
    value: float
    unit: str


class EntityValue(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None


class ConsumerCareValue(BaseModel):
    name_or_designation: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None


class ExtractedField(BaseModel):
    value: Any
    raw_text: Optional[str] = None
    confidence: Optional[float] = None
    bounding_box: Optional[Dict[str, int]] = None
    source_line: Optional[str] = None
    is_deterministic: bool = True
    source: Optional[str] = None


class DeterministicParser:
    def __init__(self):
        # MRP regexes
        # Matches: MRP Rs. 150, MRP ₹ 99.50, MRP 250/-, M.R.P.: Rs 120.00, Rs. 50
        self.mrp_pattern = re.compile(
            r'(?:M\.?R\.?P\.?|MAX(?:IMUM)?\s+RETAIL\s+PRICE)[\s.:]*(?:(?:RS\.?|INR|₹)\s*)?([0-9]+(?:\.[0-9]{1,2})?)\s*(?:/-)?',
            re.IGNORECASE
        )
        self.mrp_standalone_currency = re.compile(
            r'\b(?:RS\.?|INR|₹)\s*([0-9]+(?:\.[0-9]{1,2})?)\s*(?:/-)?\b',
            re.IGNORECASE
        )
        self.tax_inclusive_pattern = re.compile(
            r'(?:INCL(?:USIVE|\.)?\s+(?:OF\s+)?ALL\s+TAXES|ALL\s+TAXES\s+INCLUDED|INCL\.\s*TAXES)',
            re.IGNORECASE
        )

        # Net Quantity regexes
        self.net_qty_pattern = re.compile(
            r'(?:NET\s+(?:QTY|QUANTITY|WT|WEIGHT|VOL|VOLUME|CONTENT|CONTENTS)?[\s.:]*)'
            r'([0-9]+(?:\.[0-9]+)?)\s*'
            r'(KG|KILOGRAMS?|GM?|GMS?|GRAMS?|ML|MILLILITRES?|L|LTR|LITRES?|PCS?|PIECES?|UNITS?|N)\b',
            re.IGNORECASE
        )
        self.standalone_qty_pattern = re.compile(
            r'\b([0-9]+(?:\.[0-9]+)?)\s*(KG|KILOGRAMS?|GM?|GMS?|GRAMS?|ML|MILLILITRES?|L|LTR|LITRES?)\b',
            re.IGNORECASE
        )

        # Dates regexes
        self.mfg_date_pattern = re.compile(
            r'(?:MFD|MFG|MANUFACTURED|DATE\s+OF\s+MFG|MFG\s+DATE)[\s.:/]*([0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{2,4}|[A-Z]{3,9}\s*[-/.]?\s*[0-9]{2,4}|[0-9]{1,2}[-/.][0-9]{2,4})',
            re.IGNORECASE
        )
        self.pkd_date_pattern = re.compile(
            r'(?:PKD|PACKED|DATE\s+OF\s+PKD|PKD\s+DATE|PACKED\s+ON)[\s.:/]*([0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{2,4}|[A-Z]{3,9}\s*[-/.]?\s*[0-9]{2,4}|[0-9]{1,2}[-/.][0-9]{2,4})',
            re.IGNORECASE
        )
        self.exp_date_pattern = re.compile(
            r'(?:EXP|EXPIRY|USE\s+BY|EXP\s+DATE|DATE\s+OF\s+EXP(?:IRY)?)[\s.:/]*([0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{2,4}|[A-Z]{3,9}\s*[-/.]?\s*[0-9]{2,4}|[0-9]{1,2}[-/.][0-9]{2,4})',
            re.IGNORECASE
        )
        self.best_before_pattern = re.compile(
            r'(?:BEST\s+BEFORE\s+([0-9]+\s+(?:DAYS|MONTHS|YEARS)\s+(?:FROM\s+(?:MFG|PKD|PACKAGING|MANUFACTURE))?)|(?:BEST\s+BEFORE[\s.:]*([0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{2,4}|[A-Z]{3,9}\s*[-/.]?\s*[0-9]{2,4})))',
            re.IGNORECASE
        )

        # Consumer care
        self.email_pattern = re.compile(
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,7}\b'
        )
        self.phone_pattern = re.compile(
            r'(?:TOLL\s*FREE|HELPLINE|CUSTOMER\s*CARE|PH(?:ONE)?|TEL|CONTACT)?[\s.:]*(?:1800[\s-]?[0-9]{3}[\s-]?[0-9]{3,4}|(?:\+91[\s-]?)?[6-9][0-9]{9}|0[0-9]{2,4}[\s-]?[0-9]{6,8})\b',
            re.IGNORECASE
        )

        # Country of origin
        self.country_pattern = re.compile(
            r'(?:COUNTRY\s+OF\s+ORIGIN[\s.:]*([A-Za-z\s]+)|MADE\s+IN\s+([A-Za-z\s]+)|PRODUCT\s+OF\s+([A-Za-z\s]+))',
            re.IGNORECASE
        )

        # FSSAI
        self.fssai_pattern = re.compile(
            r'(?:FSSAI|LIC\.?\s*(?:NO\.?)?)[\s.:]*([1-2][0-9]{13})',
            re.IGNORECASE
        )

        # Manufacturer / Packer
        self.manufacturer_pattern = re.compile(
            r'(?:MFD|MANUFACTURED|MFG)\s+BY[\s:]*\s*(.+)', re.IGNORECASE
        )
        self.packer_pattern = re.compile(
            r'(?:PKD|PACKED)\s+BY[\s:]*\s*(.+)', re.IGNORECASE
        )

    def standardize_unit(self, unit: str) -> str:
        u = unit.strip().lower()
        if u in ['g', 'gm', 'gms', 'gram', 'grams']:
            return 'g'
        if u in ['kg', 'kgs', 'kilogram', 'kilograms']:
            return 'kg'
        if u in ['ml', 'mls', 'millilitre', 'millilitres', 'milliliter']:
            return 'ml'
        if u in ['l', 'ltr', 'ltrs', 'litre', 'litres', 'liter']:
            return 'l'
        if u in ['pcs', 'piece', 'pieces']:
            return 'pcs'
        if u in ['n', 'unit', 'units']:
            return 'N'
        return u

    @staticmethod
    def _bbox_from_line(line: Any) -> Optional[Dict[str, int]]:
        bbox = getattr(line, 'bbox', None)
        if bbox is None:
            return None
        if hasattr(bbox, 'model_dump'):
            return bbox.model_dump()
        if hasattr(bbox, 'dict'):
            return bbox.dict()
        if isinstance(bbox, dict):
            return {k: int(v) for k, v in bbox.items()}
        return None

    @staticmethod
    def _to_field(
        value: Any,
        raw_text: Optional[str],
        confidence: Optional[float],
        bounding_box: Optional[Dict[str, int]],
        source_line: Optional[str],
        is_deterministic: bool = True,
        source: Optional[str] = None,
    ) -> Dict[str, Any]:
        return ExtractedField(
            value=value,
            raw_text=raw_text,
            confidence=confidence,
            bounding_box=bounding_box,
            source_line=source_line,
            is_deterministic=is_deterministic,
            source=source,
        ).model_dump()

    @staticmethod
    def _union_boxes(boxes: List[Dict[str, int]]) -> Optional[Dict[str, int]]:
        valid = [b for b in boxes if b]
        if not valid:
            return None
        x = min(b['x'] for b in valid)
        y = min(b['y'] for b in valid)
        x2 = max(b['x'] + b['width'] for b in valid)
        y2 = max(b['y'] + b['height'] for b in valid)
        return {'x': x, 'y': y, 'width': x2 - x, 'height': y2 - y}

    def _locate_line(self, ocr_lines: list, span: str) -> Any:
        """Return the OCR line whose text contains the given span, if any."""
        if not span:
            return None
        for line in ocr_lines:
            if span in getattr(line, 'text', ''):
                return line
        return None

    def parse(self, ocr_lines: list, raw_text: str) -> Dict[str, Any]:
        declarations: Dict[str, Any] = {}

        incl_taxes_found = bool(self.tax_inclusive_pattern.search(raw_text))
        cc_email: Optional[Dict[str, Any]] = None
        cc_phone: Optional[Dict[str, Any]] = None

        # Line-based extraction (high-confidence, preserves line bbox + confidence)
        for line in ocr_lines:
            text = getattr(line, 'text', '').strip()
            if not text:
                continue
            bbox = self._bbox_from_line(line)
            conf = line.confidence

            if self.tax_inclusive_pattern.search(text):
                incl_taxes_found = True

            if "mrp" not in declarations:
                m = self.mrp_pattern.search(text) or self.mrp_standalone_currency.search(text)
                if m:
                    declarations["mrp"] = self._to_field(
                        MRPValue(amount=float(m.group(1)), currency="INR", inclusive_of_taxes=incl_taxes_found).model_dump(),
                        m.group(0).strip(), conf, bbox, text
                    )

            if "net_quantity" not in declarations:
                m = self.net_qty_pattern.search(text)
                if m:
                    declarations["net_quantity"] = self._to_field(
                        NetQuantityValue(value=float(m.group(1)), unit=self.standardize_unit(m.group(2))).model_dump(),
                        m.group(0), conf, bbox, text
                    )

            if "mfg_date" not in declarations:
                m = self.mfg_date_pattern.search(text)
                if m:
                    declarations["mfg_date"] = self._to_field(
                        m.group(1).strip(), m.group(0), conf, bbox, text
                    )

            if "pkd_date" not in declarations:
                m = self.pkd_date_pattern.search(text)
                if m:
                    declarations["pkd_date"] = self._to_field(
                        m.group(1).strip(), m.group(0), conf, bbox, text
                    )

            if "expiry_date" not in declarations:
                m = self.exp_date_pattern.search(text)
                if m:
                    declarations["expiry_date"] = self._to_field(
                        m.group(1).strip(), m.group(0), conf, bbox, text
                    )

            if "best_before" not in declarations:
                m = self.best_before_pattern.search(text)
                if m:
                    declarations["best_before"] = self._to_field(
                        (m.group(1) or m.group(2)).strip(), m.group(0), conf, bbox, text
                    )

            if cc_email is None:
                m = self.email_pattern.search(text)
                if m:
                    cc_email = self._to_field(m.group(0), m.group(0), conf, bbox, text)

            if cc_phone is None:
                m = self.phone_pattern.search(text)
                if m:
                    cc_phone = self._to_field(m.group(0).strip(), m.group(0), conf, bbox, text)

            if "country_of_origin" not in declarations:
                m = self.country_pattern.search(text)
                if m:
                    declarations["country_of_origin"] = self._to_field(
                        (m.group(1) or m.group(2) or m.group(3)).strip(), m.group(0), conf, bbox, text
                    )

            if "fssai_license" not in declarations:
                m = self.fssai_pattern.search(text)
                if m:
                    declarations["fssai_license"] = self._to_field(
                        m.group(1).strip(), m.group(0), conf, bbox, text
                    )

            if "manufacturer" not in declarations:
                m = self.manufacturer_pattern.search(text)
                if m:
                    declarations["manufacturer"] = self._to_field(
                        EntityValue(name=m.group(1).strip()).model_dump(), text, conf, bbox, text
                    )

            if "packer" not in declarations:
                m = self.packer_pattern.search(text)
                if m:
                    declarations["packer"] = self._to_field(
                        EntityValue(name=m.group(1).strip()).model_dump(), text, conf, bbox, text
                    )

        # Raw-text fallbacks for anything still missing (line info recovered when possible)
        if "mrp" not in declarations:
            m = self.mrp_pattern.search(raw_text) or self.mrp_standalone_currency.search(raw_text)
            if m:
                span = m.group(0)
                found = self._locate_line(ocr_lines, span)
                declarations["mrp"] = self._to_field(
                    MRPValue(amount=float(m.group(1)), currency="INR", inclusive_of_taxes=incl_taxes_found).model_dump(),
                    span,
                    found.confidence if found else None,
                    self._bbox_from_line(found) if found else None,
                    getattr(found, 'text', None),
                )

        if "net_quantity" not in declarations:
            m = self.net_qty_pattern.search(raw_text) or self.standalone_qty_pattern.search(raw_text)
            if m:
                span = m.group(0)
                found = self._locate_line(ocr_lines, span)
                declarations["net_quantity"] = self._to_field(
                    NetQuantityValue(value=float(m.group(1)), unit=self.standardize_unit(m.group(2))).model_dump(),
                    span,
                    found.confidence if found else None,
                    self._bbox_from_line(found) if found else None,
                    getattr(found, 'text', None),
                )

        if "mfg_date" not in declarations:
            m = self.mfg_date_pattern.search(raw_text)
            if m:
                span = m.group(0)
                found = self._locate_line(ocr_lines, span)
                declarations["mfg_date"] = self._to_field(
                    m.group(1).strip(), span,
                    found.confidence if found else None,
                    self._bbox_from_line(found) if found else None,
                    getattr(found, 'text', None),
                )

        if "pkd_date" not in declarations:
            m = self.pkd_date_pattern.search(raw_text)
            if m:
                span = m.group(0)
                found = self._locate_line(ocr_lines, span)
                declarations["pkd_date"] = self._to_field(
                    m.group(1).strip(), span,
                    found.confidence if found else None,
                    self._bbox_from_line(found) if found else None,
                    getattr(found, 'text', None),
                )

        if "expiry_date" not in declarations:
            m = self.exp_date_pattern.search(raw_text)
            if m:
                span = m.group(0)
                found = self._locate_line(ocr_lines, span)
                declarations["expiry_date"] = self._to_field(
                    m.group(1).strip(), span,
                    found.confidence if found else None,
                    self._bbox_from_line(found) if found else None,
                    getattr(found, 'text', None),
                )

        if "best_before" not in declarations:
            m = self.best_before_pattern.search(raw_text)
            if m:
                span = m.group(0)
                found = self._locate_line(ocr_lines, span)
                declarations["best_before"] = self._to_field(
                    (m.group(1) or m.group(2)).strip(), span,
                    found.confidence if found else None,
                    self._bbox_from_line(found) if found else None,
                    getattr(found, 'text', None),
                )

        if cc_email is None:
            m = self.email_pattern.search(raw_text)
            if m:
                span = m.group(0)
                found = self._locate_line(ocr_lines, span)
                cc_email = self._to_field(
                    span, span,
                    found.confidence if found else None,
                    self._bbox_from_line(found) if found else None,
                    getattr(found, 'text', None),
                )

        if cc_phone is None:
            m = self.phone_pattern.search(raw_text)
            if m:
                span = m.group(0)
                found = self._locate_line(ocr_lines, span)
                cc_phone = self._to_field(
                    span.strip(), span,
                    found.confidence if found else None,
                    self._bbox_from_line(found) if found else None,
                    getattr(found, 'text', None),
                )

        if "country_of_origin" not in declarations:
            m = self.country_pattern.search(raw_text)
            if m:
                span = m.group(0)
                found = self._locate_line(ocr_lines, span)
                declarations["country_of_origin"] = self._to_field(
                    (m.group(1) or m.group(2) or m.group(3)).strip(), span,
                    found.confidence if found else None,
                    self._bbox_from_line(found) if found else None,
                    getattr(found, 'text', None),
                )

        if "fssai_license" not in declarations:
            m = self.fssai_pattern.search(raw_text)
            if m:
                span = m.group(0)
                found = self._locate_line(ocr_lines, span)
                declarations["fssai_license"] = self._to_field(
                    m.group(1).strip(), span,
                    found.confidence if found else None,
                    self._bbox_from_line(found) if found else None,
                    getattr(found, 'text', None),
                )

        if "manufacturer" not in declarations:
            m = self.manufacturer_pattern.search(raw_text)
            if m:
                span = m.group(0)
                found = self._locate_line(ocr_lines, span)
                declarations["manufacturer"] = self._to_field(
                    EntityValue(name=m.group(1).strip()).model_dump(), span,
                    found.confidence if found else None,
                    self._bbox_from_line(found) if found else None,
                    getattr(found, 'text', None),
                )

        if "packer" not in declarations:
            m = self.packer_pattern.search(raw_text)
            if m:
                span = m.group(0)
                found = self._locate_line(ocr_lines, span)
                declarations["packer"] = self._to_field(
                    EntityValue(name=m.group(1).strip()).model_dump(), span,
                    found.confidence if found else None,
                    self._bbox_from_line(found) if found else None,
                    getattr(found, 'text', None),
                )

        # Consolidate consumer care into a single typed field
        if cc_email or cc_phone:
            pieces = [p for p in (cc_email, cc_phone) if p]
            confidences = [p.get("confidence") for p in pieces if p.get("confidence") is not None]
            confidence = min(confidences) if confidences else None
            declarations["consumer_care"] = self._to_field(
                ConsumerCareValue(
                    email=cc_email["value"] if cc_email else None,
                    phone=cc_phone["value"] if cc_phone else None,
                ).model_dump(),
                " / ".join(p["raw_text"] for p in pieces if p.get("raw_text")),
                confidence,
                self._union_boxes([p.get("bounding_box") for p in pieces if p.get("bounding_box")]),
                " / ".join(p["source_line"] for p in pieces if p.get("source_line")),
            )

        return declarations