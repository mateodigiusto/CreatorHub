"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isOnboardedSync } from "@/lib/onboarding/persistence";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    /* Pre-paint script set <html data-onboarded="..."> synchronously. */
    router.replace(isOnboardedSync() ? "/dashboard" : "/onboarding");
  }, [router]);
  return null;
}
