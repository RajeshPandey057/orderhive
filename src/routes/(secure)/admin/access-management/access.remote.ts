import { form } from '$app/server';
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

export const inviteUser = form(inviteUserSchema, async (data) => {
	const timestamp = FieldValue.serverTimestamp();

	// Check if user with this email already exists in roles collection
	const existingRole = await firestore
		.collection('roles')
		.where('email', '==', data.email)
		.limit(1)
		.get();

	if (!existingRole.empty) {
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
		const docRef = await firestore.collection('roles').add(roleRecord);
		// Update the document with its own uid
		await docRef.update({ uid: docRef.id });
	} catch (err) {
		console.error('Failed to save role to Firestore', err);
		error(500, 'Unable to invite user right now. Please try again.');
	}

	return { success: true };
});
