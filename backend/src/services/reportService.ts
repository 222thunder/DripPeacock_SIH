import PDFDocument from 'pdfkit';
import {
  Document,
  Footer,
  PageNumber,
  AlignmentType,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { FindingResult, DeclaredField, ComplianceSummary } from '../rules/ruleEngine';

export interface ReportInspectionData {
  inspectionId: string;
  createdAt?: Date | string;
  category?: string | null;
  productName?: string | null;
  status: string;
  reviewStatus?: string;
  inspectorName?: string;
  notes?: string;
  images?: string[];
  declarations?: Record<string, DeclaredField>;
  findings: FindingResult[];
  summary: ComplianceSummary;
  missingFields: string[];
}

export const FIELD_LABELS: Record<string, string> = {
  mrp: 'MRP',
  mrp_inclusive_of_taxes: 'MRP inclusive of taxes',
  mfg_date: 'Manufacturing date',
  pkd_date: 'Packed date',
  'mfg_date/pkd_date': 'Manufacturing/Packed date',
  net_quantity: 'Net quantity',
  commodity_name: 'Common/commercial name',
  manufacturer: 'Manufacturer',
  packer: 'Packer',
  'manufacturer/packer': 'Manufacturer/Packer',
  consumer_care: 'Consumer care details',
  country_of_origin: 'Country of origin',
  fssai_license: 'FSSAI license',
};

export const formatDeclarations = (declarations: Record<string, DeclaredField> | undefined): Array<{ key: string; label: string | null; value: string }> => {
  if (!declarations) return [];
  return Object.entries(declarations)
    .filter(([, field]) => field && field.value != null && field.value !== '')
    .map(([key, field]) => ({
      key,
      label: (FIELD_LABELS[key] || key.replace(/_/g, ' ')) ?? key,
      value: formatVal(field.value),
    }));
};

const formatVal = (value: unknown): string => {
  if (value == null) return 'Not detected';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const parts = ['amount', 'currency', 'inclusive_of_taxes', 'value', 'unit', 'name', 'address', 'phone', 'email', 'name_or_designation', 'license_no']
      .filter((k) => k in obj && obj[k] != null && obj[k] !== '')
      .map((k) => `${k.replace(/_/g, ' ')}: ${String(obj[k])}`);
    return parts.length ? parts.join(', ') : 'Not detected';
  }
  return String(value);
};

const labelFor = (key: string): string => {
  const label = FIELD_LABELS[key];
  if (label) return label;
  return key
    .replace(/_readability$/, ' readability')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

// pdfkit's built-in fonts support only the WinAnsi codepage.
const sanitize = (text: string): string =>
  (text || '')
    .replace(/₹/g, 'Rs. ')
    .replace(/—|–/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u00A0]/g, ' ')
    .replace(/[^\x20-\x7E\xA1-\xFF\n\t]/g, '');

const statusStyle = (status: string): { label: string; color: string } => {
  if (status === 'DETECTED') return { label: 'PASS', color: '#15803d' };
  if (status === 'CONFIRMED_NON_COMPLIANT') return { label: 'FAIL', color: '#b91c1c' };
  if (status === 'UNABLE_TO_VERIFY' || status === 'NOT_DETECTED') return { label: 'REVIEW', color: '#b45309' };
  return { label: 'N/A', color: '#52525b' };
};

const overallLabel = (status: string): string => {
  if (status === 'COMPLIANT') return 'COMPLIANT';
  if (status === 'NON_COMPLIANT') return 'NON-COMPLIANT';
  if (status === 'REVIEW_REQUIRED') return 'REVIEW REQUIRED';
  return 'PENDING';
};

