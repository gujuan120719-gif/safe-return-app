/**
 * 위도, 경도 간의 실제 거리(미터)를 계산합니다 (Haversine 공식)
 */
export function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // 지구 반지름 (m)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * 미터 단위를 읽기 쉬운 문자열(m 또는 km)로 포맷합니다.
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * 도보 소요 시간(분)을 계산하여 포맷합니다. (평균 보행 속도 시속 4km = 분당 약 67m)
 */
export function calculateWalkingTime(meters: number): { minutes: number; text: string } {
  const minutes = Math.max(1, Math.round(meters / 67));
  if (minutes < 60) {
    return { minutes, text: `${minutes}분` };
  }
  const hours = Math.floor(minutes / 60);
  const remainMins = minutes % 60;
  return { minutes, text: remainMins > 0 ? `${hours}시간 ${remainMins}분` : `${hours}시간` };
}
