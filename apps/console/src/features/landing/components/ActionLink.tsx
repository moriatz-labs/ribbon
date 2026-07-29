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
  return (
    <a
      className={`action-link action-link--${variant}`}
      href={href}
      rel={external ? "noreferrer" : undefined}
      target={external ? "_blank" : undefined}
    >
      <span>{children}</span>
      {icon}
    </a>
  );
}
