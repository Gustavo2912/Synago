export type SubscriptionTierKey =
  | "tier_1"
  | "tier_2"
  | "tier_3"
  | "tier_4";

export const SUBSCRIPTION_TIERS: Record<
  SubscriptionTierKey,
  {
    label: string;
    maxMembers: number;
  }
> = {
  tier_1: {
    label: "Basic",
    maxMembers: 50,
  },
  tier_2: {
    label: "Standard",
    maxMembers: 100,
  },
  tier_3: {
    label: "Professional",
    maxMembers: 250,
  },
  tier_4: {
    label: "Enterprise",
    maxMembers: 1000, // אפשר לשנות בעתיד
  },
};
