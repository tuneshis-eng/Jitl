import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAppConfig } from "@/contexts/AppContext";

const STEPS = [
  {
    icon: "home" as const,
    title: "Bienvenue sur\nAgenceProspect",
    subtitle: "Automatisez votre prospection\nimmobilière sur Mubawab",
    body: "Trouvez des propriétaires vendeurs, générez des messages personnalisés avec l'IA et contactez-les sur WhatsApp — tout depuis votre téléphone.",
  },
  {
    icon: "alert-triangle" as const,
    title: "Avertissements\nLégaux",
    subtitle: "Lisez attentivement avant de continuer",
    body: "L'utilisation de cet outil pour contacter des propriétaires est soumise à la réglementation en vigueur au Maroc. Vous devez obtenir le consentement des personnes contactées et respecter le droit à la vie privée. Le scraping de sites web peut violer les conditions d'utilisation.",
  },
  {
    icon: "shield" as const,
    title: "Conformité RGPD\n& Protection des données",
    subtitle: "Vos responsabilités",
    body: "Vous êtes responsable du traitement des données personnelles collectées. Les numéros de téléphone ne doivent être utilisés qu'à des fins professionnelles légitimes. Les données sont stockées localement sur votre appareil. Vous pouvez les supprimer à tout moment.",
  },
  {
    icon: "check-circle" as const,
    title: "Prêt à commencer ?",
    subtitle: "Configurez votre compte",
    body: "En continuant, vous acceptez d'utiliser cet outil de manière éthique et légale. Configurez votre clé API Groq pour activer la génération de messages par IA.",
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [step, setStep] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const { updateConfig } = useAppConfig();

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isLegal = step === 1 || step === 2;

  const handleNext = async () => {
    if (isLast) {
      await updateConfig({ onboardingDone: true });
      router.replace("/settings");
      return;
    }
    setStep((s) => s + 1);
    setAccepted(false);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0),
        },
      ]}
    >
      <View style={styles.stepIndicator}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor:
                  i === step ? colors.primary : colors.border,
                width: i === step ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: colors.accent },
          ]}
        >
          <Feather name={current.icon} size={40} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>
          {current.title}
        </Text>
        <Text style={[styles.subtitle, { color: colors.primary }]}>
          {current.subtitle}
        </Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          {current.body}
        </Text>

        {isLegal && (
          <TouchableOpacity
            style={[
              styles.checkbox,
              {
                borderColor: accepted ? colors.primary : colors.border,
                backgroundColor: accepted ? colors.accent : "transparent",
              },
            ]}
            onPress={() => setAccepted((v) => !v)}
            activeOpacity={0.7}
          >
            <Feather
              name={accepted ? "check-square" : "square"}
              size={20}
              color={accepted ? colors.primary : colors.mutedForeground}
            />
            <Text
              style={[styles.checkboxText, { color: colors.foreground }]}
            >
              J'ai lu et j'accepte les conditions ci-dessus
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor:
                isLegal && !accepted ? colors.muted : colors.primary,
            },
          ]}
          onPress={handleNext}
          disabled={isLegal && !accepted}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.buttonText,
              {
                color:
                  isLegal && !accepted
                    ? colors.mutedForeground
                    : colors.primaryForeground,
              },
            ]}
          >
            {isLast ? "Configurer l'application" : "Continuer"}
          </Text>
          <Feather
            name="arrow-right"
            size={18}
            color={
              isLegal && !accepted
                ? colors.mutedForeground
                : colors.primaryForeground
            }
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  dot: { height: 8, borderRadius: 4 },
  content: { flex: 1 },
  contentContainer: {
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: 24,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 16,
    lineHeight: 22,
  },
  body: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 24,
    marginBottom: 24,
  },
  checkbox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
  },
  checkboxText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 20,
  },
  footer: { paddingHorizontal: 24, paddingTop: 12 },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
