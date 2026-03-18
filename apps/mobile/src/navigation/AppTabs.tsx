import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { NavigatorScreenParams } from "@react-navigation/native";
import FeedStack, { type FeedStackParamList } from "./FeedStack";
import MessagesStack, { type MessagesStackParamList } from "./MessagesStack";
import DirectoryStack from "./DirectoryStack";
import MeScreen from "../screens/MeScreen";

export type AppTabsParamList = {
  Feed: NavigatorScreenParams<FeedStackParamList>;
  Messages: NavigatorScreenParams<MessagesStackParamList>;
  Directory: undefined;
  Me: undefined;
};

const Tab = createBottomTabNavigator<AppTabsParamList>();

export default function AppTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: true }}>
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
        name="Directory"
        component={DirectoryStack}
        options={{ headerShown: false }}
      />
      <Tab.Screen name="Me" component={MeScreen} />
    </Tab.Navigator>
  );
}
