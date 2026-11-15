#!/usr/bin/env python3
"""
app.py
FastAPI microservice for Packaged Product Compliance Scanner (SIH26034)
Exposes:
  - GET  /health              (service status, loaded models)
  - POST /classify            (category classifier: food / cosmetic / other)
  - POST /rate-food           (Nutri-Score model A-E + contributing features)
  - POST /match-ingredients   (fuzzy NER-lite ingredient matcher with rapidfuzz)
Runs locally on http://localhost:8001
"""

import os
import re
import json
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import joblib
import numpy as np
from rapidfuzz import fuzz, process

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, 'models')
DATA_DIR = os.path.join(BASE_DIR, 'data')
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, '..'))

CATEGORY_MODEL_PATH = os.path.join(MODELS_DIR, 'category_model.joblib')
NUTRISCORE_MODEL_PATH = os.path.join(MODELS_DIR, 'nutriscore_model.joblib')
INGREDIENT_DB_PATH = os.path.join(PROJECT_ROOT, 'data', 'ingredientDB.json')

app = FastAPI(
    title="Packaged Product Compliance ML Service",
    description="Local ML & fuzzy ingredient inference service for Legal Metrology & Health Screening (SIH26034)",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory model cache
category_model = None
nutriscore_payload = None
ingredient_db: List[Dict[str, Any]] = []
ingredient_lookup_index: Dict[str, Dict[str, Any]] = {}

def load_resources():
    global category_model, nutriscore_payload, ingredient_db, ingredient_lookup_index
    
    # 1. Load Category Model
    if os.path.exists(CATEGORY_MODEL_PATH):
        try:
            category_model = joblib.load(CATEGORY_MODEL_PATH)
            print(f"[ML Service] Loaded category model from {CATEGORY_MODEL_PATH}")
        except Exception as e:
            print(f"[ML Service] Failed loading category model: {e}")
    else:
        print(f"[ML Service] Warning: {CATEGORY_MODEL_PATH} not found.")

    # 2. Load Nutri-Score Model
    if os.path.exists(NUTRISCORE_MODEL_PATH):
        try:
            nutriscore_payload = joblib.load(NUTRISCORE_MODEL_PATH)
            print(f"[ML Service] Loaded Nutri-Score model from {NUTRISCORE_MODEL_PATH}")
        except Exception as e:
            print(f"[ML Service] Failed loading Nutri-Score model: {e}")
    else:
        print(f"[ML Service] Warning: {NUTRISCORE_MODEL_PATH} not found.")

    # 3. Load Ingredient DB
    db_path = INGREDIENT_DB_PATH
    if not os.path.exists(db_path):
        db_path = os.path.join(PROJECT_ROOT, 'backend', 'data', 'ingredientDB.json')

    if os.path.exists(db_path):
        try:
            with open(db_path, 'r', encoding='utf-8') as f:
                ingredient_db = json.load(f)
            
            ingredient_lookup_index = {}
            for item in ingredient_db:
                # Map canonical name
                canon = item['name'].lower()
                ingredient_lookup_index[canon] = item
                
                # Map aliases
                for alias in item.get('aliases', []):
                    ingredient_lookup_index[alias.lower()] = item
                
                # Map INS / E number
                ins = item.get('ins_or_e_number')
                if ins:
                    ingredient_lookup_index[ins.lower()] = item
                    num_match = re.search(r'\d+', ins)
                    if num_match:
                        ingredient_lookup_index[f"ins {num_match.group(0)}"] = item
                        ingredient_lookup_index[f"e{num_match.group(0)}"] = item
                        ingredient_lookup_index[f"e {num_match.group(0)}"] = item

            print(f"[ML Service] Loaded ingredient DB: {len(ingredient_db)} entries, {len(ingredient_lookup_index)} lookup keys.")
        except Exception as e:
            print(f"[ML Service] Failed loading ingredient DB: {e}")
    else:
        print(f"[ML Service] Warning: Ingredient DB not found at {db_path}")

load_resources()


# =============================================================================
# PYDANTIC SCHEMAS
# =============================================================================
class ClassifyRequest(BaseModel):
    text: str = Field(..., description="OCR extracted text or label content")

class ClassifyResponse(BaseModel):
    category: str
    confidence: float
    probabilities: Dict[str, float]
    engine: str = "ml"

class NutrientsInput(BaseModel):
    energy_kcal: Optional[float] = 0.0
    sugars_100g: Optional[float] = 0.0
    saturated_fat_100g: Optional[float] = 0.0
    sodium_100g: Optional[float] = 0.0
    fiber_100g: Optional[float] = 0.0
    proteins_100g: Optional[float] = 0.0
    additives_count: Optional[int] = 0

class RateFoodRequest(BaseModel):
    nutrients: Optional[NutrientsInput] = None
    ingredients_text: Optional[str] = ""

class TopFeature(BaseModel):
    feature: str
    importance: float

class RateFoodResponse(BaseModel):
    grade: str
    probability: float
    score_out_of_5: int
    top_features: List[TopFeature]
    engine: str = "ml"

class MatchIngredientsRequest(BaseModel):
    text: str
    domain: Optional[str] = "both"  # "food" | "cosmetic" | "both"

class MatchedIngredient(BaseModel):
    name: str
    raw_token: str
    position: int
    concern: str
    type: str
    reason: str
    source_note: str
    domain: str
    likely_high_quantity: bool
    ins_or_e_number: Optional[str] = None
    match_score: float

class MatchIngredientsResponse(BaseModel):
    matched_ingredients: List[MatchedIngredient]
    total_parsed_tokens: int
    flagged_count: int
    overall_concern: str


# =============================================================================
# HELPER FUNCTIONS: INGREDIENT PARSER
# =============================================================================
def parse_ingredient_tokens(text: str) -> List[str]:
    """
    Splits text into individual ingredient phrases by commas, semicolons, or bullets,
    respecting parentheses so 'Vegetable Oil (Palm Oil, Sesame Oil)' remains coherent.
    """
    if not text:
        return []
    
    # Clean OCR headers like "INGREDIENTS:", "CONTENTS:"
    cleaned = re.sub(r'^(?:ingredients?|contains?|composition|contents?)[.:\s-]*', '', text, flags=re.IGNORECASE).strip()
    
    # Regex split on comma or semicolon not inside parentheses
    tokens = [t.strip() for t in re.split(r'[,;•\n](?![^(]*\))', cleaned) if t.strip()]
    
    # Flatten parenthetical lists as well so child ingredients are extracted
    expanded = []
    for token in tokens:
        expanded.append(token)
        # If token has parentheses e.g. "Edible Oil (Palmolein, Rice Bran)"
        sub_match = re.search(r'\(([^)]+)\)', token)
        if sub_match:
            sub_tokens = [st.strip() for st in sub_match.group(1).split(',') if st.strip()]
            for st in sub_tokens:
                expanded.append(st)
                
    # Deduplicate while preserving order
    seen = set()
    unique_tokens = []
    for t in expanded:
        t_clean = re.sub(r'^[0-9]+[.)]\s*', '', t).strip()
        t_clean = re.sub(r'\s+', ' ', t_clean)
        if len(t_clean) > 2 and t_clean.lower() not in seen:
            seen.add(t_clean.lower())
            unique_tokens.append(t_clean)
            
    return unique_tokens


def match_token_to_db(token: str, domain: str = "both") -> Optional[tuple]:
    """
    Fuzzy matches a single token against ingredientDB.json canonical names and aliases.
    Threshold: 85 via rapidfuzz token_sort_ratio.
    """
    token_lower = token.lower().strip()
    if not token_lower or len(token_lower) < 3:
        return None
    
    # Exact lookup first
    if token_lower in ingredient_lookup_index:
        item = ingredient_lookup_index[token_lower]
        if domain == "both" or item.get('domain') in (domain, 'both'):
            return item, 100.0
            
    # Fuzzy match across all known lookup keys
    candidates = list(ingredient_lookup_index.keys())
    best = process.extractOne(
        token_lower,
        candidates,
        scorer=fuzz.token_sort_ratio,
        score_cutoff=82.0
    )
    
    if best:
        match_key, score, _ = best
        item = ingredient_lookup_index[match_key]
        if domain == "both" or item.get('domain') in (domain, 'both'):
            return item, score
            
    return None


# =============================================================================
# API ENDPOINTS
# =============================================================================
@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "Packaged Product Compliance ML Service",
        "category_model_loaded": category_model is not None,
        "nutriscore_model_loaded": nutriscore_payload is not None,
        "ingredient_db_count": len(ingredient_db)
    }


