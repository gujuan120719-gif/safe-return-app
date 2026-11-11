import React from 'react';
import { SafetyFacility, RouteType } from '../types';
import {
  AlertTriangle,
  Footprints,
  RotateCcw,
  Volume2,
  ShieldCheck,
  Zap,
  CheckCircle2,
  X,
  Navigation,
} from 'lucide-react';

interface ControlPanelProps {
  selectedFacility: SafetyFacility | null;
  onCloseFacility: () => void;
  showRoutes: boolean;
  onToggleRoutes: () => void;
  selectedRouteType: RouteType;
  onSelectRouteType: (type: RouteType) => void;
  onTriggerDangerAlert: () => void;
  onTriggerSafeBriefing: () => void;
  onStepForward: () => void;
  onResetGPS: () => void;
  isSimulating: boolean;
  facilityCount: number;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  selectedFacility,
  onCloseFacility,
  showRoutes,
  onToggleRoutes,
  selectedRouteType,
  onSelectRouteType,
  onTriggerDangerAlert,
  onTriggerSafeBriefing,
  onStepForward,
  onResetGPS,
  isSimulating,
  facilityCount,
}) => {
  return (
    <div className="bottom-panel">
      {/* 1. 지도에서 선택된 특정 시설물 정보 팝업 */}
      {selectedFacility && (
        <div className="facility-card">
          <div className="facility-header">
            <span className="facility-type-tag">
              {selectedFacility.type === 'CCTV'
                ? '방범 CCTV'
                : selectedFacility.type === 'STREETLIGHT'
                ? '보안등/가로등'
                : '여성안심 비상벨'}
            </span>
            <button className="close-btn" onClick={onCloseFacility}>
              <X size={16} />
            </button>
          </div>
          <h4 className="facility-name">{selectedFacility.name}</h4>
          <p className="facility-address">{selectedFacility.address || '주소 정보 확인 중'}</p>
          <div className="facility-weight">안전 가중치: +{selectedFacility.safety_weight}점 반영됨</div>
        </div>
      )}

      {/* 2. 최단거리 vs 안심길 듀얼 경로 비교 선택 카드 */}
      <div className="route-comparison-container">
        <div className="route-comparison-header">
          <span className="section-title">경로 비교 탐색</span>
          <button className="toggle-route-visibility-btn" onClick={onToggleRoutes}>
            <Navigation size={13} />
            {showRoutes ? '지도에서 경로 끄기' : '경로 표시하기'}
          </button>
        </div>

        {showRoutes && (
          <div className="route-cards-grid">
            {/* 카드 1: 안심 추천 경로 */}
            <div
              className={`route-card safe-route ${selectedRouteType === 'safe' ? 'selected' : ''}`}
              onClick={() => onSelectRouteType('safe')}
            >
              <div className="route-card-top">
                <div className="route-pill safe">
                  <ShieldCheck size={13} />
                  안심 우회로
                </div>
                {selectedRouteType === 'safe' && (
                  <CheckCircle2 size={16} className="check-icon safe" />
                )}
              </div>

              <div className="route-main-stat">
                <span className="time">12분</span>
                <span className="distance">780m</span>
              </div>

              <div className="safety-score-badge high">
                안심지수 <strong>94점</strong> (매우 안전)
              </div>

              <div className="route-details-list">
                <span>📷 CCTV 6대</span>
                <span>💡 가로등 12개</span>
                <span>🚨 비상벨 1개</span>
              </div>
              <p className="route-desc">조도 높은 큰길과 방범 구역 우선</p>
            </div>

            {/* 카드 2: 최단 지름길 경로 */}
            <div
              className={`route-card shortest-route ${selectedRouteType === 'shortest' ? 'selected' : ''}`}
              onClick={() => onSelectRouteType('shortest')}
            >
              <div className="route-card-top">
                <div className="route-pill shortest">
                  <Zap size={13} />
                  최단 지름길
                </div>
                {selectedRouteType === 'shortest' && (
                  <CheckCircle2 size={16} className="check-icon danger" />
                )}
              </div>

              <div className="route-main-stat">
                <span className="time fast">9분</span>
                <span className="distance">540m (3분 단축)</span>
              </div>

              <div className="safety-score-badge low">
                안심지수 <strong>38점</strong> (⚠️ 주의 필요)
              </div>

              <div className="route-details-list">
                <span>📷 CCTV 1대</span>
                <span>💡 가로등 2개</span>
              </div>
              <p className="route-desc warning">어두운 골목 & 사각지대 2곳 경유</p>
            </div>
          </div>
        )}
      </div>

      {/* 3. 위험 경보 & 음성 브리핑 액션 버튼 */}
      <div className="action-buttons-grid">
        <button className="btn-danger-alert" onClick={onTriggerDangerAlert}>
          <AlertTriangle size={18} />
          <span>위험 골목 경보 (진동+음성)</span>
        </button>

        <button className="btn-briefing" onClick={onTriggerSafeBriefing}>
          <Volume2 size={18} />
          <span>안심 시설 브리핑</span>
        </button>
      </div>

      {/* 4. 가상 보행 시뮬레이터 바 */}
      <div className="simulation-bar">
        <button className="sim-btn" onClick={onStepForward}>
          <Footprints size={15} />
          골목 전진 시뮬레이션
        </button>

        {isSimulating && (
          <button className="reset-gps-btn" onClick={onResetGPS}>
            <RotateCcw size={15} />
            실제 GPS로 복원
          </button>
        )}
      </div>
    </div>
  );
};
