import { useState, useCallback } from 'react';

export const useSafeAlert = () => {
  const [isAlertActive, setIsAlertActive] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // 기기 진동 및 화면 햅틱 피드백 실행
  const triggerVibration = useCallback((pattern: 'caution' | 'danger' | 'safe') => {
    let vibratePattern = [200, 100, 200];
    let message = '주의 구역입니다.';

    if (pattern === 'danger') {
      vibratePattern = [400, 150, 400, 150, 600];
      message = '🚨 어두운 골목 / CCTV 사각지대 진입! (위험 진동)';
    } else if (pattern === 'safe') {
      vibratePattern = [80];
      message = '안심 경로가 선택되었습니다.';
    }

    // 1. Android 하드웨어 진동 실행 (안드로이드 크롬 지원)
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(vibratePattern);
      } catch (e) {
        console.warn('Vibration API 호출 오류:', e);
      }
    }

    // 2. 화면 시각적 햅틱 & 토스트 (아이폰 Safari는 웹 진동 API를 차단하므로 화면 펄스로 즉각 피드백 제공)
    setIsAlertActive(true);
    setAlertMessage(message);

    // 3. 브라우저 비프 사운드 피드백 (아이폰/PC 등 진동 미지원 환경에서도 인지 가능하도록)
    if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = pattern === 'danger' ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(pattern === 'danger' ? 440 : 880, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (pattern === 'danger' ? 0.4 : 0.15));
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + (pattern === 'danger' ? 0.4 : 0.15));
      } catch (err) {
        // AudioContext auto-play restriction safe ignore
      }
    }

    setTimeout(() => {
      setIsAlertActive(false);
      setAlertMessage(null);
    }, 1800);
  }, []);

  const alertDangerZone = useCallback(() => {
    triggerVibration('danger');
  }, [triggerVibration]);

  return {
    isAlertActive,
    alertMessage,
    triggerVibration,
    alertDangerZone,
  };
};
