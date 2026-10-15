import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BSColors } from '@/constants/theme';

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BSColors.orange,
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: BSColors.white,
          borderTopColor: BSColors.borderLight,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontFamily: 'Urbanist-SemiBold' },
      }}
    >
      <Tabs.Screen
        name="users"
        options={{
          title: 'Users',
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          tabBarIcon: ({ color, size }) => <Ionicons name="swap-horizontal" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="controls"
        options={{
          title: 'Controls',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}