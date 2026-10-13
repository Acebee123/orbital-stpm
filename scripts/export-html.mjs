import './build.mjs';
import {readFileSync, writeFileSync, mkdirSync, statSync} from 'node:fs';
import {dirname, resolve} from 'node:path';

// Bundle the existing experience without changing its scene or interaction.
// Escape HTML closing tags so bundled text cannot terminate an inline block.
const css = readFileSync('dist/assets/app.css', 'utf8').replace(/<\/style/gi, '<\\/style');
const js = readFileSync('dist/assets/app.js', 'utf8').replace(/<\/script/gi, '<\\/script');
const html = readFileSync('index.html', 'utf8').replace(
  '<script type="module" src="/src/main.jsx"></script>',
  () => `<style>${css}</style><script type="module">${js}</script>`
);
if (html.includes('src="/src/main.jsx"')) throw new Error('HTML export did not replace the source entry point');
const output = resolve(process.argv[2] || 'orbital.html');
mkdirSync(dirname(output), {recursive: true});
writeFileSync(output, html);
writeFileSync(resolve('dist/orbital.html'), html);
console.log(`Standalone HTML: ${output} (${statSync(output).size} bytes)`);
