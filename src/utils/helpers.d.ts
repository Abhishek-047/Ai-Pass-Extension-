import { type ClassValue } from 'clsx';
export declare function cn(...inputs: ClassValue[]): string;
export declare function getDomainFromUrl(url: string): string;
export declare function getFaviconUrl(website: string): string;
export declare function formatDate(timestamp: number): string;
export declare function timeAgo(timestamp: number): string;
export declare function maskPassword(password: string): string;
/** Copy text to clipboard and optionally auto-clear after N seconds */
export declare function copyToClipboard(text: string, clearAfterSeconds?: number): Promise<void>;
export declare function getStrengthColor(score: number): string;
export declare function getStrengthLabel(score: number): string;
export declare function getCategoryIcon(category: string): string;
export declare function getCardBrandIcon(brand: string): string;
