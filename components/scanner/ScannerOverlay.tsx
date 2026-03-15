import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Colors, Typography, Spacing } from '../../constants/theme';
import ScannerFrame, {
  SCANNER_FRAME_WIDTH,
  SCANNER_FRAME_HEIGHT,
} from './ScannerFrame';
import ScanLineAnimation from './ScanLineAnimation';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ScannerOverlayProps {
  scanning?: boolean;
  scanLineVisible?: boolean;
  /** When provided (e.g. in a modal), frame and scan line are centered within this size */
  containerWidth?: number;
  containerHeight?: number;
}

export default function ScannerOverlay({
  scanning = true,
  scanLineVisible = true,
  containerWidth,
  containerHeight,
}: ScannerOverlayProps) {
  const useContainer = containerWidth != null && containerHeight != null && containerWidth > 0 && containerHeight > 0;

  const frameWidth = useContainer
    ? Math.min(containerWidth * 0.9, containerHeight * 0.7, 280)
    : SCANNER_FRAME_WIDTH;
  const frameHeight = useContainer
    ? Math.min(220, containerHeight * 0.6)
    : SCANNER_FRAME_HEIGHT;

  const frameTop = useContainer
    ? (containerHeight - frameHeight) / 2
    : (SCREEN_HEIGHT - SCANNER_FRAME_HEIGHT) / 2 - 80;
  const sideDimWidth = useContainer
    ? (containerWidth - frameWidth) / 2
    : (SCREEN_WIDTH - SCANNER_FRAME_WIDTH) / 2;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <View style={[styles.dim, { height: frameTop }]} />
      <View style={[styles.midRow, { height: frameHeight }]}>
        <View style={[styles.dim, { width: sideDimWidth }]} />
        <ScannerFrame scanning={scanning} width={frameWidth} height={frameHeight} />
        <View style={[styles.dim, { width: sideDimWidth }]} />
      </View>
      <View style={[styles.dim, styles.dimBottom]} />
      <ScanLineAnimation
        visible={scanLineVisible && scanning}
        {...(useContainer ? { frameTop, frameHeight } : {})}
      />
      <View style={[styles.hintContainer, useContainer ? { bottom: 12 } : undefined]}>
        <View style={styles.hintPill}>
          <Text style={styles.hint}>
            {useContainer ? 'Align QR within frame' : 'Align barcode within frame'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  dim: {
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  midRow: {
    flexDirection: 'row',
  },
  dimBottom: {
    flex: 1,
  },
  hintContainer: {
    position: 'absolute',
    bottom: 52,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  hint: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    color: Colors.dark.textSecondary,
    letterSpacing: 0.3,
  },
});
