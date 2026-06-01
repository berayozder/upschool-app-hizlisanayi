import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function IndexRoute() {
  const { session, profile, loading } = useAuth();

  if (loading) return null;

  if (!session) {
    return <Redirect href="/(auth)/phone" />;
  }

  if (!profile) {
    return <Redirect href="/(auth)/role-select" />;
  }

  return <Redirect href="/(app)/feed" />;
}
