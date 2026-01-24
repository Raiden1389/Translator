# AI Translation Workflow: Hán-Việt Optimization

Standard procedures for ensuring high-quality, lore-consistent literary translations.

## 1. Glossary Priority
Relevant terminology is limited to the top 30-50 most significant terms per chapter to prevent instruction dilution.
- **Sorting:** Terms are sorted by length (descending) before being injected into the prompt.
- **Rule:** AI MUST prioritize the provided "Translated" column for proper nouns.

## 2. Character & Gender Consistency
- **Gender:** Gender properties in the dictionary are used to map pronouns correctly (e.g., Ta/Hắn vs Ta/Nàng).
- **Extraction:** AI extraction always enforces `type: "name"` for characters.

## 3. Punctuation & Literary Style
The `lastFixPunctuation` setting triggers a specialized system instruction.
- **Instruction:** "Convert comma-separated sentences into standard Vietnamese literary punctuation (dots for full stops)."
- **Capitalization:** The "Ta" pronoun logic handles capitalization correctly after punctuation or opening quotes.

## 4. Fail-Safe JSON Parsing
AI outputs are extracted using a multi-tiered fallback system to ensure zero batch crashes:
1. **Balanced Extraction:** Extract everything between the first `{` and last `}`.
2. **Strict Native Parse:** Use `JSON.parse`.
3. **Regex Extraction:** If strict parse fails, use targeted regex for `title` and `content` keys.
4. **Final Fallback:** If no braces are found, treat the entire AI response as raw text to prevent "Missing JSON braces" errors.

## 5. Hán-Việt Idiom Protection (Chengyu)
The system automatically protects traditional four-character idioms (Chengyu) to maintain novel atmosphere:
- **Policy:** NEVER "Vietnamese-ize" Chengyu into plain explanations (e.g., Keep "Nhân trung lữ bố", DO NOT translate to "Lữ Bố giữa đám người").
- **Implementation:** Hardcoded `IDIOM_RULE` in the system instruction ensures this behavior without manual dictionary entry.
