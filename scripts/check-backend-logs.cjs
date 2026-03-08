const { Client } = require('ssh2');

const config = {
    host: 'kit.iasolar.io',
    port: 22,
    username: 'root',
    password: 'Destruidor007@@',
};

const conn = new Client();

console.log('Connecting to check backend logs...');
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
            'echo "--- BACKEND LOGS (looking for AI Vision) ---"',
            'docker-compose logs backend | grep -i "vision\\|anomaly\\|alert found" | tail -50',
            'echo "--- EXEC INTO CONTAINER TO CHECK DATA ---"',
            'docker-compose exec -T backend node -e "const fs=require(\'fs\'); const data=JSON.parse(fs.readFileSync(\'dashboard_cache.json\')); console.log(\'Total plants:\', data.stationsDetail.length); const noDevice=data.stationsDetail.filter(p=>p.networkStatus===\'NO_DEVICE\'); console.log(\'NO_DEVICE:\', noDevice.length); const zeroGen=data.stationsDetail.filter(p=>(p.stats?.today||0)===0); console.log(\'Zero generation:\', zeroGen.length);"',
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
