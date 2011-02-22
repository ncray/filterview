////////////////////////
// Local Data Example //
////////////////////////

require(["order!thirdparty/jquery-1.5.min.js", "order!jscliplot"],
        function (_, jscliplot) {
            $.get("data/three_cluster.json", function (foo) {
                var drawCLs = function (datapts) {
                    if (!datapts.length) return;
                    var yys = datapts.map(function(pt) {return pt.yy});
                    var xbar = (yys.reduce(function(prev, curr) {
                        return prev+curr;
                    })/(yys.length));
                    var std = Math.pow(yys.map(function(x) {return Math.pow(x-xbar, 2)}).reduce(function(prev, curr) {
                        return prev+curr;
                    })/(yys.length - 1), 0.5);
                    var xmin = this.xAxis._scale.min,
                    xmax = this.xAxis._scale.max,
                    lcl = xbar - 2*std,
                    ucl = xbar + 2*std;

                    [lcl, ucl].forEach(function(y) {
                        var ptone = this._getSVGCoords(xmin, y);
                        var pttwo = this._getSVGCoords(xmax, y);
                        this._wrapper.line(this._bg, ptone[0], ptone[1], pttwo[0], pttwo[1], {stroke: "red", strokeWidth: 2});
                    }, this);
                    // Now highlight the ones outside the bands
                    var svgpts = this._datapointCont.childNodes;
                    for (var i = 0; i < svgpts.length; i++) {
                        var yco = this._getPlotCoords(null, this._getValue(svgpts[i],"cy"));
                        if ((yco > ucl) || (yco < lcl)) {
                            svgpts[i].setAttribute("fill", "orange");
                        }
                    }
                };
                var fncalls = {
                    'plot(foo.xx)': [foo.xx],
                    'plot(foo.xx, foo.yy, {xlab:"Foo", ylab:"Bar"})': [foo.xx, foo.yy, {xlab:"Foo", ylab:"Bar"}],
                    'plot(foo.xx, foo.yy, {col: foo.col, ui:{checkbox:["col", "xx"]}})' : [foo.xx, foo.yy, {col:foo.col, ui:{checkbox:["col", "xx"]}}],
                    'plot(foo.xx, foo.yy, {col: foo.col, tt:foo.tt, ui:{dropdown:["tt", "xx"]}})' : [foo.xx, foo.yy, {col:foo.col, tt:foo.tt, ui:{dropdown:["tt", "xx"]}}],
                    'plot(foo.xx, foo.yy, {col: foo.col, rescale: true, ui:{regexp: "col"}})' : [foo.xx, foo.yy, {col: foo.col, rescale:true, ui:{regexp: "col"}}],
                    'plot(foo.xx, foo.yy, {col: foo.col, tt:foo.tt, ui:{slider:["tt", "yy", "col"]}})' : [foo.xx, foo.yy, {col: foo.col, tt:foo.tt, ui:{slider:["tt","yy","col"]}}],
                    'plot(foo.xx, foo.yy, {col:foo.col, ui:{autocomplete:"col"}})' : [foo.xx, foo.yy, {col:foo.col, ui:{autocomplete:"col"}}],
                    'plot(foo.xx, foo.yy, {col:foo.col, tt:foo.tt, ui:{checkbox:"tt", dropdown:"col"}})' : [foo.xx, foo.yy, {col:foo.col, tt:foo.tt, ui:{checkbox:"tt", dropdown:"col"}}],
                    'plot(foo.xx, foo.yy, {col:foo.col, tt:foo.tt, ui:{slider:"yy"}, cui:{checkbox:"col", dropdown:"tt"})' : [foo.xx, foo.yy, {col:foo.col, tt:foo.tt, ui:{slider:"yy"}, cui:{dropdown:"tt", checkbox:"col"}}],
                    'plot(foo.xx, foo.yy, {col:foo.col, tt:foo.tt, rescale:true, ui:{slider:"xx"}, cui:{slider:"yy"}})' : [foo.xx, foo.yy, {col:foo.col, rescale: true, ui:{slider:"xx"}, cui:{slider:"yy"}}],
                    'plot(foo.yy, {col: foo.col, type:"o", postFns:[drawCLs], ui:{checkbox:"col"}})' : [foo.yy, {col:foo.col, type:"o", postFns: [drawCLs], ui:{checkbox:"col"}}],
                };

                var svgtmpl = '<div id="${id}" class="right_half"></div>';
                var uitmpl  = '<div id="${id}" class="left_half"></div>';
                var uihead = '<div class="command"><h2>#${i} Command: ${cmd}</h2></div>';
                var cont = ".container";
                var i = 1;

                for (var cmd in fncalls) {
                    var pslave = "#plotslave"+i;
                    var uislave = "#uislave"+i;
                    $.tmpl(uitmpl, {id:uislave.substr(1)}).appendTo(cont);
                    $.tmpl(svgtmpl, {id:pslave.substr(1)}).appendTo(cont);
                    $.tmpl(uihead, {cmd: cmd, i:i}).appendTo(uislave);
                    $(pslave).css('height', $(pslave).css('width'));

                    jscliplot.createSVGPlot(pslave, uislave);
                    jscliplot.plot.apply(jscliplot, fncalls[cmd]);
                    $('<div class="clear"></div>').appendTo(cont);
                    i++;
                }

            });
        });