const { spawn } = require('child_process');

const child = spawn('cmd.exe', ['/c', 'C:\\gestor-solar\\scripts\\pm2\\start-tunnel.cmd'], {
  stdio: 'inherit',
});

child.on('exit', (code) => process.exit(code ?? 0));
child.on('error', () => process.exit(1));
