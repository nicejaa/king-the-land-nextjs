"use client";

import { SessionProvider } from "./session-provider";
import { Toaster } from "sonner";

export function Providers({ children }) {
  return (
    <SessionProvider>
      {children}
      <Toaster richColors position="top-right" />
    </SessionProvider>
  );
}
