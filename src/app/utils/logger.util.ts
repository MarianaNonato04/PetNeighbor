import { isDevMode } from '@angular/core';

export function logError(...args: unknown[]): void {
  if (isDevMode()) console.error(...args);
}
