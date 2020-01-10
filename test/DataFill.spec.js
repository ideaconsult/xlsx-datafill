/* eslint-disable no-sync */
"use strict";

const _ = require('lodash');
const XlsxPopulate = require('xlsx-populate');
const XlsxDataFill = require('../');
const XlsxPopulateAccess = XlsxDataFill.XlsxPopulateAccess;

// Load the data helpers!
const fs = require("fs");
const bookData = JSON.parse(fs.readFileSync("./examples/book-data.json"));

const loadData = async (path, handlers) => {
    const wb = await XlsxPopulate.fromFileAsync(path);
    const xlsxAccess = new XlsxPopulateAccess(wb, XlsxPopulate);
    const dataFill = new XlsxDataFill(xlsxAccess, { callbacksMap: handlers });
    dataFill.fillData(bookData);
    return xlsxAccess;
};


describe("XlsxDataFill: ", () => {
    describe("Simple Books Template", () => {
        let xlsxAccess;

        beforeAll(async () => {
            xlsxAccess = await loadData("./examples/simple-template.xlsx");
        });

        afterAll(async () => {
            await xlsxAccess.workbook().toFileAsync("./examples/simple-output.xlsx");
        });

        it("filled the non-reference title properly", () => {
            expect(xlsxAccess.cellTextValue(xlsxAccess.getCell("A1"))).toBe(bookData.library);
        });

        it("kept the static titles", () => {
            expect(xlsxAccess.cellTextValue(xlsxAccess.getCell("B2"))).toBe("Book Author");
        });

        it("filled the non-reference iterative book titles", () => {
            expect(xlsxAccess.cellTextValue(xlsxAccess.getCell("A3"))).toBe(bookData.books[0].title);
            expect(xlsxAccess.cellTextValue(xlsxAccess.getCell("B4"))).toBe(bookData.books[1].author);
            expect(xlsxAccess.cellTextValue(xlsxAccess.getCell("C5"))).toBe(bookData.books[2].year_written);
            expect(xlsxAccess.cellTextValue(xlsxAccess.getCell("A16"))).toBe(bookData.books[13].title);
            expect(xlsxAccess.cellTextValue(xlsxAccess.getCell("B16"))).toBe(bookData.books[13].author);
            expect(xlsxAccess.cellTextValue(xlsxAccess.getCell("C16"))).toBe(bookData.books[13].year_written);
        });
    });

    describe("Publishers Books Template", () => {
        let xlsxAccess;

        beforeAll(async () => {
            xlsxAccess = await loadData("./examples/publishers-template.xlsx", {
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
            expect(xlsxAccess.cellTextValue(xlsxAccess.getCell("A3"))).toBe(bookData.publishers[0]);
            expect(xlsxAccess.cellTextValue(xlsxAccess.getCell("A8"))).toBe(bookData.publishers[1]);
            expect(xlsxAccess.cellTextValue(xlsxAccess.getCell("B3"))).toBe(bookData.books[0].author);
            expect(xlsxAccess.cellTextValue(xlsxAccess.getCell("B4"))).toBe(bookData.books[1].author);
            expect(xlsxAccess.cellTextValue(xlsxAccess.getCell("D4"))).toBe(bookData.books[1].title);
            expect(xlsxAccess.cellTextValue(xlsxAccess.getCell("E4"))).toBe(bookData.books[2].title);
        });
    });

    describe("Books Books Template", () => {
        let xlsxAccess;

        beforeAll(async () => {
            xlsxAccess = await loadData("./examples/books-template.xlsx", {
                editionInfo: book => `${book.edition}, \$${book.price}`
            });
        });

        afterAll(async () => {
            await xlsxAccess.workbook().toFileAsync("./examples/books-output.xlsx");
        });

        it("expands padding horizontally", () => {
            expect(xlsxAccess.cellTextValue(xlsxAccess.getCell("D3"))).toBeUndefined();
            expect(xlsxAccess.cellTextValue(xlsxAccess.getCell("F3"))).toBeUndefined();
        });

        it("filled the non-reference iterative book titles", () => {
            expect(xlsxAccess.cellTextValue(xlsxAccess.getCell("C2"))).toBe(bookData.books[0].title);
            expect(xlsxAccess.cellTextValue(xlsxAccess.getCell("C3"))).toBe(bookData.books[0].author);
            expect(xlsxAccess.cellTextValue(xlsxAccess.getCell("C5"))).toBe(`${bookData.books[0].edition}, \$${bookData.books[0].price}`);
            expect(xlsxAccess.cellTextValue(xlsxAccess.getCell("E2"))).toBe(bookData.books[1].title);
            expect(xlsxAccess.cellTextValue(xlsxAccess.getCell("E3"))).toBe(bookData.books[1].author);
            expect(xlsxAccess.cellTextValue(xlsxAccess.getCell("AE2"))).toBe(bookData.books[14].title);
            expect(xlsxAccess.cellTextValue(xlsxAccess.getCell("AE3"))).toBe(bookData.books[14].author);
            expect(xlsxAccess.cellTextValue(xlsxAccess.getCell("AE5"))).toBe(`${bookData.books[14].edition}, \$${bookData.books[14].price}`);
        });
    });
});
