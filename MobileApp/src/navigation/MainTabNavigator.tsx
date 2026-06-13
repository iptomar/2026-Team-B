import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AvailableFormsScreen from '../screens/AvailableFormsScreen';
import FormFillScreen from '../screens/FormFillScreen';

import MySubmissionsScreen from '../screens/MySubmissionsScreen';
import SubmissionDetailScreen from '../screens/SubmissionDetailScreen';

import ApprovalsScreen from '../screens/ApprovalsScreen';
import ApprovalActionScreen from '../screens/ApprovalActionScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function SubmitStack() {
	return (
		<Stack.Navigator screenOptions={{ headerShown: false }}>
			<Stack.Screen name="AvailableForms" component={AvailableFormsScreen} />
			<Stack.Screen name="FormFill" component={FormFillScreen} />
		</Stack.Navigator>
	);
}

function SubmissionsStack() {
	return (
		<Stack.Navigator screenOptions={{ headerShown: false }}>
			<Stack.Screen name="MySubmissionsList" component={MySubmissionsScreen} />
			<Stack.Screen name="SubmissionDetail" component={SubmissionDetailScreen} />
		</Stack.Navigator>
	);
}

function ApprovalsStack() {
	return (
		<Stack.Navigator screenOptions={{ headerShown: false }}>
			<Stack.Screen name="ApprovalsList" component={ApprovalsScreen} />
			<Stack.Screen name="ApprovalAction" component={ApprovalActionScreen} />
		</Stack.Navigator>
	);
}

export default function MainTabNavigator() {
	return (
		<Tab.Navigator
			screenOptions={{
				tabBarActiveTintColor: '#0d9488',
				tabBarInactiveTintColor: 'gray',
				headerShown: false,
				tabBarStyle: { backgroundColor: '#1e293b', borderTopColor: '#334155' }
			}}
		>
			<Tab.Screen
				name="Submit Form"
				component={SubmitStack}
			/>
			<Tab.Screen
				name="My Submissions"
				component={SubmissionsStack}
			/>
			<Tab.Screen
				name="Approvals"
				component={ApprovalsStack}
			/>
		</Tab.Navigator>
	);
}
