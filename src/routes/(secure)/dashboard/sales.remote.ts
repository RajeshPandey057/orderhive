import { form } from '$app/server';
import { redirect } from '@sveltejs/kit';
import { z } from 'zod';

// Define the schema for the sale form using Zod
const saleSchema = z.object({
	// Client Details
	firstName: z.string().min(1, 'First name is required'),
	lastName: z.string().min(1, 'Last name is required'),
	email: z.email('Valid email is required'),
	phone: z.string().min(10, 'Valid phone number is required'),

	// Project Details
	dealType: z.enum(['off-plan', 'on-plan', 'resell'], 'Deal type is required'),
	developer: z.string().min(1, 'Developer is required'),
	property: z.string().min(1, 'Property is required'),
	unitNo: z.string().min(1, 'Unit number is required'),
	unitValue: z.string().min(1, 'Unit value is required')
});

export const createSale = form(saleSchema, async (data) => {
	// TODO: Add your database logic here
	// For example:
	// await db.sql`
	// 	INSERT INTO sales (
	// 		first_name, last_name, email, phone,
	// 		deal_type, developer, property, unit_no, unit_value,
	// 		deal_status, payment_percentage
	// 	) VALUES (
	// 		${data.firstName}, ${data.lastName}, ${data.email}, ${data.phone},
	// 		${data.dealType}, ${data.developer}, ${data.property}, ${data.unitNo}, ${data.unitValue},
	// 		${data.dealStatus}, ${data.paymentPercentage || data.customPaymentValue}
	// 	)
	// `;

	console.error('Sale created:', data);

	// Redirect back to dashboard after successful submission
	redirect(303, '/dashboard');
});
