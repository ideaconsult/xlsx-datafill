/* eslint-disable no-console */
'use strict';

const _ = require('lodash');
const shape = _.map(process.argv[2].split(","), v => parseInt(v));
const generateMultiD = function (shape) {
    const _gen1D = function (curDim, dims) {
        if (curDim == shape.length) {
            return dims.join('.');
        } else {
            const res = {
                header: `Dimension ${curDim + 1}`,
                data: []
            };
            
            if (curDim > 0)
                res.header += ` - ${dims[curDim - 1]}`;
                
            for (let i = 0; i < shape[curDim]; ++i) {
                dims[curDim] = i + 1;
                res.data.push(_gen1D(curDim + 1, dims));
            }

            return res;
        }
    };

    return _gen1D(0, _.fill(_.clone(shape), 0));
};
process.stdout.write(JSON.stringify(generateMultiD(shape), null, 2));
