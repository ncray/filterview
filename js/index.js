require(["order!thirdparty/js/jquery-1.4.4.min.js",
         "order!data/iris.js",
         "order!jscliplot"], function (_, iris, jscliplot) {
             $(".menu").click(function(e) {
                 var drop = $(this).children(".dropdown");
                 var wasBlock = (drop.css("display") == "block");
                 $(".dropdown").css("display", "none");
                 wasBlock || drop.css("display", "block");
                 e.preventDefault();
             });

             /* Actually make the svg plot */
             var svgslave = "#svgcont";
             var uislave  = "#uicont";
             $(svgslave).css("height", $(svgslave).css("width"));
             jscliplot.createSVGPlot(svgslave, uislave);
             jscliplot.plot(iris.petal_width, iris.sepal_width, {col:iris.color, ui:{checkbox:"col", slider:"yy"}});
         });