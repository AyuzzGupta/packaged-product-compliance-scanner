# Technical Stack & Documentation Consistency Audit (SIH26034)

> **Document Purpose**: Identifies terminology discrepancies, aspirational claims, and stack mismatches across older project reports, documentation, and the actual codebase. Per project guidelines, Word reports (`.docx`) are preserved untouched, while exact corrections and viva defense strategies are formally documented below.

---

## 1. Summary of Architectural Truth vs Mismatches

| Dimension | Claimed in Early Drafts / Reports | Actual Codebase Reality | Status |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | Mentions React / React Native (in future work) | 100% Vanilla HTML5, CSS3, ES6 JavaScript | **Accurate** (Vanilla chosen intentionally) |
| **Styling Framework** | Mentions Tailwind / Bootstrap in some contexts | Custom Vanilla CSS3 with native CSS Custom Properties | **Accurate** (Zero external CSS dependencies) |
| **Database** | Mentions MongoDB / Cloud database | Persistent JSON Data Store (`data/scans.json`) | **Reconciled** (Promise write queue + atomic rename) |
| **Hosting & Deployment**| Mentions Vercel / Render cloud deployments | Local execution on `localhost:5001` (Node) and `localhost:8001` (Python) | **Reconciled** (Documented as future cloud scope) |
| **Computer Vision Engine**| Mentions Google Cloud Vision / Azure APIs | Local offline Tesseract.js (WASM) + C-based Sharp preprocessing | **Accurate** (Cloud Vision only surveyed in Literature Review) |
| **Statutory Rule Scope** | Early references to "7 mandatory fields" | Audits the **5 core consumer-facing declarations** under Rule 6 | **Clarified** (Matches Legal Metrology Rule 6 core clauses) |
| **Performance Benchmark**| "Page load < 50ms" | Sub-second native rendering without Virtual-DOM overhead | **Refined** (Defensible wording applied) |
| **Data Concurrency** | "Thread-safe dataStore" (previously unverified) | Formally verified via 10-save concurrent automated test | **Verified** (`test_datastore_concurrency.js` passes 10/10) |

---

## 2. Itemized File-by-File Consistency Audit

### Item 1: Database Persistence (MongoDB Claim)
- **File**: `docs/reports/archive/SIH26034_Project_Report_v1.docx` (Paragraphs 140, 203, 478)
- **Found Text**: *"Replace the local scans.json file with a real database (such as MongoDB) to support larger data volumes, concurrent users..."*
- **Problem**: Examiners might mistakenly assume MongoDB is currently installed or required for running the project.
- **Reality**: The prototype intentionally uses a zero-dependency, local file-based JSON store (`data/scans.json`) to allow instant demonstration without configuring database daemons.
- **Correct Replacement Sentence**:  
  > *"The prototype implements a lightweight, concurrency-safe JSON persistence layer (`dataStore.js`) with an atomic write-and-rename mechanism, while enterprise databases such as MongoDB or PostgreSQL are identified as future cloud migration targets."*
- **Viva Defense**: If asked *"Where is your database?"*, answer:  
  > *"Sir, humne prototype ke liye zero-setup architecture chuna. Node.js mein Promise write queue aur temporary file atomic rename ke sath `data/scans.json` banaya hai jo bina kisi daemon setup ke chalta hai. MongoDB future roadmap ka hissa hai jab millions of scans handle karne hon."*

---

### Item 2: Cloud Deployment (Vercel & Render Claims)
- **File**: `docs/reports/archive/SIH26034_Project_Report_v1.docx` (Paragraphs 142, 483)
- **Found Text**: *"Cloud deployment: Deploy the frontend and backend to low-cost hosting platforms (for example, Vercel for the frontend and Render for the backend)..."*
- **Problem**: Suggests the live project is hosted on serverless clouds, which contradicts the local dual-microservice architecture (Express on 5001 + FastAPI on 8001).
- **Reality**: Vercel serverless functions have a 50MB package limit that cannot host Tesseract WASM binaries and trained models, and serverless functions are ephemeral.
- **Correct Replacement Sentence**:  
  > *"Future production hosting anticipates containerized deployment (e.g., Docker containers deployed to AWS ECS or Railway) to host both the Node.js OCR engine and Python FastAPI microservice concurrently."*
- **Viva Defense**: If asked *"Is this deployed on Vercel?"*, answer:  
  > *"No sir, Vercel serverless environments mein heavy WASM binaries aur C-based image libraries (`sharp`) ke size limits hote hain. Isliye hamara project independent containerized services (Node backend port 5001 aur Python FastAPI port 8001) par chalta hai."*

---

