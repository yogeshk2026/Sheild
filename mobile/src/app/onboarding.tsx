import React, { useRef, useState } from 'react';
import { View, Dimensions, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Shield, FileCheck, Wallet, Bell, AlertCircle } from 'lucide-react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Button, Text } from '@/components/ui';
import { useStore } from '@/lib/store';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  icon: React.ReactNode | 'logo';
  title: string;
  subtitle: string;
  gradient: [string, string, string];
  backgroundImage?: 'parking-protection' | 'easy-claims' | 'fast-payouts' | 'stay-informed';
}

const SLIDES: OnboardingSlide[] = [
  {
    id: '1',
    icon: 'logo',
    title: 'Parking Protection',
    subtitle: 'Turn unpredictable parking fines into a simple monthly expense. We protect gig drivers from city tickets.',
    gradient: ['#000000', '#1A1A1A', '#2D2D2D'],
    backgroundImage: 'parking-protection',
  },
  {
    id: '2',
    icon: <FileCheck size={80} color="#FFFFFF" strokeWidth={1.5} />,
    title: 'Easy Claims',
    subtitle: 'Snap a photo of your ticket, submit in seconds, and get paid upon approval. No paperwork, no hassle.',
    gradient: ['#000000', '#1A1A1A', '#F97316'],
    backgroundImage: 'easy-claims',
  },
  {
    id: '3',
    icon: <Wallet size={80} color="#FFFFFF" strokeWidth={1.5} />,
    title: 'Fast Payouts',
    subtitle: 'Approved claims go straight to your wallet. Transfer to your bank anytime. Proof of payment is not required upfront.',
    gradient: ['#000000', '#1A1A1A', '#2D2D2D'],
    backgroundImage: 'fast-payouts',
  },
  {
    id: '4',
    icon: <Bell size={80} color="#FFFFFF" strokeWidth={1.5} />,
    title: 'Stay Informed',
    subtitle: 'Real-time updates on your claims and coverage. Never miss a payout.',
    gradient: ['#000000', '#1A1A1A', '#2D2D2D'],
    backgroundImage: 'stay-informed',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollRef = useRef<Animated.ScrollView>(null);
  const scrollX = useSharedValue(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const setOnboarded = useStore((s) => s.setOnboarded);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentIndex < SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      scrollRef.current?.scrollTo({ x: nextIndex * SCREEN_WIDTH, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      setOnboarded(true);
      router.replace('/auth');
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOnboarded(true);
    router.replace('/auth');
  };

  return (
    <View className="flex-1 bg-shield-black">
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrentIndex(index);
        }}
      >
        {SLIDES.map((slide, index) => (
          <SlideItem
            key={slide.id}
            slide={slide}
            index={index}
            scrollX={scrollX}
          />
        ))}
      </Animated.ScrollView>

      <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0">
        <View className="px-6 pb-4">
          {/* Pagination Dots */}
          <View className="flex-row justify-center mb-8">
            {SLIDES.map((_, index) => (
              <PaginationDot
                key={index}
                index={index}
                scrollX={scrollX}
              />
            ))}
          </View>

          {/* Buttons */}
          <View className="flex-row space-x-3">
            <View className="flex-1">
              <Pressable onPress={handleSkip} className="py-4 items-center">
                <Text className="text-white/70 font-medium text-base">{'Skip'}</Text>
              </Pressable>
            </View>
            <View className="flex-1">
              <Button onPress={handleNext} fullWidth pill>
                {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
              </Button>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function SlideItem({
  slide,
  index,
  scrollX,
}: {
  slide: OnboardingSlide;
  index: number;
  scrollX: Animated.SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * SCREEN_WIDTH,
      index * SCREEN_WIDTH,
      (index + 1) * SCREEN_WIDTH,
    ];

    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.8, 1, 0.8],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.5, 1, 0.5],
      Extrapolation.CLAMP
    );

    const translateY = interpolate(
      scrollX.value,
      inputRange,
      [50, 0, 50],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale }, { translateY }],
      opacity,
    };
  });

  // Special layout for slides with background images
  if (slide.backgroundImage) {
    const backgroundSource = slide.backgroundImage === 'parking-protection'
      ? require('../../public/3.png')
      : slide.backgroundImage === 'easy-claims'
      ? require('../../public/splash2b.png')
      : slide.backgroundImage === 'fast-payouts'
      ? require('../../public/5.png')
      : require('../../public/parkingtix1-1.png');

    const gradientOpacity = slide.backgroundImage === 'parking-protection'
      ? ['rgba(0, 0, 0, 0.85)', 'rgba(0, 0, 0, 1)']
      : slide.backgroundImage === 'easy-claims'
      ? ['rgba(0, 0, 0, 0.55)', 'rgba(0, 0, 0, 0.80)']
      : ['rgba(0, 0, 0, 0.75)', 'rgba(0, 0, 0, 1)'];

    const iconSource = slide.backgroundImage === 'parking-protection'
      ? require('../../public/shieldlogobest2.png')
      : null;

    return (
      <View style={{ width: SCREEN_WIDTH }}>
        <View className="flex-1 bg-black">
          {/* Full screen background image */}
          <Image
            source={backgroundSource}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '100%',
            }}
            contentFit="cover"
          />
          {/* Gradient overlay */}
          <LinearGradient
            colors={gradientOpacity as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          {/* Text overlay centered like other slides */}
          <View className="flex-1 items-center justify-center px-8 pb-40">
            <Animated.View style={animatedStyle} className="items-center">
              {/* Icon with faded white background circle like other slides (except parking-protection) */}
              {slide.backgroundImage === 'parking-protection' ? (
                <View className="w-40 h-40 mb-10" />
              ) : (
                <View className="w-40 h-40 rounded-full bg-white/10 items-center justify-center mb-10">
                  {slide.icon}
                </View>
              )}
              <Text className="text-white text-3xl font-bold text-center mb-4">
                {slide.title}
              </Text>
              <Text className="text-white/70 text-lg text-center leading-7">
                {slide.subtitle}
              </Text>
              {/* Welcome to Courial Shield for Parking Protection slide */}
              {slide.backgroundImage === 'parking-protection' && (
                <View className="items-center mt-8">
                  {/* Shield icon above "Welcome to" */}
                  <View className="items-center justify-center mb-4">
                    <Image
                      source={require('../../public/shieldlogobest2.png')}
                      style={{ width: 100, height: 100, opacity: 0.75 }}
                      contentFit="contain"
                    />
                  </View>
                  <Text className="text-white/70 text-lg text-center mb-2">{'Welcome to'}</Text>
                  <Image
                    source={require('../../public/courialshield-wht.png')}
                    style={{ width: 200, height: 30 }}
                    contentFit="contain"
                  />
                </View>
              )}
              {/* Steps image for Easy Claims slide */}
              {slide.backgroundImage === 'easy-claims' && (
                <Image
                  source={require('../../public/steps.png')}
                  style={{ width: 350, height: 62, marginTop: 24 }}
                  contentFit="contain"
                />
              )}
            </Animated.View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ width: SCREEN_WIDTH }}>
      <LinearGradient
        colors={slide.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <View className="flex-1 items-center justify-center px-8 pb-40">
          <Animated.View style={animatedStyle} className="items-center">
            <View className="w-40 h-40 rounded-full bg-white/10 items-center justify-center mb-10">
              {slide.icon === 'logo' ? (
                <Image
                  source={require('../../public/shieldicon2.png')}
                  style={{ width: 120, height: 120, tintColor: 'rgba(255, 255, 255, 0.5)' }}
                  contentFit="contain"
                />
              ) : (
                slide.icon
              )}
            </View>
            <Text className="text-white text-3xl font-bold text-center mb-4">
              {slide.title}
            </Text>
            <Text className="text-white/70 text-lg text-center leading-7">
              {slide.subtitle}
            </Text>
          </Animated.View>
        </View>
      </LinearGradient>
    </View>
  );
}

function PaginationDot({
  index,
  scrollX,
}: {
  index: number;
  scrollX: Animated.SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * SCREEN_WIDTH,
      index * SCREEN_WIDTH,
      (index + 1) * SCREEN_WIDTH,
    ];

    const width = interpolate(
      scrollX.value,
      inputRange,
      [8, 24, 8],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.3, 1, 0.3],
      Extrapolation.CLAMP
    );

    return {
      width,
      opacity,
    };
  });

  return (
    <Animated.View
      style={animatedStyle}
      className="h-2 rounded-full bg-white mx-1"
    />
  );
}
