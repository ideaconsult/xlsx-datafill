"use strict";

const _ = require('lodash');

// const allStyles = [
//     "bold", 
//     "italic", 
//     "underline", 
//     "strikethrough", 
//     "subscript", 
//     "superscript", 
//     "fontSize", 
//     "fontFamily", 
//     "fontGenericFamily", 
//     "fontScheme", 
//     "fontColor", 
//     "horizontalAlignment", 
//     "justifyLastLine", 
//     "indent", 
//     "verticalAlignment", 
//     "wrapText", 
//     "shrinkToFit", 
//     "textDirection", 
//     "textRotation", 
//     "angleTextCounterclockwise", 
//     "angleTextClockwise", 
//     "rotateTextUp", 
//     "rotateTextDown", 
//     "verticalText", 
//     "fill", 
//     "border", 
//     "borderColor", 
//     "borderStyle", 
//     "leftBorder", "rightBorder", "topBorder", "bottomBorder", "diagonalBorder", 
//     "leftBorderColor", "rightBorderColor", "topBorderColor", "bottomBorderColor", "diagonalBorderColor", 
//     "leftBorderStyle", "rightBorderStyle", "topBorderStyle", "bottomBorderStyle", "diagonalBorderStyle", 
//     "diagonalBorderDirection", 
//     "numberFormat"
// ];

let _RichText = null;

/**
 * `xslx-populate` library based accessor to a given Excel workbook. All these methods are internally used by {@link XlsxDataFill}, 
 * but can be used as a reference for implementing custom spreadsheet accessors.
 */
class XlsxPopulateAccess {
    /**
     * Constructs a new instance of XlsxSmartTemplate with given options.
     * @param {Workbook} workbook - The workbook to be accessed.
     * @param {XlsxPopulate} XlsxPopulate - The actual xlsx-populate library object.
     * @description The `XlsxPopulate` object need to be passed in order to extract
     * certain information from it, _without_ referring the whole library, thus
     * avoiding making the `xlsx-datafill` package a dependency.
     */
    constructor(workbook, XlsxPopulate) {
        this._workbook = workbook;
        this._rowSizes = {};
        this._colSizes = {};
    
        _RichText = XlsxPopulate.RichText;
    }

    /**
     * Returns the configured workbook for direct XlsxPopulate manipulation.
     * @returns {Workbook} The workbook involved.
     */
    workbook() {
        return this._workbook; 
    }

    /**
     * Gets/Sets the textual representation of the cell value.
     * @param {Cell} cell - The cell to retrieve the value from.
     * @param {*} value - The requested value for setting.
     * @returns {string} The textual representation of cell's contents.
     * @returns {*|XlsxPopulateAccess} Either the requested value or chainable this.
     */
    cellValue(cell, value) {
        if (value !== undefined) {
            cell.value(value);
            return this;
        } else {
            const theValue = cell.value();
            return theValue instanceof _RichText ? theValue.text() : theValue;
        }
    }

    /**
     * Gets the textual representation of the cell value.
     * @param {Cell} cell - The cell to retrieve the value from.
     * @returns {string} The type of the cell - 'formula', 'richtext', 
     * 'text', 'number', 'date', 'hyperlink', or 'unknown';
     */
    cellType(cell) {
        if (cell.formula())
            return 'formula';
        else if (cell.hyperlink())
            return 'hyperlink';
        
        const theValue = cell.value();
        if (theValue instanceof _RichText)
            return 'richtext';
        else if (theValue instanceof Date)
            return 'date';
        else 
            return typeof theValue;
    }

    /**
     * Gets the formula from the cell or null, if there isn't any
     * @param {Cell} cell - The cell to retrieve the value from.
     * @param {string} formula - the text of the formula to be set.
     * @returns {string} The formula inside the cell or this for chaining.
     */
    cellFormula(cell, formula) {
        if (formula !== undefined) {
            cell.formula(_.trimStart(formula, ' ='));
            return this;
        } else
            return cell.formula();
    }

    /**
     * Measures the distance, as a vector between two given cells.
     * @param {Cell} from The first cell.
     * @param {Cell} to The second cell.
     * @returns {Array.<Number>} An array with two values [<rows>, <cols>], representing the distance between the two cells.
     */
    cellDistance(from, to) {
        return [
            to.rowNumber() - from.rowNumber(),
            to.columnNumber() - from.columnNumber()
        ];
    }

    /**
     * Determines the size of cell, taking into account if it is part of a merged range.
     * @param {Cell} cell The cell to be investigated.
     * @returns {Array.<Number>} An array with two values [<rows>, <cols>], representing the occupied size.
     */
    cellSize(cell) {
        const cellAddr = cell.address();
        let theSize = [1, 1];
    
        _.forEach(cell.sheet()._mergeCells, range => {
            const rangeAddr = range.attributes.ref.split(":");
            if (rangeAddr[0] == cellAddr) {
                theSize = this.cellDistance(cell, cell.sheet().cell(rangeAddr[1]));
                ++theSize[0];
                ++theSize[1];
                return false;
            }
        });
    
        return theSize;
    }

    /**
     * Sets a named style of a given cell.
     * @param {Cell} cell The cell to be operated.
     * @param {string} name The name of the style property to be set.
     * @param {string|object} value The value for this property to be set.
     * @returns {XlsxPopulateAccess} For invocation chaining.
     */
    cellStyle(cell, name, value) {
        if (value !== undefined) {
            cell.style(name, value);
            return this;
        } else {
            return cell.style(name);
        }
    }

