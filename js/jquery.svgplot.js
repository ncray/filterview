// Definition of the plotting package for the jscli.
// Heavily based on the jquery.svgplot.js extension
// designed by Keith Wood, who also designed the
// jquery.svg.js package as a whole.

(function($, undefined) {

    $.svg.addExtension('plot', SVGPlot); // hook to plug this into jquery svg

    function SVGPlot(wrapper) {
	this._wrapper = wrapper; // The attached SVG wrapper object
	this._plotCont = this._wrapper.svg(0, 0, 0, 0, {class_: 'svg-plot'}); // The main container for the plot
        this._slavecont = null;
	this._title = {value: '', offset: 25, settings: {textAnchor: 'middle'}};
        this._area = [0.10, 0.05, 0.95, 0.90]; // The chart area: left, top, right, bottom, > 1 in pixels, <= 1 as proportion
	this._areaFormat = {fill: 'none', stroke: 'black'}; // The formatting for the plot area
	this._gridlines = [{stroke: "lightgray"}, {stroke: "lightgray"}]; // The formatting of the x- and y-gridlines
        this._datapts = [];
        this._pointR = 5;
        this._template = '<div class="tooltip"><p>x: ${xx}</p><p>y: ${yy}</p></div>';
        this._uis = [];
        this._autorescale = false;
        this._updating = false; // to stop an infinite loop during UI changes
        this._queryelem = {};

        /* Construct Axes */
        this._drawNow = false;
	this.xAxis = new SVGPlotAxis(this); // The main x-axis
	this.xAxis.title('X', 40);
	this.yAxis = new SVGPlotAxis(this); // The main y-axis
	this.yAxis.title('Y', 40);
	this._drawNow = true;
    }

    $.extend(SVGPlot.prototype, {
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
	    this._initPlot();
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
	    this._initPlot();
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
	    this._initPlot();
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
	    this._initPlot();
	    return this;
	},

	/* Set the template for the tooltips.
	   @param  html - the html template to be used for jQuery templating
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
	    var bg = this._wrapper.group(this._plotCont, {class_: 'background'});
	    var dims = this._getDims();
	    this._wrapper.rect(bg, dims[this.X], dims[this.Y], dims[this.W], dims[this.H], this._areaFormat);
	    if (this._gridlines[0] && this.yAxis._ticks.major && !noYGrid) {
		this._drawGridlines(bg, true, this._gridlines[0], dims);
	    }
	    if (this._gridlines[1] && this.xAxis._ticks.major && !noXGrid) {
		this._drawGridlines(bg, false, this._gridlines[1], dims);
	    }
	    return bg;
	},

	/* Draw one set of gridlines.
	   @param  bg      (element) the background group element
	   @param  horiz   (boolean) true if horizontal, false if vertical
	   @param  format  (object) additional settings for the gridlines */
	_drawGridlines: function(bg, horiz, format, dims) {
	    var g = this._wrapper.group(bg, format);
	    var axis = (horiz ? this.yAxis : this.xAxis);
	    var scales = this._getScales();
	    var major = Math.floor(axis._scale.min / axis._ticks.major) * axis._ticks.major;
	    major += (major <= axis._scale.min ? axis._ticks.major : 0);
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
		var major = Math.floor(axis._scale.min / axis._ticks.major) * axis._ticks.major;
		major += (major < axis._scale.min ? axis._ticks.major : 0);
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

	/* Draw the plot title - centred. */
	_drawTitle: function() {
	    this._wrapper.text(this._plotCont, this._getValue(this._plotCont, 'width') / 2,
			       this._title.offset, this._title.value, this._title.settings);
	},

	/* Plot datapoints. */
        _drawDataPoints: function (filterData) {
	    var dims = this._getDims();
            var scales = this._getScales();
            this._pointR = Math.min(dims[this.W], dims[this.H])/150;
            var xx = this._isRemote ? (this._queryelem.xx ? this._queryelem.xx.remote_attr : null) : "xx";
            var yy = this._isRemote ? this._queryelem.yy.remote_attr : "yy";
            var col = (this._isRemote && this._queryelem.col) ? this._queryelem.col.remote_attr : "col";
            var rad = (this._isRemote && this._queryelem.radius) ? this._queryelem.radius.remote_attr : "rad";

            filterData.forEach(function(pt, i) {
                var data = {
                    xx  : (pt[xx] || (i+1)),
                    yy  : pt[yy],
                    col : (pt[col] || "black"),
                    rad : (pt[rad] || this._pointR),
                };
                var cx = (data.xx - this.xAxis._scale.min) * scales[0] + dims[this.X];
                var cy = (this.yAxis._scale.max - data.yy) * scales[1] + dims[this.Y];
                var c = this._wrapper.circle(this._plot, cx, cy, data.rad,
                             {fill: data.col, stroke: "black", strokeWidth: 1});
                this._showStatus(c, data);
            }, this);
	},

	/* Show the current value status on hover. */
	_showStatus: function(elem, data) {
            if (!this._template) {
                return;
            }
            var self = this;
            var html = $.tmpl(this._template, data);
            var dims = this._getDims();
            $(elem).hover(function(e) {
                var toolcont = self._wrapper.group(self._plot, {class_: "point-metadata"});
                var pos = [self._getValue(elem, "cx"), self._getValue(elem, "cy"), dims[self.W]/5, dims[self.H]/8];
                self._wrapper.rect(toolcont, pos[0], pos[1]-pos[3], pos[2], pos[3],
                                   {fill: 'white', stroke: data.col, strokeWidth: 3});
                var temp = self._wrapper.foreignObject(toolcont, pos[0], pos[1]-pos[3], pos[2], pos[3]);
                $(temp).append(html);
            }, function() {
                $(".point-metadata").remove();
            });
	},

	/* Actually draw the plot (if allowed). */
	_initPlot: function() {
	    if (!this._drawNow) {
		return;
	    }
	    while (this._plotCont.firstChild) {
		this._plotCont.removeChild(this._plotCont.firstChild);
	    }
	    if (!this._plotCont.parent) {
		this._wrapper._svg.appendChild(this._plotCont);
	    }
	    // Set sizes if not already there
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
            if (this._isRemote) {
                this._filterData(this._makePlot);
            } else {
                this._makePlot(this._filterData());
            }
        },

        _makePlot: function (queriedData) {
            (!this._autorescale) || this.resetAxes(queriedData);
	    this._drawChartBackground();
            var uuid = new Date().getTime();
	    var dims = this._getDims();
	    var clip = this._wrapper.other(this._plotCont, 'clipPath', {id: 'clip' + uuid});
	    this._wrapper.rect(clip, dims[this.X], dims[this.Y], dims[this.W], dims[this.H]);
	    this._plot = this._wrapper.group(this._plotCont, {class_: 'foreground'});
	    this._drawAxis(true);
	    this._drawAxis(false);
	    this._drawTitle();
            this._drawDataPoints(queriedData);
	},

        clearData: function () {
            this._datapts = [];
            this._queryelem = {};
            this._uis.forEach(function(ui) {ui.destroy();});
            this._uis = [];
            this._autorescale = false;
            this._drawNow = false;
            this.xAxis.title("X", 40);
            this.yAxis.title("Y", 40);
            this._drawNow = true;
            return this;
        },

        /* Rescale the axes based on what information is stored
           as _datapts. */
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
            this.xAxis.resize(bounds.xx[0], bounds.xx[1]);
            this.yAxis.resize(bounds.yy[0], bounds.yy[1]);
        },

        _setAxesRemote: function () {
            var self = this;
            this._drawNow = false;
            $.getJSON("summary/"+this._queryelem.yy.remote_attr, function (ysum) {
                self.yAxis.resize(ysum.range[0], ysum.range[1]);
                if (self._queryelem.xx) {
                    $.getJSON("summary/"+self._queryelem.xx.remote_attr, function (xsum) {
                       self.xAxis.resize(xsum.range[0], xsum.range[1]);
                       self.redraw();
                    });
                } else {
                    self.xAxis.resize(1, ysum.count);
                    self.redraw();
                }
            });
        },

	/* Redraw the entire plot with the current settings and values.
	   @return  (SVGPlot) this plot object */
	redraw: function() {
	    this._drawNow = true;
	    this._initPlot();
	    return this;
	},

        loadData: function (data) {
            this.clearData();
            this._isRemote = !!data.remote;
            var uiFn = this._isRemote ? this._createRemoteUI : this._createLocalUI;
            this._autorescale = data.rescale;
            this._datapts = this._isRemote ? null : data.local;
            this._queryelem = this._isRemote ? data.remote : {};

            (!data.xlab) || this.xAxis.title(data.xlab);
            (!data.ylab) || this.yAxis.title(data.ylab);
            (!data.ui)   || uiFn.call(this, data.ui, false);
            (!data.cui)  || uiFn.call(this, data.cui, true);
            if (this._autorescale) {
                this.redraw()
            } else {
                if (this._isRemote) {
                    this._setAxesRemote();
                } else {
                    this.resetAxes();
                    this.redraw();
                }
            }
        },

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

        _createRemoteUI: function (uiobj, ischild) {
            var self = this, uitype;
            if (uiobj.constructor == Object) {
                for (uitype in uiobj) {
                    if (typeof uiobj[uitype] == 'string') {
                        uiobj[uitype] = [uiobj[uitype]];
                    }
                    uiobj[uitype].forEach(function(local_attr) {
                        var remote_attr = this._queryelem[local_attr].remote_attr;
                        var _uitype = uitype;
                        $.getJSON("ui/"+remote_attr, function (metadata) {
                            var ui = new UISelector(self, _uitype, local_attr, remote_attr, ischild, metadata.reps);
                            ui._params.type = metadata.datatype;
                            UIMethods[ui._uitype].assignParams.call(ui);
                            UIMethods[ui._uitype].draw.call(ui);
                            self._uis.push(ui);
                        });
                    }, this);
                }
            }
        },

        _filterData: function (callback) {
            if (callback) {
                var query = {}, attrs = {}, remote, self = this;
                this._uis.filter(function(ui) {return (!ui._ischild)}).forEach(function (ui) {
                    query = $.extend(query, ui.filterRemote());
                });
                for (var lattr in this._queryelem) {
                   if (remote = this._queryelem[lattr]) {
                        attrs[remote.remote_attr] = 1;
                    }
                }
                var cuis = this._uis.filter(function(ui) {return (ui._ischild)});
                if (cuis.length) {
                    var cui = cuis[0];
                    $.ajax({url: "cui",
                            type: "POST",
                            dataType: "json",
                            data: {"q": JSON.stringify(query), "f": cui._rattr},
                            success: function (data) {
                                cui.reset(data);
                                query = $.extend(query, cui.filterRemote());
                                $.ajax({url: "filter",
                                        type: "POST",
                                        dataType: "json",
                                        data: {"q":JSON.stringify(query),"a":JSON.stringify(attrs)},
                                        success: function (data) {
                                            callback.call(self, data);
                                        }});
                                return;
                            }});
                    return;
                }
                $.ajax({url: "filter",
                        type: "POST",
                        dataType: "json",
                        data: {"q":JSON.stringify(query),"a":JSON.stringify(attrs)},
                        success: function (data) {
                            callback.call(self, data);
                        }});
                return;
            }
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

        _UIChange: function () {
            if (this._updating) {
                return;
            }
            this._updating = true;
            this.redraw();
            this._updating = false;
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
	this._ticks = {major: major || 10, size: 15, position: 'ne'}; // Tick mark options
	this._scale = {min: min || 0, max: max || 100}; // Axis scale settings
	this._crossAt = 0; // Where this axis crosses the other one. */
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
	    this._plot._initPlot();
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
	    this._plot._initPlot();
	    return this;
	},

        resize: function (min, max, buffer) {
            // In the case no points were present after data added
            if ((min === Infinity) || (max === -Infinity)) {
                return;
            }
            buffer || (buffer = 0.1);
            var range = max - min;
            if (buffer < 1) {
                min -= (buffer*range);
                max += (buffer*range);
            } else {
                min -= buffer;
                max += buffer;
            }
            this.scale(min, max);
            this.ticks((max - min)/this._numTicks);
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
	    this._plot._initPlot();
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
	    this._plot._initPlot();
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
	    this._plot._initPlot();
	    return this;
	},
    });

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
        _range: function () {
            return this._datapts.reduce(function(prev, curr) {
                return [Math.min(curr, prev[0]), Math.max(curr, prev[1])];
            }, [Infinity, -Infinity]);
        },

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

        // Introspection should provide with the data as number/int, number/float,
        // or string. Right now we'll be content with checking only
        // the first element, but later we'll want to check all probably (esp
        // if there are any NAs)
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

        _sortData: function () {
            if (typeof this._datapts[0] == "number") {
                this._datapts = this._datapts.sort(function (a,b) {return a-b});
                return;
            }
            this._datapts = this._datapts.sort();
        },

        destroy: function () {
            $(this._id).remove();
        },

        // These are the parts only done once
        drawUI: function () {
            this._introspect()._sortData();
            UIMethods[this._uitype].assignParams.call(this);
            UIMethods[this._uitype].draw.call(this);
            return this;
        },

        filterLocal: function (pt) {
            return UIMethods[this._uitype].filterLocal.call(this, pt);
        },

        filterRemote: function () {
            return UIMethods[this._uitype].filterRemote.call(this);
        },

        // These are the parts repeated each update
        reset: function (filtereddata) {
            (!filtereddata) || (this._datapts = filtereddata);
            this._sortData();
            UIMethods[this._uitype].reset.call(this);
        },
    });

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
                        ors.push(cat);
                    }
                }
                q[this._rattr] = {"$in": ors};
                return q;
            },
            reset: function () {
                var self = this;
                this._ui.children().remove();
                this._params.checked = {};
                UIMethods.checkbox.assignParams.call(this);
                this._params.labels.forEach(function(lbl) {
                    self._params.checked[lbl.toString()] = true;
                    var box = $('<input type="checkbox" value="'+lbl+'" checked><span>'+lbl+'</span></input>').appendTo(self._ui);
                    $(box).css({'font-size':'150%'}).change(function () {
                        self._params.checked[lbl.toString()] = $(this).is(':checked');
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
                $.tmpl('<div class="${_class}"><label>${_lattr}</label><input/></div>', this).appendTo(this._slavecont);
                this._ui = $('<div style="margin: 15px"></div>').appendTo(this._id);
                this._params.weight = $(this._id+" input");
                if (this._params.values) {
                    initval = [this._params.min, this._params.max].map(roundDigits).join(" to ");
                    this._params.change = function (event, ui) {
                        var value = ui.values.map(roundDigits).join(" to ");
                        self._params.weight.val(value);
                        self._svgplot._UIChange();
                    };
                } else {
                    initval = this._params.labels ? this._params.labels[this._params.min] : this._params.min;
                    this._params.change = function (event, ui) {
                        var value = self._params.labels ? self._params.labels[ui.value] : ui.value;
                        self._params.weight.val(value);
                        self._svgplot._UIChange();
                    };
                }
                this._ui.slider(this._params);
                this._params.weight.val(initval);
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
                    this._params.weight.val(vals.join(" to "));
                } else {
                    val = this._ui.slider("value");
                    if ((val < min) || (val > max)) {
                        this._ui.slider("value", roundDigits(min));
                        this._params.weight.val(roundDigits(min));
                    }
                }
                this._ui.slider("option", "min", min);
                this._ui.slider("option", "max", max);
            },
        },

    };

    function roundDigits (num, d) {
        d || (d = 2);
        return (Math.round(Math.pow(10,d)*num)/Math.pow(10,d));
    };
})(jQuery);