@app.get("/models/reports")
def get_model_reports():
    """Returns the evaluation reports for dashboard display"""
    cat_rep = ""
    nutri_rep = ""
    cat_path = os.path.join(MODELS_DIR, 'category_report.txt')
    nutri_path = os.path.join(MODELS_DIR, 'nutriscore_report.txt')
    if os.path.exists(cat_path):
        with open(cat_path, 'r', encoding='utf-8') as f:
            cat_rep = f.read()
    if os.path.exists(nutri_path):
        with open(nutri_path, 'r', encoding='utf-8') as f:
            nutri_rep = f.read()
    return {
        "category_report": cat_rep,
        "nutriscore_report": nutri_rep
    }


@app.post("/classify", response_model=ClassifyResponse)
def classify_product(req: ClassifyRequest):
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Text field cannot be empty")
        
    if category_model is None:
        raise HTTPException(status_code=503, detail="Category model is not loaded")

    probs = category_model.predict_proba([req.text])[0]
    classes = category_model.classes_
    prob_dict = {cls_name: round(float(p), 4) for cls_name, p in zip(classes, probs)}
    
    predicted_idx = int(np.argmax(probs))
    category = classes[predicted_idx]
    confidence = float(probs[predicted_idx])
    
    return ClassifyResponse(
        category=category,
        confidence=round(confidence, 4),
        probabilities=prob_dict,
        engine="ml"
    )


