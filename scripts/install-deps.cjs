const { Client } = require('ssh2');

const config = {
    host: 'kit.iasolar.io',
    port: 22,
    username: 'root',
    password: 'Destruidor007@@',
};

const conn = new Client();

console.log('Connecting to install dependencies...');
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
            'cd /root/apisolarman',
            'echo "--- CHECKING PDFKIT ---"',
            'docker-compose exec -T backend npm list pdfkit',
            'echo "--- INSTALLING DEPENDENCIES ---"',
            'docker-compose exec -T backend npm install',
            'echo "--- RESTARTING BACKEND ---"',
            'docker-compose restart backend',
            'echo "--- DONE ---"',
            'exit'
        ];

        (async () => {
            for (const cmd of cmds) {
                console.log(`Sending: ${cmd}`);
                stream.write(cmd + '\n');
                await new Promise(r => setTimeout(r, 3000));
            }
        })();
    });
}).connect(config);
