import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Flame, Heart, Sparkles, Glasses } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

export type OrientationType = 'straight' | 'gay' | 'trans' | 'vr';

interface OrientationSwitcherProps {
  selected: OrientationType;
  onSelect: (type: OrientationType) => void;
}

export const OrientationSwitcher: React.FC<OrientationSwitcherProps> = ({
  selected,
  onSelect,
}) => {
  const { colors } = useTheme();

  const options: { id: OrientationType; label: string; icon: any; color: string }[] = [
    { id: 'straight', label: 'HETERO', icon: Flame, color: colors.primary },
    { id: 'gay', label: 'GAY', icon: Heart, color: '#30D158' },
    { id: 'trans', label: 'TRANS', icon: Sparkles, color: '#0A84FF' },
    { id: 'vr', label: 'VR 360°', icon: Glasses, color: '#BF5AF2' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <View style={styles.segmentContainer}>
        {options.map((opt) => {
          const isSelected = selected === opt.id;
          const IconComp = opt.icon;

          return (
            <TouchableOpacity
              key={opt.id}
              activeOpacity={0.75}
              onPress={() => onSelect(opt.id)}
              style={[
                styles.segmentTab,
                { backgroundColor: 'transparent' },
                isSelected && [
                  styles.segmentTabActive,
                  { backgroundColor: colors.surfaceCardLight, borderColor: opt.color },
                ],
              ]}
            >
              <IconComp
                size={13}
                color={isSelected ? opt.color : colors.textMuted}
                style={{ marginRight: 5 }}
              />
              <Text
                style={[
                  styles.segmentText,
                  { color: colors.textMuted },
                  isSelected && [styles.segmentTextActive, { color: colors.textPrimary }],
                ]}
              >
                {opt.label}
              </Text>
              {isSelected && (
                <View style={[styles.activeIndicator, { backgroundColor: opt.color }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  segmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    position: 'relative',
  },
  segmentTabActive: {
    borderWidth: 1,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  segmentTextActive: {
    fontWeight: '900',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 2,
    width: 16,
    height: 2,
    borderRadius: 1,
  },
});
