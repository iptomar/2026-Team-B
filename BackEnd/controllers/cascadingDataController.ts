import { Controller, Get, Route, Tags, Response, Path } from 'tsoa';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

/**
 * Cascading (dependent) dropdown data.
 *
 * Serves the datasets used by the "Dependent Dropdowns" form field — e.g. a
 * bachelor → subjects hierarchy. The data lives in a JSON file on the server
 * (data/courses.json); edit that file and restart to change the options.
 */

export interface CascadingDatasetSummary {
	key: string;
	label: string;
	/** One label per level, e.g. ["Degree", "Programme", "Subject"]. */
	levelLabels: string[];
}

/** A node in the cascading tree. Leaf nodes omit `children`. */
export interface CascadingNode {
	value: string;
	children?: CascadingNode[];
}

export interface CascadingDataset extends CascadingDatasetSummary {
	items: CascadingNode[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.join(__dirname, '..', 'data', 'courses.json');

function normalizeNode(n: any): CascadingNode {
	const node: CascadingNode = { value: String(n?.value ?? '') };
	if (Array.isArray(n?.children) && n.children.length > 0) {
		node.children = n.children.map(normalizeNode);
	}
	return node;
}

function loadDatasets(): Record<string, CascadingDataset> {
	try {
		const raw = fs.readFileSync(DATA_PATH, 'utf-8');
		const parsed = JSON.parse(raw);
		const result: Record<string, CascadingDataset> = {};
		for (const [key, ds] of Object.entries<any>(parsed)) {
			result[key] = {
				key,
				label: ds.label ?? key,
				levelLabels: Array.isArray(ds.levelLabels) ? ds.levelLabels.map(String) : [],
				items: Array.isArray(ds.items) ? ds.items.map(normalizeNode) : [],
			};
		}
		return result;
	} catch {
		return {};
	}
}

@Route('cascadingData')
@Tags('CascadingData')
export class CascadingDataController extends Controller {

	/**
	 * List the available datasets (without their items) so the form builder
	 * can offer them as a data source.
	 */
	@Get()
	public async listDatasets(): Promise<CascadingDatasetSummary[]> {
		const datasets = loadDatasets();
		return Object.values(datasets).map(({ key, label, levelLabels }) => ({
			key, label, levelLabels,
		}));
	}

	/**
	 * Get a single dataset (including its parent → children items) by key.
	 */
	@Get('{key}')
	@Response('404', 'Dataset not found')
	public async getDataset(@Path() key: string): Promise<CascadingDataset | { message: string; }> {
		const datasets = loadDatasets();
		const ds = datasets[key];
		if (!ds) {
			this.setStatus(404);
			return { message: 'Dataset not found' };
		}
		return ds;
	}
}
