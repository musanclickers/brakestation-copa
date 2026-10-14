import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export { Logo } from './Logo';
export { PhotoUpload, type PhotoUploadProps } from './PhotoUpload';
export { ClientSelector, type Client, type ClientSelectorProps } from './ClientSelector';