    /**
     * Creates a reference Id for a given cell, based on its sheet and address.
     * @param {Cell} cell The cell to create a reference Id to.
     * @param {boolean} withSheet Whether to include the sheet name in the reference. Defaults to true.
     * @returns {string} The id to be used as a reference for this cell.
     */
    cellRef(cell, withSheet) {
        if (withSheet == null)
            withSheet = true;
        return cell.address({ includeSheetName: withSheet });
    }

    /**
     * Build a reference string for a cell identified by @param adr, from the @param cell.
     * @param {Cell} cell A cell that is a base of the reference.
     * @param {string} adr The address of the target cell, as mentioned in @param cell.
     * @param {boolean} withSheet Whether to include the sheet name in the reference. Defaults to true.
     * @returns {string} A reference string identifying the target cell uniquely.
     */
    buildRef(cell, adr, withSheet) {
        if (withSheet == null)
            withSheet = true;
        return adr ? cell.sheet().cell(adr).address({ includeSheetName: withSheet }) : null;
    }

    /**
     * Retrieves a given cell from a given sheet (or an active one).
     * @param {string|object|array} address The cell adress to be used
     * @param {string|idx} sheetId The id/name of the sheet to retrieve the cell from. Defaults to an active one.
     * @returns {Cell} A reference to the required cell.
     */
    getCell(address, sheetId) {
        const theSheet = sheetId == null ? this._workbook.activeSheet() : this._workbook.sheet(sheetId);
        return theSheet.cell(address);
    }

    /**
     * Constructs and returns the range starting from the given cell and spawning given rows and cells.
     * @param {Cell} cell The starting cell of the range.
     * @param {Number} rowOffset Number of rows away from the starting cell. 0 means same row.
     * @param {Number} colOffset Number of columns away from the starting cell. 0 means same column.
     * @returns {Range} The constructed range.
     */
    getCellRange(cell, rowOffset, colOffset) {
        return cell.rangeTo(cell.relativeCell(rowOffset, colOffset));
    }

    /**
     * Gets the cell at a certain offset from a given one.
     * @param {Cell} cell The reference cell to make the offset from.
     * @param {int} rows Number of rows to offset.
     * @param {int} cols Number of columns to offset.
     * @returns {Cell} The resulting cell.
     */
    offsetCell(cell, rows, cols) {
        return cell.relativeCell(rows, cols);
    }

    /**
     * Merge or split range of cells.
     * @param {Range} range The range, as returned from {@link getCellRange}
     * @param {boolean} status The merged status to be set.
     * @returns {XlsxPopulateAccess} For chain invokes.
     */
    rangeMerged(range, status) {
        if (status === undefined)
            return range.merged();
        else {
            range.merged(status);
            return this;
        }
    }

    /**
     * Sets a formula for the whole range. If it contains only one - it is set directly.
     * @param {Range} range The range, as returned from {@link getCellRange}
     * @param {String} formula The formula to be set.
     * @returns {XlsxPopulateAccess} For chain invokes.
     */
    rangeFormula(range, formula) {
        if (formula !== undefined) {
            range.formula(_.trimStart(formula, ' ='));
            return this;
        } else {
            return range.formula();
        }
    }

    /**
     * Return the string representation of a given range.
     * @param {Range} range The range which address we're interested in.
     * @param {boolean} withSheet Whether to include sheet name in the address.
     * @return {String} The string, representing the given range.
     */
    rangeRef(range, withSheet) {
        if (withSheet == null)
            withSheet = true;
        return range.address({ includeSheetName: withSheet });
    }

    /**
     * Iterate over all used cells of the given workbook.
     * @param {function} cb The callback to be invoked with `cell` argument for each used cell.
     * @returns {XlsxPopulateAccess} For chain invokes.
     */
    forAllCells(cb) {
        this._workbook.sheets().forEach(sheet => {
            const theRange = sheet.usedRange();
            if (theRange) 
                theRange.forEach(cb);
        });
        return this;
    }

    /**
     * Copies the styles from `src` cell to the `dest`-ination one.
     * @param {Cell} dest Destination cell.
     * @param {Cell} src Source cell.
     * @returns {XlsxPopulateAccess} For invocation chaining.
     */
    copyStyle(dest, src) {
        if (src == dest) return this;
        if (!src || !dest) throw new Error("Crash! Null 'src' or 'dest' for copyStyle()!");

        if (src._style !== undefined)
            dest.style(src._style);
        else if (src._styleId > 0)
            dest._styleId = src._styleId;
        
        return this;
    }

    /**
     * Resize the column and row of the destination cell, if not changed already.
     * @param {Cell} dest The destination cell which row and column to resize.
     * @param {Cell} src The source (template) cell to take the size from.
     * @returns {XlsxPopulateAccess} For invocation chaining.
     */
    copySize(dest, src) {
        const row = dest.rowNumber(),
            col = dest.columnNumber();

        if (this._rowSizes[row] === undefined)
            dest.row().height(this._rowSizes[row] = src.row().height());
        
        if (this._colSizes[col] === undefined)
            dest.column().width(this._colSizes[col] = src.column().width());

        return this;
    }
}

module.exports = XlsxPopulateAccess;
