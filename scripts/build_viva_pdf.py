#!/usr/bin/env python3
"""
Convert docs/viva/VIVA_PREP.md to a professional PDF: docs/viva/SIH26034_Viva_Prep.pdf
Using ReportLab. Cover page shows ONLY candidate name 'Ayush Gupta' and date '15 November 2026'.
No organization name.
"""

import os
import re
import html
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Preformatted,
    Table, TableStyle, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
MD_PATH = os.path.join(BASE_DIR, 'docs', 'viva', 'VIVA_PREP.md')
PDF_PATH = os.path.join(BASE_DIR, 'docs', 'viva', 'SIH26034_Viva_Prep.pdf')

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            return  # Suppress headers/footers on cover page
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        
        # Running Header
        self.drawString(40, 815, "Packaged Product Compliance Scanner (SIH26034) — Master Viva Preparation Guide")
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(40, 808, 555, 808)
        
        # Running Footer
        self.line(40, 35, 555, 35)
        self.drawString(40, 24, "Candidate: Ayush Gupta  |  Date: 15 November 2026")
        self.drawRightString(555, 24, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()

def clean_inline_md(text):
    """Safely convert markdown inline formatting to ReportLab paragraph XML tags."""
    # First escape literal XML entities
    text = html.escape(text)
    
    # Inline code: `code` -> <font name="Courier" color="#b91c1c">code</font>
    text = re.sub(r'`([^`]+)`', r'<font name="Courier" color="#b91c1c">\1</font>', text)
    
    # Bold italic: ***text*** or ___text___
    text = re.sub(r'\*\*\*([^\*]+)\*\*\*', r'<b><i>\1</i></b>', text)
    
    # Bold: **text**
    text = re.sub(r'\*\*([^\*]+)\*\*', r'<b>\1</b>', text)
    
    # Italic: *text* or _text_ (ensure not mid-identifier)
    text = re.sub(r'(?<!\w)\*([^\*]+)\*(?!\w)', r'<i>\1</i>', text)
    text = re.sub(r'(?<!\w)_([^_]+)_(?!\w)', r'<i>\1</i>', text)
    
    return text

def parse_markdown_to_flowables(md_text, styles):
    lines = md_text.splitlines()
    flowables = []
    
    # Styles
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=30,
        textColor=colors.HexColor('#1e3a8a'),
        alignment=1, # Centered
        spaceAfter=12
    )
    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=13,
        leading=18,
        textColor=colors.HexColor('#334155'),
        alignment=1,
        spaceAfter=25
    )
    meta_style = ParagraphStyle(
        'CoverMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=16,
        textColor=colors.HexColor('#0f172a'),
        alignment=1
    )
    h1_style = ParagraphStyle(
        'MD_H1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=colors.HexColor('#1e3a8a'),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )
    h2_style = ParagraphStyle(
        'MD_H2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1d4ed8'),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )
    h3_style = ParagraphStyle(
        'MD_H3',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor('#334155'),
        spaceBefore=8,
        spaceAfter=3,
        keepWithNext=True
    )
    h4_style = ParagraphStyle(
        'MD_H4',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor('#475569'),
        spaceBefore=6,
        spaceAfter=2,
        keepWithNext=True
    )
    body_style = ParagraphStyle(
        'MD_Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#1e293b'),
        spaceAfter=5
    )
    bullet_style = ParagraphStyle(
        'MD_Bullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        leftIndent=14,
        firstLineIndent=-10,
        textColor=colors.HexColor('#1e293b'),
        spaceAfter=3
    )
    quote_style = ParagraphStyle(
        'MD_Quote',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=12,
        leftIndent=16,
        textColor=colors.HexColor('#0f766e'),
        backColor=colors.HexColor('#f0fdfa'),
        borderColor=colors.HexColor('#0d9488'),
        borderWidth=1,
        borderPadding=6,
        spaceBefore=4,
        spaceAfter=6
    )
    code_style = ParagraphStyle(
        'MD_Code',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7,
        leading=9,
        textColor=colors.HexColor('#0f172a'),
        backColor=colors.HexColor('#f8fafc'),
        borderColor=colors.HexColor('#cbd5e1'),
        borderWidth=0.5,
        borderPadding=5,
        spaceBefore=4,
        spaceAfter=6
    )
    table_cell_style = ParagraphStyle(
        'MD_TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#1e293b')
    )
    table_header_style = ParagraphStyle(
        'MD_TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=colors.white
    )

    # 1. GENERATE DEDICATED COVER PAGE
    flowables.append(Spacer(1, 100))
    flowables.append(Paragraph("Packaged Product Compliance Scanner", title_style))
    flowables.append(Paragraph("Problem Statement ID: SIH26034 &nbsp;|&nbsp; Mini Project", subtitle_style))
    
    flowables.append(HRFlowable(width="60%", thickness=2, color=colors.HexColor('#1e3a8a'), spaceBefore=10, spaceAfter=25))
    
    cover_desc = (
        "<b>Comprehensive Viva-Voce Master Preparation & Technical Defense Guide</b><br/><br/>"
        "An in-depth guide covering full request lifecycle, Legal Metrology Rule 6 statutory checks, "
        "hybrid OCR pipeline (Tesseract + Sharp), Python FastAPI ML microservice (Nutri-Score & Category Classification), "
        "150+ categorized examination questions, 30 code-reading drills, and React comparative rewrites."
    )
    flowables.append(Paragraph(cover_desc, ParagraphStyle('CoverDesc', parent=subtitle_style, fontSize=10, leading=15, textColor=colors.HexColor('#475569'))))
    flowables.append(Spacer(1, 50))
    
    # Candidate Metadata Box (Clean & Professional, NO organization name)
    meta_box_data = [
        [Paragraph("<b>Candidate Name</b>", table_header_style), Paragraph("<b>Ayush Gupta</b>", table_header_style)],
        [Paragraph("<b>Evaluation Date</b>", table_cell_style), Paragraph("15 November 2026", table_cell_style)],
        [Paragraph("<b>Architecture Stack</b>", table_cell_style), Paragraph("Vanilla JS + Node.js (5001) + FastAPI ML (8001)", table_cell_style)],
        [Paragraph("<b>Regulatory Domain</b>", table_cell_style), Paragraph("Legal Metrology (Packaged Commodities) Rules, 2011 (Rule 6)", table_cell_style)],
        [Paragraph("<b>Model Evaluation</b>", table_cell_style), Paragraph("Category Classifier (100%), Nutri-Score RF (100%), Baseline (50.86%)", table_cell_style)]
    ]
    meta_table = Table(meta_box_data, colWidths=[150, 260])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a8a')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8fafc')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
    ]))
    flowables.append(meta_table)
    flowables.append(Spacer(1, 40))
    flowables.append(Paragraph("<i>Prepared exclusively for viva-voce technical examination.</i>", ParagraphStyle('CoverNote', parent=meta_style, fontSize=8, textColor=colors.HexColor('#94a3b8'))))
    flowables.append(PageBreak())

    # 2. PARSE MARKDOWN BODY
    i = 0
    in_code_block = False
    code_lines = []
    
    in_table = False
    table_rows = []

    # Skip initial metadata from MD since cover page already handled it
    in_header_meta = True

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # Handle code blocks
        if stripped.startswith("```"):
            if in_code_block:
                # End of code block
                code_text = "\n".join(code_lines)
                flowables.append(Preformatted(code_text, code_style))
                code_lines = []
                in_code_block = False
            else:
                # Start of code block
                in_code_block = True
                code_lines = []
            i += 1
            continue
        
        if in_code_block:
            code_lines.append(line)
            i += 1
            continue

        # Handle tables
        if stripped.startswith("|") and stripped.endswith("|"):
            # Check if separator row (|---|---|)
            if re.match(r'^\|[\s\-:]+(\|[\s\-:]+)+\|$', stripped):
                i += 1
                continue
            
            # Extract cells
            raw_cells = [c.strip() for c in stripped.split("|")[1:-1]]
            table_rows.append(raw_cells)
            i += 1
            continue
        else:
            if table_rows:
                # Flush table
                col_count = max(len(r) for r in table_rows)
                # Pad shorter rows
                for r in table_rows:
                    while len(r) < col_count:
                        r.append("")
                
                # Available width ~ 515 pt
                total_w = 515.0
                col_w = total_w / col_count
                widths = [col_w] * col_count

                formatted_table_data = []
                for row_idx, r in enumerate(table_rows):
                    row_cells = []
                    is_header = (row_idx == 0)
                    for c in r:
                        c_clean = clean_inline_md(c)
                        st = table_header_style if is_header else table_cell_style
                        row_cells.append(Paragraph(c_clean, st))
                    formatted_table_data.append(row_cells)

                t = Table(formatted_table_data, colWidths=widths)
                t.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a8a')),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('TOPPADDING', (0, 0), (-1, -1), 4),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                    ('LEFTPADDING', (0, 0), (-1, -1), 4),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 4),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#ffffff'), colors.HexColor('#f8fafc')]),
                    ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
                    ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
                ]))
                flowables.append(Spacer(1, 4))
                flowables.append(t)
                flowables.append(Spacer(1, 6))
                table_rows = []

        # Empty lines
        if not stripped:
            i += 1
            continue

        # Horizontal rules
        if stripped in ('---', '***', '___'):
            if in_header_meta:
                in_header_meta = False
            flowables.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#e2e8f0'), spaceBefore=8, spaceAfter=8))
            i += 1
            continue

        # Skip header metadata block in markdown since we made a cover page
        if in_header_meta and (stripped.startswith("# ") or stripped.startswith("**Candidate Name") or stripped.startswith("**Project Title") or stripped.startswith("**Problem Statement") or stripped.startswith("**Date of Evaluation")):
            i += 1
            continue

        # Blockquote (> ...)
        if stripped.startswith(">"):
            quote_text = stripped.lstrip(">").strip()
            # If multi-line quote
            while i + 1 < len(lines) and lines[i+1].strip().startswith(">"):
                i += 1
                quote_text += " " + lines[i].strip().lstrip(">").strip()
            clean_q = clean_inline_md(quote_text)
            flowables.append(Paragraph(clean_q, quote_style))
            i += 1
            continue

        # Headings
        if stripped.startswith("#### "):
            h_text = clean_inline_md(stripped[5:].strip())
            flowables.append(Paragraph(h_text, h4_style))
            i += 1
            continue
        elif stripped.startswith("### "):
            h_text = clean_inline_md(stripped[4:].strip())
            flowables.append(Paragraph(h_text, h3_style))
            i += 1
            continue
        elif stripped.startswith("## "):
            h_text = clean_inline_md(stripped[3:].strip())
            flowables.append(Spacer(1, 4))
            flowables.append(Paragraph(h_text, h2_style))
            i += 1
            continue
        elif stripped.startswith("# "):
            h_text = clean_inline_md(stripped[2:].strip())
            flowables.append(Spacer(1, 6))
            flowables.append(Paragraph(h_text, h1_style))
            i += 1
            continue

        # Unordered list items (- or *)
        if stripped.startswith("- ") or stripped.startswith("* "):
            item_text = clean_inline_md(stripped[2:].strip())
            bullet_html = f"&bull; &nbsp; {item_text}"
            flowables.append(Paragraph(bullet_html, bullet_style))
            i += 1
            continue

        # Ordered list items (1. 2. etc.)
        num_match = re.match(r'^(\d+)\.\s+(.*)$', stripped)
        if num_match:
            num = num_match.group(1)
            item_text = clean_inline_md(num_match.group(2))
            numbered_html = f"<b>{num}.</b> &nbsp; {item_text}"
            flowables.append(Paragraph(numbered_html, bullet_style))
            i += 1
            continue

        # Regular paragraph
        clean_p = clean_inline_md(stripped)
        flowables.append(Paragraph(clean_p, body_style))
        i += 1

    return flowables

def main():
    print(f"Reading markdown from {MD_PATH}...")
    with open(MD_PATH, 'r', encoding='utf-8') as f:
        md_text = f.read()

    styles = getSampleStyleSheet()
    
    print("Parsing markdown to flowables...")
    flowables = parse_markdown_to_flowables(md_text, styles)

    print(f"Building PDF: {PDF_PATH} (A4 format with NumberedCanvas)...")
    doc = SimpleDocTemplate(
        PDF_PATH,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=45,
        bottomMargin=45
    )
    
    doc.build(flowables, canvasmaker=NumberedCanvas)
    
    file_size_mb = os.path.getsize(PDF_PATH) / (1024 * 1024)
    print(f"SUCCESS: Generated {PDF_PATH} ({file_size_mb:.2f} MB)")

if __name__ == '__main__':
    main()
