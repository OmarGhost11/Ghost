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
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

// Tabs: Clips (home), Chats, LFG, Drops (renamed from Releases)
const TABS = [
  { id: 'clips', label: 'Clips' },
  { id: 'chats', label: 'Chats' },
  { id: 'lfg', label: 'LFG' },
  { id: 'drops', label: 'Drops' },
];

// ---- MOCK DATA ------------------------------------------------------------

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

// Hardcoded fallback if RAWG is unreachable.
const RELEASES_FALLBACK = [
  { id: 'silksong',     title: 'Hollow Knight: Silksong',          released: '2026-03-14', genre: 'Metroidvania', cover: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1030300/library_600x900.jpg' },
  { id: 'mhwilds',      title: 'Monster Hunter Wilds',             released: '2026-02-28', genre: 'Action RPG',   cover: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2246340/library_600x900.jpg' },
  { id: 'doom',         title: 'DOOM: The Dark Ages',              released: '2026-05-15', genre: 'FPS',          cover: 'https://cdn.cloudflare.steamstatic.com/steam/apps/3017860/library_600x900.jpg' },
  { id: 'nightreign',   title: 'Elden Ring Nightreign',            released: '2026-05-30', genre: 'Action RPG',   cover: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2622380/library_600x900.jpg' },
  { id: 'wuchang',      title: 'Wuchang: Fallen Feathers',         released: '2026-07-24', genre: 'Soulslike',    cover: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2277560/library_600x900.jpg' },
  { id: 'borderlands4', title: 'Borderlands 4',                    released: '2026-09-23', genre: 'Looter Shooter', cover: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1285190/library_600x900.jpg' },
];

// ---- RAWG API + helpers ---------------------------------------------------

const RAWG_API_KEY = 'a13d7600387049e1a9ae2fc6122c6d10';

function isoDate(d) {
  return d.toISOString().split('T')[0];
}

function formatReleaseDate(iso) {
  if (!iso) return 'TBA';
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[m - 1]} ${String(d).padStart(2, '0')}, ${y}`;
}

function rawgToGame(g) {
  return {
    id: String(g.id),
    title: g.name,
    released: g.released || null,
    genre: g.genres?.[0]?.name || 'Game',
    cover: g.background_image || '',
  };
}

// Returns 'out' if released on/before today, otherwise 'soon'.
function statusFor(released, todayStr) {
  return released && released <= todayStr ? 'out' : 'soon';
}

// Days between today and a release date (negative if already out).
function daysUntil(released) {
  if (!released) return Infinity;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(released);
  return Math.round((target - now) / (1000 * 60 * 60 * 24));
}

// ---- Wishlist storage + notifications ------------------------------------

const WISHLIST_STORAGE_KEY = '@gamebuds:wishlist:v1';

// Configure how notifications appear when the app is in foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function loadWishlist() {
  try {
    const raw = await AsyncStorage.getItem(WISHLIST_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveWishlist(map) {
  try {
    await AsyncStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Storage failures are non-fatal; UI still updates.
  }
}

// Ask for notification permission. Safe to call repeatedly.
async function ensureNotificationPermission() {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

// Schedule "1 month out", "1 week out", and "release day" notifications.
// Only schedules ones whose trigger time is still in the future.
// Returns the array of scheduled notification IDs (so we can cancel later).
async function scheduleReleaseNotifications(game) {
  if (!game.released) return [];
  const ok = await ensureNotificationPermission();
  if (!ok) return [];

  const releaseDay = new Date(`${game.released}T10:00:00`); // 10am local
  const monthOut = new Date(releaseDay); monthOut.setDate(monthOut.getDate() - 30);
  const weekOut  = new Date(releaseDay); weekOut.setDate(weekOut.getDate() - 7);

  const ids = [];
  const triggers = [
    { date: monthOut,   title: 'Coming this month',   body: `${game.title} drops on ${formatReleaseDate(game.released)}` },
    { date: weekOut,    title: 'One week to go',      body: `${game.title} releases ${formatReleaseDate(game.released)}` },
    { date: releaseDay, title: 'Out today',           body: `${game.title} is available now. Time to play.` },
  ];

  const now = new Date();
  for (const t of triggers) {
    if (t.date <= now) continue; // skip past triggers
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: { title: t.title, body: t.body, data: { gameId: game.id } },
        trigger: { type: 'date', date: t.date },
      });
      ids.push(id);
    } catch {
      // ignore individual failures
    }
  }
  return ids;
}

async function cancelNotifications(ids = []) {
  for (const id of ids) {
    try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
  }
}

// ---- MAIN APP -------------------------------------------------------------

export default function App() {
  const [activeTab, setActiveTab] = useState('clips');
  const isClips = activeTab === 'clips';

  // Wishlist is shared between Drops grid and any future "My Wishlist" view.
  // Stored as { [gameId]: { game, notificationIds } }.
  const [wishlist, setWishlist] = useState({});
  const [wishlistReady, setWishlistReady] = useState(false);

  useEffect(() => {
    loadWishlist().then((map) => {
      setWishlist(map);
      setWishlistReady(true);
    });
  }, []);

  async function toggleWishlist(game) {
    const existing = wishlist[game.id];
    if (existing) {
      // Removing — cancel scheduled notifications.
      await cancelNotifications(existing.notificationIds);
      const next = { ...wishlist };
      delete next[game.id];
      setWishlist(next);
      saveWishlist(next);
    } else {
      // Adding — schedule notifications.
      const notificationIds = await scheduleReleaseNotifications(game);
      const next = {
        ...wishlist,
        [game.id]: { game, notificationIds },
      };
      setWishlist(next);
      saveWishlist(next);
    }
  }

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
          {activeTab === 'drops' && (
            <DropsScreen
              wishlist={wishlist}
              wishlistReady={wishlistReady}
              onToggleWishlist={toggleWishlist}
            />
          )}
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

// ---- CLIPS FEED -----------------------------------------------------------

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



// ---- DROPS SCREEN (live RAWG, with wishlist + filters) -------------------

function DropsScreen({ wishlist, wishlistReady, onToggleWishlist }) {
  const [games, setGames] = useState(null); // null = loading
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'wishlist'
  const todayStr = isoDate(new Date());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const now = new Date();
        const past = new Date(now); past.setMonth(past.getMonth() - 1);
        const future = new Date(now); future.setMonth(future.getMonth() + 6);
        const url =
          `https://api.rawg.io/api/games` +
          `?key=${RAWG_API_KEY}` +
          `&dates=${isoDate(past)},${isoDate(future)}` +
          `&ordering=-added` +
          `&page_size=30`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        const mapped = (data.results || [])
          .filter((g) => g.background_image)
          .map(rawgToGame);
        setGames(mapped);
      } catch (e) {
        if (cancelled) return;
        setError(e.message);
        setGames(RELEASES_FALLBACK);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (games === null) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={COLORS.accent} />
        <Text style={styles.loadingText}>Loading drops…</Text>
      </View>
    );
  }

  // Build the visible list based on the current filter.
  const wishlistArr = Object.values(wishlist).map((w) => w.game);
  const visible = filter === 'wishlist' ? wishlistArr : games;
  const out = visible.filter((g) => statusFor(g.released, todayStr) === 'out');
  const soon = visible
    .filter((g) => statusFor(g.released, todayStr) === 'soon')
    .sort((a, b) => (a.released || '').localeCompare(b.released || '')); // soonest first

  return (
    <View>
      {error && (
        <View style={styles.fallbackBanner}>
          <Text style={styles.fallbackBannerText}>
            Showing cached drops — live data unavailable
          </Text>
        </View>
      )}

      {/* Section header + Filter chips */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>What's launching</Text>
          <Text style={styles.sectionTitle}>Game Drops</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        <FilterChip
          label="All"
          active={filter === 'all'}
          onPress={() => setFilter('all')}
        />
        <FilterChip
          label={`Wishlist · ${wishlistArr.length}`}
          active={filter === 'wishlist'}
          onPress={() => setFilter('wishlist')}
        />
      </View>

      {/* Empty state for an empty wishlist */}
      {filter === 'wishlist' && wishlistArr.length === 0 && (
        <View style={styles.wishlistEmpty}>
          <Text style={styles.wishlistEmptyTitle}>Your wishlist is empty</Text>
          <Text style={styles.wishlistEmptyBody}>
            Tap the + on any game to add it. We'll remind you a month before,
            a week before, and the day it drops.
          </Text>
        </View>
      )}

      {/* Coming Soon */}
      {soon.length > 0 && (
        <>
          <Text style={styles.subSectionTitle}>Coming Soon</Text>
          <DropGrid
            games={soon}
            wishlist={wishlist}
            wishlistReady={wishlistReady}
            onToggleWishlist={onToggleWishlist}
            todayStr={todayStr}
          />
        </>
      )}

      {/* Out Now */}
      {out.length > 0 && (
        <>
          {soon.length > 0 && <View style={styles.divider} />}
          <Text style={styles.subSectionTitle}>Out Now</Text>
          <DropGrid
            games={out}
            wishlist={wishlist}
            wishlistReady={wishlistReady}
            onToggleWishlist={onToggleWishlist}
            todayStr={todayStr}
          />
        </>
      )}
    </View>
  );
}

function FilterChip({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.filterChip, active && styles.filterChipActive]}
      hitSlop={6}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function DropGrid({ games, wishlist, wishlistReady, onToggleWishlist, todayStr }) {
  return (
    <View style={styles.dropsGrid}>
      {games.map((game) => {
        const inWishlist = !!wishlist[game.id];
        const status = statusFor(game.released, todayStr);
        const days = daysUntil(game.released);
        let countdown = null;
        if (status === 'soon' && days >= 0 && days <= 60) {
          countdown = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d`;
        }
        return (
          <View key={game.id} style={styles.dropCard}>
            <View style={styles.dropArtWrap}>
              <Image source={{ uri: game.cover }} style={styles.dropArt} resizeMode="cover" />
              {/* Status badge top-left */}
              <View style={[styles.statusBadge, status === 'out' && styles.statusBadgeOut]}>
                <Text style={styles.statusBadgeText}>{status === 'out' ? 'OUT' : 'SOON'}</Text>
              </View>
              {/* Countdown badge top-right */}
              {countdown && (
                <View style={styles.countdownBadge}>
                  <Text style={styles.countdownBadgeText}>{countdown}</Text>
                </View>
              )}
              {/* Wishlist button bottom-right of art */}
              <Pressable
                disabled={!wishlistReady}
                onPress={() => onToggleWishlist(game)}
                style={[styles.wishBtn, inWishlist && styles.wishBtnActive]}
                hitSlop={6}
              >
                <Text style={[styles.wishBtnText, inWishlist && styles.wishBtnTextActive]}>
                  {inWishlist ? '✓ Wishlisted' : '+ Wishlist'}
                </Text>
              </Pressable>
            </View>
            <View style={styles.dropMeta}>
              <Text style={styles.dropTitle} numberOfLines={2}>{game.title}</Text>
              <Text style={styles.dropDate}>{formatReleaseDate(game.released)}</Text>
              <View style={styles.genreChip}>
                <Text style={styles.genreChipText}>{game.genre}</Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ---- CHATS / LFG ----------------------------------------------------------

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

// ---- STYLES ---------------------------------------------------------------

const COLORS = {
  bg:        '#0b0b14',
  surface:   '#13131f',
  surface2:  '#1a1a2b',
  border:    '#23233a',
  text:      '#ffffff',
  textDim:   '#8a8aa3',
  textFaint: '#5c5c75',
  accent:    '#7c5cff',
  good:      '#5ad1a6',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  // Header
  header: {
    paddingTop: 64, paddingBottom: 14, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
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
  subSectionTitle: {
    color: COLORS.textDim, fontSize: 12, fontWeight: '700',
    letterSpacing: 0.6, textTransform: 'uppercase',
    marginTop: 4, marginBottom: 12,
  },
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
  dmUnread: {
    minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11,
    backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center',
  },
  dmUnreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Game Rooms
  roomList: { gap: 10 },
  roomRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface2, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, padding: 10,
  },
  roomArt: { width: 48, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  roomArtLetter: { color: '#fff', fontSize: 22, fontWeight: '800', opacity: 0.9 },
  roomBody: { flex: 1, marginLeft: 12 },
  roomGame: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  roomMembers: { color: COLORS.textDim, fontSize: 12, marginTop: 2 },
  roomTag: {
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: COLORS.bg, borderRadius: 999,
    borderWidth: 1, borderColor: COLORS.border,
  },
  roomTagText: { color: COLORS.textDim, fontSize: 11, fontWeight: '600' },

  // LFG
  lfgList: { gap: 10 },
  lfgCard: { backgroundColor: COLORS.surface2, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  lfgGame: {
    color: COLORS.accent, fontSize: 11, fontWeight: '700',
    letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4,
  },
  lfgTitle: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  lfgDetail: { color: COLORS.textDim, fontSize: 13, marginTop: 4 },

  // Drops tab
  loadingWrap: { paddingTop: 60, alignItems: 'center' },
  loadingText: { color: COLORS.textDim, marginTop: 12, fontSize: 13 },
  fallbackBanner: {
    padding: 10, marginBottom: 14, borderRadius: 10,
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
  },
  fallbackBannerText: { color: COLORS.textDim, fontSize: 12, textAlign: 'center' },

  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  filterChipText: { color: COLORS.textDim, fontSize: 13, fontWeight: '600' },
  filterChipTextActive: { color: '#fff', fontWeight: '700' },

  wishlistEmpty: {
    padding: 20, marginBottom: 16, borderRadius: 14,
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center',
  },
  wishlistEmptyTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 6 },
  wishlistEmptyBody: { color: COLORS.textDim, fontSize: 13, textAlign: 'center', lineHeight: 18 },

  dropsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'space-between', rowGap: 16,
  },
  dropCard: {
    width: '48%',
    backgroundColor: COLORS.surface2, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  dropArtWrap: { width: '100%', aspectRatio: 2 / 3, position: 'relative' },
  dropArt: { width: '100%', height: '100%' },

  statusBadge: {
    position: 'absolute', top: 8, left: 8,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
    backgroundColor: COLORS.accent,
  },
  statusBadgeOut: { backgroundColor: COLORS.good },
  statusBadgeText: { color: '#000', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },

  countdownBadge: {
    position: 'absolute', top: 8, right: 8,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  countdownBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  wishBtn: {
    position: 'absolute', bottom: 8, left: 8, right: 8,
    paddingVertical: 6, borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  wishBtnActive: {
    backgroundColor: COLORS.accent, borderColor: COLORS.accent,
  },
  wishBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  wishBtnTextActive: { color: '#fff' },

  dropMeta: { padding: 10 },
  dropTitle: { color: COLORS.text, fontSize: 13, fontWeight: '700', marginBottom: 4, lineHeight: 17 },
  dropDate: { color: COLORS.textDim, fontSize: 11, marginBottom: 8 },
  genreChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
    backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border,
  },
  genreChipText: { color: COLORS.textDim, fontSize: 10, fontWeight: '600' },

  // Tab bar
  tabBar: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingTop: 10, paddingBottom: 24,
  },
  tabBarOnClips: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  tabButton: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  tabLabel: { color: COLORS.textDim, fontSize: 13, fontWeight: '600' },
  tabLabelOnClips: { color: 'rgba(255,255,255,0.65)' },
  tabLabelActive: { color: COLORS.text },
  tabDot: { width: 4, height: 4, borderRadius: 2, marginTop: 6, backgroundColor: 'transparent' },
  tabDotActive: { backgroundColor: COLORS.accent },

  // Clips feed
  feedRoot: { flex: 1, backgroundColor: '#000' },
  feedTopBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingTop: 56, paddingBottom: 12, alignItems: 'center',
  },
  feedTopTabs: { flexDirection: 'row', alignItems: 'center' },
  feedTopLabel: {
    color: 'rgba(255,255,255,0.55)', fontSize: 16, fontWeight: '600',
    paddingHorizontal: 10,
  },
  feedTopLabelActive: { color: '#fff', fontWeight: '800' },
  feedTopSep: { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.35)' },

  clipCard: { justifyContent: 'flex-end' },
  clipVignette: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    height: '55%', backgroundColor: 'rgba(0,0,0,0.45)',
  },
  actionRail: {
    position: 'absolute', right: 12, bottom: 120,
    alignItems: 'center', gap: 22,
  },
  creatorAvatarWrap: { alignItems: 'center', marginBottom: 6 },
  creatorAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#1a1a2b',
    borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  creatorAvatarLetter: { color: '#fff', fontSize: 18, fontWeight: '800' },
  followBadge: {
    position: 'absolute', bottom: -8,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#ff5577',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#000',
  },
  followBadgeActive: { backgroundColor: '#5ad1a6' },
  followBadgeText: { color: '#fff', fontSize: 13, fontWeight: '900', lineHeight: 14 },
  actionButton: { alignItems: 'center' },
  actionIcon: { fontSize: 30, color: '#fff' },
  actionCount: { color: '#fff', fontSize: 12, fontWeight: '600', marginTop: 2 },
  clipMeta: { paddingHorizontal: 16, paddingBottom: 90, paddingRight: 80 },
  gameTagRow: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    marginBottom: 8,
  },
  gameTagDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#7c5cff', marginRight: 6 },
  gameTagText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  handleText: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  captionText: { color: 'rgba(255,255,255,0.92)', fontSize: 14, lineHeight: 19 },
});
