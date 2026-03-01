import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const PRICE_IDS = {
  pro: 'price_1T5t8s2V06RCYNRQv5YPjbfs',
  featured: 'price_1T5t8t2V06RCYNRQf1khfjGB',
} as const;
