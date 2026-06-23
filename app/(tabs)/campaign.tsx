import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAppConfig } from "@/contexts/AppContext";
import {
  useGetLeads,
  useGenerateMessage,
  useSendMessage,
  useGetConfigQueryKey,
} from "@workspace/api-client-react";
import type { Lead } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

interface CampaignLead extends Lead {
  state: "pending" | "generating" | "ready" | "sending" | "sent" | "error";
  errorMsg?: string;
}

export default function CampaignScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { config } = useAppConfig();
  const queryClient = useQueryClient();

  const [running, setRunning] = useState(false);
  const [campaignLeads, setCampaignLeads] = useState<CampaignLead[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const { data } = useGetLeads({ status: "new", limit: 100 });
  const newLeads = data?.leads ?? [];

  const generateMutation = useGenerateMessage();
  const sendMutation = useSendMessage();

  const delay = (ms: number) =>
    new Promise((r) => setTimeout(r, ms));

  const handleStart = async () => {
    if (!config.groqApiKey) {
      Alert.alert(
        "Cle API manquante",
        "Configurez votre cle API Groq dans les parametres"
      );
      return;
    }

    if (newLeads.length === 0) {
      Alert.alert("Aucun lead", "Aucun nouveau lead a contacter. Lancez un scraping d'abord.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setRunning(true);
    const leads: CampaignLead[] = newLeads
      .slice(0, config.maxLeads)
      .map((l) => ({ ...l, state: "pending" as const }));
    setCampaignLeads(leads);
    setProgress({ done: 0, total: leads.length });

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      if (!lead) continue;

      setCampaignLeads((prev) =>
        prev.map((l, idx) =>
          idx === i ? { ...l, state: "generating" } : l
        )
      );

      try {
        const generated = await generateMutation.mutateAsync({
          leadId: lead.id,
          lead: {
            id: lead.id,
            phone: lead.phone,
            title: lead.title,
            city: lead.city,
            price: lead.price ?? undefined,
            surface: lead.surface ?? undefined,
            rooms: lead.rooms ?? undefined,
            description: lead.description ?? undefined,
            url: lead.url ?? undefined,
            status: lead.status,
            createdAt: lead.createdAt,
          },
          groqApiKey: config.groqApiKey,
          language: config.language,
          prompt: config.customPrompt || undefined,
        });

        setCampaignLeads((prev) =>
          prev.map((l, idx) =>
            idx === i
              ? {
                  ...l,
                  state: "sending",
                  generatedMessage: generated.message,
                }
              : l
          )
        );

        await delay(500);

        await sendMutation.mutateAsync({
          leadId: lead.id,
          phone: lead.phone,
          message: generated.message,
          mock: true,
        });

        setCampaignLeads((prev) =>
          prev.map((l, idx) =>
            idx === i ? { ...l, state: "sent" } : l
          )
        );

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setProgress((p) => ({ ...p, done: p.done + 1 }));

        const delayMs =
          (config.delayMin +
            Math.random() * (config.delayMax - config.delayMin)) *
          1000;
        if (i < leads.length - 1) {
          await delay(delayMs);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur";
        setCampaignLeads((prev) =>
          prev.map((l, idx) =>
            idx === i ? { ...l, state: "error", errorMsg: msg } : l
          )
        );
        setProgress((p) => ({ ...p, done: p.done + 1 }));
      }
    }

    setRunning(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    queryClient.invalidateQueries({ queryKey: ["getLeads"] });
  };

  const stateIcon = (
    state: CampaignLead["state"]
  ): { name: keyof typeof Feather.glyphMap; color: string } => {
    switch (state) {
      case "generating":
        return { name: "cpu", color: colors.primary };
      case "ready":
        return { name: "check", color: colors.success };
      case "sending":
        return { name: "send", color: colors.warning };
      case "sent":
        return { name: "check-circle", color: colors.success };
      case "error":
        return { name: "x-circle", color: colors.destructive };
      default:
        return { name: "clock", color: colors.mutedForeground };
    }
  };

  const sentCount = campaignLeads.filter((l) => l.state === "sent").length;
  const errorCount = campaignLeads.filter((l) => l.state === "error").length;
  const activeIdx = campaignLeads.findIndex(
    (l) => l.state === "generating" || l.state === "sending"
  );

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
    >
      <View
        style={[
          styles.summaryCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              {newLeads.length}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
              Leads disponibles
            </Text>
          </View>
          <View
            style={[
              styles.summaryDivider,
              { backgroundColor: colors.border },
            ]}
          />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.success }]}>
              {sentCount}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
              Messages envoyes
            </Text>
          </View>
          <View
            style={[
              styles.summaryDivider,
              { backgroundColor: colors.border },
            ]}
          />
          <View style={styles.summaryItem}>
            <Text
              style={[
                styles.summaryValue,
                { color: errorCount > 0 ? colors.destructive : colors.mutedForeground },
              ]}
            >
              {errorCount}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
              Erreurs
            </Text>
          </View>
        </View>

        {running && (
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.primary,
                  width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%`,
                },
              ]}
            />
          </View>
        )}
      </View>

      {!config.groqApiKey && (
        <View
          style={[
            styles.warningCard,
            { backgroundColor: "#FEF3C7", borderColor: "#F59E0B" },
          ]}
        >
          <Feather name="alert-triangle" size={16} color="#92400E" />
          <Text style={[styles.warningText, { color: "#92400E" }]}>
            Cle API Groq non configuree. Les messages seront envoyes sans
            personnalisation IA.
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.startBtn,
          {
            backgroundColor:
              running || newLeads.length === 0
                ? colors.muted
                : colors.primary,
          },
        ]}
        onPress={handleStart}
        disabled={running || newLeads.length === 0}
        activeOpacity={0.8}
      >
        {running ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : (
          <Feather name="play" size={18} color={running || newLeads.length === 0 ? colors.mutedForeground : "#fff"} />
        )}
        <Text
          style={[
            styles.startBtnText,
            {
              color:
                running || newLeads.length === 0
                  ? colors.mutedForeground
                  : "#fff",
            },
          ]}
        >
          {running
            ? `Envoi ${progress.done}/${progress.total}...`
            : `Lancer la campagne (${Math.min(newLeads.length, config.maxLeads)} leads)`}
        </Text>
      </TouchableOpacity>

      {campaignLeads.length > 0 && (
        <View
          style={[
            styles.leadsCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text
            style={[styles.leadsCardTitle, { color: colors.foreground }]}
          >
            Progression
          </Text>
          {campaignLeads.map((lead, i) => {
            const { name: iconName, color: iconColor } = stateIcon(lead.state);
            const isActive = i === activeIdx;
            return (
              <View
                key={lead.id}
                style={[
                  styles.campaignRow,
                  {
                    borderTopColor: colors.border,
                    backgroundColor: isActive
                      ? colors.accent
                      : "transparent",
                  },
                ]}
              >
                <View style={styles.campaignLeft}>
                  {(lead.state === "generating" || lead.state === "sending") ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Feather name={iconName} size={16} color={iconColor} />
                  )}
                </View>
                <View style={styles.campaignInfo}>
                  <Text
                    style={[styles.campaignTitle, { color: colors.foreground }]}
                    numberOfLines={1}
                  >
                    {lead.title}
                  </Text>
                  <Text
                    style={[
                      styles.campaignState,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {lead.state === "pending" && "En attente"}
                    {lead.state === "generating" && "Generation du message..."}
                    {lead.state === "ready" && "Pret a envoyer"}
                    {lead.state === "sending" && "Envoi en cours..."}
                    {lead.state === "sent" && "Message envoye"}
                    {lead.state === "error" && `Erreur: ${lead.errorMsg}`}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 16 },
  summaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  summaryRow: { flexDirection: "row", alignItems: "center" },
  summaryItem: { flex: 1, alignItems: "center", gap: 4 },
  summaryValue: { fontSize: 28, fontFamily: "Inter_700Bold" },
  summaryLabel: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  summaryDivider: { width: 1, height: 40 },
  progressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 2 },
  warningCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  warningText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  startBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  leadsCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  leadsCardTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    padding: 14,
    paddingBottom: 10,
  },
  campaignRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  campaignLeft: { width: 20, alignItems: "center" },
  campaignInfo: { flex: 1 },
  campaignTitle: { fontSize: 13, fontFamily: "Inter_500Medium" },
  campaignState: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
