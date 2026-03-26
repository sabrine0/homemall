export type MapLatLng = {
  lat: number;
  lng: number;
};

export const MOROCCO_BOUNDS = {
  north: 36.2,
  south: 20.5,
  west: -17.5,
  east: -0.8,
};

export const MOROCCO_CENTER: MapLatLng = { lat: 31.7917, lng: -7.0926 };

export const MOROCCO_MAP_MASK_FILL = "#edf3f0";
export const MOROCCO_MAP_OUTLINE = "#8fb7a0";
export const MOROCCO_SOUTH_REGION_MASK_FILL = "#f3eee0";

// Rough outline used to visually isolate Morocco on both Google Maps and Leaflet.
// It is intentionally simplified for UI masking rather than cartographic precision.
export const MOROCCO_OUTLINE_PATH: MapLatLng[] = [
  { lat: 35.92, lng: -5.98 },
  { lat: 35.62, lng: -5.2 },
  { lat: 35.4, lng: -4.2 },
  { lat: 35.24, lng: -3.1 },
  { lat: 35.08, lng: -2.15 },
  { lat: 34.68, lng: -1.75 },
  { lat: 33.45, lng: -1.1 },
  { lat: 31.95, lng: -1.0 },
  { lat: 30.45, lng: -2.05 },
  { lat: 29.25, lng: -4.4 },
  { lat: 28.15, lng: -8.65 },
  { lat: 27.55, lng: -8.67 },
  { lat: 26.7, lng: -10.45 },
  { lat: 25.45, lng: -12.25 },
  { lat: 23.9, lng: -15.0 },
  { lat: 20.82, lng: -17.1 },
  { lat: 21.05, lng: -16.3 },
  { lat: 22.25, lng: -15.9 },
  { lat: 23.6, lng: -15.0 },
  { lat: 25.2, lng: -14.25 },
  { lat: 26.65, lng: -13.2 },
  { lat: 28.05, lng: -11.7 },
  { lat: 29.35, lng: -10.35 },
  { lat: 30.55, lng: -9.55 },
  { lat: 31.65, lng: -9.35 },
  { lat: 32.55, lng: -9.0 },
  { lat: 33.5, lng: -8.8 },
  { lat: 34.2, lng: -7.55 },
  { lat: 34.95, lng: -6.3 },
  { lat: 35.54, lng: -5.98 },
  { lat: 35.92, lng: -5.98 },
];

export const WORLD_MASK_PATH: MapLatLng[] = [
  { lat: 85, lng: -179.9 },
  { lat: 85, lng: 179.9 },
  { lat: -85, lng: 179.9 },
  { lat: -85, lng: -179.9 },
];

export const MOROCCO_SOUTH_REGION_MASK_PATH: MapLatLng[] = [
  { lat: 28.65, lng: -17.5 },
  { lat: 28.65, lng: -8.1 },
  { lat: 20.5, lng: -8.1 },
  { lat: 20.5, lng: -17.5 },
];
