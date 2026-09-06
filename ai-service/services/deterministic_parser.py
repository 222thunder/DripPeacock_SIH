import re
from typing import Dict, Any, Optional, List
from pydantic import BaseModel

class ExtractedField(BaseModel):
    value: Any
    raw_text: Optional[str] = None
    confidence: float = 1.0
    bounding_box: Optional[Dict[str, int]] = None
    source_line: Optional[str] = None
    is_deterministic: bool = True

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

    def parse(self, ocr_lines: list, raw_text: str) -> Dict[str, Any]:
        declarations: Dict[str, Any] = {}

        # First iterate over line objects if present
        for line in ocr_lines:
            text = line.text.strip()
            bbox = line.bbox.model_dump() if hasattr(line.bbox, "model_dump") else (line.bbox.dict() if hasattr(line.bbox, "dict") else line.bbox)

            # Check MRP
            if "mrp" not in declarations:
                m = self.mrp_pattern.search(text)
                if m:
                    val = float(m.group(1))
                    declarations["mrp"] = ExtractedField(
                        value=val,
                        raw_text=m.group(0),
                        confidence=line.confidence,
                        bounding_box=bbox,
                        source_line=text
                    ).model_dump()

            # Check Tax Inclusive
            if "mrp_inclusive_of_taxes" not in declarations:
                m = self.tax_inclusive_pattern.search(text)
                if m:
                    declarations["mrp_inclusive_of_taxes"] = ExtractedField(
                        value=True,
                        raw_text=m.group(0),
                        confidence=line.confidence,
                        bounding_box=bbox,
                        source_line=text
                    ).model_dump()

            # Check Net Quantity
            if "net_quantity" not in declarations:
                m = self.net_qty_pattern.search(text)
                if m:
                    qty_val = float(m.group(1))
                    qty_unit = self.standardize_unit(m.group(2))
                    declarations["net_quantity"] = ExtractedField(
                        value=f"{qty_val} {qty_unit}",
                        raw_text=m.group(0),
                        confidence=line.confidence,
                        bounding_box=bbox,
                        source_line=text
                    ).model_dump()
                    declarations["net_quantity_value"] = ExtractedField(
                        value=qty_val,
                        raw_text=str(qty_val),
                        confidence=line.confidence
                    ).model_dump()
                    declarations["net_quantity_unit"] = ExtractedField(
                        value=qty_unit,
                        raw_text=m.group(2),
                        confidence=line.confidence
                    ).model_dump()

            # Check Mfg Date
            if "mfg_date" not in declarations:
                m = self.mfg_date_pattern.search(text)
                if m:
                    declarations["mfg_date"] = ExtractedField(
                        value=m.group(1).strip(),
                        raw_text=m.group(0),
                        confidence=line.confidence,
                        bounding_box=bbox,
                        source_line=text
                    ).model_dump()

            # Check Pkd Date
            if "pkd_date" not in declarations:
                m = self.pkd_date_pattern.search(text)
                if m:
                    declarations["pkd_date"] = ExtractedField(
                        value=m.group(1).strip(),
                        raw_text=m.group(0),
                        confidence=line.confidence,
                        bounding_box=bbox,
                        source_line=text
                    ).model_dump()

            # Check Expiry Date
            if "expiry_date" not in declarations:
                m = self.exp_date_pattern.search(text)
                if m:
                    declarations["expiry_date"] = ExtractedField(
                        value=m.group(1).strip(),
                        raw_text=m.group(0),
                        confidence=line.confidence,
                        bounding_box=bbox,
                        source_line=text
                    ).model_dump()

            # Check Best Before
            if "best_before" not in declarations:
                m = self.best_before_pattern.search(text)
                if m:
                    val = m.group(1) or m.group(2)
                    declarations["best_before"] = ExtractedField(
                        value=val.strip(),
                        raw_text=m.group(0),
                        confidence=line.confidence,
                        bounding_box=bbox,
                        source_line=text
                    ).model_dump()

            # Check Consumer Care Email
            if "consumer_care_email" not in declarations:
                m = self.email_pattern.search(text)
                if m:
                    declarations["consumer_care_email"] = ExtractedField(
                        value=m.group(0),
                        raw_text=m.group(0),
                        confidence=line.confidence,
                        bounding_box=bbox,
                        source_line=text
                    ).model_dump()

            # Check Consumer Care Phone
            if "consumer_care_phone" not in declarations:
                m = self.phone_pattern.search(text)
                if m:
                    declarations["consumer_care_phone"] = ExtractedField(
                        value=m.group(0).strip(),
                        raw_text=m.group(0),
                        confidence=line.confidence,
                        bounding_box=bbox,
                        source_line=text
                    ).model_dump()

            # Check Country of Origin
            if "country_of_origin" not in declarations:
                m = self.country_pattern.search(text)
                if m:
                    origin = (m.group(1) or m.group(2) or m.group(3)).strip()
                    declarations["country_of_origin"] = ExtractedField(
                        value=origin,
                        raw_text=m.group(0),
                        confidence=line.confidence,
                        bounding_box=bbox,
                        source_line=text
                    ).model_dump()

            # Check FSSAI
            if "fssai_license" not in declarations:
                m = self.fssai_pattern.search(text)
                if m:
                    declarations["fssai_license"] = ExtractedField(
                        value=m.group(1).strip(),
                        raw_text=m.group(0),
                        confidence=line.confidence,
                        bounding_box=bbox,
                        source_line=text
                    ).model_dump()

            # Check Manufacturer / Packer
            if "manufacturer" not in declarations:
                if re.search(r'(?:MFD|MANUFACTURED|MFG)\s+BY\b', text, re.I):
                    declarations["manufacturer"] = ExtractedField(
                        value=text,
                        raw_text=text,
                        confidence=line.confidence,
                        bounding_box=bbox,
                        source_line=text
                    ).model_dump()

            if "packer" not in declarations:
                if re.search(r'(?:PKD|PACKED)\s+BY\b', text, re.I):
                    declarations["packer"] = ExtractedField(
                        value=text,
                        raw_text=text,
                        confidence=line.confidence,
                        bounding_box=bbox,
                        source_line=text
                    ).model_dump()

        # Multi-line / Raw text fallbacks for all fields
        if "mrp" not in declarations:
            m = self.mrp_pattern.search(raw_text) or self.mrp_standalone_currency.search(raw_text)
            if m:
                val = float(m.group(1))
                declarations["mrp"] = ExtractedField(
                    value=val,
                    raw_text=m.group(0),
                    confidence=0.85
                ).model_dump()

        if "mrp_inclusive_of_taxes" not in declarations:
            m = self.tax_inclusive_pattern.search(raw_text)
            if m:
                declarations["mrp_inclusive_of_taxes"] = ExtractedField(
                    value=True,
                    raw_text=m.group(0),
                    confidence=0.85
                ).model_dump()

        if "net_quantity" not in declarations:
            m = self.net_qty_pattern.search(raw_text) or self.standalone_qty_pattern.search(raw_text)
            if m:
                qty_val = float(m.group(1))
                qty_unit = self.standardize_unit(m.group(2))
                declarations["net_quantity"] = ExtractedField(
                    value=f"{qty_val} {qty_unit}",
                    raw_text=m.group(0),
                    confidence=0.8
                ).model_dump()
                declarations["net_quantity_value"] = ExtractedField(
                    value=qty_val,
                    raw_text=str(qty_val),
                    confidence=0.8
                ).model_dump()
                declarations["net_quantity_unit"] = ExtractedField(
                    value=qty_unit,
                    raw_text=m.group(2),
                    confidence=0.8
                ).model_dump()

        if "consumer_care_email" not in declarations:
            m = self.email_pattern.search(raw_text)
            if m:
                declarations["consumer_care_email"] = ExtractedField(
                    value=m.group(0),
                    raw_text=m.group(0),
                    confidence=0.9
                ).model_dump()

        if "consumer_care_phone" not in declarations:
            m = self.phone_pattern.search(raw_text)
            if m:
                declarations["consumer_care_phone"] = ExtractedField(
                    value=m.group(0).strip(),
                    raw_text=m.group(0),
                    confidence=0.85
                ).model_dump()

        return declarations
