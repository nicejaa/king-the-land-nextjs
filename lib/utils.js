import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes safely
 * @param {...any} inputs
 * @returns {string}
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency in THB
 * @param {number} value
 * @returns {string}
 */
export function formatCurrency(value) {
  if (value == null) return "-";
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  }).format(value);
}

/**
 * Format date to readable string
 * @param {string | Date} date
 * @returns {string}
 */
export function formatDate(date) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

/**
 * Format datetime to readable string
 * @param {string | Date} date
 * @returns {string}
 */
export function formatDateTime(date) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

/**
 * Build query string from params object
 * @param {Record<string, any>} params
 * @returns {string}
 */
export function buildQueryString(params) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "all") {
      searchParams.set(key, String(value));
    }
  });
  return searchParams.toString();
}

/**
 * Sleep for given milliseconds
 * @param {number} ms
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate initials from a name
 * @param {string} name
 * @returns {string}
 */
export function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

/**
 * Truncate text to given length
 * @param {string} text
 * @param {number} length
 * @returns {string}
 */
export function truncate(text, length = 50) {
  if (!text) return "";
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}
