export interface User {
  id: string;
  username: string;
  email?: string;
  points: number;
  statusMessage?: string;
  isOnline?: boolean;
  avatarUrl?: string;
  lastActive?: string;
  profileTheme?: string;
}

export interface MessageReaction {
  emoji: string;
  users: { _id: string; username: string; avatarUrl?: string }[];
}

export interface Message {
  _id: string;
  sender: {
    _id: string;
    username: string;
    avatarUrl?: string;
  };
  content: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'file';
  fileUrl?: string;
  roomId: string;
  status: 'sent' | 'delivered' | 'read';
  replyTo?: string;
  reactions?: MessageReaction[];
  edited?: boolean;
  pinned?: boolean;
  threadParentId?: string;
  threadCount?: number;
  duration?: number;
  waveformSamples?: number[];
  createdAt: string;
}

export interface LeaderboardUser {
  username: string;
  points: number;
}
