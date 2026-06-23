import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import {
  useGetLogs,
  getGetLogsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import axios from "axios";

const LEVEL_STYLES: Record<
  string,
  { color: string; bg: string; label: string }
> = {
  info: { color: "#3B82F6", bg: "#EFF6FF", label: "INFO" },
  success: { color: "#16A34A", bg: "#F0FDF4", label: "OK" },
  warn: { color: "#D97706", bg: "#FFFBEB", label: "WARN" },
  error: { color: "#DC2626", bg: "#FEF2F2", label: "ERR" },
};

export default function LogsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);

  const { data, refetch } = useGetLogs({ limit: 200 });
  const logs = [...(data?.logs ?? [])].reverse();

  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 3000);
    return () => clearInterval(interval);
  }, [refetch]);

  const handleClear = () => {
    Alert.alert(
      "Vider les logs",
      "Supprimer tous les logs ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Vider",
          style: "destructive",
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            try {
              await axios.delete("/api/v1/logs");
              queryClient.invalidateQueries({
                queryKey: getGetLogsQueryKey(),
              });
            } catch {
              // silently fail
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.toolbar,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
            paddingTop: Platform.OS === "web" ? 67 : 8,
          },
        ]}
      >
        <View style={styles.toolbarLeft}>
          <View style={[styles.liveIndicator, { backgroundColor: colors.success }]} />
          <Text style={[styles.liveText, { color: colors.mutedForeground }]}>
            Live (3s)
          </Text>
          <Text style={[styles.countText, { color: colors.mutedForeground }]}>
            · {logs.length} entrees
          </Text>
        </View>
        <View style={styles.toolbarActions}>
          <TouchableOpacity onPress={() => refetch()} style={styles.toolbarBtn}>
            <Feather name="refresh-cw" size={16} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClear} style={styles.toolbarBtn}>
            <Feather name="trash-2" size={16} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={logs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const style = LEVEL_STYLES[item.level] ?? LEVEL_STYLES["info"];
          const time = new Date(item.createdAt).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
          return (
            <View
              style={[
                styles.logRow,
                {
                  backgroundColor: colors.card,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.levelTag,
                  { backgroundColor: style.bg },
                ]}
              >
                <Text style={[styles.levelText, { color: style.color }]}>
                  {style.label}
                </Text>
              </View>
              <View style={styles.logContent}>
                <Text
                  style={[styles.logMessage, { color: colors.foreground }]}
                >
                  {item.message}
                </Text>
                {item.details && (
                  <Text
                    style={[
                      styles.logDetails,
                      { color: colors.mutedForeground },
                    ]}
                    numberOfLines={2}
                  >
                    {item.details}
                  </Text>
                )}
              </View>
              <Text
                style={[styles.logTime, { color: colors.mutedForeground }]}
              >
                {time}
              </Text>
            </View>
          );
        }}
        contentContainerStyle={[
          styles.list,
          {
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 80),
          },
        ]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="terminal" size={48} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Console vide
            </Text>
            <Text
              style={[styles.emptyText, { color: colors.mutedForeground }]}
            >
              Les logs de l'application apparaissent ici
            </Text>
          </View>
        }
        scrollEnabled={!!logs.length}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toolbarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  countText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  toolbarActions: { flexDirection: "row", gap: 12 },
  toolbarBtn: {
    padding: 4,
  },
  list: { gap: 1 },
  logRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  levelTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 1,
  },
  levelText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  logContent: { flex: 1, gap: 2 },
  logMessage: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  logDetails: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
  logTime: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
