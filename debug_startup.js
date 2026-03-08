
try {
    console.log('Loading config...');
    require('./api/src/config');
    console.log('Config loaded. Loading server...');
    const app = require('./api/src/server');
    console.log('Server loaded successfully.');
} catch (error) {
    console.error('ERROR DETECTED:', error);
}
