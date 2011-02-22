require(["order!thirdparty/js/jquery-1.4.4.min.js",
         "order!js/toc.js",
         "order!data/clusters.js",
         "order!jscliplot"], function (_, _, foo, jscliplot) {
             var exmpl = '<div id="${contid}" class="right_half"><div id="${svgid}" /><div id="${uiid}"/></div>';

             // Definition of post function for postFn example
             var drawCLs = function (datapts) {
                 if (!datapts.length) return;
                 var yys = datapts.map(function(pt) {return pt.yy});
                 var ybar = (yys.reduce(function(prev, curr) {
                     return prev+curr;
                 })/(yys.length));
                 var std = Math.pow(yys.map(function(y) {return Math.pow(y-ybar, 2)}).reduce(function(prev, curr) {
                     return prev+curr;
                 })/(yys.length - 1), 0.5);
                 var xmin = this.xAxis._scale.min,
                 xmax = this.xAxis._scale.max,
                 lcl = ybar - 2*std,
                 ucl = ybar + 2*std;

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
             var plotfncalls = [
                 ["plot", foo.xx],
                 ["plot", foo.xx, foo.yy],
                 ["plot", foo.xx, foo.yy, {col:foo.col}],
                 ["plot", foo.xx, foo.yy, {col:foo.col, bar:foo.tt, ui:{slider:"bar"}}],
                 ["plot", foo.xx, foo.yy, {col:foo.col, tt:foo.tt, ui:{checkbox:"tt", autocomplete:"col"}}],
                 ["plot", foo.xx, foo.yy, {col:foo.col, ui:{slider:["xx","yy"]}}],
                 ["plot", foo.xx, foo.yy, {col:foo.col, rescale:true, ui:{regexp:"col"}}],
                 ["plot", foo.xx, foo.yy, {col:foo.col, ui:{slider:"xx"}, cui:{checkbox:"col"}}],
                 ["plot", foo.yy, {col:foo.col, type:"o", postFns:[drawCLs], ui: {checkbox: "col"}}],
                 ["hist", foo.xx, {tt:foo.tt, yy:foo.yy, rescale: true, ui:{checkbox:"tt", slider:"yy"}}],
             ];
             $(".show").click(function(e) {
                 var wasEmpty = ($(this).children(":first-child").text() == "Show");
                 var num = $(this).attr("num");
                 var cmd = plotfncalls[num][0];
                 var ids = {
                     contid: "cont"+num,
                     svgid: "svg"+num,
                     uiid: "ui"+num,
                 };
                 if (wasEmpty) {
                     $(this).children(":first-child").text("Hide");
                     $(this).parent().addClass("left_half")
                                     .after('<div class="clear"/>');
                     $.tmpl(exmpl, ids).insertAfter($(this).parent());
                     $("#"+ids.svgid).css("height", $("#"+ids.svgid).css("width"));
                     jscliplot.createSVGPlot("#"+ids.svgid, "#"+ids.uiid);
                     jscliplot[cmd].apply(jscliplot, plotfncalls[num].slice(1));
                 } else {
                     $(this).children(":first-child").text("Show");
                     $('#'+ids.svgid).svg("destroy");
                     $("#"+ids.contid).remove();
                     $(this).parent().removeClass("left_half")
                            .next(".clear").remove();
                 }
                 e.preventDefault();
             });
         });