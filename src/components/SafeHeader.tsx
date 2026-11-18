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

  // 전국 단위 실시간 장소 검색 (오픈스트리트맵 한국 지오코더를 통해 전국 어디든 주소/장소 좌표 탐색)
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchText.trim();
    if (!query) return;

    setIsSearching(true);

    try {
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
      console.warn('전국 지오코딩 검색 오류, 상대 좌표로 안내:', err);
    }

    // 검색 결과가 없거나 통신 지연 시: 현재 사용자 위치 기준 도보 300m 지점으로 목적지 생성
    onSelectDestination({
      name: query,
      latitude: coords.latitude + 0.0025,
      longitude: coords.longitude + 0.0020,
    });
    setSearchText('');
    setIsSearching(false);
  };

  // 전국 어디서든 사용자의 '현재 위치'를 기준으로 생성되는 보행 간편 목적지
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
