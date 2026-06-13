import { Controller, Get, Post, Put, Delete, Route, Body, Path, Tags, Response } from 'tsoa';
// @ts-ignore
import Unit from '../models/Unit.js';

// Interface for creating/updating a unit

export interface UnitCreationParams {
	name: string;// Display name of the unit (e.g., "kg", "meters", "pieces")
	description?: string; // Optional description of the unit
	translations?: Record<string, string>;// Optional translations for multi-language support (e.g., { "pt": "quilogramas" })
}
// Interface for unit API responses


export interface UnitResponse {
	_id: string;
	name: string;
	description: string;
	translations?: Record<string, string>;
}

@Route('units')
@Tags('Units')
export class UnitController extends Controller {
/**
	 * Get all non-deleted units.
	 * Returns a list of all units that haven't been soft-deleted.
	 * 
	 * Use case: Populate dropdown menus for form fields where users select units of measurement.
	 */
	@Get()
	public async getUnits(): Promise<UnitResponse[]> {
				// Find all units that are not soft-deleted

		const units = await Unit.find({ softDelete: false });
		return units as unknown as UnitResponse[];
	}
/**
	 * Get a single unit by its ID.
	 * @param id - The unit ID to retrieve
	 * @returns The unit object or a 404 error if not found
	 */
	@Get('{id}')
	@Response('404', 'Unit not found')
	public async getUnit(@Path() id: string): Promise<UnitResponse | { message: string; }> {
		const unit = await Unit.findById(id);
				// Check if unit exists and is not soft-deleted

		if (!unit || unit.softDelete) {
			this.setStatus(404);
			return { message: 'Unit not found' };
		}
		return unit as unknown as UnitResponse;
	}
/**
	 * Create a new unit or restore a soft-deleted one.
	 * 
	 * If a unit with the same name exists but is soft-deleted, it will be restored
	 * rather than creating a duplicate.
	 * 
	 * @param requestBody - Unit creation parameters
	 * @returns The created/restored unit or an error message
	 */
	@Post()
	@Response('400', 'Name is required')
	@Response('409', 'Unit already exists')
	public async createUnit(
		@Body() requestBody: UnitCreationParams
	): Promise<UnitResponse | { message: string; }> {
		const { name, description, translations } = requestBody;

		// Validate required field

		if (!name) {
			this.setStatus(400);
			return { message: 'Name is required' };
		}
		// Check if a unit with this name already exists

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
/**
	 * Update an existing unit.
	 * @param id - The unit ID to update
	 * @param requestBody - Updated unit data
	 * @returns The updated unit or an error message
	 */
	@Put('{id}')
	@Response('404', 'Unit not found')
	public async updateUnit(
		@Path() id: string,
		@Body() requestBody: UnitCreationParams
	): Promise<UnitResponse | { message: string; }> {
		const { name, description, translations } = requestBody;
		// Find the unit to update

		const unit = await Unit.findById(id);
		if (!unit || unit.softDelete) {
			this.setStatus(404);
			return { message: 'Unit not found' };
		}
		// Update name if provided

		if (name) {
			// Check if name is taken by another unit
			const existingUnit = await Unit.findOne({ name });
			if (existingUnit && existingUnit._id.toString() !== id) {
				this.setStatus(409);
				return { message: 'Another unit with this name already exists' };
			}
			unit.name = name;
		}
				// Update description if provided (allows setting empty string)

		if (description !== undefined) {
			unit.description = description;
		}
		// Update translations if provided

		if (translations) {
			unit.translations = translations;
		}

		await unit.save();
		return unit as unknown as UnitResponse;
	}

	/**
	 * Soft-delete a unit.
	 * The unit is not permanently removed from the database but marked as deleted.
	 * This preserves referential integrity for existing form submissions that use this unit.
	 * 
	 * @param id - The unit ID to delete
	 * @returns Success message or 404 if not found
	 */
	@Delete('{id}')
	@Response('404', 'Unit not found')
	public async deleteUnit(@Path() id: string): Promise<{ message: string; }> {
		const unit = await Unit.findById(id);
		if (!unit || unit.softDelete) {
			this.setStatus(404);
			return { message: 'Unit not found' };
		}
		// Soft delete: mark as deleted but keep in database

		unit.softDelete = true;
		await unit.save();
		return { message: 'Unit successfully deleted' };
	}
}
