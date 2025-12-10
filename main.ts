import { Notice, Plugin, TAbstractFile, TFile } from "obsidian";

interface ImagesOrganizer {
	folderName: string;
}

const DEFAULT_SETTINGS: ImagesOrganizer = {
	folderName: "_images",
};

export default class ImagesOrganizerPlugin extends Plugin {
	settings: ImagesOrganizer;

	async onload() {
		await this.loadSettings();

		this.organizeExistingImages();

		this.registerEvent(
			this.app.vault.on("create", (file) => {
				this.handleFileCreate(file);
			})
		);
	}

	isImage(file: TFile) {
		const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|gif|webp)$/i;
		return IMAGE_EXTENSIONS.test(file.name);
	}

	async organizeExistingImages() {
		const files = this.app.vault.getFiles();

		for (const file of files) {
			if (!this.isImage(file)) continue;

			await this.moveFileToImagesFolder(file);
		}
		new Notice("Existing images organized");
	}

	async handleFileCreate(file: TAbstractFile) {
		if (!(file instanceof TFile)) return;
		if (!this.isImage(file)) return;

		await this.moveFileToImagesFolder(file);
	}

	generateUniqueFileName(folder: string, fileName: string) {
		const index = fileName.lastIndexOf(".");
		const baseName = fileName.substring(0, index);
		const extension = fileName.substring(index);

		let updatedFileName = fileName;
		let counter = 1;

		while (
			this.app.vault.getAbstractFileByPath(`${folder}/${updatedFileName}`)
		) {
			updatedFileName = `${baseName}-${counter}${extension}`;
			counter++;
		}
		return `${folder}/${updatedFileName}`;
	}

	async moveFileToImagesFolder(file: TFile) {
		const folder = this.settings.folderName;
		if (!folder) return;
		if (file.parent?.path === folder) return;

		await this.app.vault.createFolder(folder).catch(() => {});

		const newPath = this.generateUniqueFileName(folder, file.name);

		await this.app.fileManager.renameFile(file, newPath);
		new Notice(`Image moved to ${newPath}`);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
