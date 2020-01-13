/* eslint-disable quote-props */
/* eslint-disable no-sync */
"use strict";

const _ = require('lodash');
const XlsxPopulate = require('xlsx-populate');
const XlsxDataFill = require('../');
const XlsxPopulateAccess = XlsxDataFill.XlsxPopulateAccess;

// Load the data helpers!
const docsData = require("../examples/docs-data.json");
const bookData = require("../examples/book-data.json");
const stockData = require("../examples/stock-data.json");

const processData = async (path, data, handlers) => {
    const wb = await XlsxPopulate.fromFileAsync(path);
    const xlsxAccess = new XlsxPopulateAccess(wb, XlsxPopulate);
    const dataFill = new XlsxDataFill(xlsxAccess, { callbacksMap: handlers });
    dataFill.fillData(data);
    return xlsxAccess;
};


describe("XlsxDataFill: ", () => {
    describe("Docs Template", () => {
        let xlsxAccess;

        beforeAll(async () => {
            xlsxAccess = await processData("./examples/docs-template.xlsx", docsData);
        });

        afterAll(async () => {
            await xlsxAccess.workbook().toFileAsync("./examples/docs-output.xlsx");
        });

        it("filled the title properly", () => {
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("A1"))).toBe(docsData.title);
        });

        it("filled non-reference sheet headers properly", () => {
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("A2", "NoRef"))).toBe("Row 1");
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("A3", "NoRef"))).toBe("Row 2");
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("A4", "NoRef"))).toBe("Row 3");
        });

        it("filled referenced sheet headers properly", () => {
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("A2", "Ref"))).toBe("Row 1");
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("A3", "Ref"))).toBe("Row 2");
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("A4", "Ref"))).toBe("Row 3");
        });

        it("filled the non-reference data properly", () => {
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("B2", "NoRef"))).toBe(11);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("C3", "NoRef"))).toBe(22);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("D4", "NoRef"))).toBe(33);
        });

        it("filled the reference data properly", () => {
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("B2", "Ref"))).toBe(11);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("C3", "Ref"))).toBe(22);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("D4", "Ref"))).toBe(33);
        });

        it("expanded the stretched master cells", () => {
            expect(xlsxAccess.cellSize(xlsxAccess.getCell("A2", "Stretched"))).toEqual([5, 1]);
            expect(xlsxAccess.cellSize(xlsxAccess.getCell("A7", "Stretched"))).toEqual([5, 1]);
            expect(xlsxAccess.cellSize(xlsxAccess.getCell("A12", "Stretched"))).toEqual([5, 1]);
        });

        it("filled the stretched data properly", () => {
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("B2", "Stretched"))).toBe(11);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("B8", "Stretched"))).toBe(22);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("B14", "Stretched"))).toBe(33);
        });
    });

    describe("Simple Books Template", () => {
        let xlsxAccess;

        beforeAll(async () => {
            xlsxAccess = await processData("./examples/simple-template.xlsx", bookData);
        });

        afterAll(async () => {
            await xlsxAccess.workbook().toFileAsync("./examples/simple-output.xlsx");
        });

        it("filled the non-reference title properly", () => {
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("A1"))).toBe(bookData.library);
        });

        it("kept the static titles", () => {
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("B2"))).toBe("Book Author");
        });

        it("filled the non-reference iterative book titles", () => {
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("A3"))).toBe(bookData.books[0].title);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("B4"))).toBe(bookData.books[1].author);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("C5"))).toBe(bookData.books[2].year_written);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("A16"))).toBe(bookData.books[13].title);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("B16"))).toBe(bookData.books[13].author);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("C16"))).toBe(bookData.books[13].year_written);
        });
    });

    describe("Publishers Books Template", () => {
        let xlsxAccess;

        beforeAll(async () => {
            xlsxAccess = await processData("./examples/publishers-template.xlsx", bookData, {
                matchEdition: pub => _.uniqBy(_.filter(bookData.books, book => book.edition == pub), book => book.author),
                matchAuthor: ref => _.filter(bookData.books, book => book.author == ref.author && book.edition == ref.edition)
            });
        });

        afterAll(async () => {
            await xlsxAccess.workbook().toFileAsync("./examples/publishers-output.xlsx");
        });

        it("expands vertically", () => {
            expect(xlsxAccess.cellSize(xlsxAccess.getCell("A3"))).toEqual([5, 1]);
            expect(xlsxAccess.cellSize(xlsxAccess.getCell("A8"))).toEqual([3, 1]);
            expect(xlsxAccess.cellSize(xlsxAccess.getCell("A11"))).toEqual([3, 1]);
            expect(xlsxAccess.cellSize(xlsxAccess.getCell("A14"))).toEqual([1, 1]);
        });

        it("filled the non-reference iterative book titles", () => {
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("A3"))).toBe(bookData.publishers[0]);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("A8"))).toBe(bookData.publishers[1]);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("B3"))).toBe(bookData.books[0].author);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("B4"))).toBe(bookData.books[1].author);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("D4"))).toBe(bookData.books[1].title);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("E4"))).toBe(bookData.books[2].title);
        });
    });

    describe("Books Books Template", () => {
        let xlsxAccess;

        beforeAll(async () => {
            xlsxAccess = await processData("./examples/books-template.xlsx", bookData, {
                editionInfo: book => `${book.edition}, \$${book.price}`
            });
        });

        afterAll(async () => {
            await xlsxAccess.workbook().toFileAsync("./examples/books-output.xlsx");
        });

        it("expands padding horizontally", () => {
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("D3"))).toBeUndefined();
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("F3"))).toBeUndefined();
        });

        it("filled the non-reference iterative book titles", () => {
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("C2"))).toBe(bookData.books[0].title);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("C3"))).toBe(bookData.books[0].author);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("C5"))).toBe(`${bookData.books[0].edition}, \$${bookData.books[0].price}`);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("E2"))).toBe(bookData.books[1].title);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("E3"))).toBe(bookData.books[1].author);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("AE2"))).toBe(bookData.books[14].title);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("AE3"))).toBe(bookData.books[14].author);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("AE5"))).toBe(`${bookData.books[14].edition}, \$${bookData.books[14].price}`);
        });
    });

    describe("Stocks Template", () => {
        let xlsxAccess;

        beforeAll(async () => {
            xlsxAccess = await processData("./examples/stock-template.xlsx", stockData, {
                rowFormat: (stock, cell) => cell.row().style('fill', cell.rowNumber() % 2 == 0 ? "ffffff" : "eeeeee")
            });
        });

        afterAll(async () => {
            await xlsxAccess.workbook().toFileAsync("./examples/stock-output.xlsx");
        });

        it("fills the title (year) row properly", () => {
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("B1", "Nested"))).toBe("2000");
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("B1", "Raw"))).toBe("2000");
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("U1", "Nested"))).toBe("2019");
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("U1", "Raw"))).toBe("2019");
        });

        it("fills the company column properly", () => {
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("A2", "Nested"))).toBe("Amazon");
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("A2", "Raw"))).toBe("Amazon");
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("A4", "Nested"))).toBe("Apple");
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("A4", "Raw"))).toBe("Apple");
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("A38", "Nested"))).toBe("adidas");
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("A38", "Raw"))).toBe("adidas");
        });

        it("filled the nested template values properly", () => {
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("B2", "Nested"))).toBe(4528);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("B4", "Nested"))).toBe(6594);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("U4", "Nested"))).toBe(234241);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("B38", "Nested"))).toBe(3791);
        });

        it("filled the raw template values properly", () => {
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("B2", "Raw"))).toBe(4528);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("B4", "Raw"))).toBe(6594);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("U4", "Raw"))).toBe(234241);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("B38", "Raw"))).toBe(3791);
        });

        it("makes the styling properly", () => {
            // expect(xlsxAccess.getCell("A3", "Raw").style("fill").color).toEqual({ rgb: "EEEEEE" });
            // expect(xlsxAccess.getCell("A3", "Nested").style("fill").color).toEqual({ rgb: "EEEEEE" });
            // expect(xlsxAccess.getCell("B3", "Raw").style("fill").color).toEqual({ rgb: "EEEEEE" });
            // expect(xlsxAccess.getCell("B3", "Nested").style("fill").color).toEqual({ rgb: "EEEEEE" });
            // expect(xlsxAccess.getCell("A5", "Raw").style("fill").color).toEqual({ rgb: "EEEEEE" });
            // expect(xlsxAccess.getCell("A5", "Nested").style("fill").color).toEqual({ rgb: "EEEEEE" });
        });
    });
});
