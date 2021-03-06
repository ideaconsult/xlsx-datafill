"use strict";

const _ = require('lodash');

const defaultOpts = {
    templateRegExp: /\{\{([^}]*)\}\}/,
    fieldSplitter: "|",
    joinText: ",",
    mergeCells: true,
    duplicateCells: false,
    followFormulae: false,
    copyStyle: true,
    callbacksMap: {
        '': data => _.keys(data),
        $: data => _.values(data)
    }
};

const refRegExp = /('?([^!]*)?'?!)?([A-Z]+\d+)(:([A-Z]+\d+))?/;

/**
 * Data fill engine, taking an instance of Excel sheet accessor and a JSON object as data, and filling the values from the latter into the former.
 */
class XlsxDataFill {
    /**
     * Constructs a new instance of XlsxDataFill with given options.
     * @param {object} accessor An instance of XLSX spreadsheet accessing class.
     * @param {{}} opts Options to be used during processing.
     * @param {RegExp} opts.templateRegExp The regular expression to be used for template recognizing. Default is `/\{\{([^}]*)\}\}/`, i.e. Mustache.
     * @param {string|RegExo} opts.fieldSplitter The string or regular expression to be used as template fields splitter. Default is `|`.
     * @param {string} opts.joinText The string to be used when the extracted value for a single cell is an array, and it needs to be joined. Default is `,`.
     * @param {string|boolean} opts.mergeCells Whether to merge the higher dimension cells in the output. Default is true, but valid values are also `"both"`, `"vertical"` and `"horizontal"`.
     * @param {string|boolean} opts.duplicateCells Whether to duplicate the content of higher dimension cells, when not merged. Default is false. Same valud values as `mergeCells`.
     * @param {boolean} opts.followFormulae If a template is located as a result of a formula, whether to still process it. Default is false.
     * @param {boolean} opts.copyStyle Copy the style of the template cell when populating. Even when `false`, the template styling _is_ applied. Default is true.
     * @param {object.<string, function>} opts.callbacksMap A map of handlers to be used for data and value extraction.
     */
    constructor(accessor, opts) {
        this._opts = _.defaultsDeep({}, opts, defaultOpts);
        this._rowSizes = {};
        this._colSizes = {};
        this._access = accessor;
    }

    /**
     * Setter/getter for XlsxDataFill's options as set during construction.
     * @param {{}|null} newOpts If set - the new options to be used. Check [up here]{@link #new-xlsxdatafillaccessor-opts}.
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
                formulas: [],
                processed: false
            };

            if (template.reference) {
                const refFill = dataFills[template.reference];
                
                if (!refFill) 
                    throw new Error(`Unable to find a reference '${template.reference}'!`);
                
                if (template.formula) 
                    refFill.formulas.push(aFill);
                else
                    refFill.dependents.push(aFill);
    
                aFill.offset = this._access.cellDistance(refFill.template.cell, template.cell);
            }
            dataFills[template.id] = aFill;
        });
    
        // Apply each fill onto the sheet.
        _.each(dataFills, fill => {
            if (fill.processed)
                return;
            else if (fill.template.formula)
                throw new Error(`Non-referencing formula found '${fill.extractor}'. Use a non-templated one!`);
            else
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
            handlerName = _.trim(extractParts[1]);

        return extractParts.length == 1
            ? { path: extractor, handler: null }
            : {
                path: _.trim(extractParts[0]),
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

        if (this._opts.copyStyle)
            this._access.copyStyle(cell, template.cell);
        
        if (styles && data) {
            _.each(styles, pair => {
                if (_.startsWith(pair.name, ":")) {
                    this.getHandler(pair.name.substr(1)).call(this._opts, data, cell);
                } else if (!_.startsWith(pair.name, "!")) {
                    const val = this.extractValues(data, pair.extractor, cell);
                    if (val)
                        this._access.setCellStyle(cell, pair.name, JSON.parse(val));
                }
            });
        }

        return this;
    }

    /**
     * Extract the options-specific parameters from the styles field and merge them with the global ones.
     * @param {{}} template The template to extract options properties from.
     * @returns {{}} The full options, 
     * @ignore
     */
    getTemplateOpts(template) {
        if (!template.styles)
            return this._opts;
        
        const opts = _.clone(this._opts);
        _.each(template.styles, pair => {
            if (_.startsWith(pair.name, "!"))
                opts[pair.name.substr(1)] = JSON.parse(pair.extractor);
        });

        return opts;
    }

