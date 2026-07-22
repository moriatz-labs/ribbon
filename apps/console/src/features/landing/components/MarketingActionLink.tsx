import type { MarketingAction } from "../types";

export function MarketingActionLink({ action }: { action: MarketingAction }) {
  const variant = action.variant ?? "solid";
  return (
    <a
      className={`marketing-action marketing-action--${variant}`}
      href={action.href}
      {...(action.external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      {action.icon}
      <span>{action.label}</span>
    </a>
  );
}
