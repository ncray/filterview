require(["order!thirdparty/js/jquery-1.4.4.min.js",
         "order!jscliplot"], function (_, jscliplot) {
             function RemoteData(url, callback) {
                 this.url = url;
                 this.callback = callback;
             };
             var bieber = {
                 xx: new RemoteData("http://search.twitter.com/search.json?q=bieber&rpp=100", function (tweets) {
                     return tweets.results.map(function(tweet) {
                         return tweet.text.split(' ').filter(function(xx) {return (xx.length > 0)}).length;
                     });
                 }),
                 yy: new RemoteData("http://search.twitter.com/search.json?q=bieber&rpp=100", function (tweets) {
                     return tweets.results.map(function(tweet) {
                         return (tweet.text.split('!').length - 1);
                     });
                 }),
                 lan: new RemoteData("http://search.twitter.com/search.json?q=bieber&rpp=100", function (tweets) {
                     return tweets.results.map(function(tweet) {
                         return tweet.iso_language_code;
                     });
                 }),
                 letter: new RemoteData("http://search.twitter.com/search.json?q=bieber&rpp=100", function (tweets) {
                     return tweets.results.map(function(tweet) {
                         return tweet.text[0].toLowerCase();
                     });
                 }),
             };
             $(".right").css("height", $(".right").css("width"));
             jscliplot.createSVGPlot("#svgslave", "#uislave");
             jscliplot.plot(bieber.xx, bieber.yy, {lan: bieber.lan, letter: bieber.letter, xlab: "Words", ylab:"Num !", ui:{checkbox:"lan"}});
         });