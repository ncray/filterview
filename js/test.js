// This is the js loader script. It will load the bare minimum of
// scripts that need to be present for the jscli to run without
// any packages.
//
// It is invoked by the require script tag in the index.html

require(["order!thirdparty/js/jquery-1.4.4.min.js",
         "order!jscliplot"],
         function (_, jscliplot) {
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
             var fncalls = {
                 'plot(foo.xx)': [foo.xx],
                 'plot(foo.xx, foo.yy)': [foo.xx, foo.yy],
                 'plot(foo.xx, foo.yy, {col: foo.col})': [foo.xx, foo.yy, {col: foo.col}],
                 'plot(foo.xx, foo.yy, {col: foo.col, ui:{checkbox:"col"}})' : [foo.xx, foo.yy, {col:foo.col, ui:{checkbox:"col"}}],
                 'plot(foo.xx, foo.yy, {col: foo.col, tt:foo.tt, ui:{slider:["tt", "yy"]}})' : [foo.xx, foo.yy, {col: foo.col, tt:foo.tt, ui:{slider:["tt","yy"]}}],
                 'plot(foo.xx, foo.yy, {col: foo.col, ui:{dropdown: "col"}})' : [foo.xx, foo.yy, {col: foo.col, ui:{dropdown: "col"}}],
                 'plot(foo.xx, foo.yy, {col: foo.col, ui:{autocomplete: "col"}})' : [foo.xx, foo.yy, {col: foo.col, ui:{autocomplete: "col"}}],
                 'plot(foo.xx, foo.yy, {col: foo.col, ui:{regexp: "col"}})' : [foo.xx, foo.yy, {col: foo.col, ui:{regexp: "col"}}],
                 'plot(foo.xx, foo.yy, {col:foo.col, tt:foo.tt, ui:{checkbox:"col",slider:"tt"}})' : [foo.xx, foo.yy, {col:foo.col, tt:foo.tt, ui:{checkbox:"col",slider:"tt"}}],
                 'plot(foo.xx, foo.yy, {col: foo.col, tt:foo.tt, ui:{slider:"xx"}, cui:{autocomplete:"col"}})' : [foo.xx, foo.yy, {col: foo.col, tt:foo.tt, ui:{slider:"xx"}, cui:{autocomplete:"col"}}],
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
//                });
         });