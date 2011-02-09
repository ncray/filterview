$(document).ready(function() {
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