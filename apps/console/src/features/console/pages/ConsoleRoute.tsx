import { TooltipProvider } from "../../../components/ui/Tooltip";
import { ConsolePage } from "./ConsolePage";

export function ConsoleRoute() {
  return (
    <TooltipProvider delayDuration={300}>
      <ConsolePage />
    </TooltipProvider>
  );
}
