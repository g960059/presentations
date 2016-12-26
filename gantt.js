/**
 * @license Highcharts JS vgantt (2016-12-23)
 * Gantt series
 *
 * (c) 2016 Lars A. V. Cabrera
 *
 * --- WORK IN PROGRESS ---
 *
 * License: www.highcharts.com/license
 */(function (factory) {
if (typeof module === 'object' && module.exports) {
module.exports = factory;
} else {
factory(Highcharts);
}
}(function (Highcharts) {
(function (H) {
/**
* (c) 2016 Highsoft AS
* Author: Lars A. V. Cabrera
*
* License: www.highcharts.com/license
*/
'use strict';


var merge = H.merge,
  wrap = H.wrap,
  Axis = H.Axis,
  PlotLineOrBand = H.PlotLineOrBand,
  defaultConfig = {
    color: '#FF0000',
    width: 2,
    label: {
      format: '%a, %b %d %Y, %H:%M:%S',
      formatter: undefined,
      rotation: 0
    }
  };

wrap(Axis.prototype, 'setOptions', function (proceed, userOptions) {
  var axis = this,
    cdiOptions = userOptions.currentDateIndicator;

  if (cdiOptions) {
    if (typeof cdiOptions === 'object') {
      // Ignore formatter if custom format is defined
      if (cdiOptions.label && cdiOptions.label.format) {
        cdiOptions.label.formatter = undefined;
      }
      cdiOptions = merge(defaultConfig, cdiOptions);
    } else {
      cdiOptions = merge(defaultConfig);
    }

    cdiOptions.value = new Date();

    if (!userOptions.plotLines) {
      userOptions.plotLines = [];
    }

    userOptions.plotLines.push(cdiOptions);
  }

  proceed.apply(axis, Array.prototype.slice.call(arguments, 1));

});

wrap(PlotLineOrBand.prototype, 'render', function (proceed) {
  var plotLoB = this,
    axis = plotLoB.axis,
    options = plotLoB.options,
    format = options.label.format,
    formatter = options.label.formatter,
    cdiOptions = axis.options.currentDateIndicator;

  if (cdiOptions) {
    options.value = new Date();
    if (typeof formatter === 'function') {
      options.label.text = formatter(plotLoB);
    } else {
      options.label.text = H.dateFormat(format, new Date());
    }
  }
  return proceed.apply(plotLoB, Array.prototype.slice.call(arguments, 1));
});

wrap(PlotLineOrBand.prototype, 'renderLabel', function (proceed) {
  var plotLoB = this,
    axis = plotLoB.axis,
    cdiOptions = axis.options.currentDateIndicator;

  if (cdiOptions && plotLoB.label) {
    plotLoB.label.destroy();
    delete plotLoB.label;
  }

  proceed.apply(plotLoB, Array.prototype.slice.call(arguments, 1));
});

}(Highcharts));
(function (H) {
/**
* (c) 2016 Highsoft AS
* Authors: Lars A. V. Cabrera
*
* License: www.highcharts.com/license
*/
'use strict';

var argsToArray = function (args) {
    return Array.prototype.slice.call(args, 1);
  },
  dateFormat = H.dateFormat,
  defined = H.defined,
  each = H.each,
  isObject = H.isObject,
  pick = H.pick,
  wrap = H.wrap,
  Axis = H.Axis,
  Chart = H.Chart,
  Tick = H.Tick;

// Enum for which side the axis is on.
// Maps to axis.side
var axisSide = {
  top: 0,
  right: 1,
  bottom: 2,
  left: 3,
  0: 'top',
  1: 'right',
  2: 'bottom',
  3: 'left'
};

/**
 * Checks if an axis is a navigator axis.
 * @return {Boolean} true if axis is found in axis.chart.navigator
 */
Axis.prototype.isNavigatorAxis = function () {
  var axis = this,
    navigator = axis.chart.navigator;
  return navigator && (navigator.xAxis === axis || navigator.yAxis === axis);
};

/**
 * Checks if an axis is the outer axis in its dimension. Since
 * axes are placed outwards in order, the axis with the highest
 * index is the outermost axis.
 *
 * Example: If there are multiple x-axes at the top of the chart,
 * this function returns true if the axis supplied is the last
 * of the x-axes.
 *
 * @return true if the axis is the outermost axis in its dimension;
 *     false if not
 */
Axis.prototype.isOuterAxis = function () {
  var axis = this,
    chart = axis.chart,
    thisIndex = -1,
    isOuter = true;

  each(chart.axes, function (otherAxis, index) {
    if (otherAxis.side === axis.side && !otherAxis.isNavigatorAxis()) {
      if (otherAxis === axis) {
        // Get the index of the axis in question
        thisIndex = index;

        // Check thisIndex >= 0 in case thisIndex has
        // not been found yet
      } else if (thisIndex >= 0 && index > thisIndex) {
        // There was an axis on the same side with a
        // higher index.
        isOuter = false;
      }
    }
  });
  // There were either no other axes on the same side,
  // or the other axes were not farther from the chart
  return isOuter;
};

/**
 * Get the maximum label length.
 * This function can be used in states where the axis.maxLabelLength has not
 * been set.
 *
 * @param  {boolean} force - Optional parameter to force a new calculation, even
 *                           if a value has already been set
 * @return {number} maxLabelLength - the maximum label length of the axis
 */
Axis.prototype.getMaxLabelLength = function (force) {
  var tickPositions = this.tickPositions,
    ticks = this.ticks,
    maxLabelLength = 0;

  if (!this.maxLabelLength || force) {
    each(tickPositions, function (tick) {
      tick = ticks[tick];
      if (tick && tick.labelLength > maxLabelLength) {
        maxLabelLength = tick.labelLength;
      }
    });
    this.maxLabelLength = maxLabelLength;
  }
  return this.maxLabelLength;
};

/**
 * Add custom date formats
 */
H.dateFormats = {
  // Week number
  W: function (timestamp) {
    var date = new Date(timestamp),
      day = date.getUTCDay() === 0 ? 7 : date.getUTCDay(),
      time = date.getTime(),
      startOfYear = new Date(date.getUTCFullYear(), 0, 1, -6),
      dayNumber;
    date.setDate(date.getUTCDate() + 4 - day);
    dayNumber = Math.floor((time - startOfYear) / 86400000);
    return 1 + Math.floor(dayNumber / 7);
  },
  // First letter of the day of the week, e.g. 'M' for 'Monday'.
  E: function (timestamp) {
    return dateFormat('%a', timestamp, true).charAt(0);
  }
};

/**
 * Prevents adding the last tick label if the axis is not a category axis.
 *
 * Since numeric labels are normally placed at starts and ends of a range of
 * value, and this module makes the label point at the value, an "extra" label
 * would appear.
 *
 * @param {function} proceed - the original function
 */
wrap(Tick.prototype, 'addLabel', function (proceed) {
  var axis = this.axis,
    categoryAxis = defined(axis.options.categories),
    tickPositions = axis.tickPositions,
    lastTick = tickPositions[tickPositions.length - 1],
    isLastTick = this.pos === lastTick;

  if (!axis.options.grid || categoryAxis || !isLastTick) {
    proceed.apply(this);
  }
});

/**
 * If chart is stockChart, always return 'left' to avoid first label being
 * placed inside chart.
 * @param {function} proceed - the original function
 * @return {string} 'left' if stockChart, or auto calculated alignment
 */
wrap(Axis.prototype, 'autoLabelAlign', function (proceed) {
  var axis = this,
    retVal;
  if (axis.chart.isStock) {
    retVal = 'left';
  } else {
    retVal = proceed.apply(axis, argsToArray(arguments));
  }
  return retVal;
});

/**
 * Center tick labels vertically and horizontally between ticks
 *
 * @param {function} proceed - the original function
 *
 * @return {object} object - an object containing x and y positions
 *             for the tick
 */
wrap(Tick.prototype, 'getLabelPosition', function (proceed, x, y, label, horiz, labelOptions, tickmarkOffset, index) {
  var tick = this,
    retVal = proceed.apply(tick, argsToArray(arguments)),
    axis = tick.axis,
    options = axis.options,
    categoryAxis = defined(options.categories),
    tickInterval = options.tickInterval || axis.tickInterval,
    reversed = axis.reversed,
    tickPositions = axis.tickPositions,
    isFirstTick = tick.pos === axis.min,
    lastTickPos = tickPositions[tickPositions.length - 2],
    isLastTick = tick.pos === lastTickPos,
    nextTickPos = tickPositions[index + 1],
    tickPixelInterval,
    newX,
    axisMin,
    axisHeight,
    fontSize,
    labelMetrics,
    labelBase,
    labelHeight,
    axisYCenter,
    labelYCenter;

  // Only center tick labels in grid axes
  if (options.grid) {
    fontSize = options.labels.style.fontSize;
    labelMetrics = axis.chart.renderer.fontMetrics(fontSize, label.element);
    labelBase = labelMetrics.b;
    labelHeight = labelMetrics.h;
    fontSize = labelMetrics.f;
    labelYCenter = (labelBase / 2) - ((labelHeight - fontSize) / 2);

    if (axis.horiz && !categoryAxis) {
      // Center x position
      if (isFirstTick) {
        if (nextTickPos) {
          x = axis.translate((tick.pos + nextTickPos) / 2);
        }
        retVal.x = x + axis.left;
      } else if (isLastTick) {
        retVal.x = (axis.left + axis.len + x) / 2;
      } else {
        x = axis.translate(tick.pos + (tickInterval / 2));
        retVal.x = x + axis.left;
      }

      axisHeight = axis.axisGroup.getBBox().height;
      axisYCenter = (axisHeight / 2);

      y += labelYCenter;

      // Center y position
      if (axis.side === axisSide.top) {
        retVal.y = y - axisYCenter;
      } else {
        retVal.y = y + axisYCenter;
      }
    } else {
      // Center y position
      if (!defined(options.categories)) {
        axisMin = reversed ? axis.max : axis.min;
        tickPixelInterval = axis.translate(axisMin + tickInterval);
        retVal.y = y - (tickPixelInterval / 2) + labelYCenter;
      }

      // Center x position
      newX = (tick.label.getBBox().width / 2) - (axis.maxLabelLength / 2);
      if (axis.side === axisSide.left) {
        retVal.x += newX;
      } else {
        retVal.x -= newX;
      }
    }
  }
  return retVal;
});

/**
 * Draw vertical ticks extra long to create cell floors and roofs.
 * Overrides the tickLength for vertical axes.
 *
 * @param {function} proceed - the original function
 * @returns {array} retVal -
 */
wrap(Axis.prototype, 'tickSize', function (proceed) {
  var axis = this,
    retVal = proceed.apply(axis, argsToArray(arguments)),
    labelPadding,
    distance;

  if (axis.options.grid && !axis.horiz) {
    labelPadding = (Math.abs(axis.defaultLeftAxisOptions.labels.x) * 2);
    if (!axis.maxLabelLength) {
      axis.maxLabelLength = axis.getMaxLabelLength();
    }
    distance = axis.maxLabelLength + labelPadding;

    retVal[0] = distance;
  }
  return retVal;
});

/**
 * Sets the axis title to null unless otherwise specified by user.
 * @param {Function} proceed - the original function
 * @param {Object} userOptions - the user specified axis options
 */
wrap(Axis.prototype, 'setOptions', function (proceed, userOptions) {
  var axis = this;

  if (userOptions.title && !userOptions.title.text) {
    userOptions.title.text = null;
  }

  proceed.apply(axis, argsToArray(arguments));
});

/**
 * Disregards space required by axisTitle, by adding axisTitle to axisParent
 * instead of axisGroup, and disregarding margins and offsets related to
 * axisTitle.
 *
 * @param {function} proceed - the original function
 */
wrap(Axis.prototype, 'getOffset', function (proceed) {
  var axis = this,
    axisOffset = axis.chart.axisOffset,
    side = axis.side,
    axisHeight,
    tickSize,
    options = axis.options,
    axisTitleOptions = options.title,
    addTitle = axisTitleOptions &&
        axisTitleOptions.text &&
        axisTitleOptions.enabled !== false;

  if (axis.options.grid && isObject(axis.options.title)) {

    tickSize = axis.tickSize('tick')[0];
    if (axisOffset[side] && tickSize) {
      axisHeight = axisOffset[side] + tickSize;
    }

    if (addTitle) {
      // Use the custom addTitle() to add it, while preventing making room
      // for it
      axis.addTitle();
    }

    proceed.apply(axis, argsToArray(arguments));

    axisOffset[side] = pick(axisHeight, axisOffset[side]);


    // Put axis options back after original Axis.getOffset() has been called
    options.title = axisTitleOptions;

  } else {
    proceed.apply(axis, argsToArray(arguments));
  }
});

/**
 * Prevents rotation of labels when squished, as rotating them would not
 * help.
 *
 * @param {function} proceed - the original function
 */
wrap(Axis.prototype, 'renderUnsquish', function (proceed) {
  if (this.options.grid) {
    this.labelRotation = 0;
    this.options.labels.rotation = 0;
  }
  proceed.apply(this);
});

/**
 * Creates a left and right wall on horizontal axes:
 * - Places leftmost tick at the start of the axis, to create a left wall
 * - Ensures that the rightmost tick is at the end of the axis, minus the tick
 *   interval, to create a right wall.
 *
 * @param {function} proceed - the original function
 * @param {object} options - the pure axis options as input by the user
 */
wrap(Axis.prototype, 'setOptions', function (proceed, options) {
  var axis = this;

  if (options.grid) {

    if (!options.title) {
      options.title = '';
    }

    if (axis.horiz) {
      /*               _________________________
      * Make this:    ___|_____|_____|_____|__|
      *               ^                     ^
      *               _________________________
      * Into this:    |_____|_____|_____|_____|
      *                  ^                 ^
      */
      options.minPadding = pick(options.minPadding, 0);
      options.maxPadding = pick(options.minPadding, 0);
    }
  }

  proceed.apply(this, argsToArray(arguments));
});

/**
 * Ensures a left wall on horizontal axes with series inheriting from column:
 * ColumnSeries normally sets pointRange to null, resulting in Axis to select
 * other values for point ranges. This enforces the above Axis.setOptions()
 * override.
 *                  _________________________
 * Enforce this:    ___|_____|_____|_____|__|
 *                  ^
 *                  _________________________
 * To be this:      |_____|_____|_____|_____|
 *                  ^
 *
 * @param {function} proceed - the original function
 * @param {object} options - the pure axis options as input by the user
 */
wrap(Axis.prototype, 'setAxisTranslation', function (proceed) {
  var axis = this;
  if (axis.options.grid && axis.horiz) {
    each(axis.series, function (series) {
      series.options.pointRange = 0;
    });
  }
  proceed.apply(axis, argsToArray(arguments));
});

/**
 * Makes tick labels which are usually ignored in a linked axis displayed if
 * they are within range of linkedParent.min.
 *                        _____________________________
 *                        |   |       |       |       |
 * Make this:             |   |   2   |   3   |   4   |
 *                        |___|_______|_______|_______|
 *                          ^
 *                        _____________________________
 *                        |   |       |       |       |
 * Into this:             | 1 |   2   |   3   |   4   |
 *                        |___|_______|_______|_______|
 *                          ^
 * @param {function} proceed - the original function
 */
wrap(Axis.prototype, 'trimTicks', function (proceed) {
  var axis = this,
    isGridAxis = axis.options.grid,
    isLinked = axis.isLinked,
    tickPositions = axis.tickPositions,
    firstPos = tickPositions[0],
    min = axis.linkedParent && axis.linkedParent.min,
    tickInterval = axis.tickInterval,
    withinRange = firstPos < min && firstPos + tickInterval > min;

  if (isGridAxis && isLinked && withinRange) {
    tickPositions[0] = min;
  }
  proceed.apply(axis, argsToArray(arguments));
});

/**
 * Draw an extra line on the far side of the the axisLine,
 * creating cell roofs of a grid.
 *
 * @param {function} proceed - the original function
 */
wrap(Axis.prototype, 'render', function (proceed) {
  var axis = this,
    options = axis.options,
    labelPadding,
    distance,
    lineWidth,
    linePath,
    yStartIndex,
    yEndIndex,
    xStartIndex,
    xEndIndex,
    x,
    y,
    path,
    attrs,
    renderer = axis.chart.renderer,
    horiz = axis.horiz,
    axisGroupBox;

  if (options.grid) {
    labelPadding = (Math.abs(axis.defaultLeftAxisOptions.labels.x) * 2);
    distance = axis.maxLabelLength + labelPadding;
    lineWidth = options.lineWidth;

    // Remove right wall before rendering
    if (axis.rightWall) {
      axis.rightWall.destroy();
    }

    // Call original Axis.render() to obtain axis.axisLine and
    // axis.axisGroup
    proceed.apply(axis);

    axisGroupBox = axis.axisGroup.getBBox();

    /*
     * Add right and left wall on horizontal axes:
     *               _________________________
     * Make this:    _______|______|______|___
     *               ^                       ^
     *               _________________________
     * Into this:    |______|______|______|__|
     *               ^                       ^
     */
    if (horiz) {
      x = axisGroupBox.x;
      y = axisGroupBox.y;
      // Make path or left wall
      path = [
        'M', x, y,
        'L', x, y + axisGroupBox.height
      ];
      attrs = {
        stroke: options.tickColor || '#ccd6eb',
        'stroke-width': options.tickWidth || 1,
        zIndex: 7,
        class: 'grid-wall'
      };

      axis.leftWall = renderer.path(path)
        .attr(attrs)
        .add(axis.axisGroup);

      // Change x positions for right wall
      path[1] = path[4] = x + axis.width + 1; // +1 accounts for left wall

      axis.rightWall = renderer.path(path)
        .attr(attrs)
        .add(axis.axisGroup);
    }

    /*
     * Draw an extra axis line on outer axes
     *             >
     * Make this:    |______|______|______|___
     *
     *             > _________________________
     * Into this:    |______|______|______|__|
     *
     */
    if (axis.isOuterAxis() && axis.axisLine) {
      if (horiz) {
        // -1 to avoid adding distance each time the chart updates
        distance = axisGroupBox.height - 1;
      }

      if (lineWidth) {
        linePath = axis.getLinePath(lineWidth);
        xStartIndex = linePath.indexOf('M') + 1;
        xEndIndex = linePath.indexOf('L') + 1;
        yStartIndex = linePath.indexOf('M') + 2;
        yEndIndex = linePath.indexOf('L') + 2;

        // Negate distance if top or left axis
        if (axis.side === axisSide.top || axis.side === axisSide.left) {
          distance = -distance;
        }

        // If axis is horizontal, reposition line path vertically
        if (horiz) {
          linePath[yStartIndex] = linePath[yStartIndex] + distance;
          linePath[yEndIndex] = linePath[yEndIndex] + distance;
        } else {
          // If axis is vertical, reposition line path horizontally
          linePath[xStartIndex] = linePath[xStartIndex] + distance;
          linePath[xEndIndex] = linePath[xEndIndex] + distance;
        }

        if (!axis.axisLineExtra) {
          axis.axisLineExtra = renderer.path(linePath)
            .attr({
              stroke: options.lineColor,
              'stroke-width': lineWidth,
              zIndex: 7
            })
            .add(axis.axisGroup);
        } else {
          axis.axisLineExtra.animate({
            d: linePath
          });
        }

        // show or hide the line depending on options.showEmpty
        axis.axisLine[axis.showAxis ? 'show' : 'hide'](true);
      }
    }
  } else {
    proceed.apply(axis);
  }
});

/**
 * Wraps chart rendering with the following customizations:
 * 1. Prohibit timespans of multitudes of a time unit
 * 2. Draw cell walls on vertical axes
 *
 * @param {function} proceed - the original function
 */
wrap(Chart.prototype, 'render', function (proceed) {
  // 25 is optimal height for default fontSize (11px)
  // 25 / 11 ≈ 2.28
  var fontSizeToCellHeightRatio = 25 / 11,
    fontMetrics,
    fontSize;

  each(this.axes, function (axis) {
    var options = axis.options;
    if (options.grid) {
      fontSize = options.labels.style.fontSize;
      fontMetrics = axis.chart.renderer.fontMetrics(fontSize);

      // Prohibit timespans of multitudes of a time unit,
      // e.g. two days, three weeks, etc.
      if (options.type === 'datetime') {
        options.units = [
          ['millisecond', [1]],
          ['second', [1]],
          ['minute', [1]],
          ['hour', [1]],
          ['day', [1]],
          ['week', [1]],
          ['month', [1]],
          ['year', null]
        ];
      }

      // Make tick marks taller, creating cell walls of a grid.
      // Use cellHeight axis option if set
      if (axis.horiz) {
        options.tickLength = options.cellHeight ||
            fontMetrics.h * fontSizeToCellHeightRatio;
      } else {
        options.tickWidth = 1;
        if (!options.lineWidth) {
          options.lineWidth = 1;
        }
      }
    }
  });

  // Call original Chart.render()
  proceed.apply(this);
});

}(Highcharts));
var algorithms = (function (H) {
/**
* (c) 2016 Highsoft AS
* Author: Øystein Moseng
*
* License: www.highcharts.com/license
*/
'use strict';

var min = Math.min,
  max = Math.max,
  abs = Math.abs,
  pick = H.pick;

/**
 * Get index of last obstacle before xMin. Employs a type of binary search, and
 * thus requires that obstacles are sorted by xMin value.
 *
 * @param {Array} obstacles Array of obstacles to search in.
 * @param {Number} xMin The xMin threshold.
 * @param {Number} startIx Starting index to search from. Must be within array
 *  range.
 *
 * @return {Number} result The index of the last obstacle element before xMin.
 */
function findLastObstacleBefore(obstacles, xMin, startIx) {
  var left = startIx || 0, // left limit
    right = obstacles.length - 1, // right limit
    min = xMin - 0.0000001, // Make sure we include all obstacles at xMin
    cursor,
    cmp;
  while (left <= right) {
    cursor = (right + left) >> 1;
    cmp = min - obstacles[cursor].xMin;
    if (cmp > 0) {
      left = cursor + 1;
    } else if (cmp < 0) {
      right = cursor - 1;
    } else {
      return cursor;
    }
  }
  return left > 0 ? left - 1 : 0;
}

/**
 * Test if a point lays within an obstacle. 
 *
 * @param {Object} obstacle Obstacle to test.
 * @param {Object} point Point with x/y props.
 * @param {Object} options Obstacle options, including margin.
 *
 * @return {Boolean} result Whether point is within the obstacle or not.
 */
function pointWithinObstacle(obstacle, point, options) {
  var margin = options.margin || 0;
  return (
    point.x <= obstacle.xMax - margin &&
    point.x >= obstacle.xMin + margin &&
    point.y <= obstacle.yMax - margin &&
    point.y >= obstacle.yMin + margin
  );
}

/**
 * Find the index of an obstacle that wraps around a point. 
 * Returns -1 if not found.
 *
 * @param {Array} obstacles Obstacles to test.
 * @param {Object} point Point with x/y props.
 * @param {Object} options Obstacle options, including margin.
 *
 * @return {Number} result Ix of the obstacle in the array, or -1 if not found.
 */
function findObstacleFromPoint(obstacles, point, options) {
  for (var i = findLastObstacleBefore(obstacles, point.x); 
      i < obstacles.length && obstacles[i].xMin <= point.x; ++i) {
    if (pointWithinObstacle(obstacles[i], point, options)) {
      return i;
    }
  }
  return -1;
}

/**
 * Get SVG path array from array of line segments.
 *
 * @param {Array} segments The segments to build the path from.
 *
 * @return {Array} result SVG path array as accepted by the SVG Renderer.
 */
function pathFromSegments(segments) {
  var path = [];
  if (segments.length) {
    path.push('M', segments[0].start.x, segments[0].start.y);
    for (var i = 0; i < segments.length; ++i) {
      path.push('L', segments[i].end.x, segments[i].end.y);
    }
  }
  return path;
}



// Define the available pathfinding algorithms.
// Algorithms take up to 3 arguments: starting point, ending point, and an 
// options object.
var algorithms = {

  /**
   * Get an SVG path from a starting coordinate to an ending coordinate.
   * Draws a straight line.    
   *
   * @param {Object} start Starting coordinate, object with x/y props.
   * @param {Object} end Ending coordinate, object with x/y props.
   *
   * @return {Object} result An object with the SVG path in Array form as
   *  accepted by the SVG renderer, as well as an array of new obstacles 
   *  making up this path.
   */
  straight: function (start, end) {
    return {
      path: ['M', start.x, start.y, 'L', end.x, end.y],
      obstacles: [{ start, end }]
    };
  },

  /**
   * Find a path from a starting coordinate to an ending coordinate, taking 
   * obstacles into consideration. Might not always find the optimal path, 
   * but is fast, and usually good enough.
   *
   *  Options
   *      - chartObstacles:   Array of chart obstacles to avoid
   *      - lineObstacles:    Array of line obstacles to jump over
   *    - obstacleMetrics:  Object with metrics of chartObstacles cached
   *    - hardBounds:   Hard boundaries to not cross
   *    - obstacleOptions:  Options for the obstacles, including margin
   *
   * @param {Object} start Starting coordinate, object with x/y props.
   * @param {Object} end Ending coordinate, object with x/y props.
   * @param {Object} options Options for the algorithm.
   *
   * @return {Object} result An object with the SVG path in Array form as
   *  accepted by the SVG renderer, as well as an array of new obstacles 
   *  making up this path.
   */
  fastAvoid: H.extend(function (start, end, options) {
    /*
      Algorithm rules/description
      - Find initial direction
      - Determine soft/hard max for each direction.
      - Move along initial direction until obstacle.
      - Change direction.
      - If hitting obstacle, first try to change length of previous line
        before changing direction again.
      - When changing directions, change them in the middle of the line.

      Soft min/max x = start/destination x +/- widest obstacle + margin
      Soft min/max y = start/destination y +/- tallest obstacle + margin

      TODO:
        - Make avoid the start/end obstacles in an intelligent way
        - Make retrospective, try changing prev segment to reduce 
          corners
        - Find more aestetic pivot point by pivoting in the middle of 
          two obstacles
    */
    var segments,

      // Boundaries to stay within. If beyond soft boundary, prefer to
      // change direction ASAP. If at hard max, always change immediately.
      metrics = options.obstacleMetrics,
      softMinX = min(start.x, end.x) - metrics.maxWidth - 30,
      softMaxX = max(start.x, end.x) + metrics.maxWidth + 30,
      softMinY = min(start.y, end.y) - metrics.maxHeight - 30,
      softMaxY = max(start.y, end.y) + metrics.maxHeight + 30,

      // Obstacles
      chartObstacles = options.chartObstacles,
      startObstacleIx = findLastObstacleBefore(chartObstacles, softMinX),
      endObstacleIx = findLastObstacleBefore(chartObstacles, softMaxX);

    // How far can you go between two points before hitting an obstacle?
    // Does not work for diagonal lines (because it doesn't have to).
    function pivotPoint(fromPoint, toPoint, directionIsX) {
      var firstPoint,
        lastPoint,
        highestPoint,
        lowestPoint,
        i;

      if (fromPoint.x < toPoint.x) {
        firstPoint = fromPoint;
        lastPoint = toPoint;
      } else {
        firstPoint = toPoint;
        lastPoint = fromPoint;
      }

      if (fromPoint.y < toPoint.y) {
        lowestPoint = fromPoint;
        highestPoint = toPoint;
      } else {
        lowestPoint = toPoint;
        highestPoint = fromPoint;
      }

      i = findLastObstacleBefore(chartObstacles, firstPoint.x);

      // Go through obstacles in this X range
      while (chartObstacles[i] && chartObstacles[i].xMin <= lastPoint.x) {
        // If this obstacle is between from and to points in a straight
        // line, pivot at the intersection.
        if (
          chartObstacles[i].xMax >= firstPoint.x &&
          chartObstacles[i].yMin <= highestPoint.y &&
          chartObstacles[i].yMax >= lowestPoint.y
        ) {
          if (directionIsX) {
            return {
              y: fromPoint.y,
              x: fromPoint.x < toPoint.x ? 
                chartObstacles[i].xMin - 1 :
                chartObstacles[i].xMax + 1,
              obstacle: chartObstacles[i]
            };
          }
          // else ...
          return {
            x: fromPoint.x,
            y: fromPoint.y < toPoint.y ?
              chartObstacles[i].yMin - 1 :
              chartObstacles[i].yMax + 1,
            obstacle: chartObstacles[i]
          };
        }

        ++i;
      }
      
      return toPoint;
    }

    // Find a clear path between points, optionally with a start direction 
    // parameter.
    function clearPathTo(fromPoint, toPoint, directionIsX) {
      // Don't waste time if we've hit goal
      if (fromPoint.x === toPoint.x && fromPoint.y === toPoint.y) {
        return [];
      }

      var dirIsX = pick(directionIsX, Math.abs(toPoint.x - fromPoint.x) >
              Math.abs(toPoint.y - fromPoint.y)),
        pivot = pivotPoint(fromPoint, {
          x: dirIsX ? toPoint.x : fromPoint.x,
          y: dirIsX ? fromPoint.y : toPoint.y
        }, dirIsX),
        segments = [{
          start: fromPoint,
          end: {
            x: pivot.x,
            y: pivot.y
          }
        }],
        waypoint,
        waypointUseMax,
        maxOutOfSoftBounds,
        minOutOfSoftBounds,
        maxOutOfHardBounds,
        minOutOfHardBounds;

      // Pivot before goal, use a waypoint to dodge obstacle
      if (pivot[dirIsX ? 'x' : 'y'] !== toPoint[dirIsX ? 'x' : 'y']) {
        // Find direction of waypoint
        maxOutOfSoftBounds = pivot.obstacle[dirIsX ? 'yMax' : 'xMax'] >
                      (dirIsX ? softMaxY : softMaxX);
        minOutOfSoftBounds = pivot.obstacle[dirIsX ? 'yMin' : 'xMin'] <
                      (dirIsX ? softMinY : softMinX);
        maxOutOfHardBounds = pivot.obstacle[dirIsX ? 'yMax' : 'xMax'] >
                options.hardBounds[dirIsX ? 'yMax' : 'xMax'];
        minOutOfHardBounds = pivot.obstacle[dirIsX ? 'yMin' : 'xMin'] <
                options.hardBounds[dirIsX ? 'yMin' : 'xMin'];
        waypointUseMax = abs(
            pivot.obstacle[dirIsX ? 'yMin' : 'xMin'] -
            pivot[dirIsX ? 'y' : 'x']
          ) >
          abs(
            pivot.obstacle[dirIsX ? 'yMax' : 'xMax'] -
            pivot[dirIsX ? 'y' : 'x']
          );
        // TODO: Double check this logic
        waypointUseMax = waypointUseMax && (!maxOutOfSoftBounds ||
                minOutOfSoftBounds) &&
                (!maxOutOfHardBounds ||
                minOutOfHardBounds);

        // Cut waypoint to hard bounds
        if (dirIsX) {
          pivot.obstacle.yMin = max(
            pivot.obstacle.yMin, options.hardBounds.yMin);
          pivot.obstacle.yMax = min(
              pivot.obstacle.yMax, options.hardBounds.yMax);
        } else {
          pivot.obstacle.xMin = max(
            pivot.obstacle.xMin, options.hardBounds.xMin);
          pivot.obstacle.xMax = min(
              pivot.obstacle.xMax, options.hardBounds.xMax);          
        }

        waypoint = {
          x: dirIsX ?
            pivot.x :
            pivot.obstacle[waypointUseMax ? 'xMax' : 'xMin'] + 
            (waypointUseMax ? 1 : -1),
          y: dirIsX ?
            pivot.obstacle[waypointUseMax ? 'yMax' : 'yMin'] + 
            (waypointUseMax ? 1 : -1) :
            pivot.y
        };

        // We're changing direction here, store that to make sure we
        // also change direction when adding the last segment array
        // after handling waypoint.
        dirIsX = !dirIsX;

        segments = segments.concat(clearPathTo({
          x: pivot.x,
          y: pivot.y
        }, waypoint, dirIsX));
      }

      // Get segments for the other direction too
      // Recursion is our friend
      segments = segments.concat(clearPathTo(
        segments[segments.length - 1].end, toPoint, !dirIsX
      ));

      return segments;
    }

    // Cut the obstacle array for optimization in large datasets
    chartObstacles = chartObstacles.slice(startObstacleIx, endObstacleIx + 1);

    // Remove obstacles that envelop the start/end points
    while ((startObstacleIx = findObstacleFromPoint(chartObstacles, start,
      options.obstacleOptions)) > -1) {
      chartObstacles.splice(startObstacleIx, 1);
    }
    while ((endObstacleIx = findObstacleFromPoint(chartObstacles, end, 
      options, options.obstacleOptions)) > -1) {
      chartObstacles.splice(endObstacleIx, 1);
    }

    // Find the path
    segments = clearPathTo(start, end);

    return {
      path: pathFromSegments(segments),
      obstacles: segments
    };
  }, {
    requiresObstacles: true
  })
};
return algorithms;
}(Highcharts));
(function (H, pathfinderAlgorithms) {
/**
* (c) 2016 Highsoft AS
* Author: Øystein Moseng
*
* License: www.highcharts.com/license
*/
'use strict';

var deg2rad = H.deg2rad,
  extend = H.extend,
  each = H.each,
  addEvent = H.addEvent,
  merge = H.merge;

// TODO:
// Check dynamics, including hiding/adding/removing/updating series/points etc.
// Symbols for markers

// Set default Pathfinder options
extend(H.defaultOptions, {
  pathfinder: {
    // enabled: true,
    // dashStyle: 'solid',
    // color: point.color,
    type: 'straight',
    // TODO
    // start and end marker symbols should be disabled by default
    startMarker: {
      symbol: 'circle',
      align: 'center',
      radius: 4,
      inside: false,
      verticalAlign: 'middle'
    },
    endMarker: {
      symbol: 'diamond',
      align: 'center',
      radius: 4,
      inside: false,
      verticalAlign: 'middle'
    },
    lineWidth: 1,
    algorithmMargin: 10
  }
});

/**
 * The Pathfinder class.
 *
 * @class
 * @param {Object} chart
 */
function Pathfinder(chart) {
  this.init(chart);
}
Pathfinder.prototype = {

  algorithms: pathfinderAlgorithms,

  /**
   * Initialize the Pathfinder object.
   *
   * @param {Object} chart The chart context.
   */
  init: function (chart) {
    // Initialize pathfinder with chart context
    this.chart = chart;

    // Init path reference list
    this.paths = [];

    // Recalculate paths/obstacles on chart redraw
    addEvent(chart, 'redraw', function () {
      if (this.pathfinder.isDirty) {
        this.pathfinder.update(); // Go through options structure
      } else {
        this.pathfinder.renderConnections(); // Just render
      }
    });

    // Set pathfinder to dirty for dynamic events
    each([
      'update',
      'addSeries',
      'removeSeries'
    ], function (e) {
      addEvent(chart, e, function () {
        this.pathfinder.isDirty = true;
      });
    });
    each(chart.series, function (series) {
      each([
        'update',
        'updatedData'
      ], function (e) {
        addEvent(series, e, function () {
          this.chart.pathfinder.isDirty = true;
        });
      });
    });
  },

  /**
   * Update Pathfinder connections from scratch.
   */
  update: function () {
    var chart = this.chart,
      i = chart.series.length,
      pathfinder = this;

    // Find the points and their mate and cache this information
    pathfinder.connections = [];
    while (i--) {
      each(chart.series[i].points, function (point) {
        var connect = point.options.connect,
          to;
        if (connect) {
          to = chart.get(typeof connect === 'string' ?
            connect : connect.to
          );
          // We store start/end/options for each connection to be
          // picked up in drawConnections
          pathfinder.connections.push([
            point,
            to,
            typeof connect === 'string' ? {} : connect
          ]);
        }
      });
    }

    // Clear dirty flag for now
    pathfinder.isDirty = false;

    // Draw the pending connections
    pathfinder.renderConnections();
  },

  /**
   * Draw the chart's connecting paths.
   */
  renderConnections: function () {
    // Clear existing connections
    var i = this.paths.length;
    while (i--) {
      this.paths[i].destroy();
    }
    this.paths = [];

    // Clear obstacles to force recalculation. This must be done on every
    // redraw in case positions have changed. This is handled in
    // Point.pathTo on demand.
    delete this.chartObstacles;
    delete this.lineObstacles;

    // Draw connections. Arrays are faster than objects, thus the clumsy
    // syntax. Mapping is [startPoint, endPoint, options].
    each(this.connections, function (connection) {
      connection[0].pathTo(connection[1], connection[2]);
    });
  },

  /**
   * Get chart obstacles from points. Does not include connecting lines from
   * Pathfinder. Applies algorithmMargin to the obstacles.
   *
   * @param {Object} options Options for the calculation.
   *
   * @return {Object} result The calculated obstacles.
   */
  getChartObstacles: function (options) {
    var obstacles = [],
      series = this.chart.series,
      margin = options.algorithmMargin,
      bb,
      i,
      j;
    i = series.length;
    while (i--) {
      j = series[i].points.length;
      while (j--) {
        bb = series[i].points[j].graphic.getBBox();
        obstacles.push({
          xMin: bb.x - margin,
          xMax: bb.x + bb.width + margin,
          yMin: bb.y - margin,
          yMax: bb.y + bb.height + margin
        });
      }
    }
    // Sort obstacles by xMin before returning, for optimization
    return obstacles.sort(function (a, b) {
      return a.xMin - b.xMin;
    });
  },

  /**
   * Get metrics for obstacles.
   *  - Widest obstacle width
   *  - Tallest obstacle height
   *
   * @param {Object} obstacles Options for the calculation.
   *
   * @return {Object} result The calculated metrics.
   */
  getObstacleMetrics: function (obstacles) {
    var maxWidth = 0,
      maxHeight = 0,
      width,
      height,
      i = obstacles.length;

    while (i--) {
      width = obstacles[i].xMax - obstacles[i].xMin;
      height = obstacles[i].yMax - obstacles[i].yMin;
      if (maxWidth < width) {
        maxWidth = width;
      }
      if (maxHeight < height) {
        maxHeight = height;
      }
    }

    return {
      maxHeight: maxHeight,
      maxWidth: maxWidth
    };
  }
};


// Add pathfinding capabilities to Points
extend(H.Point.prototype, /** @lends Point.prototype */ {

  /**
   * Get coordinates of anchor point for pathfinder connection.
   *
   * @param {Object} markerOptions Connection options for position on point
   *
   * @return {Object} result An object with x/y properties for the position.
   *  Coordinates are in plot values, not relative to point.
   */
  getPathfinderAnchorPoint: function (markerOptions) {
    var bb = this.graphic.getBBox(),
      xFactor, // Make Simon Cowell proud
      yFactor;

    switch (markerOptions.align) {
    case 'right':
      xFactor = 2;
      break;
    case 'left':
      xFactor = 0;
      break;
    default:
      xFactor = 1;
    }

    switch (markerOptions.verticalAlign) {
    case 'top':
      yFactor = 0;
      break;
    case 'bottom':
      yFactor = 2;
      break;
    default:
      yFactor = 1;
    }

    // Note: Should we cache this?
    return {
      x: bb.x + bb.width / 2 * xFactor,
      y: bb.y + bb.height / 2 * yFactor
    };
  },

  addPath: function (path, attribs) {
    var chart = this.series.chart,
      pathfinder = chart.pathfinder,
      renderer = chart.renderer,
      pathGraphic = renderer.path(path)
        .addClass('highcharts-point-connecting-path')
        .attr(attribs)
        .add(pathfinder.group);

    if (!this.connectingPathGraphics) {
      this.connectingPathGraphics = [];
    }

    this.connectingPathGraphics.push(pathGraphic);
    // Add to internal list of paths for later destroying/referencing
    pathfinder.paths.push(pathGraphic);
  },

  addMarker: function (type, vector, options, radians) {
    var chart = this.series.chart,
      pathfinder = chart.pathfinder,
      renderer = chart.renderer,
      degrees = radians / deg2rad,
      marker,
      width,
      height;

    if (options.width && options.height) {
      width = options.width;
      height = options.height;
    } else {
      width = height = options.radius * 2;
    }

    marker = renderer.symbol(
      options.symbol,
      vector.x - (width / 2),
      vector.y - (height / 2),
      width,
      height
    )
      .addClass('highcharts-point-connecting-path-' + type + '-marker')
      .attr(merge(options, {
        fill: options.color || this.color,
        transform: 'rotate(' + degrees + ')'
      }))
      .add(pathfinder.group);
    this.connectingPathGraphics.push(marker);

    // Add to internal list of paths for later destroying/referencing
    pathfinder.paths.push(marker);
  },

  /**
   * Get the angle from one point to another.
   * @param  {Object} v1 - the first vector
   * @param  {Object} v1.x - the first vector x position
   * @param  {Object} v1.y - the first vector y position
   * @param  {Object} v2 - the second vector
   * @param  {Object} v2.x - the second vector x position
   * @param  {Object} v2.y - the second vector y position
   * @return {number}    - the angle in degrees
   */
  getRadiansToVector: function (x, y) {
    return Math.atan2(this.plotY - y, x - this.plotX);
  },

  /**
   * Get the edge of the point graphic, based on an angle.
   * @param  {number} deg the angle in degrees from the point center to
   *                      another vector
   * @return {Object}       a vector (x, y) of the point graphic edge
   */
  getMarkerVector: function (radians, markerRadius) {
    var twoPI = Math.PI * 2,
      theta = radians,
      rect = this.graphic.getBBox(),
      rAtan = Math.atan2(rect.height, rect.width),
      tanTheta = 1,
      leftOrRightRegion = false,
      edgePoint = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 },
      markerPoint = {},
      xFactor = 1,
      yFactor = 1;

    while (theta < -Math.PI) {
      theta += twoPI;
    }

    while (theta > Math.PI) {
      theta -= twoPI;
    }

    tanTheta = Math.tan(theta);

    if ((theta > -rAtan) && (theta <= rAtan)) {
      // Right side
      yFactor = -1;
      leftOrRightRegion = true;
    } else if (theta > rAtan && theta <= (Math.PI - rAtan)) {
      // Top side
      yFactor = -1;
    } else if (theta > (Math.PI - rAtan) || theta <= -(Math.PI - rAtan)) {
      // Left side
      xFactor = -1;
      leftOrRightRegion = true;
    } else {
      // Bottom side
      xFactor = -1;
    }

    if (leftOrRightRegion) {
      edgePoint.x += xFactor * (rect.width / 2.0);
      edgePoint.y += yFactor * (rect.width / 2.0) * tanTheta;
    } else {
      edgePoint.x += xFactor * (rect.height / (2.0 * tanTheta));
      edgePoint.y += yFactor * (rect.height /  2.0);
    }

    markerPoint.x = edgePoint.x + (markerRadius * Math.cos(theta));
    markerPoint.y = edgePoint.y - (markerRadius * Math.sin(theta));

    return markerPoint;
  },

  /**
   * Draw a path from this point to another, avoiding collisions.
   *
   * @param {Object} toPoint The destination point
   * @param {Object} options Path options, including position on point, style
   */
  pathTo: function (toPoint, opts) {
    var chart = this.series.chart,
      pathfinder = chart.pathfinder,
      defaultOptions = chart.options.pathfinder,
      chartObstacles = pathfinder.chartObstacles,
      lineObstacles = pathfinder.lineObstacles,
      renderer = chart.renderer,
      pathResult,
      radians,
      path,
      attribs,
      options = merge(defaultOptions, opts),
      algorithm = pathfinder.algorithms[options.type];

    // This function calculates obstacles on demand if they don't exist
    if (algorithm.requiresObstacles && !chartObstacles) {
      chartObstacles =
        pathfinder.chartObstacles =
        pathfinder.getChartObstacles(options);

      // Cache some metrics too
      pathfinder.chartObstacleMetrics =
        pathfinder.getObstacleMetrics(chartObstacles);
    }

    // Get the SVG path
    pathResult = algorithm(
      this.getPathfinderAnchorPoint(options.startMarker),
      toPoint.getPathfinderAnchorPoint(options.endMarker),
      merge({
        chartObstacles: chartObstacles,
        lineObstacles: lineObstacles || [],
        obstacleMetrics: pathfinder.chartObstacleMetrics,
        hardBounds: {
          xMin: chart.plotLeft,
          xMax: chart.plotLeft + chart.plotWidth,
          yMin: chart.plotTop,
          yMax: chart.plotTop + chart.plotHeight
        },
        obstacleOptions: {
          margin: options.algorithmMargin
        }
      }, options)
    );

    // Always update obstacle storage with obstacles from this path.
    // We don't know if future pathTo calls will need this for their
    // algorithm.
    if (pathResult.obstacles) {
      pathfinder.lineObstacles = lineObstacles || [];
      pathfinder.lineObstacles =
        pathfinder.lineObstacles.concat(pathResult.obstacles);
    }

    // Add the SVG element of the path
    if (!pathfinder.group) {
      pathfinder.group = renderer.g()
        .addClass('highcharts-pathfinder')
        .add(this.series.group);
    }
    attribs = {
      stroke: options.color || this.color,
      'stroke-width': options.lineWidth
    };
    if (options.dashStyle) {
      attribs.dashstyle = options.dashStyle;
    }

    path = pathResult.path;

    // Add path
    this.addPath(path, attribs);

    // Set common marker options
    options = merge(this.series.options.marker, attribs, options);
    // Override common marker options
    options.startMarker = merge(options, options.startMarker);
    options.endMarker = merge(options, options.endMarker);
    delete options.startMarker.startMarker;
    delete options.startMarker.endMarker;
    delete options.endMarker.startMarker;
    delete options.endMarker.endMarker;

    // Add start marker
    radians = this.getRadiansToVector(
      path[4], // Second x in path
      path[5]  // Second y in path
    );
    this.addMarker(
      'start',
      this.getMarkerVector(radians, options.startMarker.radius),
      options.startMarker,
      radians
    );

    // Add end marker
    radians = toPoint.getRadiansToVector(
      path[path.length - 5], // Second last x in path
      path[path.length - 4]  // Second last y in path
    );
    this.addMarker(
      'end',
      toPoint.getMarkerVector(radians, options.endMarker.radius),
      options.endMarker,
      radians
    );
  }
});


// Initialize Pathfinder for charts
H.Chart.prototype.callbacks.push(function (chart) {
  var options = chart.options;
  if (options.pathfinder.enabled !== false) {
    this.pathfinder = new Pathfinder(this);
    this.pathfinder.update(); // First draw
  }
});

}(Highcharts, algorithms));
(function (H) {
 /**
 * (c) 2014-2016 Highsoft AS
 * Authors: Torstein Honsi, Lars A. V. Cabrera
 *
 * License: www.highcharts.com/license
 */
'use strict';

var defaultPlotOptions = H.getOptions().plotOptions,
  defined = H.defined,
  color = H.Color,
  columnType = H.seriesTypes.column,
  each = H.each,
  extendClass = H.extendClass,
  isNumber = H.isNumber,
  isObject = H.isObject,
  merge = H.merge,
  pick = H.pick,
  seriesTypes = H.seriesTypes,
  stop = H.stop,
  wrap = H.wrap,
  Axis = H.Axis,
  Point = H.Point,
  Series = H.Series,
  pointFormat =   '<span style="color:{point.color}">' +
            '\u25CF' +
          '</span> {series.name}: <b>{point.yCategory}</b><br/>',
  xrange = 'xrange';

defaultPlotOptions.xrange = merge(defaultPlotOptions.column, {
  dataLabels: {
    verticalAlign: 'middle',
    inside: true,
    formatter: function () {
      var point = this.point,
        amount = point.partialFill;
      if (isObject(amount)) {
        amount = amount.amount;
      }
      if (!defined(amount)) {
        amount = 0;
      }
      return (amount * 100) + '%';
    }
  },
  tooltip: {
    pointFormat: pointFormat
  },
  borderRadius: 3
});
seriesTypes.xrange = extendClass(columnType, {
  pointClass: extendClass(Point, {
    // Add x2 and yCategory to the available properties for tooltip formats
    getLabelConfig: function () {
      var cfg = Point.prototype.getLabelConfig.call(this);

      cfg.x2 = this.x2;
      cfg.yCategory = this.yCategory = this.series.yAxis.categories && this.series.yAxis.categories[this.y];
      return cfg;
    }
  }),
  type: xrange,
  forceDL: true,
  parallelArrays: ['x', 'x2', 'y'],
  requireSorting: false,
  animate: seriesTypes.line.prototype.animate,

  /**
   * Borrow the column series metrics, but with swapped axes. This gives free access
   * to features like groupPadding, grouping, pointWidth etc.
   */
  getColumnMetrics: function () {
    var metrics,
      chart = this.chart;

    function swapAxes() {
      each(chart.series, function (s) {
        var xAxis = s.xAxis;
        s.xAxis = s.yAxis;
        s.yAxis = xAxis;
      });
    }

    swapAxes();

    this.yAxis.closestPointRange = 1;
    metrics = columnType.prototype.getColumnMetrics.call(this);

    swapAxes();

    return metrics;
  },

  /**
   * Override cropData to show a point where x is outside visible range
   * but x2 is outside.
   */
  cropData: function (xData, yData, min, max) {

    // Replace xData with x2Data to find the appropriate cropStart
    var cropData = Series.prototype.cropData,
      crop = cropData.call(this, this.x2Data, yData, min, max);

    // Re-insert the cropped xData
    crop.xData = xData.slice(crop.start, crop.end);

    return crop;
  },

  translatePoint: function (point) {
    var series = this,
      xAxis = series.xAxis,
      metrics = series.columnMetrics,
      minPointLength = series.options.minPointLength || 0,
      plotX = point.plotX,
      posX = pick(point.x2, point.x + (point.len || 0)),
      plotX2 = xAxis.toPixels(posX, true),
      width = plotX2 - plotX,
      widthDifference,
      shapeArgs,
      partialFill;

    if (minPointLength) {
      widthDifference = minPointLength - width;
      if (widthDifference < 0) {
        widthDifference = 0;
      }
      plotX -= widthDifference / 2;
      plotX2 += widthDifference / 2;
    }

    plotX = Math.max(plotX, -10);
    plotX2 = Math.min(Math.max(plotX2, -10), xAxis.len + 10);

      if (plotX2 < plotX) { // #6107
        plotX2 = plotX;
      }

    point.shapeArgs = {
      x: plotX,
      y: point.plotY + metrics.offset,
      width: plotX2 - plotX,
      height: metrics.width
    };
    point.tooltipPos[0] += width / 2;
    point.tooltipPos[1] -= metrics.width / 2;

    // Add a partShapeArgs to the point, based on the shapeArgs property
    partialFill = point.partialFill;
    if (partialFill) {
      // Get the partial fill amount
      if (isObject(partialFill)) {
        partialFill = partialFill.amount;
      }
      // If it was not a number, assume 0
      if (!isNumber(partialFill)) {
        partialFill = 0;
      }
      shapeArgs = point.shapeArgs;
      point.partShapeArgs = {
        x: shapeArgs.x + 0.5,
        y: shapeArgs.y + 0.5,
        width: shapeArgs.width - 1,
        height: shapeArgs.height - 1
      };
      point.clipRectArgs = {
        x: shapeArgs.x,
        y: shapeArgs.y,
        width: shapeArgs.width * partialFill,
        height: shapeArgs.height
      };
    }
  },

  translate: function () {
    columnType.prototype.translate.apply(this, arguments);
    var series = this;

    each(series.points, function (point) {
      series.translatePoint(point);
    });
  },

  drawPoint: function (point, verb) {
    var series = this,
      plotY = point.plotY,
      seriesOpts = series.options,
      renderer = series.chart.renderer,
      graphic = point.graphic,
      type = point.shapeType,
      shapeArgs = point.shapeArgs,
      partShapeArgs = point.partShapeArgs,
      clipRectArgs = point.clipRectArgs,
      pfOptions = point.partialFill,
      fill,
      state = point.selected && 'select',
      cutOff = seriesOpts.stacking && !seriesOpts.borderRadius;

    if (isNumber(plotY) && point.y !== null) {
      if (graphic) { // update
        stop(graphic);
        point.graphicOriginal[verb](
          merge(shapeArgs)
        );
        if (partShapeArgs) {
          point.graphicOverlay[verb](
            merge(partShapeArgs)
          );
          point.clipRect.animate(
            merge(clipRectArgs)
          );
        }

      } else {
        point.graphic = graphic = renderer.g('point')
          .attr({
            'class': point.getClassName()
          })
          .add(point.group || series.group);

        point.graphicOriginal = renderer[type](shapeArgs)
          .addClass('highcharts-partfill-original')
          .add(graphic);
        if (clipRectArgs && partShapeArgs) {

          point.clipRect = renderer.clipRect(
            clipRectArgs.x,
            clipRectArgs.y,
            clipRectArgs.width,
            clipRectArgs.height
          );

          point.graphicOverlay = renderer[type](partShapeArgs)
            .addClass('highcharts-partfill-overlay')
            .add(graphic)
            .clip(point.clipRect);
        }
      }

      
      // Presentational
      point.graphicOriginal
        .attr(series.pointAttribs(point, state))
        .shadow(seriesOpts.shadow, null, cutOff);
      if (partShapeArgs) {
        // Ensure pfOptions is an object
        if (!isObject(pfOptions)) {
          pfOptions = {};
        }
        if (isObject(seriesOpts.partialFill)) {
          pfOptions = merge(pfOptions, seriesOpts.partialFill);
        }

        fill = pfOptions.fill ||
            color(series.color).brighten(-0.3).get('rgb');
        point.graphicOverlay
          .attr(series.pointAttribs(point, state))
          .attr({
            'fill': fill,
            'stroke-width': 0.1
          })
          .shadow(seriesOpts.shadow, null, cutOff);
      }
      

    } else if (graphic) {
      point.graphic = graphic.destroy(); // #1269
    }
  },

  drawPoints: function () {
    var series = this,
      chart = this.chart,
      options = series.options,
      animationLimit = options.animationLimit || 250,
      verb = chart.pointCount < animationLimit ? 'animate' : 'attr';

    // draw the columns
    each(series.points, function (point) {
      series.drawPoint(point, verb);
    });
  }
});

/**
 * Max x2 should be considered in xAxis extremes
 */
wrap(Axis.prototype, 'getSeriesExtremes', function (proceed) {
  var axis = this,
    series = axis.series,
    dataMax,
    modMax;

  proceed.call(this);
  if (axis.isXAxis && series.type === xrange) {
    dataMax = pick(axis.dataMax, Number.MIN_VALUE);
    each(this.series, function (series) {
      each(series.x2Data || [], function (val) {
        if (val > dataMax) {
          dataMax = val;
          modMax = true;
        }
      });
    });
    if (modMax) {
      axis.dataMax = dataMax;
    }
  }
});

}(Highcharts));
(function (H) {
/**
* (c) 2016 Highsoft AS
* Authors: Lars A. V. Cabrera
*
* License: www.highcharts.com/license
*/
'use strict';

// TODO
// - dataLabel alignment (verticalAlign, inside)

var dateFormat = H.dateFormat,
  defined = H.defined,
  isObject = H.isObject,
  isNumber = H.isNumber,
  merge = H.merge,
  pick = H.pick,
  seriesType = H.seriesType,
  seriesTypes = H.seriesTypes,
  stop = H.stop,
  Point = H.Point,
  parentName = 'xrange',
  parent = seriesTypes[parentName];

// type, parent, options, props, pointProps
seriesType('gantt', parentName, {
  // options - default options merged with parent
  dataLabels: {
    enabled: true,
    formatter: function () {
      var point = this,
        amount = point.point.partialFill,
        str = pick(point.taskName, point.y);

      if (isObject(amount)) {
        amount = amount.amount;
      }
      if (!defined(amount)) {
        amount = 0;
      }

      if (defined(str)) {
        str += ': ';
      } else {
        str = '';
      }

      return str + (amount * 100) + '%';
    }
  },
  tooltip: {
    headerFormat: '<span style="color:{point.color}; text-align: right">{series.name}</span><br/>',
    pointFormatter: function () {
      var point = this,
        series = point.series,
        tooltip = series.chart.tooltip,
        taskName = point.taskName,
        xAxis = series.xAxis,
        options = xAxis.options,
        formats = options.dateTimeLabelFormats,
        startOfWeek = xAxis.options.startOfWeek,
        ttOptions = series.tooltipOptions,
        format = ttOptions.dateTimeLabelFormat,
        range = point.end ? point.end - point.start : 0,
        start,
        end,
        milestone = point.options.milestone,
        dateRowStart = '<span style="font-size: 0.8em">',
        dateRowEnd = '</span><br/>',
        retVal = '<b>' + taskName + '</b>';

      if (!format) {
        ttOptions.dateTimeLabelFormat = format = tooltip.getDateFormat(
          range,
          point.start,
          startOfWeek,
          formats
        );
      }

      start = dateFormat(format, point.start);
      end = dateFormat(format, point.end);

      retVal += '<br/>';

      if (!milestone) {
        retVal += dateRowStart + 'Start: ' + start + dateRowEnd;
        retVal += dateRowStart + 'End: ' + end + dateRowEnd;
      } else {
        retVal += dateRowStart + 'Date ' + start + dateRowEnd;
      }

      return retVal;
    }
  },
  pathfinder: {
    type: 'straight', // TODO change to when done 'fastAvoid'
    startMarker: {
      enabled: true,
      symbol: 'diamond',
      fill: '#fa0'
    },
    endMarker: {
      enabled: true,
      symbol: 'circle',
      fill: '#fa0'
    }
  }
}, {
  // props - member overrides

  translatePoint: function (point) {
    var series = this,
      shapeArgs,
      sizeMod = 1,
      size,
      milestone = point.options.milestone,
      sizeDifference;


    parent.prototype.translatePoint.call(series, point);

    if (milestone) {
      shapeArgs = point.shapeArgs;

      if (isNumber(milestone.sizeModifier)) {
        sizeMod = milestone.sizeModifier;
      }

      size = shapeArgs.height * sizeMod;
      sizeDifference = size - shapeArgs.height;

      point.shapeArgs = {
        x: shapeArgs.x - (size / 2),
        y: shapeArgs.y - (sizeDifference / 2),
        width: size,
        height: size
      };
    }
  },

  drawPoint: function (point, verb) {
    var series = this,
      seriesOpts = series.options,
      renderer = series.chart.renderer,
      shapeArgs = point.shapeArgs,
      plotY = point.plotY,
      graphic = point.graphic,
      state = point.selected && 'select',
      cutOff = seriesOpts.stacking && !seriesOpts.borderRadius,
      diamondShape;

    if (point.options.milestone) {
      if (isNumber(plotY) && point.y !== null) {

        diamondShape = renderer.symbols.diamond(
          shapeArgs.x,
          shapeArgs.y,
          shapeArgs.width,
          shapeArgs.height
        );

        if (graphic) {
          stop(graphic);
          graphic[verb]({
            d: diamondShape
          });
        } else {
          point.graphic = graphic = renderer.path(diamondShape)
          .addClass(point.getClassName(), true)
          .add(point.group || series.group);
        }
        
        // Presentational
        point.graphic
          .attr(series.pointAttribs(point, state))
          .shadow(seriesOpts.shadow, null, cutOff);
        
      } else if (graphic) {
        point.graphic = graphic.destroy(); // #1269
      }
    } else {
      parent.prototype.drawPoint.call(series, point, verb);
    }
  }
}, {
  // pointProps - point member overrides
  /**
   * Apply the options containing the x and y data and possible some extra properties.
   * This is called on point init or from point.update.
   *
   * @param {Object} options
   */
  applyOptions: function (options, x) {
    var point = this,
      retVal = merge(options);

    // Get value from aliases
    retVal.x = pick(options.start, options.x);
    retVal.x2 = pick(options.end, options.x2);
    if (options.milestone) {
      retVal.x2 = options.x;
    }
    retVal.y = pick(
      options.taskGroup,
      options.name,
      options.taskName,
      options.y
    );
    retVal.name = pick(options.taskGroup, options.name);
    retVal.partialFill = pick(options.completed, options.partialFill);
    retVal.connect = pick(options.dependency, options.connect);

    retVal = Point.prototype.applyOptions.call(point, retVal, x);

    return retVal;
  },

  // Add x2 and yCategory to the available properties for tooltip formats
  getLabelConfig: function () {
    var point = this,
      cfg = Point.prototype.getLabelConfig.call(point);

    cfg.taskName = point.taskName;
    return cfg;
  }
});

}(Highcharts));
}));