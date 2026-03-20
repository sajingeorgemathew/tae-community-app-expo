import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import QuestionsScreen from "../screens/QuestionsScreen";
import QuestionDetailScreen from "../screens/QuestionDetailScreen";

export type QuestionsStackParamList = {
  QuestionsList: undefined;
  QuestionDetail: { questionId: string };
};

const Stack = createNativeStackNavigator<QuestionsStackParamList>();

export default function QuestionsStack() {
  return (
    <Stack.Navigator>
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
    </Stack.Navigator>
  );
}
