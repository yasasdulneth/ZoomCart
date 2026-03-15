import React from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';

const logoAsset = require('../assets/images/zoomcart-logo.png');

type Props = {
  style?: StyleProp<ImageStyle>;
};

export function ZoomCartLogo({ style }: Props) {
  return (
    <Image
      source={logoAsset}
      style={style}
      resizeMode="contain"
      accessibilityLabel="ZoomCart logo"
    />
  );
}
