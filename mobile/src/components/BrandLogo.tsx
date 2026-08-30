import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface BrandLogoProps {
  size?: 'small' | 'medium' | 'large';
  showSubtitle?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'medium', showSubtitle = false }) => {
  const { colors, isDark } = useTheme();

  const iconSizes = {
    small: 28,
    medium: 44,
    large: 72,
  };

  const titleSizes = {
    small: 18,
    medium: 24,
    large: 32,
  };

  const iconDim = iconSizes[size];
  const titleSize = titleSizes[size];

  return (
    <View style={styles.container}>
      <View style={styles.logoRow}>
        <View
          style={[
            styles.imageWrapper,
            {
              width: iconDim,
              height: iconDim,
              borderRadius: iconDim / 4,
              borderColor: colors.primary,
              shadowColor: colors.primary,
            },
          ]}
        >
          <Image
            source={require('../../assets/logo.jpg')}
            style={[styles.logoImage, { width: iconDim, height: iconDim, borderRadius: iconDim / 4 }]}
            resizeMode="cover"
          />
        </View>

        <View style={styles.textColumn}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { fontSize: titleSize, color: colors.textPrimary }]}>
              Texxx<Text style={{ color: colors.primary }}>Nopor</Text>
            </Text>
            <View style={[styles.badge18, { backgroundColor: colors.primary }]}>
              <Text style={styles.badge18Text}>18+</Text>
            </View>
          </View>
          {showSubtitle && (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Streaming Exclusivo para Adultos</Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  imageWrapper: {
    overflow: 'hidden',
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 6,
  },
  logoImage: {
    backgroundColor: '#0A0A0E',
  },
  textColumn: {
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  badge18: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badge18Text: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
});
