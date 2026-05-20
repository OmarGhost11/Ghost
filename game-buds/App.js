import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const TABS = [
  { id: 'chats', label: 'Chats' },
  { id: 'lfg', label: 'LFG' },
  { id: 'clips', label: 'Clips' },
  { id: 'indie', label: 'Indie' },
];

// Upcoming / recently-released games shown in the top calendar strip.
// Later this will come from an API; hardcoded for now so the UI is real.
const RELEASES = [
  { id: 'gta6',     title: 'GTA VI',                   date: 'May 26',  status: 'soon',    accent: '#ff7a59' },
  { id: 'doom',     title: 'DOOM: The Dark Ages',      date: 'May 15',  status: 'out',     accent: '#d94f4f' },
  { id: 'fable',    title: 'Fable',                    date: 'Jun 12',  status: 'soon',    accent: '#7c5cff' },
  { id: 'mh',       title: 'Monster Hunter Wilds',     date: 'Jun 28',  status: 'soon',    accent: '#5ad1a6' },
  { id: 'borderl',  title: 'Borderlands 4',            date: 'Jul 03',  status: 'soon',    accent: '#f5c542' },
  { id: 'silksong', title: 'Hollow Knight: Silksong',  date: 'Jul 22',  status: 'soon',    accent: '#5ab8ff' },
];

const DMS = [
  { id: 'm1', name: 'Mike_K',     last: 'one more game?',           when: 'now',  unread: 2, color: '#7c5cff' },
  { id: 'm2', name: 'Sarah99',    last: 'gg that was clean',        when: '2m',   unread: 0, color: '#ff7a59' },
  { id: 'm3', name: 'CrispAim',   last: 'sent a clip',              when: '14m',  unread: 1, color: '#5ad1a6' },
  { id: 'm4', name: 'NovaByte',   last: 'down for ranked tonight?', when: '1h',   unread: 0, color: '#f5c542' },
];

const ROOMS = [
  { id: 'r1', game: 'Valorant',        members: '2,341 online', tag: 'FPS',     accent: '#ff4655' },
  { id: 'r2', game: 'Minecraft',       members: '987 online',   tag: 'Sandbox', accent: '#5ad1a6' },
  { id: 'r3', game: 'Stardew Valley',  members: '412 online',   tag: 'Cozy',    accent: '#f5c542' },
  { id: 'r4', game: 'Helldivers 2',    members: '1,108 online', tag: 'Co-op',   accent: '#5ab8ff' },
];

