const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'dist');
const publicFiles = ['index.html', 'script.js', 'styles.css'];

fs.mkdirSync(outputDir, { recursive: true });

for (const file of publicFiles) {
  fs.copyFileSync(path.join(projectRoot, file), path.join(outputDir, file));
}

console.log(`Prepared ${publicFiles.length} public files in dist/.`);