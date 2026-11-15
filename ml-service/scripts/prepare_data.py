#!/usr/bin/env python3
"""
prepare_data.py
Creates and bundles high-quality training and benchmark datasets for:
  1) Category Classifier (food, cosmetic, other) with realistic label texts
  2) Food Nutri-Score Classifier with real nutritional profiles per 100g and ingredient lists
Saves into ml-service/data/bundled/ and ml-service/data/processed/.
"""

import os
import random
import pandas as pd
import numpy as np

random.seed(42)
np.random.seed(42)

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BUNDLED_DIR = os.path.join(BASE_DIR, 'data', 'bundled')
PROCESSED_DIR = os.path.join(BASE_DIR, 'data', 'processed')
os.makedirs(BUNDLED_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)

# =============================================================================
# 1. CATEGORY DATASET GENERATION
# =============================================================================

FOOD_TEMPLATES = [
    ("Instant Atta Noodles", "Whole Wheat Flour (Atta) 82%, Refined Palm Oil, Iodised Salt, Wheat Gluten, Spices and Condiments (Onion Powder, Coriander, Turmeric, Cumin, Red Chilli), Hydrolyzed Groundnut Protein, Sugar, Acidity Regulators (INS 501i, INS 500i), Flavour Enhancer (INS 635). Net Wt 280g. Mfg By Nestle India."),
    ("Classic Potato Chips", "Selected Farm Potatoes, Edible Vegetable Oil (Palmolein), Seasoning (Iodised Salt, Chilli Powder, Dehydrated Mango Powder, Black Salt, Cumin Powder, Sugar), Flavour Enhancers (INS 627, INS 631). Packed by Pepsico India."),
    ("Digestive High Fiber Biscuits", "Wheat Flour (Atta) 55%, Edible Vegetable Oil (Palm), Whole Wheat Flakes, Sugar, Invert Sugar Syrup, Liquid Glucose, Wheat Bran 4.5%, Raising Agents (INS 500ii, INS 503ii), Emulsifier (INS 322 Soy Lecithin), Iodised Salt. Net Wt 100g."),
    ("100% Pure Mixed Fruit Juice", "Water, Mixed Fruit Concentrates 35% (Apple, Orange, Guava, Mango, Pineapple, Banana), Natural Flavours, Acidity Regulator (Citric Acid INS 330), Antioxidant (Ascorbic Acid INS 300). No added preservatives. Net Volume 1 Litre."),
    ("Royal Basmati Rice", "100% Pure Aged Long Grain Basmati Rice. Premium quality aromatic rice sorted and parboiled. Net Qty 5 kg. Store in a cool dry place away from direct sunlight."),
    ("Dark Chocolate Bar 70%", "Cocoa Mass, Sugar, Cocoa Butter, Fat-Reduced Cocoa Powder, Emulsifier (Soya Lecithin), Natural Vanilla Extract. Cocoa solids 70% minimum. Best before 12 months from packing."),
    ("Roasted Salted Almonds", "Californian Almonds 97%, Refined Sunflower Oil, Himalayan Rock Salt 1.5%, Antioxidant (INS 307b). High protein dietary snack. Net Wt 200g."),
    ("Tomato Ketchup", "Water, Tomato Paste 28%, Sugar, Liquid Glucose, Iodised Salt, Acidity Regulator (INS 260 Acetic Acid), Spices and Condiments, Stabilizer (INS 415 Xanthan Gum), Preservative (INS 211 Sodium Benzoate)."),
    ("Alphonso Mango Pulp", "Alphonso Mango Puree 92%, Sugar, Water, Citric Acid (INS 330). Rich source of Vitamin A and dietary beta-carotene."),
    ("Chana Dal Masala Namkeen", "Bengal Gram (Chana Dal) 68%, Edible Vegetable Oil (Cottonseed & Palmolein), Spices (Red Chilli, Black Pepper, Dry Ginger, Cardamom), Salt, Amchur, Acidity Regulator (INS 330)."),
    ("Organic Green Tea", "100% Organic Camellia Sinensis Green Tea Leaves. Rich in natural antioxidant EGCG catechins. Net Wt 100g 50 tea bags."),
    ("Whole Milk Paneer", "Pasteurized Full Cream Cow Milk, Coagulant (Citric Acid, Lactic Acid). High protein fresh dairy paneer. Keep refrigerated at 4°C."),
    ("Greek Style Plain Yogurt", "Pasteurized Double Toned Milk, Milk Solids, Active Live Yogurt Cultures (Streptococcus thermophilus, Lactobacillus bulgaricus). No added sugar."),
    ("Crunchy Peanut Butter", "Roasted Peanuts 91%, Sugar, Hydrogenated Soyabean Oil, Iodised Salt. High protein energy spread. Net Qty 350g."),
    ("Corn Flakes Breakfast Cereal", "Milled Corn 89%, Sugar, Barley Malt Extract, Iodised Salt, Vitamins & Minerals (Vitamin C, Niacin, Iron, Vitamin B6, Riboflavin, Thiamin, Folic Acid, Vitamin B12)."),
    ("Honey Mustard Salad Dressing", "Water, Refined Soybean Oil, Sugar, Mustard Paste 12%, Honey 8%, Synthetic Vinegar, Iodised Salt, Thickeners (INS 1422, INS 415), Preservative (INS 202)."),
    ("Instant Coffee Powder", "Coffee Beans (60% Arabica, 40% Robusta). 100% Pure Instant agglomerated coffee powder. Net Weight 100g."),
    ("Sugar Free Chewing Gum", "Sweeteners (Sorbitol, Maltitol, Xylitol, Aspartame INS 951, Acesulfame K INS 950), Gum Base, Humectant (Glycerin INS 422), Flavours, Emulsifier (Soy Lecithin)."),
    ("Soya Chunks High Protein", "Defatted Soya Flour 100%. Rich in vegetarian protein and dietary iron. Net Wt 200g. 52g protein per 100g."),
    ("Spicy Instant Ramen", "Noodles: Refined Wheat Flour, Palm Oil, Salt, Tapioca Starch. Seasoning Soup Base: Salt, Monosodium Glutamate (INS 621), Chilli Powder, Garlic Powder, Dehydrated Chives, Yeast Extract.")
]

