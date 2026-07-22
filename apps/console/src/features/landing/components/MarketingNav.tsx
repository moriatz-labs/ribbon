import type { ReactNode } from "react";
import type { MarketingAction } from "../types";
import { MarketingActionLink } from "./MarketingActionLink";

export function MarketingNav({ brand, items }: { brand: ReactNode; items: MarketingAction[] }) {
  return (
    <header className="marketing-nav-shell">
      <nav className="marketing-nav" aria-label="Primary navigation">
        <div className="marketing-nav__brand">{brand}</div>
        <div className="marketing-nav__items">
          {items.map((item) => <MarketingActionLink action={item} key={item.href} />)}
        </div>
      </nav>
    </header>
  );
}
