require(["order!thirdparty/js/jquery-1.4.4.min.js",
         "order!data/iris.js",
         "order!jscliplot"], function (_, iris, jscliplot) {
            /* Set up menu buttons */
             $(".examples").click(function(e) {
                 var wasBlock = ($(this).children(":first").css("display") == "block");
                 $(".listitems").css("display", "none");
                 wasBlock || $(this).children(":first").css("display", "block");
             });

             /* Actually make the svg plot */
             var svgslave = "#svgcont";
             var uislave  = "#uicont";
             $(svgslave).css("height", $(svgslave).css("width"));
             jscliplot.createSVGPlot(svgslave, uislave);
             jscliplot.plot(iris.petal_width, iris.sepal_width, {col:iris.color, ui:{checkbox:"col", slider:"yy"}});
         });