import React from 'react';
import { View, Text, StyleSheet, Image, Platform, Animated, Easing } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface BrandLogoProps {
  size?: 'small' | 'medium' | 'large' | 'hero';
  showSubtitle?: boolean;
  animated?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'medium',
  showSubtitle = false,
  animated = false,
}) => {
  const { colors, isDark } = useTheme();
  
  const pulseAnim = React.useRef(new Animated.Value(0)).current;
  const glowAnim = React.useRef(new Animated.Value(0)).current;

  const iconSizes = {
    small: 36,
    medium: 48,
    large: 72,
    hero: 96,
  };

  const titleSizes = {
    small: 20,
    medium: 28,
    large: 42,
    hero: 56,
  };

  const iconDim = iconSizes[size];
  const titleSize = titleSizes[size];

  // Animaciones de entrada y pulso
  React.useEffect(() => {
    if (!animated) return;
    
    // Animación de glow pulsante
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Animación de entrada
    pulseAnim.setValue(0);
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [animated]);

  const animatedStyle = {
    transform: [
      { scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
      { translateY: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
    ],
    opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
  };

  const glowStyle = {
    opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
  };

  return (
    <Animated.View style={[styles.container, animatedStyle]} accessibilityRole="header">
      <View style={styles.logoRow}>
        <View
          style={[
            styles.imageWrapper,
            {
              width: iconDim,
              height: iconDim,
              borderRadius: size === 'hero' ? 20 : 16,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.glowRing,
              glowStyle,
              { borderColor: colors.primary },
            ]}
          />
          <Image
            source={require('../../assets/logo.jpg')}
            style={[
              styles.logoImage,
              { width: iconDim, height: iconDim, borderRadius: size === 'hero' ? 20 : 16 },
            ]}
            resizeMode="cover"
            accessibilityLabel="Logotipo de TexxxNopor"
            accessible
          />
        </View>

        <View style={styles.textColumn}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.title,
                { fontSize: titleSize, color: colors.textPrimary, lineHeight: titleSize * 1.15 },
              ]}
            >
              Texxx<Text style={{ color: colors.primary, fontWeight: '800' }}>Nopor</Text>
            </Text>
            {size !== 'small' && (
              <View style={[styles.badge18, { backgroundColor: colors.primary }]}>
                <Text style={styles.badge18Text}>18+</Text>
              </View>
            )}
          </View>
          {showSubtitle && (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Streaming Premium para Adultos
            </Text>
          )}
        </View>
      </View>
    </Animated.View>
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
    gap: 14,
  },
  imageWrapper: {
    position: 'relative',
    overflow: 'hidden',
  },
  glowRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 24,
    borderWidth: 2,
    opacity: 0.4,
  },
  logoImage: {
    backgroundColor: '#1E1A1A',
  },
  textColumn: {
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontWeight: '800',
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'web' ? 'Inter, Open Sans, sans-serif' : undefined,
  },
  badge18: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#E61E3A',
  },
  badge18Text: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    marginTop: 4,
    lineHeight: 24,
    maxWidth: 420,
    fontWeight: '400',
    fontFamily: Platform.OS === 'web' ? 'Inter, Open Sans, sans-serif' : undefined,
  },
});
