const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const config = {
    host: 'kit.iasolar.io',
    port: 22,
    username: 'root',
    password: 'Destruidor007@@',
};

const REMOTE_DIR = '/root/apisolarman';
const LOCAL_DIR = path.resolve(__dirname, '..');

// Files/Dirs to ignore
const IGNORE_LIST = [
    'node_modules',
    '.git',
    '.vscode',
    'tmp',
    'var',
    '.ssh_keys',
    'deploy_package.zip',
    'dist_deploy'
];

const conn = new Client();

console.log('Connecting to VPS for DEPLOY...');

async function uploadDir(sftp, localPath, remotePath) {
    const items = fs.readdirSync(localPath);

    for (const item of items) {
        if (IGNORE_LIST.includes(item)) continue;

        const localItemPath = path.join(localPath, item);
        const remoteItemPath = remotePath + '/' + item;
        const stat = fs.statSync(localItemPath);

        if (stat.isDirectory()) {
            try {
                await new Promise((resolve, reject) => {
                    sftp.mkdir(remoteItemPath, (err) => {
                        if (err && err.code !== 4) return reject(err);
                        resolve();
                    });
                });
            } catch (e) {
                // proceed
            }
            await uploadDir(sftp, localItemPath, remoteItemPath);
        } else {
            console.log(`Uploading: ${item}`);
            await new Promise((resolve, reject) => {
                sftp.fastPut(localItemPath, remoteItemPath, (err) => {
                    if (err) return reject(err);
                    resolve();
                });
            });
        }
    }
}

conn.on('ready', () => {
    console.log('Connected.');

    conn.sftp(async (err, sftp) => {
        if (err) throw err;

        console.log(`Starting upload to ${REMOTE_DIR}...`);

        try {
            await new Promise((resolve) => sftp.mkdir(REMOTE_DIR, resolve));

            await uploadDir(sftp, LOCAL_DIR, REMOTE_DIR);
            console.log('Upload complete.');

            conn.shell((err, stream) => {
                if (err) throw err;

                let output = '';
                stream.on('close', () => {
                    console.log('Deploy commands finished.');
                    console.log('--- OUTPUT ---');
                    console.log(output);
                    conn.end();
                }).on('data', (data) => {
                    process.stdout.write(data);
                    output += data.toString();
                });

                const cmds = [
                    `cd ${REMOTE_DIR}`,
                    'docker-compose down --remove-orphans',
                    'docker-compose up -d',
                    'echo "Waiting for health check..."',
                    'sleep 10',
                    'docker-compose ps',
                    'exit'
                ];

                (async () => {
                    for (const cmd of cmds) {
                        stream.write(cmd + '\n');
                        await new Promise(r => setTimeout(r, 1000));
                    }
                })();
            });

        } catch (e) {
            console.error('Upload failed:', e);
            conn.end();
        }
    });
}).connect(config);
