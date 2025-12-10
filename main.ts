import { Modal, Notice, Plugin, TAbstractFile, TFile } from "obsidian";

interface ImagesOrganizer {
	folderName: string;
	hasOrganizedExisting: boolean;
}

const DEFAULT_SETTINGS: ImagesOrganizer = {
	folderName: "_images",
	hasOrganizedExisting: false,
};

export default class ImagesOrganizerPlugin extends Plugin {
	settings: ImagesOrganizer;

	async onload() {
		await this.loadSettings();

		if (!this.settings.hasOrganizedExisting) {
			const modal = new ConfirmModal(this.app);
			modal.onConfirm = async () => {
				await this.organizeExistingImages();
				this.settings.hasOrganizedExisting = true;
				await this.saveSettings();
			};
			modal.open();
			this.settings.hasOrganizedExisting = true;
			await this.saveSettings();
		}

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
		let count = 0;

		for (const file of files) {
			if (!this.isImage(file)) continue;
			if (file.parent?.path === this.settings.folderName) continue;

			await this.moveFileToImagesFolder(file);
			count++;
		}

		if (count > 0) {
			new Notice(`${count}개의 이미지를 정리했습니다.`);
		} else {
			new Notice("이미지가 없습니다.");
		}
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

class ConfirmModal extends Modal {
	onConfirm: () => void;

	onOpen() {
		this.modalEl.addClass("image-organizer-modal");
		const { contentEl } = this;
		contentEl.createEl("p", {
			text: "기존 이미지들을 _images 폴더로 정리하시겠습니까?",
		});

		const btnContainer = contentEl.createDiv({
			cls: "modal-button-container",
		});

		btnContainer
			.createEl("button", { text: "예", cls: "mod-cta" })
			.addEventListener("click", () => {
				this.close();
				this.onConfirm();
			});

		btnContainer
			.createEl("button", { text: "아니오" })
			.addEventListener("click", () => this.close());
	}

	onClose() {
		this.contentEl.empty();
	}
}
