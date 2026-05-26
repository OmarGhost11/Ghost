import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// Tabs: Clips (home), Chats, LFG, Releases (replaces Indie)
const TABS = [
  { id: 'clips', label: 'Clips' },
  { id: 'chats', label: 'Chats' },
  { id: 'lfg', label: 'LFG' },
  { id: 'releases', label: 'Releases' },
];

// ---- MOCK DATA (clips, dms, rooms, lfg) -----------------------------------

const CLIPS = [
  { id: 'c1', creator: 'CrispAim', handle: '@crispaim', game: 'Valorant', caption: '1v3 ace clutch on Lotus, my hands were shaking', likes: 12400, comments: 312, shares: 88, bg: '#ff4655' },
  { id: 'c2', creator: 'NovaByte', handle: '@novabyte', game: 'Helldivers 2', caption: 'when the bile titan respects the eagle airstrike', likes: 8900, comments: 204, shares: 41, bg: '#5ab8ff' },
  { id: 'c3', creator: 'Mike_K', handle: '@mike_k', game: 'Minecraft', caption: 'redstone door but its a whole vault', likes: 23100, comments: 901, shares: 412, bg: '#5ad1a6' },
  { id: 'c4', creator: 'Sarah99', handle: '@sarah99', game: 'Stardew Valley', caption: 'year 4 farm tour - took me 80 hours', likes: 5400, comments: 188, shares: 22, bg: '#f5c542' },
  { id: 'c5', creator: 'GhostPxl', handle: '@ghostpxl', game: 'Hollow Knight', caption: 'pure vessel hitless first try (lying)', likes: 17800, comments: 522, shares: 130, bg: '#7c5cff' },
];

const DMS = [
  { id: 'm1', name: 'Mike_K', last: 'one more game?', when: 'now', unread: 2, color: '#7c5cff' },
  { id: 'm2', name: 'Sarah99', last: 'gg that was clean', when: '2m', unread: 0, color: '#ff7a59' },
  { id: 'm3', name: 'CrispAim', last: 'sent a clip', when: '14m', unread: 1, color: '#5ad1a6' },
  { id: 'm4', name: 'NovaByte', last: 'down for ranked tonight?', when: '1h', unread: 0, color: '#f5c542' },
];

const ROOMS = [
  { id: 'r1', game: 'Valorant', members: '2,341 online', tag: 'FPS', accent: '#ff4655' },
  { id: 'r2', game: 'Minecraft', members: '987 online', tag: 'Sandbox', accent: '#5ad1a6' },
  { id: 'r3', game: 'Stardew Valley', members: '412 online', tag: 'Cozy', accent: '#f5c542' },
  { id: 'r4', game: 'Helldivers 2', members: '1,108 online', tag: 'Co-op', accent: '#5ab8ff' },
];

const LFG_POSTS = [
  { id: 'l1', game: 'Valorant', title: 'Need 2 for ranked', detail: '9pm EST · Diamond+ · mic' },
  { id: 'l2', game: 'Minecraft', title: 'Chill survival realm', detail: 'any time · vanilla 1.21' },
  { id: 'l3', game: 'Helldivers 2', title: 'Helldive difficulty', detail: 'tonight · mic required' },
  { id: 'l4', game: 'Marvel Rivals', title: 'Stack of 6 forming', detail: 'sat 8pm · plat lobby' },
];

// RAWG API key (free tier, 20k requests/month — plenty for a demo)
const RAWG_API_KEY = '982ab42ab1f44ef9a5a8e498e3fdbf82';

// ---- MAIN APP -------------------------------------------------------------

