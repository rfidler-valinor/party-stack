import type { CatalogIcon } from "../lib/types";

export function IconTile({ icon, size = 48 }: { icon: CatalogIcon; size?: number }) {
    if (icon.hasSvg && icon.svgPath) {
        return (
            <div
                className="flex items-center justify-center rounded-lg bg-[#f8fafc]"
                style={{ width: size + 24, height: size + 24 }}
            >
                <img
                    src={`/icons/${icon.svgPath}`}
                    alt={icon.name}
                    width={size}
                    height={size}
                    className="object-contain"
                />
            </div>
        );
    }

    return (
        <div
            className="flex items-center justify-center rounded-lg border border-dashed border-[var(--line)] bg-[#f8fafc] px-2 text-center"
            style={{ width: size + 24, height: size + 24 }}
        >
            <span className="font-[var(--font-mono)] text-[10px] leading-tight text-[var(--muted)]">
                {icon.name}
            </span>
        </div>
    );
}
