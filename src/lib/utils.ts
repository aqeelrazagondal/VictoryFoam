import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toTelNumber(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

export function toTelHref(phone: string) {
  return `tel:${toTelNumber(phone)}`;
}
