import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardScreen } from './screens/DashboardScreen';
import { TasksScreen } from './screens/TasksScreen';
import { ApprovalsScreen } from './screens/ApprovalsScreen';
import { ApprovalDetailScreen } from './screens/ApprovalDetailScreen';
import { ChatScreen } from './screens/ChatScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { CommandCenterScreen } from './screens/CommandCenterScreen';
import { SetupStatusScreen } from './screens/SetupStatusScreen';

export type RootStackParamList = {
  Dashboard: undefined;
  Tasks: undefined;
  Approvals: undefined;
  ApprovalDetail: { approvalId: string };
  Chat: undefined;
  Reports: undefined;
  Settings: undefined;
  CommandCenter: undefined;
  SetupStatus: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Dashboard">
        <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'AI-PM Dashboard' }} />
        <Stack.Screen name="Tasks" component={TasksScreen} options={{ title: 'Tasks' }} />
        <Stack.Screen name="Approvals" component={ApprovalsScreen} options={{ title: 'Approvals' }} />
        <Stack.Screen name="ApprovalDetail" component={ApprovalDetailScreen} options={{ title: 'Approval Detail' }} />
        <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat' }} />
        <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: 'Reports' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
        <Stack.Screen name="CommandCenter" component={CommandCenterScreen} options={{ title: 'Command Center' }} />
        <Stack.Screen name="SetupStatus" component={SetupStatusScreen} options={{ title: 'Setup Status' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}