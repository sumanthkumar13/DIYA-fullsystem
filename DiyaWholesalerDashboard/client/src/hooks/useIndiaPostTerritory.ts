import { useCallback, useEffect, useState } from "react";

type IndiaPostResponseRow = {
  Status?: string;
  PostOffice?: Array<{
    Name?: string;
    District?: string;
    State?: string;
  }>;
};

const pinCacheRef: Map<string, IndiaPostResponseRow[] | null> =
  (globalThis as unknown as { __diyaPinCache?: Map<string, IndiaPostResponseRow[] | null> }).__diyaPinCache ||
  new Map<string, IndiaPostResponseRow[] | null>();
(globalThis as unknown as { __diyaPinCache: typeof pinCacheRef }).__diyaPinCache = pinCacheRef;

/**
 * Pincode → India Post lookup + City/Town (post office) selection.
 * Mirrors wholesaler signup (`signup.tsx`) so territory labels stay consistent with registration.
 */
export function useIndiaPostTerritory() {
  const [pincode, setPincode] = useState("");
  const [districtHint, setDistrictHint] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [pinApiError, setPinApiError] = useState<string | null>(null);
  const [postOfficeSuggestions, setPostOfficeSuggestions] = useState<string[]>([]);
  const [postOfficeOpen, setPostOfficeOpen] = useState(false);
  const [selectedPostOffice, setSelectedPostOffice] = useState("");
  const [state, setState] = useState("");

  const pincodeDigits = pincode.replace(/\D/g, "");

  const resetTerritory = useCallback(() => {
    setPincode("");
    setDistrictHint("");
    setPinLoading(false);
    setPinApiError(null);
    setPostOfficeSuggestions([]);
    setPostOfficeOpen(false);
    setSelectedPostOffice("");
    setState("");
  }, []);

  useEffect(() => {
    const pin = pincodeDigits;
    if (pin.length !== 6) {
      setPinApiError(null);
      setPinLoading(false);
      setPostOfficeSuggestions([]);
      setSelectedPostOffice("");
      setDistrictHint("");
      setState("");
      return;
    }

    let cancelled = false;

    async function load() {
      if (pinCacheRef.has(pin)) {
        const cached = pinCacheRef.get(pin) as IndiaPostResponseRow[] | null;
        if (cancelled) return;
        if (!cached || !Array.isArray(cached) || cached.length === 0) {
          setPinApiError("Invalid pincode or no location data found.");
          setPostOfficeSuggestions([]);
          setSelectedPostOffice("");
          setDistrictHint("");
          setState("");
          return;
        }
        const row = cached[0];
        const po0 = row?.PostOffice?.[0];
        if (!po0?.District || !po0?.State) {
          setPinApiError("No location data found for this pincode.");
          setPostOfficeSuggestions([]);
          setSelectedPostOffice("");
          setDistrictHint("");
          setState("");
          return;
        }
        setPinApiError(null);
        setDistrictHint(String(po0.District).trim());
        setState(String(po0.State).trim());
        setSelectedPostOffice("");
        const names = (row?.PostOffice || [])
          .map((p) => (typeof p?.Name === "string" ? p.Name.trim() : ""))
          .filter(Boolean);
        setPostOfficeSuggestions(Array.from(new Set(names)));
        return;
      }

      try {
        setPinLoading(true);
        setPinApiError(null);
        setSelectedPostOffice("");
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { method: "GET" });
        const data = (await res.json()) as IndiaPostResponseRow[];
        pinCacheRef.set(pin, data);
        if (cancelled) return;

        const row = Array.isArray(data) ? data[0] : null;
        if (!row || row.Status !== "Success" || !row.PostOffice || row.PostOffice.length === 0) {
          setPinApiError("Invalid pincode or no location data found.");
          setPostOfficeSuggestions([]);
          setSelectedPostOffice("");
          setDistrictHint("");
          setState("");
          return;
        }
        const po0 = row.PostOffice[0];
        const district = (po0?.District || "").trim();
        const stateName = (po0?.State || "").trim();
        if (!district || !stateName) {
          setPinApiError("No location data found for this pincode.");
          setPostOfficeSuggestions([]);
          setSelectedPostOffice("");
          setDistrictHint("");
          setState("");
          return;
        }

        setDistrictHint(district);
        setState(stateName);
        setPinApiError(null);

        const names = row.PostOffice
          .map((p) => (typeof p?.Name === "string" ? p.Name.trim() : ""))
          .filter(Boolean);
        setPostOfficeSuggestions(Array.from(new Set(names)));
      } catch {
        if (!cancelled) {
          pinCacheRef.set(pin, null);
          setPinApiError("Could not fetch location for this pincode.");
          setPostOfficeSuggestions([]);
          setSelectedPostOffice("");
          setDistrictHint("");
          setState("");
        }
      } finally {
        if (!cancelled) setPinLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [pincodeDigits]);

  return {
    pincodeDigits,
    setPincodeDigits: (digits: string) => setPincode(digits.replace(/\D/g, "").slice(0, 6)),
    pinLoading,
    pinApiError,
    postOfficeSuggestions,
    postOfficeOpen,
    setPostOfficeOpen,
    selectedPostOffice,
    setSelectedPostOffice,
    districtHint,
    inferredState: state,
    territoryTrim: selectedPostOffice.trim(),
    resetTerritory,
  };
}
