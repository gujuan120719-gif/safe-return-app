import React from 'react';
import { SafetyFacility, RouteType, DestinationPoint, LocationCoords } from '../types';
import { formatDistance } from '../utils/geo';
import { DualRouteResult } from '../services/pedestrianRouting';
import {
  AlertTriangle,
  ShieldCheck,
  Zap,
  CheckCircle2,
  X,
  Navigation,
  MapPin,
  Loader2,
} from 'lucide-react';

interface ControlPanelProps {
  startCoords: LocationCoords;
  destination: DestinationPoint | null;
  onClearDestination: () => void;
  selectedFacility: SafetyFacility | null;
  onCloseFacility: () => void;
  selectedRouteType: RouteType;
  onSelectRouteType: (type: RouteType) => void;
  onTriggerDangerAlert: () => void;
  routeData: DualRouteResult | null;
  isLoadingRoute: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  destination,
  onClearDestination,
  selectedFacility,
  onCloseFacility,
  selectedRouteType,
  onSelectRouteType,
  onTriggerDangerAlert,
  routeData,
  isLoadingRoute,
}) => {
  return (
    <div className="original-bottom-sheet">
      {/* 1. 시설물 마커 터치 시 나타나는 상세 팝업 */}
      {selectedFacility && (
        <div className="facility-popup-card">
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
          <p className="popup-sub">{selectedFacility.address || '주소 정보 확인 중'}</p>
        </div>
      )}

      {/* 2. 목적지가 없을 때: 안내 홈 바 */}
      {!destination ? (
        <div className="home-guide-drawer">
          <div className="drawer-indicator" />
          <div className="home-guide-content">
            <div className="guide-icon-box">
              <MapPin size={20} color="#2563EB" />
            </div>
            <div className="guide-texts">
              <strong>지도를 터치하여 목적지를 지정하세요</strong>
              <p>실제 보행 도로망을 따라 안심길과 최단길이 계산됩니다.</p>
            </div>
          </div>

          <div className="home-actions-bar">
            <button className="btn-vibe-test-outlined" onClick={onTriggerDangerAlert}>
              <AlertTriangle size={15} />
              위험 구역 진동 테스트
            </button>
          </div>
        </div>
      ) : (
        /* 3. 목적지가 지정되었을 때: 보행자 길찾기 패널 */
        <div className="route-result-drawer">
          <div className="drawer-indicator" />

          {/* 상단 목적지 정보 바 */}
          <div className="route-header-bar">
            <div className="dest-meta-box">
              <span className="dest-badge-dot" />
              <h3 className="dest-title-text">{destination.name}</h3>
              {routeData && (
                <span className="dest-distance-text">
                  {formatDistance(routeData.shortestRoute.distanceMeters)}
                </span>
              )}
            </div>
            <button className="btn-cancel-route" onClick={onClearDestination}>
              안내 취소
            </button>
          </div>

          {/* 로딩 중 스켈레톤 상태 */}
          {isLoadingRoute && (
            <div className="route-loading-box">
              <Loader2 size={24} className="spin-icon text-blue" />
              <span>실제 보행 도로망 경로를 탐색 중입니다...</span>
            </div>
          )}

          {/* 실제 도로망 듀얼 경로 선택 탭 */}
          {routeData && !isLoadingRoute && (
            <div className="route-cards-grid">
              {/* 탭 1: 안심 추천 우회로 */}
              <div
                className={`route-select-card safe ${selectedRouteType === 'safe' ? 'active' : ''}`}
                onClick={() => onSelectRouteType('safe')}
              >
                <div className="card-top-row">
                  <span className="badge-safe">
                    <ShieldCheck size={12} /> 안심 추천
                  </span>
                  {selectedRouteType === 'safe' && <CheckCircle2 size={16} className="check-green" />}
                </div>

                <div className="card-time-row">
                  <span className="big-time-text">{routeData.safeRoute.durationMinutes}분</span>
                  <span className="sub-dist-text">{formatDistance(routeData.safeRoute.distanceMeters)}</span>
                </div>

                <div className="safe-score-tag">
                  안심 지수 <strong>{routeData.safeRoute.safetyScore}점</strong>
                </div>

                <div className="facility-summary-row">
                  <span>📷 {routeData.safeRoute.cctvCount}</span>
                  <span>💡 {routeData.safeRoute.lightCount}</span>
                </div>
                <p className="card-explain-text">밝은 큰길 위주 보행</p>
              </div>

              {/* 탭 2: 최단 지름길 */}
              <div
                className={`route-select-card shortest ${selectedRouteType === 'shortest' ? 'active' : ''}`}
                onClick={() => onSelectRouteType('shortest')}
              >
                <div className="card-top-row">
                  <span className="badge-fast">
                    <Zap size={12} /> 최단 지름길
                  </span>
                  {selectedRouteType === 'shortest' && <CheckCircle2 size={16} className="check-red" />}
                </div>

                <div className="card-time-row">
                  <span className="big-time-text fast">{routeData.shortestRoute.durationMinutes}분</span>
                  <span className="sub-dist-text">{formatDistance(routeData.shortestRoute.distanceMeters)}</span>
                </div>

                <div className="safe-score-tag danger">
                  안심 지수 <strong>{routeData.shortestRoute.safetyScore}점</strong>
                </div>

                <div className="facility-summary-row">
                  <span>⚠️ 어두운 골목 경유</span>
                </div>
                <p className="card-explain-text warning">사각지대 주의</p>
              </div>
            </div>
          )}

          {/* 하단 내비 시작 & 진동 테스트 */}
          {routeData && !isLoadingRoute && (
            <div className="drawer-bottom-actions">
              <button
                className="btn-start-navigation"
                onClick={() => {
                  const currentMode = selectedRouteType === 'safe' ? '안심 우회로' : '최단 지름길';
                  const time = selectedRouteType === 'safe' ? routeData.safeRoute.durationMinutes : routeData.shortestRoute.durationMinutes;
                  alert(`보행 안내를 시작합니다.\n[${currentMode}] 예상 소요시간: 약 ${time}분`);
                }}
              >
                <Navigation size={16} />
                <span>
                  안내 시작 (
                  {selectedRouteType === 'safe'
                    ? `${routeData.safeRoute.durationMinutes}분`
                    : `${routeData.shortestRoute.durationMinutes}분`}
                  )
                </span>
              </button>

              <button className="btn-vibe-square" onClick={onTriggerDangerAlert} title="위험 진동 테스트">
                <AlertTriangle size={17} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
