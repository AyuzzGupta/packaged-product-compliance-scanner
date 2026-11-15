#!/usr/bin/env python3
"""
build_report_v3.py
Applies page numbering (Roman numerals in preliminary pages, Arabic numerals in Chapter 1 onward)
and updates Table of Contents, List of Tables, and List of Figures to reflect user-edited spacing.
Saves cleanly to SIH26034_Project_Report_v3.docx.
"""

import sys
import docx
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

COLOR_BLACK = RGBColor(0x00, 0x00, 0x00)

def add_leader_line(p, title, page_str, indent_in=0.0, bold=False, font_pt=10.5, space_before=0, space_after=1.5):
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.15
    if indent_in > 0:
        p.paragraph_format.left_indent = Inches(indent_in)
    else:
        p.paragraph_format.left_indent = Inches(0.0)

    pPr = p._p.get_or_add_pPr()
    tabs = parse_xml(r'<w:tabs %s><w:tab w:val="right" w:leader="dot" w:pos="9072"/></w:tabs>' % nsdecls('w'))
    pPr.append(tabs)

    r_title = p.add_run(title)
    r_title.font.name = 'Times New Roman'
    r_title.font.size = Pt(font_pt)
    r_title.font.bold = bold
    r_title.font.color.rgb = COLOR_BLACK

    r_tab = p.add_run("\t")
    r_tab.font.name = 'Times New Roman'
    r_tab.font.size = Pt(font_pt)
    r_tab.font.bold = bold
    r_tab.font.color.rgb = COLOR_BLACK

    r_pg = p.add_run(page_str)
    r_pg.font.name = 'Times New Roman'
    r_pg.font.size = Pt(font_pt)
    r_pg.font.bold = bold
    r_pg.font.color.rgb = COLOR_BLACK

def configure_footers(doc):
    sec0 = doc.sections[0]
    sec1 = doc.sections[1]

    # Section 0: Lower Roman, Different First Page (Cover page has no visible number)
    sec0.different_first_page_header_footer = True
    fp_footer = sec0.first_page_footer
    p_fp = fp_footer.paragraphs[0] if fp_footer.paragraphs else fp_footer.add_paragraph()
    p_fp.text = ''

    footer0 = sec0.footer
    footer0.is_linked_to_previous = False
    p0 = footer0.paragraphs[0] if footer0.paragraphs else footer0.add_paragraph()
    p0.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p0.text = ''

    r0 = p0.add_run()
    r0_xml = r0._r
    fldChar1 = parse_xml(r'<w:fldChar %s w:fldCharType="begin"/>' % nsdecls('w'))
    instrText = parse_xml(r'<w:instrText %s xml:space="preserve"> PAGE </w:instrText>' % nsdecls('w'))
    fldChar2 = parse_xml(r'<w:fldChar %s w:fldCharType="separate"/>' % nsdecls('w'))
    fldChar3 = parse_xml(r'<w:fldChar %s w:fldCharType="end"/>' % nsdecls('w'))
    r0_xml.append(fldChar1)
    r0_xml.append(instrText)
    r0_xml.append(fldChar2)
    r0_xml.append(fldChar3)
    r0.font.name = 'Times New Roman'
    r0.font.size = Pt(10)
    r0.font.color.rgb = COLOR_BLACK

    # Section 1: Decimal (1, 2, 3...), starts at 1, Right aligned
    sec1.different_first_page_header_footer = False
    footer1 = sec1.footer
    footer1.is_linked_to_previous = False
    p1 = footer1.paragraphs[0] if footer1.paragraphs else footer1.add_paragraph()
    p1.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p1.text = ''

    r1 = p1.add_run()
    r1_xml = r1._r
    fldChar1_1 = parse_xml(r'<w:fldChar %s w:fldCharType="begin"/>' % nsdecls('w'))
    instrText_1 = parse_xml(r'<w:instrText %s xml:space="preserve"> PAGE </w:instrText>' % nsdecls('w'))
    fldChar2_1 = parse_xml(r'<w:fldChar %s w:fldCharType="separate"/>' % nsdecls('w'))
    fldChar3_1 = parse_xml(r'<w:fldChar %s w:fldCharType="end"/>' % nsdecls('w'))
    r1_xml.append(fldChar1_1)
    r1_xml.append(instrText_1)
    r1_xml.append(fldChar2_1)
    r1_xml.append(fldChar3_1)
    r1.font.name = 'Times New Roman'
    r1.font.size = Pt(10)
    r1.font.color.rgb = COLOR_BLACK

    # Set pgNumType explicitly in sectPr
    pnt0 = sec0._sectPr.find(qn('w:pgNumType'))
    if pnt0 is None:
        pnt0 = parse_xml(r'<w:pgNumType %s w:fmt="lowerRoman" w:start="1"/>' % nsdecls('w'))
        sec0._sectPr.append(pnt0)
    else:
        pnt0.set(qn('w:fmt'), 'lowerRoman')
        pnt0.set(qn('w:start'), '1')

    pnt1 = sec1._sectPr.find(qn('w:pgNumType'))
    if pnt1 is None:
        pnt1 = parse_xml(r'<w:pgNumType %s w:fmt="decimal" w:start="1"/>' % nsdecls('w'))
        sec1._sectPr.append(pnt1)
    else:
        pnt1.set(qn('w:fmt'), 'decimal')
        pnt1.set(qn('w:start'), '1')

