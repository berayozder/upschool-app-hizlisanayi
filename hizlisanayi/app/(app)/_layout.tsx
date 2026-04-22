import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';

const ORANGE = '#F97316';
const GRAY = '#9CA3AF';

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
        tabBarActiveTintColor: ORANGE,
        tabBarInactiveTintColor: GRAY,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#F3F4F6',
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
      {/* ─── Feed Tab ─── */}
      <Tabs.Screen
        name="feed/index"
        options={{
          title: isProvider ? 'Fırsatlar' : 'İlanlarım',
          tabBarIcon: ({ color }) => (
            <TabIcon
              name={isProvider ? 'briefcase-search' : 'home'}
              color={color}
            />
          ),
        }}
      />

      {/* ─── Post Tab ─── */}
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

      {/* ─── Profile Tab ─── */}
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
