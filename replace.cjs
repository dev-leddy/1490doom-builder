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

const files = walk('src').filter(f => f.endsWith('.css') || f.endsWith('.jsx') || f.endsWith('.js'));
files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  let original = c;
  c = c.replace(/'Oswald',\s*sans-serif/g, 'var(--font-display)');
  c = c.replace(/"'Oswald',\s*sans-serif"/g, '"var(--font-display)"');
  c = c.replace(/'Caslon Antique',\s*serif/g, 'var(--font-body)');
  c = c.replace(/"'Caslon Antique',\s*serif"/g, '"var(--font-body)"');
  
  if (c !== original) {
    fs.writeFileSync(f, c);
    console.log('Updated', f);
  }
});
