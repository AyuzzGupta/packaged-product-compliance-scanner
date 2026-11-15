#!/usr/bin/env python3
"""
train_nutriscore.py
Trains the Food Health & Nutri-Score Model (Grade A - E)
Features:
  - Tabular nutrients (energy, sugars, saturated fat, sodium, fiber, protein)
  - Additives count
  - Indian context & harmful ingredient flags (palm oil, refined flour, artificial colors, sweeteners)
  - Ingredient ranking signals (sugar, oil, salt in top 3 positions)
Compares Random Forest with rule-based Nutri-Score on held-out test split.
Saves model and evaluation report.
"""

import os
import re
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import joblib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, 'data', 'processed', 'food_nutriscore_dataset.csv')
MODELS_DIR = os.path.join(BASE_DIR, 'models')
os.makedirs(MODELS_DIR, exist_ok=True)

MODEL_OUTPUT_PATH = os.path.join(MODELS_DIR, 'nutriscore_model.joblib')
REPORT_OUTPUT_PATH = os.path.join(MODELS_DIR, 'nutriscore_report.txt')

GRADE_ORDER = ['A', 'B', 'C', 'D', 'E']
GRADE_TO_INT = {g: i for i, g in enumerate(GRADE_ORDER)}

# =============================================================================
# FEATURE EXTRACTION LOGIC
# =============================================================================
def extract_ingredient_flags(ingredients_text):
    text = str(ingredients_text or '').lower()
    
    # 1. Ingredient flags
    has_palm_oil = 1 if re.search(r'\b(palm\s*oil|palmolein|palm\s*fat|fractionated\s*palm)\b', text) else 0
    has_refined_flour = 1 if re.search(r'\b(refined\s*wheat\s*flour|maida|white\s*flour)\b', text) else 0
    has_art_color = 1 if re.search(r'\b(tartrazine|sunset\s*yellow|carmoisine|allura\s*red|brilliant\s*blue|ins\s*102|ins\s*110|ins\s*122|ins\s*133|ci\s*\d{5})\b', text) else 0
    has_art_sweetener = 1 if re.search(r'\b(aspartame|acesulfame|sucralose|saccharin|ins\s*951|ins\s*950|ins\s*955)\b', text) else 0
    
    # 2. Position analysis (top 3 ingredients)
    # Split by comma or semicolon outside parentheses
    tokens = [t.strip() for t in re.split(r'[,;](?![^(]*\))', text) if t.strip()]
    top_3 = " ".join(tokens[:3])
    
    sugar_in_top_3 = 1 if re.search(r'\b(sugar|sucrose|glucose|fructose|syrup|invert\s*sugar)\b', top_3) else 0
    oil_in_top_3 = 1 if re.search(r'\b(oil|fat|butter|ghee|palmolein|shortening)\b', top_3) else 0
    salt_in_top_3 = 1 if re.search(r'\b(salt|sodium|iodised\s*salt)\b', top_3) else 0

    return [
        has_palm_oil,
        has_refined_flour,
        has_art_color,
        has_art_sweetener,
        sugar_in_top_3,
        oil_in_top_3,
        salt_in_top_3
    ]


def build_feature_matrix(df):
    feature_names = [
        'energy_kcal',
        'sugars_100g',
        'saturated_fat_100g',
        'sodium_100g',
        'fiber_100g',
        'proteins_100g',
        'additives_count',
        'has_palm_oil',
        'has_refined_flour',
        'has_art_color',
        'has_art_sweetener',
        'sugar_in_top_3',
        'oil_in_top_3',
        'salt_in_top_3'
    ]

    rows = []
    for _, row in df.iterrows():
        base_features = [
            float(row.get('energy_kcal', 0) or 0),
            float(row.get('sugars_100g', 0) or 0),
            float(row.get('saturated_fat_100g', 0) or 0),
            float(row.get('sodium_100g', 0) or 0),
            float(row.get('fiber_100g', 0) or 0),
            float(row.get('proteins_100g', 0) or 0),
            float(row.get('additives_count', 0) or 0)
        ]
        ing_features = extract_ingredient_flags(row.get('ingredients_text', ''))
        rows.append(base_features + ing_features)

    return np.array(rows, dtype=float), feature_names


