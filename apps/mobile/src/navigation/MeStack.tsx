import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MeScreen from "../screens/MeScreen";
import EditProfileScreen from "../screens/EditProfileScreen";

export type MeStackParamList = {
  MeHome: undefined;
  EditProfile: undefined;
};

const Stack = createNativeStackNavigator<MeStackParamList>();

export default function MeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MeHome"
        component={MeScreen}
        options={{ title: "Me" }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: "Edit Profile" }}
      />
    </Stack.Navigator>
  );
}
