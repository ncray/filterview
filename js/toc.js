$(document).ready(function() {
    // The html is dynamically added on page load
    var toc_html = '<div id="toc"><h2><a href="index.html">FilterView Docs</a></h2><ul><li class="chapter"><a href="syntax.html">Syntax</a></li><li class="chapter menu"><a href="#">Examples with Data</a><ul class="dropdown"><li><a href="ajaxexample.html">Locally Stored</a></li><li><a href="jsonpexample.html">Via JSONP</a></li><li><a href="mongoexample.html">Using Node.js and MongoDB</a></li></ul></li><li class="chapter">Source</li></ul></div>';
    $(toc_html).prependTo("body");

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
});