    /**
     * Parses the contents of the cell into a valid template info.
     * @param {Cell} cell The cell containing the template to be parsed.
     * @returns {{}} The parsed template.
     * @description This method builds template info, taking into account the supplied options.
     * @ignore
     */
    parseTemplate(cell) {
        const value = this._access.cellValue(cell);
        if (value == null || typeof value !== 'string')
            return null;
        
        const reMatch = value.match(this._opts.templateRegExp);
        if (!reMatch || !this._opts.followFormulae && this._access.cellType(cell) === 'formula') 
            return null;
    
        const parts = reMatch[1].split(this._opts.fieldSplitter).map(_.trim),
            styles = !parts[4] ? null : parts[4].split(","),
            extractor = parts[2] || "",
            cellRef = this._access.buildRef(cell, parts[0]);
        
        if (parts.length < 2) 
            throw new Error(`Not enough components of the template '${reMatch[0]}'`);
        if (!!parts[0] && !cellRef)
            throw new Error(`Invalid reference passed: '${parts[0]}'`);

        return {
            id: this._access.cellRef(cell),
            reference: cellRef,
            iterators: parts[1].split(/x|\*/).map(_.trim),
            extractor: extractor,
            formula: extractor.startsWith("="),
            cell: cell,
            cellSize: this._access.cellSize(cell),
            padding: (parts[3] || "").split(/:|,|x|\*/).map(v => parseInt(v) || 0),
            styles: !styles ? null : _.map(styles, s => {
                const pair = _.trim(s).split("=");
                return { name: _.trim(pair[0]), extractor: _.trim(pair[1]) };
            })
        };
    }

    sortTemplates(list) {
        const sorted = [],
            related = {},
            map = {},
            freeList = [];

        // First, make the dependency map and add the list of non-referencing templates
        for (let i = 0; i < list.length; ++i) {
            const t = list[i];
            map[t.id] = i;

            if (!t.reference)
                freeList.push(t.id);
            else 
                (related[t.reference] = related[t.reference] || []).push(t.id);
        }

        // Now, make the actual sorting.
        while (freeList.length > 0) {
            const id = freeList.shift(),
                t = list[map[id]];

            sorted.push(t);
            
            // We use the fact that there is a single predecessor in our setup.
            if (related[t.id])
                freeList.push(...related[t.id]);
        }

        if (sorted.length < list.length)
            throw new Error(`A reference cycle found, involving "${_.map(_.xor(list, sorted), 'id').join(',')}"!`);

        return sorted;
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
        
        return this.sortTemplates(allTemplates).forEach(cb);
    }