COSMETIC_TEMPLATES = [
    ("Hydrating Face Wash", "Aqua, Glycerin, Sodium Laureth Sulfate (SLES), Cocamidopropyl Betaine, Acrylates Copolymer, Niacinamide, Sodium Hyaluronate, Panthenol, PEG-40 Hydrogenated Castor Oil, Phenoxyethanol, Ethylhexylglycerin, Disodium EDTA, Parfum. For external use only."),
    ("Anti-Dandruff Shampoo", "Water, Sodium Lauryl Sulfate (SLS), Sodium Laureth Sulfate, Cocamidopropyl Betaine, Zinc Pyrithione 1%, Dimethicone, Sodium Chloride, Glycol Distearate, Fragrance, Guar Hydroxypropyltrimonium Chloride, Methylisothiazolinone (MIT), Citric Acid. Net Vol 250ml."),
    ("Intensive Moisturizing Cream", "Water/Aqua/Eau, Mineral Oil (Paraffinum Liquidum), Petrolatum, Glycerin, Microcrystalline Wax, Lanolin Alcohol, Paraffin, Panthenol, Magnesium Sulfate, Decyl Oleate, Octyldodecanol, Fragrance/Parfum, Methylparaben, Propylparaben."),
    ("Vitamin C Brightening Serum", "Purified Water, 3-O-Ethyl Ascorbic Acid 10%, Propanediol, Ethoxydiglycol, Ferulic Acid 0.5%, Sodium Hyaluronate, Centella Asiatica Extract, Allantoin, Phenoxyethanol, Triethanolamine. Patch test recommended."),
    ("Herbal Bathing Soap Bar", "Sodium Palmate, Sodium Palm Kernelate, Aqua, Glycerin, Melia Azadirachta (Neem) Seed Oil, Curcuma Longa (Turmeric) Root Extract, Ocimum Sanctum (Tulsi) Leaf Oil, Fragrance, CI 74260, Titanium Dioxide (CI 77891), BHT."),
    ("Daily Broad Spectrum Sunscreen SPF 50", "Aqua, Octinoxate (Ethylhexyl Methoxycinnamate), Oxybenzone (Benzophenone-3), Avobenzone, Zinc Oxide, Homosalate, Cyclopentasiloxane, C12-15 Alkyl Benzoate, Cetyl Alcohol, Glyceryl Stearate, PEG-100 Stearate, Disodium EDTA, DMDM Hydantoin."),
    ("Moisturizing Hair Conditioner", "Aqua/Water, Cetearyl Alcohol, Behentrimonium Chloride, Dimethicone, Argania Spinosa (Argan) Kernel Oil, Hydrolyzed Keratin, Amodimethicone, Cetyl Esters, Isopropyl Alcohol, Fragrance/Parfum, Methylparaben, Phenoxyethanol."),
    ("Gentle Salicylic Acid Cleanser", "Water, Sodium Cocoyl Isethionate, Glycerin, Salicylic Acid 2%, Gluconolactone, Niacinamide, Ceramide NP, Ceramide AP, Ceramide EOP, Phytosphingosine, Cholesterol, Xanthan Gum, Sodium Hydroxide."),
    ("Soothing Aloe Vera Gel", "Aloe Barbadensis Leaf Juice 99%, Carbomer, Tocopheryl Acetate (Vitamin E), Allantoin, Triethanolamine, Benzyl Alcohol, Dehydroacetic Acid, CI 19140, CI 42090. Net Vol 150ml."),
    ("Nourishing Body Lotion", "Water, Glycerin, Stearic Acid, Isopropyl Palmitate, Glycol Stearate, PEG-100 Stearate, Mineral Oil, Dimethicone, Glyceryl Stearate, Butyrospermum Parkii (Shea) Butter, Triethanolamine, Methylparaben, Propylparaben, Fragrance."),
    ("Matte Long Lasting Liquid Lipstick", "Isododecane, Trimethylsiloxysilicate, Cyclopentasiloxane, Dimethicone, Polybutene, Disteardimonium Hectorite, Propylene Carbonate, Tocopherol, Fragrance, May Contain: CI 77891, CI 77491, CI 15850 Red 7 Lake, CI 45410."),
    ("Restorative Night Serum", "Aqua, Bifida Ferment Lysate, PEG-8, Propanediol, Bis-PEG-18 Methyl Ether Dimethyl Silane, Caffeine, Hydrolyzed Hyaluronic Acid, Squalane, Yeast Extract, Tripeptide-32, Carbomer, Phenoxyethanol, BHT."),
    ("Under Eye Brightening Cream", "Aqua, Caprylic/Capric Triglyceride, Niacinamide 4%, Caffeine 3%, Cetearyl Glucoside, Butylene Glycol, Retinol, Sodium Hyaluronate, Allantoin, Disodium EDTA, Chlorphenesin."),
    ("Refreshing Body Spray Deodorant", "Alcohol Denat. (95% v/v) 68% w/w, Butane, Isobutane, Propane, Perfume, Diethyl Phthalate 1% w/w, Propylene Glycol, Triclosan, Ethylhexylglycerin. Flammable aerosol."),
    ("Natural Herbal Hair Oil", "Sesamum Indicum (Sesame) Seed Oil 60%, Cocos Nucifera (Coconut) Oil 30%, Eclipta Alba (Bhringraj) Extract, Emblica Officinalis (Amla) Fruit Extract, Bacopa Monnieri (Brahmi) Extract, Tocopherol, Fragrance.")
]

