import { createClient } from '@supabase/supabase-js';
import { SafetyFacility } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Supabase 환경변수가 설정되어 있을 경우 클라이언트 생성
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Supabase 미설정 시 또는 로컬 테스트 시 사용할 폴백 샘플 데이터
export const MOCK_FACILITIES: SafetyFacility[] = [
  {
    id: 'mock-1',
    type: 'CCTV',
    name: '서울시청 광장 방범 CCTV 1호',
    latitude: 37.5668,
    longitude: 126.9784,
    address: '서울특별시 중구 태평로1가',
    safety_weight: 3,
  },
  {
    id: 'mock-2',
    type: 'CCTV',
    name: '덕수궁 대한문 인근 방범 CCTV',
    latitude: 37.5659,
    longitude: 126.9752,
    address: '서울특별시 중구 정동',
    safety_weight: 3,
  },
  {
    id: 'mock-3',
    type: 'STREETLIGHT',
    name: '시청역 1번 출구 고휘도 가로등',
    latitude: 37.5662,
    longitude: 126.9772,
    address: '서울특별시 중구 서소문로',
    safety_weight: 1,
  },
  {
    id: 'mock-4',
    type: 'STREETLIGHT',
    name: '정동길 보행자 조명등 1',
    latitude: 37.5672,
    longitude: 126.9740,
    address: '서울특별시 중구 정동길',
    safety_weight: 1,
  },
  {
    id: 'mock-5',
    type: 'BELL',
    name: '덕수궁 돌담길 여성안심 귀가 비상벨',
    latitude: 37.5665,
    longitude: 126.9745,
    address: '서울특별시 중구 덕수궁길',
    safety_weight: 2,
  },
];

/**
 * 특정 위경도 반경 내의 안전 시설물을 조회합니다.
 * Supabase RPC 함수(get_facilities_within_radius)를 우선 호출하고, 실패하거나 없을 경우 로컬 필터링을 수행합니다.
 */
export async function fetchNearbyFacilities(
  latitude: number,
  longitude: number,
  radiusMeters: number = 1000
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

      // RPC가 없거나 실패 시 일반 테이블 쿼리 시도
      const { data: tableData, error: tableError } = await supabase
        .from('safety_facilities')
        .select('*')
        .limit(100);

      if (!tableError && tableData && tableData.length > 0) {
        return tableData as SafetyFacility[];
      }
    } catch (err) {
      console.warn('Supabase 데이터 조회 오류, 테스트용 목 데이터를 사용합니다:', err);
    }
  }

  // Supabase가 연결되지 않은 경우 로컬 더미 데이터 반환
  return MOCK_FACILITIES;
}