export default function App() {
  const [activeTab, setActiveTab] = useState('clips');
  const isClips = activeTab === 'clips';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {!isClips && (
        <View style={styles.header}>
          <Text style={styles.logo}>
            Game<Text style={styles.logoAccent}>Buds</Text>
          </Text>
          <Pressable style={styles.searchPill} hitSlop={8}>
            <Text style={styles.searchText}>Search</Text>
          </Pressable>
        </View>
      )}

      {isClips ? (
        <ClipsFeed />
      ) : (
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'chats' && <ChatsScreen />}
          {activeTab === 'lfg' && <LfgScreen />}
          {activeTab === 'releases' && <ReleasesScreen />}
        </ScrollView>
      )}

      <View style={[styles.tabBar, isClips && styles.tabBarOnClips]}>
        {TABS.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={styles.tabButton}
            >
              <Text
                style={[
                  styles.tabLabel,
                  isClips && styles.tabLabelOnClips,
                  active && styles.tabLabelActive,
                ]}
              >
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

// ---- CLIPS FEED (TikTok FYP) ----------------------------------------------

function ClipsFeed() {
  const [feedTab, setFeedTab] = useState('foryou');
  const { height: screenH, width: screenW } = Dimensions.get('window');
  const clipHeight = screenH - 70;

  return (
    <View style={styles.feedRoot}>
      <FlatList
        data={CLIPS}
        keyExtractor={(c) => c.id}
        pagingEnabled
        snapToInterval={clipHeight}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <ClipCard clip={item} height={clipHeight} width={screenW} />
        )}
      />
      <View style={styles.feedTopBar} pointerEvents="box-none">
        <View style={styles.feedTopTabs}>
          <Pressable onPress={() => setFeedTab('following')}>
            <Text style={[styles.feedTopLabel, feedTab === 'following' && styles.feedTopLabelActive]}>Following</Text>
          </Pressable>
          <View style={styles.feedTopSep} />
          <Pressable onPress={() => setFeedTab('foryou')}>
            <Text style={[styles.feedTopLabel, feedTab === 'foryou' && styles.feedTopLabelActive]}>For You</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function ClipCard({ clip, height, width }) {
  const [liked, setLiked] = useState(false);
  const [following, setFollowing] = useState(false);

  return (
    <View style={[styles.clipCard, { height, width, backgroundColor: clip.bg }]}>
      <View style={styles.clipVignette} pointerEvents="none" />
      <View style={styles.actionRail}>
        <Pressable onPress={() => setFollowing((v) => !v)} style={styles.creatorAvatarWrap}>
          <View style={styles.creatorAvatar}>
            <Text style={styles.creatorAvatarLetter}>{clip.creator[0]}</Text>
          </View>
          <View style={[styles.followBadge, following && styles.followBadgeActive]}>
            <Text style={styles.followBadgeText}>{following ? '✓' : '+'}</Text>
          </View>
        </Pressable>
        <ActionButton icon={liked ? '♥' : '♡'} color={liked ? '#ff5577' : '#fff'} count={formatCount(clip.likes + (liked ? 1 : 0))} onPress={() => setLiked((v) => !v)} />
        <ActionButton icon="💬" count={formatCount(clip.comments)} />
        <ActionButton icon="↗" count={formatCount(clip.shares)} />
      </View>
      <View style={styles.clipMeta}>
        <View style={styles.gameTagRow}>
          <View style={styles.gameTagDot} />
          <Text style={styles.gameTagText}>{clip.game}</Text>
        </View>
        <Text style={styles.handleText}>{clip.handle}</Text>
        <Text style={styles.captionText} numberOfLines={2}>{clip.caption}</Text>
      </View>
    </View>
  );
}

function ActionButton({ icon, count, color = '#fff', onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.actionButton} hitSlop={6}>
      <Text style={[styles.actionIcon, { color }]}>{icon}</Text>
      {count !== undefined && <Text style={styles.actionCount}>{count}</Text>}
    </Pressable>
  );
}

function formatCount(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace('.0', '') + 'K';
  return String(n);
}


// ---- RELEASES SCREEN (real game art from RAWG API) -------------------------

