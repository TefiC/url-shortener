/*
 * Modules
 */

var express = require('express');
var urlValidator = require("url-validator");
var shortId = require("shortid");
var mongo = require("mongodb").MongoClient;

// var dataURL = 'mongodb://localhost:27017/url-shortener'; 

//Define an environment variable for mLab database URI
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
			
			//Reset the collection for debugging           
			// urlsCollection.remove({});
			// res.send('Removed');
		   
			// Search for a long url the user gave as input
			urlsCollection.find({
			   
			  'long-url': { $eq: urlInput}
			   
			}).toArray(function(err, documents){
			   
				if (err) throw err;
				
				var id = shortId.generate();
				
				// console.log('FOUND this', documents);
				
				//If it found a match, close the database
				// extract the data from the first document found and return it as a JSON
				if (documents.length != 0) {
					
					console.log('ALREADY IN DATABASE');
					
					db.close();
					
					var data = {
						"long-url": documents[0]["long-url"],
						"short-url": documents[0]["short-url"]
					}
					
					res.end(JSON.stringify(data));
					
				//Else, create a new document to store the shortened version url
				} else {
					
					// console.log('No match, creating document');
					
					//Create a document with the user's input and a shortened version of the url
					urlsCollection.insert({
						
					  "long-url": urlInput,
					  "short-url": 'https://www.shorturl/' + id.toString()
						
					}, function(err, doc){
						
						if (err) throw err;
						
						// console.log('NEW DOCUMENT INSERTED');
						
						// console.log(doc);
						
						//Send the data just added to the client, close the database
						//and update the counter
						var data = {
							
							"long-url": urlInput,
							"short-url": 'https://www.shorturl/' + id.toString() 
						
						}
						
						db.close();
						res.end(JSON.stringify(data));
						
					});
				}
			});
		});
		
	} else {
		
		var data = {
			"Error": "Not a valid URL"
		}
		
		res.end(JSON.stringify(data));
		
	}
});

app.get('/*', function(req, res) {
	var input = req.params[0];
	
	
// 	console.log('INPUT AND SLICE', input, input.slice(0, 21));
// 	console.log(input.slice(0, 21) == 'https://www.shorturl/');
	
	
	//Determine if it's a short or long URL. 
	
	//If it's short, search its corresponding long url in the database
	if (input.slice(0, 21) == 'https://www.shorturl/') {
		   
		mongo.connect(dataURL, function(err, db) {
			
		  //  console.log('SHORT');
			   
			if (err) throw err;
			   
			var urlsCollection = db.collection('urls');
			
			urlsCollection.find({
				
				"short-url": {$eq: input}
				
			}).toArray(function(err, documents){
				
			   if (err) throw err;
			   
			 //  console.log('DOCUMENTS FOUND', documents.length);
			   
			   if (documents.length>0) {
				   
				   var finalUrl = documents[0]["long-url"];
				   
				  //console.log(finalUrl);
				   
				   res.redirect(finalUrl);
				   
			   } else {
				   
				   res.end('No URL matched in our database');
				   
			   }
			});
			
		});
		   
		   
	//Else, if it's long, redirect directly
	} else {
		
	   // console.log('LONG');
		   
		res.redirect(input);
		   
	}
	  
});

app.listen(process.env.PORT, function () {
	console.log('Example app listening on port!');
});