export type Profile = {
  userId: string;
  username: string;
  displayName: string;
};

export type FriendRow = {
  userId: string;
  username: string;
  displayName: string;
  online: boolean;
  inCall: boolean;
  lastMessageAt: string | null;
};

export type ChatMessage = {
  id: number;
  fromMe: boolean;
  text: string;
  time: string;
};

export type IncomingRequest = {
  username: string;
  displayName: string;
};

export type RingingCall = {
  id: string;
  fromUsername: string;
  fromDisplayName: string;
  roomCode: string;
  createdAt: string;
};

export type Inbox = {
  profile: Profile | null;
  friends: FriendRow[];
  incomingRequests: IncomingRequest[];
  outgoingRequests: string[];
  ringing: RingingCall | null;
  chat: { username: string; messages: ChatMessage[] } | null;
};
