require(["order!thirdparty/jquery-1.5.min.js",
         "order!js/toc.js",
         "order!jscliplot"], function (_, _, jscliplot) {
             var colors = ["red", "blue", "pink", "orange", "yellow", "purple", "green", "black"];
             var lan2col = {};
             var lans = 0;
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
                 user: new RemoteData("http://search.twitter.com/search.json?q=bieber&rpp=100", function (tweets) {
                     return tweets.results.map(function(tweet) {
                         return tweet.from_user;
                     });
                 }),
                 col: new RemoteData("http://search.twitter.com/search.json?q=bieber&rpp=100", function (tweets) {
                     return tweets.results.map(function(tweet) {
                         var lan = tweet.iso_language_code;
                         if (!(lan in lan2col)) {
                             lan2col[lan] = (lans++);
                         }
                         return colors[(lan2col[lan] % colors.length)];
                     });
                 }),
             };
             $("#svgslave").css("height", $("#svgslave").css("width"));
             jscliplot.createSVGPlot("#svgslave", "#uislave");
             jscliplot.template('<div class="tweet"><p><b>User:</b> ${user}</p><p><b>Tweet:</b> ${text}</p><p>Words: ${xx}<br/>Exclaimations: ${yy}</p></div>');
             jscliplot.plot(bieber.xx, bieber.yy, {lan: bieber.lan, text: bieber.text, user:bieber.user, col:bieber.col, xlab: "Words", ylab:"Num !'s", ui:{dropdown:"lan"}});
         });