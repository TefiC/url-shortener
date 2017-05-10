/*
 * Modules
 */

var express = require('express');
var urlValidator = require("url-validator");
var shortId = require("shortid");
var mongo = require("mongodb").MongoClient;


//Use an environment variable for mLab database URI
var dataURL = process.env.MONGOLAB_URI;


/*
 * App
 */
 
var app = express();

//Handle when user first arrives at the site
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
})

//Handle requests
app.get('/new/*', function(req, res){
	
	res.writeHead(200, {"content-type":"application/JSON"});
	
	var urlInput = req.params[0]; 
   
	//Check if the url is valid
	if (urlValidator(urlInput)) {
		
		//   Try to access the database and get the URL the user gave as input
		mongo.connect(dataURL, function(err, db) {
			
			if (err) throw err; 
	   
			var urlsCollection = db.collection('urls');
		   
			// Search for a long url the user gave as input
			urlsCollection.find({
			   
			  'long-url': { $eq: urlInput}
			   
			}).toArray(function(err, documents){
			   
				if (err) throw err;
				
				var id = shortId.generate();
				
				//If it found a match, close the database
				// extract the data from the first document found and return it as a JSON
				if (documents.length != 0) {
					
					// console.log('ALREADY IN DATABASE');
					
					db.close();
					
					var data = {
						"long-url": documents[0]["long-url"],
						"short-url": 'https://url-shortener-est.herokuapp.com/' + documents[0]["short-url"]
					}
					
					res.end(JSON.stringify(data));
					
				//Else, create a new document to store the shortened version url
				} else {
					
					//Create a document with the user's input and a shortened version of the url
					urlsCollection.insert({
						
					  "long-url": urlInput,
					  "short-url": id.toString()
						
					}, function(err, doc) {
						
						if (err) throw err;
						
						//Send the data just added to the client, close the database
						//and update the counter
						var data = {
							
							"long-url": urlInput,
							"short-url": 'https://url-shortener-est.herokuapp.com/' + id.toString() 
						
						}
						
						db.close();
						res.end(JSON.stringify(data));
						
					});
				}
			});
		});
		
	} else {
		
		var data = {
			"Error" : "Not a valid URL"
		}
		
		res.end(JSON.stringify(data));
	}
});

app.get('/:id', function(req, res) {
	
	//The input is a short url
	var input = req.params.id;
	
	mongo.connect(dataURL, function(err, db) {
		   
		if (err) throw err;
		   
		var urlsCollection = db.collection('urls');
		
		urlsCollection.find({
			
			"short-url": {$eq: input}
			
		}).toArray(function(err, documents){
			
		   if (err) throw err;
		   
		   //If it found matchess
		   if (documents.length>0) {
			   
			   var finalUrl = documents[0]["long-url"];
			   
			   res.redirect(finalUrl);
			   
		   } else {
			   
			   res.end('No URL matched in our database');
			   
		   }
		});
		
	});
		 
});

app.listen(process.env.PORT, function () {
	console.log('Example app listening on port!');
});