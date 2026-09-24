import type { Icon, IconName } from "@party-stack/icons";

export type SalesforceLightningIconName =
    `${"action" | "custom" | "doctype" | "standard" | "utility"}/${string}`;

export const SalesforceLightningIconNames = {
    activity: "utility/activity",
    add: "utility/add",
    airplane: "utility/plane",
    alarm: "utility/clock",
    alert: "utility/warning",
    archive: "utility/archive",
    "arrow-down": "utility/arrowdown",
    "arrow-left": "utility/arrowleft",
    "arrow-right": "utility/arrowright",
    "arrow-up": "utility/arrowup",
    attachment: "utility/attach",
    award: "utility/reward",
    bank: "utility/money",
    barcode: "utility/scan",
    bell: "utility/notification",
    book: "utility/knowledge_base",
    bookmark: "utility/bookmark",
    briefcase: "utility/case",
    bug: "utility/bug",
    building: "utility/company",
    calculator: "utility/currency",
    calendar: "utility/event",
    camera: "utility/photo",
    "chart-bar": "utility/graph",
    "chart-line": "utility/trending",
    "chart-pie": "utility/metrics",
    chat: "utility/chat",
    check: "utility/check",
    "check-circle": "utility/success",
    "chevron-down": "utility/chevrondown",
    "chevron-left": "utility/chevronleft",
    "chevron-right": "utility/chevronright",
    "chevron-up": "utility/chevronup",
    circle: "utility/record",
    clipboard: "utility/copy",
    clock: "utility/clock",
    cloud: "utility/cloud",
    code: "utility/apex",
    compass: "utility/trail",
    copy: "utility/copy",
    "credit-card": "utility/moneybag",
    cube: "utility/cube",
    database: "utility/database",
    delete: "utility/delete",
    document: "utility/file",
    download: "utility/download",
    edit: "utility/edit",
    email: "utility/email",
    error: "utility/error",
    eye: "utility/preview",
    "eye-off": "utility/hide",
    filter: "utility/filter",
    flag: "utility/priority",
    folder: "utility/open_folder",
    globe: "utility/world",
    grid: "utility/apps",
    heart: "utility/favorite",
    help: "utility/info",
    history: "utility/skip_back",
    home: "utility/home",
    image: "utility/image",
    info: "utility/info_alt",
    key: "utility/key",
    layers: "utility/layers",
    lightbulb: "utility/light_bulb",
    link: "utility/link",
    list: "utility/list",
    location: "utility/checkin",
    lock: "utility/lock",
    "lock-open": "utility/unlock",
    map: "utility/location",
    menu: "utility/rows",
    microphone: "utility/unmuted",
    minus: "utility/dash",
    "minus-circle": "utility/clear",
    moon: "utility/away",
    "more-horizontal": "utility/threedots",
    "more-vertical": "utility/threedots_vertical",
    notification: "utility/notification",
    package: "utility/product",
    pause: "utility/pause",
    people: "utility/people",
    person: "utility/user",
    phone: "utility/call",
    pin: "utility/pin",
    play: "utility/play",
    "play-circle": "utility/play",
    "plus-circle": "utility/add",
    printer: "utility/print",
    project: "utility/strategy",
    refresh: "utility/refresh",
    rocket: "utility/rocket",
    save: "utility/save",
    search: "utility/search",
    send: "utility/send",
    settings: "utility/settings",
    share: "utility/share",
    shield: "utility/shield",
    "shopping-bag": "utility/cart",
    "shopping-cart": "utility/cart",
    star: "utility/favorite",
    stop: "utility/stop",
    sun: "utility/dayview",
    tag: "utility/price_book_entries",
    ticket: "utility/case",
    tools: "utility/settings",
    upload: "utility/upload",
    video: "utility/video",
    warning: "utility/warning",
    window: "utility/desktop",
    wrench: "utility/settings",
    x: "utility/close",
    "x-circle": "utility/clear",
} as const satisfies Record<IconName, SalesforceLightningIconName>;

const UniversalNamesBySalesforceLightning = new Map<SalesforceLightningIconName, IconName>(
    Object.entries(SalesforceLightningIconNames).map(([name, salesforceName]) => [
        salesforceName,
        name as IconName,
    ])
);

const StandardObjectIconConcepts: Readonly<Record<string, IconName>> = {
    account: "building",
    case: "ticket",
    contact: "person",
    lead: "person",
    opportunity: "award",
    user: "person",
};

function normalizeSalesforceName(value: string): string {
    return value
        .replace(/__c$/, "")
        .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
        .replace(/[\s-]+/g, "_")
        .toLowerCase();
}

export function getSalesforceLightningIconName(name: IconName): SalesforceLightningIconName {
    return SalesforceLightningIconNames[name];
}

export function getSalesforceObjectIconName(
    apiName: string,
    custom = false
): SalesforceLightningIconName | undefined {
    return custom ? undefined : `standard/${normalizeSalesforceName(apiName)}`;
}

export function getSalesforceActionIconName(apiName: string): SalesforceLightningIconName {
    return `action/${normalizeSalesforceName(apiName)}`;
}

export interface SalesforceLightningIconMeta extends Record<string, unknown> {
    salesforce: {
        name: string;
    };
}

export function fromSalesforceLightningIconName(name: string): Icon {
    const typedName = name as SalesforceLightningIconName;
    const standardConcept = name.startsWith("standard/")
        ? StandardObjectIconConcepts[name.slice("standard/".length)]
        : undefined;
    return {
        name: UniversalNamesBySalesforceLightning.get(typedName) ?? standardConcept,
        meta: {
            salesforce: { name },
        } satisfies SalesforceLightningIconMeta,
    };
}

export function toSalesforceLightningIconName(icon: Icon): string | undefined {
    const source = icon.meta?.salesforce;
    return typeof source === "object" &&
        source !== null &&
        "name" in source &&
        typeof source.name === "string"
        ? source.name
        : icon.name
          ? getSalesforceLightningIconName(icon.name)
          : undefined;
}
