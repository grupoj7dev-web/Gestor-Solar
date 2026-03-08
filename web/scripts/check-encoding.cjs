const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const scanDirs = ["src", "public"];
const fileExts = new Set([".js", ".jsx", ".css", ".html", ".json", ".md"]);

const suspiciousPatterns = [
  // Typical UTF-8 text opened as Windows-1252/ISO-8859-1 (e.g. "Ã§", "Ã£", "Ã¡")
  /\u00C3[\u0080-\u00BF]/g,
  // Secondary mojibake marker (e.g. "Â ")
  /\u00C2[\u0080-\u00BF]/g,
  // Curly quotes/dashes mojibake prefix (e.g. "â€œ", "â€”")
  /\u00E2\u20AC[\u0098-\u00A6]/g,
  // Emoji mojibake prefix (e.g. "ðŸ")
  /\u00F0\u0178/g,
  // Unicode replacement character "�"
  /\uFFFD/g,
];

function listFiles(dir, acc = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listFiles(fullPath, acc);
      continue;
    }
    if (fileExts.has(path.extname(entry.name))) {
      acc.push(fullPath);
    }
  }
  return acc;
}

const allFiles = scanDirs.flatMap((dir) => listFiles(path.join(rootDir, dir)));
const issues = [];

for (const file of allFiles) {
  const content = fs.readFileSync(file, "utf8");
  for (const pattern of suspiciousPatterns) {
    const match = content.match(pattern);
    if (match && match.length > 0) {
      issues.push({
        file: path.relative(rootDir, file),
        pattern: pattern.toString(),
        sample: match[0],
      });
      break;
    }
  }
}

if (issues.length > 0) {
  console.error("Encoding check failed. Suspicious UTF-8 artifacts found:");
  for (const issue of issues) {
    console.error(`- ${issue.file} | ${issue.pattern} | sample: ${issue.sample}`);
  }
  process.exit(1);
}

console.log(`Encoding check passed (${allFiles.length} files scanned).`);
