export type FbRole = 'admin' | 'moderator' | 'member' | 'new_member' | null;

export type DetectedFbGroup = {
  url: string;
  fbGroupId: string;
  name: string | null;
  description: string | null;
  avatarUrl: string | null;
  privacy: 'public' | 'private' | null;
  visibleMemberCount: number | null;
  isMembersPageOpen: boolean;
  currentSubTab: 'admins' | 'moderators' | 'members' | 'new_members' | 'friends' | null;
};

export type ExtractedFbMember = {
  rawLabel: string | null;
  displayName: string | null;
  profileUrl: string | null;
  profileImageUrl: string | null;
  role: FbRole;
  bio: string | null;
  location: string | null;
  detectedAt: string;
};

export type ExtractedFbPost = {
  fbPostUrl: string | null;
  authorLabel: string | null;
  authorProfileUrl: string | null;
  postedAt: string | null;
  reactionCount: number;
  commentCount: number;
  shareCount: number;
  hasMedia: boolean;
  detectedAt: string;
};
