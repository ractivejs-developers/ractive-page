'use strict';

import page from 'page';
import qs from 'qs';

import { setMetaTags } from './helpers';

const defaults = {
	click: (typeof document !== 'undefined'),
	popstate: (typeof window !== 'undefined'),
	dispatch: (typeof location !== 'undefined')
};

export default function (options, keypath) {

	options = Object.assign(defaults, options);
	keypath = keypath || '$route';
	
	return ({ proto, Ractive, instance }) => {

		let $$ = instance,
			getter = instance.get || instance.sharedGet,
			setter = instance.set || instance.sharedSet,
			instKeypath = keypath;

		if ( ! Ractive.isInstance($$) ) {
			$$ = new Ractive();
			instKeypath = `@shared.${instKeypath}`;
		}
		
		const observer = $$.observe({
			[`${instKeypath}`]: () => observer.silence(),
			[`${instKeypath}.pathname ${instKeypath}.path`]: (path) => page.show(path),
			[`${instKeypath}.querystring ${instKeypath}.query`]: (val, old, keypath) => {
				let querystring = val,
					pathname = $$.get(`${instKeypath}.pathname`);
				if (keypath === `${instKeypath}.query`) {
					querystring = qs.stringify(val);
				}
				$$.set(`${instKeypath}.path`, `${pathname}?${querystring}`);
			},
			[`${instKeypath}.state ${instKeypath}.title`]: () => getter(keypath).save()
		}, {
			init: false
		});

		$$.on('teardown', () => {
			page.stop();
			observer.cancel();
		});

		if (options.basepath) {
			page.base(options.basepath);
		}

		page('*', (ctx, next) => {
			observer.silence();
			ctx.handled = true;
			ctx.query = qs.parse(ctx.querystring);
			ctx.join = (key, val) => {
				let query = Object.assign({}, ctx.query);
				query[key] = val;
				return qs.stringify(query);
			};
			ctx.match = (route) => {
				let match = new page.Route(route).match(ctx.path, ctx.params);
				if (match) {
					getter(keypath).params = ctx.params;
	
					if (typeof options.meta === 'object' && options.meta[route]) {
						const meta = options.meta[route];
						ctx.state.meta = meta;
						ctx.title = meta.title;
						setMetaTags(meta);
					}

					if (observer.isSilenced()) {
						observer.resume();
					}
				}
				return match;
			};
			return next();
		});
	
		if (typeof options.before === 'function') {
			page('*', options.before);
		}
	
		if (typeof options.after === 'function') {
			page.exit('*', options.after);
		}
	
		page('*', ctx => {
			setter(keypath, ctx).then(() => $$.update(`${instKeypath}.params`));
		});
	
		page.start(options);

		proto.$page = page;
	};
};