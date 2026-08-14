import { icons } from "@iconify-json/heroicons";
import type { IconName, IconResolver, IconSource } from "./index.js";

/**
 * The default framework-independent web icon set.
 *
 * Sources are Heroicons 24px outlines and use `currentColor`, so callers can
 * render them in any DOM framework or serialize them directly.
 */
export const getHeroIconSource: IconResolver<IconSource> = (name: IconName) => {
    const icon = icons.icons[name];
    if (!icon) {
        return undefined;
    }

    const width = icon.width ?? icons.width ?? 24;
    const height = icon.height ?? icons.height ?? 24;
    const viewBox = `0 0 ${width} ${height}`;
    return {
        body: icon.body,
        viewBox,
        svg: `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" viewBox="${viewBox}">${icon.body}</svg>`,
    };
};
