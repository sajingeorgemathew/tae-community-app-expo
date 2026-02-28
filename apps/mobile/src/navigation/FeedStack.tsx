import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import FeedScreen from "../screens/FeedScreen";
import PostDetailScreen from "../screens/PostDetailScreen";

export type FeedStackParamList = {
  FeedList: undefined;
  PostDetail: { postId: string };
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
    </Stack.Navigator>
  );
}