# =============================================================================
# RULE-BASED NUTRI-SCORE FORMULA BASELINE
# =============================================================================
def compute_rule_based_nutriscore(row):
    """
    Standard FSC / Rayner Nutri-Score scoring algorithm:
    Points N (negative): energy, sugars, sat_fat, sodium
    Points P (positive): fiber, proteins
    Final score = N - P -> maps to grade A, B, C, D, E
    """
    energy_kj = float(row.get('energy_kcal', 0) or 0) * 4.184
    sugars = float(row.get('sugars_100g', 0) or 0)
    sat_fat = float(row.get('saturated_fat_100g', 0) or 0)
    sodium_mg = float(row.get('sodium_100g', 0) or 0)
    fiber = float(row.get('fiber_100g', 0) or 0)
    protein = float(row.get('proteins_100g', 0) or 0)

    # Negative points (0 to 10 each)
    p_energy = min(10, int(energy_kj // 335))
    p_sugars = min(10, int(sugars // 4.5))
    p_satfat = min(10, int(sat_fat // 1.0))
    p_sodium = min(10, int(sodium_mg // 90))
    n_points = p_energy + p_sugars + p_satfat + p_sodium

    # Positive points (0 to 5 each)
    p_fiber = min(5, int(fiber // 0.9))
    p_protein = min(5, int(protein // 1.6))
    p_points = p_fiber + p_protein

    score = n_points - p_points

    if score <= -1:
        return 'A'
    elif score <= 2:
        return 'B'
    elif score <= 10:
        return 'C'
    elif score <= 18:
        return 'D'
    else:
        return 'E'


def within_one_grade_accuracy(y_true, y_pred):
    close_count = 0
    for true_g, pred_g in zip(y_true, y_pred):
        diff = abs(GRADE_TO_INT[true_g] - GRADE_TO_INT[pred_g])
        if diff <= 1:
            close_count += 1
    return close_count / len(y_true)


# =============================================================================
# MAIN TRAINING PIPELINE
# =============================================================================
def main():
    print("=" * 65)
    print(" TRAINING FOOD HEALTH & NUTRI-SCORE MODEL (RandomForest)")
    print("=" * 65)

    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Dataset not found at {DATA_PATH}. Run prepare_data.py first.")

    df = pd.read_csv(DATA_PATH)
    print(f"Loaded {len(df)} food items from {DATA_PATH}")
    print(f"Nutri-Score Grade counts:\n{df['nutriscore_grade'].value_counts()[GRADE_ORDER]}\n")

    X, feature_names = build_feature_matrix(df)
    y = df['nutriscore_grade'].values

    # 80/20 train/test split
    indices = np.arange(len(df))
    X_train, X_test, y_train, y_test, idx_train, idx_test = train_test_split(
        X, y, indices, test_size=0.20, random_state=42, stratify=y
    )

    print(f"Train samples: {len(X_train)} | Test samples: {len(X_test)}")
    print(f"Features ({len(feature_names)}): {feature_names}\n")

    # Train Random Forest Classifier
    rf = RandomForestClassifier(
        n_estimators=100,
        max_depth=12,
        min_samples_split=4,
        random_state=42,
        n_jobs=-1
    )
    rf.fit(X_train, y_train)

    # Predict with ML Model
    y_pred_ml = rf.predict(X_test)
    ml_acc = accuracy_score(y_test, y_pred_ml)
    ml_within_1 = within_one_grade_accuracy(y_test, y_pred_ml)

    # Predict with Rule-Based Formula on identical test split
    test_df = df.iloc[idx_test]
    y_pred_rules = [compute_rule_based_nutriscore(row) for _, row in test_df.iterrows()]
    rule_acc = accuracy_score(y_test, y_pred_rules)
    rule_within_1 = within_one_grade_accuracy(y_test, y_pred_rules)

    print("=" * 65)
    print(" HEAD-TO-HEAD COMPARISON ON HELD-OUT TEST SPLIT")
    print("=" * 65)
    print(f"{'Method':<30} | {'Exact Acc':<12} | {'Within-1-Grade Acc':<18}")
    print("-" * 65)
    print(f"{'ML Random Forest Model':<30} | {ml_acc*100:>9.2f}% | {ml_within_1*100:>15.2f}%")
    print(f"{'Plain Rule-Based Nutri-Score':<30} | {rule_acc*100:>9.2f}% | {rule_within_1*100:>15.2f}%")
    print("-" * 65)
    
    better = "ML Random Forest" if ml_acc >= rule_acc else "Rule-based formula"
    print(f"Winner on held-out data: {better} (outperforms by {abs(ml_acc - rule_acc)*100:.2f}%)")
    print("=" * 65)

    print("\nML Model Classification Report:")
    report = classification_report(y_test, y_pred_ml, labels=GRADE_ORDER, digits=4)
    print(report)

    cm = confusion_matrix(y_test, y_pred_ml, labels=GRADE_ORDER)
    print("Confusion Matrix [A, B, C, D, E]:")
    print(cm)

    # Feature importances
    importances = rf.feature_importances_
    sorted_idx = np.argsort(importances)[::-1]
    print("\nTop Contributing Features:")
    feat_lines = []
    for rank, i in enumerate(sorted_idx, 1):
        line = f"  {rank:2d}. {feature_names[i]:<22}: {importances[i]*100:.2f}%"
        print(line)
        feat_lines.append(line)

    # Save artifact
    model_payload = {
        'model': rf,
        'feature_names': feature_names,
        'classes': list(rf.classes_),
        'grade_order': GRADE_ORDER,
        'feature_importances': dict(zip(feature_names, [float(x) for x in importances]))
    }
    joblib.dump(model_payload, MODEL_OUTPUT_PATH)
    print(f"\nModel saved to: {MODEL_OUTPUT_PATH}")

    # Save detailed evaluation report
    report_text = f"""Food Health & Nutri-Score Model Evaluation Report
=============================================================
Date: {pd.Timestamp.now()}
Model: Random Forest Classifier (n_estimators=100, max_depth=12)
Classes: A, B, C, D, E

Dataset Summary:
Total food items: {len(df)}
Held-out test set size: {len(X_test)}

Comparison vs Baseline Formula on Test Split:
- ML Random Forest Exact Accuracy: {ml_acc*100:.2f}%
- ML Within-1-Grade Accuracy:       {ml_within_1*100:.2f}%
- Rule-based Baseline Accuracy:     {rule_acc*100:.2f}%
- Rule Within-1-Grade Accuracy:     {rule_within_1*100:.2f}%

Classification Report:
{report}

Confusion Matrix [A, B, C, D, E]:
{cm}

Feature Importances:
""" + "\n".join(feat_lines) + "\n=============================================================\n"

    with open(REPORT_OUTPUT_PATH, 'w', encoding='utf-8') as f:
        f.write(report_text)
    print(f"Report saved to: {REPORT_OUTPUT_PATH}")


if __name__ == '__main__':
    main()
