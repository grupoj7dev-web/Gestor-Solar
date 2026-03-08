const https = require('https');

console.log('Checking https://gestorsolar.iasolar.io...');

https.get('https://gestorsolar.iasolar.io', (res) => {
    console.log('StatusCode:', res.statusCode);
    console.log('Headers:', res.headers);

    if (res.statusCode >= 200 && res.statusCode < 400) {
        console.log('Health Check PASSED');
    } else {
        console.log('Health Check FAILED');
    }
}).on('error', (e) => {
    console.error('Health Check ERROR:', e);
});

console.log('\nChecking API endpoint...');
https.get('https://gestorsolar.iasolar.io/api/health', (res) => {
    console.log('API StatusCode:', res.statusCode);

    if (res.statusCode >= 200 && res.statusCode < 400) {
        console.log('API Health Check PASSED');
    } else {
        console.log('API Health Check FAILED');
    }
}).on('error', (e) => {
    console.error('API Health Check ERROR:', e);
});
