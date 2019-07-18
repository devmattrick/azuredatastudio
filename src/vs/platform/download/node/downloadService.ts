/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IDownloadService } from 'vs/platform/download/common/download';
import { URI } from 'vs/base/common/uri';
import { Schemas } from 'vs/base/common/network';
import { copy } from 'vs/base/node/pfs';
import { IRequestService, asText } from 'vs/platform/request/common/request';
import { CancellationToken } from 'vs/base/common/cancellation';
import { join } from 'vs/base/common/path';
import { tmpdir } from 'os';
import { generateUuid } from 'vs/base/common/uuid';
import { IFileService } from 'vs/platform/files/common/files';

export class DownloadService implements IDownloadService {

	_serviceBrand: any;

	constructor(
		@IRequestService private readonly requestService: IRequestService,
		@IFileService private readonly fileService: IFileService
	) { }

	download(uri: URI, target: string = join(tmpdir(), generateUuid()), cancellationToken: CancellationToken = CancellationToken.None): Promise<string> {
		if (uri.scheme === Schemas.file) {
			return copy(uri.fsPath, target).then(() => target);
		}
		const options = { type: 'GET', url: uri.toString() };
		return this.requestService.request(options, cancellationToken)
			.then(context => {
				if (context.res.statusCode === 200) {
					return this.fileService.writeFile(URI.file(target), context.stream).then(() => target);
				}
				return asText(context)
					.then(message => Promise.reject(new Error(`Expected 200, got back ${context.res.statusCode} instead.\n\n${message}`)));
			});
	}
}
