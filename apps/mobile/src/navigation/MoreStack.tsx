import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MoreScreen from "../screens/MoreScreen";
import DirectoryScreen from "../screens/DirectoryScreen";
import ProfileDetailScreen from "../screens/ProfileDetailScreen";
import QuestionsScreen from "../screens/QuestionsScreen";
import QuestionDetailScreen from "../screens/QuestionDetailScreen";
import NewQuestionScreen from "../screens/NewQuestionScreen";
import AdminScreen from "../screens/AdminScreen";
import AdminMembersScreen from "../screens/AdminMembersScreen";
import AdminMemberDetailScreen from "../screens/AdminMemberDetailScreen";
import AdminInstructorsScreen from "../screens/AdminInstructorsScreen";
import AdminInstructorDetailScreen from "../screens/AdminInstructorDetailScreen";
import AdminPostsModerationScreen from "../screens/AdminPostsModerationScreen";

export type MoreStackParamList = {
  MoreMenu: undefined;
  DirectoryList: undefined;
  ProfileDetail: { profileId: string };
  QuestionsList: undefined;
  QuestionDetail: { questionId: string };
  NewQuestion: undefined;
  AdminDashboard: undefined;
  AdminMembers: undefined;
  AdminMemberDetail: { profileId: string };
  AdminInstructors: undefined;
  AdminInstructorDetail: { profileId: string };
  AdminPostsModeration: undefined;
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
        name="NewQuestion"
        component={NewQuestionScreen}
        options={{ title: "Ask a Question" }}
      />
      <Stack.Screen
        name="AdminDashboard"
        component={AdminScreen}
        options={{ title: "Admin" }}
      />
      <Stack.Screen
        name="AdminMembers"
        component={AdminMembersScreen}
        options={{ title: "Members" }}
      />
      <Stack.Screen
        name="AdminMemberDetail"
        component={AdminMemberDetailScreen}
        options={{ title: "Member Detail" }}
      />
      <Stack.Screen
        name="AdminInstructors"
        component={AdminInstructorsScreen}
        options={{ title: "Instructors" }}
      />
      <Stack.Screen
        name="AdminInstructorDetail"
        component={AdminInstructorDetailScreen}
        options={{ title: "Instructor Detail" }}
      />
      <Stack.Screen
        name="AdminPostsModeration"
        component={AdminPostsModerationScreen}
        options={{ title: "Posts Moderation" }}
      />
    </Stack.Navigator>
  );
}
