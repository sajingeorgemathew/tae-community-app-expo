import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import FacultyScreen from "../screens/FacultyScreen";
import FacultyDetailScreen from "../screens/FacultyDetailScreen";

export type FacultyStackParamList = {
  FacultyList: undefined;
  FacultyDetail: { profileId: string };
};

const Stack = createNativeStackNavigator<FacultyStackParamList>();

export default function FacultyStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="FacultyList"
        component={FacultyScreen}
        options={{ title: "Faculty" }}
      />
      <Stack.Screen
        name="FacultyDetail"
        component={FacultyDetailScreen}
        options={{ title: "Faculty Detail" }}
      />
    </Stack.Navigator>
  );
}
