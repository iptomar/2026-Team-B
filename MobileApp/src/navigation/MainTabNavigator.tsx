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
/**
 * Submit Tab Stack
 * 
 * Navigation flow for submitting new forms:
 * AvailableForms (list of forms user can submit) → FormFill (fill out the form)
 */
function SubmitStack() {
	return (
		<Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
			<Stack.Screen name="AvailableForms" component={AvailableFormsScreen} />
			<Stack.Screen name="FormFill" component={FormFillScreen} />
		</Stack.Navigator>
	);
}
/**
 * My Submissions Tab Stack
 * 
 * Navigation flow for viewing submitted forms:
 * MySubmissionsList (list of user's submissions) → SubmissionDetail (view a submission)
 */
function SubmissionsStack() {
	return (
		<Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
			<Stack.Screen name="MySubmissionsList" component={MySubmissionsScreen} />
			<Stack.Screen name="SubmissionDetail" component={SubmissionDetailScreen} />
		</Stack.Navigator>
	);
}
/**
 * Approvals Tab Stack
 * 
 * Navigation flow for approving/denying forms (approver role):
 * ApprovalsList (pending approvals) → ApprovalAction (review and decide)
 */
function ApprovalsStack() {
	return (
		<Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
			<Stack.Screen name="ApprovalsList" component={ApprovalsScreen} />
			<Stack.Screen name="ApprovalAction" component={ApprovalActionScreen} />
		</Stack.Navigator>
	);
}

/**
 * Main Tab Navigator
 * 
 * Bottom tab bar with 3 main sections:
 * 1. Submit Form - Browse and fill out forms
 * 2. My Submissions - Track your submitted forms
 * 3. Approvals - Review forms pending your approval (approvers only)
 */
export default function MainTabNavigator() {
	return (
		<Tab.Navigator
			screenOptions={{
				tabBarActiveTintColor: '#22c55e',
				tabBarInactiveTintColor: 'gray',
				headerShown: false,
				sceneStyle: { backgroundColor: 'transparent' },
				tabBarStyle: { backgroundColor: 'rgba(30, 41, 59, 0.85)', borderTopColor: '#334155' }
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
