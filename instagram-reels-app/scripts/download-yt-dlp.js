const fs = require('fs');
const path = require('path');
const https = require('https');

const binDir = path.join(__dirname, '..', 'bin');
if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
}

const isWin = process.platform === 'win32';
const filename = isWin ? 'yt-dlp.exe' : 'yt-dlp';
const binPath = path.join(binDir, filename);

const url = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${filename}`;

function download(url, dest) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                return download(response.headers.location, dest).then(resolve).catch(reject);
            }
            if (response.statusCode !== 200) {
                return reject(new Error(`Failed to download: ${response.statusCode}`));
            }
            const file = fs.createWriteStream(dest);
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                if (!isWin) {
                    fs.chmodSync(dest, 0o755); // make executable
                }
                resolve();
            });
        }).on('error', reject);
    });
}

console.log(`Downloading ${filename} from ${url}...`);
download(url, binPath)
    .then(() => console.log('Downloaded successfully!'))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
