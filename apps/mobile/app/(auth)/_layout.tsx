import { Tabs } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { Redirect } from 'expo-router';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

// Icon components
function HomeIcon({ color, focused }: { color: string; focused: boolean }) {
  return (
    <View style={styles.iconWrapper}>
      <Text style={[styles.iconEmoji]}>🏠</Text>
    </View>
  );
}

function ClockIcon({ color, focused }: { color: string; focused: boolean }) {
  return (
    <View style={styles.iconWrapper}>
      <Text style={[styles.iconEmoji]}>⏰</Text>
    </View>
  );
}

function TaskIcon({ color, focused }: { color: string; focused: boolean }) {
  return (
    <View style={styles.iconWrapper}>
      <Text style={[styles.iconEmoji]}>📋</Text>
    </View>
  );
}

export default function AuthLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e5e7eb',
          borderTopWidth: 1,
          height: 95,
          paddingTop: 2,
          paddingBottom: 38,
          paddingHorizontal: 10,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#6b7280',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingTop: 6,
        },
        headerStyle: {
          backgroundColor: '#ffffff',
          elevation: 2,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        headerTintColor: '#1f2937',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
        headerShown: false,
        animation: 'shift',
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => <HomeIcon color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Attendance',
          tabBarIcon: ({ color, focused }) => <ClockIcon color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color, focused }) => <TaskIcon color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 22,
  },
});
