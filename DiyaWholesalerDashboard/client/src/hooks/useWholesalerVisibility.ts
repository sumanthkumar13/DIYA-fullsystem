import { useEffect, useState } from "react";
import { getVisibilityMode, updateVisibilityMode, VisibilityMode } from "@/services/wholesalerSettings";

export function useWholesalerVisibility() {
  const [mode, setMode] = useState<VisibilityMode>("PUBLIC");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const m = await getVisibilityMode();
      setMode(m);
    } finally {
      setLoading(false);
    }
  }

  async function setVisibility(newMode: VisibilityMode) {
    setSaving(true);
    try {
      const m = await updateVisibilityMode(newMode);
      setMode(m);
      return m;
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return { mode, loading, saving, refresh, setVisibility };
}
