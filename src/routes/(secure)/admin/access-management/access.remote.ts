import { command, form } from '$app/server';
import { firestore } from '$lib/server/firebase';
import { error } from '@sveltejs/kit';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

// Define the schema for the invite user form using Zod
const inviteUserSchema = z.object({
	email: z.email('Valid email is required'),
	accessType: z.enum(['admin', 'agent', 'finance', 'compliance'], {
		message: 'Access type is required'
	}),
	// Agent-specific fields (optional, required only when accessType is 'agent')
	agentRole: z.string().optional(),
	agentLevel: z.string().optional()
});

// Define the schema for update user form
const updateUserSchema = z.object({
	email: z.email('Valid email is required'),
	accessType: z.enum(['admin', 'agent', 'finance', 'compliance'], {
		message: 'Access type is required'
	}),
	// Agent-specific fields (optional, required only when accessType is 'agent')
	agentRole: z.string().optional(),
	agentLevel: z.string().optional()
});

// Define the schema for delete user command
const deleteUserSchema = z.object({
	email: z.email('Valid email is required')
});

export const inviteUser = form(inviteUserSchema, async (data) => {
	const timestamp = FieldValue.serverTimestamp();

	// Check if user with this email already exists in roles collection
	const docRef = firestore.collection('roles').doc(data.email);
	const existingRole = await docRef.get();

	if (existingRole.exists) {
		error(400, 'A user with this email already exists');
	}

	// Build the role record
	const roleRecord: Partial<Role> = {
		email: data.email,
		accessType: data.accessType,
		createdAt: timestamp,
		updatedAt: timestamp
	};

	// Add agent-specific fields if accessType is 'agent'
	if (data.accessType === 'agent') {
		if (data.agentRole) {
			roleRecord.agentRole = data.agentRole;
		}
		if (data.agentLevel) {
			roleRecord.agentLevel = data.agentLevel;
		}
	}

	try {
		await docRef.set(roleRecord);
	} catch (err) {
		console.error('Failed to save role to Firestore', err);
		error(500, 'Unable to invite user right now. Please try again.');
	}

	return { success: true };
});

// Update user remote function
export const updateUser = form(updateUserSchema, async (data) => {
	const timestamp = FieldValue.serverTimestamp();

	// Get the document reference using email as the key
	const docRef = firestore.collection('roles').doc(data.email);
	const existingRole = await docRef.get();

	if (!existingRole.exists) {
		error(404, 'User not found');
	}

	// Build the update record
	const updateRecord: Partial<Role> = {
		accessType: data.accessType,
		updatedAt: timestamp
	};

	// Handle agent-specific fields
	if (data.accessType === 'agent') {
		if (data.agentRole) {
			updateRecord.agentRole = data.agentRole;
		}
		if (data.agentLevel) {
			updateRecord.agentLevel = data.agentLevel;
		}
	} else {
		// Clear agent fields if not agent
		updateRecord.agentRole = '';
		updateRecord.agentLevel = '';
	}

	try {
		await docRef.update(updateRecord);
	} catch (err) {
		console.error('Failed to update role in Firestore', err);
		error(500, 'Unable to update user right now. Please try again.');
	}

	return { success: true };
});

// Delete user remote function
export const deleteUser = command(deleteUserSchema, async (data) => {
	// Get the document reference using email as the key
	const docRef = firestore.collection('roles').doc(data.email);
	const existingRole = await docRef.get();

	if (!existingRole.exists) {
		error(404, 'User not found');
	}

	try {
		await docRef.delete();
	} catch (err) {
		console.error('Failed to delete role from Firestore', err);
		error(500, 'Unable to delete user right now. Please try again.');
	}

	return { success: true };
});
