import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';

const ALARM_HIGH_FREQ = 880;
const ALARM_LOW_FREQ = 440;
const ALARM_DURATION = 300;
const ALARM_BEEP_INTERVAL = 150;

export function useAlarmSound() {
  const alarms = useAppStore((s) => s.alarms);
  const soundEnabled = useAppStore((s) => s.system.soundEnabled);
  const prevAlarmCountRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastPlayTimeRef = useRef(0);

  useEffect(() => {
    const activeAlarms = alarms.filter((a) => a.status === 'active');
    const currentCount = activeAlarms.length;

    if (currentCount > prevAlarmCountRef.current && currentCount > 0) {
      const now = Date.now();
      if (now - lastPlayTimeRef.current > 2000) {
        const latestAlarm = activeAlarms[0];
        const freq = latestAlarm?.type === 'high' ? ALARM_HIGH_FREQ : ALARM_LOW_FREQ;
        playAlarmSound(freq);
        lastPlayTimeRef.current = now;
      }
    }

    prevAlarmCountRef.current = currentCount;
  }, [alarms]);

  const playAlarmSound = (frequency: number = ALARM_HIGH_FREQ) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      for (let i = 0; i < 2; i++) {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.08;

        const startTime = ctx.currentTime + i * (ALARM_DURATION + ALARM_BEEP_INTERVAL) / 1000;
        oscillator.start(startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + ALARM_DURATION / 1000);
        oscillator.stop(startTime + ALARM_DURATION / 1000);
      }
    } catch {
      // AudioContext not available
    }
  };
}
