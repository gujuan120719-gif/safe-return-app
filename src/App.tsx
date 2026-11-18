import React, { useState, useEffect } from 'react';
import { SafeMap } from './components/SafeMap';
import { SafeHeader } from './components/SafeHeader';
import { ControlPanel } from './components/ControlPanel';
import { useGeolocation } from './hooks/useGeolocation';
import { useSafeAlert } from './hooks/useSafeAlert';
import { fetchNearbyFacilities } from './services/supabase';
import { fetchRealRoadRoutes, DualRouteResult } from './services/pedestrianRouting';
import { SafetyFacility, MapFilterState, RouteType, DestinationPoint } from './types';
import { AlertCircle } from 'lucide-react';

export default function App() {
  const { coords, hasRealGps } = useGeolocation();
  const { isAlertActive, alertMessage, alertDangerZone, triggerVibration } = useSafeAlert();

  const [facilities, setFacilities] = useState<SafetyFacility[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<SafetyFacility | null>(null);

  // 목적지 상태
  const [destination, setDestination] = useState<DestinationPoint | null>(null);

  // 실제 도로망 라우팅 데이터 및 로딩 상태
  const [routeData, setRouteData] = useState<DualRouteResult | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // 듀얼 경로 선택 (기본: 안심 우회로)
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

  // 목적지가 설정되거나 변경되면 실제 보행 도로망(OSRM) 경로를 비동기 호출
  useEffect(() => {
    if (!destination || !coords) {
      setRouteData(null);
      return;
    }

    let isCancelled = false;
    setIsLoadingRoute(true);

    fetchRealRoadRoutes(
      coords.longitude,
      coords.latitude,
      destination.longitude,
      destination.latitude,
      facilities
    ).then((result) => {
      if (!isCancelled) {
        setRouteData(result);
        setIsLoadingRoute(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [destination, coords, facilities]);

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
    <div className={`clean-app-container ${isAlertActive ? 'danger-screen-alert' : ''}`}>
      {/* 1. 위험 감지 시 상단 경고 토스트 배너 */}
      {isAlertActive && (
        <div className="danger-toast-banner">
          <AlertCircle size={20} color="#FFFFFF" />
          <div className="danger-toast-text">
            <strong>위험 구간 감지</strong>
            <p>{alertMessage || '어두운 골목길에 진입했습니다. 진동 경고 발동!'}</p>
          </div>
        </div>
      )}

      {/* 2. 오리지널 클린 화이트 헤더 & 장소 검색바 */}
      <SafeHeader
        coords={coords}
        filters={filters}
        onToggleFilter={handleToggleFilter}
        destination={destination}
        onSelectDestination={(dest) => {
          setDestination(dest);
          triggerVibration('safe');
        }}
        onClearDestination={() => {
          setDestination(null);
          setRouteData(null);
        }}
        facilityCounts={facilityCounts}
      />

      {/* 3. 브이월드 2D 메인 지도 & 실제 도로망 궤적 렌더링 */}
      <SafeMap
        currentCoords={coords}
        hasRealGps={hasRealGps}
        facilities={facilities}
        filters={filters}
        showRoutes={showRoutes}
        selectedRouteType={selectedRouteType}
        destination={destination}
        routeData={routeData}
        isLoadingRoute={isLoadingRoute}
        onFacilityClick={(facility) => setSelectedFacility(facility)}
        onMapClickToSetDestination={handleMapClickToSetDestination}
      />

      {/* 4. 하단 실제 도로망 길찾기 바텀시트 */}
      <ControlPanel
        startCoords={coords}
        destination={destination}
        onClearDestination={() => {
          setDestination(null);
          setRouteData(null);
        }}
        selectedFacility={selectedFacility}
        onCloseFacility={() => setSelectedFacility(null)}
        selectedRouteType={selectedRouteType}
        onSelectRouteType={handleSelectRouteType}
        onTriggerDangerAlert={alertDangerZone}
        routeData={routeData}
        isLoadingRoute={isLoadingRoute}
      />
    </div>
  );
}
