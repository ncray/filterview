// This is the js loader script. It will load the bare minimum of
// scripts that need to be present for the jscli to run without
// any packages.
//
// It is invoked by the require script tag in the index.html

require(["order!thirdparty/jquery-1.5.min.js", "order!jscliplot"],
        function (_, jscliplot) {
             ////////////////////////
             // Local Data Example //
             ////////////////////////
             // Uncomment code below to test, but make sure to:
             // (1) Comment out all code from other data sources
             // (2) Uncomment trailing }) at bottom of page

             // $.get("data/three_cluster.json", function (foo) {
             //     var fncalls = {
             //         'plot(foo.xx)': [foo.xx],
             //         'plot(foo.xx, foo.yy)': [foo.xx, foo.yy],
             //         'plot(foo.xx, foo.yy, {col: foo.col})': [foo.xx, foo.yy, {col: foo.col}],
             //         'plot(foo.xx, foo.yy, {col: foo.col, ui:{checkbox:"col"}})' : [foo.xx, foo.yy, {col:foo.col, ui:{checkbox:"col"}}],
             //         'plot(foo.xx, foo.yy, {col: foo.col, tt:foo.tt, ui:{slider:["tt", "yy"]}})' : [foo.xx, foo.yy, {col: foo.col, tt:foo.tt, ui:{slider:["tt","yy"]}}],
             //         'plot(foo.xx, foo.yy, {col: foo.col, ui:{dropdown: "col"}})' : [foo.xx, foo.yy, {col: foo.col, ui:{dropdown: "col"}}],
             //         'plot(foo.xx, foo.yy, {col: foo.col, ui:{autocomplete: "col"}})' : [foo.xx, foo.yy, {col: foo.col, ui:{autocomplete: "col"}}],
             //         'plot(foo.xx, foo.yy, {col: foo.col, ui:{regexp: "col"}})' : [foo.xx, foo.yy, {col: foo.col, ui:{regexp: "col"}}],
             //         'plot(foo.xx, foo.yy, {col:foo.col, tt:foo.tt, ui:{checkbox:"col",slider:"tt"}})' : [foo.xx, foo.yy, {col:foo.col, tt:foo.tt, ui:{checkbox:"col",slider:"tt"}}],
             //     };

              ////////////////////////
              // Another Local Data //
              ////////////////////////
              // Follow the same instructions up above to
              // try out this data example. This illustrates
              // the power of child ui elements and the rescale flag

             // $.get("data/fake_genome.json", function (foo) {
             //     var fncalls = {
             //         'plot(foo.pos, foo.coverage, {gene: foo.gene, exon: foo.exon, ui:{slider: "exon", autocomplete: "gene"}})' : [foo.pos, foo.coverage, {gene: foo.gene, exon: foo.exon, ui:{autocomplete: "gene", slider: "exon"}}],
             //         'plot(foo.pos, foo.coverage, {rescale: true, gene: foo.gene, exon: foo.exon, ui:{slider: "exon", autocomplete: "gene"}})' : [foo.pos, foo.coverage, {rescale: true, gene: foo.gene, exon: foo.exon, ui:{autocomplete: "gene", slider: "exon"}}],
             //         'plot(foo.pos, foo.coverage, {rescale: true, gene: foo.gene, exon: foo.exon, ui:{autocomplete: "gene"}, cui: {slider: "exon"}})' : [foo.pos, foo.coverage, {rescale: true, gene: foo.gene, exon: foo.exon, ui:{autocomplete: "gene"}, cui: {slider: "exon"}}],
             //     };

             ////////////////////
             // Remote Example //
             ////////////////////

             function RemoteData (db, remote_attr) {
                 this.db = db;
                 this.remote_attr = remote_attr;
             };
             var foo = {
                 xx: new RemoteData("three_cluster", "xx"),
                 yy: new RemoteData("three_cluster", "yy"),
                 tt: new RemoteData("three_cluster", "tt"),
                 col: new RemoteData("three_cluster", "col"),
             };
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
                 'plot(foo.xx, foo.yy)': [foo.xx, foo.yy],
                 'plot(foo.xx, foo.yy, {col: foo.col})': [foo.xx, foo.yy, {col: foo.col}],
                 'plot(foo.xx, foo.yy, {col: foo.col, ui:{checkbox:"col"}})' : [foo.xx, foo.yy, {col:foo.col, ui:{checkbox:"col"}}],
                 'plot(foo.yy, {col: foo.col, type:"o", ui:{checkbox:"col"}})' : [foo.yy, {col:foo.col, type:"o", ui:{checkbox:"col"}}],
                 'plot(foo.xx, foo.yy, {col: foo.col, tt:foo.tt, ui:{slider:["tt", "yy"]}})' : [foo.xx, foo.yy, {col: foo.col, tt:foo.tt, ui:{slider:["tt","yy"]}}],
                 'plot(foo.xx, foo.yy, {col: foo.col, ui:{dropdown: "col"}})' : [foo.xx, foo.yy, {col: foo.col, ui:{dropdown: "col"}}],
                 'plot(foo.xx, foo.yy, {col: foo.col, ui:{autocomplete: "col"}})' : [foo.xx, foo.yy, {col: foo.col, ui:{autocomplete: "col"}}],
                 'plot(foo.xx, foo.yy, {col: foo.col, tt:foo.tt, ui:{slider: "yy"}, cui:{checkbox:["tt","col"]}})' : [foo.xx, foo.yy, {col: foo.col, tt:foo.tt, ui:{slider: "yy"}, cui:{checkbox:["tt","col"]}}],
                 'plot(foo.xx, foo.yy, {col: foo.col, rescale: true, ui:{regexp: "col"}})' : [foo.xx, foo.yy, {col: foo.col, rescale: true, ui:{regexp: "col"}}],
                 'plot(foo.xx, foo.yy, {col:foo.col, tt:foo.tt, ui:{checkbox:"col",slider:"tt"}})' : [foo.xx, foo.yy, {col:foo.col, tt:foo.tt, ui:{checkbox:"col",slider:"tt"}}],
                 'plot(foo.xx, foo.yy, {col: foo.col, tt:foo.tt, ui:{slider:"xx"}, cui:{autocomplete:"col"}})' : [foo.xx, foo.yy, {col: foo.col, tt:foo.tt, ui:{slider:"xx"}, cui:{autocomplete:"col"}}],
                 'plot(foo.yy, {col: foo.col, type:"o", postFns:[drawCLs], ui:{checkbox:"col"}})' : [foo.yy, {col:foo.col, type:"o", postFns: [drawCLs], ui:{checkbox:"col"}}],
             };

             //////////////////////////////////
             // Always leave for page layout //
             //////////////////////////////////
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
// This final }) might need to be included
// or excluded depending on if you are doing an
// AJAX call or not (if you are you need it).
//         });