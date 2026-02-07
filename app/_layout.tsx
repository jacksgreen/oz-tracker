import { ConvexProvider } from "convex/react";
import { Slot } from "expo-router";
import { convex } from "../lib/convex";
import { AuthProvider } from "../context/AuthContext";
import { NotificationProvider } from "../context/NotificationContext";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import {
  useFonts,
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from "@expo-google-fonts/instrument-serif";
import { colors } from "../lib/theme";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.background.primary }} />;
  }

  return (
    <ConvexProvider client={convex}>
      <AuthProvider>
        <NotificationProvider>
          <StatusBar style="dark" />
          <Slot />
        </NotificationProvider>
      </AuthProvider>
    </ConvexProvider>
  );
}
