export const getLocalizedName = (item, language) => {
	if (!item) return '';
	if (item.translations && item.translations[language]) {
		return item.translations[language];
	}
	return item.name || '';
};
