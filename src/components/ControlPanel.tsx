import React from 'react';
import { SafetyFacility, RouteType, DestinationPoint } from '../types';
import {
  AlertTriangle,
  Footprints,
  RotateCcw,
  ShieldCheck,
  Zap,
  CheckCircle2,
  X,
  Navigation,
  MapPin,
} from 'lucide-react';

interface ControlPanelProps {
  destination: DestinationPoint | null;
  onClearDestination: () => void;
  selectedFacility: SafetyFacility | null;
  onCloseFacility: () => void;
  showRoutes: boolean;
  onToggleRoutes: () => void;
  selectedRouteType: RouteType;
  onSelectRouteType: (type: RouteType) => void;
  onTriggerDangerAlert: () => void;
  onStepForward: () => void;
  onResetGPS: () => void;
  isSimulating: boolean;
  facilityCount: number;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  destination,
  onClearDestination,
  selectedFacility,
  onCloseFacility,
  showRoutes,
  onToggleRoutes,
  selectedRouteType,
  onSelectRouteType,
  onTriggerDangerAlert,
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

      {/* 2. 목적지가 아직 설정되지 않았을 때의 안내 카드 */}
      {!destination ? (
        <div className="no-dest-card">
          <div className="no-dest-icon">
            <MapPin size={22} color="#3B82F6" />
          </div>
          <div className="no-dest-content">
            <strong>가고 싶은 곳의 지도를 터치해보세요</strong>
            <p>안심 우회로와 최단 지름길을 비교 분석해 드립니다.</p>
          </div>
          <button className="btn-vibrate-test-small" onClick={onTriggerDangerAlert} title="위험 진동 테스트">
            <AlertTriangle size={15} />
            진동 테스트
          </button>
        </div>
      ) : (
        /* 3. 목적지가 설정되었을 때: 네이버 지도 스타일 듀얼 경로 비교 패널 */
        <div className="route-comparison-container">
          <div className="route-comparison-header">
            <div className="dest-title-badge">
              <span className="dest-dot"></span>
              <strong>{destination.name}</strong>
            </div>
            <div className="dest-actions">
              <button className="toggle-route-visibility-btn" onClick={onToggleRoutes}>
                <Navigation size={13} />
                {showRoutes ? '경로 숨김' : '경로 표시'}
              </button>
              <button className="cancel-route-btn" onClick={onClearDestination}>
                안내 종료
              </button>
            </div>
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
                  안심지수 <strong>94점</strong> (매우 밝음)
                </div>

                <div className="route-details-list">
                  <span>📷 CCTV 6대</span>
                  <span>💡 가로등 12개</span>
                </div>
                <p className="route-desc">가로등 많은 큰길 우선</p>
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
                  안심지수 <strong>38점</strong> (⚠️ 어두움)
                </div>

                <div className="route-details-list">
                  <span>📷 CCTV 1대</span>
                  <span>💡 가로등 2개</span>
                </div>
                <p className="route-desc warning">골목길 사각지대 2곳 통과</p>
              </div>
            </div>
          )}

          {/* 위험 구간 진입 시 진동 알림 안내 및 시뮬레이션 */}
          <div className="alert-guidance-bar">
            <span className="vibrate-notice">
              📳 위험 골목에 진입하면 스마트폰이 <strong>진동</strong>으로 경고합니다.
            </span>
            <button className="btn-test-haptic" onClick={onTriggerDangerAlert}>
              <AlertTriangle size={14} /> 위험 진동 테스트
            </button>
          </div>
        </div>
      )}

      {/* 4. 가상 보행 시뮬레이터 바 */}
      <div className="simulation-bar">
        <button className="sim-btn" onClick={onStepForward}>
          <Footprints size={15} />
          골목 전진 시뮬레이션
        </button>

        {isSimulating && (
          <button className="reset-gps-btn" onClick={onResetGPS}>
            <RotateCcw size={15} />
            실제 GPS 복원
          </button>
        )}
      </div>
    </div>
  );
};
