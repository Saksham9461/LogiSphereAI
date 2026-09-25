import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Circle as SVGCircle, Line } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withTiming, Easing, withRepeat, withSequence } from 'react-native-reanimated';
import { MapPin, Navigation } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { rf } from '../theme/responsive';

const { width } = Dimensions.get('window');
const MAP_HEIGHT = rf(300);

const AnimatedCircle = Animated.createAnimatedComponent(SVGCircle);

interface LiveMapProps {
  trip: any | null;
}

export default function LiveMap({ trip }: LiveMapProps) {
  // SVG coordinates for a generic map route
  const startX = 40;
  const startY = MAP_HEIGHT - 60;
  const endX = width - 40;
  const endY = 60;
  
  // Bezier curve control points to make the route look curvy
  const cp1X = width * 0.2;
  const cp1Y = 80;
  const cp2X = width * 0.8;
  const cp2Y = MAP_HEIGHT - 80;

  const routePath = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;

  // Vehicle progress along the line (0 to 1)
  const progress = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (trip) {
      // Simulate random progress between 10% and 90% based on trip ID string length/hash
      const pseudoRandomProgress = ((trip.tripID.length * 17) % 80 + 10) / 100;
      
      progress.value = withTiming(pseudoRandomProgress, {
        duration: 1500,
        easing: Easing.inOut(Easing.cubic),
      });

      pulse.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        true
      );
    } else {
      progress.value = withTiming(0, { duration: 500 });
      pulse.value = 1;
    }
  }, [trip]);

  // Interpolate position along the bezier curve
  // B(t) = (1-t)^3*P0 + 3(1-t)^2*t*P1 + 3(1-t)*t^2*P2 + t^3*P3
  const animatedDotProps = useAnimatedProps(() => {
    const t = progress.value;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;

    const x = mt3 * startX + 3 * mt2 * t * cp1X + 3 * mt * t2 * cp2X + t3 * endX;
    const y = mt3 * startY + 3 * mt2 * t * cp1Y + 3 * mt * t2 * cp2Y + t3 * endY;

    return { cx: x, cy: y };
  });

  const animatedPulseProps = useAnimatedProps(() => {
    const t = progress.value;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;

    const x = mt3 * startX + 3 * mt2 * t * cp1X + 3 * mt * t2 * cp2X + t3 * endX;
    const y = mt3 * startY + 3 * mt2 * t * cp1Y + 3 * mt * t2 * cp2Y + t3 * endY;

    return { 
      cx: x, 
      cy: y, 
      r: 8 * pulse.value,
      opacity: 1.5 - pulse.value 
    };
  });

  // Generate generic background grid lines
  const gridLines = [];
  for (let i = 0; i < width; i += 40) {
    gridLines.push(<Line key={`v${i}`} x1={i} y1={0} x2={i} y2={MAP_HEIGHT} stroke={colors.borderSoft} strokeWidth="1" strokeDasharray="4 4" />);
  }
  for (let i = 0; i < MAP_HEIGHT; i += 40) {
    gridLines.push(<Line key={`h${i}`} x1={0} y1={i} x2={width} y2={i} stroke={colors.borderSoft} strokeWidth="1" strokeDasharray="4 4" />);
  }

  return (
    <View style={styles.container}>
      <Svg width={width} height={MAP_HEIGHT} style={styles.svg}>
        <Defs>
          <LinearGradient id="routeGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={colors.blue} />
            <Stop offset="100%" stopColor={colors.amber} />
          </LinearGradient>
        </Defs>

        {/* Map Grid */}
        {gridLines}

        {trip && (
          <>
            {/* Background Route Path */}
            <Path
              d={routePath}
              stroke={colors.borderStrong}
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
              strokeDasharray="10 10"
              opacity={0.3}
            />

            {/* Active Route Path */}
            <Path
              d={routePath}
              stroke="url(#routeGrad)"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />

            {/* Source Dot */}
            <Circle cx={startX} cy={startY} r="8" fill={colors.panel} stroke={colors.blue} strokeWidth="4" />
            
            {/* Destination Dot */}
            <Circle cx={endX} cy={endY} r="8" fill={colors.panel} stroke={colors.amber} strokeWidth="4" />

            {/* Vehicle Dot */}
            <AnimatedCircle animatedProps={animatedPulseProps} fill={colors.amber} />
            <AnimatedCircle animatedProps={animatedDotProps} r="6" fill={colors.panel} stroke={colors.textPrimary} strokeWidth="3" />
          </>
        )}
      </Svg>

      {trip ? (
        <View style={styles.mapOverlay}>
          <View style={styles.overlayPill}>
            <MapPin size={12} color={colors.textSecondary} />
            <Text style={styles.overlayText}>{trip.source} → {trip.destination}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.noTripOverlay}>
          <Navigation size={32} color={colors.borderStrong} />
          <Text style={styles.noTripText}>Select a trip to view live tracking</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: MAP_HEIGHT,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  svg: {
    position: 'absolute',
  },
  mapOverlay: {
    position: 'absolute',
    bottom: rf(16),
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: rf(12),
    paddingVertical: rf(6),
    borderRadius: rf(20),
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  overlayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(6),
  },
  overlayText: {
    fontSize: rf(12),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  noTripOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: rf(12),
  },
  noTripText: {
    color: colors.textMuted,
    fontSize: rf(14),
    fontWeight: '500',
  }
});