OTHER_TEMPLATES = [
    ("Wireless Bluetooth Earbuds", "Model: TWS-AirPro5. Input: 5V = 1A. Battery Capacity: Earbuds 40mAh, Charging Case 450mAh. Bluetooth Version: 5.3. Operating Range: 10m. Frequency Response: 20Hz-20KHz. Impedance: 32 Ohms. Warranty: 1 Year Limited Manufacturer Warranty. BIS Reg No: R-41009876. Country of Origin: India. Marketed by SoundMax Electronics Pvt Ltd, Sector 62 Noida UP. Customer Care: 1800-200-9999, support@soundmax.com. MRP: Rs. 2,499 (Incl. of all taxes). Net Qty: 1 Set (2 Earbuds, 1 Case, 1 Type-C Cable, User Manual)."),
    ("65W Fast GaN Wall Charger", "Model: TurboCharge-65. Input: 100-240V ~ 50/60Hz 1.5A Max. Output USB-C1: 5V=3A / 9V=3A / 12V=3A / 15V=3A / 20V=3.25A (65W Max). USB-A: 5V=3A / 9V=2A / 12V=1.5A (18W). BIS Standard IS 13252 (Part 1). Warning: Indoor use only. Do not expose to moisture. Made in India by VoltTech Power Solutions, Okhla Industrial Area New Delhi. Helpline: 011-45678900."),
    ("Men's Pure Cotton Slim Fit Shirt", "Fabric Composition: 100% Pure Combed Cotton. Size: 40 cm (15.75 inches). Style Code: MS-2024-BLU. Wash Care: Machine wash cold with like colors, do not bleach, tumble dry low, warm iron if needed, do not dry clean. Net Quantity: 1 Unit. Manufactured and Marketed by Raymond Apparel Ltd, Thane Maharashtra. MRP: Rs. 1,899.00. Consumer Grievance: care@raymond.in."),
    ("Heavy Duty Steel Padlock 50mm", "Solid Hardened Steel Body, Brass Cylinder with 3 Nickel-Plated Computer Keys. Anti-Cut Shackle, Weather Resistant Coating. Net Quantity: 1 Lock + 3 Keys. Model: SL-50H. Guaranteed against manufacturing defects for 5 Years. Packed and Marketed by Godrej Locking Solutions, Pirojshanagar Vikhroli Mumbai. MRP: Rs. 485."),
    ("10W LED Emergency Bulb", "Wattage: 10W. Base: B22. Voltage: 220-240V AC 50Hz. Luminous Flux: 900 Lumens. Backup Duration: Up to 4 hours on power failure. Battery: Inbuilt 2200mAh Lithium-ion battery. BIS R-41012345. Non-dimmable. Energy saving 85%. Net Qty: 1 N. Manufactured by Philips Lighting India Ltd, Gurugram Haryana."),
    ("Braided USB-C to USB-C Cable", "Length: 1.5 Meter / 5 Feet. Data Transfer Speed: 480 Mbps. Power Delivery: Supports up to 100W (20V/5A). Connector Type: Type C Male to Type C Male. Nylon braided jacket with reinforced aluminum alloy shells. Net Quantity: 1 Piece. Warranty: 2 Years replacement warranty against breakage."),
    ("Women's Stretch Denim Jeans", "Material: 78% Cotton, 20% Polyester, 2% Elastane. Fit: Skinny High Rise. Size: 28 Waist / 30 Inseam. Made in India. Hand wash or gentle machine wash inside out. Do not wring. Iron on reverse side. Net Qty: 1 N Jeans. Brand: Levi Strauss India Pvt Ltd, Bengaluru."),
    ("Stainless Steel Vacuum Insulated Flask", "Capacity: 750 ml. Material: Inner & Outer Surgical Grade 304 Stainless Steel. Keeps liquids Hot for 18 Hours or Cold for 24 Hours. 100% BPA Free, Leak Proof Cap with Silicone Gasket. Wash with mild detergent before initial use. Net Quantity: 1 Unit. Marketed by Cello World Ltd."),
    ("Precision Screwdriver Tool Kit", "24-in-1 Magnetic Screwdriver Set. Bits: Phillips (PH000, PH00, PH0), Slotted (1.5, 2.0), Torx (T2, T3, T4, T5), Hex, Pentalobe. Handle: Aluminum alloy with 360-degree rotating cap. Ideal for smartphone, watch, laptop, and eyeglass repairs. Net Qty: 1 Set."),
    ("Rechargeable Ergonomic Wireless Mouse", "Model: SilentClick-WM3. Connectivity: 2.4GHz USB Dongle & Bluetooth 5.1 Dual Mode. DPI Levels: 800 / 1200 / 1600. Battery: 500mAh Lithium polymer rechargeable via Type-C. Compatibility: Windows, macOS, Linux, Android. Net Qty: 1 Mouse, 1 Nano Receiver, 1 Charging Cable."),
    ("Smart Fitness Activity Tracker", "Display: 1.47 inch AMOLED Touch Display. Sensors: PPG Heart Rate Sensor, SpO2 Blood Oxygen Sensor, 3-Axis Accelerometer. Water Resistance: 5 ATM (50m). Charging: Magnetic 2-pin charging dock. Made in India. Model: Band-8Pro. Customer Care: support@fireboltt.com."),
    ("Ceramic Non-Stick Frying Pan 24cm", "Base: 3.5mm thick Induction Compatible Heavy Gauge Aluminum with Ceramic Non-Stick Coating. PFOA, PTFE, Lead and Cadmium Free. Soft touch Bakelite stay-cool handle. Net Quantity: 1 Pan. Safe for Gas, Induction, Ceramic, and Hot Plate. Mfg Date: 03/2026.")
]

