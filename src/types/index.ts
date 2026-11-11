export type FacilityType = 'CCTV' | 'STREETLIGHT' | 'BELL';

export interface SafetyFacility {
  id: string;
  type: FacilityType;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  safety_weight: number;
  distance_meters?: number;
}

export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number | null;
  speed?: number | null;
}

export interface MapFilterState {
  cctv: boolean;
  streetlight: boolean;
  bell: boolean;
}

export interface DestinationPoint {
  latitude: number;
  longitude: number;
  name: string;
}

export type RouteType = 'safe' | 'shortest';

export interface RouteOption {
  id: RouteType;
  title: string;
  badge: string;
  isSafePriority: boolean;
  distanceMeter: number;
  durationMinutes: number;
  safetyScore: number; // 0 ~ 100
  cctvCount: number;
  lightCount: number;
  dangerSectionCount: number;
  description: string;
}