const buildHeader = (doc: PDFKit.PDFDocument, data: ReportInspectionData) => {
  doc.rect(0, 0, doc.page.width, 90).fill('#0f172a');
  doc.fill('#f8fafc').font('Helvetica-Bold').fontSize(17).text('Legal Metrology Compliance Report', 48, 26);
  doc.fill('#94a3b8').font('Helvetica').fontSize(9).text(
    'Legal Metrology (Packaged Commodities) Rules, 2011  |  AI-assisted inspection evidence and findings',
    48,
    48
  );
  doc
    .fill('#e2e8f0')
    .fontSize(9)
    .text(`Report No: ${sanitize(data.inspectionId)}   |   Generated: ${new Date(data.createdAt || Date.now()).toLocaleDateString('en-IN')}`, 48, 62);

  doc.y = 110;
  doc.fill('#0f172a').font('Helvetica-Bold').fontSize(11).text('Inspection Summary');
  doc.moveDown(0.3);

  const rows: Array<[string, string]> = [
    ['Status', overallLabel(data.status)],
    ['Category', data.category ? sanitize(data.category) : 'Not specified'],
    ['Product', data.productName ? sanitize(data.productName) : 'Not specified'],
    ['Inspector', data.inspectorName ? sanitize(data.inspectorName) : 'Not recorded'],
    ['Review/Finalize status', data.reviewStatus ? sanitize(data.reviewStatus) : 'Pending officer review'],
    ['Pass / Review / Fail', `${data.summary.detected} / ${data.summary.notDetected + data.summary.unableToVerify} / ${data.summary.confirmedNonCompliant}`],
    ['Not applicable', String(data.summary.notApplicable)],
  ];

  const startY = doc.y;
  let colY = startY;
  for (const [k, v] of rows) {
    doc.font('Helvetica-Bold').fontSize(9).fill('#475569').text(k + ':', 48, colY);
    doc.font('Helvetica').fontSize(9).fill('#0f172a').text(v || '', 220, colY);
    colY += 14;
  }
  doc.y = colY + 8;

  if (data.notes) {
    doc.moveDown(0.4);
    doc.font('Helvetica-Oblique').fontSize(9).fill('#475569').text(`Inspector notes: ${sanitize(data.notes)}`);
    doc.moveDown(0.4);
  }
};

const renderDeclarations = (doc: PDFKit.PDFDocument, data: ReportInspectionData, newPage: () => void) => {
  const decls = formatDeclarations(data.declarations);
  newPage();
  doc.fill('#0f172a').font('Helvetica-Bold').fontSize(12).text('Extracted Declarations');
  doc.moveDown(0.5);

  if (decls.length === 0) {
    doc.font('Helvetica').fontSize(9).fill('#52525b').text('No declarations were extracted from the uploaded evidence.');
    return;
  }

  const limit = () => doc.page.height - 110;
  let y = doc.y;
  for (const d of decls) {
    const label = labelFor(d.key);
    const value = sanitize(d.value);
    const labelH = doc.font('Helvetica-Bold').fontSize(9).heightOfString(label, { width: 160 });
    const valueH = doc.font('Helvetica').fontSize(9).heightOfString(value, { width: 330 });
    const rowH = Math.max(labelH, valueH) + 6;
    if (y + rowH > limit()) {
      newPage();
      y = 50;
    }
    doc.font('Helvetica-Bold').fontSize(9).fill('#334155').text(label, 48, y, { width: 160 });
    doc.font('Helvetica').fontSize(9).fill('#0f172a').text(value, 220, y, { width: 330 });
    y += rowH;
  }
};

const renderFindings = (doc: PDFKit.PDFDocument, data: ReportInspectionData, newPage: () => void) => {
  newPage();
  doc.fill('#0f172a').font('Helvetica-Bold').fontSize(12).text('Rule Checks and Findings');
  doc.moveDown(0.5);

  if (data.findings.length === 0) {
    doc.font('Helvetica').fontSize(9).fill('#52525b').text('No rule checks were evaluated for this inspection.');
    return;
  }

  const limit = () => doc.page.height - 120;
  let y = doc.y;

  const drawRow = (label: string, value: string, width = 330) => {
    const labelH = label ? doc.font('Helvetica-Bold').fontSize(8).heightOfString(label, { width: 130 }) : 0;
    const valueH = doc.font('Helvetica').fontSize(8).heightOfString(sanitize(value), { width });
    const rowH = Math.max(labelH, valueH, 10) + 3;
    if (y + rowH > limit()) {
      newPage();
      y = 50;
    }
    if (label) doc.font('Helvetica-Bold').fontSize(8).fill('#475569').text(label, 48, y, { width: 130 });
    doc.font('Helvetica').fontSize(8).fill('#0f172a').text(sanitize(value), 190, y, { width });
    y += rowH;
  };

  for (const f of data.findings) {
    const style = statusStyle(f.status);
    const head = `${f.ruleId} — ${labelFor(f.field)}  [${style.label}]`;
    const headH = doc.font('Helvetica-Bold').fontSize(9).heightOfString(head, { width: 480 });
    if (y + headH > limit()) {
      newPage();
      y = 50;
    }
    doc.fill('#0f172a').font('Helvetica-Bold').fontSize(9).text(head, 48, y, { width: 480 });
    y += headH + 3;

    const rows: Array<[string, string]> = [
      ['Observed:', f.observedValue != null && f.observedValue !== '' ? formatVal(f.observedValue) : 'Not detected'],
      ['Expected:', f.expectedCondition || 'No specific expectation recorded'],
      ['Finding:', f.explanation || 'No explanation recorded'],
    ];
    for (const [label, value] of rows) drawRow(label, value);

    const conf = `Confidence: ${f.confidence != null ? (f.confidence * 100).toFixed(0) + '%' : 'not available'}  |  ${sanitize(f.sourceReference || '')}` +
      (f.requiresHumanReview ? '  |  Requires human verification' : '');
    const confH = doc.font('Helvetica').fontSize(7).heightOfString(conf, { width: 400 });
    if (y + confH > limit()) {
      newPage();
      y = 50;
    }
    doc.fill('#94a3b8').font('Helvetica').fontSize(7).text(conf, 190, y, { width: 400 });
    y += confH + 14;
  }
};