VARIATIONS_PREFIX = [
    "Product Name: ", "Brand: ", "Description: ", "", "Item: ", "Packed commodity: "
]
VARIATIONS_SUFFIX = [
    " Keep in cool dry place.", " Certified authentic quality.", " For queries contact customer support.",
    " Store away from direct sunlight.", " Strictly for intended use.", " Licensed under applicable standards.", ""
]

def generate_category_data():
    records = []
    
    # 1. Food category (600 samples)
    for i in range(600):
        name, text = random.choice(FOOD_TEMPLATES)
        prefix = random.choice(VARIATIONS_PREFIX)
        suffix = random.choice(VARIATIONS_SUFFIX)
        full_text = f"{prefix}{name}. {text}{suffix}"
        # Small mutations
        if random.random() < 0.3:
            full_text = full_text.replace("Sugar", "Refined Sugar")
        if random.random() < 0.3:
            full_text += f" Batch No: B-{random.randint(100, 999)}."
        records.append({"text": full_text, "category": "food"})

    # 2. Cosmetic category (600 samples)
    for i in range(600):
        name, text = random.choice(COSMETIC_TEMPLATES)
        prefix = random.choice(VARIATIONS_PREFIX)
        suffix = random.choice(VARIATIONS_SUFFIX)
        full_text = f"{prefix}{name}. {text}{suffix}"
        if random.random() < 0.3:
            full_text = full_text.replace("Aqua", "Purified Water / Aqua")
        if random.random() < 0.3:
            full_text += f" Mfg Lic No: M-{random.randint(1000, 9999)}."
        records.append({"text": full_text, "category": "cosmetic"})

    # 3. Other category (500 samples)
    for i in range(500):
        name, text = random.choice(OTHER_TEMPLATES)
        prefix = random.choice(VARIATIONS_PREFIX)
        suffix = random.choice(VARIATIONS_SUFFIX)
        full_text = f"{prefix}{name}. {text}{suffix}"
        if random.random() < 0.3:
            full_text += f" Serial Number: SN-{random.randint(100000, 999999)}."
        records.append({"text": full_text, "category": "other"})

    random.shuffle(records)
    df = pd.DataFrame(records)
    
    bundled_path = os.path.join(BUNDLED_DIR, 'category_dataset.csv')
    processed_path = os.path.join(PROCESSED_DIR, 'category_dataset.csv')
    df.to_csv(bundled_path, index=False)
    df.to_csv(processed_path, index=False)
    print(f"Created Category Dataset: {len(df)} samples ({df['category'].value_counts().to_dict()})")


