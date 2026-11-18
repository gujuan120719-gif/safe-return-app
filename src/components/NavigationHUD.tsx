import React from 'react';
import { WalkableRouteData, NavigationStep } from '../services/pedestrianRouting';
import { RouteType, LocationCoords } from '../types';
import { getDistanceMeters, formatDistance } from '../utils/geo';
import {
  CornerUpLeft,
  CornerUpRight,
  ArrowUp,
  Flag,
  ShieldCheck,
  AlertTriangle,
  X,
  Footprints,
} from 'lucide-react';

interface NavigationHUDProps {
  route: WalkableRouteData;
  routeType: RouteType;
  currentCoords: LocationCoords;
  onExitNavigation: () => void;
  destinationName: string;
}

export const NavigationHUD: React.FC<NavigationHUDProps> = ({
  route,
  routeType,
  currentCoords,
  onExitNavigation,
  destinationName,
}) => {
  const steps = route.steps || [];

  // 현재 GPS 위치에서 가장 가까운 다음 단계(Step) 계산
  let currentStepIndex = 0;
  let distToNextTurn = 0;

  if (steps.length > 0) {
    // 사용자가 지나치지 않은 가장 가까운 다음 회전 지점 탐색
    let minDist = Infinity;
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (step.location && step.location.length >= 2) {
        const d = getDistanceMeters(currentCoords.latitude, currentCoords.longitude, step.location[1], step.location[0]);
        if (d < minDist && d > 12) {
          minDist = d;
          currentStepIndex = i;
          distToNextTurn = Math.round(d);
          break;
        }
      }
    }

    if (distToNextTurn === 0 && steps[currentStepIndex]) {
      distToNextTurn = steps[currentStepIndex].distanceMeters;
    }
  }

  const currentStep: NavigationStep | undefined = steps[currentStepIndex] || steps[0];
  const nextStep: NavigationStep | undefined = steps[currentStepIndex + 1];

  // 회전 방향에 따른 아이콘 선택
  const renderTurnIcon = (modifier?: string, type?: string) => {
    if (type === 'arrive') return <Flag size={28} className="text-white" />;
    if (modifier === 'left' || modifier === 'sharp left' || modifier === 'slight left') {
      return <CornerUpLeft size={28} className="text-white" />;
    }
    if (modifier === 'right' || modifier === 'sharp right' || modifier === 'slight right') {
      return <CornerUpRight size={28} className="text-white" />;
    }
    return <ArrowUp size={28} className="text-white" />;
  };

  const isSafe = routeType === 'safe';

  return (
    <div className="nav-hud-overlay">
      {/* 1. 상단 턴바이턴 안내 바 (헤드업 디스플레이) */}
      <div className={`nav-turn-card ${isSafe ? 'border-safe' : 'border-caution'}`}>
        <div className="nav-turn-icon-box">
          {renderTurnIcon(currentStep?.modifier, currentStep?.type)}
        </div>

        <div className="nav-turn-info">
          <div className="nav-next-dist">
            {distToNextTurn > 0 ? (
              <span>
                <strong>{distToNextTurn}m</strong> 앞
              </span>
            ) : (
              <span>곧 이동</span>
            )}
          </div>
          <h2 className="nav-instruction-text">
            {currentStep?.instruction || '보행로를 따라 직진하세요'}
          </h2>
          {nextStep && (
            <p className="nav-sub-instruction">
              다음: {nextStep.instruction}
            </p>
          )}
        </div>

        <button className="nav-exit-icon-btn" onClick={onExitNavigation} title="안내 종료">
          <X size={20} />
        </button>
      </div>

      {/* 2. 안전 알림 배너 */}
      <div className={`nav-safety-pill ${isSafe ? 'pill-safe' : 'pill-caution'}`}>
        {isSafe ? (
          <>
            <ShieldCheck size={14} />
            <span>안심 우회로 주행 중 · CCTV {route.cctvCount}대 · 가로등 {route.lightCount}개소</span>
          </>
        ) : (
          <>
            <AlertTriangle size={14} />
            <span>최단 지름길 주행 중 · 조도 취약 골목 주의</span>
          </>
        )}
      </div>

      {/* 3. 하단 실시간 내비게이션 바 */}
      <div className="nav-bottom-panel">
        <div className="nav-bottom-meta">
          <div className="nav-time-group">
            <span className="nav-big-time">{route.durationMinutes}분</span>
            <span className="nav-remain-dist">{formatDistance(route.distanceMeters)}</span>
          </div>
          <div className="nav-dest-label">
            <Footprints size={14} className="inline mr-1" />
            <span>{destinationName}</span>
          </div>
        </div>

        <button className="btn-stop-nav" onClick={onExitNavigation}>
          안내 종료
        </button>
      </div>
    </div>
  );
};
