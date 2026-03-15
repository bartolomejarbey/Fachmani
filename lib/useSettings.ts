"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type PlatformSettings = {
  free_offers_per_month: number;
  request_expiry_days: number;
  max_images_per_request: number;
};

export type SubscriptionPrices = {
  premium_monthly: number;
  premium_quarterly: number;
  business_monthly: number;
  business_quarterly: number;
};

export type PricingSettings = {
  top_profile_7d: number;
  boost_feed_1d: number;
  premium_badge_30d: number;
  extra_offer: number;
};

export type AllSettings = {
  platform: PlatformSettings;
  subscriptions: SubscriptionPrices;
  pricing: PricingSettings;
};

const DEFAULTS: AllSettings = {
  platform: {
    free_offers_per_month: 3,
    request_expiry_days: 30,
    max_images_per_request: 5,
  },
  subscriptions: {
    premium_monthly: 499,
    premium_quarterly: 399,
    business_monthly: 1299,
    business_quarterly: 1039,
  },
  pricing: {
    top_profile_7d: 99,
    boost_feed_1d: 49,
    premium_badge_30d: 199,
    extra_offer: 29,
  },
};

// Cache settings in memory to avoid refetching on every page
let cachedSettings: AllSettings | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useSettings() {
  const [settings, setSettings] = useState<AllSettings>(cachedSettings || DEFAULTS);
  const [loaded, setLoaded] = useState(!!cachedSettings);

  useEffect(() => {
    if (cachedSettings && Date.now() - cacheTime < CACHE_TTL) {
      setSettings(cachedSettings);
      setLoaded(true);
      return;
    }

    async function load() {
      const { data } = await supabase
        .from("system_settings")
        .select("key, value");

      const result = { ...DEFAULTS };

      if (data) {
        data.forEach((row) => {
          if (row.key === "platform_settings" && row.value) {
            result.platform = { ...DEFAULTS.platform, ...row.value };
          } else if (row.key === "subscription_prices" && row.value) {
            result.subscriptions = { ...DEFAULTS.subscriptions, ...row.value };
          } else if (row.key === "pricing" && row.value) {
            result.pricing = { ...DEFAULTS.pricing, ...row.value };
          }
        });
      }

      cachedSettings = result;
      cacheTime = Date.now();
      setSettings(result);
      setLoaded(true);
    }

    load();
  }, []);

  return { settings, loaded };
}
