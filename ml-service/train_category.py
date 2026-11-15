#!/usr/bin/env python3
"""
train_category.py
Trains the Product Category Classifier (food / cosmetic / other)
Pipeline: OCR Noise Augmentation -> Word + Char TF-IDF -> Calibrated Logistic Regression
Evaluates on test split, prints full metrics, saves model and report.
"""

import os
import random
import re
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import joblib

random.seed(42)
np.random.seed(42)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, 'data', 'processed', 'category_dataset.csv')
MODELS_DIR = os.path.join(BASE_DIR, 'models')
os.makedirs(MODELS_DIR, exist_ok=True)

MODEL_OUTPUT_PATH = os.path.join(MODELS_DIR, 'category_model.joblib')
REPORT_OUTPUT_PATH = os.path.join(MODELS_DIR, 'category_report.txt')

# =============================================================================
# OCR NOISE SIMULATION
# =============================================================================
OCR_TYPO_MAP = {
    'o': '0', '0': 'o', 'l': '1', '1': 'l', 'i': '1', 's': '5', '5': 's',
    'b': '8', '8': 'b', 'e': 'c', 'c': 'e', 'm': 'rn'
}

def inject_ocr_noise(text, noise_rate=0.08):
    """
    Simulates real-world OCR imperfections:
    - Random character substitutions (0 for O, 1 for l, rn for m)
    - Random dropping of spaces or punctuation
    - Random letter casing mix
    """
    if not isinstance(text, str):
        return ""
    
    chars = list(text)
    noisy_chars = []
    i = 0
    while i < len(chars):
        c = chars[i]
        r = random.random()
        
        # 1. Dropped space
        if c == ' ' and r < (noise_rate * 0.8):
            i += 1
            continue
            
        # 2. OCR visual confusion swap
        if r < noise_rate:
            c_lower = c.lower()
            if c_lower in OCR_TYPO_MAP and random.random() < 0.6:
                noisy_chars.append(OCR_TYPO_MAP[c_lower])
            elif random.random() < 0.3:
                # Random case flip
                noisy_chars.append(c.swapcase())
            else:
                noisy_chars.append(c)
        else:
            noisy_chars.append(c)
        i += 1
        
    return "".join(noisy_chars)


def main():
    print("=" * 65)
    print(" TRAINING PRODUCT CATEGORY CLASSIFIER (Food / Cosmetic / Other)")
    print("=" * 65)

    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Dataset not found at {DATA_PATH}. Run prepare_data.py first.")

    df = pd.read_csv(DATA_PATH)
    print(f"Loaded {len(df)} samples from {DATA_PATH}")
    print(f"Class distribution:\n{df['category'].value_counts()}\n")

    # Split into train and test
    X = df['text'].values
    y = df['category'].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    print(f"Train set: {len(X_train)} samples | Test set: {len(X_test)} samples")
    print("Augmenting training set with realistic OCR visual noise...")

    # Data Augmentation: add 1 noisy copy of each training sample
    augmented_X_train = []
    augmented_y_train = []
    for text, label in zip(X_train, y_train):
        augmented_X_train.append(text)
        augmented_y_train.append(label)
        
        # Noisy counterpart
        augmented_X_train.append(inject_ocr_noise(text, noise_rate=0.07))
        augmented_y_train.append(label)

    print(f"Augmented Train set size: {len(augmented_X_train)} samples")

    # Build FeatureUnion of Word (1-2) grams and Char (3-5) grams
    word_vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),
        analyzer='word',
        max_features=25000,
        sublinear_tf=True
    )
    
    char_vectorizer = TfidfVectorizer(
        ngram_range=(3, 5),
        analyzer='char',
        max_features=25000,
        sublinear_tf=True
    )

    union = FeatureUnion([
        ('word_tfidf', word_vectorizer),
        ('char_tfidf', char_vectorizer)
    ])

    classifier = LogisticRegression(
        C=2.0,
        max_iter=1000,
        class_weight='balanced',
        solver='lbfgs',
        random_state=42
    )

    pipeline = Pipeline([
        ('features', union),
        ('clf', classifier)
    ])

    print("Fitting model...")
    pipeline.fit(augmented_X_train, augmented_y_train)

    # Evaluate on clean + noisy test sets
    y_pred = pipeline.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred, digits=4)
    cm = confusion_matrix(y_test, y_pred, labels=['food', 'cosmetic', 'other'])

    # Test with noisy test set too
    X_test_noisy = [inject_ocr_noise(t, noise_rate=0.10) for t in X_test]
    y_pred_noisy = pipeline.predict(X_test_noisy)
    noisy_accuracy = accuracy_score(y_test, y_pred_noisy)

    print("\n" + "=" * 65)
    print(" EVALUATION RESULTS (Clean Test Split)")
    print("=" * 65)
    print(f"Clean Test Accuracy: {accuracy * 100:.2f}%\n")
    print("Classification Report:")
    print(report)
    print("Confusion Matrix (rows: true, cols: predicted [food, cosmetic, other]):")
    print(cm)
    print("-" * 65)
    print(f"Robustness Test on Noisy OCR Test Set (10% noise): {noisy_accuracy * 100:.2f}%")
    print("=" * 65)

    # Save trained pipeline
    joblib.dump(pipeline, MODEL_OUTPUT_PATH)
    print(f"\nModel successfully saved to: {MODEL_OUTPUT_PATH}")

    # Save detailed evaluation report
    report_text = f"""Product Category Classifier Evaluation Report
=============================================================
Date: {pd.Timestamp.now()}
Model: Word (1-2) + Char (3-5) TF-IDF + Calibrated Logistic Regression
Classes: food, cosmetic, other

Dataset Summary:
Total samples: {len(df)}
Train samples (augmented): {len(augmented_X_train)}
Held-out Test samples: {len(X_test)}

Evaluation Metrics on Clean Test Split:
Accuracy: {accuracy:.4f} ({accuracy*100:.2f}%)
Noisy OCR Test Accuracy (10% noise injection): {noisy_accuracy:.4f} ({noisy_accuracy*100:.2f}%)

Classification Report:
{report}

Confusion Matrix [food, cosmetic, other]:
{cm}
=============================================================
"""
    with open(REPORT_OUTPUT_PATH, 'w', encoding='utf-8') as f:
        f.write(report_text)
    print(f"Report saved to: {REPORT_OUTPUT_PATH}")


if __name__ == '__main__':
    main()
