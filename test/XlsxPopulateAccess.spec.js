"use strict";

const XlsxPopulate = require('xlsx-populate');
const XlsxPopulateAccess = require('../').XlsxPopulateAccess;

describe("XlsxPopulateAccess", () => {
    let xlsxAccess;

    beforeAll(async () => {
        const wb = await XlsxPopulate.fromFileAsync("./examples/simple-template.xlsx");
        xlsxAccess = new XlsxPopulateAccess(wb, XlsxPopulate);
    });

    it("reads workbook's cells", () => {
        expect(xlsxAccess.cellTextValue(xlsxAccess.getCell("A1"))).toBe("{{ | | library }}");
        expect(xlsxAccess.cellTextValue(xlsxAccess.getCell("A2"))).toBe("Book Title");
        expect(xlsxAccess.cellTextValue(xlsxAccess.getCell("B3"))).toBe("{{ A3 | | author }}");
    });

    it("calculates distance between cells.", () => {
        expect(xlsxAccess.cellDistance(xlsxAccess.getCell("A1"), xlsxAccess.getCell("B3"))).toEqual([2, 1]);
        expect(xlsxAccess.cellDistance(xlsxAccess.getCell("A2"), xlsxAccess.getCell("B2"))).toEqual([0, 1]);
        expect(xlsxAccess.cellDistance(xlsxAccess.getCell("A1"), xlsxAccess.getCell("A3"))).toEqual([2, 0]);
    });

    it("calculates cell's size", () => {
        expect(xlsxAccess.cellSize(xlsxAccess.getCell("A1"))).toEqual([1, 7]);
    });

    it("enumerates all used cells", () => {
        let cnt = 0;
        xlsxAccess.forAllCells(() => ++cnt);
        expect(cnt).toBe(161);
    });

    it("copies a style of a cell", () => {
        const dstCell = xlsxAccess.getCell("B3");
        xlsxAccess.copyStyle(dstCell, xlsxAccess.getCell("A3"));
        expect(dstCell.style("fill")).toEqual({ type: "solid", color: { rgb: "FF00FF" } });
    });

    it("properly sets value", () => {
        const cell = xlsxAccess.getCell("A4"),
            theValue = "This is a test value!";
        xlsxAccess.setValue(cell, theValue);
        expect(xlsxAccess.cellTextValue(cell)).toBe(theValue);
    });
});
