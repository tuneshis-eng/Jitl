import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useGetLeads, useGetLogs } from "@workspace/api-client-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  bg: string;
}

function StatCard({ label, value, icon, color, bg }: StatCardProps) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.foreground }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
    </View>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  const {
    data: leadsData,
    isLoading,
    refetch,
    isRefetching,
  } = useGetLeads({ limit: 500 });

  const { data: logsData } = useGetLogs({ limit: 5 });

  const leads = leadsData?.leads ?? [];
  const total = leadsData?.total ?? 0;
  const contacted = leads.filter((l) => l.status === "contacted").length;
  const scheduled = leads.filter((l) => l.status === "scheduled").length;
  const newLeads = leads.filter((l) => l.status === "new").length;

  const recentLogs = logsData?.logs ?? [];

  const logColor = (level: string) => {
    switch (level) {
      case "success":
        return colors.success;
      case "error":
        return colors.destructive;
      case "warn":
        return colors.warning;
      default:
        return colors.mutedForeground;
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
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
            Bienvenue
          </Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            AgenceProspect
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.settingsBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => router.push("/settings")}
        >
          <Feather name="settings" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        Statistiques
      </Text>

      <View style={styles.statsGrid}>
        <StatCard
          label="Total leads"
          value={total}
          icon="users"
          color={colors.primary}
          bg={colors.accent}
        />
        <StatCard
          label="Nouveaux"
          value={newLeads}
          icon="user-plus"
          color={colors.warning}
          bg="#FEF3C7"
        />
        <StatCard
          label="Contactes"
          value={contacted}
          icon="message-circle"
          color={colors.success}
          bg="#DCFCE7"
        />
        <StatCard
          label="RDV planifies"
          value={scheduled}
          icon="calendar"
          color="#8B5CF6"
          bg="#EDE9FE"
        />
      </View>

      <View style={styles.quickActions}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Actions rapides
        </Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(tabs)/scraper")}
          >
            <Feather name="search" size={18} color="#fff" />
            <Text style={[styles.actionText, { color: "#fff" }]}>
              Nouveau scraping
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              {
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
              },
            ]}
            onPress={() => router.push("/(tabs)/campaign")}
          >
            <Feather name="send" size={18} color={colors.foreground} />
            <Text style={[styles.actionText, { color: colors.foreground }]}>
              Lancer campagne
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {recentLogs.length > 0 && (
        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Activite recente
          </Text>
          <View
            style={[
              styles.logsCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            {recentLogs.map((log) => (
              <View key={log.id} style={styles.logRow}>
                <View
                  style={[
                    styles.logDot,
                    { backgroundColor: logColor(log.level) },
                  ]}
                />
                <Text
                  style={[
                    styles.logText,
                    { color: colors.foreground },
                  ]}
                  numberOfLines={1}
                >
                  {log.message}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {isLoading && (
        <Text
          style={[
            styles.loadingText,
            { color: colors.mutedForeground },
          ]}
        >
          Chargement...
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular" },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  settingsBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginBottom: -8,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { fontSize: 28, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  quickActions: { gap: 12 },
  actionsRow: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  logsCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  logText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  loadingText: {
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
});
