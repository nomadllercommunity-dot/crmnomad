import { Stack } from 'expo-router/stack';

export default function SalesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="allocated-leads" />
      <Stack.Screen name="follow-ups" />
      <Stack.Screen name="hot-leads" />
      <Stack.Screen name="confirmed-leads" />
      <Stack.Screen name="operations" />
      <Stack.Screen name="lead-action" />
      <Stack.Screen name="confirm-lead" />
      <Stack.Screen name="chat" />
    </Stack>
  );
}
