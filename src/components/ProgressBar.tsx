import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import { radius } from '../theme';

interface ProgressBarProps {
  percent: number;
  color?: string;
  height?: number;
}

export function ProgressBar({ percent, color, height = 8 }: ProgressBarProps) {
  const theme = useTheme();
  const clamped = Math.min(Math.max(percent, 0), 100);
  const barColor = color ?? theme.accent;
  const trackColor = theme.isDark ? '#334155' : '#E2E8F0';

  return (
    <View testID="progress-bar-track" style={[styles.track, { height, backgroundColor: trackColor }]}>
      <View
        testID="progress-bar-fill"
        style={[styles.fill, { width: `${clamped}%`, backgroundColor: barColor, height }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: radius.full,
  },
});
