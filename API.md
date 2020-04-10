# xlsx-datafill API reference
## Classes

<dl>
<dt><a href="#XlsxDataFill">XlsxDataFill</a></dt>
<dd><p>Data fill engine, taking an instance of Excel sheet accessor and a JSON object as data, and filling the values from the latter into the former.</p>
</dd>
<dt><a href="#XlsxPopulateAccess">XlsxPopulateAccess</a></dt>
<dd><p><code>xslx-populate</code> library based accessor to a given Excel workbook. All these methods are internally used by <a href="#XlsxDataFill">XlsxDataFill</a>, 
but can be used as a reference for implementing custom spreadsheet accessors.</p>
</dd>
</dl>

<a name="XlsxDataFill"></a>

## XlsxDataFill
Data fill engine, taking an instance of Excel sheet accessor and a JSON object as data, and filling the values from the latter into the former.

**Kind**: global class  

* [XlsxDataFill](#XlsxDataFill)
    * [new XlsxDataFill(accessor, opts)](#new_XlsxDataFill_new)
    * _instance_
        * [.options(newOpts)](#XlsxDataFill+options) ⇒ [<code>XlsxDataFill</code>](#XlsxDataFill) \| <code>Object</code>
        * [.fillData(data)](#XlsxDataFill+fillData) ⇒ [<code>XlsxDataFill</code>](#XlsxDataFill)
        * [.shiftFormula(formula, offset, size)](#XlsxDataFill+shiftFormula) ⇒ <code>String</code>
    * _static_
        * [.XlsxPopulateAccess](#XlsxDataFill.XlsxPopulateAccess) : [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess)

<a name="new_XlsxDataFill_new"></a>

### new XlsxDataFill(accessor, opts)
Constructs a new instance of XlsxDataFill with given options.


| Param | Type | Description |
| --- | --- | --- |
| accessor | <code>object</code> | An instance of XLSX spreadsheet accessing class. |
| opts | <code>Object</code> | Options to be used during processing. |
| opts.templateRegExp | <code>RegExp</code> | The regular expression to be used for template recognizing.  Default is `/\{\{([^}]*)\}\}/`, i.e. Mustache. |
| opts.fieldSplitter | <code>string</code> | The string to be expected as template field splitter. Default is `|`. |
| opts.joinText | <code>string</code> | The string to be used when the extracted value for a single cell is an array,  and it needs to be joined. Default is `,`. |
| opts.mergeCells | <code>string</code> \| <code>boolean</code> | Whether to merge the higher dimension cells in the output. Default is true. |
| opts.followFormulae | <code>boolean</code> | If a template is located as a result of a formula, whether to still process it. Default is false. |
| opts.callbacksMap | <code>object.&lt;string, function()&gt;</code> | A map of handlers to be used for data and value extraction. There is one default - the empty one, for object key extraction. |

<a name="XlsxDataFill+options"></a>

### xlsxDataFill.options(newOpts) ⇒ [<code>XlsxDataFill</code>](#XlsxDataFill) \| <code>Object</code>
Setter/getter for XlsxDataFill's options as set during construction.

**Kind**: instance method of [<code>XlsxDataFill</code>](#XlsxDataFill)  
**Returns**: [<code>XlsxDataFill</code>](#XlsxDataFill) \| <code>Object</code> - The required options (in getter mode) or XlsxDataFill (in setter mode) for chaining.  
**See**: {@constructor}.  

| Param | Type | Description |
| --- | --- | --- |
| newOpts | <code>Object</code> \| <code>null</code> | If set - the new options to be used. |

<a name="XlsxDataFill+fillData"></a>

### xlsxDataFill.fillData(data) ⇒ [<code>XlsxDataFill</code>](#XlsxDataFill)
The main entry point for whole data population mechanism.

**Kind**: instance method of [<code>XlsxDataFill</code>](#XlsxDataFill)  
**Returns**: [<code>XlsxDataFill</code>](#XlsxDataFill) - For invocation chaining.  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Object</code> | The data to be applied. |

<a name="XlsxDataFill+shiftFormula"></a>

### xlsxDataFill.shiftFormula(formula, offset, size) ⇒ <code>String</code>
Process a formula be shifting all the fixed offset.

**Kind**: instance method of [<code>XlsxDataFill</code>](#XlsxDataFill)  
**Returns**: <code>String</code> - The processed text.  

| Param | Type | Description |
| --- | --- | --- |
| formula | <code>String</code> | The formula to be shifted. |
| offset | <code>Array.&lt;Number, Number&gt;</code> | The offset of the referenced template to the formula one. |
| size | <code>Array.&lt;Number, Number&gt;</code> | The size of the ranges as they should be. |

<a name="XlsxDataFill.XlsxPopulateAccess"></a>

### XlsxDataFill.XlsxPopulateAccess : [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess)
The built-in accessor based on xlsx-populate npm module

**Kind**: static property of [<code>XlsxDataFill</code>](#XlsxDataFill)  
<a name="XlsxPopulateAccess"></a>

## XlsxPopulateAccess
`xslx-populate` library based accessor to a given Excel workbook. All these methods are internally used by [XlsxDataFill](#XlsxDataFill), 
but can be used as a reference for implementing custom spreadsheet accessors.

**Kind**: global class  

* [XlsxPopulateAccess](#XlsxPopulateAccess)
    * [new XlsxPopulateAccess(workbook, XlsxPopulate)](#new_XlsxPopulateAccess_new)
    * [.workbook()](#XlsxPopulateAccess+workbook) ⇒ <code>Workbook</code>
    * [.cellValue(cell)](#XlsxPopulateAccess+cellValue) ⇒ <code>string</code>
    * [.setCellValue(cell, value)](#XlsxPopulateAccess+setCellValue) ⇒ [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess)
    * [.cellType(cell)](#XlsxPopulateAccess+cellType) ⇒ <code>string</code>
    * [.setCellFormula(cell, formula)](#XlsxPopulateAccess+setCellFormula) ⇒ [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess)
    * [.cellDistance(from, to)](#XlsxPopulateAccess+cellDistance) ⇒ <code>Array.&lt;Number&gt;</code>
    * [.cellSize(cell)](#XlsxPopulateAccess+cellSize) ⇒ <code>Array.&lt;Number&gt;</code>
    * [.setCellStyle(cell, name, value)](#XlsxPopulateAccess+setCellStyle) ⇒ [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess)
    * [.cellRef(cell, withSheet)](#XlsxPopulateAccess+cellRef) ⇒ <code>string</code>
    * [.buildRef(cell, adr, withSheet)](#XlsxPopulateAccess+buildRef) ⇒ <code>string</code>
    * [.getCell(address, sheetId)](#XlsxPopulateAccess+getCell) ⇒ <code>Cell</code>
    * [.getCellRange(cell, rowOffset, colOffset)](#XlsxPopulateAccess+getCellRange) ⇒ <code>Range</code>
    * [.offsetCell(cell, rows, cols)](#XlsxPopulateAccess+offsetCell) ⇒ <code>Cell</code>
    * [.rangeMerged(range, status)](#XlsxPopulateAccess+rangeMerged) ⇒ [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess)
    * [.setRangeFormula(range, formula)](#XlsxPopulateAccess+setRangeFormula) ⇒ [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess)
    * [.rangeRef(range, withSheet)](#XlsxPopulateAccess+rangeRef) ⇒ <code>String</code>
    * [.forAllCells(cb)](#XlsxPopulateAccess+forAllCells) ⇒ [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess)
    * [.copyStyle(dest, src)](#XlsxPopulateAccess+copyStyle) ⇒ [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess)

<a name="new_XlsxPopulateAccess_new"></a>

### new XlsxPopulateAccess(workbook, XlsxPopulate)
The `XlsxPopulate` object need to be passed in order to extract
certain information from it, _without_ referring the whole library, thus
avoiding making the `xlsx-datafill` package a dependency.


| Param | Type | Description |
| --- | --- | --- |
| workbook | <code>Workbook</code> | The workbook to be accessed. |
| XlsxPopulate | <code>XlsxPopulate</code> | The actual xlsx-populate library object. |

<a name="XlsxPopulateAccess+workbook"></a>

### xlsxPopulateAccess.workbook() ⇒ <code>Workbook</code>
Returns the configured workbook for direct XlsxPopulate manipulation.

**Kind**: instance method of [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess)  
**Returns**: <code>Workbook</code> - The workbook involved.  
<a name="XlsxPopulateAccess+cellValue"></a>

### xlsxPopulateAccess.cellValue(cell) ⇒ <code>string</code>
Gets the textual representation of the cell value.

**Kind**: instance method of [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess)  
**Returns**: <code>string</code> - The textual representation of cell's contents.  

| Param | Type | Description |
| --- | --- | --- |
| cell | <code>Cell</code> | The cell to retrieve the value from. |

<a name="XlsxPopulateAccess+setCellValue"></a>

### xlsxPopulateAccess.setCellValue(cell, value) ⇒ [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess)
Sets the cell value.

**Kind**: instance method of [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess)  
**Returns**: [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess) - Either the requested value or chainable this.  

| Param | Type | Description |
| --- | --- | --- |
| cell | <code>Cell</code> | The cell to retrieve the value from. |
| value | <code>\*</code> | The requested value for setting. |

<a name="XlsxPopulateAccess+cellType"></a>

### xlsxPopulateAccess.cellType(cell) ⇒ <code>string</code>
Gets the textual representation of the cell value.

**Kind**: instance method of [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess)  
**Returns**: <code>string</code> - The type of the cell - 'formula', 'richtext', 
'text', 'number', 'date', 'hyperlink', or 'unknown';  

| Param | Type | Description |
| --- | --- | --- |
| cell | <code>Cell</code> | The cell to retrieve the value from. |

<a name="XlsxPopulateAccess+setCellFormula"></a>

### xlsxPopulateAccess.setCellFormula(cell, formula) ⇒ [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess)
Sets the formula in the cell

**Kind**: instance method of [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess)  
**Returns**: [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess) - For chaining.  

| Param | Type | Description |
| --- | --- | --- |
| cell | <code>Cell</code> | The cell to retrieve the value from. |
| formula | <code>string</code> | the text of the formula to be set. |

<a name="XlsxPopulateAccess+cellDistance"></a>

### xlsxPopulateAccess.cellDistance(from, to) ⇒ <code>Array.&lt;Number&gt;</code>
Measures the distance, as a vector between two given cells.

**Kind**: instance method of [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess)  
**Returns**: <code>Array.&lt;Number&gt;</code> - An array with two values [<rows>, <cols>], representing the distance between the two cells.  

| Param | Type | Description |
| --- | --- | --- |
| from | <code>Cell</code> | The first cell. |
| to | <code>Cell</code> | The second cell. |

<a name="XlsxPopulateAccess+cellSize"></a>

### xlsxPopulateAccess.cellSize(cell) ⇒ <code>Array.&lt;Number&gt;</code>
Determines the size of cell, taking into account if it is part of a merged range.

**Kind**: instance method of [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess)  
**Returns**: <code>Array.&lt;Number&gt;</code> - An array with two values [<rows>, <cols>], representing the occupied size.  

| Param | Type | Description |
| --- | --- | --- |
| cell | <code>Cell</code> | The cell to be investigated. |

<a name="XlsxPopulateAccess+setCellStyle"></a>

### xlsxPopulateAccess.setCellStyle(cell, name, value) ⇒ [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess)
Sets a named style of a given cell.

**Kind**: instance method of [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess)  
**Returns**: [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess) - For invocation chaining.  

| Param | Type | Description |
| --- | --- | --- |
| cell | <code>Cell</code> | The cell to be operated. |
| name | <code>string</code> | The name of the style property to be set. |
| value | <code>string</code> \| <code>object</code> | The value for this property to be set. |

<a name="XlsxPopulateAccess+cellRef"></a>

### xlsxPopulateAccess.cellRef(cell, withSheet) ⇒ <code>string</code>
Creates a reference Id for a given cell, based on its sheet and address.

**Kind**: instance method of [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess)  
**Returns**: <code>string</code> - The id to be used as a reference for this cell.  

| Param | Type | Description |
| --- | --- | --- |
| cell | <code>Cell</code> | The cell to create a reference Id to. |
| withSheet | <code>boolean</code> | Whether to include the sheet name in the reference. Defaults to true. |

<a name="XlsxPopulateAccess+buildRef"></a>

### xlsxPopulateAccess.buildRef(cell, adr, withSheet) ⇒ <code>string</code>
Build a reference string for a cell identified by @param adr, from the @param cell.

**Kind**: instance method of [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess)  
**Returns**: <code>string</code> - A reference string identifying the target cell uniquely.  

| Param | Type | Description |
| --- | --- | --- |
| cell | <code>Cell</code> | A cell that is a base of the reference. |
| adr | <code>string</code> | The address of the target cell, as mentioned in @param cell. |
| withSheet | <code>boolean</code> | Whether to include the sheet name in the reference. Defaults to true. |

<a name="XlsxPopulateAccess+getCell"></a>

### xlsxPopulateAccess.getCell(address, sheetId) ⇒ <code>Cell</code>
Retrieves a given cell from a given sheet (or an active one).

**Kind**: instance method of [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess)  
**Returns**: <code>Cell</code> - A reference to the required cell.  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>string</code> \| <code>object</code> \| <code>array</code> | The cell adress to be used |
| sheetId | <code>string</code> \| <code>idx</code> | The id/name of the sheet to retrieve the cell from. Defaults to an active one. |

<a name="XlsxPopulateAccess+getCellRange"></a>

### xlsxPopulateAccess.getCellRange(cell, rowOffset, colOffset) ⇒ <code>Range</code>
Constructs and returns the range starting from the given cell and spawning given rows and cells.

**Kind**: instance method of [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess)  
**Returns**: <code>Range</code> - The constructed range.  

| Param | Type | Description |
| --- | --- | --- |
| cell | <code>Cell</code> | The starting cell of the range. |
| rowOffset | <code>Number</code> | Number of rows away from the starting cell. 0 means same row. |
| colOffset | <code>Number</code> | Number of columns away from the starting cell. 0 means same column. |

<a name="XlsxPopulateAccess+offsetCell"></a>

### xlsxPopulateAccess.offsetCell(cell, rows, cols) ⇒ <code>Cell</code>
Gets the cell at a certain offset from a given one.

**Kind**: instance method of [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess)  
**Returns**: <code>Cell</code> - The resulting cell.  

| Param | Type | Description |
| --- | --- | --- |
| cell | <code>Cell</code> | The reference cell to make the offset from. |
| rows | <code>int</code> | Number of rows to offset. |
| cols | <code>int</code> | Number of columns to offset. |

<a name="XlsxPopulateAccess+rangeMerged"></a>

### xlsxPopulateAccess.rangeMerged(range, status) ⇒ [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess)
Merge or split range of cells.

**Kind**: instance method of [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess)  
**Returns**: [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess) - For chain invokes.  

| Param | Type | Description |
| --- | --- | --- |
| range | <code>Range</code> | The range, as returned from [getCellRange](getCellRange) |
| status | <code>boolean</code> | The merged status to be set. |

<a name="XlsxPopulateAccess+setRangeFormula"></a>

### xlsxPopulateAccess.setRangeFormula(range, formula) ⇒ [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess)
Sets a formula for the whole range. If it contains only one - it is set directly.

**Kind**: instance method of [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess)  
**Returns**: [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess) - For chain invokes.  

| Param | Type | Description |
| --- | --- | --- |
| range | <code>Range</code> | The range, as returned from [getCellRange](getCellRange) |
| formula | <code>String</code> | The formula to be set. |

<a name="XlsxPopulateAccess+rangeRef"></a>

### xlsxPopulateAccess.rangeRef(range, withSheet) ⇒ <code>String</code>
Return the string representation of a given range.

**Kind**: instance method of [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess)  
**Returns**: <code>String</code> - The string, representing the given range.  

| Param | Type | Description |
| --- | --- | --- |
| range | <code>Range</code> | The range which address we're interested in. |
| withSheet | <code>boolean</code> | Whether to include sheet name in the address. |

<a name="XlsxPopulateAccess+forAllCells"></a>

### xlsxPopulateAccess.forAllCells(cb) ⇒ [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess)
Iterate over all used cells of the given workbook.

**Kind**: instance method of [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess)  
**Returns**: [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess) - For chain invokes.  

| Param | Type | Description |
| --- | --- | --- |
| cb | <code>function</code> | The callback to be invoked with `cell` argument for each used cell. |

<a name="XlsxPopulateAccess+copyStyle"></a>

### xlsxPopulateAccess.copyStyle(dest, src) ⇒ [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess)
Copies the styles from `src` cell to the `dest`-ination one.

**Kind**: instance method of [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess)  
**Returns**: [<code>XlsxPopulateAccess</code>](#XlsxPopulateAccess) - For invocation chaining.  

| Param | Type | Description |
| --- | --- | --- |
| dest | <code>Cell</code> | Destination cell. |
| src | <code>Cell</code> | Source cell. |

