import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

// Placeholder — implemented in Phase 8 (T-030)
export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Job Detail — Phase 8</Text>
      <Text style={{ color: '#9CA3AF', marginTop: 8 }}>{id}</Text>
    </View>
  );
}
