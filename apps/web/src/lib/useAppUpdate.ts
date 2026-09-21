"use client";

import { useEffect, useState } from "react";
import { checkAppUpdate, dismissUpdate as storeDismissUpdate, isUpdateDismissed, type AppUpdateInfo } from "./appUpdate";

export function useAppUpdate(currentVersion: string) {
  const [update, setUpdate] = useState<AppUpdateInfo | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsChecking(true);
    checkAppUpdate(currentVersion)
      .then((info) => {
        if (!cancelled && info) {
          setUpdate(info);
          setIsDismissed(isUpdateDismissed(info.latestVersion));
        }
      })
      .finally(() => {
        if (!cancelled) setIsChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentVersion]);

  const dismiss = () => {
    if (update) {
      storeDismissUpdate(update.latestVersion);
      setIsDismissed(true);
    }
  };

  return {
    update,
    isDismissed,
    isChecking,
    dismiss,
  };
}
