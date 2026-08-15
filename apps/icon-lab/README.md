# Icon Lab

Local workshop for building and validating the provider-neutral `@party-stack/icons` universal set.

## What it does

1. **Extracts** SVG (or text-only) assets from:
   - Blueprint / Foundry (`@blueprintjs/icons`)
   - Lucide (`@lucide/icons`)
   - Material Symbols (`@iconify-json/material-symbols`, via Expo Android names)
   - Salesforce Lightning utility icons (`@salesforce-ux/icons`)
   - SF Symbols (names only — Apple glyphs are not redistributable)
2. **Embeds** each icon with CLIP (`Xenova/clip-vit-base-patch32`) using image + name when a glyph exists, otherwise text.
3. **Audits** existing mappings with pairwise cosine similarity and nearest-neighbor search.

## Commands

```bash
pnpm install --filter @party-stack/icon-lab
pnpm --filter @party-stack/icon-lab icons:prepare   # extract + embed
pnpm --filter @party-stack/icon-lab dev             # http://localhost:5179
```

Generated artifacts live under `public/data/` and `public/icons/` and are intended to be committed so the lab works without re-running CLIP.
