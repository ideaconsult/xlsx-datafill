(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.XlsxDataFill = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var _2 = require('lodash');

var defaultOpts = {
  templateRegExp: new RegExp(/\{\{([^}]*)\}\}/),
  fieldSplitter: "|",
  joinText: ",",
  callbacksMap: {
    "": function _(data) {
      return _2.keys(data);
    }
  }
};
/**
 * Data fill engine.
 */

var XlsxDataFill =
/*#__PURE__*/
function () {
  /**
   * Constructs a new instance of XlsxDataFill with given options.
   * @param {object} accessor An instance of XLSX data accessing class.
   * @param {{}} opts Options to be used during processing.
   * @param {RegExp} opts.templateRegExp The regular expression to be used for template parsing.
   * @param {string} opts.fieldSplitter The string to be expected as template field splitter.
   * @param {string} opts.joinText The string to be used when extracting array values.
   * @param {object.<string, function>} opts.callbacksMap A map of handlers to be used for data extraction.
   */
  function XlsxDataFill(accessor, opts) {
    _classCallCheck(this, XlsxDataFill);

    this._opts = _2.defaultsDeep({}, opts, defaultOpts);
    this._rowSizes = {};
    this._colSizes = {};
    this._access = accessor;
  }
  /**
   * Setter/getter for XlsxDataFill's options as set during construction.
   * @param {{}|null} newOpts If set - the news options to be used.
   * @returns {XlsxDataFill|{}} The required options or XlsxDataFill (in set mode) for chaining.
   */


  _createClass(XlsxDataFill, [{
    key: "options",
    value: function options(newOpts) {
      if (newOpts !== null) {
        _2.merge(this._opts, newOpts);

        this._access.options(this._opts);

        return this;
      } else return this._opts;
    }
    /**
     * Parses the provided extractor (ot iterator) string to find a callback id inside, if present.
     * @param {string} extractor The iterator/extractor string to be investigated.
     * @returns {object.<string, function>} A { `path`, `handler` } object representing the JSON path
     * ready for use and the provided `handler` _function_ - ready for invoking, if such is provided.
     * If not - the `path` property contains the provided `extractor`, and the `handler` is `null`.
     */

  }, {
    key: "parseExtractor",
    value: function parseExtractor(extractor) {
      // A specific extractor can be specified after semilon - find and remember it.
      var extractParts = extractor.split(":");
      return extractParts.length == 1 ? {
        path: extractor,
        handler: null
      } : {
        path: extractParts[0],
        handler: this._opts.callbacksMap[extractParts[1]]
      };
    }
    /**
     * Applies the style part of the template onto a given cell.
     * @param {Cell} cell The destination cell to apply styling to.
     * @param {{}} data The data chunk for that cell.
     * @param {{}} template The template to be used for that cell.
     * @returns {DataFiller} For invocation chaining.
     */

  }, {
    key: "applyDataStyle",
    value: function applyDataStyle(cell, data, template) {
      var _this = this;

      var styles = template.styles;

      if (styles && data) {
        _2.each(styles, function (pair) {
          if (_2.startsWith(pair.name, ":")) {
            var handler = _this._opts.callbacksMap[pair.name.substr(1)];

            if (typeof handler === 'function') handler(data, cell, _this._opts);
          } else {
            var val = _this.extractValues(data, pair.extractor);

            if (val) _this._access.setStyle(cell, pair.name, val);
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
     */

  }, {
    key: "parseTemplate",
    value: function parseTemplate(cell) {
      // The options are in `this` argument.
      var reMatch = (this._access.cellTextValue(cell) || '').match(this._opts.templateRegExp);
      if (!reMatch) return null;
      var parts = reMatch[1].split(this._opts.fieldSplitter).map(_2.trim),
          iters = parts[1].split(/x|\*/).map(_2.trim),
          styles = !parts[4] ? null : parts[4].split(",");
      return {
        reference: _2.trim(parts[0]),
        iterators: iters,
        extractor: parts[2] || "",
        cell: cell,
        cellSize: this._access.cellSize(cell),
        padding: (parts[3] || "").split(/:|,|x|\*/).map(function (v) {
          return parseInt(v) || 0;
        }),
        styles: !styles ? null : _2.map(styles, function (s) {
          var pair = _2.trim(s).split("=");

          return {
            name: _2.trim(pair[0]),
            extractor: _2.trim(pair[1])
          };
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
     */

  }, {
    key: "collectTemplates",
    value: function collectTemplates(cb) {
      var _this2 = this;

      var allTemplates = [];

      this._access.forAllCells(function (cell) {
        var template = _this2.parseTemplate(cell);

        if (template) allTemplates.push(template);
      });

      return allTemplates.sort(function (a, b) {
        return a.reference == b.cell.address() ? 1 : b.reference == a.cell.address() ? -1 : 0;
      }).forEach(cb);
    }
    /**
     * Extracts the value(s) from the provided data `root` to be set in the provided `cell`.
     * @param {{}} root The data root to be extracted values from.
     * @param {string} extractor The extraction string provided by the template. Usually a JSON path within the data `root`.
     * @returns {string|Array|Array.<Array.<*>>} The value to be used.
     * @description This method is used even when a whole - possibly rectangular - range is about to be set, so it can
     * return an array of arrays.
     */

  }, {
    key: "extractValues",
    value: function extractValues(root, extractor) {
      var _this3 = this;

      var _this$parseExtractor = this.parseExtractor(extractor),
          path = _this$parseExtractor.path,
          handler = _this$parseExtractor.handler;

      if (!Array.isArray(root)) root = _2.get(root, path, root);else if (root.sizes !== undefined) root = !extractor ? root : _2.map(root, function (entry) {
        return _this3.extractValues(entry, extractor);
      });else if (!handler) return root.join(this._opts.joinText || ",");
      return !handler ? root : handler(root, null, this._opts);
    }
    /**
     * Extracts an array (possibly of arrays) with data for the given fill, based on the given
     * root object.
     * @param {{}} root The main reference object to apply iterators to.
     * @param {Array} iterators List of iterators - string JSON paths inside the root object.
     * @param {Number} idx The index in the iterators array to work on.
     * @returns {Array|Array.<Array>} An array (possibly of arrays) with extracted data.
     */

  }, {
    key: "extractData",
    value: function extractData(root, iterators, idx) {
      var _this4 = this;

      var iter = iterators[idx],
          sizes = [],
          transposed = false,
          data = null;

      if (!iter || iter == '1') {
        transposed = true;
        iter = iterators[++idx];
      }

      if (!iter) return root; // A specific extractor can be specified after semilon - find and remember it.

      var parsedIter = this.parseExtractor(iter);
      data = _2.get(root, parsedIter.path, root);
      if (typeof parsedIter.handler === 'function') data = parsedIter.handler.call(null, data, null, this._opts);

      if (idx < iterators.length - 1) {
        data = _2.map(data, function (inRoot) {
          return _this4.extractData(inRoot, iterators, idx + 1);
        });
        sizes = data[0].sizes;
      } else if (!Array.isArray(data) && _typeof(data) === 'object') data = _2.values(data);

      sizes.unshift(transposed ? -data.length : data.length);
      data.sizes = sizes;
      return data;
    }
    /**
     * Put the data values into the proper cells, with correct extracted values.
     * 
     * @param {{}} cell The starting cell for the data to be put.
     * @param {Array} data The actual data to be put. The values will be _extracted_ from here first.
     * @param {{}} template The template that is being implemented with that data fill.
     * @returns {Array} Matrix size that this data has occupied on the sheet [rows, cols].
     */

  }, {
    key: "putValues",
    value: function putValues(cell, data, template) {
      var _this5 = this;

      var entrySize = data.sizes,
          value = this.extractValues(data, template.extractor); // make sure, the 

      if (!entrySize || !entrySize.length) {
        this._access.setValue(cell, value).copyStyle(cell, template.cell).copySize(cell, template.cell);

        this.applyDataStyle(cell, data, template);
        entrySize = template.cellSize;
      } else if (entrySize.length <= 2) {
        // Normalize the size and data.
        if (entrySize[0] < 0) {
          entrySize = [1, -entrySize[0]];
          value = [value];
        } else if (entrySize.length == 1) {
          entrySize = entrySize.concat([1]);
          value = _2.chunk(value, 1);
        }

        this._access.getCellRange(cell, entrySize[0] - 1, entrySize[1] - 1).forEach(function (cell, ri, ci) {
          _this5._access.setValue(cell, value[ri][ci]).copyStyle(cell, template.cell).copySize(cell, template.cell);

          _this5.applyDataStyle(cell, data[ri][ci], template);
        });
      } else {// TODO: Deal with more than 3 dimensions case.
      }

      return entrySize;
    }
    /**
     * Apply the given filter onto the sheet - extracting the proper data, following dependent fills, etc.
     * @param {{}} aFill The fill to be applied, as constructed in the @see populate methods.
     * @param {{}} root The data root to be used for data extraction.
     * @param {Cell} mainCell The starting cell for data placement procedure.
     * @returns {Array} The size of the data put in [row, col] format.
     */

  }, {
    key: "applyFill",
    value: function applyFill(aFill, root, mainCell) {
      var _this6 = this;

      var template = aFill.template,
          theData = this.extractData(root, template.iterators, 0);
      var entrySize = [1, 1];
      if (!aFill.dependents || !aFill.dependents.length) entrySize = this.putValues(mainCell, theData, template);else {
        var nextCell = mainCell;

        var sizeMaxxer = function sizeMaxxer(val, idx) {
          return entrySize[idx] = Math.max(entrySize[idx], val);
        };

        for (var d = 0; d < theData.length; ++d) {
          var inRoot = theData[d];

          for (var f = 0; f < aFill.dependents.length; ++f) {
            var inFill = aFill.dependents[f],
                inCell = nextCell.relativeCell(inFill.offset[0], inFill.offset[1]),
                innerSize = this.applyFill(inFill, inRoot, inCell);

            _2.forEach(innerSize, sizeMaxxer);

            inFill.processed = true;
          } // Now we have the inner data put and the size calculated.


          _2.forEach(this.putValues(nextCell, inRoot, template), sizeMaxxer);

          var rowOffset = entrySize[0],
              colOffset = entrySize[1]; // Make sure we grow only on one dimension.

          if (theData.sizes[0] < 0) {
            rowOffset = 0;
            entrySize[1] = 1;
          } else {
            colOffset = 0;
            entrySize[0] = 1;
          }

          if (rowOffset > 1 || colOffset > 1) {
            var rng = this._access.getCellRange(nextCell, Math.max(rowOffset - 1, 0), Math.max(colOffset - 1, 0));

            this._access.setRangeMerged(rng, true);

            rng.forEach(function (cell) {
              return _this6._access.copySize(cell, template.cell);
            });
          } // Finally, calculate the next cell.


          nextCell = nextCell.relativeCell(rowOffset + template.padding[0], colOffset + template.padding[1] || 0);
        } // Now recalc combined entry size.


        _2.forEach(this._access.cellDistance(mainCell, nextCell), sizeMaxxer);
      }
      return entrySize;
    }
    /**
     * The main entry point for whole data population mechanism.
     * @param {{}} data The data to be applied.
     * @returns {XlsxDataFill} For invocation chaining.
     */

  }, {
    key: "fillData",
    value: function fillData(data) {
      var _this7 = this;

      var dataFills = {}; // Build the dependency connections between templates.

      this.collectTemplates(function (template) {
        var aFill = {
          template: template,
          dependents: [],
          processed: false
        };

        if (template.reference) {
          var refFill = dataFills[template.reference];
          refFill.dependents.push(aFill);
          aFill.offset = _this7._access.cellDistance(refFill.template.cell, template.cell);
        }

        dataFills[template.cell.address()] = aFill;
      }); // Apply each fill onto the sheet.

      _2.each(dataFills, function (fill) {
        if (!fill.processed) _this7.applyFill(fill, data, fill.template.cell);
      });

      return this;
    }
  }]);

  return XlsxDataFill;
}();
/**
 * The built-in accessor based on xlsx-populate npm module
 * @type {XlsxPopulateAccess}
 */


XlsxDataFill.XlsxPopulateAccess = require('./XlsxPopulateAccess');
module.exports = XlsxDataFill;

},{"./XlsxPopulateAccess":2,"lodash":undefined}],2:[function(require,module,exports){
"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var _ = require('lodash');

var _RichText = null; // const XlsxPopulate = require('xlsx-populate');

/**
 * Data fill routines wrapper.
 * @ignore
 */

var XlsxPopulateAccess =
/*#__PURE__*/
function () {
  /**
   * Constructs a new instance of XlsxSmartTemplate with given options.
   * @param {Workbook} workbook - The workbook to be accessed.
   * @param {XlsxPopulate} XlsxPopulate - The actual xlsx-populate library object.
   * @description The `XlsxPopulate` object need to be passed in order to extract
   * certain information from it, _without_ referring the whole library, and thus
   * making the `xlsx-datafill` package dependent on it.
   */
  function XlsxPopulateAccess(workbook, XlsxPopulate) {
    _classCallCheck(this, XlsxPopulateAccess);

    this._workbook = workbook;
    this._rowSizes = {};
    this._colSizes = {};
    _RichText = XlsxPopulate.RichText;
  }
  /**
   * Returns the configured workbook for direct XlsxPopulate manipulation.
   * @returns {Workbook} The workbook involved.
   */


  _createClass(XlsxPopulateAccess, [{
    key: "workbook",
    value: function workbook() {
      return this._workbook;
    }
    /**
     * Gets the textual representation of the cell value.
     * @param {Cell} cell - The cell to retrieve the value from.
     * @returns {string} The textual representation of cell's contents.
     */

  }, {
    key: "cellTextValue",
    value: function cellTextValue(cell) {
      var cellValue = cell.value();
      return cellValue instanceof _RichText ? cellValue.text() : cellValue;
    }
    /**
     * Measures the distance, as a vector between two given cells.
     * @param {Cell} from The first cell.
     * @param {Cell} to The second cell.
     * @returns {Array.<Number>} An array with two values [<rows>, <cols>], representing the distance between the two cells.
     */

  }, {
    key: "cellDistance",
    value: function cellDistance(from, to) {
      return [to.rowNumber() - from.rowNumber(), to.columnNumber() - from.columnNumber()];
    }
    /**
     * Determines the size of cell, taking into account if it is part of a merged range.
     * @param {Cell} cell The cell to be investigated.
     * @returns {Array.<Number>} An array with two values [<rows>, <cols>], representing the occupied size.
     */

  }, {
    key: "cellSize",
    value: function cellSize(cell) {
      var _this = this;

      var cellAddr = cell.address();
      var theSize = [1, 1];

      _.forEach(cell.sheet()._mergeCells, function (range) {
        var rangeAddr = range.attributes.ref.split(":");

        if (rangeAddr[0] == cellAddr) {
          theSize = _this.cellDistance(cell, cell.sheet().cell(rangeAddr[1]));
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

  }, {
    key: "getCell",
    value: function getCell(address, sheetId) {
      var theSheet = sheetId == null ? this._workbook.activeSheet() : this._workbook.sheet(sheetId);
      return theSheet.cell(address);
    }
    /**
     * Constructs and returns the range starting from the given cell and spawning given rows and cells.
     * @param {Cell} cell The starting cell of the range.
     * @param {Number} rowOffset Number of rows away from the starting cell. 0 means same row.
     * @param {Number} colOffset Number of columns away from the starting cell. 0 means same column.
     * @returns {Range} The constructed range.
     */

  }, {
    key: "getCellRange",
    value: function getCellRange(cell, rowOffset, colOffset) {
      return cell.rangeTo(cell.relativeCell(rowOffset, colOffset));
    }
    /**
     * Merge or split range of cells.
     * @param {Range} range The range, as returned from @see getCellRange().
     * @param {boolean} status The merged status to be set.
     * @returns {XlsxPopulateAccess} For chain invokes.
     */

  }, {
    key: "setRangeMerged",
    value: function setRangeMerged(range, status) {
      range.merged(status);
      return this;
    }
    /**
     * Iterate over all used cells of the given workbook.
     * @param {function} cb The callback to be invoked with `cell` argument for each used cell.
     * @returns {XlsxPopulateAccess} For chain invokes.
     */

  }, {
    key: "forAllCells",
    value: function forAllCells(cb) {
      this._workbook.sheets().forEach(function (sheet) {
        return sheet.usedRange().forEach(cb);
      });

      return this;
    }
    /**
     * Copies the styles from `src` cell to the `dest`-ination one.
     * @param {Cell} dest Destination cell.
     * @param {Cell} src Source cell.
     * @returns {XlsxPopulateAccess} For invocation chaining.
     */

  }, {
    key: "copyStyle",
    value: function copyStyle(dest, src) {
      if (src == dest) return this;
      dest._styleId = src._styleId;
      if (src._style) dest._style = _.merge({}, src._style);
      return this;
    }
    /**
     * Resize the column and row of the destination cell, if not changed already.
     * @param {Cell} dest The destination cell which row and column to resize.
     * @param {Cell} src The source (template) cell to take the size from.
     * @returns {XlsxPopulateAccess} For invocation chaining.
     */

  }, {
    key: "copySize",
    value: function copySize(dest, src) {
      var row = dest.rowNumber(),
          col = dest.columnNumber();
      if (this._rowSizes[row] === undefined) dest.row().height(this._rowSizes[row] = src.row().height());
      if (this._colSizes[col] === undefined) dest.column().width(this._colSizes[col] = src.column().width());
      return this;
    }
    /**
     * Sets a value in the cell.
     * @param {Cell} cell The cell to be operated.
     * @param {string} value The string value to be set inside.
     * @returns {XlsxPopulateAccess} For invocation chaining.
     */

  }, {
    key: "setValue",
    value: function setValue(cell, value) {
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

  }, {
    key: "setStyle",
    value: function setStyle(cell, name, value) {
      cell.style(name, value);
      return this;
    }
  }]);

  return XlsxPopulateAccess;
}();

module.exports = XlsxPopulateAccess;

},{"lodash":undefined}]},{},[1])(1)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvWGxzeERhdGFGaWxsLmpzIiwic3JjL1hsc3hQb3B1bGF0ZUFjY2Vzcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBOzs7Ozs7Ozs7O0FBRUEsSUFBTSxFQUFDLEdBQUcsT0FBTyxDQUFDLFFBQUQsQ0FBakI7O0FBQ0EsSUFBTSxXQUFXLEdBQUc7QUFDaEIsRUFBQSxjQUFjLEVBQUUsSUFBSSxNQUFKLENBQVcsaUJBQVgsQ0FEQTtBQUVoQixFQUFBLGFBQWEsRUFBRSxHQUZDO0FBR2hCLEVBQUEsUUFBUSxFQUFFLEdBSE07QUFJaEIsRUFBQSxZQUFZLEVBQUU7QUFDVixRQUFJLFdBQUEsSUFBSTtBQUFBLGFBQUksRUFBQyxDQUFDLElBQUYsQ0FBTyxJQUFQLENBQUo7QUFBQTtBQURFO0FBSkUsQ0FBcEI7QUFTQTs7OztJQUdNLFk7OztBQUNGOzs7Ozs7Ozs7QUFTQSx3QkFBWSxRQUFaLEVBQXNCLElBQXRCLEVBQTRCO0FBQUE7O0FBQ3hCLFNBQUssS0FBTCxHQUFhLEVBQUMsQ0FBQyxZQUFGLENBQWUsRUFBZixFQUFtQixJQUFuQixFQUF5QixXQUF6QixDQUFiO0FBQ0EsU0FBSyxTQUFMLEdBQWlCLEVBQWpCO0FBQ0EsU0FBSyxTQUFMLEdBQWlCLEVBQWpCO0FBQ0EsU0FBSyxPQUFMLEdBQWUsUUFBZjtBQUNIO0FBRUQ7Ozs7Ozs7Ozs0QkFLUSxPLEVBQVM7QUFDYixVQUFJLE9BQU8sS0FBSyxJQUFoQixFQUFzQjtBQUNsQixRQUFBLEVBQUMsQ0FBQyxLQUFGLENBQVEsS0FBSyxLQUFiLEVBQW9CLE9BQXBCOztBQUNBLGFBQUssT0FBTCxDQUFhLE9BQWIsQ0FBcUIsS0FBSyxLQUExQjs7QUFDQSxlQUFPLElBQVA7QUFDSCxPQUpELE1BS0ksT0FBTyxLQUFLLEtBQVo7QUFDUDtBQUVEOzs7Ozs7Ozs7O21DQU9lLFMsRUFBVztBQUN0QjtBQUNBLFVBQU0sWUFBWSxHQUFHLFNBQVMsQ0FBQyxLQUFWLENBQWdCLEdBQWhCLENBQXJCO0FBRUEsYUFBTyxZQUFZLENBQUMsTUFBYixJQUF1QixDQUF2QixHQUNEO0FBQUUsUUFBQSxJQUFJLEVBQUUsU0FBUjtBQUFtQixRQUFBLE9BQU8sRUFBRTtBQUE1QixPQURDLEdBRUQ7QUFDRSxRQUFBLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBRCxDQURwQjtBQUVFLFFBQUEsT0FBTyxFQUFFLEtBQUssS0FBTCxDQUFXLFlBQVgsQ0FBd0IsWUFBWSxDQUFDLENBQUQsQ0FBcEM7QUFGWCxPQUZOO0FBTUg7QUFFRDs7Ozs7Ozs7OzttQ0FPZSxJLEVBQU0sSSxFQUFNLFEsRUFBVTtBQUFBOztBQUNqQyxVQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBeEI7O0FBRUEsVUFBSSxNQUFNLElBQUksSUFBZCxFQUFvQjtBQUNoQixRQUFBLEVBQUMsQ0FBQyxJQUFGLENBQU8sTUFBUCxFQUFlLFVBQUEsSUFBSSxFQUFJO0FBQ25CLGNBQUksRUFBQyxDQUFDLFVBQUYsQ0FBYSxJQUFJLENBQUMsSUFBbEIsRUFBd0IsR0FBeEIsQ0FBSixFQUFrQztBQUM5QixnQkFBTSxPQUFPLEdBQUcsS0FBSSxDQUFDLEtBQUwsQ0FBVyxZQUFYLENBQXdCLElBQUksQ0FBQyxJQUFMLENBQVUsTUFBVixDQUFpQixDQUFqQixDQUF4QixDQUFoQjs7QUFDQSxnQkFBSSxPQUFPLE9BQVAsS0FBbUIsVUFBdkIsRUFDSSxPQUFPLENBQUMsSUFBRCxFQUFPLElBQVAsRUFBYSxLQUFJLENBQUMsS0FBbEIsQ0FBUDtBQUNQLFdBSkQsTUFJTztBQUNILGdCQUFNLEdBQUcsR0FBRyxLQUFJLENBQUMsYUFBTCxDQUFtQixJQUFuQixFQUF5QixJQUFJLENBQUMsU0FBOUIsQ0FBWjs7QUFDQSxnQkFBSSxHQUFKLEVBQ0ksS0FBSSxDQUFDLE9BQUwsQ0FBYSxRQUFiLENBQXNCLElBQXRCLEVBQTRCLElBQUksQ0FBQyxJQUFqQyxFQUF1QyxHQUF2QztBQUNQO0FBQ0osU0FWRDtBQVdIOztBQUVELGFBQU8sSUFBUDtBQUNIO0FBR0Q7Ozs7Ozs7OztrQ0FNYyxJLEVBQU07QUFDaEI7QUFDQSxVQUFNLE9BQU8sR0FBRyxDQUFDLEtBQUssT0FBTCxDQUFhLGFBQWIsQ0FBMkIsSUFBM0IsS0FBb0MsRUFBckMsRUFBeUMsS0FBekMsQ0FBK0MsS0FBSyxLQUFMLENBQVcsY0FBMUQsQ0FBaEI7QUFFQSxVQUFJLENBQUMsT0FBTCxFQUFjLE9BQU8sSUFBUDtBQUVkLFVBQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxDQUFELENBQVAsQ0FBVyxLQUFYLENBQWlCLEtBQUssS0FBTCxDQUFXLGFBQTVCLEVBQTJDLEdBQTNDLENBQStDLEVBQUMsQ0FBQyxJQUFqRCxDQUFkO0FBQUEsVUFDSSxLQUFLLEdBQUcsS0FBSyxDQUFDLENBQUQsQ0FBTCxDQUFTLEtBQVQsQ0FBZSxNQUFmLEVBQXVCLEdBQXZCLENBQTJCLEVBQUMsQ0FBQyxJQUE3QixDQURaO0FBQUEsVUFFSSxNQUFNLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBRCxDQUFOLEdBQVksSUFBWixHQUFtQixLQUFLLENBQUMsQ0FBRCxDQUFMLENBQVMsS0FBVCxDQUFlLEdBQWYsQ0FGaEM7QUFJQSxhQUFPO0FBQ0gsUUFBQSxTQUFTLEVBQUUsRUFBQyxDQUFDLElBQUYsQ0FBTyxLQUFLLENBQUMsQ0FBRCxDQUFaLENBRFI7QUFFSCxRQUFBLFNBQVMsRUFBRSxLQUZSO0FBR0gsUUFBQSxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUQsQ0FBTCxJQUFZLEVBSHBCO0FBSUgsUUFBQSxJQUFJLEVBQUUsSUFKSDtBQUtILFFBQUEsUUFBUSxFQUFFLEtBQUssT0FBTCxDQUFhLFFBQWIsQ0FBc0IsSUFBdEIsQ0FMUDtBQU1ILFFBQUEsT0FBTyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUQsQ0FBTCxJQUFZLEVBQWIsRUFBaUIsS0FBakIsQ0FBdUIsVUFBdkIsRUFBbUMsR0FBbkMsQ0FBdUMsVUFBQSxDQUFDO0FBQUEsaUJBQUksUUFBUSxDQUFDLENBQUQsQ0FBUixJQUFlLENBQW5CO0FBQUEsU0FBeEMsQ0FOTjtBQU9ILFFBQUEsTUFBTSxFQUFFLENBQUMsTUFBRCxHQUFVLElBQVYsR0FBaUIsRUFBQyxDQUFDLEdBQUYsQ0FBTSxNQUFOLEVBQWMsVUFBQSxDQUFDLEVBQUk7QUFDeEMsY0FBTSxJQUFJLEdBQUcsRUFBQyxDQUFDLElBQUYsQ0FBTyxDQUFQLEVBQVUsS0FBVixDQUFnQixHQUFoQixDQUFiOztBQUNBLGlCQUFPO0FBQUUsWUFBQSxJQUFJLEVBQUUsRUFBQyxDQUFDLElBQUYsQ0FBTyxJQUFJLENBQUMsQ0FBRCxDQUFYLENBQVI7QUFBeUIsWUFBQSxTQUFTLEVBQUUsRUFBQyxDQUFDLElBQUYsQ0FBTyxJQUFJLENBQUMsQ0FBRCxDQUFYO0FBQXBDLFdBQVA7QUFDSCxTQUh3QjtBQVB0QixPQUFQO0FBWUg7QUFFRDs7Ozs7Ozs7Ozs7cUNBUWlCLEUsRUFBSTtBQUFBOztBQUNqQixVQUFNLFlBQVksR0FBRyxFQUFyQjs7QUFFQSxXQUFLLE9BQUwsQ0FBYSxXQUFiLENBQXlCLFVBQUEsSUFBSSxFQUFJO0FBQzdCLFlBQU0sUUFBUSxHQUFHLE1BQUksQ0FBQyxhQUFMLENBQW1CLElBQW5CLENBQWpCOztBQUNBLFlBQUksUUFBSixFQUNJLFlBQVksQ0FBQyxJQUFiLENBQWtCLFFBQWxCO0FBQ1AsT0FKRDs7QUFNQSxhQUFPLFlBQVksQ0FDZCxJQURFLENBQ0csVUFBQyxDQUFELEVBQUksQ0FBSjtBQUFBLGVBQVUsQ0FBQyxDQUFDLFNBQUYsSUFBZSxDQUFDLENBQUMsSUFBRixDQUFPLE9BQVAsRUFBZixHQUFrQyxDQUFsQyxHQUFzQyxDQUFDLENBQUMsU0FBRixJQUFlLENBQUMsQ0FBQyxJQUFGLENBQU8sT0FBUCxFQUFmLEdBQWtDLENBQUMsQ0FBbkMsR0FBdUMsQ0FBdkY7QUFBQSxPQURILEVBRUYsT0FGRSxDQUVNLEVBRk4sQ0FBUDtBQUdIO0FBRUQ7Ozs7Ozs7Ozs7O2tDQVFjLEksRUFBTSxTLEVBQVc7QUFBQTs7QUFBQSxpQ0FDRCxLQUFLLGNBQUwsQ0FBb0IsU0FBcEIsQ0FEQztBQUFBLFVBQ25CLElBRG1CLHdCQUNuQixJQURtQjtBQUFBLFVBQ2IsT0FEYSx3QkFDYixPQURhOztBQUczQixVQUFJLENBQUMsS0FBSyxDQUFDLE9BQU4sQ0FBYyxJQUFkLENBQUwsRUFDSSxJQUFJLEdBQUcsRUFBQyxDQUFDLEdBQUYsQ0FBTSxJQUFOLEVBQVksSUFBWixFQUFrQixJQUFsQixDQUFQLENBREosS0FFSyxJQUFJLElBQUksQ0FBQyxLQUFMLEtBQWUsU0FBbkIsRUFDRCxJQUFJLEdBQUcsQ0FBQyxTQUFELEdBQWEsSUFBYixHQUFvQixFQUFDLENBQUMsR0FBRixDQUFNLElBQU4sRUFBWSxVQUFBLEtBQUs7QUFBQSxlQUFJLE1BQUksQ0FBQyxhQUFMLENBQW1CLEtBQW5CLEVBQTBCLFNBQTFCLENBQUo7QUFBQSxPQUFqQixDQUEzQixDQURDLEtBRUEsSUFBSSxDQUFDLE9BQUwsRUFDRCxPQUFPLElBQUksQ0FBQyxJQUFMLENBQVUsS0FBSyxLQUFMLENBQVcsUUFBWCxJQUF1QixHQUFqQyxDQUFQO0FBRUosYUFBTyxDQUFDLE9BQUQsR0FBVyxJQUFYLEdBQWtCLE9BQU8sQ0FBQyxJQUFELEVBQU8sSUFBUCxFQUFhLEtBQUssS0FBbEIsQ0FBaEM7QUFDSDtBQUVEOzs7Ozs7Ozs7OztnQ0FRWSxJLEVBQU0sUyxFQUFXLEcsRUFBSztBQUFBOztBQUM5QixVQUFJLElBQUksR0FBRyxTQUFTLENBQUMsR0FBRCxDQUFwQjtBQUFBLFVBQ0ksS0FBSyxHQUFHLEVBRFo7QUFBQSxVQUVJLFVBQVUsR0FBRyxLQUZqQjtBQUFBLFVBR0ksSUFBSSxHQUFHLElBSFg7O0FBS0EsVUFBSSxDQUFDLElBQUQsSUFBUyxJQUFJLElBQUksR0FBckIsRUFBMEI7QUFDdEIsUUFBQSxVQUFVLEdBQUcsSUFBYjtBQUNBLFFBQUEsSUFBSSxHQUFHLFNBQVMsQ0FBQyxFQUFFLEdBQUgsQ0FBaEI7QUFDSDs7QUFFRCxVQUFJLENBQUMsSUFBTCxFQUFXLE9BQU8sSUFBUCxDQVhtQixDQWE5Qjs7QUFDQSxVQUFNLFVBQVUsR0FBRyxLQUFLLGNBQUwsQ0FBb0IsSUFBcEIsQ0FBbkI7QUFFQSxNQUFBLElBQUksR0FBRyxFQUFDLENBQUMsR0FBRixDQUFNLElBQU4sRUFBWSxVQUFVLENBQUMsSUFBdkIsRUFBNkIsSUFBN0IsQ0FBUDtBQUVBLFVBQUksT0FBTyxVQUFVLENBQUMsT0FBbEIsS0FBOEIsVUFBbEMsRUFDSSxJQUFJLEdBQUcsVUFBVSxDQUFDLE9BQVgsQ0FBbUIsSUFBbkIsQ0FBd0IsSUFBeEIsRUFBOEIsSUFBOUIsRUFBb0MsSUFBcEMsRUFBMEMsS0FBSyxLQUEvQyxDQUFQOztBQUVKLFVBQUksR0FBRyxHQUFHLFNBQVMsQ0FBQyxNQUFWLEdBQW1CLENBQTdCLEVBQWdDO0FBQzVCLFFBQUEsSUFBSSxHQUFHLEVBQUMsQ0FBQyxHQUFGLENBQU0sSUFBTixFQUFZLFVBQUEsTUFBTTtBQUFBLGlCQUFJLE1BQUksQ0FBQyxXQUFMLENBQWlCLE1BQWpCLEVBQXlCLFNBQXpCLEVBQW9DLEdBQUcsR0FBRyxDQUExQyxDQUFKO0FBQUEsU0FBbEIsQ0FBUDtBQUNBLFFBQUEsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFELENBQUosQ0FBUSxLQUFoQjtBQUNILE9BSEQsTUFHTyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU4sQ0FBYyxJQUFkLENBQUQsSUFBd0IsUUFBTyxJQUFQLE1BQWdCLFFBQTVDLEVBQ0gsSUFBSSxHQUFHLEVBQUMsQ0FBQyxNQUFGLENBQVMsSUFBVCxDQUFQOztBQUVKLE1BQUEsS0FBSyxDQUFDLE9BQU4sQ0FBYyxVQUFVLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBVCxHQUFrQixJQUFJLENBQUMsTUFBL0M7QUFDQSxNQUFBLElBQUksQ0FBQyxLQUFMLEdBQWEsS0FBYjtBQUNBLGFBQU8sSUFBUDtBQUNIO0FBRUQ7Ozs7Ozs7Ozs7OzhCQVFVLEksRUFBTSxJLEVBQU0sUSxFQUFVO0FBQUE7O0FBQzVCLFVBQUksU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFyQjtBQUFBLFVBQ0ksS0FBSyxHQUFHLEtBQUssYUFBTCxDQUFtQixJQUFuQixFQUF5QixRQUFRLENBQUMsU0FBbEMsQ0FEWixDQUQ0QixDQUk1Qjs7QUFDQSxVQUFJLENBQUMsU0FBRCxJQUFjLENBQUMsU0FBUyxDQUFDLE1BQTdCLEVBQXFDO0FBQ2pDLGFBQUssT0FBTCxDQUNLLFFBREwsQ0FDYyxJQURkLEVBQ29CLEtBRHBCLEVBRUssU0FGTCxDQUVlLElBRmYsRUFFcUIsUUFBUSxDQUFDLElBRjlCLEVBR0ssUUFITCxDQUdjLElBSGQsRUFHb0IsUUFBUSxDQUFDLElBSDdCOztBQUlBLGFBQUssY0FBTCxDQUFvQixJQUFwQixFQUEwQixJQUExQixFQUFnQyxRQUFoQztBQUNBLFFBQUEsU0FBUyxHQUFHLFFBQVEsQ0FBQyxRQUFyQjtBQUNILE9BUEQsTUFPTyxJQUFJLFNBQVMsQ0FBQyxNQUFWLElBQW9CLENBQXhCLEVBQTJCO0FBQzlCO0FBQ0EsWUFBSSxTQUFTLENBQUMsQ0FBRCxDQUFULEdBQWUsQ0FBbkIsRUFBc0I7QUFDbEIsVUFBQSxTQUFTLEdBQUcsQ0FBQyxDQUFELEVBQUksQ0FBQyxTQUFTLENBQUMsQ0FBRCxDQUFkLENBQVo7QUFDQSxVQUFBLEtBQUssR0FBRyxDQUFDLEtBQUQsQ0FBUjtBQUNILFNBSEQsTUFHTyxJQUFJLFNBQVMsQ0FBQyxNQUFWLElBQW9CLENBQXhCLEVBQTJCO0FBQzlCLFVBQUEsU0FBUyxHQUFHLFNBQVMsQ0FBQyxNQUFWLENBQWlCLENBQUMsQ0FBRCxDQUFqQixDQUFaO0FBQ0EsVUFBQSxLQUFLLEdBQUcsRUFBQyxDQUFDLEtBQUYsQ0FBUSxLQUFSLEVBQWUsQ0FBZixDQUFSO0FBQ0g7O0FBRUQsYUFBSyxPQUFMLENBQWEsWUFBYixDQUEwQixJQUExQixFQUFnQyxTQUFTLENBQUMsQ0FBRCxDQUFULEdBQWUsQ0FBL0MsRUFBa0QsU0FBUyxDQUFDLENBQUQsQ0FBVCxHQUFlLENBQWpFLEVBQW9FLE9BQXBFLENBQTRFLFVBQUMsSUFBRCxFQUFPLEVBQVAsRUFBVyxFQUFYLEVBQWtCO0FBQzFGLFVBQUEsTUFBSSxDQUFDLE9BQUwsQ0FDSyxRQURMLENBQ2MsSUFEZCxFQUNvQixLQUFLLENBQUMsRUFBRCxDQUFMLENBQVUsRUFBVixDQURwQixFQUVLLFNBRkwsQ0FFZSxJQUZmLEVBRXFCLFFBQVEsQ0FBQyxJQUY5QixFQUdLLFFBSEwsQ0FHYyxJQUhkLEVBR29CLFFBQVEsQ0FBQyxJQUg3Qjs7QUFJQSxVQUFBLE1BQUksQ0FBQyxjQUFMLENBQW9CLElBQXBCLEVBQTBCLElBQUksQ0FBQyxFQUFELENBQUosQ0FBUyxFQUFULENBQTFCLEVBQXdDLFFBQXhDO0FBQ0gsU0FORDtBQU9ILE9BakJNLE1BaUJBLENBQ0g7QUFDSDs7QUFFRCxhQUFPLFNBQVA7QUFDSDtBQUVEOzs7Ozs7Ozs7OzhCQU9VLEssRUFBTyxJLEVBQU0sUSxFQUFVO0FBQUE7O0FBQzdCLFVBQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxRQUF2QjtBQUFBLFVBQ0ksT0FBTyxHQUFHLEtBQUssV0FBTCxDQUFpQixJQUFqQixFQUF1QixRQUFRLENBQUMsU0FBaEMsRUFBMkMsQ0FBM0MsQ0FEZDtBQUdBLFVBQUksU0FBUyxHQUFHLENBQUMsQ0FBRCxFQUFJLENBQUosQ0FBaEI7QUFFQSxVQUFJLENBQUMsS0FBSyxDQUFDLFVBQVAsSUFBcUIsQ0FBQyxLQUFLLENBQUMsVUFBTixDQUFpQixNQUEzQyxFQUNJLFNBQVMsR0FBRyxLQUFLLFNBQUwsQ0FBZSxRQUFmLEVBQXlCLE9BQXpCLEVBQWtDLFFBQWxDLENBQVosQ0FESixLQUVLO0FBQ0QsWUFBSSxRQUFRLEdBQUcsUUFBZjs7QUFDQSxZQUFNLFVBQVUsR0FBRyxTQUFiLFVBQWEsQ0FBQyxHQUFELEVBQU0sR0FBTjtBQUFBLGlCQUFjLFNBQVMsQ0FBQyxHQUFELENBQVQsR0FBaUIsSUFBSSxDQUFDLEdBQUwsQ0FBUyxTQUFTLENBQUMsR0FBRCxDQUFsQixFQUF5QixHQUF6QixDQUEvQjtBQUFBLFNBQW5COztBQUVBLGFBQUssSUFBSSxDQUFDLEdBQUcsQ0FBYixFQUFnQixDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQTVCLEVBQW9DLEVBQUUsQ0FBdEMsRUFBeUM7QUFDckMsY0FBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLENBQUQsQ0FBdEI7O0FBRUEsZUFBSyxJQUFJLENBQUMsR0FBRyxDQUFiLEVBQWdCLENBQUMsR0FBRyxLQUFLLENBQUMsVUFBTixDQUFpQixNQUFyQyxFQUE2QyxFQUFFLENBQS9DLEVBQWtEO0FBQzlDLGdCQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsVUFBTixDQUFpQixDQUFqQixDQUFmO0FBQUEsZ0JBQ0ksTUFBTSxHQUFHLFFBQVEsQ0FBQyxZQUFULENBQXNCLE1BQU0sQ0FBQyxNQUFQLENBQWMsQ0FBZCxDQUF0QixFQUF3QyxNQUFNLENBQUMsTUFBUCxDQUFjLENBQWQsQ0FBeEMsQ0FEYjtBQUFBLGdCQUVJLFNBQVMsR0FBRyxLQUFLLFNBQUwsQ0FBZSxNQUFmLEVBQXVCLE1BQXZCLEVBQStCLE1BQS9CLENBRmhCOztBQUlBLFlBQUEsRUFBQyxDQUFDLE9BQUYsQ0FBVSxTQUFWLEVBQXFCLFVBQXJCOztBQUNBLFlBQUEsTUFBTSxDQUFDLFNBQVAsR0FBbUIsSUFBbkI7QUFDSCxXQVZvQyxDQVlyQzs7O0FBQ0EsVUFBQSxFQUFDLENBQUMsT0FBRixDQUFVLEtBQUssU0FBTCxDQUFlLFFBQWYsRUFBeUIsTUFBekIsRUFBaUMsUUFBakMsQ0FBVixFQUFzRCxVQUF0RDs7QUFFQSxjQUFJLFNBQVMsR0FBRyxTQUFTLENBQUMsQ0FBRCxDQUF6QjtBQUFBLGNBQ0ksU0FBUyxHQUFHLFNBQVMsQ0FBQyxDQUFELENBRHpCLENBZnFDLENBa0JyQzs7QUFDQSxjQUFJLE9BQU8sQ0FBQyxLQUFSLENBQWMsQ0FBZCxJQUFtQixDQUF2QixFQUEwQjtBQUN0QixZQUFBLFNBQVMsR0FBRyxDQUFaO0FBQ0EsWUFBQSxTQUFTLENBQUMsQ0FBRCxDQUFULEdBQWUsQ0FBZjtBQUNILFdBSEQsTUFHTztBQUNILFlBQUEsU0FBUyxHQUFHLENBQVo7QUFDQSxZQUFBLFNBQVMsQ0FBQyxDQUFELENBQVQsR0FBZSxDQUFmO0FBQ0g7O0FBRUQsY0FBSSxTQUFTLEdBQUcsQ0FBWixJQUFpQixTQUFTLEdBQUcsQ0FBakMsRUFBb0M7QUFDaEMsZ0JBQU0sR0FBRyxHQUFHLEtBQUssT0FBTCxDQUFhLFlBQWIsQ0FBMEIsUUFBMUIsRUFBb0MsSUFBSSxDQUFDLEdBQUwsQ0FBUyxTQUFTLEdBQUcsQ0FBckIsRUFBd0IsQ0FBeEIsQ0FBcEMsRUFBZ0UsSUFBSSxDQUFDLEdBQUwsQ0FBUyxTQUFTLEdBQUcsQ0FBckIsRUFBd0IsQ0FBeEIsQ0FBaEUsQ0FBWjs7QUFDQSxpQkFBSyxPQUFMLENBQWEsY0FBYixDQUE0QixHQUE1QixFQUFpQyxJQUFqQzs7QUFDQSxZQUFBLEdBQUcsQ0FBQyxPQUFKLENBQVksVUFBQSxJQUFJO0FBQUEscUJBQUksTUFBSSxDQUFDLE9BQUwsQ0FBYSxRQUFiLENBQXNCLElBQXRCLEVBQTRCLFFBQVEsQ0FBQyxJQUFyQyxDQUFKO0FBQUEsYUFBaEI7QUFDSCxXQS9Cb0MsQ0FpQ3JDOzs7QUFDQSxVQUFBLFFBQVEsR0FBRyxRQUFRLENBQUMsWUFBVCxDQUFzQixTQUFTLEdBQUcsUUFBUSxDQUFDLE9BQVQsQ0FBaUIsQ0FBakIsQ0FBbEMsRUFBdUQsU0FBUyxHQUFHLFFBQVEsQ0FBQyxPQUFULENBQWlCLENBQWpCLENBQVosSUFBbUMsQ0FBMUYsQ0FBWDtBQUNILFNBdkNBLENBeUNEOzs7QUFDQSxRQUFBLEVBQUMsQ0FBQyxPQUFGLENBQVUsS0FBSyxPQUFMLENBQWEsWUFBYixDQUEwQixRQUExQixFQUFvQyxRQUFwQyxDQUFWLEVBQXlELFVBQXpEO0FBQ0g7QUFFRCxhQUFPLFNBQVA7QUFDSDtBQUVEOzs7Ozs7Ozs2QkFLUyxJLEVBQU07QUFBQTs7QUFDWCxVQUFNLFNBQVMsR0FBRyxFQUFsQixDQURXLENBR1g7O0FBQ0EsV0FBSyxnQkFBTCxDQUFzQixVQUFBLFFBQVEsRUFBSTtBQUM5QixZQUFNLEtBQUssR0FBRztBQUNWLFVBQUEsUUFBUSxFQUFFLFFBREE7QUFFVixVQUFBLFVBQVUsRUFBRSxFQUZGO0FBR1YsVUFBQSxTQUFTLEVBQUU7QUFIRCxTQUFkOztBQU1BLFlBQUksUUFBUSxDQUFDLFNBQWIsRUFBd0I7QUFDcEIsY0FBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxTQUFWLENBQXpCO0FBRUEsVUFBQSxPQUFPLENBQUMsVUFBUixDQUFtQixJQUFuQixDQUF3QixLQUF4QjtBQUNBLFVBQUEsS0FBSyxDQUFDLE1BQU4sR0FBZSxNQUFJLENBQUMsT0FBTCxDQUFhLFlBQWIsQ0FBMEIsT0FBTyxDQUFDLFFBQVIsQ0FBaUIsSUFBM0MsRUFBaUQsUUFBUSxDQUFDLElBQTFELENBQWY7QUFDSDs7QUFFRCxRQUFBLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBVCxDQUFjLE9BQWQsRUFBRCxDQUFULEdBQXFDLEtBQXJDO0FBQ0gsT0FmRCxFQUpXLENBcUJYOztBQUNBLE1BQUEsRUFBQyxDQUFDLElBQUYsQ0FBTyxTQUFQLEVBQWtCLFVBQUEsSUFBSSxFQUFJO0FBQ3RCLFlBQUksQ0FBQyxJQUFJLENBQUMsU0FBVixFQUNJLE1BQUksQ0FBQyxTQUFMLENBQWUsSUFBZixFQUFxQixJQUFyQixFQUEyQixJQUFJLENBQUMsUUFBTCxDQUFjLElBQXpDO0FBQ1AsT0FIRDs7QUFLQSxhQUFPLElBQVA7QUFDSDs7Ozs7QUFHTDs7Ozs7O0FBSUEsWUFBWSxDQUFDLGtCQUFiLEdBQWtDLE9BQU8sQ0FBQyxzQkFBRCxDQUF6QztBQUVBLE1BQU0sQ0FBQyxPQUFQLEdBQWlCLFlBQWpCOzs7QUNuV0E7Ozs7Ozs7O0FBRUEsSUFBTSxDQUFDLEdBQUcsT0FBTyxDQUFDLFFBQUQsQ0FBakI7O0FBRUEsSUFBSSxTQUFTLEdBQUcsSUFBaEIsQyxDQUVBOztBQUVBOzs7OztJQUlNLGtCOzs7QUFDRjs7Ozs7Ozs7QUFRQSw4QkFBWSxRQUFaLEVBQXNCLFlBQXRCLEVBQW9DO0FBQUE7O0FBQ2hDLFNBQUssU0FBTCxHQUFpQixRQUFqQjtBQUNBLFNBQUssU0FBTCxHQUFpQixFQUFqQjtBQUNBLFNBQUssU0FBTCxHQUFpQixFQUFqQjtBQUVBLElBQUEsU0FBUyxHQUFHLFlBQVksQ0FBQyxRQUF6QjtBQUNIO0FBRUQ7Ozs7Ozs7OytCQUlXO0FBQ1AsYUFBTyxLQUFLLFNBQVo7QUFDSDtBQUVEOzs7Ozs7OztrQ0FLYyxJLEVBQU07QUFDaEIsVUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUwsRUFBbEI7QUFDQSxhQUFPLFNBQVMsWUFBWSxTQUFyQixHQUFpQyxTQUFTLENBQUMsSUFBVixFQUFqQyxHQUFvRCxTQUEzRDtBQUNIO0FBRUQ7Ozs7Ozs7OztpQ0FNYSxJLEVBQU0sRSxFQUFJO0FBQ25CLGFBQU8sQ0FDSCxFQUFFLENBQUMsU0FBSCxLQUFpQixJQUFJLENBQUMsU0FBTCxFQURkLEVBRUgsRUFBRSxDQUFDLFlBQUgsS0FBb0IsSUFBSSxDQUFDLFlBQUwsRUFGakIsQ0FBUDtBQUlIO0FBRUQ7Ozs7Ozs7OzZCQUtTLEksRUFBTTtBQUFBOztBQUNYLFVBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFMLEVBQWpCO0FBQ0EsVUFBSSxPQUFPLEdBQUcsQ0FBQyxDQUFELEVBQUksQ0FBSixDQUFkOztBQUVBLE1BQUEsQ0FBQyxDQUFDLE9BQUYsQ0FBVSxJQUFJLENBQUMsS0FBTCxHQUFhLFdBQXZCLEVBQW9DLFVBQUEsS0FBSyxFQUFJO0FBQ3pDLFlBQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxVQUFOLENBQWlCLEdBQWpCLENBQXFCLEtBQXJCLENBQTJCLEdBQTNCLENBQWxCOztBQUNBLFlBQUksU0FBUyxDQUFDLENBQUQsQ0FBVCxJQUFnQixRQUFwQixFQUE4QjtBQUMxQixVQUFBLE9BQU8sR0FBRyxLQUFJLENBQUMsWUFBTCxDQUFrQixJQUFsQixFQUF3QixJQUFJLENBQUMsS0FBTCxHQUFhLElBQWIsQ0FBa0IsU0FBUyxDQUFDLENBQUQsQ0FBM0IsQ0FBeEIsQ0FBVjtBQUNBLFlBQUUsT0FBTyxDQUFDLENBQUQsQ0FBVDtBQUNBLFlBQUUsT0FBTyxDQUFDLENBQUQsQ0FBVDtBQUNBLGlCQUFPLEtBQVA7QUFDSDtBQUNKLE9BUkQ7O0FBVUEsYUFBTyxPQUFQO0FBQ0g7QUFFRDs7Ozs7Ozs7OzRCQU1RLE8sRUFBUyxPLEVBQVM7QUFDdEIsVUFBTSxRQUFRLEdBQUcsT0FBTyxJQUFJLElBQVgsR0FBa0IsS0FBSyxTQUFMLENBQWUsV0FBZixFQUFsQixHQUFpRCxLQUFLLFNBQUwsQ0FBZSxLQUFmLENBQXFCLE9BQXJCLENBQWxFO0FBQ0EsYUFBTyxRQUFRLENBQUMsSUFBVCxDQUFjLE9BQWQsQ0FBUDtBQUNIO0FBRUQ7Ozs7Ozs7Ozs7aUNBT2EsSSxFQUFNLFMsRUFBVyxTLEVBQVc7QUFDckMsYUFBTyxJQUFJLENBQUMsT0FBTCxDQUFhLElBQUksQ0FBQyxZQUFMLENBQWtCLFNBQWxCLEVBQTZCLFNBQTdCLENBQWIsQ0FBUDtBQUNIO0FBRUQ7Ozs7Ozs7OzttQ0FNZSxLLEVBQU8sTSxFQUFRO0FBQzFCLE1BQUEsS0FBSyxDQUFDLE1BQU4sQ0FBYSxNQUFiO0FBQ0EsYUFBTyxJQUFQO0FBQ0g7QUFFRDs7Ozs7Ozs7Z0NBS1ksRSxFQUFJO0FBQ1osV0FBSyxTQUFMLENBQWUsTUFBZixHQUF3QixPQUF4QixDQUFnQyxVQUFBLEtBQUs7QUFBQSxlQUFJLEtBQUssQ0FBQyxTQUFOLEdBQWtCLE9BQWxCLENBQTBCLEVBQTFCLENBQUo7QUFBQSxPQUFyQzs7QUFDQSxhQUFPLElBQVA7QUFDSDtBQUVEOzs7Ozs7Ozs7OEJBTVUsSSxFQUFNLEcsRUFBSztBQUNqQixVQUFJLEdBQUcsSUFBSSxJQUFYLEVBQWlCLE9BQU8sSUFBUDtBQUVqQixNQUFBLElBQUksQ0FBQyxRQUFMLEdBQWdCLEdBQUcsQ0FBQyxRQUFwQjtBQUNBLFVBQUksR0FBRyxDQUFDLE1BQVIsRUFDSSxJQUFJLENBQUMsTUFBTCxHQUFjLENBQUMsQ0FBQyxLQUFGLENBQVEsRUFBUixFQUFZLEdBQUcsQ0FBQyxNQUFoQixDQUFkO0FBRUosYUFBTyxJQUFQO0FBQ0g7QUFFRDs7Ozs7Ozs7OzZCQU1TLEksRUFBTSxHLEVBQUs7QUFDaEIsVUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFNBQUwsRUFBWjtBQUFBLFVBQ0ksR0FBRyxHQUFHLElBQUksQ0FBQyxZQUFMLEVBRFY7QUFHQSxVQUFJLEtBQUssU0FBTCxDQUFlLEdBQWYsTUFBd0IsU0FBNUIsRUFDSSxJQUFJLENBQUMsR0FBTCxHQUFXLE1BQVgsQ0FBa0IsS0FBSyxTQUFMLENBQWUsR0FBZixJQUFzQixHQUFHLENBQUMsR0FBSixHQUFVLE1BQVYsRUFBeEM7QUFFSixVQUFJLEtBQUssU0FBTCxDQUFlLEdBQWYsTUFBd0IsU0FBNUIsRUFDSSxJQUFJLENBQUMsTUFBTCxHQUFjLEtBQWQsQ0FBb0IsS0FBSyxTQUFMLENBQWUsR0FBZixJQUFzQixHQUFHLENBQUMsTUFBSixHQUFhLEtBQWIsRUFBMUM7QUFFSixhQUFPLElBQVA7QUFDSDtBQUVEOzs7Ozs7Ozs7NkJBTVMsSSxFQUFNLEssRUFBTztBQUNsQixNQUFBLElBQUksQ0FBQyxLQUFMLENBQVcsS0FBWDtBQUNBLGFBQU8sSUFBUDtBQUNIO0FBRUQ7Ozs7Ozs7Ozs7NkJBT1MsSSxFQUFNLEksRUFBTSxLLEVBQU87QUFDeEIsTUFBQSxJQUFJLENBQUMsS0FBTCxDQUFXLElBQVgsRUFBaUIsS0FBakI7QUFDQSxhQUFPLElBQVA7QUFDSDs7Ozs7O0FBR0wsTUFBTSxDQUFDLE9BQVAsR0FBaUIsa0JBQWpCIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmNvbnN0IF8gPSByZXF1aXJlKCdsb2Rhc2gnKTtcbmNvbnN0IGRlZmF1bHRPcHRzID0ge1xuICAgIHRlbXBsYXRlUmVnRXhwOiBuZXcgUmVnRXhwKC9cXHtcXHsoW159XSopXFx9XFx9LyksXG4gICAgZmllbGRTcGxpdHRlcjogXCJ8XCIsXG4gICAgam9pblRleHQ6IFwiLFwiLFxuICAgIGNhbGxiYWNrc01hcDoge1xuICAgICAgICBcIlwiOiBkYXRhID0+IF8ua2V5cyhkYXRhKVxuICAgIH1cbn07XG5cbi8qKlxuICogRGF0YSBmaWxsIGVuZ2luZS5cbiAqL1xuY2xhc3MgWGxzeERhdGFGaWxsIHtcbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGEgbmV3IGluc3RhbmNlIG9mIFhsc3hEYXRhRmlsbCB3aXRoIGdpdmVuIG9wdGlvbnMuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGFjY2Vzc29yIEFuIGluc3RhbmNlIG9mIFhMU1ggZGF0YSBhY2Nlc3NpbmcgY2xhc3MuXG4gICAgICogQHBhcmFtIHt7fX0gb3B0cyBPcHRpb25zIHRvIGJlIHVzZWQgZHVyaW5nIHByb2Nlc3NpbmcuXG4gICAgICogQHBhcmFtIHtSZWdFeHB9IG9wdHMudGVtcGxhdGVSZWdFeHAgVGhlIHJlZ3VsYXIgZXhwcmVzc2lvbiB0byBiZSB1c2VkIGZvciB0ZW1wbGF0ZSBwYXJzaW5nLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBvcHRzLmZpZWxkU3BsaXR0ZXIgVGhlIHN0cmluZyB0byBiZSBleHBlY3RlZCBhcyB0ZW1wbGF0ZSBmaWVsZCBzcGxpdHRlci5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gb3B0cy5qb2luVGV4dCBUaGUgc3RyaW5nIHRvIGJlIHVzZWQgd2hlbiBleHRyYWN0aW5nIGFycmF5IHZhbHVlcy5cbiAgICAgKiBAcGFyYW0ge29iamVjdC48c3RyaW5nLCBmdW5jdGlvbj59IG9wdHMuY2FsbGJhY2tzTWFwIEEgbWFwIG9mIGhhbmRsZXJzIHRvIGJlIHVzZWQgZm9yIGRhdGEgZXh0cmFjdGlvbi5cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihhY2Nlc3Nvciwgb3B0cykge1xuICAgICAgICB0aGlzLl9vcHRzID0gXy5kZWZhdWx0c0RlZXAoe30sIG9wdHMsIGRlZmF1bHRPcHRzKTtcbiAgICAgICAgdGhpcy5fcm93U2l6ZXMgPSB7fTtcbiAgICAgICAgdGhpcy5fY29sU2l6ZXMgPSB7fTtcbiAgICAgICAgdGhpcy5fYWNjZXNzID0gYWNjZXNzb3I7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0dGVyL2dldHRlciBmb3IgWGxzeERhdGFGaWxsJ3Mgb3B0aW9ucyBhcyBzZXQgZHVyaW5nIGNvbnN0cnVjdGlvbi5cbiAgICAgKiBAcGFyYW0ge3t9fG51bGx9IG5ld09wdHMgSWYgc2V0IC0gdGhlIG5ld3Mgb3B0aW9ucyB0byBiZSB1c2VkLlxuICAgICAqIEByZXR1cm5zIHtYbHN4RGF0YUZpbGx8e319IFRoZSByZXF1aXJlZCBvcHRpb25zIG9yIFhsc3hEYXRhRmlsbCAoaW4gc2V0IG1vZGUpIGZvciBjaGFpbmluZy5cbiAgICAgKi9cbiAgICBvcHRpb25zKG5ld09wdHMpIHtcbiAgICAgICAgaWYgKG5ld09wdHMgIT09IG51bGwpIHtcbiAgICAgICAgICAgIF8ubWVyZ2UodGhpcy5fb3B0cywgbmV3T3B0cyk7XG4gICAgICAgICAgICB0aGlzLl9hY2Nlc3Mub3B0aW9ucyh0aGlzLl9vcHRzKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9IGVsc2VcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9vcHRzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBhcnNlcyB0aGUgcHJvdmlkZWQgZXh0cmFjdG9yIChvdCBpdGVyYXRvcikgc3RyaW5nIHRvIGZpbmQgYSBjYWxsYmFjayBpZCBpbnNpZGUsIGlmIHByZXNlbnQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGV4dHJhY3RvciBUaGUgaXRlcmF0b3IvZXh0cmFjdG9yIHN0cmluZyB0byBiZSBpbnZlc3RpZ2F0ZWQuXG4gICAgICogQHJldHVybnMge29iamVjdC48c3RyaW5nLCBmdW5jdGlvbj59IEEgeyBgcGF0aGAsIGBoYW5kbGVyYCB9IG9iamVjdCByZXByZXNlbnRpbmcgdGhlIEpTT04gcGF0aFxuICAgICAqIHJlYWR5IGZvciB1c2UgYW5kIHRoZSBwcm92aWRlZCBgaGFuZGxlcmAgX2Z1bmN0aW9uXyAtIHJlYWR5IGZvciBpbnZva2luZywgaWYgc3VjaCBpcyBwcm92aWRlZC5cbiAgICAgKiBJZiBub3QgLSB0aGUgYHBhdGhgIHByb3BlcnR5IGNvbnRhaW5zIHRoZSBwcm92aWRlZCBgZXh0cmFjdG9yYCwgYW5kIHRoZSBgaGFuZGxlcmAgaXMgYG51bGxgLlxuICAgICAqL1xuICAgIHBhcnNlRXh0cmFjdG9yKGV4dHJhY3Rvcikge1xuICAgICAgICAvLyBBIHNwZWNpZmljIGV4dHJhY3RvciBjYW4gYmUgc3BlY2lmaWVkIGFmdGVyIHNlbWlsb24gLSBmaW5kIGFuZCByZW1lbWJlciBpdC5cbiAgICAgICAgY29uc3QgZXh0cmFjdFBhcnRzID0gZXh0cmFjdG9yLnNwbGl0KFwiOlwiKTtcblxuICAgICAgICByZXR1cm4gZXh0cmFjdFBhcnRzLmxlbmd0aCA9PSAxXG4gICAgICAgICAgICA/IHsgcGF0aDogZXh0cmFjdG9yLCBoYW5kbGVyOiBudWxsIH1cbiAgICAgICAgICAgIDoge1xuICAgICAgICAgICAgICAgIHBhdGg6IGV4dHJhY3RQYXJ0c1swXSxcbiAgICAgICAgICAgICAgICBoYW5kbGVyOiB0aGlzLl9vcHRzLmNhbGxiYWNrc01hcFtleHRyYWN0UGFydHNbMV1dXG4gICAgICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFwcGxpZXMgdGhlIHN0eWxlIHBhcnQgb2YgdGhlIHRlbXBsYXRlIG9udG8gYSBnaXZlbiBjZWxsLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgZGVzdGluYXRpb24gY2VsbCB0byBhcHBseSBzdHlsaW5nIHRvLlxuICAgICAqIEBwYXJhbSB7e319IGRhdGEgVGhlIGRhdGEgY2h1bmsgZm9yIHRoYXQgY2VsbC5cbiAgICAgKiBAcGFyYW0ge3t9fSB0ZW1wbGF0ZSBUaGUgdGVtcGxhdGUgdG8gYmUgdXNlZCBmb3IgdGhhdCBjZWxsLlxuICAgICAqIEByZXR1cm5zIHtEYXRhRmlsbGVyfSBGb3IgaW52b2NhdGlvbiBjaGFpbmluZy5cbiAgICAgKi9cbiAgICBhcHBseURhdGFTdHlsZShjZWxsLCBkYXRhLCB0ZW1wbGF0ZSkge1xuICAgICAgICBjb25zdCBzdHlsZXMgPSB0ZW1wbGF0ZS5zdHlsZXM7XG4gICAgICAgIFxuICAgICAgICBpZiAoc3R5bGVzICYmIGRhdGEpIHtcbiAgICAgICAgICAgIF8uZWFjaChzdHlsZXMsIHBhaXIgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChfLnN0YXJ0c1dpdGgocGFpci5uYW1lLCBcIjpcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaGFuZGxlciA9IHRoaXMuX29wdHMuY2FsbGJhY2tzTWFwW3BhaXIubmFtZS5zdWJzdHIoMSldO1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGhhbmRsZXIgPT09ICdmdW5jdGlvbicpXG4gICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVyKGRhdGEsIGNlbGwsIHRoaXMuX29wdHMpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbCA9IHRoaXMuZXh0cmFjdFZhbHVlcyhkYXRhLCBwYWlyLmV4dHJhY3Rvcik7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWwpXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9hY2Nlc3Muc2V0U3R5bGUoY2VsbCwgcGFpci5uYW1lLCB2YWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBQYXJzZXMgdGhlIGNvbnRlbnRzIG9mIHRoZSBjZWxsIGludG8gYSB2YWxpZCB0ZW1wbGF0ZSBpbmZvLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgY2VsbCBjb250YWluaW5nIHRoZSB0ZW1wbGF0ZSB0byBiZSBwYXJzZWQuXG4gICAgICogQHJldHVybnMge3t9fSBUaGUgcGFyc2VkIHRlbXBsYXRlLlxuICAgICAqIEBkZXNjcmlwdGlvbiBUaGlzIG1ldGhvZCBidWlsZHMgdGVtcGxhdGUgaW5mbywgdGFraW5nIGludG8gYWNjb3VudCB0aGUgc3VwcGxpZWQgb3B0aW9ucy5cbiAgICAgKi9cbiAgICBwYXJzZVRlbXBsYXRlKGNlbGwpIHtcbiAgICAgICAgLy8gVGhlIG9wdGlvbnMgYXJlIGluIGB0aGlzYCBhcmd1bWVudC5cbiAgICAgICAgY29uc3QgcmVNYXRjaCA9ICh0aGlzLl9hY2Nlc3MuY2VsbFRleHRWYWx1ZShjZWxsKSB8fCAnJykubWF0Y2godGhpcy5fb3B0cy50ZW1wbGF0ZVJlZ0V4cCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoIXJlTWF0Y2gpIHJldHVybiBudWxsO1xuICAgIFxuICAgICAgICBjb25zdCBwYXJ0cyA9IHJlTWF0Y2hbMV0uc3BsaXQodGhpcy5fb3B0cy5maWVsZFNwbGl0dGVyKS5tYXAoXy50cmltKSxcbiAgICAgICAgICAgIGl0ZXJzID0gcGFydHNbMV0uc3BsaXQoL3h8XFwqLykubWFwKF8udHJpbSksXG4gICAgICAgICAgICBzdHlsZXMgPSAhcGFydHNbNF0gPyBudWxsIDogcGFydHNbNF0uc3BsaXQoXCIsXCIpO1xuICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVmZXJlbmNlOiBfLnRyaW0ocGFydHNbMF0pLFxuICAgICAgICAgICAgaXRlcmF0b3JzOiBpdGVycyxcbiAgICAgICAgICAgIGV4dHJhY3RvcjogcGFydHNbMl0gfHwgXCJcIixcbiAgICAgICAgICAgIGNlbGw6IGNlbGwsXG4gICAgICAgICAgICBjZWxsU2l6ZTogdGhpcy5fYWNjZXNzLmNlbGxTaXplKGNlbGwpLFxuICAgICAgICAgICAgcGFkZGluZzogKHBhcnRzWzNdIHx8IFwiXCIpLnNwbGl0KC86fCx8eHxcXCovKS5tYXAodiA9PiBwYXJzZUludCh2KSB8fCAwKSxcbiAgICAgICAgICAgIHN0eWxlczogIXN0eWxlcyA/IG51bGwgOiBfLm1hcChzdHlsZXMsIHMgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhaXIgPSBfLnRyaW0ocykuc3BsaXQoXCI9XCIpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IG5hbWU6IF8udHJpbShwYWlyWzBdKSwgZXh0cmFjdG9yOiBfLnRyaW0ocGFpclsxXSkgfTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2VhcmNoZXMgdGhlIHdob2xlIHdvcmtib29rIGZvciB0ZW1wbGF0ZSBwYXR0ZXJuIGFuZCBjb25zdHJ1Y3RzIHRoZSB0ZW1wbGF0ZXMgZm9yIHByb2Nlc3NpbmcuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgVGhlIGNhbGxiYWNrIHRvIGJlIGludm9rZWQgb24gZWFjaCB0ZW1wbGF0ZWQsIGFmdGVyIHRoZXkgYXJlIHNvcnRlZC5cbiAgICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgICAqIEBkZXNjcmlwdGlvbiBUaGUgdGVtcGxhdGVzIGNvbGxlY3RlZCBhcmUgc29ydGVkLCBiYXNlZCBvbiB0aGUgaW50cmEtdGVtcGxhdGUgcmVmZXJlbmNlIC0gaWYgb25lIHRlbXBsYXRlXG4gICAgICogaXMgcmVmZXJyaW5nIGFub3RoZXIgb25lLCBpdCdsbCBhcHBlYXIgX2xhdGVyXyBpbiB0aGUgcmV0dXJuZWQgYXJyYXksIHRoYW4gdGhlIHJlZmVycmVkIHRlbXBsYXRlLlxuICAgICAqIFRoaXMgaXMgdGhlIG9yZGVyIHRoZSBjYWxsYmFjayBpcyBiZWluZyBpbnZva2VkIG9uLlxuICAgICAqL1xuICAgIGNvbGxlY3RUZW1wbGF0ZXMoY2IpIHtcbiAgICAgICAgY29uc3QgYWxsVGVtcGxhdGVzID0gW107XG4gICAgXG4gICAgICAgIHRoaXMuX2FjY2Vzcy5mb3JBbGxDZWxscyhjZWxsID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRlbXBsYXRlID0gdGhpcy5wYXJzZVRlbXBsYXRlKGNlbGwpO1xuICAgICAgICAgICAgaWYgKHRlbXBsYXRlKVxuICAgICAgICAgICAgICAgIGFsbFRlbXBsYXRlcy5wdXNoKHRlbXBsYXRlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gYWxsVGVtcGxhdGVzXG4gICAgICAgICAgICAuc29ydCgoYSwgYikgPT4gYS5yZWZlcmVuY2UgPT0gYi5jZWxsLmFkZHJlc3MoKSA/IDEgOiBiLnJlZmVyZW5jZSA9PSBhLmNlbGwuYWRkcmVzcygpID8gLTEgOiAwKVxuICAgICAgICAgICAgLmZvckVhY2goY2IpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEV4dHJhY3RzIHRoZSB2YWx1ZShzKSBmcm9tIHRoZSBwcm92aWRlZCBkYXRhIGByb290YCB0byBiZSBzZXQgaW4gdGhlIHByb3ZpZGVkIGBjZWxsYC5cbiAgICAgKiBAcGFyYW0ge3t9fSByb290IFRoZSBkYXRhIHJvb3QgdG8gYmUgZXh0cmFjdGVkIHZhbHVlcyBmcm9tLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBleHRyYWN0b3IgVGhlIGV4dHJhY3Rpb24gc3RyaW5nIHByb3ZpZGVkIGJ5IHRoZSB0ZW1wbGF0ZS4gVXN1YWxseSBhIEpTT04gcGF0aCB3aXRoaW4gdGhlIGRhdGEgYHJvb3RgLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd8QXJyYXl8QXJyYXkuPEFycmF5LjwqPj59IFRoZSB2YWx1ZSB0byBiZSB1c2VkLlxuICAgICAqIEBkZXNjcmlwdGlvbiBUaGlzIG1ldGhvZCBpcyB1c2VkIGV2ZW4gd2hlbiBhIHdob2xlIC0gcG9zc2libHkgcmVjdGFuZ3VsYXIgLSByYW5nZSBpcyBhYm91dCB0byBiZSBzZXQsIHNvIGl0IGNhblxuICAgICAqIHJldHVybiBhbiBhcnJheSBvZiBhcnJheXMuXG4gICAgICovXG4gICAgZXh0cmFjdFZhbHVlcyhyb290LCBleHRyYWN0b3IpIHtcbiAgICAgICAgY29uc3QgeyBwYXRoLCBoYW5kbGVyIH0gPSB0aGlzLnBhcnNlRXh0cmFjdG9yKGV4dHJhY3Rvcik7XG5cbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHJvb3QpKVxuICAgICAgICAgICAgcm9vdCA9IF8uZ2V0KHJvb3QsIHBhdGgsIHJvb3QpO1xuICAgICAgICBlbHNlIGlmIChyb290LnNpemVzICE9PSB1bmRlZmluZWQpXG4gICAgICAgICAgICByb290ID0gIWV4dHJhY3RvciA/IHJvb3QgOiBfLm1hcChyb290LCBlbnRyeSA9PiB0aGlzLmV4dHJhY3RWYWx1ZXMoZW50cnksIGV4dHJhY3RvcikpO1xuICAgICAgICBlbHNlIGlmICghaGFuZGxlcilcbiAgICAgICAgICAgIHJldHVybiByb290LmpvaW4odGhpcy5fb3B0cy5qb2luVGV4dCB8fCBcIixcIik7XG5cbiAgICAgICAgcmV0dXJuICFoYW5kbGVyID8gcm9vdCA6IGhhbmRsZXIocm9vdCwgbnVsbCwgdGhpcy5fb3B0cyk7ICAgICAgICAgICAgXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRXh0cmFjdHMgYW4gYXJyYXkgKHBvc3NpYmx5IG9mIGFycmF5cykgd2l0aCBkYXRhIGZvciB0aGUgZ2l2ZW4gZmlsbCwgYmFzZWQgb24gdGhlIGdpdmVuXG4gICAgICogcm9vdCBvYmplY3QuXG4gICAgICogQHBhcmFtIHt7fX0gcm9vdCBUaGUgbWFpbiByZWZlcmVuY2Ugb2JqZWN0IHRvIGFwcGx5IGl0ZXJhdG9ycyB0by5cbiAgICAgKiBAcGFyYW0ge0FycmF5fSBpdGVyYXRvcnMgTGlzdCBvZiBpdGVyYXRvcnMgLSBzdHJpbmcgSlNPTiBwYXRocyBpbnNpZGUgdGhlIHJvb3Qgb2JqZWN0LlxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBpZHggVGhlIGluZGV4IGluIHRoZSBpdGVyYXRvcnMgYXJyYXkgdG8gd29yayBvbi5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl8QXJyYXkuPEFycmF5Pn0gQW4gYXJyYXkgKHBvc3NpYmx5IG9mIGFycmF5cykgd2l0aCBleHRyYWN0ZWQgZGF0YS5cbiAgICAgKi9cbiAgICBleHRyYWN0RGF0YShyb290LCBpdGVyYXRvcnMsIGlkeCkge1xuICAgICAgICBsZXQgaXRlciA9IGl0ZXJhdG9yc1tpZHhdLFxuICAgICAgICAgICAgc2l6ZXMgPSBbXSxcbiAgICAgICAgICAgIHRyYW5zcG9zZWQgPSBmYWxzZSxcbiAgICAgICAgICAgIGRhdGEgPSBudWxsO1xuXG4gICAgICAgIGlmICghaXRlciB8fCBpdGVyID09ICcxJykge1xuICAgICAgICAgICAgdHJhbnNwb3NlZCA9IHRydWU7XG4gICAgICAgICAgICBpdGVyID0gaXRlcmF0b3JzWysraWR4XTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghaXRlcikgcmV0dXJuIHJvb3Q7XG5cbiAgICAgICAgLy8gQSBzcGVjaWZpYyBleHRyYWN0b3IgY2FuIGJlIHNwZWNpZmllZCBhZnRlciBzZW1pbG9uIC0gZmluZCBhbmQgcmVtZW1iZXIgaXQuXG4gICAgICAgIGNvbnN0IHBhcnNlZEl0ZXIgPSB0aGlzLnBhcnNlRXh0cmFjdG9yKGl0ZXIpO1xuXG4gICAgICAgIGRhdGEgPSBfLmdldChyb290LCBwYXJzZWRJdGVyLnBhdGgsIHJvb3QpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHR5cGVvZiBwYXJzZWRJdGVyLmhhbmRsZXIgPT09ICdmdW5jdGlvbicpXG4gICAgICAgICAgICBkYXRhID0gcGFyc2VkSXRlci5oYW5kbGVyLmNhbGwobnVsbCwgZGF0YSwgbnVsbCwgdGhpcy5fb3B0cyk7XG5cbiAgICAgICAgaWYgKGlkeCA8IGl0ZXJhdG9ycy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICBkYXRhID0gXy5tYXAoZGF0YSwgaW5Sb290ID0+IHRoaXMuZXh0cmFjdERhdGEoaW5Sb290LCBpdGVyYXRvcnMsIGlkeCArIDEpKTtcbiAgICAgICAgICAgIHNpemVzID0gZGF0YVswXS5zaXplcztcbiAgICAgICAgfSBlbHNlIGlmICghQXJyYXkuaXNBcnJheShkYXRhKSAmJiB0eXBlb2YgZGF0YSA9PT0gJ29iamVjdCcpXG4gICAgICAgICAgICBkYXRhID0gXy52YWx1ZXMoZGF0YSk7XG5cbiAgICAgICAgc2l6ZXMudW5zaGlmdCh0cmFuc3Bvc2VkID8gLWRhdGEubGVuZ3RoIDogZGF0YS5sZW5ndGgpO1xuICAgICAgICBkYXRhLnNpemVzID0gc2l6ZXM7XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFB1dCB0aGUgZGF0YSB2YWx1ZXMgaW50byB0aGUgcHJvcGVyIGNlbGxzLCB3aXRoIGNvcnJlY3QgZXh0cmFjdGVkIHZhbHVlcy5cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3t9fSBjZWxsIFRoZSBzdGFydGluZyBjZWxsIGZvciB0aGUgZGF0YSB0byBiZSBwdXQuXG4gICAgICogQHBhcmFtIHtBcnJheX0gZGF0YSBUaGUgYWN0dWFsIGRhdGEgdG8gYmUgcHV0LiBUaGUgdmFsdWVzIHdpbGwgYmUgX2V4dHJhY3RlZF8gZnJvbSBoZXJlIGZpcnN0LlxuICAgICAqIEBwYXJhbSB7e319IHRlbXBsYXRlIFRoZSB0ZW1wbGF0ZSB0aGF0IGlzIGJlaW5nIGltcGxlbWVudGVkIHdpdGggdGhhdCBkYXRhIGZpbGwuXG4gICAgICogQHJldHVybnMge0FycmF5fSBNYXRyaXggc2l6ZSB0aGF0IHRoaXMgZGF0YSBoYXMgb2NjdXBpZWQgb24gdGhlIHNoZWV0IFtyb3dzLCBjb2xzXS5cbiAgICAgKi9cbiAgICBwdXRWYWx1ZXMoY2VsbCwgZGF0YSwgdGVtcGxhdGUpIHtcbiAgICAgICAgbGV0IGVudHJ5U2l6ZSA9IGRhdGEuc2l6ZXMsXG4gICAgICAgICAgICB2YWx1ZSA9IHRoaXMuZXh0cmFjdFZhbHVlcyhkYXRhLCB0ZW1wbGF0ZS5leHRyYWN0b3IpO1xuXG4gICAgICAgIC8vIG1ha2Ugc3VyZSwgdGhlIFxuICAgICAgICBpZiAoIWVudHJ5U2l6ZSB8fCAhZW50cnlTaXplLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5fYWNjZXNzXG4gICAgICAgICAgICAgICAgLnNldFZhbHVlKGNlbGwsIHZhbHVlKVxuICAgICAgICAgICAgICAgIC5jb3B5U3R5bGUoY2VsbCwgdGVtcGxhdGUuY2VsbClcbiAgICAgICAgICAgICAgICAuY29weVNpemUoY2VsbCwgdGVtcGxhdGUuY2VsbCk7XG4gICAgICAgICAgICB0aGlzLmFwcGx5RGF0YVN0eWxlKGNlbGwsIGRhdGEsIHRlbXBsYXRlKTtcbiAgICAgICAgICAgIGVudHJ5U2l6ZSA9IHRlbXBsYXRlLmNlbGxTaXplO1xuICAgICAgICB9IGVsc2UgaWYgKGVudHJ5U2l6ZS5sZW5ndGggPD0gMikge1xuICAgICAgICAgICAgLy8gTm9ybWFsaXplIHRoZSBzaXplIGFuZCBkYXRhLlxuICAgICAgICAgICAgaWYgKGVudHJ5U2l6ZVswXSA8IDApIHtcbiAgICAgICAgICAgICAgICBlbnRyeVNpemUgPSBbMSwgLWVudHJ5U2l6ZVswXV07XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBbdmFsdWVdO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChlbnRyeVNpemUubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICAgICAgICBlbnRyeVNpemUgPSBlbnRyeVNpemUuY29uY2F0KFsxXSk7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBfLmNodW5rKHZhbHVlLCAxKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5fYWNjZXNzLmdldENlbGxSYW5nZShjZWxsLCBlbnRyeVNpemVbMF0gLSAxLCBlbnRyeVNpemVbMV0gLSAxKS5mb3JFYWNoKChjZWxsLCByaSwgY2kpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9hY2Nlc3NcbiAgICAgICAgICAgICAgICAgICAgLnNldFZhbHVlKGNlbGwsIHZhbHVlW3JpXVtjaV0pXG4gICAgICAgICAgICAgICAgICAgIC5jb3B5U3R5bGUoY2VsbCwgdGVtcGxhdGUuY2VsbClcbiAgICAgICAgICAgICAgICAgICAgLmNvcHlTaXplKGNlbGwsIHRlbXBsYXRlLmNlbGwpO1xuICAgICAgICAgICAgICAgIHRoaXMuYXBwbHlEYXRhU3R5bGUoY2VsbCwgZGF0YVtyaV1bY2ldLCB0ZW1wbGF0ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFRPRE86IERlYWwgd2l0aCBtb3JlIHRoYW4gMyBkaW1lbnNpb25zIGNhc2UuXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZW50cnlTaXplO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFwcGx5IHRoZSBnaXZlbiBmaWx0ZXIgb250byB0aGUgc2hlZXQgLSBleHRyYWN0aW5nIHRoZSBwcm9wZXIgZGF0YSwgZm9sbG93aW5nIGRlcGVuZGVudCBmaWxscywgZXRjLlxuICAgICAqIEBwYXJhbSB7e319IGFGaWxsIFRoZSBmaWxsIHRvIGJlIGFwcGxpZWQsIGFzIGNvbnN0cnVjdGVkIGluIHRoZSBAc2VlIHBvcHVsYXRlIG1ldGhvZHMuXG4gICAgICogQHBhcmFtIHt7fX0gcm9vdCBUaGUgZGF0YSByb290IHRvIGJlIHVzZWQgZm9yIGRhdGEgZXh0cmFjdGlvbi5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IG1haW5DZWxsIFRoZSBzdGFydGluZyBjZWxsIGZvciBkYXRhIHBsYWNlbWVudCBwcm9jZWR1cmUuXG4gICAgICogQHJldHVybnMge0FycmF5fSBUaGUgc2l6ZSBvZiB0aGUgZGF0YSBwdXQgaW4gW3JvdywgY29sXSBmb3JtYXQuXG4gICAgICovXG4gICAgYXBwbHlGaWxsKGFGaWxsLCByb290LCBtYWluQ2VsbCkge1xuICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IGFGaWxsLnRlbXBsYXRlLFxuICAgICAgICAgICAgdGhlRGF0YSA9IHRoaXMuZXh0cmFjdERhdGEocm9vdCwgdGVtcGxhdGUuaXRlcmF0b3JzLCAwKTtcblxuICAgICAgICBsZXQgZW50cnlTaXplID0gWzEsIDFdO1xuXG4gICAgICAgIGlmICghYUZpbGwuZGVwZW5kZW50cyB8fCAhYUZpbGwuZGVwZW5kZW50cy5sZW5ndGgpXG4gICAgICAgICAgICBlbnRyeVNpemUgPSB0aGlzLnB1dFZhbHVlcyhtYWluQ2VsbCwgdGhlRGF0YSwgdGVtcGxhdGUpO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGxldCBuZXh0Q2VsbCA9IG1haW5DZWxsO1xuICAgICAgICAgICAgY29uc3Qgc2l6ZU1heHhlciA9ICh2YWwsIGlkeCkgPT4gZW50cnlTaXplW2lkeF0gPSBNYXRoLm1heChlbnRyeVNpemVbaWR4XSwgdmFsKTtcblxuICAgICAgICAgICAgZm9yIChsZXQgZCA9IDA7IGQgPCB0aGVEYXRhLmxlbmd0aDsgKytkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaW5Sb290ID0gdGhlRGF0YVtkXTtcblxuICAgICAgICAgICAgICAgIGZvciAobGV0IGYgPSAwOyBmIDwgYUZpbGwuZGVwZW5kZW50cy5sZW5ndGg7ICsrZikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpbkZpbGwgPSBhRmlsbC5kZXBlbmRlbnRzW2ZdLFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5DZWxsID0gbmV4dENlbGwucmVsYXRpdmVDZWxsKGluRmlsbC5vZmZzZXRbMF0sIGluRmlsbC5vZmZzZXRbMV0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5uZXJTaXplID0gdGhpcy5hcHBseUZpbGwoaW5GaWxsLCBpblJvb3QsIGluQ2VsbCk7XG5cbiAgICAgICAgICAgICAgICAgICAgXy5mb3JFYWNoKGlubmVyU2l6ZSwgc2l6ZU1heHhlcik7XG4gICAgICAgICAgICAgICAgICAgIGluRmlsbC5wcm9jZXNzZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIE5vdyB3ZSBoYXZlIHRoZSBpbm5lciBkYXRhIHB1dCBhbmQgdGhlIHNpemUgY2FsY3VsYXRlZC5cbiAgICAgICAgICAgICAgICBfLmZvckVhY2godGhpcy5wdXRWYWx1ZXMobmV4dENlbGwsIGluUm9vdCwgdGVtcGxhdGUpLCBzaXplTWF4eGVyKTtcblxuICAgICAgICAgICAgICAgIGxldCByb3dPZmZzZXQgPSBlbnRyeVNpemVbMF0sXG4gICAgICAgICAgICAgICAgICAgIGNvbE9mZnNldCA9IGVudHJ5U2l6ZVsxXTtcblxuICAgICAgICAgICAgICAgIC8vIE1ha2Ugc3VyZSB3ZSBncm93IG9ubHkgb24gb25lIGRpbWVuc2lvbi5cbiAgICAgICAgICAgICAgICBpZiAodGhlRGF0YS5zaXplc1swXSA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcm93T2Zmc2V0ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgZW50cnlTaXplWzFdID0gMTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb2xPZmZzZXQgPSAwO1xuICAgICAgICAgICAgICAgICAgICBlbnRyeVNpemVbMF0gPSAxO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChyb3dPZmZzZXQgPiAxIHx8IGNvbE9mZnNldCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgcm5nID0gdGhpcy5fYWNjZXNzLmdldENlbGxSYW5nZShuZXh0Q2VsbCwgTWF0aC5tYXgocm93T2Zmc2V0IC0gMSwgMCksIE1hdGgubWF4KGNvbE9mZnNldCAtIDEsIDApKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fYWNjZXNzLnNldFJhbmdlTWVyZ2VkKHJuZywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHJuZy5mb3JFYWNoKGNlbGwgPT4gdGhpcy5fYWNjZXNzLmNvcHlTaXplKGNlbGwsIHRlbXBsYXRlLmNlbGwpKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBGaW5hbGx5LCBjYWxjdWxhdGUgdGhlIG5leHQgY2VsbC5cbiAgICAgICAgICAgICAgICBuZXh0Q2VsbCA9IG5leHRDZWxsLnJlbGF0aXZlQ2VsbChyb3dPZmZzZXQgKyB0ZW1wbGF0ZS5wYWRkaW5nWzBdLCBjb2xPZmZzZXQgKyB0ZW1wbGF0ZS5wYWRkaW5nWzFdIHx8IDApO1x0XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE5vdyByZWNhbGMgY29tYmluZWQgZW50cnkgc2l6ZS5cbiAgICAgICAgICAgIF8uZm9yRWFjaCh0aGlzLl9hY2Nlc3MuY2VsbERpc3RhbmNlKG1haW5DZWxsLCBuZXh0Q2VsbCksIHNpemVNYXh4ZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGVudHJ5U2l6ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUaGUgbWFpbiBlbnRyeSBwb2ludCBmb3Igd2hvbGUgZGF0YSBwb3B1bGF0aW9uIG1lY2hhbmlzbS5cbiAgICAgKiBAcGFyYW0ge3t9fSBkYXRhIFRoZSBkYXRhIHRvIGJlIGFwcGxpZWQuXG4gICAgICogQHJldHVybnMge1hsc3hEYXRhRmlsbH0gRm9yIGludm9jYXRpb24gY2hhaW5pbmcuXG4gICAgICovXG4gICAgZmlsbERhdGEoZGF0YSkge1xuICAgICAgICBjb25zdCBkYXRhRmlsbHMgPSB7fTtcblx0XG4gICAgICAgIC8vIEJ1aWxkIHRoZSBkZXBlbmRlbmN5IGNvbm5lY3Rpb25zIGJldHdlZW4gdGVtcGxhdGVzLlxuICAgICAgICB0aGlzLmNvbGxlY3RUZW1wbGF0ZXModGVtcGxhdGUgPT4ge1xuICAgICAgICAgICAgY29uc3QgYUZpbGwgPSB7ICBcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZTogdGVtcGxhdGUsIFxuICAgICAgICAgICAgICAgIGRlcGVuZGVudHM6IFtdLFxuICAgICAgICAgICAgICAgIHByb2Nlc3NlZDogZmFsc2VcbiAgICAgICAgICAgIH07XG4gICAgXG4gICAgICAgICAgICBpZiAodGVtcGxhdGUucmVmZXJlbmNlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVmRmlsbCA9IGRhdGFGaWxsc1t0ZW1wbGF0ZS5yZWZlcmVuY2VdO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJlZkZpbGwuZGVwZW5kZW50cy5wdXNoKGFGaWxsKTtcbiAgICAgICAgICAgICAgICBhRmlsbC5vZmZzZXQgPSB0aGlzLl9hY2Nlc3MuY2VsbERpc3RhbmNlKHJlZkZpbGwudGVtcGxhdGUuY2VsbCwgdGVtcGxhdGUuY2VsbCk7XG4gICAgICAgICAgICB9XG4gICAgXG4gICAgICAgICAgICBkYXRhRmlsbHNbdGVtcGxhdGUuY2VsbC5hZGRyZXNzKCldID0gYUZpbGw7XG4gICAgICAgIH0pO1xuICAgIFxuICAgICAgICAvLyBBcHBseSBlYWNoIGZpbGwgb250byB0aGUgc2hlZXQuXG4gICAgICAgIF8uZWFjaChkYXRhRmlsbHMsIGZpbGwgPT4ge1xuICAgICAgICAgICAgaWYgKCFmaWxsLnByb2Nlc3NlZClcbiAgICAgICAgICAgICAgICB0aGlzLmFwcGx5RmlsbChmaWxsLCBkYXRhLCBmaWxsLnRlbXBsYXRlLmNlbGwpO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59XG5cbi8qKlxuICogVGhlIGJ1aWx0LWluIGFjY2Vzc29yIGJhc2VkIG9uIHhsc3gtcG9wdWxhdGUgbnBtIG1vZHVsZVxuICogQHR5cGUge1hsc3hQb3B1bGF0ZUFjY2Vzc31cbiAqL1xuWGxzeERhdGFGaWxsLlhsc3hQb3B1bGF0ZUFjY2VzcyA9IHJlcXVpcmUoJy4vWGxzeFBvcHVsYXRlQWNjZXNzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gWGxzeERhdGFGaWxsO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmNvbnN0IF8gPSByZXF1aXJlKCdsb2Rhc2gnKTtcblxubGV0IF9SaWNoVGV4dCA9IG51bGw7XG5cbi8vIGNvbnN0IFhsc3hQb3B1bGF0ZSA9IHJlcXVpcmUoJ3hsc3gtcG9wdWxhdGUnKTtcblxuLyoqXG4gKiBEYXRhIGZpbGwgcm91dGluZXMgd3JhcHBlci5cbiAqIEBpZ25vcmVcbiAqL1xuY2xhc3MgWGxzeFBvcHVsYXRlQWNjZXNzIHtcbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGEgbmV3IGluc3RhbmNlIG9mIFhsc3hTbWFydFRlbXBsYXRlIHdpdGggZ2l2ZW4gb3B0aW9ucy5cbiAgICAgKiBAcGFyYW0ge1dvcmtib29rfSB3b3JrYm9vayAtIFRoZSB3b3JrYm9vayB0byBiZSBhY2Nlc3NlZC5cbiAgICAgKiBAcGFyYW0ge1hsc3hQb3B1bGF0ZX0gWGxzeFBvcHVsYXRlIC0gVGhlIGFjdHVhbCB4bHN4LXBvcHVsYXRlIGxpYnJhcnkgb2JqZWN0LlxuICAgICAqIEBkZXNjcmlwdGlvbiBUaGUgYFhsc3hQb3B1bGF0ZWAgb2JqZWN0IG5lZWQgdG8gYmUgcGFzc2VkIGluIG9yZGVyIHRvIGV4dHJhY3RcbiAgICAgKiBjZXJ0YWluIGluZm9ybWF0aW9uIGZyb20gaXQsIF93aXRob3V0XyByZWZlcnJpbmcgdGhlIHdob2xlIGxpYnJhcnksIGFuZCB0aHVzXG4gICAgICogbWFraW5nIHRoZSBgeGxzeC1kYXRhZmlsbGAgcGFja2FnZSBkZXBlbmRlbnQgb24gaXQuXG4gICAgICovXG4gICAgY29uc3RydWN0b3Iod29ya2Jvb2ssIFhsc3hQb3B1bGF0ZSkge1xuICAgICAgICB0aGlzLl93b3JrYm9vayA9IHdvcmtib29rO1xuICAgICAgICB0aGlzLl9yb3dTaXplcyA9IHt9O1xuICAgICAgICB0aGlzLl9jb2xTaXplcyA9IHt9O1xuICAgIFxuICAgICAgICBfUmljaFRleHQgPSBYbHN4UG9wdWxhdGUuUmljaFRleHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgY29uZmlndXJlZCB3b3JrYm9vayBmb3IgZGlyZWN0IFhsc3hQb3B1bGF0ZSBtYW5pcHVsYXRpb24uXG4gICAgICogQHJldHVybnMge1dvcmtib29rfSBUaGUgd29ya2Jvb2sgaW52b2x2ZWQuXG4gICAgICovXG4gICAgd29ya2Jvb2soKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl93b3JrYm9vazsgXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgdGV4dHVhbCByZXByZXNlbnRhdGlvbiBvZiB0aGUgY2VsbCB2YWx1ZS5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgLSBUaGUgY2VsbCB0byByZXRyaWV2ZSB0aGUgdmFsdWUgZnJvbS5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgdGV4dHVhbCByZXByZXNlbnRhdGlvbiBvZiBjZWxsJ3MgY29udGVudHMuXG4gICAgICovXG4gICAgY2VsbFRleHRWYWx1ZShjZWxsKSB7XG4gICAgICAgIGNvbnN0IGNlbGxWYWx1ZSA9IGNlbGwudmFsdWUoKTtcbiAgICAgICAgcmV0dXJuIGNlbGxWYWx1ZSBpbnN0YW5jZW9mIF9SaWNoVGV4dCA/IGNlbGxWYWx1ZS50ZXh0KCkgOiBjZWxsVmFsdWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTWVhc3VyZXMgdGhlIGRpc3RhbmNlLCBhcyBhIHZlY3RvciBiZXR3ZWVuIHR3byBnaXZlbiBjZWxscy5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGZyb20gVGhlIGZpcnN0IGNlbGwuXG4gICAgICogQHBhcmFtIHtDZWxsfSB0byBUaGUgc2Vjb25kIGNlbGwuXG4gICAgICogQHJldHVybnMge0FycmF5LjxOdW1iZXI+fSBBbiBhcnJheSB3aXRoIHR3byB2YWx1ZXMgWzxyb3dzPiwgPGNvbHM+XSwgcmVwcmVzZW50aW5nIHRoZSBkaXN0YW5jZSBiZXR3ZWVuIHRoZSB0d28gY2VsbHMuXG4gICAgICovXG4gICAgY2VsbERpc3RhbmNlKGZyb20sIHRvKSB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB0by5yb3dOdW1iZXIoKSAtIGZyb20ucm93TnVtYmVyKCksXG4gICAgICAgICAgICB0by5jb2x1bW5OdW1iZXIoKSAtIGZyb20uY29sdW1uTnVtYmVyKClcbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEZXRlcm1pbmVzIHRoZSBzaXplIG9mIGNlbGwsIHRha2luZyBpbnRvIGFjY291bnQgaWYgaXQgaXMgcGFydCBvZiBhIG1lcmdlZCByYW5nZS5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIGNlbGwgdG8gYmUgaW52ZXN0aWdhdGVkLlxuICAgICAqIEByZXR1cm5zIHtBcnJheS48TnVtYmVyPn0gQW4gYXJyYXkgd2l0aCB0d28gdmFsdWVzIFs8cm93cz4sIDxjb2xzPl0sIHJlcHJlc2VudGluZyB0aGUgb2NjdXBpZWQgc2l6ZS5cbiAgICAgKi9cbiAgICBjZWxsU2l6ZShjZWxsKSB7XG4gICAgICAgIGNvbnN0IGNlbGxBZGRyID0gY2VsbC5hZGRyZXNzKCk7XG4gICAgICAgIGxldCB0aGVTaXplID0gWzEsIDFdO1xuICAgIFxuICAgICAgICBfLmZvckVhY2goY2VsbC5zaGVldCgpLl9tZXJnZUNlbGxzLCByYW5nZSA9PiB7XG4gICAgICAgICAgICBjb25zdCByYW5nZUFkZHIgPSByYW5nZS5hdHRyaWJ1dGVzLnJlZi5zcGxpdChcIjpcIik7XG4gICAgICAgICAgICBpZiAocmFuZ2VBZGRyWzBdID09IGNlbGxBZGRyKSB7XG4gICAgICAgICAgICAgICAgdGhlU2l6ZSA9IHRoaXMuY2VsbERpc3RhbmNlKGNlbGwsIGNlbGwuc2hlZXQoKS5jZWxsKHJhbmdlQWRkclsxXSkpO1xuICAgICAgICAgICAgICAgICsrdGhlU2l6ZVswXTtcbiAgICAgICAgICAgICAgICArK3RoZVNpemVbMV07XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICBcbiAgICAgICAgcmV0dXJuIHRoZVNpemU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIGEgZ2l2ZW4gY2VsbCBmcm9tIGEgZ2l2ZW4gc2hlZXQgKG9yIGFuIGFjdGl2ZSBvbmUpLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdHxhcnJheX0gYWRkcmVzcyBUaGUgY2VsbCBhZHJlc3MgdG8gYmUgdXNlZFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfGlkeH0gc2hlZXRJZCBUaGUgaWQvbmFtZSBvZiB0aGUgc2hlZXQgdG8gcmV0cmlldmUgdGhlIGNlbGwgZnJvbS4gRGVmYXVsdHMgdG8gYW4gYWN0aXZlIG9uZS5cbiAgICAgKiBAcmV0dXJucyB7Q2VsbH0gQSByZWZlcmVuY2UgdG8gdGhlIHJlcXVpcmVkIGNlbGwuXG4gICAgICovXG4gICAgZ2V0Q2VsbChhZGRyZXNzLCBzaGVldElkKSB7XG4gICAgICAgIGNvbnN0IHRoZVNoZWV0ID0gc2hlZXRJZCA9PSBudWxsID8gdGhpcy5fd29ya2Jvb2suYWN0aXZlU2hlZXQoKSA6IHRoaXMuX3dvcmtib29rLnNoZWV0KHNoZWV0SWQpO1xuICAgICAgICByZXR1cm4gdGhlU2hlZXQuY2VsbChhZGRyZXNzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGFuZCByZXR1cm5zIHRoZSByYW5nZSBzdGFydGluZyBmcm9tIHRoZSBnaXZlbiBjZWxsIGFuZCBzcGF3bmluZyBnaXZlbiByb3dzIGFuZCBjZWxscy5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIHN0YXJ0aW5nIGNlbGwgb2YgdGhlIHJhbmdlLlxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSByb3dPZmZzZXQgTnVtYmVyIG9mIHJvd3MgYXdheSBmcm9tIHRoZSBzdGFydGluZyBjZWxsLiAwIG1lYW5zIHNhbWUgcm93LlxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBjb2xPZmZzZXQgTnVtYmVyIG9mIGNvbHVtbnMgYXdheSBmcm9tIHRoZSBzdGFydGluZyBjZWxsLiAwIG1lYW5zIHNhbWUgY29sdW1uLlxuICAgICAqIEByZXR1cm5zIHtSYW5nZX0gVGhlIGNvbnN0cnVjdGVkIHJhbmdlLlxuICAgICAqL1xuICAgIGdldENlbGxSYW5nZShjZWxsLCByb3dPZmZzZXQsIGNvbE9mZnNldCkge1xuICAgICAgICByZXR1cm4gY2VsbC5yYW5nZVRvKGNlbGwucmVsYXRpdmVDZWxsKHJvd09mZnNldCwgY29sT2Zmc2V0KSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTWVyZ2Ugb3Igc3BsaXQgcmFuZ2Ugb2YgY2VsbHMuXG4gICAgICogQHBhcmFtIHtSYW5nZX0gcmFuZ2UgVGhlIHJhbmdlLCBhcyByZXR1cm5lZCBmcm9tIEBzZWUgZ2V0Q2VsbFJhbmdlKCkuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBzdGF0dXMgVGhlIG1lcmdlZCBzdGF0dXMgdG8gYmUgc2V0LlxuICAgICAqIEByZXR1cm5zIHtYbHN4UG9wdWxhdGVBY2Nlc3N9IEZvciBjaGFpbiBpbnZva2VzLlxuICAgICAqL1xuICAgIHNldFJhbmdlTWVyZ2VkKHJhbmdlLCBzdGF0dXMpIHtcbiAgICAgICAgcmFuZ2UubWVyZ2VkKHN0YXR1cyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEl0ZXJhdGUgb3ZlciBhbGwgdXNlZCBjZWxscyBvZiB0aGUgZ2l2ZW4gd29ya2Jvb2suXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2IgVGhlIGNhbGxiYWNrIHRvIGJlIGludm9rZWQgd2l0aCBgY2VsbGAgYXJndW1lbnQgZm9yIGVhY2ggdXNlZCBjZWxsLlxuICAgICAqIEByZXR1cm5zIHtYbHN4UG9wdWxhdGVBY2Nlc3N9IEZvciBjaGFpbiBpbnZva2VzLlxuICAgICAqL1xuICAgIGZvckFsbENlbGxzKGNiKSB7XG4gICAgICAgIHRoaXMuX3dvcmtib29rLnNoZWV0cygpLmZvckVhY2goc2hlZXQgPT4gc2hlZXQudXNlZFJhbmdlKCkuZm9yRWFjaChjYikpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb3BpZXMgdGhlIHN0eWxlcyBmcm9tIGBzcmNgIGNlbGwgdG8gdGhlIGBkZXN0YC1pbmF0aW9uIG9uZS5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGRlc3QgRGVzdGluYXRpb24gY2VsbC5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IHNyYyBTb3VyY2UgY2VsbC5cbiAgICAgKiBAcmV0dXJucyB7WGxzeFBvcHVsYXRlQWNjZXNzfSBGb3IgaW52b2NhdGlvbiBjaGFpbmluZy5cbiAgICAgKi9cbiAgICBjb3B5U3R5bGUoZGVzdCwgc3JjKSB7XG4gICAgICAgIGlmIChzcmMgPT0gZGVzdCkgcmV0dXJuIHRoaXM7XG4gICAgICAgIFxuICAgICAgICBkZXN0Ll9zdHlsZUlkID0gc3JjLl9zdHlsZUlkO1xuICAgICAgICBpZiAoc3JjLl9zdHlsZSlcbiAgICAgICAgICAgIGRlc3QuX3N0eWxlID0gXy5tZXJnZSh7fSwgc3JjLl9zdHlsZSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXNpemUgdGhlIGNvbHVtbiBhbmQgcm93IG9mIHRoZSBkZXN0aW5hdGlvbiBjZWxsLCBpZiBub3QgY2hhbmdlZCBhbHJlYWR5LlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gZGVzdCBUaGUgZGVzdGluYXRpb24gY2VsbCB3aGljaCByb3cgYW5kIGNvbHVtbiB0byByZXNpemUuXG4gICAgICogQHBhcmFtIHtDZWxsfSBzcmMgVGhlIHNvdXJjZSAodGVtcGxhdGUpIGNlbGwgdG8gdGFrZSB0aGUgc2l6ZSBmcm9tLlxuICAgICAqIEByZXR1cm5zIHtYbHN4UG9wdWxhdGVBY2Nlc3N9IEZvciBpbnZvY2F0aW9uIGNoYWluaW5nLlxuICAgICAqL1xuICAgIGNvcHlTaXplKGRlc3QsIHNyYykge1xuICAgICAgICBjb25zdCByb3cgPSBkZXN0LnJvd051bWJlcigpLFxuICAgICAgICAgICAgY29sID0gZGVzdC5jb2x1bW5OdW1iZXIoKTtcblxuICAgICAgICBpZiAodGhpcy5fcm93U2l6ZXNbcm93XSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgZGVzdC5yb3coKS5oZWlnaHQodGhpcy5fcm93U2l6ZXNbcm93XSA9IHNyYy5yb3coKS5oZWlnaHQoKSk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5fY29sU2l6ZXNbY29sXSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgZGVzdC5jb2x1bW4oKS53aWR0aCh0aGlzLl9jb2xTaXplc1tjb2xdID0gc3JjLmNvbHVtbigpLndpZHRoKCkpO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNldHMgYSB2YWx1ZSBpbiB0aGUgY2VsbC5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIGNlbGwgdG8gYmUgb3BlcmF0ZWQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIFRoZSBzdHJpbmcgdmFsdWUgdG8gYmUgc2V0IGluc2lkZS5cbiAgICAgKiBAcmV0dXJucyB7WGxzeFBvcHVsYXRlQWNjZXNzfSBGb3IgaW52b2NhdGlvbiBjaGFpbmluZy5cbiAgICAgKi9cbiAgICBzZXRWYWx1ZShjZWxsLCB2YWx1ZSkge1xuICAgICAgICBjZWxsLnZhbHVlKHZhbHVlKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0cyBhIG5hbWVkIHN0eWxlIG9mIGEgZ2l2ZW4gY2VsbC5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIGNlbGwgdG8gYmUgb3BlcmF0ZWQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgVGhlIG5hbWUgb2YgdGhlIHN0eWxlIHByb3BlcnR5IHRvIGJlIHNldC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9IHZhbHVlIFRoZSB2YWx1ZSBmb3IgdGhpcyBwcm9wZXJ0eSB0byBiZSBzZXQuXG4gICAgICogQHJldHVybnMge1hsc3hQb3B1bGF0ZUFjY2Vzc30gRm9yIGludm9jYXRpb24gY2hhaW5pbmcuXG4gICAgICovXG4gICAgc2V0U3R5bGUoY2VsbCwgbmFtZSwgdmFsdWUpIHtcbiAgICAgICAgY2VsbC5zdHlsZShuYW1lLCB2YWx1ZSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBYbHN4UG9wdWxhdGVBY2Nlc3M7XG4iXX0=