// Footer must NOT move doc.y / doc.x: any content drawn afterwards without
// explicit coordinates must continue from wherever it was, otherwise pdfkit
// treats cursor-at-page-bottom as overflow and inserts empty pages.
const drawFooter = (doc: PDFKit.PDFDocument, pageNumber: number) => {
  const prevX = doc.x;
  const prevY = doc.y;
  const y = doc.page.height - doc.page.margins.bottom - 14;
  doc.save();
  doc.font('Helvetica').fontSize(7).fillColor('#94a3b8');
  doc.text(
    'AI-assisted compliance tool - findings subject to officer verification.',
    doc.page.margins.left,
    y,
    { width: 320, lineBreak: false }
  );
  doc.text(`Page ${pageNumber}`, doc.page.width - doc.page.margins.right - 70, y, {
    width: 70,
    align: 'right',
    lineBreak: false,
  });
  doc.restore();
  doc.x = prevX;
  doc.y = prevY;
};

export const buildReportPdf = (data: ReportInspectionData): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // pdfkit resets x/y to the page margins on every addPage(); the footer is
    // drawn at explicit coordinates at each controlled page boundary so the
    // cursor position never corrupts layout and no overflow "blank" pages are
    // produced.
    let pageNumber = 0;
    const newPage = () => {
      doc.addPage();
      pageNumber += 1;
      drawFooter(doc, pageNumber);
    };
    pageNumber = 1;
    drawFooter(doc, 1);

    try {
      buildHeader(doc, data);
      renderDeclarations(doc, data, newPage);
      renderFindings(doc, data, newPage);
      doc.end();
    } catch (err) {
      reject(err as Error);
    }
  });

// ---------------------------------------------------------------
// Editable document: genuine OOXML .docx (opens in Word / LibreOffice)
// ---------------------------------------------------------------

const RUN = (text: string, opts: Record<string, unknown> = {}) =>
  new TextRun({ text: String(text == null ? '' : text), size: 20, ...(opts as object) });

const PAR = (children: TextRun[], opts: Record<string, unknown> = {}) =>
  new Paragraph({ children, spacing: { after: 120 }, ...(opts as object) });

const kvRow = (label: string, value: string) =>
  new TableRow({
    children: [
      new TableCell({
        shading: { fill: 'F1F5F9' },
        width: { size: 34, type: WidthType.PERCENTAGE },
        margins: { top: 60, bottom: 60, left: 120, right: 120 },
        children: [new Paragraph({ children: [RUN(label, { bold: true })], spacing: { after: 0 } })],
      }),
      new TableCell({
        width: { size: 66, type: WidthType.PERCENTAGE },
        margins: { top: 60, bottom: 60, left: 120, right: 120 },
        children: [new Paragraph({ children: [RUN(value)], spacing: { after: 0 } })],
      }),
    ],
  });

const sectionTitle = (text: string): Paragraph =>
  new Paragraph({
    heading: 'Heading2' as any,
    spacing: { before: 360, after: 120 },
    children: [RUN(text, { bold: true, size: 28 })],
  });

const findingBlocks = (data: ReportInspectionData): (Paragraph | Table)[] => {
  if (data.findings.length === 0) {
    return [PAR([RUN('No rule checks were evaluated for this inspection.', { italics: true })], { spacing: { after: 0 } })];
  }
  const blocks: (Paragraph | Table)[] = [];
  for (const f of data.findings) {
    const style = statusStyle(f.status);
    blocks.push(
      new Paragraph({
        spacing: { before: 240, after: 40 },
        children: [
          RUN(`${f.ruleId}  —  ${labelFor(f.field)}  `, { bold: true }),
          RUN(`[${style.label}]`, { bold: true, color: style.color.replace('#', '') }),
        ],
      }),
      PAR([RUN('Observed: ', { bold: true, color: '475569' }), RUN(formatVal(f.observedValue))], { spacing: { after: 40 } }),
      PAR([RUN('Expected: ', { bold: true, color: '475569' }), RUN(f.expectedCondition || '')], { spacing: { after: 40 } }),
      PAR([RUN('Finding: ', { bold: true, color: '475569' }), RUN(f.explanation || '')], { spacing: { after: 40 } }),
      PAR([
        RUN(
          `Confidence: ${f.confidence != null ? Math.round(f.confidence * 100) + '%' : 'not available'}   |   ${f.sourceReference || ''}` +
            (f.requiresHumanReview ? '   |   Requires human verification' : ''),
          { color: '94A3B8', size: 16 }
        ),
      ], { spacing: { after: 200 } })
    );
  }
  return blocks;
};

