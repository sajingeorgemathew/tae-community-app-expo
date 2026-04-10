import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/state/auth";
import RootNavigator from "./src/navigation/RootNavigator";
import { usePresenceHeartbeat } from "./src/hooks/usePresenceHeartbeat";
import {
  bootstrapNotifications,
  configureNotificationHandler,
} from "./src/lib/notifications";

// Install the foreground notification handler eagerly at module load so
// any notification delivered before the first render still uses it.
configureNotificationHandler();

function PresenceHeartbeat() {
  usePresenceHeartbeat();
  return null;
}

function NotificationsBootstrap() {
  React.useEffect(() => {
    void bootstrapNotifications();
  }, []);
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationsBootstrap />
      <PresenceHeartbeat />
      <NavigationContainer>
        <RootNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
    </AuthProvider>
  );
}
