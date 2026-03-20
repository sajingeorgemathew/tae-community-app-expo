import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MoreScreen from "../screens/MoreScreen";
import DirectoryScreen from "../screens/DirectoryScreen";
import ProfileDetailScreen from "../screens/ProfileDetailScreen";
import QuestionsScreen from "../screens/QuestionsScreen";
import QuestionDetailScreen from "../screens/QuestionDetailScreen";
import AdminScreen from "../screens/AdminScreen";

export type MoreStackParamList = {
  MoreMenu: undefined;
  DirectoryList: undefined;
  ProfileDetail: { profileId: string };
  QuestionsList: undefined;
  QuestionDetail: { questionId: string };
  AdminDashboard: undefined;
};

const Stack = createNativeStackNavigator<MoreStackParamList>();

export default function MoreStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MoreMenu"
        component={MoreScreen}
        options={{ title: "More" }}
      />
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
      <Stack.Screen
        name="QuestionsList"
        component={QuestionsScreen}
        options={{ title: "Questions" }}
      />
      <Stack.Screen
        name="QuestionDetail"
        component={QuestionDetailScreen}
        options={{ title: "Question" }}
      />
      <Stack.Screen
        name="AdminDashboard"
        component={AdminScreen}
        options={{ title: "Admin" }}
      />
    </Stack.Navigator>
  );
}
