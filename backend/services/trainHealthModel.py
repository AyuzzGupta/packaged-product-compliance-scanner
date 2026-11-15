"""
Open Food Facts Model Trainer
Extracts labeled product data from openfoodfacts-mongodbdump,
trains a TF-IDF + Multinomial Naive Bayes model for Nutri-Score prediction (A, B, C, D, E),
and exports the model parameters and nutrient benchmarks to backend/data/healthModel.json.
"""

import os
import sys
import struct
import json
import re
import math
from collections import defaultdict, Counter

DUMP_PATH = os.path.join(os.path.dirname(__file__), '../../openfoodfacts-mongodbdump')
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), '../data/healthModel.json')
MAX_RECORDS = 40000

def clean_text(text):
    if not text:
        return ''
    text = re.sub(r'[^a-zA-Z0-9\s]', ' ', text.lower())
    return ' '.join(text.split())

def extract_field_str(buf, field_name):
    pattern = b'\x02' + field_name + b'\x00'
    idx = buf.find(pattern)
    if idx == -1: return None
    start_pos = idx + len(pattern)
    if start_pos + 4 > len(buf): return None
    length = struct.unpack('<I', buf[start_pos:start_pos+4])[0]
    if length <= 1 or length > 400: return None
    return buf[start_pos+4:start_pos+4+length-1].decode('utf-8', errors='ignore')

def extract_field_double(buf, field_name):
    pattern = b'\x01' + field_name + b'\x00'
    idx = buf.find(pattern)
    if idx == -1: return None
    start_pos = idx + len(pattern)
    if start_pos + 8 > len(buf): return None
    return struct.unpack('<d', buf[start_pos:start_pos+8])[0]

