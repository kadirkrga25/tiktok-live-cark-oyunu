import { GiftRule } from '../types';
import { POPULAR_TIKTOK_GIFTS } from './gifts';

export const OFFICIAL_TIKTOK_GIFTS = POPULAR_TIKTOK_GIFTS;

export const matchGiftRule = (id: string | number, name: string, rules: GiftRule[]): GiftRule | undefined => {
  // Try matching by ID first
  const ruleById = rules.find(rule => String(rule.id) === String(id));
  if (ruleById) return ruleById;
  
  // Try matching by name
  return rules.find(rule => rule.name.toLowerCase() === name.toLowerCase());
};
