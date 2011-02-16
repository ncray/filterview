////////////////////////////////
// Another Local Data Example //
////////////////////////////////

require(["order!thirdparty/jquery-1.5.min.js", "order!jscliplot"],
        function (_, jscliplot) {
            $.get("data/fake_genome.json", function (foo) {
                var fncalls = {
                    'plot(foo.pos, foo.coverage, {gene: foo.gene, exon: foo.exon, ui:{slider: "exon", autocomplete: "gene"}})' : [foo.pos, foo.coverage, {gene: foo.gene, exon: foo.exon, ui:{autocomplete: "gene", slider: "exon"}}],
                    'plot(foo.pos, foo.coverage, {rescale: true, gene: foo.gene, exon: foo.exon, ui:{slider: "exon", autocomplete: "gene"}})' : [foo.pos, foo.coverage, {rescale: true, gene: foo.gene, exon: foo.exon, ui:{autocomplete: "gene", slider: "exon"}}],
                    'plot(foo.pos, foo.coverage, {rescale: true, gene: foo.gene, exon: foo.exon, ui:{autocomplete: "gene"}, cui: {slider: "exon"}})' : [foo.pos, foo.coverage, {rescale: true, gene: foo.gene, exon: foo.exon, ui:{autocomplete: "gene"}, cui: {slider: "exon"}}],
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