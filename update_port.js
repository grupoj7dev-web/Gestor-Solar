const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
let envContent = fs.readFileSync(envPath, 'utf8');

// Replace PORT=3000 with PORT=4001
envContent = envContent.replace(/PORT=3000/g, 'PORT=4001');

fs.writeFileSync(envPath, envContent);
console.log('✅ Updated PORT to 4001 in .env file');
