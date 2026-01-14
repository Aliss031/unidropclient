
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Parcel } from '../types';

interface QRGeneratorProps {
  value: string;
  parcel?: Parcel;
}

export const QRGenerator: React.FC<QRGeneratorProps> = ({ value, parcel }) => {
  // Create structured QR data for better scanning
  // Format: JSON with parcel info for scanner systems
  const qrData = parcel ? JSON.stringify({
    type: 'parcel_collection',
    parcelId: parcel.id,
    trackingNumber: parcel.trackingNumber,
    collectionPin: parcel.collectionPin,
    hubId: parcel.hubId,
    timestamp: new Date().toISOString()
  }) : value;

  return (
    <div className="bg-white p-4 rounded-xl shadow-inner inline-block border-4 border-slate-100">
      <QRCodeSVG
        value={qrData}
        size={192}
        level="H"
        includeMargin={false}
        className="w-48 h-48"
      />
    </div>
  );
};
