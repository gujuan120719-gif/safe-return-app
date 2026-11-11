import React, { useState } from 'react';
import { MapFilterState, LocationCoords, DestinationPoint } from '../types';
import { Search, MapPin, X, Video, Lightbulb, BellRing, Navigation } from 'lucide-react';

interface SafeHeaderProps {
  coords: LocationCoords;
  filters: MapFilterState;
  onToggleFilter: (type: keyof MapFilterState) => void;
  destination: DestinationPoint | null;
  onSelectDestination: (dest: DestinationPoint) => void;
  onClearDestination: () => void;
}

export const SafeHeader: React.FC<SafeHeaderProps> = ({
  coords,
  filters,
  onToggleFilter,
  destination,
  onSelectDestination,
  onClearDestination,
}) => {
  const [searchText, setSearchText] = useState('');

  // 검색창 입력 후 엔터 쳤을 때
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchText.trim()) return;

    // 현재 위치 기준 북동쪽 약 600m 지점에 목적지 생성 (실제 API 검색 전 모의 검색)
    onSelectDestination({
      name: searchText,
      latitude: coords.latitude + 0.0035,
      longitude: coords.longitude + 0.0025,
    });
    setSearchText('');
  };

  // 네이버 지도 스타일 원클릭 간편 목적지
  const handleQuickDestination = (title: string, deltaLat: number, deltaLng: number) => {
    onSelectDestination({
      name: title,
      latitude: coords.latitude + deltaLat,
      longitude: coords.longitude + deltaLng,
    });
  };

  return (
    <header className="naver-style-header">
      {/* 1. 네이버 지도 스타일 플로팅 검색창 */}
      <form className="naver-search-box" onSubmit={handleSearchSubmit}>
        <Search size={18} className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder={destination ? `목적지: ${destination.name}` : "어디로 갈까요? (지도를 터치해도 됩니다)"}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        {destination ? (
          <button type="button" className="clear-dest-btn" onClick={onClearDestination} title="목적지 취소">
            <X size={16} />
          </button>
        ) : (
          <span className="search-hint">
            <MapPin size={14} />
          </span>
        )}
      </form>

      {/* 2. 빠른 목적지 칩 & 방범 시설 필터 (네이버 지도 스타일) */}
      <div className="quick-chips-scroll">
        {!destination && (
          <>
            <button
              className="quick-chip destination-chip"
              onClick={() => handleQuickDestination('우리 집 🏠', 0.0032, 0.0022)}
            >
              🏠 우리 집
            </button>
            <button
              className="quick-chip destination-chip"
              onClick={() => handleQuickDestination('가까운 지하철역 🚇', 0.0025, -0.0018)}
            >
              🚇 지하철역
            </button>
            <button
              className="quick-chip destination-chip"
              onClick={() => handleQuickDestination('24시 편의점 🏪', 0.0015, 0.0012)}
            >
              🏪 편의점
            </button>
          </>
        )}

        {/* 시설물 필터 */}
        <button
          className={`quick-chip filter ${filters.cctv ? 'active cctv' : ''}`}
          onClick={() => onToggleFilter('cctv')}
        >
          <Video size={13} /> CCTV
        </button>
        <button
          className={`quick-chip filter ${filters.streetlight ? 'active light' : ''}`}
          onClick={() => onToggleFilter('streetlight')}
        >
          <Lightbulb size={13} /> 가로등
        </button>
        <button
          className={`quick-chip filter ${filters.bell ? 'active bell' : ''}`}
          onClick={() => onToggleFilter('bell')}
        >
          <BellRing size={13} /> 비상벨
        </button>
      </div>
    </header>
  );
};
