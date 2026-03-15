import React, { useEffect } from 'react';

import { View, Text, StyleSheet, Image } from 'react-native';

import Animated, {

  useSharedValue,

  useAnimatedStyle,

  withSpring,

  withTiming,

  FadeIn,

  FadeOut,

} from 'react-native-reanimated';

import { Colors, Typography, BorderRadius } from '../../constants/theme';

import type { Participant } from '../../lib/sharedCart/types';



const AVATAR_SIZE = 40;

const ONLINE_DOT_SIZE = 12;



interface ParticipantAvatarProps {

  participant: Participant;

  index: number;

}



export default function ParticipantAvatar({ participant }: ParticipantAvatarProps) {

  const scale = useSharedValue(0.8);

  const opacity = useSharedValue(0);



  useEffect(() => {

    scale.value = withSpring(1, { damping: 14, stiffness: 120 });

    opacity.value = withTiming(1, { duration: 300 });

  }, []);



  const animatedStyle = useAnimatedStyle(() => ({

    transform: [{ scale: scale.value }],

    opacity: opacity.value,

  }));



  const initials = participant.name

    .split(' ')

    .map((n) => n[0])

    .slice(0, 2)

    .join('')

    .toUpperCase();



  return (

    <Animated.View

      entering={FadeIn.duration(250).springify()}

      exiting={FadeOut.duration(200)}

      style={styles.wrapper}

    >

      <Animated.View style={animatedStyle}>

        <View style={styles.avatarWrap}>

          {participant.avatarUri ? (

            <Image

              source={{ uri: participant.avatarUri }}

              style={styles.avatar}

              resizeMode="cover"

            />

          ) : (

            <View style={styles.avatarPlaceholder}>

              <Text style={styles.initials}>{initials}</Text>

            </View>

          )}

          {participant.isOnline && <View style={styles.onlineDot} />}

          {participant.isHost && (

            <View style={styles.crownWrap}>

              <Text style={styles.crown}>👑</Text>

            </View>

          )}

        </View>

      </Animated.View>

    </Animated.View>

  );

}



const styles = StyleSheet.create({

  wrapper: {

    marginRight: 12,

  },

  avatarWrap: {

    width: AVATAR_SIZE,

    height: AVATAR_SIZE,

    borderRadius: AVATAR_SIZE / 2,

    position: 'relative',

    overflow: 'visible',

  },

  avatar: {

    width: AVATAR_SIZE,

    height: AVATAR_SIZE,

    borderRadius: AVATAR_SIZE / 2,

  },

  avatarPlaceholder: {

    width: AVATAR_SIZE,

    height: AVATAR_SIZE,

    borderRadius: AVATAR_SIZE / 2,

    backgroundColor: Colors.glass.medium,

    alignItems: 'center',

    justifyContent: 'center',

  },

  initials: {

    fontFamily: Typography.fonts.primarySemiBold,

    fontSize: 14,

    color: Colors.dark.text,

  },

  onlineDot: {

    position: 'absolute',

    bottom: 0,

    right: 0,

    width: ONLINE_DOT_SIZE,

    height: ONLINE_DOT_SIZE,

    borderRadius: ONLINE_DOT_SIZE / 2,

    backgroundColor: '#22C55E',

    borderWidth: 2,

    borderColor: Colors.dark.surface,

  },

  crownWrap: {

    position: 'absolute',

    top: -6,

    right: -4,

  },

  crown: {

    fontSize: 14,

  },

});

