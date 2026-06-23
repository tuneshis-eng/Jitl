import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAppConfig } from "@/contexts/AppContext";
import {
  useGetLeadById,
  useGenerateMessage,
  useSendMessage,
  useUpdateLead,
  useCreateSchedule,
  getGetLeadsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

export default function LeadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { config } = useAppConfig();
  const queryClient = useQueryClient();

  const [editMessage, setEditMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("");

  const { data: lead, isLoading, refetch } = useGetLeadById(id!, {
    query: { enabled: !!id },
  });

  const generateMutation = useGenerateMessage();
  const sendMutation = useSendMessage();
  const updateMutation = useUpdateLead();
  const scheduleMutation = useCreateSchedule();

  const handleGenerate = async () => {
    if (!config.groqApiKey) {
      Alert.alert("Clé API manquante", "Configurez votre clé Groq dans les paramètres");
      return;
    }
    if (!lead) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await generateMutation.mutateAsync({
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
      setEditMessage(result.message);
      setIsEditing(true);
      refetch();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      Alert.alert("Erreur", err instanceof Error ? err.message : "Erreur inconnue");
    }
  };

  const handleSend = async () => {
    if (!lead) return;
    const msg = isEditing ? editMessage : (lead.generatedMessage ?? "");
    if (!msg) {
      Alert.alert("Message manquant", "Générez ou écrivez un message d'abord");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await sendMutation.mutateAsync({
        leadId: lead.id,
        phone: lead.phone,
        message: msg,
        mock: true,
      });
      await updateMutation.mutateAsync({
        id: lead.id,
        data: { status: "contacted" },
      });
      setIsEditing(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: getGetLeadsQueryKey() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Message envoyé", `WhatsApp (mode mock) envoyé à ${lead.phone}`);
    } catch (err) {
      Alert.alert("Erreur", err instanceof Error ? err.message : "Erreur inconnue");
    }
  };

  const handleSchedule = async () => {
    if (!lead || !schedDate || !schedTime) {
      Alert.alert("Données manquantes", "Entrez une date et une heure");
      return;
    }
    try {
      await scheduleMutation.mutateAsync({
        leadId: lead.id,
        phone: lead.phone,
        date: schedDate,
        time: schedTime,
      });
      setShowSchedule(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: getGetLeadsQueryKey() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("RDV créé", `Rendez-vous planifié pour le ${schedDate} à ${schedTime}`);
    } catch (err) {
      Alert.alert("Erreur", err instanceof Error ? err.message : "Erreur");
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!lead) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.foreground }]}>Lead introuvable</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: colors.primary }}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const messageToShow = isEditing ? editMessage : (lead.generatedMessage ?? "");

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 24),
          paddingTop: Platform.OS === "web" ? 24 : 16,
        },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={[
          styles.infoCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>
          {lead.title}
        </Text>

        <View style={styles.details}>
          <Detail icon="map-pin" label="Ville" value={lead.city} colors={colors} />
          <Detail icon="phone" label="Téléphone" value={lead.phone} colors={colors} />
          {lead.price && <Detail icon="tag" label="Prix" value={lead.price} colors={colors} />}
          {lead.surface && <Detail icon="maximize" label="Surface" value={lead.surface} colors={colors} />}
          {lead.rooms && <Detail icon="grid" label="Pièces" value={lead.rooms} colors={colors} />}
          <Detail
            icon="user"
            label="Type"
            value={lead.isAgency ? "Agence" : "Particulier"}
            colors={colors}
          />
          <Detail
            icon="bar-chart"
            label="Score confiance"
            value={`${Math.round((lead.confidenceScore ?? 0) * 100)}%`}
            colors={colors}
          />
        </View>

        {lead.description && (
          <Text style={[styles.description, { color: colors.mutedForeground }]}>
            {lead.description}
          </Text>
        )}
      </View>

      <View
        style={[
          styles.messageCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.messageHeader}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            Message WhatsApp
          </Text>
          <TouchableOpacity
            onPress={() => {
              if (messageToShow) setIsEditing((v) => !v);
            }}
          >
            <Feather
              name={isEditing ? "check" : "edit-2"}
              size={16}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>

        {isEditing ? (
          <TextInput
            value={editMessage}
            onChangeText={setEditMessage}
            style={[
              styles.messageInput,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        ) : messageToShow ? (
          <Text style={[styles.messageText, { color: colors.foreground }]}>
            {messageToShow}
          </Text>
        ) : (
          <Text style={[styles.messagePlaceholder, { color: colors.mutedForeground }]}>
            Aucun message généré. Utilisez le bouton ci-dessous.
          </Text>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              {
                backgroundColor: colors.accent,
                flex: 1,
              },
            ]}
            onPress={handleGenerate}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Feather name="cpu" size={16} color={colors.primary} />
            )}
            <Text style={[styles.actionText, { color: colors.primary }]}>
              {messageToShow ? "Regénérer" : "Générer avec IA"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              {
                backgroundColor: messageToShow ? colors.primary : colors.muted,
                flex: 1,
              },
            ]}
            onPress={handleSend}
            disabled={!messageToShow || sendMutation.isPending}
          >
            {sendMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather
                name="send"
                size={16}
                color={messageToShow ? "#fff" : colors.mutedForeground}
              />
            )}
            <Text
              style={[
                styles.actionText,
                {
                  color: messageToShow ? "#fff" : colors.mutedForeground,
                },
              ]}
            >
              Envoyer
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.scheduleToggle,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
        onPress={() => setShowSchedule((v) => !v)}
      >
        <Feather name="calendar" size={16} color={colors.primary} />
        <Text style={[styles.scheduleToggleText, { color: colors.primary }]}>
          Planifier un RDV
        </Text>
        <Feather
          name={showSchedule ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.mutedForeground}
        />
      </TouchableOpacity>

      {showSchedule && (
        <View
          style={[
            styles.scheduleCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.scheduleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.schedLabel, { color: colors.mutedForeground }]}>
                Date (ex: 2024-12-25)
              </Text>
              <TextInput
                value={schedDate}
                onChangeText={setSchedDate}
                placeholder="AAAA-MM-JJ"
                placeholderTextColor={colors.mutedForeground}
                style={[
                  styles.schedInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.schedLabel, { color: colors.mutedForeground }]}>
                Heure (ex: 14:30)
              </Text>
              <TextInput
                value={schedTime}
                onChangeText={setSchedTime}
                placeholder="HH:MM"
                placeholderTextColor={colors.mutedForeground}
                style={[
                  styles.schedInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
              />
            </View>
          </View>
          <TouchableOpacity
            style={[styles.schedSaveBtn, { backgroundColor: colors.primary }]}
            onPress={handleSchedule}
          >
            <Text style={[styles.actionText, { color: "#fff" }]}>
              Confirmer le RDV
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

function Detail({
  icon,
  label,
  value,
  colors,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.detailRow}>
      <Feather name={icon} size={14} color={colors.mutedForeground} />
      <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <Text style={[styles.detailValue, { color: colors.foreground }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 16, fontFamily: "Inter_500Medium" },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cardTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", lineHeight: 22 },
  details: { gap: 8 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailLabel: { fontSize: 13, fontFamily: "Inter_400Regular", width: 110 },
  detailValue: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  description: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  messageCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  messageText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  messagePlaceholder: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 100,
    lineHeight: 22,
  },
  actions: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  scheduleToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  scheduleToggleText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  scheduleCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  scheduleRow: { flexDirection: "row", gap: 12 },
  schedLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 4 },
  schedInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  schedSaveBtn: {
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
  },
});
