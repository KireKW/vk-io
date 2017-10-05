import createDebug from 'debug';
import { load as cheerioLoad } from 'cheerio';

import { URL, URLSearchParams } from 'url';

import ImplicitFlow from './implicit-flow';
import { AuthError, authErrors } from '../errors';
import { API_VERSION, CALLBACK_BLANK } from '../util/constants';
import {
	parseFormField,
	getAllUsersPermissions,
	getUsersPermissionsByName
} from './helpers';

const debug = createDebug('vk-io:auth:implicit-flow-user');

const { AUTHORIZATION_FAILED } = authErrors;

export default class ImplicitFlowUser extends ImplicitFlow {
	/**
	 * Returns permission page
	 *
	 * @return {Response}
	 */
	getPermissionsPage() {
		const { app } = this.vk.options;
		let { scope } = this.vk.options;

		if (scope === 'all' || scope === null) {
			scope = getAllUsersPermissions();
		} else if (typeof scope !== 'number') {
			scope = getUsersPermissionsByName(scope);
		}

		debug('auth scope %s', scope);

		const params = new URLSearchParams({
			redirect_uri: CALLBACK_BLANK,
			response_type: 'token',
			display: 'page',
			v: API_VERSION,
			client_id: app,
			revoke: 1,
			scope
		});

		const url = new URL(`https://oauth.vk.com/authorize?${params}`);

		return this.fetch(url, {
			method: 'GET'
		});
	}

	/**
	 * Starts authorization
	 *
	 * @return {Promise<Object>}
	 */
	async run() {
		const { response } = await super.run();

		const { hash } = new URL(response.url);
		const params = new URLSearchParams(hash.substring(1));

		if (params.has('error')) {
			throw new AuthError({
				message: `Failed passed grant access: ${params.get('error_description') || 'Unknown error'}`,
				code: AUTHORIZATION_FAILED
			});
		}

		const user = params.get('user_id');
		const expires = params.get('expires_in');

		return {
			email: params.get('email'),
			user: user || Number(user),

			token: params.get('access_token'),
			expires: expires || Number(expires)
		};
	}
}