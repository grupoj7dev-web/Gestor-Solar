const { Client } = require('ssh2');

const config = {
    host: 'kit.iasolar.io',
    port: 22,
    username: 'root',
    password: 'Destruidor007@@',
};

const conn = new Client();

console.log('Connecting to check cache...');
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
            'echo "--- SAMPLE PLANT DATA ---"',
            'node -e "const fs=require(\'fs\'); const data=JSON.parse(fs.readFileSync(\'api/dashboard_cache.json\')); const plant=data.stationsDetail[0]; console.log(JSON.stringify({name:plant.name,networkStatus:plant.networkStatus,generationPower:plant.generationPower,stats:plant.stats,alertCount:plant.alertCount,installedCapacity:plant.installedCapacity},null,2));"',
            'echo "--- CHECKING FOR NO_DEVICE PLANTS ---"',
            'node -e "const fs=require(\'fs\'); const data=JSON.parse(fs.readFileSync(\'api/dashboard_cache.json\')); const noDevice=data.stationsDetail.filter(p=>p.networkStatus===\'NO_DEVICE\'); console.log(\'NO_DEVICE plants:\',noDevice.length);"',
            'echo "--- CHECKING FOR ZERO GENERATION ---"',
            'node -e "const fs=require(\'fs\'); const data=JSON.parse(fs.readFileSync(\'api/dashboard_cache.json\')); const zeroGen=data.stationsDetail.filter(p=>(p.stats?.today||0)===0); console.log(\'Zero generation plants:\',zeroGen.length);"',
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
