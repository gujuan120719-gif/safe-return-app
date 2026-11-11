import React, { useState, useEffect } from 'react';
import { SafeMap } from './components/SafeMap';
import { SafeHeader } from './components/SafeHeader';
import { ControlPanel } from './components/ControlPanel';
import { useGeolocation } from './hooks/useGeolocation';
import { useSafeAlert } from './hooks/useSafeAlert';
import { fetchNearbyFacilities } from './services/supabase';
import { SafetyFacility, MapFilterState, RouteType, DestinationPoint } from './types';
import { AlertCircle } from 'lucide-react';

export default function App() {
  const { coords, resetToGPS } = useGeolocation();
  const { isAlertActive, alertMessage, alertDangerZone, triggerVibration } = useSafeAlert();

  const [facilities, setFacilities] = useState<SafetyFacility[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<SafetyFacility | null>(null);

  // 목적지 상태 (초기값 null: 절대 임의의 목적지가 자동 설정되지 않음)
  const [destination, setDestination] = useState<DestinationPoint | null>(null);

  // 듀얼 경로 선택
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
    fetchNearbyFacilities(coords.latitude, coords.longitude, 1500).then((data) => {
      if (isMounted) {
        setFacilities(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [coords.latitude, coords.longitude]);

  // 지도 빈 곳 터치 시 목적지 즉시 지정
  const handleMapClickToSetDestination = (clickCoords: { latitude: number; longitude: number }) => {
    setDestination({
      name: '지정 위치 📍',
      latitude: clickCoords.latitude,
      longitude: clickCoords.longitude,
    });
    triggerVibration('safe');
  };

  const handleSelectRouteType = (type: RouteType) => {
    setSelectedRouteType(type);
    triggerVibration(type === 'safe' ? 'safe' : 'caution');
  };

  const handleToggleFilter = (type: keyof MapFilterState) => {
    setFilters((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const facilityCounts = {
    cctv: facilities.filter((f) => f.type === 'CCTV').length,
    light: facilities.filter((f) => f.type === 'STREETLIGHT').length,
    bell: facilities.filter((f) => f.type === 'BELL').length,
  };

  return (
    <div className={`naver-app-container ${isAlertActive ? 'danger-screen-alert' : ''}`}>
      {/* 1. 위험 감지 시 나타나는 상단 경고 팝업 토스트 */}
      {isAlertActive && (
        <div className="danger-toast-banner">
          <AlertCircle size={20} color="#FFFFFF" />
          <div className="danger-toast-text">
            <strong>위험 구간 감지</strong>
            <p>{alertMessage || '어두운 골목길에 진입했습니다. 진동 경고 발동!'}</p>
          </div>
        </div>
      )}

      {/* 2. 네이버 지도 화이트 헤더 & 검색바 */}
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
        facilityCounts={facilityCounts}
      />

      {/* 3. 브이월드 2D 메인 지도 & 터치 핀 */}
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

      {/* 4. 네이버 지도 스타일 하단 바텀시트 */}
      <ControlPanel
        startCoords={coords}
        destination={destination}
        onClearDestination={() => setDestination(null)}
        selectedFacility={selectedFacility}
        onCloseFacility={() => setSelectedFacility(null)}
        showRoutes={showRoutes}
        onToggleRoutes={() => setShowRoutes((prev) => !prev)}
        selectedRouteType={selectedRouteType}
        onSelectRouteType={handleSelectRouteType}
        onTriggerDangerAlert={alertDangerZone}
        facilities={facilities}
      />
    </div>
  );
}
