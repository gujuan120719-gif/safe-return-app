import React from 'react';
import { SafetyFacility, RouteType, DestinationPoint, LocationCoords } from '../types';
import { getDistanceMeters, formatDistance, calculateWalkingTime } from '../utils/geo';
import {
  AlertTriangle,
  ShieldCheck,
  Zap,
  CheckCircle2,
  X,
  Navigation,
  MapPin,
  ChevronRight,
} from 'lucide-react';

interface ControlPanelProps {
  startCoords: LocationCoords;
  destination: DestinationPoint | null;
  onClearDestination: () => void;
  selectedFacility: SafetyFacility | null;
  onCloseFacility: () => void;
  showRoutes: boolean;
  onToggleRoutes: () => void;
  selectedRouteType: RouteType;
  onSelectRouteType: (type: RouteType) => void;
  onTriggerDangerAlert: () => void;
  facilities: SafetyFacility[];
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  startCoords,
  destination,
  onClearDestination,
  selectedFacility,
  onCloseFacility,
  showRoutes,
  onToggleRoutes,
  selectedRouteType,
  onSelectRouteType,
  onTriggerDangerAlert,
  facilities,
}) => {
  // 실제 두 지점 간의 거리(m) 동적 계산
  const baseDistance = destination
    ? getDistanceMeters(
        startCoords.latitude,
        startCoords.longitude,
        destination.latitude,
        destination.longitude
      )
    : 0;

  // 1. 최단 지름길 실제 거리 및 도보 시간
  const shortestDist = baseDistance;
  const shortestTime = calculateWalkingTime(shortestDist);

  // 2. 안심 우회로 실제 거리(약 1.25배 우회) 및 도보 시간
  const safeDist = Math.round(baseDistance * 1.25);
  const safeTime = calculateWalkingTime(safeDist);

  // 주변 시설물 수치
  const cctvCount = facilities.filter((f) => f.type === 'CCTV').length;
  const lightCount = facilities.filter((f) => f.type === 'STREETLIGHT').length;

  return (
    <div className="naver-bottom-sheet">
      {/* 1. 시설물 마커 터치 시 나타나는 상세 팝업 */}
      {selectedFacility && (
        <div className="naver-facility-popup">
          <div className="popup-top">
            <span className="facility-tag">
              {selectedFacility.type === 'CCTV'
                ? '방범 CCTV'
                : selectedFacility.type === 'STREETLIGHT'
                ? '가로등 / 보안등'
                : '비상벨'}
            </span>
            <button className="popup-close-btn" onClick={onCloseFacility}>
              <X size={15} />
            </button>
          </div>
          <h4 className="popup-title">{selectedFacility.name}</h4>
          <p className="popup-sub">{selectedFacility.address || '도로명 주소 확인 중'}</p>
        </div>
      )}

      {/* 2. 목적지가 없을 때: 네이버 지도 심플 홈 바 */}
      {!destination ? (
        <div className="naver-home-drawer">
          <div className="drawer-indicator" />
          <div className="home-search-guide">
            <div className="guide-icon">
              <MapPin size={20} color="#03C75A" />
            </div>
            <div className="guide-text">
              <strong>지도를 터치하여 목적지를 지정하세요</strong>
              <p>실제 도보 시간과 안심 추천 경로가 실시간 계산됩니다.</p>
            </div>
          </div>

          <div className="home-actions-row">
            <button className="btn-vibe-demo" onClick={onTriggerDangerAlert}>
              <AlertTriangle size={15} />
              위험 구역 진동 테스트
            </button>
          </div>
        </div>
      ) : (
        /* 3. 목적지가 지정되었을 때: 네이버 지도 보행자 길찾기 패널 */
        <div className="naver-route-drawer">
          <div className="drawer-indicator" />

          {/* 상단 목적지 정보 바 */}
          <div className="drawer-dest-header">
            <div className="dest-meta">
              <span className="dest-dot-red" />
              <h3 className="dest-name">{destination.name}</h3>
              <span className="dest-dist-total">{formatDistance(shortestDist)}</span>
            </div>
            <button className="dest-cancel-link" onClick={onClearDestination}>
              안내 취소
            </button>
          </div>

          {/* 듀얼 경로 선택 탭 (실시간 거리/시간 연동) */}
          <div className="naver-route-tabs">
            {/* 탭 1: 안심 추천길 */}
            <div
              className={`naver-route-card safe ${selectedRouteType === 'safe' ? 'active' : ''}`}
              onClick={() => onSelectRouteType('safe')}
            >
              <div className="card-header-row">
                <span className="badge-safe">
                  <ShieldCheck size={12} /> 안심 추천
                </span>
                {selectedRouteType === 'safe' && <CheckCircle2 size={16} className="check-green" />}
              </div>

              <div className="card-time-row">
                <span className="big-time">{safeTime.text}</span>
                <span className="sub-dist">{formatDistance(safeDist)}</span>
              </div>

              <div className="safe-score-pill">
                안심 지수 <strong>94점</strong>
              </div>

              <div className="facility-icons-summary">
                <span>📷 {cctvCount || 4}</span>
                <span>💡 {lightCount || 8}</span>
              </div>
              <p className="card-hint">환한 큰길 위주 우회</p>
            </div>

            {/* 탭 2: 최단 지름길 */}
            <div
              className={`naver-route-card shortest ${selectedRouteType === 'shortest' ? 'active' : ''}`}
              onClick={() => onSelectRouteType('shortest')}
            >
              <div className="card-header-row">
                <span className="badge-fast">
                  <Zap size={12} /> 최단 지름길
                </span>
                {selectedRouteType === 'shortest' && <CheckCircle2 size={16} className="check-red" />}
              </div>

              <div className="card-time-row">
                <span className="big-time fast">{shortestTime.text}</span>
                <span className="sub-dist">{formatDistance(shortestDist)}</span>
              </div>

              <div className="safe-score-pill danger">
                안심 지수 <strong>35점</strong>
              </div>

              <div className="facility-icons-summary">
                <span>⚠️ 골목 사각지대</span>
              </div>
              <p className="card-hint warning">어두운 골목 경유</p>
            </div>
          </div>

          {/* 네이버 지도 스타일 하단 내비 시작 버튼 */}
          <div className="drawer-footer-row">
            <button
              className="btn-start-nav"
              onClick={() => {
                alert(`안내를 시작합니다. 선택된 모드: ${selectedRouteType === 'safe' ? '안심 우회로' : '최단 지름길'}`);
              }}
            >
              <Navigation size={16} />
              <span>안내 시작 ({selectedRouteType === 'safe' ? safeTime.text : shortestTime.text})</span>
            </button>

            <button className="btn-test-haptic-square" onClick={onTriggerDangerAlert} title="위험 진동 테스트">
              <AlertTriangle size={17} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
