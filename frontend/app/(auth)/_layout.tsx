import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="phone" options={{ headerShown: false }} />
      <Stack.Screen name="otp" options={{ title: 'Doğrulama Kodu', headerBackVisible: true }} />
      <Stack.Screen name="role-select" options={{ headerShown: false }} />
    </Stack>
  );
}
