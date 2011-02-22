// Definition of the plotting package for the jscli.
// Author(s): Jackson Gorham
// Email: jacksongorham@gmail.com

define(["order!thirdparty/modernizr-1.7.min.js",
        "order!thirdparty/jquery.tmpl.js",
        "order!thirdparty/development-bundle/ui/jquery-ui-1.8.7.custom.js",
        "order!thirdparty/jquery.svg.js",
        "order!js/jquery.svgplot.js"], function() {
    // Store svgplot references
    var svgplot, uidiv, _template, _supportsSVG;

    // Make sure browser supports SVG
    function verifySVG(svg_id) {
        _supportsSVG = Modernizr.svg;
        if (!Modernizr.svg) {
            $("<div><h2>Sorry, your browser doesn't support SVG.</h2><p>Please try using the latest Chrome or Firefox 4 beta.</p></div>").appendTo(svg_id);
        }
    }

    // Some browsers don't support Object.keys, so
    // I'll implement this here.
    if (!Object.keys) Object.keys = function(o){
        var ret=[], p;
        for (p in o) if (Object.prototype.hasOwnProperty.call(o,p)) ret.push(p);
        return ret;
    }

    // Try to parse any argument thats a string
    function evalArg(arg) {
        if (typeof arg !== 'string') {
            return (arg || null);
        }
        try {
            arg = JSON.parse(arg);
        } catch (err) {}
        return arg;
    };

    // Get a non null value from object
    function nonNullArg(args) {
        var nonNull = null;
        for (var arg in args) {
            if (nonNull = args[arg]) break;
        }
        return nonNull;
    };

    // Determine if the obj passed in is in fact an instance
    // of RemateData and a reference data stored at some url
    // @params
    // Object obj -> the object that is tested to contain an Ajax Remote elem
    // @return -> Boolean
    // true if and only if it references data stored at some url
    function isAjaxRemote (obj) {
        if (!obj || (typeof obj != "object") || (obj.constructor == Array)) {
            return false;
        }
        return !!(obj.url);
    };

    // Depending on whether the data is all present as an array,
    // a mixture of present and url references, or held remotely
    // on a server, this zips all the data up from a list of lists
    // into a cluster of points to be sent to the loadData function
    // in the SVGPlot object.
    // @params
    // Object args -> the args passed in not part of the options
    // Object opts -> the user's options
    // @return (null or Object)
    // the zipped up data (or none if we must make jsonp calls)
    function zipParams (args, opts) {
        var nonNull = nonNullArg(args);
        var data = $.extend(true, {}, opts, args);
        if (nonNull && (nonNull.constructor.name == "RemoteData")
                    && (!nonNull.url)) {
            return zipRemoteData(data);
        }
        // Check if args need jsonp
        for (var arg in args) {
            if (isAjaxRemote(args[arg])) {
                loadAjaxData(data, Object.keys(args));
                return null;
            }
        }
        // Check if opts need jsonp
        for (var opt in opts) {
            if (isAjaxRemote(opts[opt])) {
                loadAjaxData(data, Object.keys(args));
                return null;
            }
        }
        return zipLocalData(args, opts);
    };

    // Zip the data up the data now it is all locally stored
    // @params
    // Object args -> raw data to be plotted
    // Object opts -> the options object
    // @return Object
    // The data to be loaded into jquery.svgplot
    function zipLocalData(args, opts) {
        var nonNull = nonNullArg(args), point_params, local;
        point_params = Object.keys(opts).filter(function(key) {
            return ((key != "ui") &&
                    (key != "cui") &&
                    (key != "postFns") &&
                    (this[key].constructor == Array) &&
                    (this[key].length == nonNull.length));
        }, opts);
        local = nonNull.map(function(val, i) {
            var pt = {};
            for (var arg in args) {
                pt[arg] = (args[arg] ? args[arg][i] : i+1);
            }
            point_params.forEach(function(opt) {
                pt[opt] = opts[opt][i];
            });
            return pt;
        });
        point_params.forEach(function(opt) {
            delete opts[opt];
        });
        return $.extend(opts, {local: local});
    };

    // Zip the data up as best as possible when it refers
    // to data held on the server in a database
    // @params
    // Object kwargs -> object containing all remote references to data
    // @return Object
    // Object with all pointwise data "zipped" together in remote's value
    function zipRemoteData(kwargs) {
        var remote = {};
        for (var kw in kwargs) {
            if ((kw != "ui") && (kw != "cui") &&
                (kw != "postFns") &&
                (typeof kwargs[kw] == 'object')) {
                remote[kw] = kwargs[kw];
                delete kwargs[kw];
            }
        }
        return $.extend({remote:remote}, kwargs);
    };

    // Function called recursively to load data that needs
    // to be pulled in from jsonp requests.
    // @params
    // Object data -> all data to be loaded for svgplot
    // Array argnames -> the argument names of main data
    // @return none
    function loadAjaxData(data, argnames) {
        var url, attrs = [];
        for (var attr in data) {
            if (data[attr] && (data[attr].constructor.name == "RemoteData")) {
                url || (url = data[attr].url);
                if (data[attr].url == url) {
                    attrs.push(attr);
                }
            }
        }
        if (url) {
            $.ajax({
                url: url,
                dataType: "jsonp",
                success: function (json) {
                    attrs.forEach(function(attr) {
                        data[attr] = data[attr].callback(json);
                    });
                    loadAjaxData(data, argnames);
                },
            });
            return;
        }
        var args = {};
        argnames.forEach(function(argname) {
            args[argname] = data[argname];
            delete data[argname];
        });
        svgplot.plot.loadData(zipLocalData(args, data));
    };

    // The jscliplot object that is the gateway for the user
    // to actually invoke calls in the R-like syntax. We use
    // closure to hide the above functions from user.
    return {
        // Must be called before plot, in order to attach the svgplot
        // and ui elements to some divs on the page.
        createSVGPlot: function (svg_id, ui_id) {
            verifySVG(svg_id);
            if (_supportsSVG) {
                $(svg_id).svg();
                svgplot = $(svg_id).svg('get');
                uidiv = ui_id;
            }
        },
        // The R-like plot function
        plot: function () {
            if (!_supportsSVG) {
                if (_supportsSVG === undefined) console.log("Need to attach with createSVGPlot before plotting.");
                return;
            }
            var xx, yy, opts, data, args = Array.prototype.slice.call(arguments);
            svgplot.plot._slavecont = uidiv;
            if (_template) {
                svgplot.plot.template(_template);
                _template = null;
            }
            switch (args.length) {
            case 0:
                return;
            case 1:
                yy = args[0];
                break;
            case 2:
                if (args[1].constructor == Object) {
                    yy = args[0];
                    opts = args[1];
                } else {
                    xx = args[0];
                    yy = args[1];
                }
                break;
            case 3:
                xx = args[0];
                yy = args[1];
                opts = args[2];
                break;
            }
            // If any args are strings, try to parse them
            xx = evalArg(xx);
            yy = evalArg(yy);
            opts || (opts = {});
            // This is crucial - otherwise we destroy the original.
            opts = $.extend(true, {}, opts);
            for (var opt in opts) {
                opts[opt] = evalArg(opts[opt]);
            }
            data = zipParams({xx:xx, yy:yy}, opts);
            // If we need to load data via ajax, this
            // will be null; otherwise its good to plot.
            if (data) {
                svgplot.plot.loadData(data);
            }
        },
        hist: function () {
            if (!_supportsSVG) {
                if (_supportsSVG === undefined) console.log("Need to attach with createSVGPlot before plotting.");
                return;
            }
            var xx, opts, data, args = Array.prototype.slice.call(arguments);
            if (!args.length) return;
            svgplot.hist._slavecont = uidiv;
            if (_template) {
                svgplot.hist.template(_template);
                _template = null;
            }
            xx = args[0];
            opts = (args[1] && args[1].constructor == Object) ? $.extend(true, {}, args[1]) : {};
            data = zipParams({xx:xx}, opts);
            (!data) || svgplot.hist.loadData(data);
        },
        // Used to set the template of the SVGPlotCore object
        template: function(temp) {
            _template = temp;
        },
    };
});
