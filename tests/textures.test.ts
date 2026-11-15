import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

function collectSrcFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectSrcFiles(full));
    } else if (full.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

describe('TextureGenerator Coverage Guard', () => {
  it('generates every bullet, effect, sprite, and icon texture referenced in src/', () => {
    const root = path.resolve(__dirname, '..');
    const tgPath = path.join(root, 'src/presentation/TextureGenerator.ts');
    const tgSource = fs.readFileSync(tgPath, 'utf8');

    const generated = new Set<string>();
    const patterns = [
      /this\.(?:createCanvas|refresh)\(tm,\s*['"`]([^'"`]+)['"`]/g,
      /draw(?:Torch|Portal|Pet|Boss|FrostBoss|MoltenBoss|Gun|SimpleIcon|Pickup|Barrel)\(\s*['"`]([^'"`]+)['"`]/g
    ];
    for (const re of patterns) {
      for (const m of tgSource.matchAll(re)) {
        generated.add(m[1]);
      }
    }
    // Also include helper string keys registered in TextureGenerator
    for (const m of tgSource.matchAll(/['"`]((?:icon|hand|upg|hero|boss|enemy|pet|bullet|flask|slash|muzzle|dust|spark|glow|torch|trap|crate|door|floor|wall|pillar|pickup|chest|barrel|turret|anvil|vending|forge|core|statue|upgrade)_[a-z0-9_]+)['"`]/g)) {
      generated.add(m[1]);
    }

    const srcFiles = collectSrcFiles(path.join(root, 'src')).filter(
      f => path.resolve(f) !== tgPath
    );

    const missing: Array<{ file: string; key: string }> = [];
    for (const file of srcFiles) {
      const content = fs.readFileSync(file, 'utf8');
      for (const m of content.matchAll(/(?:add\.sprite\([^,]+,[^,]+,|setTexture\(|texture:|bulletTexture:|handTexture:|iconTexture:|textureKey:|icon:)\s*['"]([a-z0-9_]+)['"]/g)) {
        const key = m[1];
        if (!generated.has(key)) {
          missing.push({
            file: path.relative(root, file).replace(/\\/g, '/'),
            key
          });
        }
      }
    }

    expect(missing).toEqual([]);
    expect(generated.has('bullet_enemy')).toBe(true);
    expect(generated.has('bullet_enemy_orb')).toBe(true);
    expect(generated.has('bullet_inferno')).toBe(true);
  });
});
