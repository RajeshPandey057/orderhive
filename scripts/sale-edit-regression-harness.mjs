import assert from 'node:assert/strict';

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');

const splitIdentity = (split) =>
	[
		split.ownerRole,
		normalizeText(split.agentId).toLowerCase(),
		normalizeText(split.agentEmail).toLowerCase(),
		normalizeText(split.agentName).toLowerCase(),
		String(Number(split.percentage) || 0)
	].join('|');

const hasHierarchy = (split) =>
	Boolean(normalizeText(split.managerEmail) && normalizeText(split.seniorManagerEmail));

const getExistingSplits = (sale) => {
	if (Array.isArray(sale.splits) && sale.splits.length > 0) return sale.splits;
	return (sale.dealOwners ?? []).map((owner, index) => ({
		agentId: normalizeText(owner.userId),
		agentName: normalizeText(owner.name),
		agentEmail: normalizeText(owner.email),
		agentPhotoURL: normalizeText(owner.photoURL),
		ownerRole: owner.ownerRole ?? (index === 0 ? 'caller' : 'closer'),
		percentage: Number(owner.split) || 0,
		managerEmail: normalizeText(owner.managerEmail),
		seniorManagerEmail: normalizeText(owner.seniorManagerEmail)
	}));
};

const changedMissingHierarchy = (submittedSplits, existingSale) => {
	const existingSplitsByIdentity = new Map(
		getExistingSplits(existingSale).map((split) => [splitIdentity(split), split])
	);
	return submittedSplits.find((split) => {
		const existingSplit = existingSplitsByIdentity.get(splitIdentity(split));
		if (!existingSplit) return !hasHierarchy(split);
		return hasHierarchy(existingSplit) && !hasHierarchy(split);
	});
};

const removeUndefinedValues = (value) => {
	if (Array.isArray(value)) return value.map((entry) => removeUndefinedValues(entry));
	if (!value || typeof value !== 'object') return value;
	return Object.fromEntries(
		Object.entries(value)
			.filter(([, entry]) => entry !== undefined)
			.map(([key, entry]) => [key, removeUndefinedValues(entry)])
	);
};

const comparableValue = (value) => JSON.stringify(value ?? null);

const buildPatch = (existingSale, submitted) => {
	const patch = { updatedAt: '<serverTimestamp>' };
	const addIfChanged = (path, nextValue, existingValue) => {
		if (nextValue === undefined) return;
		const cleanNextValue = removeUndefinedValues(nextValue);
		if (comparableValue(cleanNextValue) !== comparableValue(existingValue)) {
			patch[path] = cleanNextValue;
		}
	};

	addIfChanged(
		'clientDetails.firstName',
		submitted.firstName,
		existingSale.clientDetails?.firstName
	);
	addIfChanged(
		'clientDetails.lastName',
		submitted.lastName ?? '',
		existingSale.clientDetails?.lastName
	);
	addIfChanged('developer', submitted.developer, existingSale.developer);
	addIfChanged('propertyType', submitted.propertyType, existingSale.propertyType);
	addIfChanged('jointBuyers', submitted.jointBuyers, existingSale.jointBuyers);
	return patch;
};

const legacySale = {
	clientDetails: { firstName: 'Acme Holdings LLC', lastName: '' },
	developer: 'Developer From Migration',
	propertyType: 'Residential Unit',
	splits: [
		{
			agentId: 'agent-1',
			agentEmail: 'agent@example.com',
			agentName: 'Legacy Agent',
			ownerRole: 'caller',
			percentage: 100,
			managerEmail: '',
			seniorManagerEmail: ''
		}
	],
	jointBuyers: []
};

assert.equal(
	changedMissingHierarchy(legacySale.splits, legacySale),
	undefined,
	'unchanged legacy split without hierarchy should save'
);

assert.equal(
	changedMissingHierarchy([{ ...legacySale.splits[0], percentage: 90 }], legacySale)?.ownerRole,
	'caller',
	'changed split without manager and senior manager should be blocked'
);

assert.equal(
	changedMissingHierarchy(
		[
			{
				...legacySale.splits[0],
				managerEmail: '',
				seniorManagerEmail: ''
			}
		],
		{
			...legacySale,
			splits: [
				{
					...legacySale.splits[0],
					managerEmail: 'manager@example.com',
					seniorManagerEmail: 'senior@example.com'
				}
			]
		}
	)?.ownerRole,
	'caller',
	'clearing hierarchy from an existing complete split should be blocked'
);

assert.deepEqual(
	buildPatch(legacySale, {
		firstName: 'Acme Holdings LLC FZE',
		lastName: '',
		developer: 'Developer From Migration',
		propertyType: 'Residential Unit',
		jointBuyers: [{ firstName: 'Joint', lastName: undefined, email: undefined, phone: '' }]
	}),
	{
		updatedAt: '<serverTimestamp>',
		'clientDetails.firstName': 'Acme Holdings LLC FZE',
		jointBuyers: [{ firstName: 'Joint', phone: '' }]
	},
	'one-field edit should not rewrite unchanged migrated labels and should strip undefined array fields'
);

console.log('sale edit regression harness passed');
