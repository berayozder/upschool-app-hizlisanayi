import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/constants/theme';

type MCIcon = keyof typeof MaterialCommunityIcons.glyphMap;

function TabIcon({ name, color }: { name: MCIcon; color: string }) {
  return <MaterialCommunityIcons name={name} size={24} color={color} />;
}

export default function AppLayout() {
  const { profile } = useAuth();

  // Still loading — render nothing (splash is still showing)
  if (!profile) return null;

  const isProvider = profile.active_role === 'provider';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,    // #1D4ED8
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: '#E2E8F0',
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 2,
        },
        headerShown: false,
      }}
    >
      {/* ─── İlanlar / Fırsatlar Tab ─── */}
      <Tabs.Screen
        name="feed/index"
        options={{
          // ui-choices.md: "İlanlar" (Seeker) and "Fırsatlar" (Provider)
          title: isProvider ? 'Fırsatlar' : 'İlanlar',
          tabBarIcon: ({ color }) => (
            <TabIcon
              name={isProvider ? 'briefcase-search' : 'home'}
              color={color}
            />
          ),
        }}
      />

      {/* ─── İlan Ver Tab (seeker only) ─── */}
      <Tabs.Screen
        name="post/index"
        options={
          isProvider
            ? { href: null } // hidden for providers
            : {
                title: 'İlan Ver',
                tabBarIcon: ({ color }) => (
                  <TabIcon name="plus-circle" color={color} />
                ),
              }
        }
      />

      {/* ─── Profil Tab ─── */}
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => (
            <TabIcon name="account" color={color} />
          ),
        }}
      />

      {/* ─── Hidden screens (no tab) ─── */}
      <Tabs.Screen name="profile/provider-setup" options={{ href: null }} />
      <Tabs.Screen name="job/[id]" options={{ href: null }} />
    </Tabs>
  );
}
