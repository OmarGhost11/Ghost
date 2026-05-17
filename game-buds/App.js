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
  { id: 'chats', label: 'Chats', emoji: '💬' },
  { id: 'lfg', label: 'LFG', emoji: '🎮' },
  { id: 'feed', label: 'Feed', emoji: '📹' },
  { id: 'indie', label: 'Indie', emoji: '🕹️' },
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
        <Text style={styles.tagline}>find your players · share your plays</Text>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'chats' && <ChatsPlaceholder />}
        {activeTab === 'lfg' && <LfgPlaceholder />}
        {activeTab === 'feed' && <FeedPlaceholder />}
        {activeTab === 'indie' && <IndiePlaceholder />}
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
              <Text style={[styles.tabEmoji, !active && styles.tabEmojiInactive]}>
                {tab.emoji}
              </Text>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ChatsPlaceholder() {
  return (
    <Section
      title="Group Chats"
      subtitle="One room per game. Hop in, talk strategy, make friends."
    >
      <Card title="Valorant" detail="2,341 online · last msg 3s ago" />
      <Card title="Minecraft" detail="987 online · last msg 12s ago" />
      <Card title="Stardew Valley" detail="412 online · last msg 1m ago" />
    </Section>
  );
}

function LfgPlaceholder() {
  return (
    <Section
      title="Looking For Group"
      subtitle="Post what you want to play, get matched with buds."
    >
      <Card title="Need 2 for ranked Valorant" detail="9pm EST · Diamond+" />
      <Card title="Chill Minecraft survival" detail="any time · vanilla 1.21" />
      <Card title="Helldivers 2 - hard difficulty" detail="tonight · mic required" />
    </Section>
  );
}

function FeedPlaceholder() {
  return (
    <Section
      title="Clip Feed"
      subtitle="Vertical scroll of the sickest plays from buds."
    >
      <Card title="🎬 Coming soon" detail="TikTok-style feed for gaming clips" />
    </Section>
  );
}

function IndiePlaceholder() {
  return (
    <Section
      title="Indie Corner"
      subtitle="Discover indie games, find co-op buds, plan group buys."
    >
      <Card title="🕹️ Coming soon" detail="Indie discovery + co-buy planning" />
    </Section>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      <View style={styles.cards}>{children}</View>
    </View>
  );
}

function Card({ title, detail }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDetail}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b14',
  },
  header: {
    paddingTop: 70,
    paddingBottom: 24,
    paddingHorizontal: 24,
    backgroundColor: '#13131f',
    borderBottomWidth: 1,
    borderBottomColor: '#23233a',
  },
  logo: {
    fontSize: 34,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  logoAccent: {
    color: '#7c5cff',
  },
  tagline: {
    marginTop: 4,
    color: '#8a8aa3',
    fontSize: 13,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: '#8a8aa3',
    fontSize: 14,
    marginBottom: 14,
  },
  cards: {
    gap: 10,
  },
  card: {
    backgroundColor: '#1a1a2b',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#23233a',
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardDetail: {
    color: '#8a8aa3',
    fontSize: 13,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#13131f',
    borderTopWidth: 1,
    borderTopColor: '#23233a',
    paddingVertical: 10,
    paddingBottom: 24,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  tabEmoji: {
    fontSize: 22,
    marginBottom: 2,
  },
  tabEmojiInactive: {
    opacity: 0.5,
  },
  tabLabel: {
    color: '#8a8aa3',
    fontSize: 12,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#7c5cff',
    fontWeight: '700',
  },
});
