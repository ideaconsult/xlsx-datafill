"use strict";

const _ = require('lodash');

const defaultOpts = {
    templateRegExp: new RegExp(/\{\{([^}]*)\}\}/),
    fieldSplitter: "|",
    joinText: ",",
    callbacksMap: {
        "": data => _.keys(data)
    }
};

/**
 * Data fill engine, taking an instance of Excel sheet accessor and a JSON object as data, and filling the values from the latter into the former.
 */
class XlsxDataFill {
    /**
     * Constructs a new instance of XlsxDataFill with given options.
     * @param {object} accessor An instance of XLSX spreadsheet accessing class.
     * @param {{}} opts Options to be used during processing.
     * @param {RegExp} opts.templateRegExp The regular expression to be used for template recognizing. 
     * Default is `/\{\{([^}]*)\}\}/`, i.e. Mustache.
     * @param {string} opts.fieldSplitter The string to be expected as template field splitter. Default is `|`.
     * @param {string} opts.joinText The string to be used when the extracted value for a single cell is an array, 
     * and it needs to be joined. Default is `,`.
     * @param {object.<string, function>} opts.callbacksMap A map of handlers to be used for data and value extraction.
     * There is one default - the empty one, for object key extraction.
     */
    constructor(accessor, opts) {
        this._opts = _.defaultsDeep({}, opts, defaultOpts);
        this._rowSizes = {};
        this._colSizes = {};
        this._access = accessor;
    }

    /**
     * Setter/getter for XlsxDataFill's options as set during construction.
     * @param {{}|null} newOpts If set - the new options to be used. 
     * @see {@constructor}.
     * @returns {XlsxDataFill|{}} The required options (in getter mode) or XlsxDataFill (in setter mode) for chaining.
     */
    options(newOpts) {
        if (newOpts !== null) {
            _.merge(this._opts, newOpts);
            return this;
        } else
            return this._opts;
    }

    /**
     * The main entry point for whole data population mechanism.
     * @param {{}} data The data to be applied.
     * @returns {XlsxDataFill} For invocation chaining.
     */
    fillData(data) {
        const dataFills = {};
	
        // Build the dependency connections between templates.
        this.collectTemplates(template => {
            const aFill = {  
                template: template, 
                dependents: [],
                processed: false
            };
    
            if (template.reference) {
                const refFill = dataFills[template.reference];
                if (!refFill)
                    throw new Error(`Unable to find a reference '${template.reference}'!`);
                
                refFill.dependents.push(aFill);
                aFill.offset = this._access.cellDistance(refFill.template.cell, template.cell);
            }
    
            dataFills[this._access.cellRef(template.cell)] = aFill;
        });
    
        // Apply each fill onto the sheet.
        _.each(dataFills, fill => {
            if (!fill.processed)
                this.applyFill(fill, data, fill.template.cell);
        });

        return this;
    }

    /**
     * Retrieves the provided handler from the map.
     * @param {string} handlerName The name of the handler.
     * @returns {function} The handler function itself.
     * @ignore
     */
    getHandler(handlerName) {
        const handlerFn = this._opts.callbacksMap[handlerName];

        if (!handlerFn)
            throw new Error(`Handler '${handlerName}' cannot be found!`);
        else if (typeof handlerFn !== 'function')
            throw new Error(`Handler '${handlerName}' is not a function!`);
        else 
            return handlerFn;
    }

    /**
     * Parses the provided extractor (ot iterator) string to find a callback id inside, if present.
     * @param {string} extractor The iterator/extractor string to be investigated.
     * @returns {object.<string, function>} A { `path`, `handler` } object representing the JSON path
     * ready for use and the provided `handler` _function_ - ready for invoking, if such is provided.
     * If not - the `path` property contains the provided `extractor`, and the `handler` is `null`.
     * @ignore
     */
    parseExtractor(extractor) {
        // A specific extractor can be specified after semilon - find and remember it.
        const extractParts = extractor.split(":"),
            handlerName = extractParts[1];

        return extractParts.length == 1
            ? { path: extractor, handler: null }
            : {
                path: extractParts[0],
                handler: this.getHandler(handlerName)
            };
    }

    /**
     * Applies the style part of the template onto a given cell.
     * @param {Cell} cell The destination cell to apply styling to.
     * @param {{}} data The data chunk for that cell.
     * @param {{}} template The template to be used for that cell.
     * @returns {DataFiller} For invocation chaining.
     * @ignore
     */
    applyDataStyle(cell, data, template) {
        const styles = template.styles;
        
        if (styles && data) {
            _.each(styles, pair => {
                if (_.startsWith(pair.name, ":")) {
                    this.getHandler(pair.name.substr(1)).call(this._opts, data, cell);
                } else {
                    const val = this.extractValues(data, pair.extractor, cell);
                    if (val)
                        this._access.setStyle(cell, pair.name, val);
                }
            });
        }

        return this;
    }

