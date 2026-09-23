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

The browser loads one normalized snapshot per redistributable provider from
`public/icon-sets/`. Those compact archives and their source manifest are the only icon
data committed, so development never depends on mutable upstream URLs. The catalog,
mapping drafts, audits, and multimodal embeddings are all downstream data generated in
the already-ignored `temp/data/` directory. Vite serves them at `/generated-data/` in
development and includes them in production bundles.

`icon-sources.json` records the package, source tarball URL, version, homepage, and
license for every provider. The archive script resolves installed versions so a package
update automatically records the new tarball URL.

## Commands

```bash
pnpm install --filter @party-stack/icon-lab
pnpm turbo icons:archive --filter @party-stack/icon-lab   # explicitly refresh checked-in snapshots
pnpm turbo icons:catalog --filter @party-stack/icon-lab   # derive catalog in temp/
pnpm turbo icons:embed --filter @party-stack/icon-lab     # CLIP + draft mappings (cached)
pnpm --filter @party-stack/icon-lab icons:update          # update sources, then prepare
pnpm turbo watch build dev --filter @party-stack/icon-lab # embeds first, then http://localhost:5179
```

The generation tasks are declared only in this package's nested `turbo.json`. `dev` /
`dist` derive the catalog and embeddings from the committed snapshots, while ordinary
monorepo `build` / `lint` / `test` do not run CLIP. `icons:archive` remains an explicit
one-off task because it refreshes checked-in provider snapshots.

Mapping review decisions are saved in browser local storage. Approve or reject a
candidate, enter a replacement icon and optional note, then use **Export feedback** to
download `icon-mapping-feedback.json` for applying to the provider mapping packages.

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
