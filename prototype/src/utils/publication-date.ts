export function publicationDate(data: {
	publishedAt?: Date | null;
	original_date?: string | null;
}): Date | null {
	if (data.original_date) {
		const original = new Date(data.original_date);
		if (!Number.isNaN(original.getTime())) return original;
	}
	return data.publishedAt ?? null;
}