@app.post("/rate-food", response_model=RateFoodResponse)
def rate_food(req: RateFoodRequest):
    if nutriscore_payload is None:
        raise HTTPException(status_code=503, detail="Nutri-Score model is not loaded")

    rf = nutriscore_payload['model']
    feature_names = nutriscore_payload['feature_names']
    feature_importances = nutriscore_payload['feature_importances']

    n = req.nutrients or NutrientsInput()
    ing_text = req.ingredients_text or ""
    ing_lower = ing_text.lower()

    # Calculate ingredient heuristics
    has_palm_oil = 1.0 if re.search(r'\b(palm\s*oil|palmolein|palm\s*fat)\b', ing_lower) else 0.0
    has_refined_flour = 1.0 if re.search(r'\b(refined\s*wheat\s*flour|maida|white\s*flour)\b', ing_lower) else 0.0
    has_art_color = 1.0 if re.search(r'\b(tartrazine|sunset\s*yellow|carmoisine|allura\s*red|brilliant\s*blue|ins\s*102|ins\s*110|ins\s*122)\b', ing_lower) else 0.0
    has_art_sweetener = 1.0 if re.search(r'\b(aspartame|acesulfame|sucralose|ins\s*951|ins\s*950|ins\s*955)\b', ing_lower) else 0.0

    tokens = parse_ingredient_tokens(ing_text)
    top_3 = " ".join(tokens[:3]).lower()
    sugar_in_top_3 = 1.0 if re.search(r'\b(sugar|sucrose|glucose|fructose|syrup)\b', top_3) else 0.0
    oil_in_top_3 = 1.0 if re.search(r'\b(oil|fat|butter|ghee|palmolein)\b', top_3) else 0.0
    salt_in_top_3 = 1.0 if re.search(r'\b(salt|sodium)\b', top_3) else 0.0

    features = [
        float(n.energy_kcal or 0),
        float(n.sugars_100g or 0),
        float(n.saturated_fat_100g or 0),
        float(n.sodium_100g or 0),
        float(n.fiber_100g or 0),
        float(n.proteins_100g or 0),
        float(n.additives_count or 0),
        has_palm_oil,
        has_refined_flour,
        has_art_color,
        has_art_sweetener,
        sugar_in_top_3,
        oil_in_top_3,
        salt_in_top_3
    ]

    features_arr = np.array([features], dtype=float)
    probs = rf.predict_proba(features_arr)[0]
    classes = rf.classes_
    predicted_idx = int(np.argmax(probs))
    grade = str(classes[predicted_idx])
    probability = float(probs[predicted_idx])

    # Convert grade to 1-5 score
    grade_map = {'A': 5, 'B': 4, 'C': 3, 'D': 2, 'E': 1}
    score_out_of_5 = grade_map.get(grade, 3)

    # Top contributing features
    sorted_importances = sorted(feature_importances.items(), key=lambda x: x[1], reverse=True)[:5]
    top_feats = [TopFeature(feature=k, importance=round(v * 100, 2)) for k, v in sorted_importances]

    return RateFoodResponse(
        grade=grade,
        probability=round(probability, 4),
        score_out_of_5=score_out_of_5,
        top_features=top_feats,
        engine="ml"
    )


@app.post("/match-ingredients", response_model=MatchIngredientsResponse)
def match_ingredients(req: MatchIngredientsRequest):
    tokens = parse_ingredient_tokens(req.text)
    matched_results: List[MatchedIngredient] = []
    seen_names = set()

    for idx, token in enumerate(tokens, 1):
        res = match_token_to_db(token, domain=req.domain or "both")
        if res:
            item, score = res
            if item['name'] not in seen_names:
                seen_names.add(item['name'])
                matched_results.append(MatchedIngredient(
                    name=item['name'],
                    raw_token=token,
                    position=idx,
                    concern=item.get('concern', 'low'),
                    type=item.get('type', 'ingredient'),
                    reason=item.get('reason', ''),
                    source_note=item.get('source_note', ''),
                    domain=item.get('domain', 'both'),
                    likely_high_quantity=(idx <= 3),
                    ins_or_e_number=item.get('ins_or_e_number'),
                    match_score=round(float(score), 1)
                ))

    # Overall concern level logic
    high_count = sum(1 for m in matched_results if m.concern == 'high')
    mod_count = sum(1 for m in matched_results if m.concern == 'moderate')
    
    if high_count > 0:
        overall_concern = "high"
    elif mod_count >= 2:
        overall_concern = "moderate"
    else:
        overall_concern = "low"

    return MatchIngredientsResponse(
        matched_ingredients=matched_results,
        total_parsed_tokens=len(tokens),
        flagged_count=len(matched_results),
        overall_concern=overall_concern
    )


if __name__ == '__main__':
    import uvicorn
    print("Starting ML Microservice on http://localhost:8001...")
    uvicorn.run(app, host="0.0.0.0", port=8001)
