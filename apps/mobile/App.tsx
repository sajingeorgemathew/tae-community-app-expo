import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/state/auth";
import RootNavigator from "./src/navigation/RootNavigator";
import { usePresenceHeartbeat } from "./src/hooks/usePresenceHeartbeat";

function PresenceHeartbeat() {
  usePresenceHeartbeat();
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <PresenceHeartbeat />
      <NavigationContainer>
        <RootNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
    </AuthProvider>
  );
}