    /**
     * Extracts the value(s) from the provided data `root` to be set in the provided `cell`.
     * @param {{}} root The data root to be extracted values from.
     * @param {string} extractor The extraction string provided by the template. Usually a JSON path within the data `root`.
     * @param {Cell} cell A reference cell, if such exists.
     * @returns {string|number|Date|Array|Array.<Array.<*>>} The value to be used.
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

        if (!Array.isArray(data) && typeof data === 'object')
            return data;
        else if (idx < iterators.length - 1) {
            data = _.map(data, inRoot => this.extractData(inRoot, iterators, idx + 1));
            sizes = data[0].sizes || [];
        }
        
        // data = _.values(data);

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
        if (!cell) throw new Error("Crash! Null reference cell in 'putValues()'!");

        let entrySize = data.sizes,
            value = this.extractValues(data, template.extractor, cell);

        // if we've come up with a raw data
        if (!Array.isArray(value) || !entrySize || !entrySize.length) {
            this._access.setCellValue(cell, value);
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
                this._access.setCellValue(cell, value[ri][ci]);
                this.applyDataStyle(cell, data[ri][ci], template);
            });
        } else
            throw new Error(`Values extracted with '${template.extractor}' are more than 2 dimension!'`);

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
                        inCell = this._access.offsetCell(nextCell, inFill.offset[0], inFill.offset[1]);
                    
                    _.forEach(this.applyFill(inFill, inRoot, inCell), sizeMaxxer);
                }

                // Now we have the inner data put and the size calculated.
                _.forEach(this.putValues(nextCell, inRoot, template), sizeMaxxer);

                let rowOffset = entrySize[0],
                    colOffset = entrySize[1],
                    rowPadding = template.padding[0] || 0,
                    colPadding = template.padding[1] || 0;

                // Make sure we grow only on one dimension.
                if (theData.sizes[0] < 0) {
                    if (template.padding.length < 2)
                        colPadding = rowPadding;
                    rowOffset = rowPadding = 0;
                    entrySize[1] = 1;
                } else if (theData.sizes.length < 2) {
                    colOffset = colPadding = 0;
                    entrySize[0] = 1;
                }

                if (rowOffset > 1 || colOffset > 1) {
                    const rng = this._access.getCellRange(nextCell, Math.max(rowOffset - 1, 0), Math.max(colOffset - 1, 0)),
                        _opts = this.getTemplateOpts(template);

                    if (_opts.mergeCells === true || _opts.mergeCell === 'both'
                        || rowOffset > 1 && _opts.mergeCells === 'vertical' 
                        || colOffset > 1 && _opts.mergeCells === 'horizontal')
                        this._access.rangeMerged(rng, true);
                    else if (_opts.duplicateCells === true || _opts.duplicateCells === 'both'
                        || rowOffset > 1 && _opts.duplicateCells === 'vertical' 
                        || colOffset > 1 && _opts.duplicateCells === 'horizontal')
                        this._access.duplicateCell(nextCell, rng);

                    rng.forEach(cell => this.applyDataStyle(cell, inRoot, template));
                }

                // Finally, calculate the next cell.
                nextCell = this._access.offsetCell(nextCell, rowOffset + rowPadding, colOffset + colPadding);	
            }

            // Now recalc combined entry size.
            _.forEach(this._access.cellDistance(mainCell, nextCell), sizeMaxxer);
        }

        _.forEach(aFill.formulas, f => this.applyFormula(f, entrySize, mainCell));

        aFill.processed = true;
        return entrySize;
    }

    /**
     * Process a formula be shifting all the fixed offset.
     * @param {String} formula The formula to be shifted.
     * @param {Array<Number,Number>} offset The offset of the referenced template to the formula one.
     * @param {Array<Number,Number>} size The size of the ranges as they should be.
     * @returns {String} The processed text.
     * @ignore
     */
    shiftFormula(formula, offset, size) {
        let newFormula = '';

        for (;;) {
            const match = formula.match(refRegExp);
            if (!match) break;

            let from = this._access.getCell(match[3], match[2]),
                newRef = null;

            if (offset[0] > 0 || offset[1] > 0)
                from = this._access.offsetCell(from, offset[0], offset[1]);

            newRef = !match[5]
                ? this._access.cellRef(from, !!match[2])
                : this._access.rangeRef(this._access.getCellRange(from, size[0], size[1]), !!match[2]);

            newFormula += formula.substr(0, match.index) + newRef;
            formula = formula.substr(match.index + match[0].length);
        }

        newFormula += formula;
        return newFormula;
    }

    /**
     * Apply the given formula in the sheet, i.e. changing it to match the 
     * sizes of the references templates.
     * @param {{}} aFill The fill to be applied, as constructed in the {@link fillData} method.
     * @param {Array<Number>} entrySize The fill-to-size map, as constructed so far
     * @param {Cell} cell The cell to put/start this formula into
     * @returns {undefined}
     * @ignore
     */
    applyFormula(aFill, entrySize, cell) {
        cell = this._access.offsetCell(cell, aFill.offset[0], aFill.offset[1]);

        const template = aFill.template,
            iter = _.trim(template.iterators[0]),
            offset = this._access.cellDistance(template.cell, cell);
            
        let formula = template.extractor, 
            rng;
            
        aFill.processed = true;
        this._access.setCellValue(cell, null);

        if (entrySize[0] < 2 && entrySize[1] < 2 || iter === 'both') {
            formula = this.shiftFormula(formula, offset, [0, 0]);
            rng = this._access.getCellRange(cell, entrySize[0] - 1, entrySize[1] - 1);
        } else if (iter === 'cols') {
            formula = this.shiftFormula(formula, offset, [entrySize[0] - 1, 0]);
            rng = this._access.getCellRange(cell, 0, entrySize[1] - 1);
        } else if (iter === 'rows') {
            formula = this.shiftFormula(formula, offset, [0, entrySize[1] - 1]);
            rng = this._access.getCellRange(cell, entrySize[0] - 1, 0);
        } else { // i.e. 'none'
            this._access.setCellFormula(cell, this.shiftFormula(formula, offset, [entrySize[0] - 1, entrySize[1] - 1]));
            return;
        }

        this._access.setRangeFormula(rng, formula);
    }
}

/**
 * The built-in accessor based on xlsx-populate npm module
 * @type {XlsxPopulateAccess}
 */
XlsxDataFill.XlsxPopulateAccess = require('./XlsxPopulateAccess');
XlsxDataFill.version = "{{VERSION}}";

module.exports = XlsxDataFill;
