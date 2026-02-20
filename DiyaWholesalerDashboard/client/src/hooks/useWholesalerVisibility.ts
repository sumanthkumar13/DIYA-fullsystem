import { useEffect, useState } from "react";
import {
  getWholesalerSettings,
  updateWholesalerSettings,
  VisibilityMode,
} from "@/services/wholesalerSettings";

export function useWholesalerVisibility() {
  const [mode, setMode] = useState<VisibilityMode>("PUBLIC");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const settings = await getWholesalerSettings();
      setMode(settings.visibilityMode);
    } finally {
      setLoading(false);
    }
  }

  async function setVisibility(newMode: VisibilityMode) {
    setSaving(true);
    try {
      const updated = await updateWholesalerSettings({ visibilityMode: newMode });
      setMode(updated.visibilityMode);
      return updated.visibilityMode;
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return { mode, loading, saving, refresh, setVisibility };
}
