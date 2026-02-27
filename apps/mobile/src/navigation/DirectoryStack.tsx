import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import DirectoryScreen from "../screens/DirectoryScreen";
import ProfileDetailScreen from "../screens/ProfileDetailScreen";

export type DirectoryStackParamList = {
  DirectoryList: undefined;
  ProfileDetail: { profileId: string };
};

const Stack = createNativeStackNavigator<DirectoryStackParamList>();

export default function DirectoryStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="DirectoryList"
        component={DirectoryScreen}
        options={{ title: "Directory" }}
      />
      <Stack.Screen
        name="ProfileDetail"
        component={ProfileDetailScreen}
        options={{ title: "Profile" }}
      />
    </Stack.Navigator>
  );
}
