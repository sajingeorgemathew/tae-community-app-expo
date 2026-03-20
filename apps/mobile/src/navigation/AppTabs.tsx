import React from "react";
import { Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { NavigatorScreenParams } from "@react-navigation/native";
import HomeStack, { type HomeStackParamList } from "./HomeStack";
import FeedStack, { type FeedStackParamList } from "./FeedStack";
import MessagesStack, { type MessagesStackParamList } from "./MessagesStack";
import FacultyStack, { type FacultyStackParamList } from "./FacultyStack";
import MeStack, { type MeStackParamList } from "./MeStack";
import MoreStack, { type MoreStackParamList } from "./MoreStack";

export type AppTabsParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  Feed: NavigatorScreenParams<FeedStackParamList>;
  Messages: NavigatorScreenParams<MessagesStackParamList>;
  Faculty: NavigatorScreenParams<FacultyStackParamList>;
  Me: NavigatorScreenParams<MeStackParamList>;
  More: NavigatorScreenParams<MoreStackParamList>;
};

const TAB_ICONS: Record<keyof AppTabsParamList, string> = {
  Home: "\u2302",     // ⌂
  Feed: "\u2637",     // ☷
  Messages: "\u2709", // ✉
  Faculty: "\u{1F393}", // 🎓
  Me: "\u2603",       // ☃ (person placeholder)
  More: "\u22EF",     // ⋯
};

const Tab = createBottomTabNavigator<AppTabsParamList>();

export default function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        tabBarIcon: ({ color, size }) => (
          <Text style={{ fontSize: size, color, textAlign: "center" }}>
            {TAB_ICONS[route.name as keyof AppTabsParamList] ?? "?"}
          </Text>
        ),
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Feed"
        component={FeedStack}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesStack}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Faculty"
        component={FacultyStack}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Me"
        component={MeStack}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="More"
        component={MoreStack}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
}
