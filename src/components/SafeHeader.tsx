import React, { useState } from 'react';
import { MapFilterState, LocationCoords, DestinationPoint } from '../types';
import { Search, MapPin, X, Video, Lightbulb, BellRing } from 'lucide-react';

interface SafeHeaderProps {
  coords: LocationCoords;
  filters: MapFilterState;
  onToggleFilter: (type: keyof MapFilterState) => void;
  destination: DestinationPoint | null;
  onSelectDestination: (dest: DestinationPoint) => void;
  onClearDestination: () => void;
  facilityCounts: { cctv: number; light: number; bell: number };
}

// 대표 주요 역 및 장소 좌표 사전 (빠른 목적지 검색 지원)
const POPULAR_PLACES: Record<string, { lat: number; lng: number }> = {
  '강남역': { lat: 37.4979, lng: 127.0276 },
  '홍대입구역': { lat: 37.5575, lng: 126.9244 },
  '서울역': { lat: 37.5559, lng: 126.9723 },
  '잠실역': { lat: 37.5133, lng: 127.1001 },
  '수원역': { lat: 37.2657, lng: 127.0000 },
  '부산역': { lat: 35.1152, lng: 129.0422 },
  '동대구역': { lat: 35.8799, lng: 128.6285 },
  '대전역': { lat: 36.3323, lng: 127.4342 },
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchText.trim();
    if (!query) return;

    // 1. 등록된 주요 장소 검색
    const foundPlace = Object.keys(POPULAR_PLACES).find((p) => query.includes(p));
    if (foundPlace) {
      onSelectDestination({
        name: foundPlace,
        latitude: POPULAR_PLACES[foundPlace].lat,
        longitude: POPULAR_PLACES[foundPlace].lng,
      });
      setSearchText('');
      return;
    }

    // 2. 일반 검색: 현재 위치에서 북동쪽 약 800m 떨어진 실제 거리로 목적지 계산
    onSelectDestination({
      name: query,
      latitude: coords.latitude + 0.0055,
      longitude: coords.longitude + 0.0045,
    });
    setSearchText('');
  };

  // 네이버 지도 스타일 퀵 목적지
  const handleQuickDestination = (title: string, deltaLat: number, deltaLng: number) => {
    onSelectDestination({
      name: title,
      latitude: coords.latitude + deltaLat,
      longitude: coords.longitude + deltaLng,
    });
  };

  return (
    <header className="naver-header-container">
      {/* 1. 네이버 지도 화이트 플로팅 검색바 */}
      <form className="naver-search-card" onSubmit={handleSearchSubmit}>
        <div className="search-logo">
          <span className="naver-n-logo">N</span>
        </div>
        <Search size={18} className="search-glass-icon" />
        <input
          type="text"
          className="naver-search-field"
          placeholder={destination ? `도착: ${destination.name}` : "장소, 버스, 지하철 또는 도로명 검색"}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        {destination ? (
          <button type="button" className="btn-naver-clear" onClick={onClearDestination} title="경로 취소">
            <X size={16} />
          </button>
        ) : (
          <span className="naver-pin-icon">
            <MapPin size={16} color="#03C75A" />
          </span>
        )}
      </form>

      {/* 2. 네이버 지도 스타일 수평 스크롤 필터 칩 */}
      <div className="naver-chip-bar">
        {!destination && (
          <>
            <button
              className="naver-chip quick-dest"
              onClick={() => handleQuickDestination('우리 집 🏠', 0.0042, 0.0035)}
            >
              집으로
            </button>
            <button
              className="naver-chip quick-dest"
              onClick={() => handleQuickDestination('가까운 지하철역 🚇', 0.0032, -0.0028)}
            >
              지하철역
            </button>
            <button
              className="naver-chip quick-dest"
              onClick={() => handleQuickDestination('안심 편의점 🏪', 0.0018, 0.0015)}
            >
              24시 편의점
            </button>
          </>
        )}

        <button
          className={`naver-chip ${filters.cctv ? 'active' : ''}`}
          onClick={() => onToggleFilter('cctv')}
        >
          <Video size={13} />
          <span>CCTV</span>
          <span className="chip-count">{facilityCounts.cctv}</span>
        </button>

        <button
          className={`naver-chip ${filters.streetlight ? 'active' : ''}`}
          onClick={() => onToggleFilter('streetlight')}
        >
          <Lightbulb size={13} />
          <span>가로등</span>
          <span className="chip-count">{facilityCounts.light}</span>
        </button>

        <button
          className={`naver-chip ${filters.bell ? 'active' : ''}`}
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
