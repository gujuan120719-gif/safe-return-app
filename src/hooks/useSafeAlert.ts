import { useCallback } from 'react';

export const useSafeAlert = () => {
  // 스마트폰 진동 제어 (Vibration API)
  // 음성(TTS)은 어색함을 방지하기 위해 제거하고, 오직 진동 햅틱으로만 위험을 경고합니다.
  const triggerVibration = useCallback((pattern: 'caution' | 'danger' | 'safe') => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        if (pattern === 'caution') {
          // 짧게 2회 진동 (주의 구역)
          navigator.vibrate([150, 100, 150]);
        } else if (pattern === 'danger') {
          // 위험 구간 진입 시 강렬한 3연타 진동 패턴
          navigator.vibrate([400, 150, 400, 150, 600]);
        } else if (pattern === 'safe') {
          // 안심 구간/경로 선택 시 부드러운 단발 햅틱
          navigator.vibrate(80);
        }
      } catch (e) {
        console.warn('Vibration API 호출 불가:', e);
      }
    }
  }, []);

  // 위험 구역 진입 시 진동 경고 실행
  const alertDangerZone = useCallback(() => {
    triggerVibration('danger');
  }, [triggerVibration]);

  return {
    triggerVibration,
    alertDangerZone,
  };
};
