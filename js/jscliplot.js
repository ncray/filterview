// Definition of the plotting package for the jscli.
// Heavily based on the jquery.svgplot.js extension
// designed by Keith Wood.

define(["order!thirdparty/jquery.tmpl.js", "order!thirdparty/development-bundle/ui/jquery-ui-1.8.7.custom.js", "order!thirdparty/jquery.svg.js", "order!js/jquery.svgplot.js"], function() {
    var gslave     = '#gslave', svgplot,
        plotColors = ["black", "red", "blue", "green", "orange", "pink", "yellow", "purple"];

    function numHistBins (n, opt_bin) {
        if (opt_bin) {
            return parseInt(opt_bin);
        }
        return (n < 30) ? Math.floor(Math.sqrt(n))+1 : Math.floor(Math.log(n)/Math.log(2)+2);
    };

    function evalArg(arg) {
        if (typeof arg !== 'string') {
            return arg;
        }
        // v is a global object containing vars
        // var keys = arg.split("."), temp = (v === undefined ? {} : v);
        // while (keys.length > 0) {
        //     if (keys[0] in temp) {
        //         temp = temp[keys.shift()];
        //         if (keys.length == 0) {
        //             return temp;
        //         }
        //     } else {
        //         break;
        //     }
        // }
        // last try to parse it
        try {
            arg = JSON.parse(arg);
        } catch (err) {}
        return arg;
    };

    function zipLocalData(xx, yy, opts) {
        var point_params = [];
        for (varname in opts) {
            if ((varname != "ui") && (opts[varname].constructor == Array)
                && (opts[varname].length == yy.length)) {
                point_params.push(varname);
            }
        }
        // there will always be a yy
        var pts = yy.map(function(val, i) {
            var pt = {
                xx: (xx[i] || i+1),
                yy: val,
            };
            point_params.forEach(function(opt) {
                pt[opt] = opts[opt][i];
            });
            pt.col || (pt.col = plotColors[0]);
            return pt;
        });
        point_params.forEach(function(opt) {
            delete opts[opt];
        });
        return $.extend({pts: pts}, opts);
    };

    function zipRemoteData(xx, yy, opts) {
        var pts = {};
        pts.xx = (xx.constructor.name == "RemoteData") ? xx : null;
        pts.yy = yy;
        for (var attr in opts) {
            if ((attr != "ui") && (attr != "cui") && (typeof opts[attr] == 'object')) {
                pts[attr] = opts[attr];
                delete opts[attr];
            }
        }
        return $.extend({pts:pts}, opts);
    };

    return {
        attach : function () {
            $('#jsslave').removeClass('grid_16').addClass('grid_8');
            $('#jsslave').after('<div id="gslave" class="grid_8"><div>');

            this.createSVGPlot(gslave, gslave);
            svgplot.plot.redraw();
        },
        detach: function () {
            $(gslave).remove();
            $('#jsslave').removeClass('grid_8').addClass('grid_16');
            svgplot = null;
        },
        plot: function () {
            var args=[], xx=[], yy=[], opts={}, data;
            for (var i=0; i<arguments.length; i++) {
                args.push(evalArg(arguments[i]));
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

            for (var opt in opts) {
                opts[opt] = evalArg(opts[opt]);
            }
            if (yy.constructor.name == "RemoteData") {
                data = zipRemoteData(xx, yy, opts);
            } else {
                data = zipLocalData(xx, yy, opts);
            }
            svgplot.plot.loadData(data);
        },
        createSVGPlot: function (svg_id, ui_id) {
            $(svg_id).svg();
            svgplot = $(svg_id).svg('get');
            svgplot.plot._slavecont = ui_id;
        },
        // hist : function (args, opts) {
        //     // just assuming that args is a single list now
        //     var n, min, max, range, numbin, stepsize, elems, barcolor, counts=[], ticks=[];
        //     opts || (opts = {});
        //     elems = (typeof args[0] === "string") ? JSON.parse(args[0]) : args[0];

        //     n = elems.length;
        //     numbin = _numHistBins(n, opts.bins);
        //     min = Math.min.apply(null, elems);
        //     max = Math.max.apply(null, elems);
        //     range = max - min;
        //     stepsize = range/numbin;

        //     for (var i=0; i<numbin; i++) {
        //         ticks.push(_roundDigits(min+stepsize*(i+(1/2)), 2));
        //         counts[i] = 0;
        //     }
        //     elems.forEach(function(val) {
        //         var i = Math.floor((val - min)/stepsize);
        //         (val !== max) || (i--);
        //         counts[i]++;
        //     });
    };
});