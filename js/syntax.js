require(["order!thirdparty/js/jquery-1.4.4.min.js",
         "order!data/clusters.js",
         "order!jscliplot"], function (_, foo, jscliplot) {
             // Code that enables toc navigation
             var dropClicked = false;
             $(".menu").click(function(e) {
                 var drop = $(this).children(".dropdown");
                 var wasBlock = (drop.css("display") == "block");
                 $(".dropdown").css("display", "none");
                 wasBlock || drop.css("display", "block");
                 return dropClicked;
             });
             $(".dropdown a").click(function(e) {
                 dropClicked = true;
             });

             var exmpl = '<div id="${contid}" class="right_half"><div id="${svgid}" /><div id="${uiid}"/></div>';
             var fncalls = [
                 [foo.xx],
                 [foo.xx, foo.yy],
                 [foo.xx, foo.yy, {col:foo.col}],
                 [foo.xx, foo.yy, {col:foo.col, bar:foo.tt, ui:{slider:"bar"}}],
                 [foo.xx, foo.yy, {col:foo.col, tt:foo.tt, ui:{checkbox:"tt", autocomplete:"col"}}],
                 [foo.xx, foo.yy, {col:foo.col, ui:{slider:["xx","yy"]}}],
                 [foo.xx, foo.yy, {col:foo.col, rescale:true, ui:{regexp:"col"}}],
                 [foo.xx, foo.yy, {col:foo.col, ui:{slider:"xx"}, cui:{checkbox:"col"}}]
             ];
             $(".show").click(function() {
                 var wasEmpty = ($(this).text() == "Show");
                 var num = $(this).attr("num");
                 var ids = {
                     contid: "cont"+num,
                     svgid: "svg"+num,
                     uiid: "ui"+num,
                 };
                 if (wasEmpty) {
                     $(this).text("Hide");
                     $(this).parent().addClass("left_half")
                                     .after('<div class="clear"/>');
                     $.tmpl(exmpl, ids).insertAfter($(this).parent());
                     $("#"+ids.svgid).css("height", $("#"+ids.svgid).css("width"));
                     jscliplot.createSVGPlot("#"+ids.svgid, "#"+ids.uiid);
                     jscliplot.plot.apply(jscliplot, fncalls[num]);
                 } else {
                     $(this).text("Show");
                     $('#'+ids.svgid).svg("destroy");
                     $("#"+ids.contid).remove();
                     $(this).parent().removeClass("left_half")
                            .next(".clear").remove();
                 }
             });
         });