/**
 * Which iPad this is. Chosen once on each device and remembered there, so the
 * Tap Log can say whether a tap came from the Front Counter or the Drive Thru.
 */

import type { Station } from './backend';

export const STATIONS: Station[] = ['Front Counter', 'Drive Thru'];

const KEY = 'cfa-counter:station';

export function loadStation(): Station | null {
  try {
    const value = localStorage.getItem(KEY);
    return STATIONS.includes(value as Station) ? (value as Station) : null;
  } catch {
    return null;
  }
}

export function saveStation(station: Station): void {
  try {
    localStorage.setItem(KEY, station);
  } catch {
    // Private browsing. It will ask again next time, which is all that costs.
  }
}