export const buildReportDocx = async (data: ReportInspectionData): Promise<Buffer> => {
  const declared = formatDeclarations(data.declarations);
  const declRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          shading: { fill: '1C1B1A' },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [RUN('Declaration', { bold: true, color: 'F9F8F6' })], spacing: { after: 0 } })],
        }),
        new TableCell({
          shading: { fill: '1C1B1A' },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [RUN('Value', { bold: true, color: 'F9F8F6' })], spacing: { after: 0 } })],
        }),
      ],
    }),
  ];
  for (const d of declared) {
    declRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: 34, type: WidthType.PERCENTAGE },
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
            children: [new Paragraph({ children: [RUN(labelFor(d.key), { bold: true })], spacing: { after: 0 } })],
          }),
          new TableCell({
            width: { size: 66, type: WidthType.PERCENTAGE },
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
            children: [new Paragraph({ children: [RUN(formatVal(d.value))], spacing: { after: 0 } })],
          }),
        ],
      })
    );
  }

  const signatureRow = new TableRow({
    children: [
      new TableCell({
        children: [
          new Paragraph({ children: [RUN('Inspector', { bold: true })], spacing: { before: 160, after: 60 } }),
          new Paragraph({ children: [RUN(data.inspectorName || '________________________')], spacing: { after: 40 } }),
          new Paragraph({ children: [RUN('Name & Signature', { color: '78716C', size: 16 })], spacing: { after: 0 } }),
        ],
      }),
      new TableCell({
        children: [
          new Paragraph({ children: [RUN('Supervisor / Approving Authority', { bold: true })], spacing: { before: 160, after: 60 } }),
          new Paragraph({ children: [RUN('________________________')], spacing: { after: 40 } }),
          new Paragraph({ children: [RUN(data.reviewStatus === 'APPROVED' ? 'Approved on report' : 'Pending approval', { color: '78716C', size: 16 })], spacing: { after: 0 } }),
        ],
      }),
    ],
  });

  const doc = new Document({
    creator: 'LMCS - SIH 2026',
    title: `Compliance Report ${data.inspectionId}`,
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 20, color: '1C1B1A' } },
      },
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ children: [PageNumber.CURRENT], size: 14, color: '94A3B8' })],
              }),
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [new TextRun({ text: 'AI-assisted compliance tool - findings subject to officer verification.', size: 14, color: '94A3B8' })],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({ children: [RUN('Legal Metrology Compliance Report', { bold: true, size: 40 })], spacing: { after: 40 } }),
          PAR([RUN('Legal Metrology (Packaged Commodities) Rules, 2011  |  AI-assisted inspection evidence and findings', { color: '64748B' })], { spacing: { after: 40 } }),
          PAR([RUN(`Report No: ${data.inspectionId}   |   Generated: ${new Date(data.createdAt || Date.now()).toLocaleDateString('en-IN')}   |   Status: ${overallLabel(data.status)}`, { color: '64748B' })], { spacing: { after: 240 } }),

          new Paragraph({
            spacing: { before: 120, after: 160 },
            children: [
              RUN(`Overall status: ${overallLabel(data.status)}  `, { bold: true, size: 28 }),
              RUN(data.status === 'COMPLIANT' ? 'PASS' : data.status === 'NON_COMPLIANT' ? 'FAIL' : 'REVIEW_REQUIRED', {
                bold: true,
                size: 28,
                color: data.status === 'COMPLIANT' ? '15803D' : data.status === 'NON_COMPLIANT' ? 'B91C1C' : 'B45309',
              }),
            ],
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              kvRow('Category', data.category || 'Not specified'),
              kvRow('Product', data.productName || 'Not specified'),
              kvRow('Inspector', data.inspectorName || 'Not recorded'),
              kvRow('Review / Finalize status', data.reviewStatus || 'Pending officer review'),
              kvRow('Pass / Review / Fail', `${data.summary.detected} / ${data.summary.notDetected + data.summary.unableToVerify} / ${data.summary.confirmedNonCompliant}`),
              ...(data.notes ? [kvRow('Inspector notes', data.notes)] : []),
            ],
          }),

          sectionTitle('Extracted Declarations'),
          declared.length > 0
            ? new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: declRows })
            : PAR([RUN('No declarations were extracted from the uploaded evidence.', { italics: true })]),

          sectionTitle('Rule Checks and Findings'),
          ...findingBlocks(data),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [signatureRow],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
};