import { getIconPaths, IconSize, type IconName as BlueprintIconName } from "@blueprintjs/icons";
import type { Icon, IconName } from "@party-stack/icons";

export const blueprintIconNames = {
    activity: "pulse",
    add: "add",
    airplane: "airplane",
    alarm: "time",
    alert: "warning-sign",
    archive: "archive",
    "arrow-down": "arrow-down",
    "arrow-left": "arrow-left",
    "arrow-right": "arrow-right",
    "arrow-up": "arrow-up",
    attachment: "paperclip",
    award: "badge",
    bank: "bank-account",
    barcode: "barcode",
    bell: "notifications",
    book: "book",
    bookmark: "bookmark",
    briefcase: "briefcase",
    bug: "bug",
    building: "office",
    calculator: "calculator",
    calendar: "calendar",
    camera: "camera",
    "chart-bar": "chart",
    "chart-line": "timeline-line-chart",
    "chart-pie": "pie-chart",
    chat: "chat",
    check: "tick",
    "check-circle": "tick-circle",
    "chevron-down": "chevron-down",
    "chevron-left": "chevron-left",
    "chevron-right": "chevron-right",
    "chevron-up": "chevron-up",
    circle: "circle",
    clipboard: "clipboard",
    clock: "time",
    cloud: "cloud",
    code: "code",
    compass: "compass",
    copy: "duplicate",
    "credit-card": "credit-card",
    cube: "cube",
    database: "database",
    delete: "trash",
    document: "document",
    download: "download",
    edit: "edit",
    email: "envelope",
    error: "error",
    eye: "eye-open",
    "eye-off": "eye-off",
    filter: "filter",
    flag: "flag",
    folder: "folder-close",
    globe: "globe-network",
    grid: "grid-view",
    heart: "heart",
    help: "help",
    history: "history",
    home: "home",
    image: "media",
    info: "info-sign",
    key: "key",
    layers: "layers",
    lightbulb: "lightbulb",
    link: "link",
    list: "list",
    location: "map-marker",
    lock: "lock",
    "lock-open": "unlock",
    map: "map",
    menu: "menu",
    microphone: "microphone",
    minus: "minus",
    "minus-circle": "minus",
    moon: "moon",
    "more-horizontal": "more",
    "more-vertical": "more",
    notification: "notifications",
    package: "box",
    pause: "pause",
    people: "people",
    person: "person",
    phone: "phone",
    pin: "pin",
    play: "play",
    "play-circle": "play",
    "plus-circle": "add",
    printer: "print",
    project: "projects",
    refresh: "refresh",
    rocket: "rocket-slant",
    save: "floppy-disk",
    search: "search",
    send: "send-to",
    settings: "cog",
    share: "share",
    shield: "shield",
    "shopping-bag": "shopping-cart",
    "shopping-cart": "shopping-cart",
    star: "star",
    stop: "stop",
    sun: "flash",
    tag: "tag",
    ticket: "issue",
    tools: "build",
    upload: "upload",
    video: "video",
    warning: "warning-sign",
    window: "application",
    wrench: "wrench",
    x: "cross",
    "x-circle": "cross-circle",
} as const satisfies Record<IconName, BlueprintIconName>;

export function getBlueprintIconName(name: IconName): BlueprintIconName {
    return blueprintIconNames[name];
}

const universalNamesByBlueprint = new Map<BlueprintIconName, IconName>(
    Object.entries(blueprintIconNames).map(([name, blueprintName]) => [blueprintName, name as IconName])
);

export interface BlueprintIconMeta extends Record<string, unknown> {
    blueprint: {
        name: string;
    };
}

export function fromBlueprintIconName(name: string): Icon {
    return {
        name: universalNamesByBlueprint.get(name as BlueprintIconName),
        meta: {
            blueprint: { name },
        } satisfies BlueprintIconMeta,
    };
}

export function toBlueprintIconName(icon: Icon): string | undefined {
    const source = icon.meta?.blueprint;
    return typeof source === "object" &&
        source !== null &&
        "name" in source &&
        typeof source.name === "string"
        ? source.name
        : icon.name
          ? getBlueprintIconName(icon.name)
          : undefined;
}

export interface BlueprintIconSource {
    paths: string[];
    viewBox: string;
}

export function getBlueprintIconSource(name: IconName, size: IconSize = IconSize.LARGE): BlueprintIconSource {
    return {
        paths: getIconPaths(getBlueprintIconName(name), size),
        viewBox: `0 0 ${size} ${size}`,
    };
}

export { IconSize };
export type { BlueprintIconName };
