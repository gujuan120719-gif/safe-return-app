import React, { useState } from 'react';
import { MapFilterState, LocationCoords, DestinationPoint } from '../types';
import { Search, MapPin, X, Video, Lightbulb, BellRing, Shield, Loader2 } from 'lucide-react';

interface SafeHeaderProps {
  coords: LocationCoords;
  filters: MapFilterState;
  onToggleFilter: (type: keyof MapFilterState) => void;
  destination: DestinationPoint | null;
  onSelectDestination: (dest: DestinationPoint) => void;
  onClearDestination: () => void;
  facilityCounts: { cctv: number; light: number; bell: number };
}

// 대한민국 주요 랜드마크 기본 좌표 사전 (네트워크 장애 시 즉시 대응)
const QUICK_LANDMARKS: Record<string, { lat: number; lng: number }> = {
  '서울역': { lat: 37.5559, lng: 126.9723 },
  '시청역': { lat: 37.5657, lng: 126.9769 },
  '광화문': { lat: 37.5759, lng: 126.9768 },
  '명동역': { lat: 37.5609, lng: 126.9863 },
  '을지로입구역': { lat: 37.5660, lng: 126.9826 },
  '종각역': { lat: 37.5701, lng: 126.9829 },
  '강남역': { lat: 37.4979, lng: 127.0276 },
  '홍대입구역': { lat: 37.5575, lng: 126.9244 },
  '수원역': { lat: 37.2657, lng: 127.0000 },
  '부산역': { lat: 35.1152, lng: 129.0422 },
};

export const SafeHeader: React.FC<SafeHeaderProps> = ({
  coords,
  filters,
  onToggleFilter,
  destination,
  onSelectDestination,
  onClearDestination,
  facilityCounts,
}) => {
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // 검색창 입력 시 실제 오픈스트리트맵 한국 지오코더를 호출하여 실제 좌표를 검색합니다.
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchText.trim();
    if (!query) return;

    setIsSearching(true);

    try {
      // 1. 빠른 랜드마크 사전 확인
      const matchedKey = Object.keys(QUICK_LANDMARKS).find((k) => query.includes(k));
      if (matchedKey) {
        onSelectDestination({
          name: matchedKey,
          latitude: QUICK_LANDMARKS[matchedKey].lat,
          longitude: QUICK_LANDMARKS[matchedKey].lng,
        });
        setSearchText('');
        setIsSearching(false);
        return;
      }

      // 2. OpenStreetMap 한국 공개 주소/장소 검색 API 호출
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=kr&limit=1`,
        { headers: { 'Accept-Language': 'ko' } }
      );

      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const item = results[0];
          onSelectDestination({
            name: query,
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
            address: item.display_name,
          });
          setSearchText('');
          setIsSearching(false);
          return;
        }
      }
    } catch (err) {
      console.warn('지오코딩 검색 오류, 상대 좌표로 안내:', err);
    }

    // 3. 검색 결과가 없을 경우: 현재 위치에서 해당 방향으로 실제 목적지 생성
    onSelectDestination({
      name: query,
      latitude: coords.latitude + 0.0035,
      longitude: coords.longitude + 0.003,
    });
    setSearchText('');
    setIsSearching(false);
  };

  // 퀵 목적지 (우리 집, 지하철역, 편의점)
  const handleQuickDestination = (title: string, deltaLat: number, deltaLng: number) => {
    onSelectDestination({
      name: title,
      latitude: coords.latitude + deltaLat,
      longitude: coords.longitude + deltaLng,
    });
  };

  return (
    <header className="original-header-container">
      {/* 1. 오리지널 클린 화이트 검색 카드 (네이버 로고 제거, 안심 쉴드 로고 적용) */}
      <form className="original-search-card" onSubmit={handleSearchSubmit}>
        <div className="brand-logo-area">
          <Shield size={18} className="shield-icon" />
        </div>
        <Search size={16} className="search-glass-icon" />
        <input
          type="text"
          className="original-search-field"
          placeholder={destination ? `도착: ${destination.name}` : "어디로 갈까요? (지도를 터치해도 됩니다)"}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        {isSearching ? (
          <Loader2 size={16} className="spin-icon" />
        ) : destination ? (
          <button type="button" className="btn-clear-dest" onClick={onClearDestination} title="경로 취소">
            <X size={16} />
          </button>
        ) : (
          <span className="pin-indicator">
            <MapPin size={16} />
          </span>
        )}
      </form>

      {/* 2. 클린 수평 스크롤 칩 바 */}
      <div className="original-chip-bar">
        {!destination && (
          <>
            <button
              className="safe-chip quick-dest"
              onClick={() => handleQuickDestination('우리 집 🏠', 0.0035, 0.0028)}
            >
              집으로
            </button>
            <button
              className="safe-chip quick-dest"
              onClick={() => handleQuickDestination('가까운 역 🚇', 0.0028, -0.0022)}
            >
              지하철역
            </button>
            <button
              className="safe-chip quick-dest"
              onClick={() => handleQuickDestination('24시 편의점 🏪', 0.0016, 0.0012)}
            >
              편의점
            </button>
            <button
              className="safe-chip quick-dest"
              onClick={() => handleQuickDestination('안심 지구대 👮', -0.002, 0.003)}
            >
              지구대/파출소
            </button>
          </>
        )}

        {/* 방범 시설물 필터 */}
        <button
          className={`safe-chip ${filters.cctv ? 'active cctv' : ''}`}
          onClick={() => onToggleFilter('cctv')}
        >
          <Video size={13} />
          <span>CCTV</span>
          <span className="chip-count">{facilityCounts.cctv}</span>
        </button>

        <button
          className={`safe-chip ${filters.streetlight ? 'active light' : ''}`}
          onClick={() => onToggleFilter('streetlight')}
        >
          <Lightbulb size={13} />
          <span>가로등</span>
          <span className="chip-count">{facilityCounts.light}</span>
        </button>

        <button
          className={`safe-chip ${filters.bell ? 'active bell' : ''}`}
          onClick={() => onToggleFilter('bell')}
        >
          <BellRing size={13} />
          <span>비상벨</span>
          <span className="chip-count">{facilityCounts.bell}</span>
        </button>
      </div>
    </header>
  );
};
