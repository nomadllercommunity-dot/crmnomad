import { Stack } from 'expo-router/stack';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="assign-lead" />
      <Stack.Screen name="add-sales-person" />
      <Stack.Screen name="analysis" />
      <Stack.Screen name="export" />
      <Stack.Screen name="sales-person-details" />
      <Stack.Screen name="chat" />
    </Stack>
  );
}
