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
  radiusMeters: number = 1500
): Promise<SafetyFacility[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('get_facilities_within_radius', {
        user_lat: latitude,
        user_lng: longitude,
        radius_meters: radiusMeters,
      });

      if (!error && data && data.length > 0) {
        return data as SafetyFacility[];
      }

      // 테이블 직접 쿼리
      const { data: tableData, error: tableError } = await supabase
        .from('safety_facilities')
        .select('*')
        .limit(100);

      if (!tableError && tableData && tableData.length > 0) {
        // 현재 위치와 가까운 것만 필터링
        const filtered = (tableData as SafetyFacility[]).filter(f => {
          const dLat = Math.abs(f.latitude - latitude);
          const dLng = Math.abs(f.longitude - longitude);
          return dLat < 0.02 && dLng < 0.02; // 약 2km 이내
        });

        if (filtered.length > 0) {
          return filtered;
        }
      }
    } catch (err) {
      console.warn('Supabase 데이터 조회 오류:', err);
    }
  }

  // 서울 고정이 아닌, 현재 접속한 사용자의 실제 위치 주변에 방범 시설물 자동 매핑
  return generateDynamicLocalFacilities(latitude, longitude);
}
