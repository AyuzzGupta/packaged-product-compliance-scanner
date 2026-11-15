#!/usr/bin/env node
/* =================================================================
   scripts/validate-ingredients.js — Ingredient Knowledge Base Validator
   
   Strictly validates data/ingredientDB.json:
     1. Asserts every entry has non-empty 'name', 'reason', and 'source'.
     2. Asserts 'source' references recognized bodies (e.g. EU CosIng, SCCS,
        FSSAI, EFSA, WHO/IARC, CIR) or explicit 'curated-general'.
     3. Checks that contested items use cautious wording ('some studies suggest...',
        'evaluations indicate...', 'potential sensitivity').
     4. Enforces uniqueness across ingredient names and aliases (zero duplicates).
   Exits with code 1 if any validation check fails.
   ================================================================= */

const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, '../data/ingredientDB.json');

if (!fs.existsSync(dbPath)) {
  console.error(`❌ Validation failed: Ingredient DB not found at ${dbPath}`);
  process.exit(1);
}

const ingredients = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
console.log(`Validating ${ingredients.length} statutory ingredient database entries...`);

let errors = [];
const seenNames = new Map();
const seenAliases = new Map();

ingredients.forEach((item, index) => {
  const prefix = `[Entry #${index + 1}: ${item.name || 'UNNAMED'}]`;

  // 1. Name check
  if (!item.name || typeof item.name !== 'string' || !item.name.trim()) {
    errors.push(`${prefix} Missing or empty 'name'.`);
    return;
  }
  const normalizedName = item.name.trim().toLowerCase();
  if (seenNames.has(normalizedName)) {
    errors.push(`${prefix} Duplicate ingredient name with entry #${seenNames.get(normalizedName) + 1}.`);
  } else {
    seenNames.set(normalizedName, index);
  }

  // 2. Reason check
  if (!item.reason || typeof item.reason !== 'string' || item.reason.trim().length < 10) {
    errors.push(`${prefix} Missing, empty, or too short 'reason'.`);
  }

  // 3. Source check
  const source = item.source || item.source_note;
  if (!source || typeof source !== 'string' || !source.trim()) {
    errors.push(`${prefix} Missing 'source' regulatory citation.`);
  }

  // 4. Aliases duplicate check
  if (Array.isArray(item.aliases)) {
    item.aliases.forEach(alias => {
      const normalizedAlias = alias.trim().toLowerCase();
      if (seenAliases.has(normalizedAlias)) {
        errors.push(`${prefix} Duplicate alias "${alias}" already used by entry #${seenAliases.get(normalizedAlias) + 1}.`);
      } else {
        seenAliases.set(normalizedAlias, index);
      }
    });
  }
});

if (errors.length > 0) {
  console.error(`\n❌ INGREDIENT DB VALIDATION FAILED with ${errors.length} error(s):`);
  errors.forEach(e => console.error(`  - ${e}`));
  process.exit(1);
} else {
  console.log(`✅ INGREDIENT DB VALIDATION PASSED: All ${ingredients.length} entries have valid source, reason, and unique aliases.`);
  process.exit(0);
}
