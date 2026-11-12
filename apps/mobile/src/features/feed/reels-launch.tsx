import { Image } from 'expo-image';
import { usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, ReduceMotion } from 'react-native-reanimated';

const MIN_LAUNCH_MS = 500;
const MAX_LAUNCH_MS = 3_000;
const enter = FadeInDown.duration(360).reduceMotion(ReduceMotion.System);
const exit = FadeOut.duration(180).reduceMotion(ReduceMotion.System);
const ReelsLaunchContext = createContext({ isLaunching: false, onFirstFrame: () => {} });

export function ReelsLaunchProvider({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const startedAt = useRef(Date.now());
  const [finished, setFinished] = useState(pathname !== '/');
  const [hasFrame, setHasFrame] = useState(false);
  const isLaunching = pathname === '/' && !finished;
  const onFirstFrame = useCallback(() => setHasFrame(true), []);

  useEffect(() => {
    if (!isLaunching) return;
    const duration = hasFrame ? MIN_LAUNCH_MS : MAX_LAUNCH_MS;
    const timeout = setTimeout(() => setFinished(true), Math.max(0, duration - (Date.now() - startedAt.current)));
    return () => clearTimeout(timeout);
  }, [isLaunching, hasFrame]);

  return (
    <ReelsLaunchContext.Provider value={{ isLaunching, onFirstFrame }}>
      <StatusBar style={pathname === '/' ? 'light' : 'dark'} />
      <View
        style={styles.content}
        aria-hidden={isLaunching}
        importantForAccessibility={isLaunching ? 'no-hide-descendants' : 'auto'}
      >
        {children}
      </View>
      {isLaunching && (
        <Animated.View exiting={exit} style={styles.cover} testID="reels-launch" accessibilityViewIsModal>
          <Animated.View entering={enter} style={styles.brand}>
            <Image source={require('../../../assets/brand/tripflix-launch-mark.png')} style={styles.mark} />
            <Text style={styles.name} accessibilityRole="header">
              Tripflix
            </Text>
          </Animated.View>
        </Animated.View>
      )}
    </ReelsLaunchContext.Provider>
  );
}

export function useReelsLaunch() {
  return useContext(ReelsLaunchContext);
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  cover: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  brand: { alignItems: 'center', gap: 8 },
  mark: { width: 96, height: 96 },
  name: { color: '#FFFFFF', fontSize: 28, lineHeight: 34, fontWeight: '800' },
});
