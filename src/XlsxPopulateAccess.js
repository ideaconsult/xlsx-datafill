"use strict";

const _ = require('lodash');

let _RichText = null;

// const XlsxPopulate = require('xlsx-populate');

/**
 * Data fill routines wrapper.
 * @ignore
 */
class XlsxPopulateAccess {
    /**
     * Constructs a new instance of XlsxSmartTemplate with given options.
     * @param {Workbook} workbook - The workbook to be accessed.
     * @param {XlsxPopulate} XlsxPopulate - The actual xlsx-populate library object.
     * @description The `XlsxPopulate` object need to be passed in order to extract
     * certain information from it, _without_ referring the whole library, and thus
     * making the `xlsx-datafill` package dependent on it.
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
     * Gets the textual representation of the cell value.
     * @param {Cell} cell - The cell to retrieve the value from.
     * @returns {string} The textual representation of cell's contents.
     */
    cellTextValue(cell) {
        const cellValue = cell.value();
        return cellValue instanceof _RichText ? cellValue.text() : cellValue;
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
     * Merge or split range of cells.
     * @param {Range} range The range, as returned from @see getCellRange().
     * @param {boolean} status The merged status to be set.
     * @returns {XlsxPopulateAccess} For chain invokes.
     */
    setRangeMerged(range, status) {
        range.merged(status);
        return this;
    }

    /**
     * Iterate over all used cells of the given workbook.
     * @param {function} cb The callback to be invoked with `cell` argument for each used cell.
     * @returns {XlsxPopulateAccess} For chain invokes.
     */
    forAllCells(cb) {
        this._workbook.sheets().forEach(sheet => sheet.usedRange().forEach(cb));
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
        
        dest._styleId = src._styleId;
        if (src._style)
            dest._style = _.merge({}, src._style);
        
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

    /**
     * Sets a value in the cell.
     * @param {Cell} cell The cell to be operated.
     * @param {string} value The string value to be set inside.
     * @returns {XlsxPopulateAccess} For invocation chaining.
     */
    setValue(cell, value) {
        cell.value(value);
        return this;
    }

    /**
     * Sets a named style of a given cell.
     * @param {Cell} cell The cell to be operated.
     * @param {string} name The name of the style property to be set.
     * @param {string|object} value The value for this property to be set.
     * @returns {XlsxPopulateAccess} For invocation chaining.
     */
    setStyle(cell, name, value) {
        cell.style(name, value);
        return this;
    }
}

module.exports = XlsxPopulateAccess;
