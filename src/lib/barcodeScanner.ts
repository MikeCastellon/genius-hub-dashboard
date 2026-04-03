import { Capacitor } from '@capacitor/core';
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';

export interface ScanResult {
  value: string;
  format: string;
}

export async function scanBarcode(): Promise<ScanResult | null> {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  const { barcodes } = await BarcodeScanner.scan({
    formats: [BarcodeFormat.Code128, BarcodeFormat.Code39, BarcodeFormat.DataMatrix, BarcodeFormat.Pdf417],
  });

  if (barcodes.length > 0 && barcodes[0].rawValue) {
    return {
      value: barcodes[0].rawValue,
      format: barcodes[0].format,
    };
  }

  return null;
}

export function isNativeScannerAvailable(): boolean {
  // MLKit barcode scanner not working on iOS with SPM, fall back to web camera
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}
