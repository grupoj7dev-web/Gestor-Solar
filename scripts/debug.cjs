const { Client } = require('ssh2');

const config = {
    host: 'kit.iasolar.io',
    port: 22,
    username: 'root',
    password: 'Destruidor007@@',
};

const conn = new Client();

console.log('Connecting for debug...');
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
            'echo "--- CONTAINERS ---"',
            'docker ps -a | grep apisolarman',

            'echo "--- BACKEND LOGS ---"',
            'cd /root/apisolarman',
            'docker-compose logs --tail=30 backend',

            'echo "--- FRONTEND LOGS ---"',
            'docker-compose logs --tail=20 frontend',

            'echo "--- TEST INTERNAL CONNECTIVITY ---"',
            'curl -I localhost:4001/api/health',

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
