import React, { useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ViewToken,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

const ONBOARDING_KEY = "aozora_onboarding_done";

type Slide = {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  iconBg: [string, string];
  accentColor: string;
  title: string;
  subtitle: string;
};

const SLIDES: Slide[] = [
  {
    id: "welcome",
    icon: "home",
    iconBg: ["#818cf8", "#4f46e5"],
    accentColor: "#818cf8",
    title: "Welcome to Aozora",
    subtitle:
      "Find safe, affordable dorms near your school in Lopez, Quezon — all in one place.",
  },
  {
    id: "explore",
    icon: "map-pin",
    iconBg: ["#34d399", "#059669"],
    accentColor: "#34d399",
    title: "Browse & Explore",
    subtitle:
      "Discover verified listings on an interactive map. Filter by price, distance, and amenities.",
  },
  {
    id: "visit",
    icon: "calendar",
    iconBg: ["#f472b6", "#db2777"],
    accentColor: "#f472b6",
    title: "Book a Visit",
    subtitle:
      "Schedule a dorm visit in seconds. Owners confirm appointments and you get notified instantly.",
  },
  {
    id: "connect",
    icon: "message-circle",
    iconBg: ["#fb923c", "#ea580c"],
    accentColor: "#fb923c",
    title: "Stay Connected",
    subtitle:
      "Chat with dorm owners, track your visits, and receive reminders — all in the app.",
  },
];

async function markDone() {
  await AsyncStorage.setItem(ONBOARDING_KEY, "1");
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const goNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    await markDone();
    router.replace("/(auth)/login");
  };

  const isLast = activeIndex === SLIDES.length - 1;
  const activeSlide = SLIDES[activeIndex];

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#0f0e1a", "#1e1b4b", "#3730a3"]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
      />

      <View style={[styles.blob1, { backgroundColor: `${activeSlide.accentColor}18` }]} />
      <View style={[styles.blob2, { backgroundColor: `${activeSlide.accentColor}10` }]} />

      <View style={[styles.skipRow, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
        <TouchableOpacity onPress={handleFinish} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEventThrottle={16}
        renderItem={({ item }) => <SlideItem slide={item} />}
      />

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) + 12 }]}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View
              key={s.id}
              style={[
                styles.dot,
                i === activeIndex
                  ? [styles.dotActive, { backgroundColor: activeSlide.accentColor }]
                  : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.nextBtn}
          onPress={goNext}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={activeSlide.iconBg}
            style={styles.nextGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {isLast ? (
              <>
                <Text style={styles.nextText}>Get Started</Text>
                <Feather name="arrow-right" size={18} color="#fff" />
              </>
            ) : (
              <Feather name="arrow-right" size={22} color="#fff" />
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SlideItem({ slide }: { slide: Slide }) {
  return (
    <View style={styles.slide}>
      <View style={styles.illustrationArea}>
        <View style={styles.iconRing}>
          <LinearGradient
            colors={slide.iconBg}
            style={styles.iconBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Feather name={slide.icon} size={52} color="#fff" />
          </LinearGradient>
        </View>
      </View>

      <View style={styles.textArea}>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  blob1: {
    position: "absolute",
    width: 340,
    height: 340,
    borderRadius: 170,
    top: -120,
    right: -120,
  },
  blob2: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    bottom: 80,
    left: -80,
  },

  skipRow: {
    alignItems: "flex-end",
    paddingHorizontal: 28,
    paddingBottom: 8,
  },
  skipText: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255,255,255,0.45)",
  },

  slide: {
    width,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    gap: 48,
  },

  illustrationArea: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconRing: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  iconBadge: {
    width: 140,
    height: 140,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
  },

  textArea: {
    alignItems: "center",
    gap: 14,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#ffffff",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 24,
  },

  footer: {
    paddingHorizontal: 28,
    paddingTop: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  dots: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 28,
  },
  dotInactive: {
    width: 8,
    backgroundColor: "rgba(255,255,255,0.25)",
  },

  nextBtn: {
    borderRadius: 50,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 10,
  },
  nextGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 28,
    minWidth: 64,
  },
  nextText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.2,
  },
});
