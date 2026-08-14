import type { IconName, IconResolver } from "./index.js";

/**
 * Platform symbol names accepted by Expo Symbols' `SymbolView`.
 *
 * This package intentionally does not depend on React Native or Expo. Pass the
 * returned object to `SymbolView.name` in an Expo application.
 */
export interface ExpoSymbol {
    ios: string;
    android: string;
    web: string;
}

const expoSymbols = {
    "archive-box": { ios: "archivebox", android: "archive", web: "archive" },
    "arrow-down": { ios: "arrow.down", android: "arrow_downward", web: "arrow_downward" },
    "arrow-left": { ios: "arrow.left", android: "arrow_back", web: "arrow_back" },
    "arrow-path": { ios: "arrow.clockwise", android: "refresh", web: "refresh" },
    "arrow-right": { ios: "arrow.right", android: "arrow_forward", web: "arrow_forward" },
    "arrow-up": { ios: "arrow.up", android: "arrow_upward", web: "arrow_upward" },
    bell: { ios: "bell", android: "notifications", web: "notifications" },
    "book-open": { ios: "book", android: "menu_book", web: "menu_book" },
    bookmark: { ios: "bookmark", android: "bookmark", web: "bookmark" },
    briefcase: { ios: "briefcase", android: "work", web: "work" },
    "bug-ant": { ios: "ladybug", android: "bug_report", web: "bug_report" },
    calendar: { ios: "calendar", android: "calendar_month", web: "calendar_month" },
    camera: { ios: "camera", android: "photo_camera", web: "photo_camera" },
    "chart-bar": { ios: "chart.bar", android: "bar_chart", web: "bar_chart" },
    check: { ios: "checkmark", android: "check", web: "check" },
    "check-circle": { ios: "checkmark.circle", android: "check_circle", web: "check_circle" },
    "chevron-down": { ios: "chevron.down", android: "expand_more", web: "expand_more" },
    "chevron-left": { ios: "chevron.left", android: "chevron_left", web: "chevron_left" },
    "chevron-right": { ios: "chevron.right", android: "chevron_right", web: "chevron_right" },
    "chevron-up": { ios: "chevron.up", android: "expand_less", web: "expand_less" },
    "circle-stack": { ios: "cylinder.split.1x2", android: "database", web: "database" },
    clock: { ios: "clock", android: "schedule", web: "schedule" },
    cloud: { ios: "cloud", android: "cloud", web: "cloud" },
    cog: { ios: "gearshape", android: "settings", web: "settings" },
    "computer-desktop": { ios: "desktopcomputer", android: "desktop_windows", web: "desktop_windows" },
    cube: { ios: "cube", android: "deployed_code", web: "deployed_code" },
    document: { ios: "doc", android: "description", web: "description" },
    "document-text": { ios: "doc.text", android: "description", web: "description" },
    envelope: { ios: "envelope", android: "mail", web: "mail" },
    "exclamation-triangle": { ios: "exclamationmark.triangle", android: "warning", web: "warning" },
    eye: { ios: "eye", android: "visibility", web: "visibility" },
    "eye-slash": { ios: "eye.slash", android: "visibility_off", web: "visibility_off" },
    flag: { ios: "flag", android: "flag", web: "flag" },
    folder: { ios: "folder", android: "folder", web: "folder" },
    "folder-open": { ios: "folder", android: "folder_open", web: "folder_open" },
    heart: { ios: "heart", android: "favorite", web: "favorite" },
    home: { ios: "house", android: "home", web: "home" },
    "information-circle": { ios: "info.circle", android: "info", web: "info" },
    key: { ios: "key", android: "key", web: "key" },
    link: { ios: "link", android: "link", web: "link" },
    "list-bullet": { ios: "list.bullet", android: "list", web: "list" },
    "lock-closed": { ios: "lock", android: "lock", web: "lock" },
    "lock-open": { ios: "lock.open", android: "lock_open", web: "lock_open" },
    "magnifying-glass": { ios: "magnifyingglass", android: "search", web: "search" },
    map: { ios: "map", android: "map", web: "map" },
    "map-pin": { ios: "mappin", android: "location_on", web: "location_on" },
    microphone: { ios: "microphone", android: "mic", web: "mic" },
    minus: { ios: "minus", android: "remove", web: "remove" },
    "minus-circle": { ios: "minus.circle", android: "remove_circle", web: "remove_circle" },
    moon: { ios: "moon", android: "dark_mode", web: "dark_mode" },
    "paper-airplane": { ios: "paperplane", android: "send", web: "send" },
    "paper-clip": { ios: "paperclip", android: "attach_file", web: "attach_file" },
    pause: { ios: "pause", android: "pause", web: "pause" },
    pencil: { ios: "pencil", android: "edit", web: "edit" },
    "pencil-square": { ios: "square.and.pencil", android: "edit_square", web: "edit_square" },
    phone: { ios: "phone", android: "call", web: "call" },
    photo: { ios: "photo", android: "image", web: "image" },
    play: { ios: "play", android: "play_arrow", web: "play_arrow" },
    plus: { ios: "plus", android: "add", web: "add" },
    "plus-circle": { ios: "plus.circle", android: "add_circle", web: "add_circle" },
    printer: { ios: "printer", android: "print", web: "print" },
    "question-mark-circle": { ios: "questionmark.circle", android: "help", web: "help" },
    share: { ios: "square.and.arrow.up", android: "share", web: "share" },
    star: { ios: "star", android: "star", web: "star" },
    sun: { ios: "sun.max", android: "light_mode", web: "light_mode" },
    tag: { ios: "tag", android: "sell", web: "sell" },
    ticket: { ios: "ticket", android: "confirmation_number", web: "confirmation_number" },
    trash: { ios: "trash", android: "delete", web: "delete" },
    truck: { ios: "truck.box", android: "local_shipping", web: "local_shipping" },
    user: { ios: "person", android: "person", web: "person" },
    "user-group": { ios: "person.3", android: "groups", web: "groups" },
    users: { ios: "person.2", android: "group", web: "group" },
    wrench: { ios: "wrench", android: "build", web: "build" },
    "x-circle": { ios: "xmark.circle", android: "cancel", web: "cancel" },
    "x-mark": { ios: "xmark", android: "close", web: "close" },
} as const satisfies Partial<Record<IconName, ExpoSymbol>>;

export const getExpoSymbol: IconResolver<ExpoSymbol> = (name) =>
    expoSymbols[name as keyof typeof expoSymbols];

export function createExpoSymbolResolver(
    overrides: Partial<Record<IconName, ExpoSymbol>>
): IconResolver<ExpoSymbol> {
    return (name) => overrides[name] ?? getExpoSymbol(name);
}
