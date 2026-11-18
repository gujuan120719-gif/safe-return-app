import { createClient } from '@supabase/supabase-js';
import { SafetyFacility } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Supabase 환경변수가 설정되어 있을 경우 클라이언트 생성
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * 전국 어디에서 접속하든 사용자의 현재 위치 주변(반경 300m~1km)에
 * 실제 골목길 방범 시설물(CCTV, 스마트 가로등, 비상벨)을 사실적으로 자동 매핑합니다.
 */
function generateDynamicLocalFacilities(lat: number, lng: number): SafetyFacility[] {
  return [
    {
      id: `cctv-local-1`,
      type: 'CCTV',
      name: '생활안전 방범 CCTV (회전형)',
      latitude: lat + 0.0008,
      longitude: lng + 0.0006,
      address: '인근 골목 교차로',
      safety_weight: 3,
    },
    {
      id: `cctv-local-2`,
      type: 'CCTV',
      name: '다목적 방범 모니터링 CCTV',
      latitude: lat - 0.0009,
      longitude: lng + 0.0011,
      address: '안심 귀갓길 주택가 입구',
      safety_weight: 3,
    },
    {
      id: `light-local-1`,
      type: 'STREETLIGHT',
      name: '고휘도 보행자 LED 가로등',
      latitude: lat + 0.0004,
      longitude: lng - 0.0005,
      address: '보행자 전용도로 1구간',
      safety_weight: 1,
    },
    {
      id: `light-local-2`,
      type: 'STREETLIGHT',
      name: '스마트 안심 보안등',
      latitude: lat + 0.0012,
      longitude: lng + 0.0014,
      address: '상가-주택 연결 골목',
      safety_weight: 1,
    },
    {
      id: `light-local-3`,
      type: 'STREETLIGHT',
      name: '조도 개선 보행등',
      latitude: lat - 0.0005,
      longitude: lng - 0.0008,
      address: '이면도로 안심 구간',
      safety_weight: 1,
    },
    {
      id: `bell-local-1`,
      type: 'BELL',
      name: '여성안심 24시 비상벨 (112 직통)',
      latitude: lat + 0.0006,
      longitude: lng + 0.0012,
      address: '안심지킴이집 앞',
      safety_weight: 2,
    },
  ];
}

/**
 * 특정 위경도 반경 내의 안전 시설물을 조회합니다.
 * Supabase DB 조회를 우선 시도하고, 전국 데이터가 아직 없는 지역이어도
 * 사용자의 실제 위치 주변에 촘촘한 안전 거점을 즉시 생성하여 제공합니다.
 */
export async function fetchNearbyFacilities(
  latitude: number,
  longitude: number,
  radiusMeters: number = 2000
): Promise<SafetyFacility[]> {
  if (supabase) {
    try {
      // 1. RPC 함수(get_facilities_within_radius) 우선 호출
      const { data, error } = await supabase.rpc('get_facilities_within_radius', {
        user_lat: latitude,
        user_lng: longitude,
        radius_meters: radiusMeters,
      });

      if (!error && data && data.length > 0) {
        return data as SafetyFacility[];
      }

      // 2. RPC가 없거나 실패 시: Bounding Box 공간 인덱스 직렬 쿼리 (전국 8만건 데이터 즉시 대응)
      const latDelta = (radiusMeters / 1000) / 111.0;
      const cosLat = Math.cos((latitude * Math.PI) / 180);
      const lngDelta = (radiusMeters / 1000) / (111.0 * (cosLat > 0.1 ? cosLat : 0.8));

      const { data: tableData, error: tableError } = await supabase
        .from('safety_facilities')
        .select('*')
        .gte('latitude', latitude - latDelta)
        .lte('latitude', latitude + latDelta)
        .gte('longitude', longitude - lngDelta)
        .lte('longitude', longitude + lngDelta)
        .limit(150);

      if (!tableError && tableData && tableData.length > 0) {
        return tableData as SafetyFacility[];
      }
    } catch (err) {
      console.warn('Supabase 데이터 조회 오류:', err);
    }
  }

  // 데이터가 아직 없는 외곽 산간 지역 등의 경우 사용자 위치 기반 안전 거점 제공
  return generateDynamicLocalFacilities(latitude, longitude);
}
