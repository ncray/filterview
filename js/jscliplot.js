// Definition of the plotting package for the jscli.
// Authors: Jackson Gorham
// Email: jacksongorham@gmail.com

define(["order!thirdparty/jquery.tmpl.js", "order!thirdparty/development-bundle/ui/jquery-ui-1.8.7.custom.js", "order!thirdparty/jquery.svg.js", "order!js/jquery.svgplot.js"], function() {
    var svgplot;

    function evalArg(arg) {
        if (typeof arg !== 'string') {
            return arg;
        }
        try {
            arg = JSON.parse(arg);
        } catch (err) {}
        return arg;
    };

    function isAjaxRemote (obj) {
        if ((typeof obj != "object") || (obj.constructor == Array)) {
            return false;
        }
        return !!(obj.url);
    };

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

    function zipRemoteData(xx, yy, opts) {
        var remote = {};
        remote.xx = (xx && (xx.constructor.name == "RemoteData")) ? xx : null;
        remote.yy = yy;
        for (var attr in opts) {
            if ((attr != "ui") && (attr != "cui") && (typeof opts[attr] == 'object')) {
                remote[attr] = opts[attr];
                delete opts[attr];
            }
        }
        return $.extend({remote:remote}, opts);
    };

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

    return {
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
        createSVGPlot: function (svg_id, ui_id) {
            $(svg_id).svg();
            svgplot = $(svg_id).svg('get');
            svgplot.plot._slavecont = ui_id;
        },
    };
});
