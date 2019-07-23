/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as vscode from 'vscode';
import * as azdata from 'azdata';
import { NotebookInfo } from '../interfaces';
import { isString } from 'util';
import * as path from 'path';
import * as nls from 'vscode-nls';
import { IPlatformService } from './platformService';
const localize = nls.loadMessageBundle();

export interface INotebookService {
	launchNotebook(notebook: string | NotebookInfo): void;
}

export class NotebookService implements INotebookService {

	constructor(private platformService: IPlatformService) { }

	/**
	 * Copy the notebook to the user's home directory and launch the notebook from there.
	 * @param notebook the path of the notebook
	 */
	launchNotebook(notebook: string | NotebookInfo): void {
		const notebookRelativePath = this.getNotebook(notebook);
		const notebookFullPath = path.join(__dirname, '../../', notebookRelativePath);
		if (notebookRelativePath && this.platformService.fileExists(notebookFullPath)) {
			this.showNotebookAsUntitled(notebookFullPath);
		}
		else {
			this.platformService.showErrorMessage(localize('resourceDeployment.notebookNotFound', 'The notebook {0} does not exist', notebookFullPath));
		}
	}

	/**
	 * get the notebook path for current platform
	 * @param notebook the notebook path
	 */
	getNotebook(notebook: string | NotebookInfo): string {
		let notebookPath;
		if (notebook && !isString(notebook)) {
			const platform = this.platformService.platform();
			if (platform === 'win32') {
				notebookPath = notebook.win32;
			} else if (platform === 'darwin') {
				notebookPath = notebook.darwin;
			} else {
				notebookPath = notebook.linux;
			}
		} else {
			notebookPath = notebook;
		}
		return notebookPath;
	}

	findNextUntitledEditorName(filePath: string): string {
		const fileExtension = path.extname(filePath);
		const baseName = path.basename(filePath, fileExtension);
		let idx = 0;
		let title = `${baseName}`;
		do {
			const suffix = idx === 0 ? '' : `-${idx}`;
			title = `${baseName}${suffix}`;
			idx++;
		} while (this.platformService.isNotebookNameUsed(title));

		return title;
	}

	showNotebookAsUntitled(notebookPath: string): void {
		let targetFileName: string = this.findNextUntitledEditorName(notebookPath);
		const untitledFileName: vscode.Uri = vscode.Uri.parse(`untitled:${targetFileName}`);
		vscode.workspace.openTextDocument(notebookPath).then((document) => {
			let initialContent = document.getText();
			azdata.nb.showNotebookDocument(untitledFileName, {
				connectionProfile: undefined,
				preview: false,
				initialContent: initialContent,
				initialDirtyState: false
			});
		});
	}
}