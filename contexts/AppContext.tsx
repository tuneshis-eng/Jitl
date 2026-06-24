import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface AppConfig {
  backendUrl: string;
  groqApiKey: string;
  customPrompt: string;
  maxLeads: number;
  delayMin: number;
  delayMax: number;
  language: "fr" | "ar";
  onboardingDone: boolean;
}

interface AppContextType {
  config: AppConfig;
  updateConfig: (updates: Partial<AppConfig>) => Promise<void>;
  isLoading: boolean;
}

const DEFAULT_CONFIG: AppConfig = {
  backendUrl: "",
  groqApiKey: "",
  customPrompt:
    "Bonjour, je suis agent immobilier et je suis intéressé par votre bien. Pourriez-vous me donner plus d'informations ?",
  maxLeads: 10,
  delayMin: 30,
  delayMax: 60,
  language: "fr",
  onboardingDone: false,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const stored = await AsyncStorage.getItem("app_config");

        if (stored) {
          setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(stored) });
        }
      } catch (e) {
        console.log("Config load error:", e);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  const updateConfig = async (updates: Partial<AppConfig>) => {
    try {
      const newConfig = { ...config, ...updates };
      setConfig(newConfig);
      await AsyncStorage.setItem("app_config", JSON.stringify(newConfig));
    } catch (e) {
      console.log("Config save error:", e);
    }
  };

  return (
    <AppContext.Provider value={{ config, updateConfig, isLoading }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppConfig() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppConfig must be used within AppProvider");
  return ctx;
}
