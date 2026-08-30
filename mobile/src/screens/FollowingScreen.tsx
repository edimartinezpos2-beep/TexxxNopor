import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Heart, CheckCircle2 } from 'lucide-react-native';
import { COLORS } from '../theme/colors';

export const FollowingScreen: React.FC = () => {
  const followedCreators = [
    {
      id: 'fc1',
      name: 'Luna Roja',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop',
      unread: true,
    },
    {
      id: 'fc2',
      name: 'Mara Studio',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop',
      unread: false,
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Siguiendo</Text>

      {/* Creators Stories / Circles */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storiesScroll}>
        {followedCreators.map((c) => (
          <TouchableOpacity key={c.id} style={styles.creatorItem}>
            <View style={[styles.avatarRing, c.unread && styles.avatarRingUnread]}>
              <Image source={{ uri: c.avatar }} style={styles.avatar} />
            </View>
            <Text style={styles.creatorName} numberOfLines={1}>
              {c.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.emptyFeed}>
        <Heart size={44} color={COLORS.border} />
        <Text style={styles.emptyFeedTitle}>Estás al día con tus creadores</Text>
        <Text style={styles.emptyFeedSubtitle}>
          Las nuevas publicaciones y directos aparecerán aquí.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  storiesScroll: {
    paddingHorizontal: 16,
    maxHeight: 100,
  },
  creatorItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 68,
  },
  avatarRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    padding: 2,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  avatarRingUnread: {
    borderColor: COLORS.crimsonRed,
    borderWidth: 2,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  creatorName: {
    color: '#FFFFFF',
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },
  emptyFeed: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyFeedTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyFeedSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
});
