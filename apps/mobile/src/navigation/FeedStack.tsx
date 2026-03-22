import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import FeedScreen from "../screens/FeedScreen";
import PostDetailScreen from "../screens/PostDetailScreen";
import NewPostScreen from "../screens/NewPostScreen";
import EditPostScreen from "../screens/EditPostScreen";
import ImageViewerScreen from "../screens/ImageViewerScreen";

export type FeedStackParamList = {
  FeedList: undefined;
  PostDetail: { postId: string };
  NewPost: undefined;
  EditPost: { postId: string; content: string };
  ImageViewer: { uri: string };
};

const Stack = createNativeStackNavigator<FeedStackParamList>();

export default function FeedStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="FeedList"
        component={FeedScreen}
        options={{ title: "Feed" }}
      />
      <Stack.Screen
        name="PostDetail"
        component={PostDetailScreen}
        options={{ title: "Post" }}
      />
      <Stack.Screen
        name="NewPost"
        component={NewPostScreen}
        options={{ title: "New Post" }}
      />
      <Stack.Screen
        name="EditPost"
        component={EditPostScreen}
        options={{ title: "Edit Post" }}
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
