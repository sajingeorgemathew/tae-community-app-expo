import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MessagesScreen from "../screens/MessagesScreen";
import ConversationScreen from "../screens/ConversationScreen";

export type MessagesStackParamList = {
  MessagesList: undefined;
  Conversation: { conversationId: string; otherUserName?: string };
};

const Stack = createNativeStackNavigator<MessagesStackParamList>();

export default function MessagesStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MessagesList"
        component={MessagesScreen}
        options={{ title: "Messages" }}
      />
      <Stack.Screen
        name="Conversation"
        component={ConversationScreen}
        options={{ title: "Conversation" }}
      />
    </Stack.Navigator>
  );
}
