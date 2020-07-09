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
const genData5D = require("../examples/gen-data-5d.json");

const processData = async (path, data, handlers, opts) => {
    const wb = await XlsxPopulate.fromFileAsync(path);
    const xlsxAccess = new XlsxPopulateAccess(wb, XlsxPopulate);
    const dataFill = new XlsxDataFill(xlsxAccess, _.merge({ callbacksMap: handlers }, opts));
    dataFill.fillData(data);

    return xlsxAccess;
};


describe("XlsxDataFill: ", () => {
    describe("Docs Template", () => {
        let xlsxAccess;

        beforeAll(async () => xlsxAccess = await processData("./examples/docs-template.xlsx", docsData));

        afterAll(async () => {
            xlsxAccess.workbook().toFileAsync("./examples/docs-output.xlsx");
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

    describe("Docs w/ Formula Template", () => {
        let xlsxAccess;

        beforeAll(async () => {
            xlsxAccess = await processData("./examples/formula-template.xlsx", docsData);
        });

        afterAll(async () => xlsxAccess.workbook().toFileAsync("./examples/formula-output.xlsx"));

        it("filled the title properly", () => {
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("A1"))).toBe(docsData.title);
        });

        it("filled headers properly", () => {
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("A2", "NoRef"))).toBe("Row 1");
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("A3", "NoRef"))).toBe("Row 2");
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("A4", "NoRef"))).toBe("Row 3");
        });

        it("filled the data properly", () => {
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("B2", "NoRef"))).toBe(11);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("C3", "NoRef"))).toBe(22);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("D4", "NoRef"))).toBe(33);
        });

        it("maintained the proper numeric style", () => {
            expect(xlsxAccess.cellType(xlsxAccess.getCell("B2", "NoRef"))).toBe('number');
            expect(xlsxAccess.cellType(xlsxAccess.getCell("C3", "NoRef"))).toBe('number');
            expect(xlsxAccess.cellType(xlsxAccess.getCell("D4", "NoRef"))).toBe('number');
        });

        it("didn't copy the formula", () => {
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("A7", "NoRef"))).not.toBe(docsData.title);
            expect(xlsxAccess.getCell("A7", "NoRef").formula()).toBe("A1");
        });
        
        it("expanded the formula properly", () => {
            expect(xlsxAccess.getCell("B8", "Ref").formula()).toBe('SUM(B2:F4)'); // 345
        });

        it("expanded and spread the formula properly", () => {
            expect(xlsxAccess.getCell("B7", "Ref").formula()).toBe('SUM(B2:B4)'); // 63;
            expect(xlsxAccess.getCell("C7", "Ref").formula()).toBe('SHARED'); // SUM(C2:C4) == 66;
            expect(xlsxAccess.getCell("F7", "Ref").formula()).toBe('SHARED'); // SUM(F2:F4) == 75;
        });

        it("expanded & spread the formula properly with external multiplication", () => {
            expect(xlsxAccess.getCell("B9", "Ref").formula()).toBe('SUM(B2:B4) * $A$6'); // 126;
            expect(xlsxAccess.getCell("C9", "Ref").formula()).toBe('SHARED'); // SUM(C2:C4) == 132;
            expect(xlsxAccess.getCell("F9", "Ref").formula()).toBe('SHARED'); // SUM(F2:F4) * $A$6 == 150;
        });

        it("it spread the formula properly", () => {
            expect(xlsxAccess.getCell("B10", "Ref").formula()).toBe('B2 * $A$6'); // 22;
            expect(xlsxAccess.getCell("C11", "Ref").formula()).toBe('SHARED'); // C3 * $A$6 == 44;
            expect(xlsxAccess.getCell("D12", "Ref").formula()).toBe('SHARED'); // D4 * $A$6 == 66;
        });
        
        it("it spread the formula on a nested reference properly", () => {
            expect(xlsxAccess.getCell("B7", "Split").formula()).toBe('SUM(B2:F2)'); // 65;
            expect(xlsxAccess.getCell("B9", "Split").formula()).toBe('SUM(B4:F4)'); // 165;
        });

        it("it spread the formula on a nested reference with anchored cell properly", () => {
            expect(xlsxAccess.getCell("C7", "Split").formula()).toBe('SUM(B2:F2) * $A$6'); // 130;
            expect(xlsxAccess.getCell("C9", "Split").formula()).toBe('SUM(B4:F4) * $A$6'); // 330
        });
    });

    describe("Simple Books Template", () => {
        let xlsxAccess;

        beforeAll(async () => {
            xlsxAccess = await processData("./examples/simple-template.xlsx", bookData);
        });

        afterAll(async () => xlsxAccess.workbook().toFileAsync("./examples/simple-output.xlsx"));

        it("filled the non-reference title properly", () => {
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("A1"))).toBe(bookData.library.name);
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

    describe("Cyclic Books Template", () => {
        let dataFill;

        beforeAll(async () => {
            const wb = await XlsxPopulate.fromFileAsync("./examples/cyclic-template.xlsx");
            const xlsxAccess = new XlsxPopulateAccess(wb, XlsxPopulate);

            dataFill = new XlsxDataFill(xlsxAccess);
        });

        it("will fail when scanning the template", async () => {
            expect(() => dataFill.fillData(bookData)).toThrow(
                new Error(`A reference cycle found, involving "'Sheet 1'!C3,'Sheet 1'!D3,'Sheet 1'!E3"!`)
            );
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

        afterAll(async () => xlsxAccess.workbook().toFileAsync("./examples/publishers-output.xlsx"));

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

    describe("Publishers Books No-Merge Template", () => {
        let xlsxAccess;

        beforeAll(async () => {
            xlsxAccess = await processData("./examples/publishers-template.xlsx", bookData, {
                matchEdition: pub => _.uniqBy(_.filter(bookData.books, book => book.edition == pub), book => book.author),
                matchAuthor: ref => _.filter(bookData.books, book => book.author == ref.author && book.edition == ref.edition)
            }, {
                mergeCells: false
            });
        });

        afterAll(async () => xlsxAccess.workbook().toFileAsync("./examples/publishers-output-unmerged.xlsx"));

        it("doesn't expand vertically", () => {
            expect(xlsxAccess.cellSize(xlsxAccess.getCell("A3"))).toEqual([1, 1]);
            expect(xlsxAccess.cellSize(xlsxAccess.getCell("A4"))).toEqual([1, 1]);
            expect(xlsxAccess.cellSize(xlsxAccess.getCell("A8"))).toEqual([1, 1]);
            expect(xlsxAccess.cellSize(xlsxAccess.getCell("A9"))).toEqual([1, 1]);
        });

        it("filled the non-reference iterative book titles", () => {
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("A3"))).toBe(bookData.publishers[0]);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("A8"))).toBe(bookData.publishers[1]);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("B3"))).toBe(bookData.books[0].author);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("B4"))).toBe(bookData.books[1].author);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("D4"))).toBe(bookData.books[1].title);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("E4"))).toBe(bookData.books[2].title);
        });

        it("not filled padding / inner-dimension cells", () => {
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("A4"))).toBeUndefined();
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("A9"))).toBeUndefined();
        });
    });

    describe("Publishers Books Duplicate Template", () => {
        let xlsxAccess;

        beforeAll(async () => {
            xlsxAccess = await processData("./examples/publishers-template.xlsx", bookData, {
                matchEdition: pub => _.uniqBy(_.filter(bookData.books, book => book.edition == pub), book => book.author),
                matchAuthor: ref => _.filter(bookData.books, book => book.author == ref.author && book.edition == ref.edition)
            }, {
                mergeCells: false,
                duplicateCells: true
            });
        });

        afterAll(async () => xlsxAccess.workbook().toFileAsync("./examples/publishers-output-duplicated.xlsx"));

        it("doesn't expand vertically", () => {
            expect(xlsxAccess.cellSize(xlsxAccess.getCell("A3"))).toEqual([1, 1]);
            expect(xlsxAccess.cellSize(xlsxAccess.getCell("A4"))).toEqual([1, 1]);
            expect(xlsxAccess.cellSize(xlsxAccess.getCell("A8"))).toEqual([1, 1]);
            expect(xlsxAccess.cellSize(xlsxAccess.getCell("A9"))).toEqual([1, 1]);
        });

        it("filled the non-reference iterative book titles", () => {
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("A3"))).toBe(bookData.publishers[0]);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("A8"))).toBe(bookData.publishers[1]);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("B3"))).toBe(bookData.books[0].author);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("B4"))).toBe(bookData.books[1].author);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("D4"))).toBe(bookData.books[1].title);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("E4"))).toBe(bookData.books[2].title);
        });

        it("filled padding / inner-dimension cells", () => {
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("A4"))).toBe(bookData.publishers[0]);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("A9"))).toBe(bookData.publishers[1]);
        });
    });

    describe("Books Books Template", () => {
        let xlsxAccess;

        beforeAll(async () => {
            xlsxAccess = await processData("./examples/books-template.xlsx", bookData, {
                editionInfo: book => `${book.edition}, \$${book.price}`
            });
        });

        afterAll(async () => xlsxAccess.workbook().toFileAsync("./examples/books-output.xlsx"));

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
                rowFormat: (stock, cell) => 5 // cell.row().style('fill', cell.rowNumber() % 2 == 0 ? "ffffff" : "eeeeee")
            }, {
                copyStyle: false
            });
        });

        afterAll(async () => xlsxAccess.workbook().toFileAsync("./examples/stock-output.xlsx"));

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

    describe("5D demo checks", () => {
        let xlsxAccess;

        beforeAll(async () => {
            xlsxAccess = await processData("./examples/multid-template.xlsx", genData5D);
        });

        afterAll(async () => xlsxAccess.workbook().toFileAsync("./examples/multid-output.xlsx"));

        it("Has the static value properly", () => {
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("A1", "5D"))).toBe('Dimension 1');
        });

        it("Has Dimension 2 properly labelled", () => {
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("A2", "5D"))).toBe('Dimension 2 - 1');
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("A27", "5D"))).toBe('Dimension 2 - 2');
            expect(xlsxAccess.cellSize(xlsxAccess.getCell("A2", "5D"))).toEqual([24, 1]);
            expect(xlsxAccess.cellSize(xlsxAccess.getCell("A27", "5D"))).toEqual([24, 1]);
        });

        it("Has Dimension 3 properly labelled", () => {
            expect(xlsxAccess.cellSize(xlsxAccess.getCell("C2", "5D"))).toEqual([1, 6]);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("C2", "5D"))).toBe('Dimension 3 - 1');
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("J2", "5D"))).toBe('Dimension 3 - 2');
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("Q27", "5D"))).toBe('Dimension 3 - 3');
            expect(xlsxAccess.cellSize(xlsxAccess.getCell("C2", "5D"))).toEqual([1, 6]);
            expect(xlsxAccess.cellSize(xlsxAccess.getCell("J2", "5D"))).toEqual([1, 6]);
            expect(xlsxAccess.cellSize(xlsxAccess.getCell("Q27", "5D"))).toEqual([1, 6]);
        });

        it("Has Dimension 4 properly labelled", () => {
            expect(xlsxAccess.cellSize(xlsxAccess.getCell("B3", "5D"))).toEqual([5, 1]);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("B3", "5D"))).toBe('Dimension 4 - 1');
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("B9", "5D"))).toBe('Dimension 4 - 2');
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("I15", "5D"))).toBe('Dimension 4 - 3');
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("P46", "5D"))).toBe('Dimension 4 - 4');
            expect(xlsxAccess.cellSize(xlsxAccess.getCell("B3", "5D"))).toEqual([5, 1]);
            expect(xlsxAccess.cellSize(xlsxAccess.getCell("B9", "5D"))).toEqual([5, 1]);
            expect(xlsxAccess.cellSize(xlsxAccess.getCell("I15", "5D"))).toEqual([5, 1]);
            expect(xlsxAccess.cellSize(xlsxAccess.getCell("P46", "5D"))).toEqual([5, 1]);
        });

        it("Has Dimension 5 properly populated", () => {
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("C3", "5D"))).toBe('1.1.1.1.1');
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("D3", "5D"))).toBe('1.1.1.1.2');
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("C4", "5D"))).toBe('1.1.1.2.1');
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("V3", "5D"))).toBe('1.3.1.1.6');
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("V50", "5D"))).toBe('2.3.4.5.6');
        });

        it("Has Dimension 3 & 4 in 4D reflect options", () => {
            expect(xlsxAccess.cellSize(xlsxAccess.getCell("A2", "4D-merges"))).toEqual([5, 1]);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("A2", "4D-merges"))).toBe('Dimension 3 - 1');
            expect(xlsxAccess.cellSize(xlsxAccess.getCell("B2", "4D-merges"))).toEqual([1, 1]);
            expect(xlsxAccess.cellValue(xlsxAccess.getCell("B2", "4D-merges"))).toBe('Dimension 4 - 1');
        });
    });
});