def update_toc_and_lists(doc):
    # TOC Entries data with exact updated page locations matching user spacing
    toc_part1 = [
        ("ABSTRACT", "v", 0.0, True, 11.5, 0, 2),
        ("LIST OF TABLES", "ix", 0.0, True, 11.5, 0, 2),
        ("LIST OF FIGURES", "x", 0.0, True, 11.5, 0, 2),
        ("LIST OF SYMBOLS, ABBREVIATIONS AND NOMENCLATURE", "xi", 0.0, True, 11.5, 0, 5),
        ("1.  INTRODUCTION", "1", 0.0, True, 11.5, 0, 2),
        ("1.1 Problem Definition", "1", 0.2, False, 10.5, 0, 1.5),
        ("1.2 Background about the Project Idea", "2", 0.2, False, 10.5, 0, 1.5),
        ("1.3 Objectives of Proposed System", "3", 0.2, False, 10.5, 0, 1.5),
        ("1.4 Feasibility Study, Need and Significance", "3", 0.2, False, 10.5, 0, 1.5),
        ("1.4.1 Technical Feasibility", "4", 0.4, False, 10.0, 0, 1.0),
        ("1.4.2 Economic Feasibility", "4", 0.4, False, 10.0, 0, 1.0),
        ("1.4.3 Operational Feasibility", "4", 0.4, False, 10.0, 0, 1.0),
        ("1.5 Novelty of Project", "4", 0.2, False, 10.5, 0, 1.5),
        ("1.6 Technical Specification", "4", 0.2, False, 10.5, 0, 1.5),
        ("1.6.1 Hardware and Software Requirements", "5", 0.4, False, 10.0, 0, 4.0),
        ("2.  LITERATURE REVIEW", "6", 0.0, True, 11.5, 0, 2),
        ("2.1 Existing System Overview & Methodological Foundations", "6", 0.2, False, 10.5, 0, 1.5),
        ("2.2 Comparative Survey of OCR & Computer Vision Technologies", "6", 0.2, False, 10.5, 0, 1.5),
        ("2.3 Regulatory Frameworks (Legal Metrology, FSSAI, EU CosIng)", "7", 0.2, False, 10.5, 0, 1.5),
        ("2.4 Gaps Identified in Literature and Existing Solutions", "8", 0.2, False, 10.5, 0, 4.0),
        ("3.  PROPOSED SYSTEM", "10", 0.0, True, 11.5, 0, 2),
        ("3.1 System Overview & Design Philosophy", "10", 0.2, False, 10.5, 0, 1.5),
        ("3.2 Dual-Mode Operational Framework (Retailer vs. Consumer)", "10", 0.2, False, 10.5, 0, 1.5),
        ("3.3 Four-Tier System Architecture", "12", 0.2, False, 10.5, 0, 1.5),
        ("3.4 Detailed Tier Analysis (Presentation & Application Layers)", "13", 0.2, False, 10.5, 0, 1.5),
        ("3.5 Machine Learning Microservice & Persistence Layer", "14", 0.2, False, 10.5, 0, 4.0),
        ("4.  SOFTWARE REQUIREMENT ANALYSIS", "15", 0.0, True, 11.5, 0, 2),
        ("4.1 Functional Requirements (FR-U1 to FR-U12)", "15", 0.2, False, 10.5, 0, 1.5),
        ("4.1.1 Detailed Use Case Factoring & Descriptions", "16", 0.4, False, 10.0, 0, 1.0),
        ("4.1.2 Use Case Diagram & Specifications", "17", 0.4, False, 10.0, 0, 1.0),
        ("4.2 Non-Functional Requirements Specification", "18", 0.2, False, 10.5, 0, 1.5),
        ("4.3 Major System Modules and Functional Roles", "19", 0.2, False, 10.5, 0, 4.0),
        ("5.  SYSTEM ANALYSIS & DESIGN", "20", 0.0, True, 11.5, 0, 2),
        ("5.1 UML Class Designs & Domain Object Models", "20", 0.2, False, 10.5, 0, 1.5),
        ("5.2 Sequence Diagrams for Inspection Workflows", "21", 0.2, False, 10.5, 0, 1.5),
        ("5.3 Activity Diagrams & Process Logic", "22", 0.2, False, 10.5, 0, 1.5),
        ("5.4 Data Flow Diagrams (DFD Level 0 Context & Level 1)", "23", 0.2, False, 10.5, 0, 1.5),
        ("5.4.1 DFD Level 1 (Detailed Subsystem Processes)", "24", 0.4, False, 10.0, 0, 1.0),
        ("5.5 Database Design & Entity-Relationship Schema", "25", 0.2, False, 10.5, 0, 1.5),
        ("5.6 Project Planning & Gantt Chart", "26", 0.2, False, 10.5, 0, 0.0),
    ]

    toc_part2 = [
        ("6.  IMPLEMENTATION / CORE MODULE", "27", 0.0, True, 11.5, 0, 2),
        ("6.1 Database Schema & Data Dictionary (scans.json)", "27", 0.2, False, 10.5, 0, 1.5),
        ("6.2 Used Algorithms and Approaches", "28", 0.2, False, 10.5, 0, 1.5),
        ("6.2.1 Computer Vision Preprocessing Pipeline (Sharp)", "28", 0.4, False, 10.0, 0, 1.0),
        ("6.2.2 Rule-Based Statutory Validation Engine", "29", 0.4, False, 10.0, 0, 1.0),
        ("6.2.3 Product Category Classifier (TF-IDF + Logistic Regression)", "30", 0.4, False, 10.0, 0, 1.0),
        ("6.2.4 Food Health & Nutri-Score Predictor (Random Forest)", "31", 0.4, False, 10.0, 0, 1.0),
        ("6.2.5 Cosmetic & Health Ingredient Matching Engine (RapidFuzz)", "32", 0.4, False, 10.0, 0, 1.0),
        ("6.3 Implementation of Core Modules & Service Orchestration", "33", 0.2, False, 10.5, 0, 4.0),
        ("7.  RESULTS / OUTPUTS & TESTING", "34", 0.0, True, 11.5, 0, 2),
        ("7.1 All User Interfaces and Output Screens", "34", 0.2, False, 10.5, 0, 1.5),
        ("7.1.1 ComplianceScan Main Inspection Interface", "34", 0.4, False, 10.0, 0, 1.0),
        ("7.1.2 Retailer Mode High-Throughput Batch Scanning Screen", "35", 0.4, False, 10.0, 0, 1.0),
        ("7.1.3 Statutory Compliance & AI Health Snapshot Output Screen", "36", 0.4, False, 10.0, 0, 1.0),
        ("7.1.4 Audit Dashboard & Regulatory History Screen", "37", 0.4, False, 10.0, 0, 1.0),
        ("7.2 Layouts of Web Pages and Visual Hierarchy", "38", 0.2, False, 10.5, 0, 1.5),
        ("7.3 Design and Test Steps / Verification Criteria", "39", 0.2, False, 10.5, 0, 1.5),
        ("7.4 Testing Process and Empirical Experimental Results", "40", 0.2, False, 10.5, 0, 1.5),
        ("7.4.3 Empirical Evaluation Across Real-World Packaging Commodities", "41", 0.4, False, 10.0, 0, 4.0),
        ("8.  CONCLUSIONS / RECOMMENDATIONS", "42", 0.0, True, 11.5, 0, 2),
        ("8.1 Conclusions & Key Engineering Achievements", "42", 0.2, False, 10.5, 0, 1.5),
        ("8.2 Practical Impact, System Limitations & Future Scope", "43", 0.2, False, 10.5, 0, 4.0),
        ("9.  PLAGIARISM STATEMENT & REPORT", "44", 0.0, True, 11.5, 0, 4.0),
        ("10. REFERENCES", "45", 0.0, True, 11.5, 0, 4.0),
        ("11. RESEARCH PAPER PUBLICATION", "47", 0.0, True, 11.5, 0, 2),
        ("11.1 Planned Manuscript Title & Abstract", "47", 0.2, False, 10.5, 0, 1.5),
        ("11.2 Target Publication Venues & Readiness Status", "48", 0.2, False, 10.5, 0, 4.0),
        ("12. APPENDICES", "49", 0.0, True, 11.5, 0, 2),
        ("12.1 Details of Software / Simulator Tools", "49", 0.2, False, 10.5, 0, 1.5),
        ("12.2 Steps to Execute / Run / Implement the Project", "49", 0.2, False, 10.5, 0, 1.5),
        ("12.3 Core Implementation Code Listings", "49", 0.2, False, 10.5, 0, 0.0),
    ]

    lot_entries = [
        ("Table 1.1: Hardware Requirements Specification", "5"),
        ("Table 1.2: Software Requirements and Environment Dependencies", "5"),
        ("Table 4.1: Non-Functional Requirements Specification (Performance, Security)", "18"),
        ("Table 6.1: scans.json Persistence Schema and Data Dictionary", "27"),
        ("Table 6.2: Legal Metrology Rule 6 Statutory Compliance Parsing Rules Reference", "29"),
        ("Table 6.3: Food Nutri-Score Random Forest 14-Feature Input Specification", "31"),
        ("Table 6.4: Cosmetic Formulation Hazard Concern Classification Criteria", "32"),
        ("Table 7.1: Automated Test Suite Verification Matrix and Pass Criteria", "39"),
        ("Table 7.2: Empirical Inspection Outcomes Across Real-World Commercial Commodities", "41"),
        ("Table 9.1: Plagiarism Verification and Originality Analysis Summary Report", "44"),
    ]

    lof_entries = [
        ("Figure 3.1: Four-Tier System Architecture Diagram", "12"),
        ("Figure 4.1: Comprehensive Use Case Diagram for User and Retailer Roles", "17"),
        ("Figure 5.1: UML Class Diagram for Backend Logic and Domain Models", "20"),
        ("Figure 5.2: Sequence Diagram for End-to-End Label Inspection Workflow", "21"),
        ("Figure 5.3: Activity Diagram for Scanning Pipeline and OCR Fallback Decision Logic", "22"),
        ("Figure 5.4: Data Flow Diagram (DFD) Level 0 — Context Diagram", "23"),
        ("Figure 5.5: Data Flow Diagram (DFD) Level 1 — Detailed Subsystem Inspection Pipeline", "24"),
        ("Figure 5.6: Entity-Relationship (E-R) Diagram for Inspection Records", "25"),
        ("Figure 5.7: Project Development Timeline and Work Breakdown Structure (Gantt Chart)", "26"),
        ("Figure 6.1: Rule-Based Statutory Validation Engine Structural Architecture", "29"),
        ("Figure 7.1: ComplianceScan Main Inspection Interface (Consumer Mode & Image Upload)", "34"),
        ("Figure 7.2: Retailer Mode High-Throughput Batch Scanning Interface", "35"),
        ("Figure 7.3: Inspection Results Screen — Statutory Compliance & AI Health Snapshot Output", "36"),
        ("Figure 7.4: Audit Dashboard Screen — Compliance Statistics, Pass Rates & History", "37"),
        ("Figure 7.5: Test Sample Packaging Label — Maggi 2-Minute Noodles Mandatory Disclosures", "40"),
        ("Figure 7.6: Test Sample Packaging Label — Whole Wheat Atta Nutritional Information", "40"),
    ]

    # Find the TOC start paragraph index
    toc_start_idx = None
    for i, p in enumerate(doc.paragraphs):
        if p.text.strip() == "Table of Contents":
            toc_start_idx = i
            break

    if toc_start_idx is None:
        print("Error: Could not locate Table of Contents start!")
        return

    # Find List of Tables index
    lot_idx = None
    for i, p in enumerate(doc.paragraphs):
        if p.text.strip() == "List of Tables":
            lot_idx = i
            break

    # Find List of Figures index
    lof_idx = None
    for i, p in enumerate(doc.paragraphs):
        if p.text.strip() == "List of Figures":
            lof_idx = i
            break

    # Find List of Symbols index
    los_idx = None
    for i, p in enumerate(doc.paragraphs):
        if "List of Symbols" in p.text:
            los_idx = i
            break

    print(f"Indices: TOC={toc_start_idx}, LOT={lot_idx}, LOF={lof_idx}, LOS={los_idx}")

    # Update TOC entries in place
    # TOC Part 1 entries: toc_start_idx + 1 to toc_start_idx + len(toc_part1)
    all_toc = toc_part1 + [("SPLIT", "")] + toc_part2
    
    # We will update paragraphs from toc_start_idx + 1 to lot_idx - 1
    # Check current paragraphs in TOC range
    toc_slice = doc.paragraphs[toc_start_idx + 1 : lot_idx]
    print(f"Current TOC paragraphs count: {len(toc_slice)}")

    # Update the TOC entries
    curr_idx = toc_start_idx + 1
    for item in toc_part1:
        p = doc.paragraphs[curr_idx]
        p.text = ""
        add_leader_line(p, item[0], item[1], indent_in=item[2], bold=item[3], font_pt=item[4], space_before=item[5], space_after=item[6])
        curr_idx += 1

    # Insert clean page break between Part 1 and Part 2 if not present
    # Check if doc.paragraphs[curr_idx] can be the break or heading
    p_break = doc.paragraphs[curr_idx]
    p_break.text = ""
    # Add page break
    r_br = p_break.add_run()
    r_br.add_break(docx.enum.text.WD_BREAK.PAGE)
    curr_idx += 1

    # Add TOC Continued title
    p_cont = doc.paragraphs[curr_idx]
    p_cont.text = ""
    p_cont.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cont.paragraph_format.space_before = Pt(12)
    p_cont.paragraph_format.space_after = Pt(16)
    r = p_cont.add_run("Table of Contents (Continued)")
    r.font.name = 'Times New Roman'
    r.font.size = Pt(15)
    r.font.bold = True
    r.font.color.rgb = COLOR_BLACK
    curr_idx += 1

    for item in toc_part2:
        if curr_idx < lot_idx:
            p = doc.paragraphs[curr_idx]
            p.text = ""
            add_leader_line(p, item[0], item[1], indent_in=item[2], bold=item[3], font_pt=item[4], space_before=item[5], space_after=item[6])
            curr_idx += 1

    # Update List of Tables
    # From lot_idx + 1 to lof_idx - 1
    lot_slice = doc.paragraphs[lot_idx + 1 : lof_idx]
    for idx, (t_title, t_pg) in enumerate(lot_entries):
        if idx < len(lot_slice):
            p = lot_slice[idx]
            p.text = ""
            add_leader_line(p, t_title, t_pg, font_pt=11.0, space_after=5)

    # Update List of Figures
    # From lof_idx + 1 to los_idx - 1
    lof_slice = doc.paragraphs[lof_idx + 1 : los_idx]
    for idx, (f_title, f_pg) in enumerate(lof_entries):
        if idx < len(lof_slice):
            p = lof_slice[idx]
            p.text = ""
            add_leader_line(p, f_title, f_pg, font_pt=10.5, space_after=3.5)

def main():
    input_file = "SIH26034_Project_Report_v2.docx"
    output_file = "SIH26034_Project_Report_v3.docx"

    print(f"Loading {input_file}...")
    doc = docx.Document(input_file)

    print("Configuring footers and page numbering...")
    configure_footers(doc)

    print("Updating Table of Contents, List of Tables, and List of Figures...")
    update_toc_and_lists(doc)

    print(f"Saving to {output_file}...")
    doc.save(output_file)
    print(f"Report v3 successfully created: {output_file}")

if __name__ == "__main__":
    main()
