export interface Participant {
  id: string; // unique key (usually username)
  username: string;
  displayName: string;
  nickname?: string;
  avatar: string;
  avatarUrl?: string;
  rights: number; // number of slices / tickets on the wheel
  earnedTotal?: number;
  likesAccumulated?: number;
  thresholdsCompleted?: number;
  followed?: boolean;
  isEliminated?: boolean;
  color?: string;
  joinedAt?: number;
  totalCoins?: number;
  totalLikes?: number;
  isFollower?: boolean;
  lastActive?: number;
}

export interface GiftRule {
  id: string;
  name: string;
  diamondValue: number;
  imageUrl: string;
  enabled: boolean;
  rights: number;
  action: 'rights' | 'instant_spin' | 'disabled' | 'special_bonus';
}

export interface TikTokGiftEvent {
  id?: string;
  userId?: string;
  uniqueId?: string;
  username?: string;
  displayName?: string;
  nickname?: string;
  avatar?: string;
  profilePictureUrl?: string;
  giftId: number | string;
  giftName: string;
  giftIcon?: string;
  giftImageUrl?: string;
  diamondCount: number; // coin value of single gift
  giftCount?: number;
  repeatCount?: number; // combo count
  totalCoins?: number;  // diamondCount * repeatCount
  totalStreak?: number;
  timestamp?: number;
}

export interface TikTokLikeEvent {
  userId?: string;
  uniqueId?: string;
  username?: string;
  displayName?: string;
  nickname?: string;
  avatar?: string;
  profilePictureUrl?: string;
  likeCount: number;
  totalLikes?: number;
  totalLikeCount?: number;
  timestamp?: number;
}

export interface TikTokFollowEvent {
  userId?: string;
  uniqueId?: string;
  username?: string;
  displayName?: string;
  nickname?: string;
  avatar?: string;
  profilePictureUrl?: string;
  timestamp?: number;
}

export interface WinRecord {
  id?: string;
  winner?: Participant;
  username: string;
  displayName?: string;
  avatar?: string;
  winCount: number;
  lastWinTimestamp?: number;
  timestamp?: number;
  giftDetails?: string;
}

export interface TikTokStatusState {
  status: 'server_offline' | 'server_ready' | 'connecting_tiktok' | 'connected_live' | 'receiving_events' | 'error' | 'disconnected' | 'demo_active' | string;
  username?: string;
  roomId?: string;
  eventsCount: { likes: number; gifts: number; follows: number; chats: number };
  lastError?: string;
  uptimeSeconds?: number;
}

export interface AppSettings {
  // TikTok Connection
  tiktokUsername?: string;
  isConnected?: boolean;
  isConnecting?: boolean;
  connectionError?: string | null;

  // Gift Rules & Actions
  giftEnabled: boolean;
  giftRules: GiftRule[];
  defaultCoinThreshold: number; // e.g. 100 coins = 1 right default
  roseRights?: number;
  coinsPerRight?: number;

  // Likes Rules
  likeEnabled: boolean;
  likeThreshold?: number; // e.g. 50 likes = threshold
  likeRightsPerThreshold: number; // e.g. 1 right per 50 likes
  allowThresholdMultipliers: boolean;
  likesPerRight?: number;
  likeThresholdPerUser?: number;

  // Follow Rules
  followEnabled: boolean;
  followRights: number; // e.g. 1 right
  shareRights?: number;
  repeatFollowAllowed?: boolean;

  // User Rights Cap & Wheel Capacity
  enableMaxRightsLimit?: boolean;
  maxRightsPerUser: number; // 0 or N (e.g. 10 rights cap)
  wheelCapacity?: number;
  maxPercentPerUser?: number;

  // Wheel Behavior & Physics
  spinDurationSeconds?: number; // 4 to 8s
  autoEliminateWinner?: boolean; // Remove winner after draw
  eliminationMode?: 'winner_out' | 'ticket_minus_one' | 'keep_all' | string;
  winProtection?: boolean;
  prizeName?: string;
  showMarqueeNotifications?: boolean;
  marqueeSpeedSec?: number;

  // Sounds
  soundEnabled: boolean;
  soundVolume?: number; // 0 to 1
  masterVolume: number; // 0 to 100
  spinVolume?: number;
  winVolume?: number;
  customSpinUrl?: string;
  customWinUrl?: string;

  // Auto-Spin Mode
  autoSpinEnabled: boolean;
  autoSpinInterval?: number; // in seconds: 1, 3, 5, 10, 15, 30
  autoSpinIntervalSec?: number;
  autoSpinCountdown?: number;

  // Stream UI
  fullscreenMode?: boolean;
  hideHeaderInStream?: boolean;
}

export type GameSettings = AppSettings;

export interface BigGiftCelebration {
  id: string;
  username: string;
  displayName: string;
  nickname?: string;
  avatar: string;
  avatarUrl?: string;
  giftName: string;
  giftIcon?: string;
  giftImageUrl?: string;
  diamonds: number;
  totalCoins?: number;
  giftCount: number;
  timestamp: number;
}

export type BigGiftAlertData = BigGiftCelebration;

export type FeedEvent = any;

export interface StandardGift {
  id: number | string;
  name: string;
  turkishName?: string;
  coins?: number;
  diamondValue?: number;
  icon?: string;
  imageUrl?: string;
  defaultRights?: number;
}
