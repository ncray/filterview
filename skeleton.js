require(["order!thirdparty/jquery-1.5.min.js", "order!jscliplot"],
        function (_, jscliplot) {
            var foo = 
		JSONOBJECT
	    ;
            var fncalls = {
                FUNCTIONCALLS
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
