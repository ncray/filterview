require(["order!thirdparty/js/jquery-1.4.4.min.js",
         "order!js/toc.js",
         "order!data/clusters.js",
         "order!jscliplot"], function (_, _, foo, jscliplot) {
             $(".jsoncode").text("var foo = {");
             for(var key in foo) {
                 var next = [$(".jsoncode").text(),"\n","    ",key,": ", JSON.stringify(foo[key]),","].join("");
                 $(".jsoncode").text(next);
             }
             $(".jsoncode").text($(".jsoncode").text()+"\n};");

             var foo_string = "var foo = "+JSON.stringify(foo);


             var svgslave = "#svgdiv", uislave = "#uidiv";
             $(uislave).css({width: "80%",
                             float: "left",
                             left: "10%"});
             $(svgslave).css({width: "80%",
                              float: "left",
                              left: "10%"})
                 .css("height", $(svgslave).css("width"));
             jscliplot.createSVGPlot(svgslave, uislave);
             jscliplot.plot(foo.xx, foo.yy, {col:foo.col, group: foo.tt, ui:{checkbox:"col", slider:"group"}});
         });
