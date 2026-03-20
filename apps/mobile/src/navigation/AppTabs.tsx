import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { NavigatorScreenParams } from "@react-navigation/native";
import FeedStack, { type FeedStackParamList } from "./FeedStack";
import MessagesStack, { type MessagesStackParamList } from "./MessagesStack";
import DirectoryStack from "./DirectoryStack";
import FacultyStack, { type FacultyStackParamList } from "./FacultyStack";
import QuestionsStack, { type QuestionsStackParamList } from "./QuestionsStack";
import MeStack, { type MeStackParamList } from "./MeStack";

export type AppTabsParamList = {
  Feed: NavigatorScreenParams<FeedStackParamList>;
  Messages: NavigatorScreenParams<MessagesStackParamList>;
  Directory: undefined;
  Faculty: NavigatorScreenParams<FacultyStackParamList>;
  Questions: NavigatorScreenParams<QuestionsStackParamList>;
  Me: NavigatorScreenParams<MeStackParamList>;
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
      <Tab.Screen
        name="Faculty"
        component={FacultyStack}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Questions"
        component={QuestionsStack}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Me"
        component={MeStack}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
}
