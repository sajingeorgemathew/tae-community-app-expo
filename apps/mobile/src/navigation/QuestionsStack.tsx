import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import QuestionsScreen from "../screens/QuestionsScreen";
import QuestionDetailScreen from "../screens/QuestionDetailScreen";
import NewQuestionScreen from "../screens/NewQuestionScreen";
export type QuestionsStackParamList = {
  QuestionsList: undefined;
  QuestionDetail: { questionId: string };
  NewQuestion: undefined;
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
      <Stack.Screen
        name="NewQuestion"
        component={NewQuestionScreen}
        options={{ title: "Ask a Question" }}
      />
    </Stack.Navigator>
  );
}
