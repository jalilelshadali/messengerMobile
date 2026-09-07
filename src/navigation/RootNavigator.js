import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, Platform, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme";
import { stackScreenOptions, tabScreenOptions } from "./navTheme";
import PinScreen from "../screens/PinScreen";
import AdminBooksScreen from "../screens/AdminBooksScreen";
import AdminHomeScreen from "../screens/AdminHomeScreen";
import AdminOrgScreen from "../screens/AdminOrgScreen";
import AdminUsersScreen from "../screens/AdminUsersScreen";
import CalendarScreen from "../screens/CalendarScreen";
import ChatListScreen from "../screens/ChatListScreen";
import ChatScreen from "../screens/ChatScreen";
import CreateMeetingScreen from "../screens/CreateMeetingScreen";
import GroupInfoScreen from "../screens/GroupInfoScreen";
import LibraryScreen from "../screens/LibraryScreen";
import LoginScreen from "../screens/LoginScreen";
import NewChatScreen from "../screens/NewChatScreen";
import ChangePinScreen from "../screens/ChangePinScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SecurityScreen from "../screens/SecurityScreen";
import SettingsScreen from "../screens/SettingsScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function ChatsStack() {
  const t = useTheme();
  return (
    <Stack.Navigator screenOptions={stackScreenOptions(t)}>
      <Stack.Screen name="ChatList" component={ChatListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="NewChat" component={NewChatScreen} options={{ title: "Yeni söhbət" }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
      <Stack.Screen name="GroupInfo" component={GroupInfoScreen} options={{ title: "Qrup məlumatı" }} />
    </Stack.Navigator>
  );
}

function CalendarStack() {
  const t = useTheme();
  const { user } = useAuth();
  return (
    <Stack.Navigator screenOptions={stackScreenOptions(t)}>
      <Stack.Screen
        name="CalendarHome"
        component={CalendarScreen}
        options={({ navigation }) => ({
          title: "Təqvim",
          headerRight: user.is_staff
            ? () => (
                <Ionicons
                  name="add-circle-outline"
                  size={24}
                  color={t.color.accent}
                  onPress={() => navigation.navigate("CreateMeeting")}
                />
              )
            : undefined,
        })}
      />
      <Stack.Screen name="CreateMeeting" component={CreateMeetingScreen} options={{ title: "Yeni iclas" }} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  const t = useTheme();
  return (
    <Stack.Navigator screenOptions={stackScreenOptions(t)}>
      <Stack.Screen name="ProfileHome" component={ProfileScreen} options={{ title: "Profil" }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Parametrlər" }} />
      <Stack.Screen name="Security" component={SecurityScreen} options={{ title: "Təhlükəsizlik" }} />
      <Stack.Screen name="ChangePin" component={ChangePinScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function AdminStack() {
  const t = useTheme();
  return (
    <Stack.Navigator screenOptions={stackScreenOptions(t)}>
      <Stack.Screen name="AdminHome" component={AdminHomeScreen} options={{ title: "Admin" }} />
      <Stack.Screen name="AdminUsers" component={AdminUsersScreen} options={{ title: "Üzvlər" }} />
      <Stack.Screen name="AdminOrg" component={AdminOrgScreen} options={{ title: "Möhtərəm Lojalar" }} />
      <Stack.Screen name="AdminBooks" component={AdminBooksScreen} options={{ title: "Kitabxana" }} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const t = useTheme();
  const { user } = useAuth();

  return (
    <Tab.Navigator screenOptions={{ ...tabScreenOptions(t), headerShown: false }}>
      <Tab.Screen
        name="Chats"
        component={ChatsStack}
        options={{
          title: "Söhbətlər",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarStack}
        options={{
          title: "Təqvim",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "calendar" : "calendar-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{
          title: "Kitabxana",
          headerShown: true,
          ...stackScreenOptions(t),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "library" : "library-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={size} color={color} />
          ),
        }}
      />
      {Platform.OS === "web" && user.is_staff && (
        <Tab.Screen
          name="Admin"
          component={AdminStack}
          options={{
            title: "Admin",
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? "shield-checkmark" : "shield-checkmark-outline"} size={size} color={color} />
            ),
          }}
        />
      )}
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const { user, isLoading, locked, needsPinSetup } = useAuth();
  const t = useTheme();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: t.color.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={t.color.accent} size="large" />
      </View>
    );
  }

  if (locked) return <PinScreen mode="unlock" />;
  if (user && needsPinSetup) return <PinScreen mode="setup" />;

  return user ? <MainTabs /> : <AuthStack />;
}
