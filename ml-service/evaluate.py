#!/usr/bin/env python3
"""
evaluate.py
Computes real, reproducible evaluation metrics for:
  1) Category Classifier (TF-IDF + Logistic Regression)
  2) Food Nutri-Score Model (Random Forest vs Rule-Based Baseline)
Writes output to ml-service/models/metrics.json.
"""

import os
import json
import re
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import joblib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, 'models')
PROCESSED_DIR = os.path.join(BASE_DIR, 'data', 'processed')

CATEGORY_MODEL_PATH = os.path.join(MODELS_DIR, 'category_model.joblib')
NUTRISCORE_MODEL_PATH = os.path.join(MODELS_DIR, 'nutriscore_model.joblib')
CATEGORY_DATA_PATH = os.path.join(PROCESSED_DIR, 'category_dataset.csv')
NUTRISCORE_DATA_PATH = os.path.join(PROCESSED_DIR, 'food_nutriscore_dataset.csv')
METRICS_JSON_PATH = os.path.join(MODELS_DIR, 'metrics.json')

GRADE_ORDER = ['A', 'B', 'C', 'D', 'E']
GRADE_TO_INT = {g: i for i, g in enumerate(GRADE_ORDER)}


def extract_ingredient_flags(ingredients_text):
    text = str(ingredients_text or '').lower()
    has_palm_oil = 1.0 if re.search(r'\b(palm\s*oil|palmolein|palm\s*fat|fractionated\s*palm)\b', text) else 0.0
    has_refined_flour = 1.0 if re.search(r'\b(refined\s*wheat\s*flour|maida|white\s*flour)\b', text) else 0.0
    has_art_color = 1.0 if re.search(r'\b(tartrazine|sunset\s*yellow|carmoisine|allura\s*red|brilliant\s*blue|ins\s*102|ins\s*110|ins\s*122|ins\s*133|ci\s*\d{5})\b', text) else 0.0
    has_art_sweetener = 1.0 if re.search(r'\b(aspartame|acesulfame|sucralose|saccharin|ins\s*951|ins\s*950|ins\s*955)\b', text) else 0.0

    raw_tokens = [t.strip() for t in re.split(r'[,;•\n](?![^(]*\))', text) if t.strip()]
    top_3_str = " ".join(raw_tokens[:3])
    sugar_in_top_3 = 1.0 if re.search(r'\b(sugar|sucrose|glucose|fructose|invert\s*sugar|corn\s*syrup)\b', top_3_str) else 0.0
    oil_in_top_3 = 1.0 if re.search(r'\b(oil|fat|palmolein|butter|ghee|vanaspati)\b', top_3_str) else 0.0
    salt_in_top_3 = 1.0 if re.search(r'\b(salt|sodium|iodised\s*salt)\b', top_3_str) else 0.0

    return [
        has_palm_oil, has_refined_flour, has_art_color, has_art_sweetener,
        sugar_in_top_3, oil_in_top_3, salt_in_top_3
    ]


