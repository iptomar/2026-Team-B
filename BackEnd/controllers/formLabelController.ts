import { Controller, Post, Get, Delete, Path, Route, Body, Tags, Response } from 'tsoa';
// @ts-ignore
import FormLabel from '../models/FormLabel.js';

export interface FormLabelCreationParams {
	name: string;
	color?: string;
}

export interface FormLabelResponse {
	_id: string;
	name: string;
	color: string;
}

@Route('labels')
@Tags('Labels')
export class FormLabelController extends Controller {

	/**
	 * Retrieve all labels.
	 */
	@Get()
	@Response('500', 'Internal Server Error')
	public async getLabels(): Promise<FormLabelResponse[] | { message: string }> {
		try {
			const labels = await FormLabel.find().sort({ name: 1 });
			return labels as unknown as FormLabelResponse[];
		} catch (error: any) {
			this.setStatus(500);
			return { message: error.message };
		}
	}

	/**
	 * Create a new label.
	 */
	@Post()
	@Response('400', 'Missing required parameters or label already exists')
	@Response('500', 'Internal Server Error')
	public async createLabel(@Body() requestBody: FormLabelCreationParams): Promise<FormLabelResponse | { message: string }> {
		const { name, color } = requestBody;

		if (!name) {
			this.setStatus(400);
			return { message: 'Label name is required.' };
		}

		try {
			const existing = await FormLabel.findOne({ name });
			if (existing) {
				this.setStatus(400);
				return { message: 'Label with this name already exists.' };
			}

			const label = new FormLabel({
				name,
				color: color || '#3B82F6',
			});

			await label.save();
			return label as unknown as FormLabelResponse;
		} catch (error: any) {
			this.setStatus(500);
			return { message: error.message };
		}
	}

	/**
	 * Delete a label.
	 */
	@Delete('{id}')
	@Response('404', 'Label not found')
	@Response('500', 'Internal Server Error')
	public async deleteLabel(@Path() id: string): Promise<{ message: string }> {
		try {
			const label = await FormLabel.findByIdAndDelete(id);
			if (!label) {
				this.setStatus(404);
				return { message: 'Label not found' };
			}
			return { message: 'Label deleted successfully' };
		} catch (error: any) {
			this.setStatus(500);
			return { message: error.message };
		}
	}
}
