import { useState, useEffect, useCallback } from 'react';
import { LocationCoords } from '../types';

// 초기 로딩 시 임시 중심 좌표 (대한민국 중심부)
const DEFAULT_CENTER: LocationCoords = {
  latitude: 36.5,
  longitude: 127.8,
  accuracy: 100,
};

export const useGeolocation = () => {
  const [coords, setCoords] = useState<LocationCoords | null>(null);
  const [hasRealGps, setHasRealGps] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    if (isSimulating) return;

    if (!navigator.geolocation) {
      setError('기기에서 위치 서비스를 지원하지 않습니다.');
      return;
    }

    // 1. 단발성으로 현재 위치를 먼저 가장 빠르게 획득
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
        });
        setHasRealGps(true);
        setError(null);
      },
      (err) => {
        console.warn('초기 GPS 획득 지연:', err.message);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );

    // 2. 실시간 위치 변화 지속 추적
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
        });
        setHasRealGps(true);
        setError(null);
      },
      (err) => {
        setError(`위치 권한 확인 필요: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 3000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isSimulating]);

  // 가상 보행 시뮬레이션
  const simulateStep = useCallback((deltaLat: number, deltaLng: number) => {
    setIsSimulating(true);
    setCoords((prev) => {
      const base = prev || DEFAULT_CENTER;
      return {
        ...base,
        latitude: base.latitude + deltaLat,
        longitude: base.longitude + deltaLng,
      };
    });
  }, []);

  const resetToGPS = useCallback(() => {
    setIsSimulating(false);
  }, []);

  return {
    coords: coords || DEFAULT_CENTER,
    hasRealGps,
    error,
    isSimulating,
    simulateStep,
    resetToGPS,
  };
};
