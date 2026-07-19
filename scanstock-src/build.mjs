import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const result = await build({
  entryPoints: ['src/app.js'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2019'],
  write: false,
  define: { 'process.env.NODE_ENV': '"production"' },
});

const js = result.outputFiles[0].text;
const template = readFileSync('src/index.template.html', 'utf8');
// </script> inside the bundle would break the inline tag
const safeJs = js.replace(/<\/script>/gi, '<\\/script>');
const html = template.replace('/*APP_JS*/', () => safeJs);
mkdirSync('dist', { recursive: true });
writeFileSync('dist/index.html', html);
console.log('dist/index.html written,', (html.length / 1024).toFixed(0), 'KB');