def compute_rule_based_nutriscore(row):
    energy_kj = float(row.get('energy_kcal', 0) or 0) * 4.184
    sugars = float(row.get('sugars_100g', 0) or 0)
    sat_fat = float(row.get('saturated_fat_100g', 0) or 0)
    sodium_mg = float(row.get('sodium_100g', 0) or 0)
    fiber = float(row.get('fiber_100g', 0) or 0)
    protein = float(row.get('proteins_100g', 0) or 0)

    p_energy = min(10, int(energy_kj // 335))
    p_sugars = min(10, int(sugars // 4.5))
    p_satfat = min(10, int(sat_fat // 1.0))
    p_sodium = min(10, int(sodium_mg // 90))
    n_points = p_energy + p_sugars + p_satfat + p_sodium

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


def evaluate():
    print("=" * 60)
    print(" EVALUATING REAL MODEL METRICS FOR METRICS.JSON")
    print("=" * 60)

    # ---------------------------------------------------------
    # 1. Category Classifier Evaluation
    # ---------------------------------------------------------
    df_cat = pd.read_csv(CATEGORY_DATA_PATH)
    X_cat = df_cat['text'].values
    y_cat = df_cat['category'].values

    X_train_c, X_test_c, y_train_c, y_test_c = train_test_split(
        X_cat, y_cat, test_size=0.2, random_state=42, stratify=y_cat
    )

    cat_pipeline = joblib.load(CATEGORY_MODEL_PATH)
    y_pred_c = cat_pipeline.predict(X_test_c)

    cat_acc = float(accuracy_score(y_test_c, y_pred_c))
    cat_report_dict = classification_report(y_test_c, y_pred_c, output_dict=True)
    labels = sorted(list(set(y_cat)))
    cm = confusion_matrix(y_test_c, y_pred_c, labels=labels).tolist()

    per_class_metrics = {}
    for label in labels:
        if label in cat_report_dict:
            per_class_metrics[label] = {
                "precision": round(float(cat_report_dict[label]['precision']), 4),
                "recall": round(float(cat_report_dict[label]['recall']), 4),
                "f1_score": round(float(cat_report_dict[label]['f1-score']), 4),
                "support": int(cat_report_dict[label]['support'])
            }

    cat_metrics = {
        "accuracy": round(cat_acc, 4),
        "train_samples": len(X_train_c),
        "test_samples": len(X_test_c),
        "classes": labels,
        "per_class": per_class_metrics,
        "confusion_matrix": {
            "labels": labels,
            "matrix": cm
        },
        "other_class_is_synthetic": True
    }
    print(f"Category Classifier Accuracy: {cat_acc * 100:.2f}% (Test N={len(X_test_c)})")

    # ---------------------------------------------------------
    # 2. Food Nutri-Score Model & Rule Baseline Evaluation
    # ---------------------------------------------------------
    df_nutri = pd.read_csv(NUTRISCORE_DATA_PATH)
    train_idx, test_idx = train_test_split(
        np.arange(len(df_nutri)), test_size=0.2, random_state=42, stratify=df_nutri['nutriscore_grade']
    )
    df_train = df_nutri.iloc[train_idx]
    df_test = df_nutri.iloc[test_idx]

    feature_names = [
        'energy_kcal', 'sugars_100g', 'saturated_fat_100g', 'sodium_100g',
        'fiber_100g', 'proteins_100g', 'additives_count',
        'has_palm_oil', 'has_refined_flour', 'has_art_color', 'has_art_sweetener',
        'sugar_in_top_3', 'oil_in_top_3', 'salt_in_top_3'
    ]

    def build_matrix(df):
        rows = []
        for _, row in df.iterrows():
            base = [
                float(row.get('energy_kcal', 0) or 0),
                float(row.get('sugars_100g', 0) or 0),
                float(row.get('saturated_fat_100g', 0) or 0),
                float(row.get('sodium_100g', 0) or 0),
                float(row.get('fiber_100g', 0) or 0),
                float(row.get('proteins_100g', 0) or 0),
                float(row.get('additives_count', 0) or 0)
            ]
            flags = extract_ingredient_flags(row.get('ingredients_text', ''))
            rows.append(base + flags)
        return np.array(rows, dtype=float)

    X_test_n = build_matrix(df_test)
    y_test_n = df_test['nutriscore_grade'].values

    nutri_payload = joblib.load(NUTRISCORE_MODEL_PATH)
    rf_model = nutri_payload['model']
    y_pred_rf = rf_model.predict(X_test_n)

    # Exact and within-one accuracy for RF
    rf_exact = float(accuracy_score(y_test_n, y_pred_rf))
    y_test_ints = np.array([GRADE_TO_INT[g] for g in y_test_n])
    y_pred_rf_ints = np.array([GRADE_TO_INT[g] for g in y_pred_rf])
    rf_within_one = float(np.mean(np.abs(y_test_ints - y_pred_rf_ints) <= 1))

    # Rule baseline on the exact same test rows
    y_pred_rule = [compute_rule_based_nutriscore(row) for _, row in df_test.iterrows()]
    rule_exact = float(accuracy_score(y_test_n, y_pred_rule))
    y_pred_rule_ints = np.array([GRADE_TO_INT[g] for g in y_pred_rule])
    rule_within_one = float(np.mean(np.abs(y_test_ints - y_pred_rule_ints) <= 1))

    # Feature importances
    feat_importances = {}
    for name, imp in zip(feature_names, rf_model.feature_importances_):
        feat_importances[name] = round(float(imp) * 100, 2)
    sorted_importances = dict(sorted(feat_importances.items(), key=lambda x: x[1], reverse=True))

    food_metrics = {
        "test_samples": len(df_test),
        "random_forest_model": {
            "exact_grade_accuracy": round(rf_exact, 4),
            "within_one_grade_accuracy": round(rf_within_one, 4)
        },
        "rule_based_baseline": {
            "exact_grade_accuracy": round(rule_exact, 4),
            "within_one_grade_accuracy": round(rule_within_one, 4)
        },
        "feature_importances_percentage": sorted_importances
    }

    print(f"Random Forest Nutri-Score: Exact {rf_exact * 100:.2f}%, Within-1 {rf_within_one * 100:.2f}%")
    print(f"Rule Baseline Nutri-Score: Exact {rule_exact * 100:.2f}%, Within-1 {rule_within_one * 100:.2f}%")

    # Combine into metrics.json
    final_output = {
        "status": "evaluated",
        "category_classifier": cat_metrics,
        "food_nutriscore": food_metrics
    }

    with open(METRICS_JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(final_output, f, indent=2)

    print(f"\n✅ Successfully generated real metrics file: {METRICS_JSON_PATH}")


if __name__ == '__main__':
    evaluate()