    /**
     * Parses the contents of the cell into a valid template info.
     * @param {Cell} cell The cell containing the template to be parsed.
     * @returns {{}} The parsed template.
     * @description This method builds template info, taking into account the supplied options.
     * @ignore
     */
    parseTemplate(cell) {
        // The options are in `this` argument.
        const reMatch = (this._access.cellValue(cell) || '').match(this._opts.templateRegExp);
        
        if (!reMatch) return null;
    
        const parts = reMatch[1].split(this._opts.fieldSplitter).map(_.trim),
            styles = !parts[4] ? null : parts[4].split(",");
        
        if (parts.length < 2) 
            throw new Error(`Not enough components of the template ${reMatch[0]}`);

        return {
            reference: this._access.buildRef(cell, parts[0]),
            iterators: parts[1].split(/x|\*/).map(_.trim),
            extractor: parts[2] || "",
            cell: cell,
            cellSize: this._access.cellSize(cell),
            padding: (parts[3] || "").split(/:|,|x|\*/).map(v => parseInt(v) || 0),
            styles: !styles ? null : _.map(styles, s => {
                const pair = _.trim(s).split("=");
                return { name: _.trim(pair[0]), extractor: _.trim(pair[1]) };
            })
        };
    }

    /**
     * Searches the whole workbook for template pattern and constructs the templates for processing.
     * @param {Function} cb The callback to be invoked on each templated, after they are sorted.
     * @returns {undefined}
     * @description The templates collected are sorted, based on the intra-template reference - if one template
     * is referring another one, it'll appear _later_ in the returned array, than the referred template.
     * This is the order the callback is being invoked on.
     * @ignore
     */
    collectTemplates(cb) {
        const allTemplates = [];
    
        this._access.forAllCells(cell => {
            const template = this.parseTemplate(cell);
            if (template)
                allTemplates.push(template);
        });
        
        return allTemplates
            .sort((a, b) => a.reference == this._access.cellRef(b.cell) ? 1 : b.reference == this._access.cellRef(a.cell) ? -1 : 0)
            .forEach(cb);
    }

    /**
     * Extracts the value(s) from the provided data `root` to be set in the provided `cell`.
     * @param {{}} root The data root to be extracted values from.
     * @param {string} extractor The extraction string provided by the template. Usually a JSON path within the data `root`.
     * @param {Cell} cell A reference cell, if such exists.
     * @returns {string|Array|Array.<Array.<*>>} The value to be used.
     * @description This method is used even when a whole - possibly rectangular - range is about to be set, so it can
     * return an array of arrays.
     * @ignore
     */
    extractValues(root, extractor, cell) {
        const { path, handler } = this.parseExtractor(extractor);

        if (!Array.isArray(root))
            root = _.get(root, path, root);
        else if (root.sizes !== undefined)
            root = !extractor ? root : _.map(root, entry => this.extractValues(entry, extractor, cell));
        else if (!handler)
            return root.join(this._opts.joinText || ",");

        return !handler ? root : handler.call(this._opts, root, cell);
    }

    /**
     * Extracts an array (possibly of arrays) with data for the given fill, based on the given
     * root object.
     * @param {{}} root The main reference object to apply iterators to.
     * @param {Array} iterators List of iterators - string JSON paths inside the root object.
     * @param {Number} idx The index in the iterators array to work on.
     * @returns {Array|Array.<Array>} An array (possibly of arrays) with extracted data.
     * @ignore
     */
    extractData(root, iterators, idx) {
        let iter = iterators[idx],
            sizes = [],
            transposed = false,
            data = null;

        if (iter == '1') {
            transposed = true;
            iter = iterators[++idx];
        }

        if (!iter) return root;

        // A specific extractor can be specified after semilon - find and remember it.
        const parsedIter = this.parseExtractor(iter);

        data = _.get(root, parsedIter.path, root);
        
        if (typeof parsedIter.handler === 'function')
            data = parsedIter.handler.call(this._opts, data);

        if (idx < iterators.length - 1) {
            data = _.map(data, inRoot => this.extractData(inRoot, iterators, idx + 1));
            sizes = data[0].sizes;
        } else if (!Array.isArray(data) && typeof data === 'object')
            data = _.values(data);

        // Some data sanity checks.
        if (!data)
            throw new Error(`The iterator '${iter}' extracted no data!`);
        else if (typeof data !== 'object')
            throw new Error(`The data extracted from iterator '${iter}' is neither an array, nor object!`);

        sizes.unshift(transposed ? -data.length : data.length);
        data.sizes = sizes;
        return data;
    }

