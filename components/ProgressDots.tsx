import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../lib/theme';

interface ProgressDotsProps {
  total: number;
  activeIndex: number;
}

export function ProgressDots({ total, activeIndex }: ProgressDotsProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === activeIndex ? styles.activeDot : styles.inactiveDot,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  dot: {
    borderRadius: 9999,
  },
  activeDot: {
    width: 8,
    height: 8,
    backgroundColor: colors.text.primary,
  },
  inactiveDot: {
    width: 6,
    height: 6,
    backgroundColor: colors.border.light,
  },
});
