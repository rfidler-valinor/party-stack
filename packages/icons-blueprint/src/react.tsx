import { Icon, type IconProps } from "@blueprintjs/core";
import type { IconName } from "@party-stack/icons";
import { BlueprintIconRotations, getBlueprintIconName } from "./index.js";

export interface BlueprintIconProps extends Omit<IconProps, "icon"> {
    name: IconName;
}

export function BlueprintIcon({ name, style, ...props }: BlueprintIconProps) {
    const rotation = BlueprintIconRotations[name as keyof typeof BlueprintIconRotations];
    const transform = [style?.transform, rotation ? `rotate(${rotation}deg)` : undefined]
        .filter(Boolean)
        .join(" ");

    return (
        <Icon
            icon={getBlueprintIconName(name)}
            style={transform ? { ...style, transform } : style}
            {...props}
        />
    );
}