def main():
    if not os.path.exists(DUMP_PATH):
        print(f"Error: Dump file {DUMP_PATH} not found.")
        sys.exit(1)

    print(f"Reading {DUMP_PATH} and extracting up to {MAX_RECORDS} labeled products...")
    records = []
    
    # Store nutrient statistics per grade
    grade_nutrients = defaultdict(lambda: {'sugar': [], 'fat': [], 'sodium': [], 'kcal': []})

    with open(DUMP_PATH, 'rb') as f:
        chunk_size = 60 * 1024 * 1024
        buffer = b''
        while len(records) < MAX_RECORDS:
            data = f.read(chunk_size)
            if not data:
                break
            buffer += data
            pos = 0
            buf_len = len(buffer)
            while pos < buf_len - 4 and len(records) < MAX_RECORDS:
                doc_len = struct.unpack('<I', buffer[pos:pos+4])[0]
                if 300 < doc_len < 120000:
                    if pos + doc_len > buf_len:
                        break
                    if buffer[pos+doc_len-1] == 0:
                        sub = buffer[pos:pos+doc_len]
                        pidx = sub.find(b'\x02product_name\x00')
                        gidx = sub.find(b'\x02nutriscore_grade\x00')
                        if pidx != -1 and gidx != -1:
                            plen = struct.unpack('<I', sub[pidx+14:pidx+18])[0]
                            glen = struct.unpack('<I', sub[gidx+18:gidx+22])[0]
                            if 2 < plen < 300 and glen == 2:
                                pname = sub[pidx+18:pidx+18+plen-1].decode('utf-8', errors='ignore')
                                grade = sub[gidx+22:gidx+23].decode('utf-8', errors='ignore').lower()
                                if grade in ('a', 'b', 'c', 'd', 'e'):
                                    cidx = sub.find(b'\x02categories\x00')
                                    cats = ''
                                    if cidx != -1:
                                        clen = struct.unpack('<I', sub[cidx+12:cidx+16])[0]
                                        if 1 < clen < 300:
                                            cats = sub[cidx+16:cidx+16+clen-1].decode('utf-8', errors='ignore')
                                    
                                    sugars = extract_field_double(sub, b'sugars_100g')
                                    fat = extract_field_double(sub, b'saturated-fat_100g')
                                    sodium = extract_field_double(sub, b'sodium_100g')
                                    kcal = extract_field_double(sub, b'energy-kcal_100g')

                                    if sugars is not None and 0 <= sugars <= 100:
                                        grade_nutrients[grade]['sugar'].append(sugars)
                                    if fat is not None and 0 <= fat <= 100:
                                        grade_nutrients[grade]['fat'].append(fat)
                                    if sodium is not None and 0 <= sodium <= 50:
                                        grade_nutrients[grade]['sodium'].append(sodium * 1000) # to mg
                                    if kcal is not None and 0 <= kcal <= 1000:
                                        grade_nutrients[grade]['kcal'].append(kcal)

                                    cleaned = clean_text(pname + ' ' + cats)
                                    if len(cleaned) > 2:
                                        records.append((cleaned, grade))
                        pos += doc_len
                        continue
                pos += 1
            buffer = buffer[pos:]

    print(f"Extracted {len(records)} products with valid Nutri-Score grades.")
    grade_counts = Counter(r[1] for r in records)
    print("Grade distribution:", dict(grade_counts))

    # Build Vocabulary and Document Frequencies for TF-IDF
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.naive_bayes import MultinomialNB

    X_texts = [r[0] for r in records]
    y_labels = [r[1] for r in records]

    # Use top 3000 informative unigrams and bigrams
    vectorizer = TfidfVectorizer(max_features=3000, min_df=3, max_df=0.6, ngram_range=(1, 2))
    X_tfidf = vectorizer.fit_transform(X_texts)

    # Train Multinomial Naive Bayes model
    clf = MultinomialNB(alpha=0.2)
    clf.fit(X_tfidf, y_labels)

    classes = list(clf.classes_) # ['a', 'b', 'c', 'd', 'e']
    vocab = {str(k): int(v) for k, v in vectorizer.vocabulary_.items()} # word -> index
    idf = [float(x) for x in vectorizer.idf_]
    class_log_prior = [float(x) for x in clf.class_log_prior_]
    feature_log_prob = [[float(val) for val in row] for row in clf.feature_log_prob_]

    # Calculate average nutrients per grade
    nutrient_benchmarks = {}
    grade_score_map = {'a': 92, 'b': 75, 'c': 55, 'd': 36, 'e': 18}

    for g in ['a', 'b', 'c', 'd', 'e']:
        sugar_list = grade_nutrients[g]['sugar']
        fat_list = grade_nutrients[g]['fat']
        sodium_list = grade_nutrients[g]['sodium']
        kcal_list = grade_nutrients[g]['kcal']

        nutrient_benchmarks[g] = {
            'avgHealthScore': grade_score_map[g],
            'avgSugar': round(sum(sugar_list) / len(sugar_list), 1) if sugar_list else (2.0 if g == 'a' else 25.0),
            'avgSatFat': round(sum(fat_list) / len(fat_list), 1) if fat_list else (0.8 if g == 'a' else 8.0),
            'avgSodium': round(sum(sodium_list) / len(sodium_list), 1) if sodium_list else (80.0 if g == 'a' else 750.0),
            'avgKcal': round(sum(kcal_list) / len(kcal_list), 0) if kcal_list else (150.0 if g == 'a' else 420.0)
        }

    # High-accuracy direct keyword mappings for common Indian staples
    staples_map = {
        'rice': {'grade': 'a', 'score': 94, 'badge': 'Healthy', 'reason': 'Unprocessed whole grain — zero sodium, virtually zero sugar and saturated fat.'},
        'basmati': {'grade': 'a', 'score': 95, 'badge': 'Healthy', 'reason': 'Premium natural cereal grain — naturally low in fat and sodium.'},
        'wheat': {'grade': 'a', 'score': 90, 'badge': 'Healthy', 'reason': 'Wholesome cereal grain rich in dietary fiber and essential minerals.'},
        'atta': {'grade': 'a', 'score': 92, 'badge': 'Healthy', 'reason': 'Whole wheat flour — high complex carbohydrates and low fat.'},
        'dal': {'grade': 'a', 'score': 93, 'badge': 'Healthy', 'reason': 'Legume / pulse rich in plant protein and dietary fiber.'},
        'pulses': {'grade': 'a', 'score': 93, 'badge': 'Healthy', 'reason': 'Plant protein source with zero cholesterol and minimal saturated fat.'},
        'oats': {'grade': 'a', 'score': 91, 'badge': 'Healthy', 'reason': 'Whole grain with high beta-glucan soluble fiber.'},
        'milk': {'grade': 'b', 'score': 78, 'badge': 'Healthy', 'reason': 'Nutritious dairy beverage with natural lactose and calcium.'},
        'curd': {'grade': 'a', 'score': 88, 'badge': 'Healthy', 'reason': 'Probiotic fermented dairy — good protein and calcium.'},
        'yogurt': {'grade': 'b', 'score': 76, 'badge': 'Moderate', 'reason': 'Fermented dairy product; check for added sweetening.'},
        'tea': {'grade': 'a', 'score': 95, 'badge': 'Healthy', 'reason': 'Zero calorie natural herbal infusion / brew.'},
        'green tea': {'grade': 'a', 'score': 98, 'badge': 'Healthy', 'reason': 'Rich in catechins and polyphenols with near zero calories.'},
        'coffee': {'grade': 'a', 'score': 90, 'badge': 'Healthy', 'reason': 'Unsweetened brewed coffee with zero fat and sugar.'},
        'juice': {'grade': 'b', 'score': 72, 'badge': 'Moderate', 'reason': 'Fruit beverage — contains natural and added sugars; consume in moderation.'},
        'bread': {'grade': 'b', 'score': 70, 'badge': 'Moderate', 'reason': 'Bakery product — moderate sodium and carbohydrates.'},
        'brown bread': {'grade': 'a', 'score': 84, 'badge': 'Healthy', 'reason': 'Whole grain bread enriched with dietary fiber.'},
        'multigrain bread': {'grade': 'a', 'score': 86, 'badge': 'Healthy', 'reason': 'Multi-seed whole grain bread with good fiber and low saturated fat.'},
        'noodles': {'grade': 'd', 'score': 38, 'badge': 'Unhealthy', 'reason': 'Instant noodles typically high in sodium (>800mg) and refined fats.'},
        'maggi': {'grade': 'd', 'score': 36, 'badge': 'Unhealthy', 'reason': 'Refined flour cake with high sodium tastemaker mix — limit consumption.'},
        'chips': {'grade': 'e', 'score': 20, 'badge': 'Unhealthy', 'reason': 'Deep fried potato / corn snack — high in saturated fat and sodium.'},
        'biscuit': {'grade': 'd', 'score': 35, 'badge': 'Unhealthy', 'reason': 'Processed baked confectionery — high refined sugar and vegetable fat.'},
        'cookies': {'grade': 'e', 'score': 22, 'badge': 'Unhealthy', 'reason': 'High in added sugar (>25g) and saturated bakery fats.'},
        'chocolate': {'grade': 'e', 'score': 18, 'badge': 'Unhealthy', 'reason': 'High calorie confectionery with substantial saturated fat and sugars.'}
    }

    model_payload = {
        'meta': {
            'trainedOn': 'Open Food Facts MongoDB Archive',
            'sampleCount': len(records),
            'classes': classes,
            'vocabSize': len(vocab),
            'generatedAt': '2026-09-21'
        },
        'vocab': vocab,
        'idf': idf,
        'classes': classes,
        'class_log_prior': class_log_prior,
        'feature_log_prob': feature_log_prob,
        'benchmarks': nutrient_benchmarks,
        'staples': staples_map
    }

    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(model_payload, f)

    file_size_kb = os.path.getsize(OUTPUT_PATH) // 1024
    print(f"Successfully saved Open Food Facts AI model to {OUTPUT_PATH} ({file_size_kb} KB)")

if __name__ == '__main__':
    main()
