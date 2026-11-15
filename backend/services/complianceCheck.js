/* =================================================================
   Compliance Check — Legal Metrology field extraction
   
   Uses regex pattern matching on OCR text to detect the 5 required
   fields under the Legal Metrology (Packaged Commodities) Rules, 2011:
     1. Net Quantity
     2. MRP (Maximum Retail Price)
     3. Manufacturer / Packer Details
     4. Consumer Care Details
     5. Manufacturing Date / Best Before
   ================================================================= */


/**
 * Definition of each compliance field with its regex patterns.
 * Patterns are tried in order; the first match wins.
 */
const FIELDS = [
  {
    id: 'net_quantity',
    label: 'Net Quantity',
    description: 'e.g. "500 g", "1 L", "250ml", "Net Wt"',
    patterns: [
      /net\s*(?:wt|weight|qty|quantity|content)[.:\s]*(\d[\d.,]*\s*(?:kg|g|gm|gms|mg|l|lt|ltr|litre|liter|ml|kl|cm|mm|m|units?|u|pcs|pieces?|n|nos|numbers?|pairs?|sets?)\b)/i,
      /(\d[\d.,]*\s*(?:kg|g|gm|gms|mg|l|lt|ltr|litre|liter|ml|kl|units?|u|pcs|pieces?|pairs?|sets?)\b)/i,
      /(?:net|quantity|weight|wt)[.:\s]+\d/i,
      /\b\d+\s*(?:units?|pcs|pieces?|pairs?|sets?)\b/i
    ]
  },
  {
    id: 'mrp',
    label: 'MRP (Maximum Retail Price)',
    description: 'e.g. "MRP ₹185", "Rs. 45", "M.R.P"',
    patterns: [
      /(?:m\.?\s*r\.?\s*p\.?|mrp)[.:\s₹zZ2]*[₹rszZ.\s]*(\d[\d.,]+)/i,
      /₹\s*(\d[\d.,]+)/i,
      /(?:rs\.?|rupees?)[.\s]*(\d[\d.,]+)/i,
      /(?:price|cost)[.:\s₹rszZ]*(\d[\d.,]+)/i,
      /\b(?:mrp|m\.r\.p)\b/i
    ]
  },
  {
    id: 'manufacturer',
    label: 'Manufacturer / Packer Details',
    description: 'e.g. "Mfg by", "Manufactured by", "Packed by", "Marketed by"',
    patterns: [
      /(?:mfg\.?\s*(?:by|d)?|manufactured\s*by|packed\s*by|marketed\s*by|packer|manufacturer)[.:\s]*(.{5,})/i,
      /(?:mfg|manufactured|packed|marketed|packer|maker|producer)[\s.:]+/i
    ]
  },
  {
    id: 'consumer_care',
    label: 'Consumer Care Details',
    description: 'e.g. "Consumer Care", "Customer Care", phone, email',
    patterns: [
      /(?:consumer\s*care|customer\s*care|helpline|toll\s*free|grievance|consum\w*[\s.:]*(?:care|ga|ge)?)[.:\s]*(.{5,})/i,
      /(?:1800|1860|1300)[\s-]*\d{3,}[\s-:]*\d{3,}/i,
      /[\w.-]+@[\w.-]+\.\w{2,}/i,
      /[\w.-]+\.(?:com|in|co\.in|org)\b/i,
      /(?:care|support|help|contact|consumer|customer|consum\w*)[\s.:@]+/i
    ]
  },
  {
    id: 'dates',
    label: 'Manufacturing Date / Best Before',
    description: 'e.g. "Mfg Date", "Best Before", "Exp", date patterns',
    patterns: [
      /(?:month\s*(?:&|and)?\s*year\s*of\s*(?:import|mfg|manufacture|packing)|date\s*of\s*(?:mfg|manufacture|manufacturing|packing|pkg|import))[.:\s]*(.{4,})/i,
      /(?:mfg\.?\s*d(?:ate|t)?|manufacturing\s*date|date\s*of\s*(?:mfg|manufacture|manufacturing|packing|pkg))[.:\s]*(.{4,})/i,
      /(?:best\s*before|use\s*by|expiry|exp\.?\s*(?:date|dt)?|bb)[.:\s]*(.{4,})/i,
      /(?:0[1-9]|1[0-2])[\/\-]\d{2,4}/,
      /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s.,\-]*\d{2,4}/i,
      /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/
    ]
  }
];


/**
 * Runs compliance checking on OCR text.
 * @param   {string} ocrText — Raw text extracted from the label image.
 * @returns {Object} { score, fields: [...], summary }
 */
function runComplianceCheck(ocrText) {
  const fields = [];

  for (const field of FIELDS) {
    let passed      = false;
    let matchedText = '';

    for (const pattern of field.patterns) {
      const m = ocrText.match(pattern);
      if (m) {
        passed = true;
        matchedText = (m[1] || m[0]).trim().substring(0, 120);
        break;
      }
    }

    fields.push({
      id:          field.id,
      label:       field.label,
      description: field.description,
      passed,
      matchedText
    });
  }

  const passedCount = fields.filter(f => f.passed).length;
  const total       = fields.length;
  const score       = Math.round((passedCount / total) * 100);

  // NOTE: This rule list verifies the physical presence of statutory declarations as required
  // under Rule 6 of the Legal Metrology (Packaged Commodities) Rules, 2011. Before commercial
  // deployment, the specific regex pattern definitions, font height rules, and principal display
  // panel area constraints must be formally verified against the latest official Rule 6 Gazette text.
  const verdict = score === 100
    ? 'All 5 core declarations detected'
    : `${passedCount} of ${total} declarations detected`;

  // Human-readable summary stating clearly this is a presence check
  let summary;
  if (score === 100) {
    summary = 'All 5 core declarations detected. Presence check only. Preliminary screening, not official certification.';
  } else {
    const missing = total - passedCount;
    summary = `${passedCount} of ${total} declarations detected (${missing} missing or unverified). Presence check only. Preliminary screening, not official certification.`;
  }

  return { score, fields, summary, verdict };
}


module.exports = { runComplianceCheck };
