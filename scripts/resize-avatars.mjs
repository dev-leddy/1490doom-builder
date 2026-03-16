import sharp from 'sharp'
import { readdirSync } from 'fs'
import { join } from 'path'

const dir = 'public/company-avatars'
const MAX = 600

const files = readdirSync(dir).filter(f => f.endsWith('.png'))

for (const file of files) {
  const p = join(dir, file)
  const meta = await sharp(p).metadata()
  const needsResize = meta.width > MAX || meta.height > MAX
  const before = (await import('fs')).statSync(p).size

  await sharp(p)
    .resize(MAX, MAX, { fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9, effort: 10 })
    .toFile(p + '.tmp')

  const { renameSync, statSync } = await import('fs')
  renameSync(p + '.tmp', p)
  const after = statSync(p).size
  const pct = Math.round((1 - after / before) * 100)
  console.log(`${file}: ${(before/1024).toFixed(0)}KB → ${(after/1024).toFixed(0)}KB (${pct}% smaller)${needsResize ? ' [resized]' : ''}`)
}
console.log('Done.')
