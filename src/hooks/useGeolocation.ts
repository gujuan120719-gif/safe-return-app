import { useState, useEffect, useCallback } from 'react';
import { LocationCoords } from '../types';

// 기본 서울 시청 좌표
const DEFAULT_CENTER: LocationCoords = {
  latitude: 37.5665,
  longitude: 126.9780,
  accuracy: 10,
};

export const useGeolocation = () => {
  const [coords, setCoords] = useState<LocationCoords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    if (isSimulating) return;

    if (!navigator.geolocation) {
      setError('기기에서 위치 서비스를 지원하지 않아 기본 위치로 설정됩니다.');
      setCoords(DEFAULT_CENTER);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
        });
        setError(null);
      },
      (err) => {
        // 권한 거부 등의 경우 기본 위치 제공
        console.warn('GPS 수신 제한:', err.message);
        setError(`위치 접근 제한 (${err.code}): 기본 위치(서울)로 설정되었습니다.`);
        setCoords(DEFAULT_CENTER);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isSimulating]);

  // 가상 보행 시뮬레이션 (어두운 골목으로 이동하는 테스트용)
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

  return { coords: coords || DEFAULT_CENTER, error, isSimulating, simulateStep, resetToGPS };
};
