"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "components/ui/sheet";
import { Sidebar } from "./Sidebar";

export function MobileSidebar({ open, onOpenChange }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="p-0 w-64">
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>
        <Sidebar className="border-none h-full" />
      </SheetContent>
    </Sheet>
  );
}
