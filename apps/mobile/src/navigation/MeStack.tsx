import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MeScreen from "../screens/MeScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import PostDetailScreen from "../screens/PostDetailScreen";
import ImageViewerScreen from "../screens/ImageViewerScreen";

export type MeStackParamList = {
  MeHome: undefined;
  EditProfile: undefined;
  PostDetail: { postId: string };
  ImageViewer: { uri: string };
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
      <Stack.Screen
        name="PostDetail"
        component={PostDetailScreen}
        options={{ title: "Post" }}
      />
      <Stack.Screen
        name="ImageViewer"
        component={ImageViewerScreen}
        options={{
          title: "",
          headerShown: false,
          presentation: "fullScreenModal",
          animation: "fade",
        }}
      />
    </Stack.Navigator>
  );
}
