import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAppConfig } from "@/contexts/AppContext";
import { useStartScrape } from "../../src/api";
import type { Lead } from "../../src/api";
import * as Haptics from "expo-haptics";

const MUBAWAB_PRESETS = [
  {
    label: "Vente appartements - Casablanca",
    url: "https://www.mubawab.ma/fr/sc/casablanca/appartements-a-vendre",
  },
  {
    label: "Vente villas - Marrakech",
    url: "https://www.mubawab.ma/fr/sc/marrakech/villas-a-vendre",
  },
  {
    label: "Vente maisons - Rabat",
    url: "https://www.mubawab.ma/fr/sc/rabat/maisons-a-vendre",
  },
  {
    label: "Vente appartements - Tanger",
    url: "https://www.mubawab.ma/fr/sc/tanger/appartements-a-vendre",
  },
];

export default function ScraperScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { config } = useAppConfig();

  const [url, setUrl] = useState(
    "https://www.mubawab.ma/fr/sc/casablanca/appartements-a-vendre"
  );
  const [maxLeads, setMaxLeads] = useState(String(config.maxLeads));
  const [result, setResult] = useState<{
    leads: Lead[];
    errors: string[];
  } | null>(null);

  const scrapeMutation = useStartScrape();
  const isLoading = scrapeMutation.isPending;

  const handleScrape = async () => {
    if (!url.trim()) {
      Alert.alert("URL requise", "Entrez une URL Mubawab valide");
      return;
    }
    if (!url.includes("mubawab.ma")) {
      Alert.alert(
        "URL invalide",
        "L'URL doit pointer vers mubawab.ma"
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setResult(null);

    try {
      const data = await scrapeMutation.mutateAsync({
        url,
        maxLeads: parseInt(maxLeads) || 10,
        groqApiKey: config.groqApiKey || undefined,
      });
      setResult({ leads: data.leads, errors: data.errors ?? [] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      Alert.alert("Erreur de scraping", msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 80),
          paddingTop: Platform.OS === "web" ? 24 : 16,
        },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>
          URL Mubawab
        </Text>
        <TextInput
          value={url}
          onChangeText={setUrl}
          style={[
            styles.urlInput,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
              color: colors.foreground,
            },
          ]}
          placeholder="https://www.mubawab.ma/..."
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          multiline
          numberOfLines={2}
        />

        <Text style={[styles.presetsLabel, { color: colors.mutedForeground }]}>
          Suggestions rapides
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.presets}>
            {MUBAWAB_PRESETS.map((p) => (
              <TouchableOpacity
                key={p.url}
                style={[
                  styles.presetBtn,
                  {
                    backgroundColor:
                      url === p.url ? colors.accent : colors.secondary,
                    borderColor:
                      url === p.url ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setUrl(p.url)}
              >
                <Text
                  style={[
                    styles.presetText,
                    {
                      color:
                        url === p.url
                          ? colors.accentForeground
                          : colors.foreground,
                    },
                  ]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.maxLeadsRow}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
            Nombre de leads max
          </Text>
          <TextInput
            value={maxLeads}
            onChangeText={setMaxLeads}
            style={[
              styles.maxLeadsInput,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
            keyboardType="number-pad"
          />
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.scrapeBtn,
          { backgroundColor: isLoading ? colors.muted : colors.primary },
        ]}
        onPress={handleScrape}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : (
          <Feather name="search" size={18} color="#fff" />
        )}
        <Text
          style={[
            styles.scrapeBtnText,
            {
              color: isLoading ? colors.mutedForeground : "#fff",
            },
          ]}
        >
          {isLoading ? "Scraping en cours..." : "Lancer le scraping"}
        </Text>
      </TouchableOpacity>

      {isLoading && (
        <View
          style={[
            styles.progressCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <ActivityIndicator color={colors.primary} />
          <View>
            <Text style={[styles.progressTitle, { color: colors.foreground }]}>
              Analyse de Mubawab...
            </Text>
            <Text
              style={[
                styles.progressSubtitle,
                { color: colors.mutedForeground },
              ]}
            >
              Extraction des annonces et numeros
            </Text>
          </View>
        </View>
      )}

      {result && (
        <View
          style={[
            styles.resultsCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.resultsHeader}>
            <Feather
              name={result.leads.length > 0 ? "check-circle" : "alert-circle"}
              size={20}
              color={
                result.leads.length > 0 ? colors.success : colors.warning
              }
            />
            <Text style={[styles.resultsTitle, { color: colors.foreground }]}>
              {result.leads.length} lead{result.leads.length !== 1 ? "s" : ""}{" "}
              extrait{result.leads.length !== 1 ? "s" : ""}
            </Text>
          </View>

          {result.leads.map((lead) => (
            <View
              key={lead.id}
              style={[
                styles.leadRow,
                { borderTopColor: colors.border },
              ]}
            >
              <View style={styles.leadInfo}>
                <Text
                  style={[styles.leadTitle, { color: colors.foreground }]}
                  numberOfLines={1}
                >
                  {lead.title}
                </Text>
                <Text
                  style={[
                    styles.leadMeta,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {lead.city} · {lead.phone}
                </Text>
              </View>
              <View
                style={[
                  styles.agencyBadge,
                  {
                    backgroundColor: lead.isAgency
                      ? "#FEF3C7"
                      : colors.accent,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontFamily: "Inter_600SemiBold",
                    color: lead.isAgency ? "#92400E" : colors.accentForeground,
                  }}
                >
                  {lead.isAgency ? "Agence" : "Particulier"}
                </Text>
              </View>
            </View>
          ))}

          {result.errors.length > 0 && (
            <View style={[styles.errorsBox, { backgroundColor: "#FEF2F2" }]}>
              <Text style={[styles.errorsTitle, { color: "#DC2626" }]}>
                {result.errors.length} erreur
                {result.errors.length !== 1 ? "s" : ""}
              </Text>
              {result.errors.slice(0, 3).map((e, i) => (
                <Text key={i} style={{ fontSize: 12, color: "#DC2626" }}>
                  {e}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 16 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  urlInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  presetsLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: -4,
  },
  presets: { flexDirection: "row", gap: 8, paddingBottom: 4 },
  presetBtn: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  presetText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  maxLeadsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  maxLeadsInput: {
    width: 64,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  scrapeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  scrapeBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  progressCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  progressTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  progressSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  resultsCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
  },
  resultsTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  leadRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  leadInfo: { flex: 1 },
  leadTitle: { fontSize: 13, fontFamily: "Inter_500Medium" },
  leadMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  agencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    marginLeft: 8,
  },
  errorsBox: {
    margin: 12,
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  errorsTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
