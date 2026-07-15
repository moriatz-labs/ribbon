import type { ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { Tooltip } from "./ui/Tooltip";

export function IconButton({
  icon: Icon,
  label,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string }) {
  return (
    <Tooltip label={label}>
      <button className="icon-button" type="button" {...props}>
        <Icon aria-hidden="true" size={17} />
        <span className="sr-only">{label}</span>
      </button>
    </Tooltip>
  );
}

