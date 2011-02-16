// Definition of the plotting package for the jscli.
// Authors: Jackson Gorham
// Email: jacksongorham@gmail.com

define(["order!thirdparty/jquery.tmpl.js", "order!thirdparty/development-bundle/ui/jquery-ui-1.8.7.custom.js", "order!thirdparty/jquery.svg.js", "order!js/jquery.svgplot.js"], function() {
    /* Store svgplot reference */
    var svgplot, uidiv, _template;

    /* Try to parse any argument thats a string */
    function evalArg(arg) {
        if (typeof arg !== 'string') {
            return (arg || null);
        }
        try {
            arg = JSON.parse(arg);
        } catch (err) {}
        return arg;
    };

    /* Get a non null value from object */
    function nonNullArg(args) {
        var nonNull = null;
        for (var arg in args) {
            if (nonNull = args[arg]) break;
        }
        return nonNull;
    };

    /* Determine if the obj passed in is in fact an instance
       of RemateData and a reference data stored at some url
       @param obj - the object
       @return (boolean) true if and only if is reference data stored
               at some url */
    function isAjaxRemote (obj) {
        if (!obj || (typeof obj != "object") || (obj.constructor == Array)) {
            return false;
        }
        return !!(obj.url);
    };

    /* Depending on whether the data is all present as an array,
       a mixture of present and url references, or held remotely
       on a server, this zips all the data up from a list of lists
       into a cluster of points to be sent to the loadData function
       in the SVGPlot object.
       @param args - the args passed in not part of the options
       @param opts - the user's options
       @return the zipped up data (or none if we must make jsonp calls) */
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

    /* Zip the data up if all held locally */
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

    /* Zip the data up as best as possible when it refers
       to data held on the server in a database */
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

    /* function called recursively to load data that needs
       to be pulled in from jsonp requests. */
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

    /* The jscliplot object that is the gateway for the user
       to actually invoke calls in the R-like syntax */
    return {
        /* Must be called before plot, in order to attach the svgplot
           and ui elements to some divs on the page */
        createSVGPlot: function (svg_id, ui_id) {
            $(svg_id).svg();
            svgplot = $(svg_id).svg('get');
            uidiv = ui_id;
        },
        /* The R like plot function */
        plot: function () {
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
            // if we need to load data via ajax, this
            // will be null. Otherwise its good to plot.
            if (data) {
                svgplot.plot.loadData(data);
            }
        },
        hist: function () {
            var xx, opts, data;
            if (!arguments.length) return;
            svgplot.hist._slavecont = uidiv;
            if (_template) {
                svgplot.hist.template(_template);
                _template = null;
            }
            xx = arguments[0];
            opts = (arguments[1] || {});
            data = zipParams({xx:xx}, opts);
            (!data) || svgplot.hist.loadData(data);
        },
        /* Used to set the template of the SVGPlot object */
        template: function(temp) {
            _template = temp;
        },
    };
});
