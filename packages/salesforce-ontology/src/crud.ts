import type { SalesforceCrudOperation } from "./utils/ids.js";

export interface SalesforceCrudActionTypeSelection {
    objectType: string;
    operations: readonly SalesforceCrudOperation[];
}
