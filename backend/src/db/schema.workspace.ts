import { sqliteTable, text, integer, real, primaryKey, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

export const groups = sqliteTable('groups', {
  id: text('id').primaryKey(),
  platform: text('platform').notNull().default('facebook'),
  fbGroupId: text('fb_group_id').notNull(),     // numeric id or vanity slug from URL
  url: text('url').notNull(),                    // canonical https://www.facebook.com/groups/<id>
  name: text('name').notNull(),
  description: text('description'),
  avatarUrl: text('avatar_url'),
  privacy: text('privacy'),                      // public | private | secret | unknown
  visibleMemberCount: integer('visible_member_count'),
  firstSeenAt: text('first_seen_at').notNull(),
  lastSeenAt: text('last_seen_at').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => ({
  fbGroupUnique: uniqueIndex('groups_fb_group_unique').on(t.fbGroupId),
}));

export const members = sqliteTable('members', {
  id: text('id').primaryKey(),
  displayName: text('display_name'),
  profileUrl: text('profile_url'),    // canonicalized
  fbid: text('fbid'),                  // numeric id when known
  username: text('username'),          // vanity slug when known
  profileImageUrl: text('profile_image_url'),
  bio: text('bio'),
  location: text('location'),
  firstSeenAt: text('first_seen_at').notNull(),
  lastSeenAt: text('last_seen_at').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => ({
  idxFbid: index('idx_members_fbid').on(t.fbid),
  idxUser: index('idx_members_username').on(t.username),
  idxUrl: index('idx_members_url').on(t.profileUrl),
}));

export const groupMembers = sqliteTable('group_members', {
  id: text('id').primaryKey(),
  groupId: text('group_id').notNull(),
  memberId: text('member_id').notNull(),
  role: text('role').default('member'),         // admin | moderator | member | new_member
  status: text('status').default('active'),     // active | left | blocked | pending
  firstSeenInGroupAt: text('first_seen_in_group_at').notNull(),
  lastSeenInGroupAt: text('last_seen_in_group_at').notNull(),
  joinedAt: text('joined_at'),
  leftAt: text('left_at'),
  lastPostAt: text('last_post_at'),
  postCount: integer('post_count').default(0),
  commentCount: integer('comment_count').default(0),
  reactionCount: integer('reaction_count').default(0),
  subscriptionStatus: text('subscription_status').default('unknown'),
  subscriptionStartAt: text('subscription_start_at'),
  subscriptionEndAt: text('subscription_end_at'),
  paymentStatus: text('payment_status').default('unknown'),
  source: text('source'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => ({
  gmUnique: uniqueIndex('gm_unique').on(t.groupId, t.memberId),
}));

export const notes = sqliteTable('notes', {
  id: text('id').primaryKey(),
  groupMemberId: text('group_member_id').notNull(),
  body: text('body').notNull(),
  createdByUserId: text('created_by_user_id').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  color: text('color'),
  createdAt: text('created_at').notNull(),
});

export const groupMemberTags = sqliteTable('group_member_tags', {
  groupMemberId: text('group_member_id').notNull(),
  tagId: text('tag_id').notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.groupMemberId, t.tagId] }),
}));

export const scanSessions = sqliteTable('scan_sessions', {
  id: text('id').primaryKey(),
  groupId: text('group_id').notNull(),
  scanType: text('scan_type').notNull(),      // members | posts
  subTab: text('sub_tab'),                     // admins | moderators | members | new_members | friends | null
  startedAt: text('started_at').notNull(),
  finishedAt: text('finished_at'),
  totalDetected: integer('total_detected').default(0),
  newMembers: integer('new_members').default(0),
  missingMembers: integer('missing_members').default(0),
  updatedMembers: integer('updated_members').default(0),
  createdByUserId: text('created_by_user_id').notNull(),
});

export const scanMemberResults = sqliteTable('scan_member_results', {
  id: text('id').primaryKey(),
  scanSessionId: text('scan_session_id').notNull(),
  groupId: text('group_id').notNull(),
  memberId: text('member_id'),
  rawLabel: text('raw_label'),
  displayName: text('display_name'),
  profileUrl: text('profile_url'),
  fbid: text('fbid'),
  username: text('username'),
  role: text('role'),
  confidenceScore: real('confidence_score').default(0),
  resultType: text('result_type'),
  detectedAt: text('detected_at').notNull(),
});

export const postActivity = sqliteTable('post_activity', {
  id: text('id').primaryKey(),
  groupId: text('group_id').notNull(),
  memberId: text('member_id'),
  fbPostUrl: text('fb_post_url'),
  authorLabel: text('author_label'),
  authorProfileUrl: text('author_profile_url'),
  postedAt: text('posted_at'),
  detectedAt: text('detected_at').notNull(),
  reactionCount: integer('reaction_count').default(0),
  commentCount: integer('comment_count').default(0),
  shareCount: integer('share_count').default(0),
  hasMedia: integer('has_media').default(0),
}, (t) => ({
  idxGroupTs: index('idx_post_group_ts').on(t.groupId, t.postedAt),
  uniqUrl: uniqueIndex('post_url_unique').on(t.fbPostUrl),
}));

export const dailyGroupStats = sqliteTable('daily_group_stats', {
  id: text('id').primaryKey(),
  groupId: text('group_id').notNull(),
  date: text('date').notNull(),
  totalMembers: integer('total_members').default(0),
  newMembers: integer('new_members').default(0),
  leftMembers: integer('left_members').default(0),
  activeMembers: integer('active_members').default(0),
  detectedPosts: integer('detected_posts').default(0),
  totalReactions: integer('total_reactions').default(0),
  totalComments: integer('total_comments').default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => ({
  dayUnique: uniqueIndex('daily_group_date_unique').on(t.groupId, t.date),
}));
