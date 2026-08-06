import type { ReactNode } from "react";

import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";
import { ToastProvider } from "./toast-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        {children}
        {/* Inside ThemeProvider — it reads resolvedTheme. */}
        <ToastProvider />
      </QueryProvider>
    </ThemeProvider>
  );
}
