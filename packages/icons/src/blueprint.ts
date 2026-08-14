import { isIconName, type Icon, type IconName } from "./index.js";

export interface BlueprintIcon {
    type: "blueprint";
    name: string;
    color: string;
}

export interface BlueprintIconMetadata extends Record<string, unknown> {
    foundry: BlueprintIcon;
}

const blueprintAliases = {
    add: "plus",
    annotation: "chat-bubble-left",
    application: "window",
    applications: "squares-2x2",
    "automatic-updates": "arrow-path",
    "ban-circle": "no-symbol",
    blank: "document",
    box: "cube",
    build: "wrench",
    changes: "pencil-square",
    comparison: "arrows-right-left",
    dashboard: "squares-2x2",
    database: "circle-stack",
    delete: "trash",
    edit: "pencil",
    error: "exclamation-circle",
    export: "arrow-up-tray",
    feed: "rss",
    filter: "funnel",
    geolocation: "map-pin",
    globe: "globe-alt",
    "group-objects": "rectangle-group",
    history: "clock",
    import: "arrow-down-tray",
    "info-sign": "information-circle",
    issue: "ticket",
    "lab-test": "beaker",
    layers: "square-2-stack",
    locate: "map-pin",
    "log-in": "arrow-right-on-rectangle",
    "log-out": "arrow-left-on-rectangle",
    menu: "bars-3",
    "mobile-phone": "device-phone-mobile",
    "new-object": "plus-circle",
    notifications: "bell",
    people: "users",
    person: "user",
    project: "folder",
    projects: "folder",
    properties: "adjustments-horizontal",
    refresh: "arrow-path",
    saved: "bookmark",
    search: "magnifying-glass",
    send: "paper-airplane",
    "small-cross": "x-mark",
    tick: "check",
    time: "clock",
    upload: "arrow-up-tray",
    "warning-sign": "exclamation-triangle",
    widget: "cube",
} as const satisfies Record<string, IconName>;

/**
 * Converts a Blueprint icon name to the standard icon vocabulary.
 *
 * Exact names are preserved. Blueprint-specific names use semantic aliases;
 * unknown names return `undefined` so callers can choose their own fallback.
 */
export function fromBlueprintIconName(value: string): IconName | undefined {
    const normalized = value
        .trim()
        .toLowerCase()
        .replaceAll(/[\s_]+/g, "-");
    if (isIconName(normalized)) {
        return normalized;
    }
    return blueprintAliases[normalized as keyof typeof blueprintAliases];
}

export function fromBlueprintIcon(source: BlueprintIcon): Icon {
    return {
        name: fromBlueprintIconName(source.name),
        metadata: {
            foundry: { ...source },
        } satisfies BlueprintIconMetadata,
    };
}

export function toBlueprintIcon(icon: Icon): BlueprintIcon | undefined {
    const source = icon.metadata?.foundry;
    if (
        typeof source !== "object" ||
        source === null ||
        !("type" in source) ||
        source.type !== "blueprint" ||
        !("name" in source) ||
        typeof source.name !== "string" ||
        !("color" in source) ||
        typeof source.color !== "string"
    ) {
        return undefined;
    }
    return {
        type: source.type,
        name: source.name,
        color: source.color,
    };
}