const LFG_POSTS = [
  { id: 'l1', game: 'Valorant',     title: 'Need 2 for ranked',     detail: '9pm EST · Diamond+ · mic'   },
  { id: 'l2', game: 'Minecraft',    title: 'Chill survival realm',  detail: 'any time · vanilla 1.21'    },
  { id: 'l3', game: 'Helldivers 2', title: 'Helldive difficulty',   detail: 'tonight · mic required'     },
  { id: 'l4', game: 'Marvel Rivals',title: 'Stack of 6 forming',    detail: 'sat 8pm · plat lobby'       },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('chats');

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.logo}>
          Game<Text style={styles.logoAccent}>Buds</Text>
        </Text>
        <Pressable style={styles.searchPill} hitSlop={8}>
          <Text style={styles.searchText}>Search</Text>
        </Pressable>
      </View>

      <ReleaseCalendar />

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'chats' && <ChatsScreen />}
        {activeTab === 'lfg' && <LfgScreen />}
        {activeTab === 'clips' && <ClipsScreen />}
        {activeTab === 'indie' && <IndieScreen />}
      </ScrollView>

      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={styles.tabButton}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {tab.label}
              </Text>
              <View style={[styles.tabDot, active && styles.tabDotActive]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ---- Release calendar (top horizontal strip, Opera-style) ----------------

function ReleaseCalendar() {
  return (
    <View style={styles.calendarWrap}>
      <View style={styles.calendarHeader}>
        <Text style={styles.calendarTitle}>Release Calendar</Text>
        <Text style={styles.calendarLink}>See all</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.calendarRow}
      >
        {RELEASES.map((g) => (
          <View key={g.id} style={styles.releaseCard}>
            <View style={[styles.releaseArt, { backgroundColor: g.accent }]}>
              <Text style={styles.releaseArtLetter}>
                {g.title.slice(0, 1)}
              </Text>
            </View>
            <View style={styles.releaseMeta}>
              <Text style={styles.releaseTitle} numberOfLines={1}>
                {g.title}
              </Text>
              <View style={styles.releaseDateRow}>
                <View
                  style={[
                    styles.releaseStatusDot,
                    { backgroundColor: g.status === 'out' ? '#5ad1a6' : '#7c5cff' },
                  ]}
                />
                <Text style={styles.releaseDate}>
                  {g.status === 'out' ? 'Out now' : g.date}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ---- Chats: clear split between DMs (people) and Game Rooms (places) -----

function ChatsScreen() {
  return (
    <View>
      {/* Direct Messages — person-to-person, circular avatars */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>Just you and them</Text>
          <Text style={styles.sectionTitle}>Direct Messages</Text>
        </View>
        <Pressable style={styles.sectionAction} hitSlop={6}>
          <Text style={styles.sectionActionText}>New</Text>
        </Pressable>
      </View>

      <View style={styles.dmList}>
        {DMS.map((dm) => (
          <Pressable key={dm.id} style={styles.dmRow}>
            <View style={[styles.dmAvatar, { backgroundColor: dm.color }]}>
              <Text style={styles.dmAvatarLetter}>{dm.name[0]}</Text>
            </View>
            <View style={styles.dmBody}>
              <View style={styles.dmTopLine}>
                <Text style={styles.dmName} numberOfLines={1}>{dm.name}</Text>
                <Text style={styles.dmWhen}>{dm.when}</Text>
              </View>
              <Text style={styles.dmLast} numberOfLines={1}>{dm.last}</Text>
            </View>
            {dm.unread > 0 && (
              <View style={styles.dmUnread}>
                <Text style={styles.dmUnreadText}>{dm.unread}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {/* Visual divider so the two sections never blur together */}
      <View style={styles.divider} />

      {/* Game Rooms — place-feel, square art tiles, member counts */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>Public lobbies, by game</Text>
          <Text style={styles.sectionTitle}>Game Rooms</Text>
        </View>
        <Pressable style={styles.sectionAction} hitSlop={6}>
          <Text style={styles.sectionActionText}>Browse</Text>
        </Pressable>
      </View>

      <View style={styles.roomList}>
        {ROOMS.map((room) => (
          <Pressable key={room.id} style={styles.roomRow}>
            <View style={[styles.roomArt, { backgroundColor: room.accent }]}>
              <Text style={styles.roomArtLetter}>{room.game[0]}</Text>
            </View>
            <View style={styles.roomBody}>
              <Text style={styles.roomGame} numberOfLines={1}>{room.game}</Text>
              <Text style={styles.roomMembers}>{room.members}</Text>
            </View>
            <View style={styles.roomTag}>
              <Text style={styles.roomTagText}>{room.tag}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ---- LFG ------------------------------------------------------------------

function LfgScreen() {
  return (
    <View>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>Find players, fast</Text>
          <Text style={styles.sectionTitle}>Looking For Group</Text>
        </View>
        <Pressable style={styles.sectionAction} hitSlop={6}>
          <Text style={styles.sectionActionText}>Post</Text>
        </Pressable>
      </View>

      <View style={styles.lfgList}>
        {LFG_POSTS.map((post) => (
          <Pressable key={post.id} style={styles.lfgCard}>
            <Text style={styles.lfgGame}>{post.game}</Text>
            <Text style={styles.lfgTitle}>{post.title}</Text>
            <Text style={styles.lfgDetail}>{post.detail}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ---- Clips & Indie placeholders (real screens come next) -----------------

function ClipsScreen() {
  return (
    <Empty
      eyebrow="Vertical scroll feed"
      title="Clips"
      body="Upload short gameplay videos. Vertical swipe like TikTok. Coming up next."
    />
  );
}

function IndieScreen() {
  return (
    <Empty
      eyebrow="Discover & co-buy"
      title="Indie Corner"
      body="Find indie games, plan group purchases, meet devs. Built after the social core."
    />
  );
}

function Empty({ eyebrow, title, body }) {
  return (
    <View>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
      </View>
      <View style={styles.emptyCard}>
        <Text style={styles.emptyBody}>{body}</Text>
      </View>
    </View>
  );
}

// ---- Styles --------------------------------------------------------------

const COLORS = {
  bg:        '#0b0b14',
  surface:   '#13131f',
  surface2:  '#1a1a2b',
  border:    '#23233a',
  text:      '#ffffff',
  textDim:   '#8a8aa3',
  textFaint: '#5c5c75',
  accent:    '#7c5cff',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  // Header
  header: {
    paddingTop: 64,
    paddingBottom: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  logo: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  logoAccent: { color: COLORS.accent },
  searchPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchText: { color: COLORS.textDim, fontSize: 13 },

  // Release calendar strip
  calendarWrap: {
    backgroundColor: COLORS.surface,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  calendarHeader: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  calendarTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  calendarLink: { color: COLORS.accent, fontSize: 12, fontWeight: '600' },
  calendarRow: { paddingHorizontal: 16, gap: 10 },
  releaseCard: {
    width: 150,
    marginHorizontal: 4,
    backgroundColor: COLORS.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  releaseArt: { height: 70, alignItems: 'center', justifyContent: 'center' },
  releaseArtLetter: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '800',
    opacity: 0.9,
  },
  releaseMeta: { padding: 10 },
  releaseTitle: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  releaseDateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  releaseStatusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  releaseDate: { color: COLORS.textDim, fontSize: 12 },

  // Body & section headers
  body: { flex: 1 },
  bodyContent: { padding: 20, paddingBottom: 40 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionEyebrow: {
    color: COLORS.textFaint,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  sectionTitle: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
  sectionAction: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.surface2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionActionText: { color: COLORS.text, fontSize: 12, fontWeight: '600' },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 24,
    marginHorizontal: -4,
  },

  // DMs (person-feel: rounded avatar, subtle row, no border per row)
  dmList: { backgroundColor: 'transparent' },
  dmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  dmAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dmAvatarLetter: { color: '#fff', fontSize: 17, fontWeight: '700' },
  dmBody: { flex: 1, marginLeft: 12, marginRight: 8 },
  dmTopLine: { flexDirection: 'row', justifyContent: 'space-between' },
  dmName: { color: COLORS.text, fontSize: 15, fontWeight: '600', flex: 1 },
  dmWhen: { color: COLORS.textFaint, fontSize: 12, marginLeft: 8 },
  dmLast: { color: COLORS.textDim, fontSize: 13, marginTop: 2 },
  dmUnread: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dmUnreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Game Rooms (place-feel: square art tiles, surface card, tag chip)
  roomList: { gap: 10 },
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
  },
  roomArt: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomArtLetter: { color: '#fff', fontSize: 22, fontWeight: '800', opacity: 0.9 },
  roomBody: { flex: 1, marginLeft: 12 },
  roomGame: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  roomMembers: { color: COLORS.textDim, fontSize: 12, marginTop: 2 },
  roomTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: COLORS.bg,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roomTagText: { color: COLORS.textDim, fontSize: 11, fontWeight: '600' },

  // LFG cards
  lfgList: { gap: 10 },
  lfgCard: {
    backgroundColor: COLORS.surface2,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  lfgGame: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  lfgTitle: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  lfgDetail: { color: COLORS.textDim, fontSize: 13, marginTop: 4 },

  // Empty
  emptyCard: {
    backgroundColor: COLORS.surface2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
  },
  emptyBody: { color: COLORS.textDim, fontSize: 13, lineHeight: 19 },

  // Tab bar (text-only with accent dot under the active label)
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    paddingBottom: 24,
  },
  tabButton: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  tabLabel: { color: COLORS.textDim, fontSize: 13, fontWeight: '600' },
  tabLabelActive: { color: COLORS.text },
  tabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 6,
    backgroundColor: 'transparent',
  },
  tabDotActive: { backgroundColor: COLORS.accent },
});
