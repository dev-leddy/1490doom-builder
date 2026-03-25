const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) results = results.concat(walk(file));
    else results.push(file);
  });
  return results;
}

const files = walk('src').filter(f => f.endsWith('.css') || f.endsWith('.jsx') || f.endsWith('.js') || f.endsWith('.html'));

files.forEach(f => {
  // Skip global.css, I will fix it manually.
  if (f.endsWith('global.css') || f.endsWith('index.html')) return;
  
  let c = fs.readFileSync(f, 'utf8');
  let original = c;
  c = c.replace(/var\(--font-display\)/g, "'Oswald', sans-serif");
  c = c.replace(/\"var\(--font-display\)\"/g, "\"'Oswald', sans-serif\"");
  c = c.replace(/var\(--font-body\)/g, "'Caslon Antique', serif");
  c = c.replace(/\"var\(--font-body\)\"/g, "\"'Caslon Antique', serif\"");
  
  if (c !== original) {
    fs.writeFileSync(f, c);
    console.log('Reverted fonts in', f);
  }
});
