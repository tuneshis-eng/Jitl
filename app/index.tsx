import { Redirect } from "expo-router";
import { useAppConfig } from "@/contexts/AppContext";
import { View, ActivityIndicator } from "react-native";

export default function IndexScreen() {
  const { config, isLoading } = useAppConfig();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    );
  }

  if (!config.onboardingDone) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
