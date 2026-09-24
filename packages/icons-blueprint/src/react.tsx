import type { IconName } from "@party-stack/icons";
import { getBlueprintIconSource, IconSize } from "./index.js";
import type { SVGProps } from "react";

export interface BlueprintIconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
    name: IconName;
    size?: IconSize;
}

export function BlueprintIcon({ name, size = IconSize.LARGE, ...props }: BlueprintIconProps) {
    const source = getBlueprintIconSource(name, size);
    return (
        <svg
            aria-hidden={props["aria-label"] ? undefined : true}
            fill="currentColor"
            height={size}
            viewBox={source.viewBox}
            width={size}
            {...props}
        >
            {source.paths.map((path) => (
                <path d={path} key={path} />
            ))}
        </svg>
    );
}
