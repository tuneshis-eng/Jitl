import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAppConfig } from "@/contexts/AppContext";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { config, updateConfig } = useAppConfig();

  const [backendUrl, setBackendUrl] = useState(config.backendUrl);
  const [groqApiKey, setGroqApiKey] = useState(config.groqApiKey);
  const [maxLeads, setMaxLeads] = useState(String(config.maxLeads));
  const [delayMin, setDelayMin] = useState(String(config.delayMin));
  const [delayMax, setDelayMax] = useState(String(config.delayMax));
  const [customPrompt, setCustomPrompt] = useState(config.customPrompt);
  const [language, setLanguage] = useState<"fr" | "ar">(config.language);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateConfig({
        backendUrl,
        groqApiKey,
        maxLeads: parseInt(maxLeads) || 10,
        delayMin: parseInt(delayMin) || 30,
        delayMax: parseInt(delayMax) || 60,
        customPrompt,
        language,
      });
      if (!config.onboardingDone) {
        await updateConfig({ onboardingDone: true });
        router.replace("/(tabs)");
      } else {
        router.back();
      }
    } catch {
      Alert.alert("Erreur", "Impossible de sauvegarder la configuration");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 24),
          paddingTop: Platform.OS === "web" ? 24 : 8,
        },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Section title="API Groq (IA)" colors={colors}>
        <InputField
          label="Clé API Groq"
          placeholder="gsk_..."
          value={groqApiKey}
          onChangeText={setGroqApiKey}
          secureTextEntry={!showKey}
          colors={colors}
          rightIcon={
            <TouchableOpacity onPress={() => setShowKey((v) => !v)}>
              <Feather
                name={showKey ? "eye-off" : "eye"}
                size={18}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>
          }
        />
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Obtenez votre clé sur console.groq.com
        </Text>
      </Section>

      <Section title="Connexion Backend" colors={colors}>
        <InputField
          label="URL Backend (optionnel)"
          placeholder="https://votre-backend.com"
          value={backendUrl}
          onChangeText={setBackendUrl}
          colors={colors}
          keyboardType="url"
        />
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Laissez vide pour utiliser le backend intégré
        </Text>
      </Section>

      <Section title="Paramètres de Prospection" colors={colors}>
        <View style={styles.row}>
          <View style={styles.rowItem}>
            <InputField
              label="Leads max"
              value={maxLeads}
              onChangeText={setMaxLeads}
              colors={colors}
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.rowItem}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              Délai (sec)
            </Text>
            <View style={styles.rangeRow}>
              <TextInput
                value={delayMin}
                onChangeText={setDelayMin}
                style={[
                  styles.rangeInput,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                keyboardType="number-pad"
                placeholder="30"
                placeholderTextColor={colors.mutedForeground}
              />
              <Text style={{ color: colors.mutedForeground }}>—</Text>
              <TextInput
                value={delayMax}
                onChangeText={setDelayMax}
                style={[
                  styles.rangeInput,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                keyboardType="number-pad"
                placeholder="60"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
          </View>
        </View>

        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
          Langue des messages
        </Text>
        <View style={styles.langRow}>
          {(["fr", "ar"] as const).map((lang) => (
            <TouchableOpacity
              key={lang}
              style={[
                styles.langBtn,
                {
                  backgroundColor:
                    language === lang ? colors.primary : colors.card,
                  borderColor:
                    language === lang ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setLanguage(lang)}
            >
              <Text
                style={{
                  color:
                    language === lang
                      ? colors.primaryForeground
                      : colors.foreground,
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 14,
                }}
              >
                {lang === "fr" ? "Francais" : "Arabe"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Section>

      <Section title="Prompt IA Personnalise" colors={colors}>
        <TextInput
          value={customPrompt}
          onChangeText={setCustomPrompt}
          style={[
            styles.textarea,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.foreground,
            },
          ]}
          multiline
          numberOfLines={4}
          placeholder="Instructions pour l'IA..."
          placeholderTextColor={colors.mutedForeground}
          textAlignVertical="top"
        />
      </Section>

      <TouchableOpacity
        style={[
          styles.saveButton,
          { backgroundColor: saving ? colors.muted : colors.primary },
        ]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.8}
      >
        <Feather
          name="save"
          size={18}
          color={saving ? colors.mutedForeground : colors.primaryForeground}
        />
        <Text
          style={[
            styles.saveText,
            {
              color: saving
                ? colors.mutedForeground
                : colors.primaryForeground,
            },
          ]}
        >
          {saving ? "Sauvegarde..." : "Sauvegarder"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Section({
  title,
  children,
  colors,
}: {
  title: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        {title}
      </Text>
      <View
        style={[
          styles.sectionContent,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

function InputField({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  colors,
  keyboardType,
  rightIcon,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean;
  colors: ReturnType<typeof useColors>;
  keyboardType?: "default" | "url" | "number-pad";
  rightIcon?: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <View style={styles.inputWrapper}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType || "default"}
          style={[
            styles.input,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
              color: colors.foreground,
            },
          ]}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {rightIcon && (
          <View style={styles.inputRight}>{rightIcon}</View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 20 },
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingLeft: 4,
  },
  sectionContent: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  inputWrapper: { position: "relative" },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    paddingRight: 44,
  },
  inputRight: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: -8 },
  row: { flexDirection: "row", gap: 12 },
  rowItem: { flex: 1 },
  rangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  rangeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  langRow: { flexDirection: "row", gap: 10 },
  langBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 100,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 4,
  },
  saveText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
