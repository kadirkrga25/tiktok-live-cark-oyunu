export type TikTokLiveStatus =
  | 'server_offline'
  | 'server_ready'
  | 'connecting_tiktok'
  | 'connected_live'
  | 'receiving_events'
  | 'error'
  | 'disconnected'
  | 'demo_active';

export interface Participant {
  id: string; // uniqueId / username
  username: string;
  displayName: string;
  avatar: string;
  rights: number; // active tickets / slots on the wheel
  earnedTotal: number;
  likesAccumulated: number; // User's personal like count (not stream total!)
  thresholdsCompleted: number; // How many thresholds this user passed
  followed: boolean;
  isEliminated: boolean;
  color: string;
  joinedAt: number;
}

export interface GiftActionType {
  type: 'rights' | 'instant_spin' | 'special_bonus' | 'disabled';
}

export interface GiftRule {
  id: string; // TikTok giftId or string slug
  name: string;
  diamondValue: number;
  imageUrl: string;
  enabled: boolean;
  rights: number; // how many wheel tickets it gives
  action: 'rights' | 'instant_spin' | 'special_bonus' | 'disabled';
  soundEffect?: string;
}

export interface GameSettings {
  prizeName: string;
  wheelCapacity: number;
  maxPercentPerUser: number; // 0 = unlimited, 1 = 1%, 5 = 5%, etc.
  maxRightsPerUser: number; // 0 = unlimited / use percentage, or fixed cap (e.g. 5, 10, 20)
  
  // Follow settings
  followEnabled: boolean;
  followRights: number;
  repeatFollowAllowed: boolean;

  // Like settings (Strictly Per-Person!)
  likeEnabled: boolean;
  likeThresholdPerUser: number; // e.g. 500 likes per person
  likeRightsPerThreshold: number; // e.g. 1 right
  allowThresholdMultipliers: boolean; // e.g. 500 -> 1, 1000 -> 2, 1500 -> 3

  // Gift settings
  giftEnabled: boolean;
  giftRules: GiftRule[];
  defaultCoinThreshold: number; // For unknown gifts: 1 right per X coins

  // Elimination & Winner
  winProtection: boolean; // winner won't lose their ticket or won't be picked again
  eliminationMode: 'lose_one_right' | 'instant_eliminate'; // lose 1 right on wheel hit until 0
  autoSpinEnabled: boolean;
  autoSpinIntervalSec: number;

  // Audio settings
  soundEnabled: boolean;
  masterVolume: number; // 0..100
  spinVolume: number; // 0..100
  winVolume: number; // 0..100
  customSpinUrl: string;
  customWinUrl: string;

  // Visual settings
  showMarqueeNotifications: boolean;
  marqueeSpeedSec: number;
}

export interface WinRecord {
  username: string;
  displayName: string;
  avatar: string;
  winCount: number;
  lastWinTimestamp: number;
}

export interface FeedEvent {
  id: string;
  type: 'follow' | 'like' | 'gift' | 'spin' | 'win' | 'elim' | 'system';
  username?: string;
  text: string;
  subtext?: string;
  icon?: string;
  avatar?: string;
  color?: string;
  timestamp: number;
  isTest?: boolean;
}

export interface TikTokStatusState {
  status: TikTokLiveStatus;
  username: string;
  roomId?: string;
  viewerCount?: number;
  uptimeSeconds: number;
  lastError?: string;
  eventsCount: {
    follows: number;
    likes: number;
    gifts: number;
  };
}

export interface BigGiftAlertData {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  giftName: string;
  giftImageUrl?: string;
  diamonds: number;
  giftCount: number;
  timestamp: number;
}