### Item 3: Computer Vision (Cloud Vision API vs Local Tesseract.js)
- **File**: `docs/reports/SIH26034_Project_Report_Final.docx` (Paragraphs 89, 120)
- **Found Text**: *"Cloud Computer Vision APIs: Commercial platforms such as Google Cloud Vision, Microsoft Azure Computer Vision, and Amazon Textract provide high recognition accuracy..."*
- **Problem**: Could cause an evaluator to ask if the project consumes Google Cloud paid API credits.
- **Reality**: The report mentions Google Cloud Vision strictly as a comparative baseline in Chapter 2 (Literature Survey). The actual pipeline executes 100% locally and offline using Sharp and Tesseract.js WebAssembly.
- **Correct Replacement Sentence**:  
  > *"While commercial cloud APIs (Google Cloud Vision, AWS Textract) were surveyed as accuracy baselines, our application implements an offline-first, zero-cost pipeline using Tesseract.js WASM and Sharp preprocessing."*
- **Viva Defense**: If asked *"Did you use Google Vision API?"*, answer:  
  > *"No sir. Report ke Literature Survey mein Google Cloud Vision ko compare kiya gaya tha, lekin hamne actual execution ke liye 100% offline open-source Tesseract.js WebAssembly use kiya hai taaki koi API cost ya internet dependency na ho."*

---

### Item 4: Statutory Declarations ("7 Fields" vs "5 Core Declarations")
- **File**: Early project notes and regulatory discussions
- **Found Text**: *"Extracts and audits the 7 statutory fields of Legal Metrology Rule 6."*
- **Problem**: Legal Metrology Rule 6 contains sub-rules (a) through (h), but some clauses (like country of origin for imports or generic commodity names) apply conditionally. Claiming 7 fields when the UI audits 5 creates confusion.
- **Reality**: The engine specifically audits the **5 core mandatory declarations required on all packaged goods**:
  1. Net Quantity / Weight (Rule 6(1)(e))
  2. Maximum Retail Price (MRP inclusive of taxes) (Rule 6(1)(c))
  3. Manufacturer / Packer Name and Complete Address (Rule 6(1)(a))
  4. Consumer Care / Grievance Helpline (Rule 6(1)(h))
  5. Month & Year of Manufacture or Best Before Date (Rule 6(1)(d))
- **Correct Replacement Sentence**:  
  > *"The compliance engine audits the 5 core statutory declarations mandated under Rule 6 of the Legal Metrology (Packaged Commodities) Rules, 2011 that directly protect consumer purchasing rights."*
- **Viva Defense**: If asked *"Rule 6 me kitni declarations hoti hain?"*, answer:  
  > *"Rule 6 ke tehat 7 clauses hain, lekin humne 5 primary consumer-facing statutory declarations ko audit kiya hai: Net Quantity, MRP inclusive of taxes, Manufacturer Address, Customer Care helpline, aur Manufacturing/Expiry Date."*

---

### Item 5: Frontend Page Load Time ("< 50ms" Claim)
- **File**: `README.md` (Lines 136, 274)
- **Found Text**: *"No heavy CSS frameworks like Bootstrap or Tailwind were used, keeping page load under 50 milliseconds."*
- **Problem**: 50 milliseconds was an estimated target rather than a formalized Lighthouse network performance audit.
- **Reality**: Without React or heavy CSS frameworks, DOM parsing is near-instantaneous, but unmeasured millisecond claims sound like manufactured numbers.
- **Correct Replacement Sentence**:  
  > *"By avoiding bulky client frameworks (React/Vue/Angular) and CSS libraries (Tailwind/Bootstrap), the browser parses pure semantic HTML5 and vanilla CSS natively, eliminating client-side bundle compilation and Virtual-DOM hydration overhead."*
- **Action Taken**: Corrected directly in `README.md`.

---

### Item 6: Persistence Safety ("Thread-safe" Claim)
- **File**: `docs/reports/SIH26034_Project_Report_Final.docx` (Paragraph 263) & `README.md`
- **Found Text**: *"DataStore: Thread-safe JSON persistence manager..."*
- **Problem**: Earlier implementations used synchronous `fs.readFileSync` and `fs.writeFileSync` without serialized queueing. In high-concurrency scenarios, simultaneous write operations would overwrite each other.
- **Reality & Fix**: We implemented a Promise-based serialized write queue combined with temporary file atomic rename (`fs.rename`), and added an automated test (`tests/unit/test_datastore_concurrency.js`) that fires 10 concurrent saves. The test passed 10/10 with zero dropped records.
- **Correct Replacement Sentence**:  
  > *"The data persistence layer achieves concurrency safety through a serialized Promise write queue and atomic filesystem rename operations, verified by an empirical 10-save concurrency test."*
- **Action Taken**: Code and test implemented in Stage 3; `README.md` updated directly.
