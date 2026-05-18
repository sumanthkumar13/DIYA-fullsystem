import { useEffect } from "react";

/** Reset region to "all" when the selected value is no longer in the list (dashboard pattern). */
export function useCardRegionGuard(
  region: string,
  regions: string[],
  regionsLoading: boolean,
  onReset: (region: string) => void,
) {
  useEffect(() => {
    if (regionsLoading || regions.length === 0) return;
    if (region !== "all" && !regions.includes(region)) {
      onReset("all");
    }
  }, [region, regions, regionsLoading, onReset]);
}
