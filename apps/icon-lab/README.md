# Icon Lab

Local workshop for building and validating the provider-neutral `@party-stack/icons` universal set.

## What it does

1. **Archives every icon** from:
   - Blueprint / Foundry (`@blueprintjs/icons`)
   - Lucide (`@lucide/icons`)
   - Material Symbols (`@iconify-json/material-symbols`)
   - Salesforce Lightning action/custom/doctype/standard/utility icons (`@salesforce-ux/icons`)
   - SF Symbols names (`sf-symbols-typescript`)
2. **Embeds** each icon with CLIP text semantics (`Xenova/clip-vit-base-patch32`) plus a normalized 16×16 image descriptor when a glyph exists.
3. **Drafts a mapping for every Blueprint icon**, keeping existing package mappings fixed and proposing the closest icon from every other provider.
4. **Audits** existing and generated mappings with pairwise cosine similarity and nearest-neighbor search.

## Compact storage

The browser loads one normalized zip per redistributable provider from `public/icon-sets/`.
There are no thousands of loose SVG files in git. Provider archives and `catalog.json` are
committed; multimodal embeddings are **not** — they are produced by the Turbo
`icons:embed` task into `public/data/embeddings.i8` (+ index, draft mappings, and audit).

`icon-sources.json` records the package, source tarball URL, version, homepage, and
license for every provider. The archive script resolves installed versions so a package
update automatically records the new tarball URL.

## Commands

```bash
pnpm install --filter @party-stack/icon-lab
pnpm turbo icons:archive --filter @party-stack/icon-lab   # rebuild full provider zips
pnpm turbo icons:embed --filter @party-stack/icon-lab     # CLIP + draft mappings (cached)
pnpm --filter @party-stack/icon-lab icons:update          # update sources, then prepare
pnpm turbo watch build dev --filter @party-stack/icon-lab # embeds first, then http://localhost:5179
```

`dev` / `dist` depend on `icons:embed`, so Turbo regenerates embeddings when catalog or
archives change and restores them from cache otherwise. Provider zips stay committed;
only the CLIP outputs are generated locally. CI `build` / `lint` / `test` do not run CLIP.

## SF Symbols glyphs

Apple's SF Symbols license does not permit extracting or repackaging glyph images as an
icon set. A GitHub mirror does not change that license, so only the MIT-licensed symbol
name catalog is committed here.

For internal embedding runs where you have licensed local exports, point the pipeline at
a directory of `<symbol-name>.png` or `<symbol-name>.svg` files:

```bash
SF_SYMBOLS_ASSET_DIR=/path/to/local/sf-symbol-exports pnpm icons:embed
```

Those assets are consumed transiently and never copied into the repository archives.
