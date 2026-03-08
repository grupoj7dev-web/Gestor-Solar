const { Client } = require('ssh2');

const config = {
    host: 'kit.iasolar.io',
    port: 22,
    username: 'root',
    password: 'Destruidor007@@',
};

const conn = new Client();

console.log('Connecting to restart backend...');
conn.on('ready', () => {
    console.log('Connected.');

    conn.shell((err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('close', () => {
            console.log('--- OUTPUT ---');
            console.log(output);
            conn.end();
        }).on('data', (data) => {
            output += data.toString();
        });

        const cmds = [
            'echo "--- RESTARTING BACKEND ---"',
            'cd /root/apisolarman',
            'docker-compose restart backend',
            'echo "Waiting for backend to start..."',
            'sleep 5',
            'docker-compose logs --tail=20 backend',
            'echo "--- CHECKING CACHE ---"',
            'ls -lh api/dashboard_cache.json',
            'exit'
        ];

        (async () => {
            for (const cmd of cmds) {
                console.log(`Sending: ${cmd}`);
                stream.write(cmd + '\n');
                await new Promise(r => setTimeout(r, 2000));
            }
        })();
    });
}).connect(config);
