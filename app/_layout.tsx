import { ConvexProvider } from "convex/react";
import { Slot } from "expo-router";
import { convex } from "../lib/convex";
import { AuthProvider } from "../context/AuthContext";
import { NotificationProvider } from "../context/NotificationContext";

export default function RootLayout() {
  return (
    <ConvexProvider client={convex}>
      <AuthProvider>
        <NotificationProvider>
          <Slot />
        </NotificationProvider>
      </AuthProvider>
    </ConvexProvider>
  );
}
