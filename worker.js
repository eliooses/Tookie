var apiKeyTMDB     = 'dc4940972c268b026150cf7be6f01d11';
exports.cacheDirectory = './cache/data';
exports.cacheLogDir = './cache/logs.txt';

var cacheDirectory = '/cache/data';
var cacheLogDir = '/cache/logs.txt';

var request = require('request')
  , helpers = require('./helpers.js')
  , async   = require('async')
  , tmdb = require('tmdb').init({apikey: apiKeyTMDB})
  , fs = require('fs');

var torrentz = "http://torrentz.eu";

var urls = [
    "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20html%20where%20url%3D%22http%3A%2F%2Ftorrentz.eu%2Fsearch%3Ff%3D%22%20and%20xpath%3D%22%2Fhtml%2Fbody%2Fdiv%5B%40class%3D'results'%5D%2Fdl%22&format=json",
    "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20html%20where%20url%3D%22http%3A%2F%2Ftorrentz.eu%2Fsearch%3Ff%3D%26p%3D1%22%20and%20xpath%3D%22%2Fhtml%2Fbody%2Fdiv%5B%40class%3D'results'%5D%2Fdl%22&format=json"
];

var queryIMDB = function(title, description, callback){
    if (description.indexOf('movies') !== -1)
    {
        request(imdbAPI + title + "&r=json&y=2012", function(error, response, body){
            var imdb = JSON.parse(body);

            callback(imdb.Poster);
        });
    }
}

exports.fetchData = function(){

    async.waterfall(
    [
        // i. Get all movies
        function(callback) {
            var array = [];

            async.forEach(urls, function(url, callback){
                request(url, function(error, response, body){
                    if (!error && response.statusCode == 200) 
                    {
                        for (var i = 0; i < 60; i++) 
                        {
                            try
                            {
                                var data = JSON.parse(body);
                                var url = torrentz + data.query.results.dl[i].dt.a.href;
                                var title = helpers.sanitizeTitle(data.query.results.dl[i].dt.a.content);
                                var description = data.query.results.dl[i].dt.content;
                                
                                var element = {url: url, title: title, description: description};

                                array.pushIfNotExist(element, function(e) { 
                                    return e.title.toLowerCase() === element.title.toLowerCase(); 
                                });
                            }
                            catch(err)
                            {
                                //console.log("error: " + err);
                            }
                        }

                        callback();
                    }
                    else
                    {
                        callback();
                    }
                });
            }, function(err){
                callback(null, array);
            });
        
        },
        
        // ii. Get posters from IMDB
        function(array, callback) {
            var array2 = [];
            async.forEach(array, function (movie, callback){ 
                
                if (movie.description.indexOf('movies') !== -1)
                {
                    tmdb.Movie.search({query: movie.title}, function(err,result) {
                        var poster = "";

                        try
                        {
                            if (result[0].posters.length >= 3)
                                poster = result[0].posters[3].image.url;
                            else
                                poster = result[0].posters[result[0].posters.length - 1].image.url;

                            var element = {url: movie.url, title: result[0].name, description: result[0].overview, poster: poster, rating: result[0].rating};

                            array2.push(element);
                        }
                        catch(err)
                        {
                            poster = "";
                        }

                        callback();
                    });
                }
                else
                    callback();

            }, function(err) {
                callback(null, array2);
            }); 
        }
    ],
        // the bonus final callback function
        function(err, status) {
            fs.writeFile(__dirname + cacheDirectory, JSON.stringify(status), function(err) {
                if(err) {
                    console.log(err);
                } else 
                {
                    fs.open(__dirname + cacheLogDir, 'a', 666, function( e, id ) {
                        fs.write( id, 'created new cache file at: ' + new Date() + '\n', null, 'utf8', function(){
                            fs.close(id, function(){
                                console.log("Cache file updated !");
                            });
                        });
                    });
                }
            }); 
        }
    );
}