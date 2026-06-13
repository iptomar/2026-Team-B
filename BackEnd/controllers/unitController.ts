import { Controller, Get, Post, Put, Delete, Route, Body, Path, Tags, Response } from 'tsoa';
// @ts-ignore
import Unit from '../models/Unit.js';

export interface UnitCreationParams {
	name: string;
	description?: string;
	translations?: Record<string, string>;
}

export interface UnitResponse {
	_id: string;
	name: string;
	description: string;
	translations?: Record<string, string>;
}

@Route('units')
@Tags('Units')
export class UnitController extends Controller {

	@Get()
	public async getUnits(): Promise<UnitResponse[]> {
		const units = await Unit.find({ softDelete: false });
		return units as unknown as UnitResponse[];
	}

	@Get('{id}')
	@Response('404', 'Unit not found')
	public async getUnit(@Path() id: string): Promise<UnitResponse | { message: string; }> {
		const unit = await Unit.findById(id);
		if (!unit || unit.softDelete) {
			this.setStatus(404);
			return { message: 'Unit not found' };
		}
		return unit as unknown as UnitResponse;
	}

	@Post()
	@Response('400', 'Name is required')
	@Response('409', 'Unit already exists')
	public async createUnit(
		@Body() requestBody: UnitCreationParams
	): Promise<UnitResponse | { message: string; }> {
		const { name, description, translations } = requestBody;

		if (!name) {
			this.setStatus(400);
			return { message: 'Name is required' };
		}

		const existingUnit = await Unit.findOne({ name });
		if (existingUnit) {
			if (existingUnit.softDelete) {
				existingUnit.softDelete = false;
				existingUnit.description = description || existingUnit.description;
				await existingUnit.save();
				return existingUnit as unknown as UnitResponse;
			}
			this.setStatus(409);
			return { message: 'Unit already exists' };
		}

		const unit = new Unit({ name, description, translations });
		await unit.save();
		return unit as unknown as UnitResponse;
	}

	@Put('{id}')
	@Response('404', 'Unit not found')
	public async updateUnit(
		@Path() id: string,
		@Body() requestBody: UnitCreationParams
	): Promise<UnitResponse | { message: string; }> {
		const { name, description, translations } = requestBody;

		const unit = await Unit.findById(id);
		if (!unit || unit.softDelete) {
			this.setStatus(404);
			return { message: 'Unit not found' };
		}

		if (name) {
			// Check if name is taken by another unit
			const existingUnit = await Unit.findOne({ name });
			if (existingUnit && existingUnit._id.toString() !== id) {
				this.setStatus(409);
				return { message: 'Another unit with this name already exists' };
			}
			unit.name = name;
		}
		
		if (description !== undefined) {
			unit.description = description;
		}

		if (translations) {
			unit.translations = translations;
		}

		await unit.save();
		return unit as unknown as UnitResponse;
	}

	@Delete('{id}')
	@Response('404', 'Unit not found')
	public async deleteUnit(@Path() id: string): Promise<{ message: string; }> {
		const unit = await Unit.findById(id);
		if (!unit || unit.softDelete) {
			this.setStatus(404);
			return { message: 'Unit not found' };
		}

		unit.softDelete = true;
		await unit.save();
		return { message: 'Unit successfully deleted' };
	}
}
