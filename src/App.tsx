import React, { useState, useEffect } from 'react';
import { SafeMap } from './components/SafeMap';
import { SafeHeader } from './components/SafeHeader';
import { ControlPanel } from './components/ControlPanel';
import { useGeolocation } from './hooks/useGeolocation';
import { useSafeAlert } from './hooks/useSafeAlert';
import { fetchNearbyFacilities } from './services/supabase';
import { SafetyFacility, MapFilterState, RouteType } from './types';

export default function App() {
  const { coords, isSimulating, simulateStep, resetToGPS } = useGeolocation();
  const { alertDangerZone, alertSafeFacility, speakText, triggerVibration } = useSafeAlert();

  const [facilities, setFacilities] = useState<SafetyFacility[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<SafetyFacility | null>(null);
  
  // 듀얼 경로 상태 관리 (최단거리 vs 안심길)
  const [showRoutes, setShowRoutes] = useState(true);
  const [selectedRouteType, setSelectedRouteType] = useState<RouteType>('safe');

  const [filters, setFilters] = useState<MapFilterState>({
    cctv: true,
    streetlight: true,
    bell: true,
  });

  // GPS 좌표 변경 시 주변 안전 시설물 데이터 갱신
  useEffect(() => {
    let isMounted = true;
    fetchNearbyFacilities(coords.latitude, coords.longitude, 1200).then((data) => {
      if (isMounted) {
        setFacilities(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [coords.latitude, coords.longitude]);

  // 경로 선택 변경 핸들러 (최단거리 <-> 안심길 전환 시 음성 및 진동 알림)
  const handleSelectRouteType = (type: RouteType) => {
    setSelectedRouteType(type);
    if (type === 'safe') {
      triggerVibration('safe');
      speakText('안심 우회 경로가 선택되었습니다. 가로등과 CCTV가 많은 밝은 큰길로 안내합니다.');
    } else {
      triggerVibration('caution');
      speakText('최단 지름길이 선택되었습니다. 주의! 어둡고 CCTV가 부족한 골목길 2곳이 포함되어 있습니다.');
    }
  };

  // 필터 토글
  const handleToggleFilter = (type: keyof MapFilterState) => {
    setFilters((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  // 위험 구간 진입 강제 테스트 (진동 + 음성 경보)
  const handleTriggerDangerAlert = () => {
    alertDangerZone(
      selectedRouteType === 'shortest'
        ? '최단 지름길 내 가로등 미설치 골목'
        : '어두운 골목길 및 CCTV 사각지대'
    );
  };

  // 안심 시설 음성 브리핑
  const handleTriggerSafeBriefing = () => {
    const cctvCount = facilities.filter((f) => f.type === 'CCTV').length;
    const lightCount = facilities.filter((f) => f.type === 'STREETLIGHT').length;
    const bellCount = facilities.filter((f) => f.type === 'BELL').length;

    const currentModeName = selectedRouteType === 'safe' ? '안심 우회로' : '최단 지름길';
    const message = `현재 선택된 경로는 ${currentModeName}입니다. 주변 반경 내에 방범 CCTV ${cctvCount}대와 가로등 ${lightCount}개, 비상벨 ${bellCount}개가 운영 중입니다.`;
    alertSafeFacility(message);
  };

  // 골목길 진입 가상 시뮬레이션
  const handleStepForward = () => {
    // 골목 방향으로 보행 전진
    simulateStep(0.0004, 0.0003);
  };

  return (
    <div className="app-container">
      {/* 1. 상단 상태바 & 필터 */}
      <SafeHeader
        coords={coords}
        filters={filters}
        onToggleFilter={handleToggleFilter}
        isSimulating={isSimulating}
      />

      {/* 2. 브이월드 2D 메인 지도 & 듀얼 경로 오버레이 */}
      <SafeMap
        currentCoords={coords}
        facilities={facilities}
        filters={filters}
        showRoutes={showRoutes}
        selectedRouteType={selectedRouteType}
        onFacilityClick={(facility) => setSelectedFacility(facility)}
      />

      {/* 3. 하단 컨트롤러 & [최단거리 vs 안심길] 비교 선택 패널 */}
      <ControlPanel
        selectedFacility={selectedFacility}
        onCloseFacility={() => setSelectedFacility(null)}
        showRoutes={showRoutes}
        onToggleRoutes={() => setShowRoutes((prev) => !prev)}
        selectedRouteType={selectedRouteType}
        onSelectRouteType={handleSelectRouteType}
        onTriggerDangerAlert={handleTriggerDangerAlert}
        onTriggerSafeBriefing={handleTriggerSafeBriefing}
        onStepForward={handleStepForward}
        onResetGPS={resetToGPS}
        isSimulating={isSimulating}
        facilityCount={facilities.length}
      />
    </div>
  );
}
