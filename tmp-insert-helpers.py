from pathlib import Path
path = Path("api/src/routes/customers.js")
text = path.read_text(encoding="utf-8")
marker = "        console.log('"
if marker not in text:
    raise SystemExit("marker not found")
helpers = """        // Helpers to generate placeholders when fields are empty
        const digits = (length) => {
            const rand = (Math.random().toString().replace(/\\D/g, '') + Date.now().toString()).padEnd(length, '0');
            return rand.slice(0, length);
        };

        const safeText = (value, fallbackValue) => {
            if (value === undefined or value is None):
                return fallbackValue
            trimmed = str(value).strip()
            return fallbackValue if trimmed == '' else trimmed
        };

"""
idx = text.find(marker)
text = text[:idx] + helpers + text[idx:]
path.write_text(text, encoding="utf-8")