function ReleasesScreen() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReleases();
  }, []);

  async function fetchReleases() {
    try {
      // Get games releasing in the next 60 days — all platforms, sorted by date
      const today = new Date();
      const future = new Date(today);
      future.setDate(future.getDate() + 60);
      const from = today.toISOString().split('T')[0];
      const to = future.toISOString().split('T')[0];

      const url = `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&dates=${from},${to}&ordering=released&page_size=20`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.results) {
        setGames(data.results);
      }
    } catch (e) {
      console.log('RAWG fetch error:', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Loading releases...</Text>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>Every game, every day</Text>
          <Text style={styles.sectionTitle}>Upcoming Releases</Text>
        </View>
      </View>

      <View style={styles.releasesGrid}>
        {games.map((game) => (
          <View key={game.id} style={styles.releaseCardNew}>
            {game.background_image ? (
              <Image
                source={{ uri: game.background_image }}
                style={styles.releaseArtImg}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.releaseArtImg, { backgroundColor: COLORS.surface2 }]}>
                <Text style={styles.releaseArtFallback}>{game.name[0]}</Text>
              </View>
            )}
            <View style={styles.releaseMetaNew}>
              <Text style={styles.releaseTitleNew} numberOfLines={2}>{game.name}</Text>
              <Text style={styles.releaseDateNew}>
                {game.released || 'TBA'}
              </Text>
              {game.genres && game.genres.length > 0 && (
                <View style={styles.genreRow}>
                  {game.genres.slice(0, 2).map((g) => (
                    <View key={g.id} style={styles.genreChip}>
                      <Text style={styles.genreChipText}>{g.name}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ---- CHATS SCREEN ----------------------------------------------------------

function ChatsScreen() {
  return (
    <View>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>Just you and them</Text>
          <Text style={styles.sectionTitle}>Direct Messages</Text>
        </View>
        <Pressable style={styles.sectionAction} hitSlop={6}>
          <Text style={styles.sectionActionText}>New</Text>
        </Pressable>
      </View>

      <View>
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

      <View style={styles.divider} />

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

// ---- LFG SCREEN ------------------------------------------------------------

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


// ---- STYLES ----------------------------------------------------------------

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
  logo: { fontSize: 26, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  logoAccent: { color: COLORS.accent },
  searchPill: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
  },
  searchText: { color: COLORS.textDim, fontSize: 13 },

  // Body
  body: { flex: 1 },
  bodyContent: { padding: 20, paddingBottom: 40 },

  // Section headers
  sectionHeader: {
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between', marginBottom: 12,
  },
  sectionEyebrow: {
    color: COLORS.textFaint, fontSize: 11, fontWeight: '600',
    letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 2,
  },
  sectionTitle: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
  sectionAction: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: COLORS.surface2, borderRadius: 999,
    borderWidth: 1, borderColor: COLORS.border,
  },
  sectionActionText: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 24 },

  // DMs
  dmRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  dmAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  dmAvatarLetter: { color: '#fff', fontSize: 17, fontWeight: '700' },
  dmBody: { flex: 1, marginLeft: 12, marginRight: 8 },
  dmTopLine: { flexDirection: 'row', justifyContent: 'space-between' },
  dmName: { color: COLORS.text, fontSize: 15, fontWeight: '600', flex: 1 },
  dmWhen: { color: COLORS.textFaint, fontSize: 12, marginLeft: 8 },
  dmLast: { color: COLORS.textDim, fontSize: 13, marginTop: 2 },
  dmUnread: { minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  dmUnreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Game Rooms
  roomList: { gap: 10 },
  roomRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface2, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 10 },
  roomArt: { width: 48, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  roomArtLetter: { color: '#fff', fontSize: 22, fontWeight: '800', opacity: 0.9 },
  roomBody: { flex: 1, marginLeft: 12 },
  roomGame: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  roomMembers: { color: COLORS.textDim, fontSize: 12, marginTop: 2 },
  roomTag: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: COLORS.bg, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border },
  roomTagText: { color: COLORS.textDim, fontSize: 11, fontWeight: '600' },

  // LFG
  lfgList: { gap: 10 },
  lfgCard: { backgroundColor: COLORS.surface2, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  lfgGame: { color: COLORS.accent, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  lfgTitle: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  lfgDetail: { color: COLORS.textDim, fontSize: 13, marginTop: 4 },

  // Releases tab
  loadingWrap: { paddingTop: 60, alignItems: 'center' },
  loadingText: { color: COLORS.textDim, marginTop: 12, fontSize: 14 },
  releasesGrid: { gap: 14 },
  releaseCardNew: {
    backgroundColor: COLORS.surface2, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  releaseArtImg: { width: '100%', height: 180 },
  releaseArtFallback: { color: '#fff', fontSize: 40, fontWeight: '800', opacity: 0.5 },
  releaseMetaNew: { padding: 14 },
  releaseTitleNew: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  releaseDateNew: { color: COLORS.textDim, fontSize: 13 },
  genreRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  genreChip: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: COLORS.bg, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border },
  genreChipText: { color: COLORS.textDim, fontSize: 11, fontWeight: '600' },

  // Tab bar
  tabBar: { flexDirection: 'row', backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10, paddingBottom: 24 },
  tabBarOnClips: { backgroundColor: 'rgba(0,0,0,0.55)', borderTopColor: 'rgba(255,255,255,0.08)' },
  tabButton: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  tabLabel: { color: COLORS.textDim, fontSize: 13, fontWeight: '600' },
  tabLabelOnClips: { color: 'rgba(255,255,255,0.65)' },
  tabLabelActive: { color: COLORS.text },
  tabDot: { width: 4, height: 4, borderRadius: 2, marginTop: 6, backgroundColor: 'transparent' },
  tabDotActive: { backgroundColor: COLORS.accent },

  // Clips feed
  feedRoot: { flex: 1, backgroundColor: '#000' },
  feedTopBar: { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: 56, paddingBottom: 12, alignItems: 'center' },
  feedTopTabs: { flexDirection: 'row', alignItems: 'center' },
  feedTopLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 16, fontWeight: '600', paddingHorizontal: 10 },
  feedTopLabelActive: { color: '#fff', fontWeight: '800' },
  feedTopSep: { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.35)' },

  clipCard: { justifyContent: 'flex-end' },
  clipVignette: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%', backgroundColor: 'rgba(0,0,0,0.45)' },

  actionRail: { position: 'absolute', right: 12, bottom: 120, alignItems: 'center', gap: 22 },
  creatorAvatarWrap: { alignItems: 'center', marginBottom: 6 },
  creatorAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1a1a2b', borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  creatorAvatarLetter: { color: '#fff', fontSize: 18, fontWeight: '800' },
  followBadge: { position: 'absolute', bottom: -8, width: 22, height: 22, borderRadius: 11, backgroundColor: '#ff5577', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000' },
  followBadgeActive: { backgroundColor: '#5ad1a6' },
  followBadgeText: { color: '#fff', fontSize: 13, fontWeight: '900', lineHeight: 14 },

  actionButton: { alignItems: 'center' },
  actionIcon: { fontSize: 30, color: '#fff' },
  actionCount: { color: '#fff', fontSize: 12, fontWeight: '600', marginTop: 2 },

  clipMeta: { paddingHorizontal: 16, paddingBottom: 90, paddingRight: 80 },
  gameTagRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', marginBottom: 8 },
  gameTagDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#7c5cff', marginRight: 6 },
  gameTagText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  handleText: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  captionText: { color: 'rgba(255,255,255,0.92)', fontSize: 14, lineHeight: 19 },
});
