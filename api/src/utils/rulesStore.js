const fs = require('fs');
const path = require('path');

const RULES_FILE = path.join(__dirname, '../../var/rules.json');

// Ensure directory exists
const dir = path.dirname(RULES_FILE);
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

function getRules() {
    if (!fs.existsSync(RULES_FILE)) {
        return [];
    }
    try {
        const data = fs.readFileSync(RULES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error('Error reading rules:', e);
        return [];
    }
}

function saveRules(rules) {
    try {
        fs.writeFileSync(RULES_FILE, JSON.stringify(rules, null, 2));
        return true;
    } catch (e) {
        console.error('Error saving rules:', e);
        return false;
    }
}

function addRule(rule) {
    const rules = getRules();
    const newRule = {
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        ...rule
    };
    rules.push(newRule);
    saveRules(rules);
    return newRule;
}

function deleteRule(id) {
    const rules = getRules();
    const filtered = rules.filter(r => r.id !== id);
    if (filtered.length === rules.length) return false;
    saveRules(filtered);
    return true;
}

module.exports = {
    getRules,
    addRule,
    deleteRule
};
