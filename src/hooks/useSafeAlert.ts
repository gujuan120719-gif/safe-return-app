import { useCallback } from 'react';

export const useSafeAlert = () => {
  // 1. 스마트폰 진동 제어 (Vibration API)
  const triggerVibration = useCallback((pattern: 'caution' | 'danger' | 'safe') => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        if (pattern === 'caution') {
          // 짧게 2회 진동 (주의)
          navigator.vibrate([150, 100, 150]);
        } else if (pattern === 'danger') {
          // 강하고 길게 3회 진동 (위험 구역)
          navigator.vibrate([350, 150, 350, 150, 450]);
        } else if (pattern === 'safe') {
          // 부드럽게 1회 진동 (안심 구간 진입)
          navigator.vibrate(100);
        }
      } catch (e) {
        console.warn('Vibration API 호출 불가:', e);
      }
    }
  }, []);

  // 2. 음성 안내 (Web Speech API - SpeechSynthesis)
  const speakText = useCallback((message: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel(); // 이전 발화 중단
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = 'ko-KR';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('SpeechSynthesis 실행 실패:', e);
      }
    }
  }, []);

  // 3. 위험 구역 경보 종합
  const alertDangerZone = useCallback((zoneName: string = '조도 미달 골목길') => {
    triggerVibration('danger');
    speakText(`주의! ${zoneName}에 진입했습니다. 주변 방범벨과 큰길 방향을 확인하세요.`);
  }, [triggerVibration, speakText]);

  // 4. 안전 시설물 브리핑
  const alertSafeFacility = useCallback((facilityInfo: string) => {
    triggerVibration('safe');
    speakText(facilityInfo);
  }, [triggerVibration, speakText]);

  return {
    triggerVibration,
    speakText,
    alertDangerZone,
    alertSafeFacility,
  };
};
