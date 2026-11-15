# Empirical OCR & Legal Metrology Benchmark Evaluation

> **Evaluation Date**: 2026-11-15T09:20:30.790Z  
> **Sample Count**: 5 real packaging labels evaluated  
> **Mean OCR Confidence**: 61.6%  
> **Overall Field Accuracy**: 88.0%  
> **Category Accuracy**: 100.0%  

## 1. Statutory Field Detection Breakdown (Legal Metrology Rule 6)

| Statutory Requirement | Legal Reference | Evaluated Labels | Detection Accuracy |
| :--- | :--- | :--- | :--- |
| **Net Quantity** | Rule 6(1)(e) | 5 | 100.0% |
| **Maximum Retail Price (MRP)** | Rule 6(1)(c) | 5 | 100.0% |
| **Manufacturer / Packer Name** | Rule 6(1)(a) | 5 | 80.0% |
| **Consumer Care Helpline** | Rule 6(1)(h) | 5 | 80.0% |
| **Dates (Mfg / Best Before)** | Rule 6(1)(d) | 5 | 80.0% |

## 2. Per-Sample Empirical Results Table

| Filename | Expected Cat | Detected Cat | OCR Conf | Winning Sharp Variant | Latency | Qty | MRP | Mfg | Care | Date |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `sample_label_maggi.png` | food | food | 66% | `standard_enhanced` | 7072ms | PASS | PASS | PASS | PASS | PASS |
| `sample_label_juice.jpg` | food | food | 69% | `standard_enhanced` | 2466ms | PASS | PASS | PASS | PASS | PASS |
| `sample_label_soap.jpg` | cosmetic | cosmetic | 35% | `sharpen_contrast` | 5139ms | PASS | PASS | FAIL | FAIL | FAIL |
| `sample_label_rice.jpg` | food | food | 51% | `standard_enhanced` | 3166ms | PASS | PASS | PASS | PASS | PASS |
| `sample_label_electronics.jpg` | other | other | 87% | `standard_enhanced` | 1308ms | PASS | PASS | PASS | PASS | PASS |

## 3. Preprocessing Variant Performance

- **`standard_enhanced`**: selected on 4 of 5 samples (80.0%).
- **`sharpen_contrast`**: selected on 1 of 5 samples (20.0%).

## 4. Academic Evaluation Notice & Expansion Instructions

In adherence to rigorous empirical evaluation standards, results above reflect only genuine tests executed on real physical packaging photos without synthetic data or manufactured numbers. If fewer than 20 label photos are present:
1. Add real product label captures in `tests/images/`.
2. Add ground-truth binary annotations (1 = present on packet, 0 = missing) in `tests/eval/ground_truth.csv`.
3. Re-execute `npm run eval:ocr` to regenerate this document with expanded empirical evidence.