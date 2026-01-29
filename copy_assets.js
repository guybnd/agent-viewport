
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.join(__dirname, 'node_modules');
const distDir = path.join(__dirname, 'dist');

function copyRecursive(src, dest) {
    if (fs.existsSync(src)) {
        const stats = fs.statSync(src);
        if (stats.isDirectory()) {
            if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
            fs.readdirSync(src).forEach(childItemName => {
                copyRecursive(path.join(src, childItemName), path.join(dest, childItemName));
            });
        } else {
            const destDir = path.dirname(dest);
            if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
            fs.copyFileSync(src, dest);
        }
    }
}

console.log("Cleaning dist/vendor...");
if (fs.existsSync(path.join(distDir, 'vendor'))) {
    fs.rmSync(path.join(distDir, 'vendor'), { recursive: true, force: true });
}

// Copy EVERYTHING to vendor to avoid any transitive dependency issues
console.log("Copying all node_modules to vendor...");
copyRecursive(sourceDir, path.join(distDir, 'vendor'));

// Icon
console.log("Copying Icon...");
if (fs.existsSync(path.join(__dirname, 'icon.png'))) {
    fs.copyFileSync(path.join(__dirname, 'icon.png'), path.join(distDir, 'icon.png'));
}

console.log("Done.");
