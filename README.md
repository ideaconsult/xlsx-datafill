# XSLX Smart Templates

A parsed workbook can be treated as a template for filling in externally provided data. Cells are scanned for specific format ([Mustache](https://mustache.github.io) based - `{{ }}`) and the information provided inside is used to extract the proper values and fill them in the adjacent ranges. 

Data is provided as a JavasScript object, and can be multidimensional, i.e. more than two, and `XlsxPopulate` takes care to merge the cells from the outer dimensions to preserve the hierarchical outlook of the data.

## Template format

The format of each template is this:

```
{{ <reference cell> | 
	<iterators> | 
	<extractor> | 
	<padding> | 
	<styling> }}
```

Both the surrounding `{{`mustache`}}` brackets, and the `|` separator symbol are configurable. The meaning of each field is:

| Field       | Meaning                                                      |
| ----------- | ------------------------------------------------------------ |
| <reference> | The address of a cell, to be used as a reference for data extraction. If omitted - the provided object’s root is considered. E.g. `D1` - the data extracted from the template specified in cell `D1`, will be used for iteration. |
| <iterators> | JSON paths, determining how the data for this template should be extracted from the referenced one. E.g. `authors * genres` - defines a 2D data - for each referenced data entry, the `authors` property is accessed, and for each of the entries - the `genres` property extracted. This is the data provided to other templates, referencing this one. Cannot be empty. |
| <extractor> | A JSON path, determining how the value that needs to be written in the cell(s) is extracted from the data, provided by the iterators. E.g. `name` - from all genres, extracted from the iterators, the `name` property is used to fill the cells. Can be omitted, in which case the iterators’ provided data is taken as a whole. |
| <padding>   | A `:` delimited pair specifying how many cells on each direction `row:column` need to be added for each new entry from the extracted data. Can be omitted. |
| <styling>   | A comma-delimited styling pairs of the format `<style name>=<extractor>`, setting each cell’s style with the given name, to the value extracted from iterator’s data, using the `extractor` as a JSON path. E.g. `fill=colorTag` will set the `fill` style of the cell, to the value of `colorTag` property inside each of `genres` extracted entries. |

In order to add additional flexibility, one can reference a user-provided function (via [template options](#template-options)) for both _iterators_ and _extractors_, including those used for styling. If a JSON-path component is suffixed with `:<handler name>` (e.g. `1 * authors:genreIteration`), the corresponding handler is invoked with the extractor value (from `authors` in the example), and the result is taken instead for the particular stage.

## Template options

Here are the defaults:

```javascript
{
    templateRegExp: new RegExp(/\{\{([^}]*)\}\}/),
    fieldSplitter: "|",
    joinText: ",",
    callbacksMap: {
        "": data => _.keys(data)
    }
};

```



## Notes

There are several specifics to be kept in mind:

* The _iterators_ should resolve to arrays. It is possible for the last one (the innermost dimension) to resolve to an object, **but** in such case — it’ll be automatically converted to an array of object’s values. If you need the keys — append `:` to the last iterator - it’ll resolve to an empty _extraction handler_ which has a default definition of returning the keys of the provided object.
* If during value extraction, the result is an array — it is automatically joined, using the (configurable) `joinText` from the options.
* No matter what part of the cell’s value the template definition occupies, at the end — the whole cell is overwritten with the resolved value(s). Since, this is not a simple find-and-replace, and the cells need duplication — it is not as trivial as expected. Not impossible either.



Demo set reference: https://knowledge.kitchen/Books_example_data_set

### 