import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop, Line } from 'react-native-svg';
import { colors } from '../theme/colors';
import { rf } from '../theme/responsive';

interface MapPreviewProps {
  distance: number;
  requiredRadius: number;
  isInside: boolean;
}

export default function MapPreview({ distance, requiredRadius, isInside }: MapPreviewProps) {
  const mapSize = rf(220);
  const center = mapSize / 2;
  const maxVisualDistance = requiredRadius * 1.5; // Scale the map so radius is at 2/3 of map
  
  const pixelsPerMeter = (mapSize / 2) / maxVisualDistance;
  const geofenceVisualRadius = requiredRadius * pixelsPerMeter;
  
  // Calculate user dot position (arbitrary 45 degree angle for visual effect)
  const angle = Math.PI / 4;
  const clampedDistance = Math.min(distance, maxVisualDistance - 20); // Keep dot inside SVG bounds
  const userVisualDistance = clampedDistance * pixelsPerMeter;
  
  const userX = center + userVisualDistance * Math.cos(angle);
  const userY = center - userVisualDistance * Math.sin(angle); // negative because Y goes up in cartesian

  return (
    <View style={styles.container}>
      <Svg width={mapSize} height={mapSize}>
        <Defs>
          <RadialGradient id="grad" cx="50%" cy="50%" rx="50%" ry="50%" fx="50%" fy="50%">
            <Stop offset="0%" stopColor={colors.success} stopOpacity="0.1" />
            <Stop offset="100%" stopColor={colors.success} stopOpacity="0.0" />
          </RadialGradient>
        </Defs>

        {/* Grid lines */}
        <Line x1="0" y1={center} x2={mapSize} y2={center} stroke={colors.borderSoft} strokeWidth="1" strokeDasharray="4 4" />
        <Line x1={center} y1="0" x2={center} y2={mapSize} stroke={colors.borderSoft} strokeWidth="1" strokeDasharray="4 4" />

        {/* Geofence area */}
        <Circle cx={center} cy={center} r={geofenceVisualRadius} fill="url(#grad)" />
        <Circle cx={center} cy={center} r={geofenceVisualRadius} stroke={colors.success} strokeWidth="2" strokeDasharray="6 4" />
        
        {/* Office Center */}
        <Circle cx={center} cy={center} r="6" fill={colors.textPrimary} />
        <Circle cx={center} cy={center} r="12" stroke={colors.textPrimary} strokeWidth="1" opacity="0.2" />

        {/* User Dot */}
        <Circle cx={userX} cy={userY} r="8" fill={isInside ? colors.success : colors.error} />
        <Circle cx={userX} cy={userY} r="16" fill={isInside ? colors.success : colors.error} opacity="0.2" />
        <Circle cx={userX} cy={userY} r="24" fill={isInside ? colors.success : colors.error} opacity="0.1" />
      </Svg>
      
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.textPrimary }]} />
          <Text style={styles.legendText}>HQ</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: isInside ? colors.success : colors.error }]} />
          <Text style={styles.legendText}>You ({distance}m)</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rf(16),
  },
  legend: {
    flexDirection: 'row',
    gap: rf(16),
    marginTop: rf(12),
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(6),
  },
  dot: {
    width: rf(8),
    height: rf(8),
    borderRadius: rf(4),
  },
  legendText: {
    fontSize: rf(12),
    color: colors.textSecondary,
    fontWeight: '600',
  }
});
