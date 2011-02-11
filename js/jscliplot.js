// Definition of the plotting package for the jscli.
// Authors: Jackson Gorham
// Email: jacksongorham@gmail.com

define(["order!thirdparty/jquery.tmpl.js", "order!thirdparty/development-bundle/ui/jquery-ui-1.8.7.custom.js", "order!thirdparty/jquery.svg.js", "order!js/jquery.svgplot.js"], function() {
    /* Store svgplot reference */
    var svgplot;

    /* Try to parse any argument thats a string */
    function evalArg(arg) {
        if (typeof arg !== 'string') {
            return arg;
        }
        try {
            arg = JSON.parse(arg);
        } catch (err) {}
        return arg;
    };

    /* Determine if the obj passed in is in fact an instance
       of RemateData and a reference data stored at some url
       @param obj - the object
       @return (boolean) true if and only if is reference data stored
               at some url */
    function isAjaxRemote (obj) {
        if ((typeof obj != "object") || (obj.constructor == Array)) {
            return false;
        }
        return !!(obj.url);
    };

    /* Depending on whether the data is all present as an array,
       a mixture of present and url references, or held remotely
       on a server, this zips all the data up from a list of lists
       into a cluster of points to be sent to the loadData function
       in the SVGPlot object.
       @param xx - the xx data (may be null)
       @param yy - the yy data
       @param opts - the user's options
       @return the zipped up data (or none if we must make jsonp calls) */
    function zipParams (xx, yy, opts) {
        var hasAjax = false;
        if ((yy.constructor.name == "RemoteData") && (!yy.url)) {
            return zipRemoteData(xx, yy, opts);
        }
        hasAjax = (hasAjax || isAjaxRemote(xx));
        hasAjax = (hasAjax || isAjaxRemote(yy));
        for (var attr in opts) {
            if (hasAjax) {
                break;
            }
            hasAjax = (hasAjax || isAjaxRemote(opts[attr]));
        }
        if (hasAjax) {
            loadAjaxData($.extend(opts, {xx:xx, yy:yy}));
            return null;
        }
        return zipLocalData(xx, yy, opts);
    };

    /* Zip the data up if all held locally */
    function zipLocalData(xx, yy, opts) {
        xx || (xx = []);
        var point_params = Object.keys(opts).filter(function(key) {
            return ((key != "ui") && (key != "cui") &&
                    (this[key].constructor == Array) &&
                    (this[key].length == yy.length));
        }, opts);
        var local = yy.map(function(val, i) {
            var pt = {
                xx: (xx[i] || i+1),
                yy: val,
            };
            point_params.forEach(function(opt) {
                pt[opt] = opts[opt][i];
            });
            return pt;
        });
        point_params.forEach(function(opt) {
            delete opts[opt];
        });
        return $.extend({local: local}, opts);
    };

    /* Zip the data up as best as possible when it refers
       to data held on the server in a database */
    function zipRemoteData(xx, yy, opts) {
        var remote = {};
        remote.xx = (xx && (xx.constructor.name == "RemoteData")) ? xx : null;
        remote.yy = yy;
        for (var attr in opts) {
            if ((attr != "ui") && (attr != "cui") && (attr != "postFns") && (typeof opts[attr] == 'object')) {
                remote[attr] = opts[attr];
                delete opts[attr];
            }
        }
        return $.extend({remote:remote}, opts);
    };

    /* function called recursively to load data that needs
       to be pulled in from jsonp requests. */
    function loadAjaxData(data) {
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
                    loadAjaxData(data);
                },
            });
            return;
        }
        var xx = data.xx;
        var yy = data.yy;
        delete data.xx;
        delete data.yy;
        svgplot.plot.loadData(zipLocalData(xx, yy, data));
    };

    /* The jscliplot object that is the gateway for the user
       to actually invoke calls in the R-like syntax */
    return {
        /* Must be called before plot, in order to attach the svgplot
           and ui elements to some divs on the page */
        createSVGPlot: function (svg_id, ui_id) {
            $(svg_id).svg();
            svgplot = $(svg_id).svg('get');
            svgplot.plot._slavecont = ui_id;
        },
        /* The R like plot function */
        plot: function () {
            var xx, yy, opts, data, args = Array.prototype.slice.call(arguments);
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

            data = zipParams(xx, yy, opts);
            // if we need to load data via ajax, this
            // will be null. Otherwise its good to plot.
            if (data) {
                svgplot.plot.loadData(data);
            }
        },
        /* Used to set the template of the SVGPlot object */
        template: function(temp) {
            svgplot.plot.template(temp);
        },
    };
});