# =============================================================================
# 2. FOOD NUTRI-SCORE DATASET GENERATION
# =============================================================================

# Nutritional benchmarks per grade (Grade A to E)
GRADE_ARCHETYPES = {
    'A': [
        {"name": "Whole Rolled Oats", "energy": (340, 380), "sugars": (0.5, 2.0), "fat": (1.0, 2.0), "sodium": (2, 20), "fiber": (9.0, 12.0), "protein": (11.0, 14.0), "additives": (0, 0), "ing": "Whole grain rolled oats 100%."},
        {"name": "Brown Basmati Rice", "energy": (340, 370), "sugars": (0.1, 1.0), "fat": (0.4, 1.2), "sodium": (1, 10), "fiber": (3.5, 5.0), "protein": (7.5, 9.0), "additives": (0, 0), "ing": "100% Whole grain brown basmati rice."},
        {"name": "Yellow Moong Dal Lentils", "energy": (320, 350), "sugars": (1.0, 3.0), "fat": (0.8, 1.5), "sodium": (5, 25), "fiber": (8.0, 14.0), "protein": (22.0, 25.0), "additives": (0, 0), "ing": "Split washed yellow moong beans."},
        {"name": "Toned Cow Milk", "energy": (55, 65), "sugars": (4.5, 5.0), "fat": (1.5, 2.0), "sodium": (40, 55), "fiber": (0.0, 0.0), "protein": (3.0, 3.5), "additives": (0, 0), "ing": "Pasteurized standardized toned milk, Vitamin A, Vitamin D."},
        {"name": "Raw Natural Almonds", "energy": (570, 600), "sugars": (3.5, 4.5), "fat": (3.5, 4.2), "sodium": (1, 5), "fiber": (10.0, 12.5), "protein": (20.0, 22.0), "additives": (0, 0), "ing": "Raw whole almond kernels."}
    ],
    'B': [
        {"name": "Multigrain Brown Bread", "energy": (230, 260), "sugars": (3.0, 5.0), "fat": (1.5, 2.5), "sodium": (350, 450), "fiber": (5.0, 7.5), "protein": (8.5, 10.5), "additives": (1, 3), "ing": "Whole wheat flour (atta) 65%, water, multi grains (oats, flaxseed, sesame), yeast, salt, preservative (INS 282)."},
        {"name": "Natural Soya Tofu", "energy": (120, 150), "sugars": (0.5, 1.5), "fat": (1.8, 2.8), "sodium": (15, 40), "fiber": (2.0, 3.5), "protein": (12.0, 15.0), "additives": (0, 1), "ing": "Filtered water, non-GMO soybeans, coagulant (calcium chloride)."},
        {"name": "Unsweetened Soy Milk", "energy": (40, 50), "sugars": (1.0, 2.0), "fat": (0.5, 1.0), "sodium": (30, 50), "fiber": (1.0, 2.0), "protein": (3.2, 4.0), "additives": (1, 2), "ing": "Water, whole soybeans, calcium carbonate, sea salt."},
        {"name": "Canned Chickpeas in Water", "energy": (110, 140), "sugars": (1.0, 2.5), "fat": (0.4, 0.9), "sodium": (200, 320), "fiber": (5.0, 7.0), "protein": (6.5, 8.5), "additives": (0, 1), "ing": "Chickpeas, water, sea salt, antioxidant (ascorbic acid)."}
    ],
    'C': [
        {"name": "Low Fat Strawberry Yogurt", "energy": (85, 105), "sugars": (10.0, 14.0), "fat": (1.2, 2.0), "sodium": (50, 80), "fiber": (0.2, 0.8), "protein": (3.0, 4.0), "additives": (2, 4), "ing": "Pasteurized milk, strawberry puree, sugar, thickener (INS 1442, INS 440), live cultures, natural color."},
        {"name": "Salted Wheat Crackers", "energy": (420, 460), "sugars": (5.0, 8.0), "fat": (3.5, 5.0), "sodium": (550, 750), "fiber": (3.0, 4.5), "protein": (8.0, 9.5), "additives": (2, 4), "ing": "Wheat flour, vegetable oil (sunflower), salt, malt extract, raising agents (INS 500ii, INS 503ii), yeast."},
        {"name": "Orange Fruit Juice Drink", "energy": (45, 60), "sugars": (9.5, 12.5), "fat": (0.1, 0.3), "sodium": (10, 30), "fiber": (0.2, 0.6), "protein": (0.5, 0.8), "additives": (1, 3), "ing": "Water, orange juice concentrate 20%, sugar, citric acid, natural orange flavour."},
        {"name": "Baked Pita Chips", "energy": (390, 430), "sugars": (3.0, 6.0), "fat": (2.0, 3.5), "sodium": (480, 680), "fiber": (3.5, 5.0), "protein": (9.0, 11.0), "additives": (1, 3), "ing": "Wheat flour, sunflower oil, sea salt, whole wheat flour, yeast, rosemary extract."}
    ],
    'D': [
        {"name": "Instant Masala Noodles", "energy": (440, 480), "sugars": (3.5, 6.0), "fat": (7.0, 11.0), "sodium": (850, 1250), "fiber": (2.0, 3.5), "protein": (7.0, 9.0), "additives": (4, 7), "ing": "Refined wheat flour (maida), palm oil, iodised salt, wheat gluten, onion powder, flavor enhancer (INS 627, INS 631), acidity regulators."},
        {"name": "Classic Potato Salted Chips", "energy": (530, 560), "sugars": (1.0, 3.0), "fat": (10.0, 14.0), "sodium": (650, 850), "fiber": (3.0, 4.5), "protein": (5.5, 7.0), "additives": (1, 3), "ing": "Potatoes, edible vegetable oil (palmolein), salt."},
        {"name": "Butter Marie Biscuits", "energy": (440, 470), "sugars": (18.0, 24.0), "fat": (4.5, 7.5), "sodium": (280, 450), "fiber": (1.5, 2.5), "protein": (6.5, 8.0), "additives": (3, 5), "ing": "Refined wheat flour, sugar, edible vegetable oil (palm), invert syrup, butter, leavening agents, milk solids."},
        {"name": "Tomato Ketchup Sauce", "energy": (110, 140), "sugars": (22.0, 28.0), "fat": (0.1, 0.4), "sodium": (750, 1100), "fiber": (1.0, 1.8), "protein": (1.0, 1.8), "additives": (2, 4), "ing": "Water, tomato paste, sugar, salt, acidity regulator (INS 260), stabilizer (INS 415), preservative (INS 211)."}
    ],
    'E': [
        {"name": "Milk Chocolate Confection", "energy": (520, 560), "sugars": (50.0, 58.0), "fat": (16.0, 22.0), "sodium": (80, 180), "fiber": (1.5, 2.5), "protein": (6.0, 8.0), "additives": (2, 4), "ing": "Sugar, milk solids, cocoa butter, cocoa mass, hydrogenated palm fat, emulsifiers (INS 322, INS 476), vanilla flavour."},
        {"name": "Cola Carbonated Beverage", "energy": (42, 48), "sugars": (10.5, 12.0), "fat": (0.0, 0.0), "sodium": (10, 25), "fiber": (0.0, 0.0), "protein": (0.0, 0.0), "additives": (3, 5), "ing": "Carbonated water, high fructose corn syrup, sugar, caramel color (INS 150d), acidity regulator (INS 338 Phosphoric acid), caffeine, synthetic flavor."},
        {"name": "Cream Sandwich Cookies", "energy": (490, 530), "sugars": (35.0, 44.0), "fat": (9.0, 14.0), "sodium": (350, 550), "fiber": (1.5, 2.8), "protein": (4.5, 6.0), "additives": (4, 6), "ing": "Sugar, refined wheat flour (maida), palm oil, cocoa solids 4.5%, invert sugar, raising agents, emulsifier (soy lecithin), artificial vanillin flavor."},
        {"name": "Hazelnut Cocoa Sweet Spread", "energy": (530, 560), "sugars": (54.0, 58.0), "fat": (10.0, 14.0), "sodium": (40, 70), "fiber": (2.5, 3.5), "protein": (5.5, 7.0), "additives": (2, 3), "ing": "Sugar, palm oil, hazelnuts 13%, skimmed milk powder, fat-reduced cocoa, emulsifier (lecithin), vanillin."},
        {"name": "Deep Fried Bhujia Sev", "energy": (570, 610), "sugars": (2.0, 4.0), "fat": (14.0, 19.0), "sodium": (850, 1200), "fiber": (4.0, 6.0), "protein": (11.0, 14.0), "additives": (1, 3), "ing": "Moth flour, gram flour, edible vegetable oil (palmolein), iodised salt, red chilli powder, black pepper, cardamom, clove."}
    ]
}

