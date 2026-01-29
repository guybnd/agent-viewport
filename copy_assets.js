
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.join(__dirname, 'node_modules');
const distDir = path.join(__dirname, 'dist');

function copyFile(src, dest) {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
    console.log(`Copied ${src} to ${dest}`);
}

// RobotJS
// Usually pkg expects native modules in the same structure relative to the exe, 
// OR simpler if we adjust the require. But let's follow the warning's advice if possible.
// Warning said: "The file must be distributed with executable as %2"
// But commonly, placing .node files next to .exe works if the code requires them.
// Let's try to copy to root of dist first, or maintain structure if necessary.

// Sharp is complex. It needs vendor libs.
// Warning: node_modules\sharp\vendor\lib -> path-to-executable/sharp/vendor/lib

const sharpSrc = path.join(sourceDir, 'sharp');
const sharpDist = path.join(distDir, 'sharp');

// Recursive copy function
function copyRecursive(src, dest) {
    if (fs.existsSync(src)) {
        const stats = fs.statSync(src);
        if (stats.isDirectory()) {
            if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
            fs.readdirSync(src).forEach(childItemName => {
                copyRecursive(path.join(src, childItemName), path.join(dest, childItemName));
            });
        } else {
            // For sharp, we need .dll, .node
            // Let's copy everything in build/Release and vendor
            copyFile(src, dest);
        }
    }
}

console.log("Copying Sharp assets...");
copyRecursive(path.join(sharpSrc, 'build', 'Release'), path.join(sharpDist, 'build', 'Release'));
copyRecursive(path.join(sharpSrc, 'vendor'), path.join(sharpDist, 'vendor'));

// RobotJS
console.log("Copying RobotJS...");
// robotjs usually is required as `require('robotjs')`. It looks for build/Release/robotjs.node.
// We should probably replicate `node_modules/robotjs/build/Release/robotjs.node` inside dist?
// Or just creating the folder structure `node_modules` inside dist might be safer for pkg resolution at runtime.

const robotJsSrc = path.join(sourceDir, '@hurdlegroup/robotjs/build/Release/robotjs.node');
// The require in code is `import robot from '@hurdlegroup/robotjs'`.
// Pkg runtime often looks for files in a virtual filesystem, defaulting to physical file if marked as asset.
// But native addons must be physical.
// Let's try replicating node_modules structure inside dist.

const robotJsDist = path.join(distDir, 'node_modules', '@hurdlegroup', 'robotjs', 'build', 'Release', 'robotjs.node');
if (fs.existsSync(robotJsSrc)) {
    copyFile(robotJsSrc, robotJsDist);
}

// Uiohook
console.log("Copying Uiohook...");
const uiohookSrc = path.join(sourceDir, 'uiohook-napi/build/Release/uiohook.node');
const uiohookDist = path.join(distDir, 'node_modules', 'uiohook-napi', 'build', 'Release', 'uiohook.node');

if (fs.existsSync(uiohookSrc)) {
    copyFile(uiohookSrc, uiohookDist);
}

console.log("Copy complete.");
