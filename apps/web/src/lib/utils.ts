import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Evita crashes cuando la API devuelve null/objeto en lugar de array. */
export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : []
}