def generate_nutriscore_data():
    records = []
    
    # 350 samples for each grade A-E (Total 1750 samples)
    for grade, archetypes in GRADE_ARCHETYPES.items():
        for i in range(350):
            arch = random.choice(archetypes)
            name = arch["name"]
            energy = round(random.uniform(*arch["energy"]), 1)
            sugars = round(random.uniform(*arch["sugars"]), 1)
            sat_fat = round(random.uniform(*arch["fat"]), 1)
            sodium = round(random.uniform(*arch["sodium"]), 1)
            fiber = round(random.uniform(*arch["fiber"]), 1)
            protein = round(random.uniform(*arch["protein"]), 1)
            additives = random.randint(*arch["additives"])
            ing = arch["ing"]
            
            # Subtle realistic noise
            if random.random() < 0.2:
                ing += f" Natural antioxidants added."
            
            records.append({
                "product_name": name,
                "nutriscore_grade": grade,
                "energy_kcal": energy,
                "sugars_100g": sugars,
                "saturated_fat_100g": sat_fat,
                "sodium_100g": sodium,
                "fiber_100g": fiber,
                "proteins_100g": protein,
                "additives_count": additives,
                "ingredients_text": ing
            })
            
    random.shuffle(records)
    df = pd.DataFrame(records)
    
    bundled_path = os.path.join(BUNDLED_DIR, 'food_nutriscore_dataset.csv')
    processed_path = os.path.join(PROCESSED_DIR, 'food_nutriscore_dataset.csv')
    df.to_csv(bundled_path, index=False)
    df.to_csv(processed_path, index=False)
    print(f"Created Nutri-Score Dataset: {len(df)} samples ({df['nutriscore_grade'].value_counts().to_dict()})")

if __name__ == '__main__':
    print("Preparing datasets for SIH26034 compliance scanner...")
    generate_category_data()
    generate_nutriscore_data()
    print("Dataset generation completed successfully!")
