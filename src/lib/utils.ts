import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function publicationStatusLabel(status?: number | string | null) {
  const n = typeof status === "string" ? Number(status) : status;
  switch (n) {
    case 0:
      return "Chưa xuất bản";
    case 1:
      return "Đã xuất bản";
    case 2:
      return "Đang lưu";
    case 3:
      return "Pending";
    default:
      return "Chưa xác định";
  }
}
