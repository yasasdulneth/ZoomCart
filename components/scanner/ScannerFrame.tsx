import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_FRAME_WIDTH = SCREEN_WIDTH * 0.85;
const DEFAULT_FRAME_HEIGHT = 220;
const CORNER_LENGTH = 32;

interface ScannerFrameProps {
  scanning?: boolean;
  width?: number;
  height?: number;
}

function CornerBracket({ rotation }: { rotation: number }) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.92);

  useEffect(() => {
    opacity.value = withDelay(400, withTiming(1, { duration: 500 }));
    scale.value = withDelay(400, withTiming(1, { duration: 400 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ rotate: `${rotation}deg` }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.cornerBracket, animatedStyle]}>
      <View style={styles.cornerGlow} />
      <View style={styles.cornerEdge} />
      <View style={[styles.cornerEdge, styles.cornerEdgeHorz]} />
      <View style={[styles.cornerHighlight, styles.highlightVert]} />
      <View style={[styles.cornerHighlight, styles.highlightHorz]} />
    </Animated.View>
  );
}

export default function ScannerFrame({ scanning = true, width, height }: ScannerFrameProps) {
  const frameWidth = width ?? DEFAULT_FRAME_WIDTH;
  const frameHeight = height ?? DEFAULT_FRAME_HEIGHT;
  const frameOpacity = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    frameOpacity.value = withDelay(200, withTiming(1, { duration: 600 }));
  }, []);

  useEffect(() => {
    if (scanning) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.015, { duration: 1800 }),
          withTiming(1, { duration: 1800 })
        ),
        -1,
        true
      );
    } else {
      pulse.value = withTiming(1);
    }
  }, [scanning]);

  const frameStyle = useAnimatedStyle(() => ({
    opacity: frameOpacity.value,
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Animated.View style={[styles.frame, { width: frameWidth, height: frameHeight }, frameStyle]}>
      <LinearGradient
        colors={[
          'rgba(255,255,255,0.12)',
          'rgba(255,255,255,0.04)',
          'rgba(255,255,255,0.08)',
          'rgba(255,255,255,0.02)',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.frameGlassBorder}
      />
      <CornerBracket rotation={0} />
      <View style={[styles.cornerPos, styles.topRight]}>
        <CornerBracket rotation={90} />
      </View>
      <View style={[styles.cornerPos, styles.bottomLeft]}>
        <CornerBracket rotation={-90} />
      </View>
      <View style={[styles.cornerPos, styles.bottomRight]}>
        <CornerBracket rotation={180} />
      </View>
    </Animated.View>
  );
}

export const SCANNER_FRAME_WIDTH = DEFAULT_FRAME_WIDTH;
export const SCANNER_FRAME_HEIGHT = DEFAULT_FRAME_HEIGHT;

const styles = StyleSheet.create({
  frame: {
    position: 'relative',
  },
  frameGlassBorder: {
    position: 'absolute',
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cornerPos: {
    position: 'absolute',
  },
  topRight: {
    top: 0,
    right: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
  },
  cornerBracket: {
    width: CORNER_LENGTH,
    height: CORNER_LENGTH,
    borderLeftWidth: 2.5,
    borderTopWidth: 2.5,
    borderColor: Colors.accent.neon,
    borderRadius: 1,
  },
  cornerGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    width: CORNER_LENGTH + 8,
    height: CORNER_LENGTH + 8,
    borderRadius: 2,
    backgroundColor: Colors.accent.neon,
    opacity: 0.08,
  },
  cornerEdge: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 2.5,
    height: CORNER_LENGTH,
    backgroundColor: Colors.accent.neon,
    borderRadius: 2,
  },
  cornerEdgeHorz: {
    width: CORNER_LENGTH,
    height: 2.5,
  },
  cornerHighlight: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 1,
  },
  highlightVert: {
    left: 1,
    top: 1,
    width: 1,
    height: 12,
  },
  highlightHorz: {
    left: 1,
    top: 1,
    width: 12,
    height: 1,
  },
});
