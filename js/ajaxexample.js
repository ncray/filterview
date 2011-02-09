require(["order!thirdparty/js/jquery-1.4.4.min.js",
         "order!data/clusters.js",
         "order!jscliplot"], function (_, foo, jscliplot) {
             var fncalls = [
                 ["<p>If you only supply one parameter, just like in R, it makes this the value for y and makes the x coordinates simply the sequence of natural numbers.</p>",
                  "plot(foo.xx)",
                  [foo.xx]],
                 ["<p>When supplying two arguments, the plot behaves as expected. Note the x and y coordinates are internally labelled 'xx' and 'yy.'</p>",
                  "plot(foo.xx, foo.yy)",
                  [foo.xx, foo.yy]],
                 ["<p>The argument 'col' is hardcoded to stand for the color of a datapoint. It can be either the name of a color (e.g. red) or the rgb code.</p><p>By passing in an array with the same size as the xx and yy array, the data will be bundled pointwise with all points.",
                  "plot(foo.xx, foo.yy, &#123col:foo.col&#125)",
                  [foo.xx, foo.yy, {col:foo.col}]],
                 ["<p>To declare a UI element, you just use the type of the UI and attribute you want to index on. Here 'tt' is just a randomly chosen integer from 1,2, or 3. Notice that to declare the slider for tt, we use the name we assign it in the function call.</p>",
                  'plot(foo.xx, foo.yy, &#123col:foo.col, bar:foo.tt, ui:&#123slider: "bar"&#125&#125)',
                  [foo.xx, foo.yy, {col:foo.col, bar:foo.tt, ui:{slider:"bar"}}]],
                 ["<p>Mixing UI elements is easy. If they are different types, simply include them all inthe ui object. If they are the same type, then place them in an array, as in this example. Notice if you specify a slider for a continuous variable, then it automatically assumes you want the range of that attribute.</p>",
                  'plot(foo.xx, foo.yy, &#123col:foo.col, ui:&#123slider: ["xx","yy"]&#125&#125)',
                  [foo.xx, foo.yy, {col:foo.col, ui:{slider:["xx", "yy"]}}]],
                 ["<p>Sometimes its preferrable to have the axis automatically rescale when an UI change is made. This can be done by including the rescale argument in the options.</p>",
                  'plot(foo.xx, foo.yy, &#123col:foo.col, rescale: true, ui:&#123regexp: "col"&#125&#125)',
                  [foo.xx, foo.yy, {col:foo.col, rescale: true, ui:{regexp:"col"}}]],
                 ["<p>Finally, sometimes we might want the domain of possibilities that a UI element can be to change with the selections made by the other UI elements. For example, if we adjust the range of permissible datapoints so that no red points are shown any longer, we may want our color selector to stop including that as a possible choice. This can all be accomplished by making it a child UI. This is done by including it in the cui object, as shown to the right.</p>",
                  'plot(foo.xx, foo.yy, &#123col:foo.col, ui:&#123slider: "xx"&#125, cui:&#123autocomplete: "col"&#125 &#125)',
                  [foo.xx, foo.yy, {col:foo.col, ui:{slider:"xx"}, cui:{autocomplete:"col"}}]],
             ];

             var foo_string = "var foo = "+JSON.stringify(foo);
             $(".jsoncode").text(foo_string);
             var svgtmpl = '<div id="${id}" class="right_third"></div>',
                 uitmpl  = '<div id="${id}" class="mid_third"></div>',
                 doctmpl = '<div id="${id}" class="left_third"></div>',
                 cmdtmpl = '<div class="command"><p><b>Command: ${cmd}</b></p></div>',
                 cont = "#container";

             fncalls.forEach(function(fnset, i) {
                 var svgslave = "#svgcont"+i,
                     docslave = "#docslave"+i,
                     uislave  = "#uicont"+i;

                 $.tmpl(doctmpl, {id:docslave.substr(1)}).appendTo(cont);
                 $.tmpl(uitmpl, {id:uislave.substr(1)}).appendTo(cont);
                 $.tmpl(svgtmpl, {id:svgslave.substr(1)}).appendTo(cont);
                 $.tmpl(cmdtmpl, {cmd:fnset[1]}).appendTo(uislave);
                 $(fnset[0]).appendTo(docslave);
                 $(svgslave).css("height", $(svgslave).css("width"));
                 jscliplot.createSVGPlot(svgslave, uislave);
                 jscliplot.plot.apply(jscliplot, fnset[2]);
                 $('<div class="clear" />').appendTo(cont);
             });
         });
