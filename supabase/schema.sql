-- ==============================================================================
-- 🛡️ 안심 귀가 내비게이션 - Supabase 데이터베이스 스키마 및 초기 데이터 설정
-- ==============================================================================

-- 1. 안전 시설물 테이블 (CCTV, 가로등/보안등, 안심벨)
CREATE TABLE IF NOT EXISTS public.safety_facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('CCTV', 'STREETLIGHT', 'BELL')),
    name VARCHAR(100),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address TEXT,
    safety_weight INT DEFAULT 1, -- 가중치 (CCTV: 3, 가로등: 1, 비상벨: 2)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. 위치 검색 최적화를 위한 B-Tree / 복합 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_safety_facilities_coords 
ON public.safety_facilities(latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_safety_facilities_type 
ON public.safety_facilities(type);

-- 3. RLS (Row Level Security) 설정 - 모바일 앱/웹에서 누구나 읽기 허용
ALTER TABLE public.safety_facilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read access on safety_facilities"
ON public.safety_facilities
FOR SELECT
TO anon, authenticated
USING (true);

-- 4. 반경 검색 RPC 함수 (Haversine 공식 기반, 특정 위경도 기준 반경 N미터 내 시설물 조회)
CREATE OR REPLACE FUNCTION get_facilities_within_radius(
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION,
    radius_meters DOUBLE PRECISION
)
RETURNS TABLE (
    id UUID,
    type VARCHAR,
    name VARCHAR,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    address TEXT,
    safety_weight INT,
    distance_meters DOUBLE PRECISION
)
LANGUAGE sql
AS $$
    SELECT 
        f.id,
        f.type,
        f.name,
        f.latitude,
        f.longitude,
        f.address,
        f.safety_weight,
        (
            6371000 * acos(
                cos(radians(user_lat)) * cos(radians(f.latitude)) *
                cos(radians(f.longitude) - radians(user_lng)) +
                sin(radians(user_lat)) * sin(radians(f.latitude))
            )
        ) AS distance_meters
    FROM public.safety_facilities f
    WHERE (
        6371000 * acos(
            cos(radians(user_lat)) * cos(radians(f.latitude)) *
            cos(radians(f.longitude) - radians(user_lng)) +
            sin(radians(user_lat)) * sin(radians(f.latitude))
        )
    ) <= radius_meters
    ORDER BY distance_meters ASC;
$$;

-- 5. 테스트용 샘플 데이터 (서울 시청 및 덕수궁 주변 테스트용)
INSERT INTO public.safety_facilities (type, name, latitude, longitude, address, safety_weight)
VALUES
    ('CCTV', '서울시청 광장 방범 CCTV 1호', 37.5668, 126.9784, '서울특별시 중구 태평로1가', 3),
    ('CCTV', '덕수궁 대한문 인근 방범 CCTV', 37.5659, 126.9752, '서울특별시 중구 정동', 3),
    ('STREETLIGHT', '시청역 1번 출구 고휘도 가로등', 37.5662, 126.9772, '서울특별시 중구 서소문로', 1),
    ('STREETLIGHT', '정동길 보행자 조명등 1', 37.5672, 126.9740, '서울특별시 중구 정동길', 1),
    ('STREETLIGHT', '정동길 보행자 조명등 2', 37.5680, 126.9735, '서울특별시 중구 정동길', 1),
    ('BELL', '덕수궁 돌담길 여성안심 귀가 비상벨', 37.5665, 126.9745, '서울특별시 중구 덕수궁길', 2);
