import type { ReactNode } from "react";

interface ActionLinkProps {
  children: ReactNode;
  external?: boolean;
  href: string;
  icon?: ReactNode;
  variant?: "primary" | "outline" | "ghost";
}

export function ActionLink({
  children,
  external = false,
  href,
  icon,
  variant = "primary",
}: ActionLinkProps) {
  const className = [
    "action-link",
    `action-link--${variant}`,
    icon ? "action-link--with-icon" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <a
      className={className}
      href={href}
      rel={external ? "noopener noreferrer" : undefined}
      target={external ? "_blank" : undefined}
    >
      <span>{children}</span>
      {icon ? <span className="action-link__icon">{icon}</span> : null}
    </a>
  );
}
