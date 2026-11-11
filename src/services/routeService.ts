import { SafetyFacility, RouteOption } from '../types';

/**
 * 방범 안전 시설물(CCTV, 가로등, 비상벨) 밀집도를 반영하여
 * [안심 추천 우회로]와 [최단 지름길] 2가지 경로 정보를 비교 산출합니다.
 */
export function calculateRouteComparison(
  facilities: SafetyFacility[],
  baseDistanceMeters: number = 780
): { safeRoute: RouteOption; shortestRoute: RouteOption } {
  const cctvCount = facilities.filter((f) => f.type === 'CCTV').length;
  const lightCount = facilities.filter((f) => f.type === 'STREETLIGHT').length;
  const bellCount = facilities.filter((f) => f.type === 'BELL').length;

  // 1. 안심 우회로 (가로등/CCTV 밀집 대로변 경유)
  // 거리는 약 1.3배 길지만, 안전 점수는 매우 높음
  const safeDistance = Math.round(baseDistanceMeters * 1.25);
  const safeDuration = Math.round(safeDistance / 65); // 보행 평균 속도 (분당 약 65m)
  const safeScore = Math.min(
    98,
    Math.round(60 + cctvCount * 5 + lightCount * 2 + bellCount * 4)
  );

  const safeRoute: RouteOption = {
    id: 'safe',
    title: '안심 귀가 우회로',
    badge: '추천',
    isSafePriority: true,
    distanceMeter: safeDistance,
    durationMinutes: safeDuration,
    safetyScore: safeScore,
    cctvCount: cctvCount,
    lightCount: lightCount,
    dangerSectionCount: 0,
    description: '조도 높은 큰길과 방범 구역 위주로 안전하게 안내합니다.',
  };

  // 2. 최단 지름길 (어두운 골목 및 사각지대 관통)
  // 시간은 가장 빠르지만, 안전 점수가 낮고 위험 구역 존재
  const shortestDistance = Math.round(baseDistanceMeters * 0.75);
  const shortestDuration = Math.round(shortestDistance / 65);
  const shortestScore = Math.max(
    25,
    Math.round(45 - 15) // 사각지대 감점
  );

  const shortestRoute: RouteOption = {
    id: 'shortest',
    title: '최단 지름길',
    badge: '빠름',
    isSafePriority: false,
    distanceMeter: shortestDistance,
    durationMinutes: shortestDuration,
    safetyScore: shortestScore,
    cctvCount: Math.min(1, cctvCount),
    lightCount: Math.min(2, lightCount),
    dangerSectionCount: 2,
    description: '가장 빠르지만 CCTV 사각지대와 어두운 골목길 2곳을 지납니다.',
  };

  return { safeRoute, shortestRoute };
}
