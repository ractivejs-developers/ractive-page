'use strict';

export function setMetaTags(meta) {
	if (typeof document !== 'undefined') {
		document.title = meta.title;
		const description = document.getElementsByName('description');
		if (description.length) {
			description[0].content = meta.description;
		}
		const keywords = document.getElementsByName('keywords');
		if (keywords.length) {
			keywords[0].content = meta.keywords;
		}
	}
}