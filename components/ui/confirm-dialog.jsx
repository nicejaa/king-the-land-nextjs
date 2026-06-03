"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "components/ui/alert-dialog";
import { LoadingSpinner } from "components/ui/loading-screen";

/**
 * @param {{
 *   open: boolean;
 *   onOpenChange: (open: boolean) => void;
 *   title?: string;
 *   description?: string;
 *   onConfirm: () => void | Promise<void>;
 *   loading?: boolean;
 *   variant?: "default" | "destructive";
 * }} props
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title = "ยืนยันการดำเนินการ",
  description = "คุณต้องการดำเนินการนี้หรือไม่?",
  onConfirm,
  loading = false,
  variant = "destructive",
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className={
              variant === "destructive"
                ? "bg-destructive text-white hover:bg-destructive/90"
                : ""
            }
          >
            {loading && <LoadingSpinner className="mr-2" />}
            ยืนยัน
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
