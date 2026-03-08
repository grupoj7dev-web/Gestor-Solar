const app = require('./server');
const { startMonitoring } = require('./services/alertMonitor');

const PORT = process.env.PORT || 4001;

app.post('/api/health', (req, res) => {
  return res.json({ status: 'ok' });
});

app.get('/api/health', (req, res) => {
  return res.json({ status: 'ok' });
});

app.post('/api/version', (req, res) => {
  return res.json({
    version: process.env.APP_VERSION || '1.0.0',
  });
});

app.listen(PORT, () => {
  console.log(`API Solarman ouvindo em http://localhost:${PORT}`);

  // Start background services
  startMonitoring();
});

// Generic 404 handler
app.use((req, res) => {
  return res.status(404).json({
    error: 'Not Found',
    path: req.originalUrl,
  });
});
