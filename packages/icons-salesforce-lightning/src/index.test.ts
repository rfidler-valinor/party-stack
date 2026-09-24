import { describe, expect, it } from "vitest";
import {
    fromSalesforceLightningIconName,
    getSalesforceActionIconName,
    getSalesforceObjectIconName,
    SalesforceLightningIconNames,
    toSalesforceLightningIconName,
} from "./index.js";

describe("Salesforce Lightning icon mappings", () => {
    it("maps universal names to Lightning utility icons", () => {
        expect(SalesforceLightningIconNames.airplane).toBe("utility/plane");
        expect(fromSalesforceLightningIconName("utility/plane")).toMatchObject({
            name: "airplane",
            meta: { salesforce: { name: "utility/plane" } },
        });
    });

    it("preserves unknown provider icons for round trips", () => {
        const icon = fromSalesforceLightningIconName("standard/vendor_object");
        expect(icon).toEqual({
            name: undefined,
            meta: { salesforce: { name: "standard/vendor_object" } },
        });
        expect(toSalesforceLightningIconName(icon)).toBe("standard/vendor_object");
    });

    it("derives conventional standard object and action names", () => {
        expect(getSalesforceObjectIconName("Account")).toBe("standard/account");
        expect(getSalesforceObjectIconName("Invoice__c", true)).toBeUndefined();
        expect(getSalesforceActionIconName("CreateRecord")).toBe("action/create_record");
    });
});
