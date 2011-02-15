// Heavily based on the jquery.svgplot.js and
// jquery.svggraph.js extensions designed by Keith
// Wood, who also designed the jquery.svg.js package
// as a whole.
// Authors: Jackson Gorham
// Date: February 10, 2011

(function($, undefined) {
    /* hook to plug this into jquery svg */
    $.svg.addExtension('plot', SVGScatterPlot);
    $.svg.addExtension('hist', SVGHistogram);

    function SVGPlotCore() {
        // id of div to insert UI elements into
        this._slavecont = null;
        // reference to background of the svgplot
        this._bg = null;
        // Plot title parameters
	this._title = {value: '', offset: 25, settings: {textAnchor: 'middle'}};
        // The chart area: left, top, right, bottom, > 1 in pixels, <= 1 as proportion
        this._area = [0.15, 0.025, 0.95, 0.925];
        // The formatting for the plot area
	this._areaFormat = {fill: 'none', stroke: 'black'};
        // The formatting of the x- and y-gridlines
	this._gridlines = [{stroke: "lightgray"}, {stroke: "lightgray"}];
        // Array data points are stored, if passed locally
        this._datapts = [];
        // Default template for tooltips
        this._template = '<div class="tooltip"><p>x: ${xx}</p><p>y: ${yy}</p></div>';
        // Array of currently used ui elements
        this._uis = [];
        // Whether or not to automatically rescale axes when UI changes
        this._autorescale = false;
        // Used to stop an infinite loop during UI changes
        this._updating = false;
        // Dict from local attr names to remote attr names for remote data
        this._local2remote = {};
        // the type parameter borrowed from R plots
        this._type = "p";
        // post functions that are hooked after completion of plot
        this._postFns = [];
        // must be true to refresh plot
        this._drawNow = false;
    };

    $.extend(SVGPlotCore.prototype, {
	/* Useful indexes. */
	X: 0, Y: 1, W: 2, H: 3,
        L: 0, T: 1, R: 2, B: 3,

	/* Decode an attribute value.
	   @param  node  the node to examine
	   @param  name  the attribute name
	   @return  the actual value */
	_getValue: function(node, name) {
	    return (!node[name] ? parseInt(node.getAttribute(name), 10) :
		    (node[name].baseVal ? node[name].baseVal.value : node[name]));
	},

	/* Calculate the actual dimensions of the plot area.
	   @param  area  (number[4]) the area values to evaluate (optional)
	   @return  (number[4]) an array of dimension values: left, top, width, height */
	_getDims: function(area) {
	    var otherArea = (area != null);
	    area = area || this._area;
	    var availWidth = this._getValue(this._plotCont, 'width');
	    var availHeight = this._getValue(this._plotCont, 'height');
	    var left = (area[this.L] > 1 ? area[this.L] : availWidth * area[this.L]);
	    var top = (area[this.T] > 1 ? area[this.T] : availHeight * area[this.T]);
	    var width = (area[this.R] > 1 ? area[this.R] : availWidth * area[this.R]) - left;
	    var height = (area[this.B] > 1 ? area[this.B] : availHeight * area[this.B]) - top;
	    return [left, top, width, height];
	},

	/* Calculate the scaling factors for the plot area.
	   @return  (number[2]) the x- and y-scaling factors */
	_getScales: function() {
	    var dims = this._getDims();
	    return [dims[this.W] / (this.xAxis._scale.max - this.xAxis._scale.min),
		    dims[this.H] / (this.yAxis._scale.max - this.yAxis._scale.min)];
	},

        /* Given some x and y coordinates (relative to axes)
           it returns the svg coordinates.
           @param x, y the coordinates relative to x and y units
           @return either the array of respective coords or the single coord */
        _getSVGCoords: function(x, y) {
            if (arguments.length == 0) return;
            var dims = this._getDims();
            var scales = this._getScales();
            var xco = (x !== undefined && x !== null) ? (x - this.xAxis._scale.min) * scales[0] + dims[this.X] : null;
            var yco = (y !== undefined && y !== null) ? (this.yAxis._scale.max - y) * scales[1] + dims[this.Y] : null;
            if (xco && yco) {
                return [xco, yco];
            }
            return (xco ? xco : yco);
        },

        /* Exact inverse of _getSVGCoords. Converts SVG coordinates into
           coordinates relative to axes units.
           @params x,y the SVG coordinates to be converted to units
           @return either the single coord or array depending on arguments */
        _getPlotCoords: function(x, y) {
            if (arguments.length == 0) return;
            var dims = this._getDims();
            var scales = this._getScales();
            var xco = (x !== undefined && x !== null) ? ((x-dims[this.X])/scales[0] + this.xAxis._scale.min) : null;
            var yco = (y !== undefined && y !== null) ? ((dims[this.Y]-y)/scales[1] + this.yAxis._scale.max) : null;
            if (xco && yco) {
                return [xco, yco];
            }
            return (xco ? xco : yco);
        },

	/* Set or retrieve the main plotting area.
	   @param  left    (number) > 1 is pixels, <= 1 is proportion of width or
	   (number[4]) for left, top, right, bottom
	   @param  top     (number) > 1 is pixels, <= 1 is proportion of height
	   @param  right   (number) > 1 is pixels, <= 1 is proportion of width
	   @param  bottom  (number) > 1 is pixels, <= 1 is proportion of height
	   @return  (SVGPlot) this plot object or
	   (number[4]) the plotting area: left, top, right, bottom (if no parameters) */
	area: function(left, top, right, bottom) {
	    if (arguments.length == 0) {
		return this._area;
	    }
            var isarray = (left && left.constructor == Array);
	    this._area = (isarray ? left : [left, top, right, bottom]);
	    this._refreshPlot();
	    return this;
	},

	/* Set or retrieve the background of the plot area.
	   @param  fill      (string) how to fill the area background
	   @param  stroke    (string) the colour of the outline (optional)
	   @param  settings  (object) additional formatting for the area background (optional)
	   @return  (SVGPlot) this plot object or
	   (object) the area format (if no parameters) */
	format: function(fill, stroke, settings) {
	    if (arguments.length == 0) {
		return this._areaFormat;
	    }
	    if (typeof stroke == 'object') {
		settings = stroke;
		stroke = null;
	    }
	    this._areaFormat = $.extend({fill: fill},
			                (stroke ? {stroke: stroke} : {}), settings || {});
	    this._refreshPlot();
	    return this;
	},

	/* Set or retrieve the gridlines formatting for the plot area.
	   @param  xSettings  (string) the colour of the gridlines along the x-axis, or
	   (object) formatting for the gridlines along the x-axis, or
	   null for none
	   @param  ySettings  (string) the colour of the gridlines along the y-axis, or
	   (object) formatting for the gridlines along the y-axis, or
	   null for none
	   @return  (SVGPlot) this plot object or
	   (object[2]) the gridlines formatting (if no parameters) */
	gridlines: function(xSettings, ySettings) {
	    if (arguments.length == 0) {
		return this._gridlines;
	    }
	    this._gridlines = [(typeof xSettings == 'string' ? {stroke: xSettings} : xSettings),
			       (typeof ySettings == 'string' ? {stroke: ySettings} : ySettings)];
	    if (this._gridlines[0] == null && this._gridlines[1] == null) {
		this._gridlines = [];
	    }
	    this._refreshPlot();
	    return this;
	},

	/* Set or retrieve the title of the plot and its formatting.
	   @param  value     (string) the title
	   @param  offset    (number) the vertical positioning of the title
           > 1 is pixels, <= 1 is proportion of width (optional)
	   @param  colour    (string) the colour of the title (optional)
	   @param  settings  (object) formatting for the title (optional)
	   @return  (SVGPlot) this plot object or
	   (object) value, offset, and settings for the title (if no parameters) */
	title: function(value, offset, colour, settings) {
	    if (arguments.length == 0) {
		return this._title;
	    }
	    if (typeof offset != 'number') {
		settings = colour;
		colour = offset;
		offset = null;
	    }
	    if (typeof colour != 'string') {
		settings = colour;
		colour = null;
	    }
	    this._title = {value: value, offset: offset || this._title.offset,
			   settings: $.extend({textAnchor: 'middle'},
                           (colour ? {fill: colour} : {}), settings || {})};
	    this._refreshPlot();
	    return this;
	},

	/* Set the jQuery template to be filled for tooltips.
	   @param  html the html template to be rendered by jQuery templating
	   @return  (SVGPlot) this plot object */
        template: function (html) {
            this._template = html;
            return this;
        },

	/* Draw the chart background, including gridlines.
	   @param  noXGrid  (boolean) true to suppress the x-gridlines, false to draw them (optional)
	   @param  noYGrid  (boolean) true to suppress the y-gridlines, false to draw them (optional)
	   @return  (element) the background group element */
	_drawChartBackground: function(noXGrid, noYGrid) {
	    this._bg = this._wrapper.group(this._plotCont, {class_: 'background'});
	    var dims = this._getDims();
	    this._wrapper.rect(this._bg, dims[this.X], dims[this.Y], dims[this.W], dims[this.H], this._areaFormat);
	    if (this._gridlines[0] && this.yAxis._ticks.major && !noYGrid) {
		this._drawGridlines(true, this._gridlines[0], dims);
	    }
	    if (this._gridlines[1] && this.xAxis._ticks.major && !noXGrid) {
		this._drawGridlines(false, this._gridlines[1], dims);
	    }
	    return this._bg;
	},

	/* Draw one set of gridlines.
	   @param  horiz   (boolean) true if horizontal, false if vertical
	   @param  format  (object) additional settings for the gridlines */
	_drawGridlines: function(horiz, format, dims) {
	    var g = this._wrapper.group(this._bg, format);
	    var axis = (horiz ? this.yAxis : this.xAxis);
	    var scales = this._getScales();
            var buffer_ticks = Math.floor(axis._buffer/axis._ticks.major);
            var major = axis._scale.min + axis._buffer - (buffer_ticks*axis._ticks.major);
	    while (major < axis._scale.max) {
		var v = (horiz ? axis._scale.max - major : major - axis._scale.min) *
		    scales[horiz ? 1 : 0] + (horiz ? dims[this.Y] : dims[this.X]);
		this._wrapper.line(g, (horiz ? dims[this.X] : v), (horiz ? v : dims[this.Y]),
				   (horiz ? dims[this.X] + dims[this.W] : v), (horiz ? v : dims[this.Y] + dims[this.H]));
		major += axis._ticks.major;
	    }
	},

	/* Draw an axis, its tick marks, and title.
	   @param  horiz  (boolean) true for x-axis, false for y-axis */
	_drawAxis: function(horiz) {
	    var id = (horiz ? 'x' : 'y') + 'Axis';
	    var axis = (horiz ? this.xAxis : this.yAxis);
	    var axis2 = (horiz ? this.yAxis : this.xAxis);
	    var dims = this._getDims();
	    var scales = this._getScales();
	    var gl = this._wrapper.group(this._plot, $.extend({class_: id}, axis._lineFormat));
	    var gt = this._wrapper.group(this._plot, $.extend({class_: id + 'Labels',
			                                       textAnchor: (horiz ? 'middle' : 'end')}, axis._labelFormat));
	    var zero = (horiz ? axis2._scale.max - axis2._scale.min : 0) *
		scales[horiz ? 1 : 0] + (horiz ? dims[this.Y] : dims[this.X]);
            // This line makes the actual axis
	    this._wrapper.line(gl, (horiz ? dims[this.X] : zero), (horiz ? zero : dims[this.Y]),
			       (horiz ? dims[this.X] + dims[this.W] : zero),
			       (horiz ? zero : dims[this.Y] + dims[this.H]));
	    if (axis._ticks.major) {
                var buffer_ticks = Math.floor(axis._buffer/axis._ticks.major);
                var major = axis._scale.min + axis._buffer - (buffer_ticks*axis._ticks.major);
		var offsets = [(axis._ticks.position == 'sw' || axis._ticks.position == 'both' ? -1 : 0),
			       (axis._ticks.position == 'ne' || axis._ticks.position == 'both' ? +1 : 0)];
		while (major <= axis._scale.max) {
		    var len = axis._ticks.size;
		    var xy = (horiz ? major - axis._scale.min : axis._scale.max - major) *
			scales[horiz ? 0 : 1] + (horiz ? dims[this.X] : dims[this.Y]);
                    // tick marks
		    this._wrapper.line(gl, (horiz ? xy : zero + len * offsets[0]),
				       (horiz ? zero + len * offsets[0] : xy),
				       (horiz ? xy : zero + len * offsets[1]),
				       (horiz ? zero - len * offsets[1] : xy));
                    this._wrapper.text(gt, roundDigits((horiz ? xy : zero - axis._ticks.size)),
					   roundDigits((horiz ? zero + axis._ticks.size : xy)),
                                       '' + roundDigits(major));
		    major += axis._ticks.major;
		}
	    }
	    if (axis._title) {
		if (horiz) {
		    this._wrapper.text(this._plotCont, dims[this.X] + dims[this.W] / 2,
				       dims[this.Y] + dims[this.H] + axis._titleOffset, axis._title,
                                       $.extend({textAnchor: 'end'}, axis._titleFormat || {}));
		} else {
		    this._wrapper.text(this._plotCont, dims[this.X] - axis._titleOffset,
				       dims[this.Y] + dims[this.H] / 2, axis._title,
                                       $.extend({textAnchor : 'middle'}, axis._titleFormat || {}));
		}
	    }
	},

	/* Draw the plot title - centered. */
	_drawTitle: function() {
	    this._wrapper.text(this._plotCont, this._getValue(this._plotCont, 'width') / 2,
			       this._title.offset, this._title.value, this._title.settings);
	},

	/* Make a scatterplot given the datapoints
           @param filterData ([{..}]) an array of point objects to be plotted
           @return none */
        drawPlot: function (filterData) {
            this._datapointCont = this._wrapper.group(this._plot);
	    var dims = this._getDims();
            var pointR = Math.min(dims[this.W], dims[this.H])/125;
            var x_attr = this._isRemote ? (this._local2remote.xx ? this._local2remote.xx.remote_attr : null) : "xx";
            var y_attr = this._isRemote ? this._local2remote.yy.remote_attr : "yy";
            var col_attr = (this._isRemote && this._local2remote.col) ? this._local2remote.col.remote_attr : "col";
            var rad_attr = (this._isRemote && this._local2remote.rad) ? this._local2remote.rad.remote_attr : "rad";

            function getPoint(pt, i) {
                var drawPt = {
                    xx  : (pt[x_attr] || (i+1)),
                    yy  : pt[y_attr],
                    col : (pt[col_attr] || "black"),
                    rad : (pt[rad_attr] || pointR),
                };
                if (this._isRemote) {
                    for (var lattr in this._local2remote) {
                        var rattr = this._local2remote[lattr].remote_attr;
                        (!pt[rattr]) || (drawPt[lattr] = pt[rattr]);
                    }
                    return drawPt;
                }
                return $.extend({}, pt, drawPt);
            };

            filterData.forEach(function(pt, i) {
                var data = getPoint(pt, i);
                var coords = this._getSVGCoords(data.xx, data.yy);
                if (this._type.match(/^(b|l|o)$/) && (i < filterData.length - 1)) {
                    var data2 = getPoint(filterData[i+1], i+1);
                    var coords2 = this._getSVGCoords(data2.xx, data2.yy);
                    this._wrapper.line(this._plot, coords[0], coords[1], coords2[0], coords2[1], {strokeWidth: 1, stroke: "black"});
                }
                if (this._type.match(/^(p|b|o)$/)) {
                    var c = this._wrapper.circle(this._datapointCont, coords[0], coords[1], data.rad,
                                 {fill: data.col, stroke: "black", strokeWidth: 1});
                    this._showStatus(c, data);
                }
            }, this);
	},

	/* Show the rendered jQuery template on hover.
           @param elem  svg element whose hover triggers template to appear
           @param data  point to be used to plugin template */
	_showStatus: function(elem, data) {
            if (!this._template) {
                return;
            }
            var self = this;
            var html = $.tmpl(this._template, data);

            $(elem).hover(function() {
                var dims = self._getDims();
                var toolcont = self._wrapper.group(self._plotCont, {class_: "point-metadata"});
                var pos = [self._getValue(elem, "cx"), self._getValue(elem, "cy"), dims[self.W]/2, dims[self.H]/2];
                var left = (pos[0] <= (dims[self.W]/2+dims[self.X])) ? pos[0] : pos[0]-pos[2];
                var top = (pos[1] <= (dims[self.H]/2+dims[self.Y])) ? pos[1] : pos[1]-pos[3];
                self._wrapper.rect(toolcont, left, top, pos[2], pos[3],
                                   {fill: 'white', stroke: data.col, strokeWidth: 3});
                var temp = self._wrapper.foreignObject(toolcont, left, top, pos[2], pos[3]);
                $(temp).append(html);
            }, function() {
                $(".point-metadata").remove();
            });
	},

	/* Initiate refresh of the plot (if allowed). */
	_refreshPlot: function() {
	    if (!this._drawNow) {
		return;
	    }
            if (this._isRemote) {
                this._filterDataRemotely(this._makePlot);
            } else {
                this._makePlot(this._filterDataLocally());
            }
        },

        /* Completely wipe the svgplot clean */
        _clearPlot: function () {
	    while (this._plotCont.firstChild) {
		this._plotCont.removeChild(this._plotCont.firstChild);
	    }
	    if (!this._plotCont.parent) {
		this._wrapper._svg.appendChild(this._plotCont);
	    }
	    if (!this._plotCont.width) {
		this._plotCont.setAttribute('width',
				            parseInt(this._plotCont.getAttribute('width'), 10) || this._wrapper._width());
	    } else if (this._plotCont.width.baseVal) {
		this._plotCont.width.baseVal.value =
		    this._plotCont.width.baseVal.value || this._wrapper._width();
	    } else {
		this._plotCont.width = this._plotCont.width || this._wrapper._width();
	    }
	    if (!this._plotCont.height) {
		this._plotCont.setAttribute('height',
				            parseInt(this._plotCont.getAttribute('height'), 10) || this._wrapper._height());
	    } else if (this._plotCont.height.baseVal) {
		this._plotCont.height.baseVal.value =
		    this._plotCont.height.baseVal.value || this._wrapper._height();
	    } else {
		this._plotCont.height = this._plotCont.height || this._wrapper._height();
	    }
        },

        /* Create plot given the selected data */
        _makePlot: function (queriedData, resizeAxes) {
            (arguments.length > 1) || (resizeAxes = this._autorescale);
            queriedData || (queriedData = this._datapts);

            this._clearPlot();
            (!resizeAxes) || this.resetAxes(queriedData);
            this._drawChartBackground();
            var uuid = new Date().getTime();
	    var dims = this._getDims();
	    var clip = this._wrapper.other(this._plotCont, 'clipPath', {id: 'clip' + uuid});
	    this._wrapper.rect(clip, dims[this.X], dims[this.Y], dims[this.W], dims[this.H]);
	    this._plot = this._wrapper.group(this._plotCont, {class_: 'foreground'});
	    this._drawAxis(true);
	    this._drawAxis(false);
	    this._drawTitle();
            this.drawPlot(queriedData);
            this._postFns.forEach(function(fn) {
                fn.call(this, queriedData);
            }, this);
        },

        /* Clear all data and reset defaults */
        clearData: function () {
            this._datapts = [];
            this._postFns = [];
            this._local2remote = {};
            this._uis.forEach(function(ui) {ui.destroy();});
            this._uis = [];
            this._autorescale = false;
            this._drawNow = false;
            this.xAxis.title("X", 40);
            this.yAxis.title("Y", 40);
            this._drawNow = true;
            return this;
        },

        /* Rescale xAxis and yAxis based on the data points to be plotted */
        resetAxes: function (datapts) {
            datapts || (datapts = this._datapts);
            var bounds = datapts.reduce(function(prev, curr) {
                return {
                    xx: [Math.min(prev.xx[0],curr.xx), Math.max(prev.xx[1], curr.xx)],
                    yy: [Math.min(prev.yy[0],curr.yy), Math.max(prev.yy[1], curr.yy)],
                };
            }, {xx: [Infinity, -Infinity], yy: [Infinity, -Infinity]});

            // Let axes handle edge cases (e.g. no datapts)
            this._drawNow = false;
            this.xAxis.resize.apply(this.xAxis, bounds.xx);
            this.yAxis.resize.apply(this.yAxis, bounds.yy);
        },

        /* Method to initialize axes scale when data is stored on server */
        _setAxesRemote: function () {
            this._drawNow = false;
            var self = this;
            $.getJSON("summary/"+this._local2remote.yy.remote_attr, function (ysum) {
                self.yAxis.resize(ysum.range[0], ysum.range[1]);
                if (self._local2remote.xx) {
                    $.getJSON("summary/"+self._local2remote.xx.remote_attr, function (xsum) {
                       self.xAxis.resize(xsum.range[0], xsum.range[1]);
                       self.refresh();
                    });
                } else {
                    self.xAxis.resize(1, ysum.count);
                    self.refresh();
                }
            });
        },

	/* Refresh the entire plot with the current settings and values.
	   @return  (SVGPlot) this plot object */
	refresh: function() {
	    this._drawNow = true;
	    this._refreshPlot();
	    return this;
	},

        /* Method called from outside object to load the data and begin
           the creation of the SVGPlot instance.
           @param data   data passed in from jscliplot.js */
        loadData: function (data) {
            this.clearData();
            this._isRemote = !!data.remote;
            this._autorescale = !!data.rescale;
            this._datapts = this._isRemote ? null : data.local;
            this._local2remote = this._isRemote ? data.remote : {};
            var uiFn = this._isRemote ? this._createRemoteUI : this._createLocalUI;
            var uipromises = [];

            (!data.postFns) || (this._postFns = data.postFns);
            (!data.type) || (this._type = data.type);
            (!data.xlab) || this.xAxis.title(data.xlab);
            (!data.ylab) || this.yAxis.title(data.ylab);
            (!data.ui)   || uiFn.call(this, data.ui, false, uipromises);
            (!data.cui)  || uiFn.call(this, data.cui, true, uipromises);
            if (uipromises.length) {
                var self = this;
                $.when($, uipromises).done(function() {
                    self._prepAxes();
                });
                return;
            }
            this._prepAxes();
        },

        _prepAxes: function () {
            if (this._autorescale) {
                this.refresh()
            } else {
                if (this._isRemote) {
                    this._setAxesRemote();
                } else {
                    this.resetAxes();
                    this.refresh();
                }
            }
        },

        /* Function that initializes and creates UI object instances
           that were passed in by the user if the data is stored
           locally
           @param uiobj   the object given by ui or cui in the invocation
           @param ischild whether we are initializing child or parent ui*/
        _createLocalUI: function (uiobj, ischild) {
            if (uiobj.constructor == Object) {
                for (var uitype in uiobj) {
                    if (typeof uiobj[uitype] == 'string') {
                        uiobj[uitype] = [uiobj[uitype]];
                    }
                    uiobj[uitype].forEach(function(attr) {
                        var vec = this._datapts.map(function(pt) {return pt[attr]});
                        var ui = new UISelector(this, uitype, attr, null, ischild, vec);
                        ui.drawUI();
                        this._uis.push(ui);
                    }, this);
                }
            }
        },

        /* Function that initializes and creates UI object instances
           that were passed in by the user if the data is stored remotely
           @param uiobj   the object given by ui or cui in the invocation
           @param ischild whether we are initializing child or parent ui*/
        _createRemoteUI: function (uiobj, ischild, uipromises) {
            var self = this, uitype;
            if (uiobj.constructor == Object) {
                for (uitype in uiobj) {
                    if (typeof uiobj[uitype] == 'string') {
                        uiobj[uitype] = [uiobj[uitype]];
                    }
                    uiobj[uitype].forEach(function(local_attr) {
                        var remote_attr = this._local2remote[local_attr].remote_attr;
                        var _uitype = uitype;
                        uipromises.push($.getJSON("ui/"+remote_attr).success(function (metadata) {
                            var ui = new UISelector(self, _uitype, local_attr, remote_attr, ischild, metadata.reps);
                            ui._params.type = metadata.datatype;
                            UIMethods[ui._uitype].assignParams.call(ui);
                            UIMethods[ui._uitype].draw.call(ui);
                            self._uis.push(ui);
                        }));
                    }, this);
                }
            }
        },

        /* Function responsible for actually selecting the data that meets
           the UI criteria. This will also reset the UI elements as it filters
           so that cui elements can update here as the filtering occurs.
           Both remote and local cases are handled here for now
           @param callback  this is what the selected data at the end
                  is passed into. Otherwise the data is assumed to be
                  stored locally. */
        _filterDataRemotely: function (callback) {
            var query = {}, cuis = [], self = this;
            this._uis.forEach(function(ui) {
                (ui._ischild) ? cuis.push(ui) : $.extend(query, ui.filterRemote());
            });

            function recursiveLoad() {
                if (cuis.length) {
                    var cui = cuis.shift();
                    $.ajax({
                        url:"cui",
                        type: "POST",
                        dataType: "json",
                        data: {"q":JSON.stringify(query),"f":cui._rattr}
                    }).done(function(json) {
                        cui.reset(json);
                        $.extend(query, cui.filterRemote());
                        recursiveLoad();
                    });
                } else {
                    var attrs = {}, remote;
                    for (var lattr in self._local2remote) {
                        if (remote = self._local2remote[lattr]) {
                            attrs[remote.remote_attr] = 1;
                        }
                    }
                    $.ajax({
                        url: "filter",
                        type: "POST",
                        dataType: "json",
                        data: {"q":JSON.stringify(query),
                               "a":JSON.stringify(attrs)}
                    }).done(function(json) {
                        callback.call(self, json);
                    });
                }
            };
            recursiveLoad();
        },

        /* Simple filter command that operates on locally held data
           @param - none
           @return [{}} - the points which passed the UI filter selections. */
        _filterDataLocally: function () {
            var selectedPts = this._datapts;
            // since all child ui are last, this will update them based on parents
            this._uis.forEach(function (ui) {
                if (ui._ischild) {
                    var newdata = selectedPts.map(function(pt) {return pt[ui._lattr]});
                    ui.reset(newdata);
                }
                selectedPts = selectedPts.filter(function (pt) {
                    return ui.filterLocal(pt);
                });
            }, this);
            return selectedPts;
        },

        /* Hook that is called when a UI element changes. */
        _UIChange: function () {
            if (this._updating) {
                return;
            }
            this._updating = true;
            this.refresh();
            this._updating = false;
        },
    });

    function SVGScatterPlot(wrapper) {
        // The attached SVG wrapper object
	this._wrapper = wrapper;
        // The main container for the plot
	this._plotCont = this._wrapper.svg(0, 0, 0, 0, {class_: 'svg-plot'});

        /* Construct Axes */
        this._drawNow = false;
	this.xAxis = new SVGPlotAxis(this); // The main x-axis
	this.xAxis.title('X', 40);
	this.yAxis = new SVGPlotAxis(this); // The main y-axis
	this.yAxis.title('Y', 40);
	this._drawNow = true;
    };

    SVGScatterPlot.prototype = new SVGPlotCore();

    function SVGHistogram (wrapper) {
        // The attached SVG wrapper object
	this._wrapper = wrapper;
        // The main container for the plot
	this._plotCont = this._wrapper.svg(0, 0, 0, 0, {class_: 'svg-plot'});
        this._gridlines = [{stroke: "lightgray"}, null];

        /* Construct Axes */
        this._drawNow = false;
	this.xAxis = new SVGPlotAxis(this); // The main x-axis
	this.xAxis.title('X', 40);
	this.yAxis = new SVGPlotAxis(this); // The main y-axis
	this.yAxis.title('Freq', 40);
	this._drawNow = true;
    };

    SVGHistogram.prototype = new SVGPlotCore();

    $.extend(SVGHistogram.prototype, {
        _numBins: function (n) {
            return (n < 30) ? Math.floor(Math.sqrt(n))+1 : Math.floor(Math.log(n)/Math.log(2)+2);
        },
        _dropIntoBuckets: function (datapts) {
            this._bins = [];
            datapts || (datapts = this._datapts);
            var xbound = datapts.reduce(function(prev, curr) {
                return [Math.min(prev[0],curr.xx), Math.max(prev[1], curr.xx)];
            }, [Infinity, -Infinity]).map(roundDigits);
            var numbins = this._numBins(datapts.length);
            var binsize = (xbound[1] - xbound[0])/numbins;
            for (var bot = xbound[0]; bot < xbound[1]; bot+=binsize) {
                this._bins.push([bot, bot+binsize, 0]);
            }
            datapts.forEach(function(val) {
                var i = Math.floor((val.xx-xbound[0])/binsize);
                i = Math.min(i, numbins-1);
                i = Math.max(i, 0);
                this._bins[i][2]++;
            }, this);
        },
        _maxCount: function () {
            var counts = this._bins.map(function(bin) {return bin[2]});
            return Math.max.apply(Math, counts);
        },
        resetAxes: function (datapts) {
            datapts || (datapts = this._datapts);
            this._dropIntoBuckets(datapts);
            var numbins = this._bins.length;
            var maxcount = this._maxCount();

            // Let axes handle edge cases (e.g. no datapts)
            this._drawNow = false;
            this.xAxis._numTicks = numbins;
            this.xAxis.resize(this._bins[0][0], this._bins[numbins-1][1]);
            this.yAxis.resize(0, maxcount);
        },
        drawPlot: function (filterData) {
            this._datapointCont = this._wrapper.group(this._plot);
            this._dropIntoBuckets(filterData);
            var maxcount = this._maxCount();
            this._bins.forEach(function(bin, i) {
                var topleft = this._getSVGCoords(bin[0], bin[2]);
                var bottomright = this._getSVGCoords(bin[1], 0);
                var w = bottomright[0] - topleft[0];
                var h = bottomright[1] - topleft[1];
                this._wrapper.rect(this._datapointCont, topleft[0], topleft[1], w, h, {
                    fill: "blue", color: "black", strokeWidth: "5px"});
            }, this);
        },
    });

    /* Details about each plot axis.
       @param  plot   (SVGPlot) the owning plot
       @param  title  (string) the title of the axis
       @param  min    (number) the minimum value displayed on this axis
       @param  max    (number) the maximum value displayed on this axis
       @param  major  (number) the distance between major ticks
       @return  (SVGPlotAxis) the new axis object */
    function SVGPlotAxis(plot, title, min, max, major) {
	this._plot = plot; // The owning plot
	this._title = title || ''; // The plot's title
	this._titleFormat = {fontSize:"12px"}; // Formatting settings for the title
	this._titleOffset = 0; // The offset for positioning the title
	this._labelFormat = {fontSize: "10px"}; // Formatting settings for the labels
	this._lineFormat = {stroke: 'black', strokeWidth: 1}; // Formatting settings for the axis lines
	this._ticks = {major: major || 10, size: 10, position: 'ne'}; // Tick mark options
	this._scale = {min: min || 0, max: max || 100}; // Axis scale settings
        this._buffer = 0;
        this._numTicks = 8;
    }

    $.extend(SVGPlotAxis.prototype, {

	/* Set or retrieve the scale for this axis.
	   @param  min  (number) the minimum value shown
	   @param  max  (number) the maximum value shown
	   @return  (SVGPlotAxis) this axis object or
	   (object) min and max values (if no parameters) */
	scale: function(min, max) {
	    if (arguments.length == 0) {
		return this._scale;
	    }
	    this._scale.min = min;
	    this._scale.max = max;
	    this._plot._refreshPlot();
	    return this;
	},

	/* Set or retrieve the ticks for this axis.
	   @param  major     (number) the distance between major ticks
	   @param  minor     (number) the distance between minor ticks
	   @param  size      (number) the length of the major ticks (minor are half) (optional)
	   @param  position  (string) the location of the ticks:
	   'nw', 'se', 'both' (optional)
	   @return  (SVGPlotAxis) this axis object or
	   (object) major, minor, size, and position values (if no parameters) */
	ticks: function(major, size, position) {
	    if (arguments.length == 0) {
		return this._ticks;
	    }
	    if (typeof size == 'string') {
		position = size;
		size = null;
	    }
	    this._ticks.major = major;
	    this._ticks.size = size || this._ticks.size;
	    this._ticks.position = position || this._ticks.position;
	    this._plot._refreshPlot();
	    return this;
	},

        resize: function (min, max, buffer) {
            // In the case no points were present after data added
            if ((min === Infinity) || (max === -Infinity)) {
                return;
            }
            buffer || (buffer = 0.1);
            var range = max - min;
            this._buffer = buffer < 1 ? range*buffer : buffer;
            min -= this._buffer;
            max += this._buffer;
            this.scale(min, max);
            this.ticks(range/this._numTicks);
        },

	/* Set or retrieve the title for this axis.
	   @param  title   (string) the title text
	   @param  offset  (number) the distance to offset the title position (optional)
	   @param  colour  (string) how to colour the title (optional) 
	   @param  format  (object) formatting settings for the title (optional)
	   @return  (SVGPlotAxis) this axis object or
	   (object) title, offset, and format values (if no parameters) */
	title: function(title, offset, colour, format) {
	    if (arguments.length == 0) {
		return {title: this._title, offset: this._titleOffset, format: this._titleFormat};
	    }
	    if (typeof offset != 'number') {
		format = colour;
		colour = offset;
		offset = null;
	    }
	    if (typeof colour != 'string') {
		format = colour;
		colour = null;
	    }
	    this._title = title;
	    this._titleOffset = (offset != null ? offset : this._titleOffset);
	    if (colour || format) {
		this._titleFormat = $.extend(format || {}, (colour ? {fill: colour} : {}));
	    }
	    this._plot._refreshPlot();
	    return this;
	},

	/* Set or retrieve the label format for this axis.
	   @param  colour  (string) how to colour the labels (optional) 
	   @param  format  (object) formatting settings for the labels (optional)
	   @return  (SVGPlotAxis) this axis object or
	   (object) format values (if no parameters) */
	format: function(colour, format) {
	    if (arguments.length == 0) {
		return this._labelFormat;
	    }
	    if (typeof colour != 'string') {
		format = colour;
		colour = null;
	    }
	    this._labelFormat = $.extend(format || {}, (colour ? {fill: colour} : {}));
	    this._plot._refreshPlot();
	    return this;
	},

	/* Set or retrieve the line formatting for this axis.
	   @param  colour    (string) the line's colour
	   @param  width     (number) the line's width (optional)
	   @param  settings  (object) additional formatting settings for the line (optional)
	   @return  (SVGPlotAxis) this axis object or
	   (object) line formatting values (if no parameters) */
	line: function(colour, width, settings) {
	    if (arguments.length == 0) {
		return this._lineFormat;
	    }
	    if (typeof width != 'number') {
		settings = width;
		width = null;
	    }
	    $.extend(this._lineFormat, {stroke: colour, strokeWidth:
			                width || this._lineFormat.strokeWidth}, settings || {});
	    this._plot._refreshPlot();
	    return this;
	},
    });

    /* The UISelector "class" contains most of the functionality necessary
       for a UI element to interact with FilterView. Depending on its uitype,
       it outsources some of its crucial methods to the UIMethods object
       below this. That is what the uitype-specific code is contained.
       @param svgplot  a reference to the svgplot to modify upon changes to UI state
       @param uitype (string) the type of ui selector (checkbox, regexp, etc.)
       @param local_attr  the name of what the data represented is called locally.
              So if the user passed in {col: new RemoteData(..), ...} in the
              options that was passed to jscliplot.plot, then col here is the
              local_attr is what the data is named when arriving to the browser.
              The remote_attr is what the data is called on the server.

              For the case of locally stored data, local_attr is simply the key
              of the value in the original options object and remote_attr is
              irrelevant.
       @param ischild (boolean) Whether or not the instance is a child ui or not.
       @param datapts  An array of the data plucked from the datapts stored in the
              svgplot object.*/
    function UISelector(svgplot, uitype, local_attr, remote_attr, ischild, datapts) {
        this._ui = null; // refence to ui DOM element
        this._svgplot = svgplot;
        this._uitype = uitype;
        this._lattr = local_attr;
        this._rattr = (remote_attr || local_attr);
        this._slavecont = svgplot._slavecont;
        this._class = this._uitype + "_" + this._lattr;
        this._id = this._slavecont + " ." + this._class;
        this._params = {}; // all ui specific info held here
        this._ischild = ischild;
        this._datapts = datapts; // array of data for attribute only
    };

    $.extend(UISelector.prototype, {
        /* Return the distinct set of values in an array
           @param  data  list of data values
           @return list of unique values from data */
        _distinctVals: function (data) {
            var seen = {}, uniq = [];
            data.forEach(function(val) {
                if (!seen[val]) {
                    seen[val] = true;
                    uniq.push(val);
                }
            });
            return uniq;
        },

        /* Introspection should categorize the data as int, float, or its
           type as specified by typeof. It will store this in this._params.type.
           @return UISelector object */
        _introspect: function () {
            if (typeof this._datapts[0] === "number") {
                var allints = this._datapts.every(function(val) {
                    return (val.toString().search(/^-?[0-9]+$/) == 0);
                });
                this._params.type = allints ? "integer" : "float";
            } else {
                this._params.type = (typeof this._datapts[0]);
            }
            return this;
        },

        /* Sort the data stored in this._datapts */
        _sortData: function () {
            if (typeof this._datapts[0] == "number") {
                this._datapts = this._datapts.sort(function (a,b) {return a-b});
                return;
            }
            this._datapts = this._datapts.sort();
        },

        /* Remove UI element */
        destroy: function () {
            $(this._id).remove();
        },

        /* Actually draw the UI element. This should only be called
           once, when the UI element is intialized*/
        drawUI: function () {
            this._introspect()._sortData();
            UIMethods[this._uitype].assignParams.call(this);
            UIMethods[this._uitype].draw.call(this);
            return this;
        },

        /* Returns a boolean, which is true if and only if the point
           meeting the criteria to be selected by this UI element.
           @param pt this is a datapoint {...} to be filtered
           @return (boolean) whether the UI element selects the point or not.*/
        filterLocal: function (pt) {
            return UIMethods[this._uitype].filterLocal.call(this, pt);
        },

        /* Returns the MongoDB query corresponding to state of UI Element
           @return UI's part to be integrated into MongoDB query on server */
        filterRemote: function () {
            return UIMethods[this._uitype].filterRemote.call(this);
        },

        /* To be called when the domain of the UI needs to be reset. This is
           typically only called when the UI element is a cui, and thus needs
           to adapt based on the data that has survived the normal ui elements*/
        reset: function (filtereddata) {
            (!filtereddata) || (this._datapts = filtereddata);
            this._sortData();
            UIMethods[this._uitype].reset.call(this);
        },
    });

    /* The UIMethods object currently contains all the code for each type of
       UI element. The this in these UI elements is bound to the instance
       of that particular UI element type. Each type must contain five methods:
        * assignParams = this is done to set this._params if necessary to
                         build the UI element later. This is typically
                         should be done right after the constructor has finished.
        *     draw     = a one-time (usually) method to actually create the UI object.
        * filterLocal  = In sync with the filterLocal of the UISelector object,
                         this should return a boolean based on the state of the
                         UI element and pt object passed to it.
        * filterRemote = In sync with filterRemote, this method should return
                         the part of the MongoDB query that this would normally
                         correspond to. See MongoDB documentation and the examples
                         below. This is only needed to make FilterView work with
                         data stored on the server.
        *     reset    = In sync with the UI Selector object, this resets
                         the UI Selector object with regards to the data
                         stored in this._datapts.*/
    UIMethods = {
        autocomplete: {
            assignParams: function () {
                this._params.source = this._distinctVals(this._datapts);
            },
            draw: function () {
                var self = this;
                var template = '<div class="${_class}"><label for="${_lattr}">${_lattr}: </label><input/></div>';
                $.tmpl(template, this).appendTo(this._slavecont);
                this._ui = $(this._id+" input");
                this._ui.autocomplete({
                    source: this._params.source,
                    select: function (e, ui) {
                        $(this).val(ui.item.value);
                        self._svgplot._UIChange();
                    }
                }).val(this._params.source[0]);
            },
            filterLocal: function (pt) {
                return (pt[this._lattr] == this._ui.val());
            },
            filterRemote: function () {
                var q = {};
                q[this._rattr] = this._ui.val();
                return q;
            },
            reset: function () {
                this._ui.autocomplete("option", "source", this._distinctVals(this._datapts));
            },
        },
        checkbox: {
            assignParams: function () {
                if (this._params.type == "float") {
                    var range = this._datapts[this._datapts.length-1] - this._datapts[0];
                    var NUMBUCKETS = 10, min = this._datapts[0];
                    this._params.labels = [];
                    for (var i=0; i<NUMBUCKETS; i++) {
                        var interval = [min + i*range/NUMBUCKETS, min + (i+1)*range/NUMBUCKETS].map(roundDigits);
                        this._params.labels.push(interval);
                    }
                } else {
                    this._params.labels = this._distinctVals(this._datapts);
                }
            },
            draw: function () {
                var template = '<div class="${_class}"><form></form></div>';
                $.tmpl(template, this).appendTo(this._slavecont);
                this._ui = $(this._id+' form');
                UIMethods.checkbox.reset.call(this); // you call assignParms twice, but no harm
            },
            filterLocal: function (pt) {
                if (this._params.type == "Float") {
                    var val = pt[this._lattr];
                    for (var i=0; i<this._params.labels.length; i++) {
                        var interval = this._params.labels[i];
                        if (val <= interval[1]) {
                            return this._params.checked[interval.toString()];
                        }
                    }
                } else {
                    return this._params.checked[pt[this._lattr]];
                }
            },
            // Doesn't work for Float type yet
            filterRemote: function () {
                var q = {}, ors = [];
                for (var cat in this._params.checked) {
                    if (this._params.checked[cat]) {
                        try {
                            cat = JSON.parse(cat);
                        } catch (err) {
                        }
                        ors.push(cat);
                    }
                }
                q[this._rattr] = {"$in": ors};
                return q;
            },
            reset: function () {
                var self = this;
                var prev = (this._params.checked || {});
                var tmpl = '<input type="checkbox" value="${lbl}" ${checked}><span>${lbl}</span></input>';
                this._ui.children().remove();
                this._params.checked = {};
                UIMethods.checkbox.assignParams.call(this);
                this._params.labels.forEach(function(lbl) {
                    lbl = lbl.toString();
                    var isChecked = (prev[lbl] !== undefined ? prev[lbl] : true);
                    self._params.checked[lbl] = isChecked;
                    var box = $.tmpl(tmpl, {lbl:lbl, checked: (isChecked ? "checked" : "")}).appendTo(self._ui);
                    $(box).change(function () {
                        self._params.checked[lbl] = $(this).is(':checked');
                        self._svgplot._UIChange();
                    });
                });
            },

        },
        dropdown: {
            assignParams: function () {
                UIMethods.checkbox.assignParams.call(this);
            },
            draw: function () {
                var self = this, select;
                this._ui = $.tmpl('<div class="${_class}"><select></select></div>', this).appendTo(this._slavecont);
                select = $(this._id+" select");
                this._params.labels.forEach(function(lbl) {
                    $.tmpl('<option value="${lbl}">${lbl}</option>', {lbl: lbl}).appendTo(select);
                });
                $(this._ui).change(function () {
                    self._svgplot._UIChange();
                });
            },
            filterLocal: function (pt) {
                if (this._params.type == "float") {
                    var bound = this._ui.val().split(',').map(parseFloat);
                    return ((pt[this._lattr] >= bound[0]) && (pt[this._lattr] <= bound[1]));
                }
                return (pt[this._lattr] == $(this._id+" option:selected").val());
            },
            // Doesn't work for Float yet
            filterRemote: function () {
                var q = {};
                q[this._rattr] = $(this._id+" option:selected").val();
                return q;
            },
            reset: function () {
                var select = $(this._id+" select");
                select.children().remove();
                this._params.labels.forEach(function(lbl) {
                    $.tmpl('<option value="${lbl}">${lbl}</option>', {lbl: lbl}).appendTo(select);
                });
            },
        },
        regexp: {
            assignParams: function () {},
            draw: function () {
                var self = this;
                var template = '<div class="${_class}"><label for="${_lattr}">${_lattr}: </label><input/></div>';
                $.tmpl(template, this).appendTo(this._slavecont);
                this._ui = $(this._id+" input");
                this._ui.change(function() {
                    self._svgplot._UIChange(self._id);
                });

            },
            filterLocal: function (pt) {
                var re = /^\/(?:(.*))\/(?:(.*))$/; // used to break up input regexp
                var match = re.exec(this._ui.val());
                var users = (match) ? new RegExp(match[1], match[2]) : new RegExp(this._ui.val());
                return (users.exec(pt[this._lattr]) !== null);
            },
            filterRemote: function () {
                var q = {}, re = /^\/(?:(.*))\/(?:(.*))$/; // used to break up input regexp
                var match = re.exec(this._ui.val());
                var users = (match) ? new RegExp(match[1], match[2]) : new RegExp(this._ui.val());
                users = users.toString();
                q[this._rattr] = users;
                return q;
            },
            reset: function () {},
        },
        slider: {
            assignParams: function () {
                if (this._params.type == "string") {
                    this._params = {
                        labels : this._distinctVals(this._datapts),
                        min : 0,
                        range : "min",
                        value : this._params.min,
                    };
                    this._params.max = this._params.labels.length - 1;
                } else if (this._params.type == "integer") {
                    this._params = {
                        min : this._datapts[0],
                        max : this._datapts[this._datapts.length-1],
                        value : this._params.min,
                    };
                } else if (this._params.type == "float") {
                    this._params = {
                        min : this._datapts[0],
                        max : this._datapts[this._datapts.length-1],
                        range : true,
                    };
                    this._params.values = [this._params.min, this._params.max];
                    this._params.step = (this._params.max - this._params.min)/100;
                }
            },
            draw: function () {
                var self = this, initval;
                var onevaltemp = '<div class="${_class}"><label>${_lattr}: </label><input/></div>';
                var twovaltemp = '<div class="${_class}"><label>${_lattr}: From</label><input/><label> To</label><input/></div>';

                if (this._params.values) {
                    $.tmpl(twovaltemp, this).appendTo(this._slavecont);
                    this._ui = $('<div style="margin: 15px;"></div>').appendTo(this._id);
                    this._params.from = $(this._id+" input:eq(0)").blur(function() {
                        self._ui.slider("option", "values", [$(this).val(), self._params.to.val()]);
                    });
                    this._params.to = $(this._id+" input:eq(1)").blur(function() {
                        self._ui.slider("option", "values", [self._params.from.val(), $(this).val()]);
                    });
                    initval = [this._params.min, this._params.max].map(roundDigits);
                    this._params.change = function (event, ui) {
                        var value = ui.values;
                        self._params.from.val(value[0]);
                        self._params.to.val(value[1]);
                        self._svgplot._UIChange();
                    };
                } else {
                    $.tmpl(onevaltemp, this).appendTo(this._slavecont);
                    this._ui = $('<div style="margin: 15px;"></div>').appendTo(this._id);
                    this._params.exact = $(this._id+" input").blur(function() {
                        var value, userio = $(this).val();
                        if (self._params.labels) {
                            value = self._params.labels.indexOf(userio);
                            value = Math.max(0, value); // if missing place at 0
                            self._ui.slider("option", "value", value);
                        } else {
                            value = parseInt(userio);
                            self._ui.slider("option", "value", value);
                        }
                    });
                    initval = this._params.labels ? this._params.labels[this._params.min] : this._params.min;
                    this._params.change = function (event, ui) {
                        var value = self._params.labels ? self._params.labels[ui.value] : ui.value;
                        self._params.exact.val(value);
                        self._svgplot._UIChange();
                    };
                }
                this._ui.slider(this._params);
                if (initval.constructor == Array) {
                    this._params.from.val(initval[0]);
                    this._params.to.val(initval[1]);
                } else {
                    this._params.exact.val(initval);
                }
            },
            filterLocal: function (pt) {
                if (this._params.values) {
                    var vals = this._ui.slider("values");
                    return ((pt[this._lattr] >= vals[0]) && (pt[this._lattr] <= vals[1]));
                }
                var val = this._ui.slider("value");
                val = this._params.labels ? this._params.labels[val] : val;
                return (pt[this._lattr] == val);
            },
            filterRemote: function () {
                var q = {};
                if (this._params.values) {
                    var vals = this._ui.slider("values");
                    q[this._rattr] = {"$gte": vals[0],"$lte": vals[1]};
                    return q;
                }
                var val = this._ui.slider("value");
                val = this._params.labels ? this._params.labels[val] : val;
                q[this._rattr] = val;
                return q;
            },
            reset: function () {
                var q = {}, val, vals, min, max;
                min = 0;
                max = this._datapts.length - 1;
                if (this._params.type != "string") {
                    min = this._datapts[min];
                    max = this._datapts[max];
                }
                if (this._params.values) {
                    vals = this._ui.slider("values");
                    if ((vals[0] < min) || (vals[0] > max)) {
                        vals[0] = min;
                    }
                    if ((vals[1] < min) || (vals[1] > max)) {
                        vals[1] = max;
                    }
                    vals = vals.map(roundDigits);
                    this._ui.slider("values", vals);
                    this._params.from.val(vals[0]);
                    this._params.to.val(vals[1]);
                } else {
                    val = this._ui.slider("value");
                    if ((val < min) || (val > max)) {
                        this._ui.slider("value", roundDigits(min));
                        this._params.exact.val(roundDigits(min));
                    }
                }
                this._ui.slider("option", "min", min);
                this._ui.slider("option", "max", max);
            },
        },

    };

    /* Helper function to round floats
       @param num the number to round off
       @param d the number of decimal places to have
       @return rounded decimal*/
    function roundDigits (num, d) {
        d || (d = 2);
        return (Math.round(Math.pow(10,d)*num)/Math.pow(10,d));
    };
})(jQuery);
