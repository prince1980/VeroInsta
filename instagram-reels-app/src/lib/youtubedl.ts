import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execFileAsync = promisify(execFile);
const binPath = process.platform === 'win32' 
  ? path.join(process.cwd(), 'bin', 'yt-dlp.exe') 
  : path.join(process.cwd(), 'bin', 'yt-dlp');

export default async function youtubedl(url: string, flags: any) {
    const args: string[] = [];
    for (const [key, value] of Object.entries(flags)) {
        const flagName = `--${key.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)}`;
        if (typeof value === 'boolean' && value) {
            args.push(flagName);
        } else if (Array.isArray(value)) {
            value.forEach(v => {
                args.push(flagName, String(v));
            });
        } else {
            args.push(flagName, String(value));
        }
    }
    args.push(url);

    try {
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        const env = { ...process.env, TMP: tempDir, TEMP: tempDir };
        const { stdout } = await execFileAsync(binPath, args, { maxBuffer: 1024 * 1024 * 50, env }); // 50MB buffer
        if (flags.dumpSingleJson) {
            return JSON.parse(stdout);
        }
        return stdout;
    } catch (error: any) {
        if (error.stdout) {
            try {
                if (flags.dumpSingleJson) return JSON.parse(error.stdout);
            } catch (e) {
                // ignore JSON parse error on crash
            }
        }
        throw error;
    }
}
