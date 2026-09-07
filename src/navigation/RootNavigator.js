import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, Platform, Pressable, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme";
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
import ProfileScreen from "../screens/ProfileScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: "#0d1117" },
  headerTintColor: "#d4af37",
};

function ChatsStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="ChatList"
        component={ChatListScreen}
        options={({ navigation }) => ({
          title: "Söhbətlər",
          headerRight: () => (
            <Pressable onPress={() => navigation.navigate("NewChat")} hitSlop={10}>
              <Ionicons name="create-outline" size={24} color="#d4af37" />
            </Pressable>
          ),
        })}
      />
      <Stack.Screen name="NewChat" component={NewChatScreen} options={{ title: "Yeni söhbət" }} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="GroupInfo" component={GroupInfoScreen} options={{ title: "Qrup məlumatı" }} />
    </Stack.Navigator>
  );
}

function CalendarStack() {
  const { user } = useAuth();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="CalendarHome"
        component={CalendarScreen}
        options={({ navigation }) => ({
          title: "Təqvim",
          headerRight: user.is_staff
            ? () => (
                <Pressable onPress={() => navigation.navigate("CreateMeeting")} hitSlop={10}>
                  <Ionicons name="add-circle-outline" size={24} color="#d4af37" />
                </Pressable>
              )
            : undefined,
        })}
      />
      <Stack.Screen name="CreateMeeting" component={CreateMeetingScreen} options={{ title: "Yeni iclas" }} />
    </Stack.Navigator>
  );
}

function AdminStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="AdminHome" component={AdminHomeScreen} options={{ title: "Admin" }} />
      <Stack.Screen name="AdminUsers" component={AdminUsersScreen} options={{ title: "Üzvlər" }} />
      <Stack.Screen name="AdminOrg" component={AdminOrgScreen} options={{ title: "Möhtərəm Lojalar" }} />
      <Stack.Screen name="AdminBooks" component={AdminBooksScreen} options={{ title: "Kitabxana" }} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const { user } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={{
        ...screenOptions,
        tabBarStyle: { backgroundColor: "#0d1117", borderTopColor: "#30363d" },
        tabBarActiveTintColor: "#d4af37",
        tabBarInactiveTintColor: "#8b949e",
      }}
    >
      <Tab.Screen
        name="Chats"
        component={ChatsStack}
        options={{
          headerShown: false,
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
          headerShown: false,
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
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "book" : "book-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "person-circle" : "person-circle-outline"} size={size} color={color} />
          ),
        }}
      />
      {Platform.OS === "web" && user.is_staff && (
        <Tab.Screen
          name="Admin"
          component={AdminStack}
          options={{
            headerShown: false,
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
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
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

  // Kilid ekranı hər şeyin üstündədir (root gate).
  if (locked) return <PinScreen mode="unlock" />;
  if (user && needsPinSetup) return <PinScreen mode="setup" />;

  return user ? <MainTabs /> : <AuthStack />;
}
