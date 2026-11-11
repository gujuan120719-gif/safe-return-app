import React from 'react';
import { MapFilterState, LocationCoords } from '../types';
import { ShieldCheck, Video, Lightbulb, BellRing } from 'lucide-react';

interface SafeHeaderProps {
  coords: LocationCoords;
  filters: MapFilterState;
  onToggleFilter: (type: keyof MapFilterState) => void;
  isSimulating: boolean;
}

export const SafeHeader: React.FC<SafeHeaderProps> = ({
  coords,
  filters,
  onToggleFilter,
  isSimulating,
}) => {
  return (
    <header className="safe-header">
      <div className="header-top">
        <div className="title-area">
          <div className="logo-badge">
            <ShieldCheck size={20} color="#10B981" />
            <span className="app-title">안심 귀가 내비</span>
          </div>
          <span className="gps-status">
            {isSimulating ? '🎮 가상 보행 모드' : `📍 ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`}
          </span>
        </div>

        <div className="safety-badge">
          <span className="pulse-dot"></span>
          안심 방범 감시 중
        </div>
      </div>

      {/* 방범 시설물 필터 태그 */}
      <div className="filter-tags">
        <button
          className={`filter-btn ${filters.cctv ? 'active cctv' : ''}`}
          onClick={() => onToggleFilter('cctv')}
        >
          <Video size={14} /> CCTV
        </button>
        <button
          className={`filter-btn ${filters.streetlight ? 'active light' : ''}`}
          onClick={() => onToggleFilter('streetlight')}
        >
          <Lightbulb size={14} /> 가로등
        </button>
        <button
          className={`filter-btn ${filters.bell ? 'active bell' : ''}`}
          onClick={() => onToggleFilter('bell')}
        >
          <BellRing size={14} /> 비상벨
        </button>
      </div>
    </header>
  );
};
