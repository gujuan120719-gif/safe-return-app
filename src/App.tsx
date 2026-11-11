import React, { useState, useEffect } from 'react';
import { SafeMap } from './components/SafeMap';
import { SafeHeader } from './components/SafeHeader';
import { ControlPanel } from './components/ControlPanel';
import { useGeolocation } from './hooks/useGeolocation';
import { useSafeAlert } from './hooks/useSafeAlert';
import { fetchNearbyFacilities } from './services/supabase';
import { SafetyFacility, MapFilterState, RouteType, DestinationPoint } from './types';

export default function App() {
  const { coords, isSimulating, simulateStep, resetToGPS } = useGeolocation();
  const { alertDangerZone, triggerVibration } = useSafeAlert();

  const [facilities, setFacilities] = useState<SafetyFacility[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<SafetyFacility | null>(null);

  // 목적지 상태: 기본값을 null로 설정하여 앱 시작 시 목적지가 자동으로 강제 설정되지 않도록 변경!
  const [destination, setDestination] = useState<DestinationPoint | null>(null);

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

  // 지도 빈 곳을 터치했을 때 해당 지점을 목적지로 설정
  const handleMapClickToSetDestination = (clickCoords: { latitude: number; longitude: number }) => {
    setDestination({
      name: '지도에서 찍은 목적지 📍',
      latitude: clickCoords.latitude,
      longitude: clickCoords.longitude,
    });
    triggerVibration('safe'); // 목적지 찍힘 피드백 진동
  };

  // 경로 선택 변경 핸들러 (음성은 빼고 햅틱 진동 피드백만 제공)
  const handleSelectRouteType = (type: RouteType) => {
    setSelectedRouteType(type);
    if (type === 'safe') {
      triggerVibration('safe'); // 부드러운 1회 햅틱
    } else {
      triggerVibration('caution'); // 2회 주의 진동
    }
  };

  // 필터 토글
  const handleToggleFilter = (type: keyof MapFilterState) => {
    setFilters((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  // 위험 구간 진입 강제 테스트 (강력한 3단 위험 진동만 출력)
  const handleTriggerDangerAlert = () => {
    alertDangerZone();
  };

  // 골목길 진입 가상 시뮬레이션
  const handleStepForward = () => {
    simulateStep(0.0004, 0.0003);
  };

  return (
    <div className="app-container">
      {/* 1. 네이버 지도 스타일 상단 플로팅 검색바 & 필터 */}
      <SafeHeader
        coords={coords}
        filters={filters}
        onToggleFilter={handleToggleFilter}
        destination={destination}
        onSelectDestination={(dest) => {
          setDestination(dest);
          triggerVibration('safe');
        }}
        onClearDestination={() => setDestination(null)}
      />

      {/* 2. 브이월드 2D 메인 지도 & 터치 목적지 지정 */}
      <SafeMap
        currentCoords={coords}
        facilities={facilities}
        filters={filters}
        showRoutes={showRoutes}
        selectedRouteType={selectedRouteType}
        destination={destination}
        onFacilityClick={(facility) => setSelectedFacility(facility)}
        onMapClickToSetDestination={handleMapClickToSetDestination}
      />

      {/* 3. 하단 네이버 지도 스타일 안내 & 듀얼 경로 비교 패널 */}
      <ControlPanel
        destination={destination}
        onClearDestination={() => setDestination(null)}
        selectedFacility={selectedFacility}
        onCloseFacility={() => setSelectedFacility(null)}
        showRoutes={showRoutes}
        onToggleRoutes={() => setShowRoutes((prev) => !prev)}
        selectedRouteType={selectedRouteType}
        onSelectRouteType={handleSelectRouteType}
        onTriggerDangerAlert={handleTriggerDangerAlert}
        onStepForward={handleStepForward}
        onResetGPS={resetToGPS}
        isSimulating={isSimulating}
        facilityCount={facilities.length}
      />
    </div>
  );
}
