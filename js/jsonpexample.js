require(["order!thirdparty/js/jquery-1.4.4.min.js",
         "order!js/toc.js",
         "order!jscliplot"], function (_, _, jscliplot) {
             function RemoteData(url, callback) {
                 this.url = url;
                 this.callback = callback;
             };
             var bieber = {
                 xx: new RemoteData("http://search.twitter.com/search.json?q=bieber&rpp=100", function (tweets) {
                     return tweets.results.map(function(tweet) {
                         return (tweet.text.split(' ').filter(function(xx) {return (xx.length > 0)}).length || 0);
                     });
                 }),
                 yy: new RemoteData("http://search.twitter.com/search.json?q=bieber&rpp=100", function (tweets) {
                     return tweets.results.map(function(tweet) {
                         return ((tweet.text.split('!').length - 1) || 0);
                     });
                 }),
                 lan: new RemoteData("http://search.twitter.com/search.json?q=bieber&rpp=100", function (tweets) {
                     return tweets.results.map(function(tweet) {
                         return (tweet.iso_language_code || "unknown");
                     });
                 }),
                 text: new RemoteData("http://search.twitter.com/search.json?q=bieber&rpp=100", function (tweets) {
                     return tweets.results.map(function(tweet) {
                         return tweet.text;
                     });
                 }),
             };
             $("#svgslave").css("height", $("#svgslave").css("width"));
             jscliplot.createSVGPlot("#svgslave", "#uislave");
             jscliplot.template('<div class="tweet"><p>Tweet:${text}</p><p>Words: ${xx}<br/>Exclaimations: ${yy}</p></div>');
             jscliplot.plot(bieber.xx, bieber.yy, {lan: bieber.lan, text: bieber.text, xlab: "Words", ylab:"Num !'s", ui:{dropdown:"lan"}});
         });