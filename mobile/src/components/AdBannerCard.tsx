import React from 'react';

interface AdBannerCardProps {
  onPress?: () => void;
  title?: string;
  subtitle?: string;
  ctaText?: string;
  imageUrl?: string;
  targetUrl?: string;
  sponsorName?: string;
}

export const AdBannerCard: React.FC<AdBannerCardProps> = () => {
  return null;
};
