import type { BarcodeType } from 'expo-camera';

/**
 * Retail-oriented symbology list. Curved packaging often uses Data Matrix / PDF417;
 * keeping these enabled improves read rates vs flat-only UPC framing.
 */
export const PRODUCT_BARCODE_TYPES: BarcodeType[] = [
  'ean13',
  'ean8',
  'upc_a',
  'upc_e',
  'code128',
  'code39',
  'code93',
  'itf14',
  'codabar',
  'datamatrix',
  'pdf417',
  'aztec',
  'qr',
];

/** expo-camera `zoom` is 0–1 (fraction of device max zoom). Slight zoom helps small / curved codes. */
export const SCAN_CLOSE_ZOOM = 0.22;
