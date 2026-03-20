import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import FeedScreen from "../screens/FeedScreen";
import PostDetailScreen from "../screens/PostDetailScreen";
import NewPostScreen from "../screens/NewPostScreen";

export type FeedStackParamList = {
  FeedList: undefined;
  PostDetail: { postId: string };
  NewPost: undefined;
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
    </Stack.Navigator>
  );
}