    /**
     * Put the data values into the proper cells, with correct extracted values.
     * @param {{}} cell The starting cell for the data to be put.
     * @param {Array} data The actual data to be put. The values will be _extracted_ from here first.
     * @param {{}} template The template that is being implemented with that data fill.
     * @returns {Array} Matrix size that this data has occupied on the sheet [rows, cols].
     * @ignore
     */
    putValues(cell, data, template) {
        let entrySize = data.sizes,
            value = this.extractValues(data, template.extractor, cell);

        // make sure, the 
        if (!entrySize || !entrySize.length) {
            this._access
                .setValue(cell, value)
                .copyStyle(cell, template.cell)
                .copySize(cell, template.cell);
            this.applyDataStyle(cell, data, template);
            entrySize = template.cellSize;
        } else if (entrySize.length <= 2) {
            // Normalize the size and data.
            if (entrySize[0] < 0) {
                entrySize = [1, -entrySize[0]];
                value = [value];
                data = [data];
            } else if (entrySize.length == 1) {
                entrySize = entrySize.concat([1]);
                value = _.chunk(value, 1);
                data = _.chunk(data, 1);
            }

            this._access.getCellRange(cell, entrySize[0] - 1, entrySize[1] - 1).forEach((cell, ri, ci) => {
                this._access
                    .setValue(cell, value[ri][ci])
                    .copyStyle(cell, template.cell)
                    .copySize(cell, template.cell);
                this.applyDataStyle(cell, data[ri][ci], template);
            });
        } else {
            // TODO: Deal with more than 3 dimensions case.
            throw new Error(`Values extracted with '${template.extractor} are more than 2 dimension!'`);
        }

        return entrySize;
    }

    /**
     * Apply the given filter onto the sheet - extracting the proper data, following dependent fills, etc.
     * @param {{}} aFill The fill to be applied, as constructed in the {@link fillData} method.
     * @param {{}} root The data root to be used for data extraction.
     * @param {Cell} mainCell The starting cell for data placement procedure.
     * @returns {Array} The size of the data put in [row, col] format.
     * @ignore
     */
    applyFill(aFill, root, mainCell) {
        const template = aFill.template,
            theData = this.extractData(root, template.iterators, 0);

        let entrySize = [1, 1];

        if (!aFill.dependents || !aFill.dependents.length)
            entrySize = this.putValues(mainCell, theData, template);
        else {
            let nextCell = mainCell;
            const sizeMaxxer = (val, idx) => entrySize[idx] = Math.max(entrySize[idx], val);

            for (let d = 0; d < theData.length; ++d) {
                const inRoot = theData[d];

                for (let f = 0; f < aFill.dependents.length; ++f) {
                    const inFill = aFill.dependents[f],
                        inCell = this._access.offsetCell(nextCell, inFill.offset[0], inFill.offset[1]),
                        innerSize = this.applyFill(inFill, inRoot, inCell);

                    _.forEach(innerSize, sizeMaxxer);
                    inFill.processed = true;
                }

                // Now we have the inner data put and the size calculated.
                _.forEach(this.putValues(nextCell, inRoot, template), sizeMaxxer);

                let rowOffset = entrySize[0],
                    colOffset = entrySize[1];

                // Make sure we grow only on one dimension.
                if (theData.sizes[0] < 0) {
                    rowOffset = 0;
                    entrySize[1] = 1;
                } else {
                    colOffset = 0;
                    entrySize[0] = 1;
                }

                if (rowOffset > 1 || colOffset > 1) {
                    const rng = this._access.getCellRange(nextCell, Math.max(rowOffset - 1, 0), Math.max(colOffset - 1, 0));
                    this._access.setRangeMerged(rng, true);
                    rng.forEach(cell => this._access.copySize(cell, template.cell));
                }

                // Finally, calculate the next cell.
                nextCell = this._access.offsetCell(nextCell, rowOffset + (template.padding[0] || 0), colOffset + (template.padding[1] || 0));	
            }

            // Now recalc combined entry size.
            _.forEach(this._access.cellDistance(mainCell, nextCell), sizeMaxxer);
        }

        return entrySize;
    }
}

/**
 * The built-in accessor based on xlsx-populate npm module
 * @type {XlsxPopulateAccess}
 */
XlsxDataFill.XlsxPopulateAccess = require('./XlsxPopulateAccess');

module.exports = XlsxDataFill;
