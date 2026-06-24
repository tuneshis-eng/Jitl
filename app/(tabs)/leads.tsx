import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  RefreshControl,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import {
  useGetLeads,
  useDeleteLead,
  type Lead,
} from "../../src/api";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

const STATUS_OPTIONS = [
  { key: undefined, label: "Tous" },
  { key: "new", label: "Nouveau" },
  { key: "contacted", label: "Contacte" },
  { key: "scheduled", label: "RDV" },
  { key: "rejected", label: "Rejete" },
] as const;

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  new: { bg: "#DBEAFE", text: "#1E40AF" },
  contacted: { bg: "#DCFCE7", text: "#166534" },
  scheduled: { bg: "#EDE9FE", text: "#5B21B6" },
  rejected: { bg: "#FEE2E2", text: "#991B1B" },
};

function LeadCard({
  lead,
  onDelete,
}: {
  lead: Lead;
  onDelete: (id: string) => void;
}) {
  const colors = useColors();
  const s = STATUS_COLORS[lead.status] ?? STATUS_COLORS["new"];

  return (
    <TouchableOpacity
      style={[
        styles.leadCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
      onPress={() => router.push({ pathname: "/lead/[id]", params: { id: lead.id } })}
      activeOpacity={0.7}
    >
      <View style={styles.leadHeader}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: s.bg },
          ]}
        >
          <Text style={[styles.statusText, { color: s.text }]}>
            {STATUS_OPTIONS.find((o) => o.key === lead.status)?.label ?? lead.status}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onDelete(lead.id);
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="trash-2" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <Text
        style={[styles.leadTitle, { color: colors.foreground }]}
        numberOfLines={2}
      >
        {lead.title}
      </Text>

      <View style={styles.leadMeta}>
        <View style={styles.metaItem}>
          <Feather name="map-pin" size={12} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
            {lead.city}
          </Text>
        </View>
        {lead.phone && (
          <View style={styles.metaItem}>
            <Feather name="phone" size={12} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {lead.phone}
            </Text>
          </View>
        )}
        {lead.price && (
          <View style={styles.metaItem}>
            <Feather name="tag" size={12} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {lead.price}
            </Text>
          </View>
        )}
      </View>

      {lead.generatedMessage && (
        <View
          style={[
            styles.messagePreview,
            { backgroundColor: colors.accent },
          ]}
        >
          <Feather name="message-circle" size={12} color={colors.primary} />
          <Text
            style={[
              styles.messageText,
              { color: colors.accentForeground },
            ]}
            numberOfLines={1}
          >
            {lead.generatedMessage}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function LeadsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch, isRefetching } = useGetLeads(
    statusFilter ? { status: statusFilter, limit: 200 } : { limit: 200 }
  );

  const deleteMutation = useDeleteLead();

  const leads = (data?.leads ?? []).filter(
    (l) =>
      !search ||
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.city.toLowerCase().includes(search.toLowerCase()) ||
      (l.phone && l.phone.includes(search))
  );

  const handleDelete = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await deleteMutation.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: ["getLeads"] });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.searchBar,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher par ville, titre, numero..."
          placeholderTextColor={colors.mutedForeground}
          style={[styles.searchInput, { color: colors.foreground }]}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filters}>
        {STATUS_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={String(opt.key)}
            style={[
              styles.filterBtn,
              {
                backgroundColor:
                  statusFilter === opt.key ? colors.primary : colors.card,
                borderColor:
                  statusFilter === opt.key ? colors.primary : colors.border,
              },
            ]}
            onPress={() =>
              setStatusFilter(opt.key as string | undefined)
            }
          >
            <Text
              style={[
                styles.filterText,
                {
                  color:
                    statusFilter === opt.key
                      ? colors.primaryForeground
                      : colors.foreground,
                },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={leads}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <LeadCard lead={item} onDelete={handleDelete} />
        )}
        contentContainerStyle={[
          styles.list,
          {
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 80),
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="users" size={48} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {isLoading ? "Chargement..." : "Aucun lead"}
            </Text>
            <Text
              style={[styles.emptyText, { color: colors.mutedForeground }]}
            >
              {isLoading
                ? ""
                : "Lancez un scraping pour trouver des leads"}
            </Text>
          </View>
        }
        scrollEnabled={!!leads.length}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: Platform.OS === "web" ? 24 : 8,
    marginBottom: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  filters: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  filterBtn: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  list: { paddingHorizontal: 16, gap: 10 },
  leadCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  leadHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  leadTitle: { fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 20 },
  leadMeta: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  messagePreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  messageText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
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
