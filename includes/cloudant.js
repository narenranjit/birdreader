  var config = require("./config.js").get;
  
  // calculate the urlstub
  var urlstub = config.cloudant.server.replace("//","//"+config.cloudant.username+":"+config.cloudant.password+"@") + ":"+config.cloudant.port;
  
  // start up the nano driver
  var nano = require('nano')(urlstub);
  
  // connections to databases                               
  var feeds = nano.db.use('feeds');
  var articles = nano.db.use('articles');
  
  // async library
  var async = require('async');
  
  // create the feeds database
  var createFeeds = function(callback) {
    console.log("Checking feeds database");
    // create some databases
    nano.db.create('feeds',function(err,body) {
      callback()
    });
  }
  
  // create the articles database
  var createArticles = function(callback) {
    console.log("Checking articles database");
    // create some databases
    nano.db.create('articles',function(err,body) {
      callback()
    });
  }
  
  // check to see if view "id" has contains "content"; if not replace it
  var checkView = function(id, content, callback) {
    
    // fetch the view
    articles.get(id,function(err,data) {
      
      // if there's no existing data
      if(!data) {
        data= {};
        var rev=null;
      } else {
        var rev = data._rev;
        delete data._rev;
      }
     
      // if comparison  of stringified versions are different
      if(JSON.stringify(data) != JSON.stringify(content)) {
        if(rev) {
          content._rev=rev
        }
        
        // update the saved version
        articles.insert(content,function(err,data) {
          callback(null,true);
        });
      } else {
        callback(null,false);
      }
      
    })
  }
  
  // create any required views
  var createViews = function(callback) {
    
    var views =  [
  		 {
         "_id": "_design/matching",
         "language": "javascript",
         "views": {
  					 "byts":  {
  					   "map": "function(doc) { if(doc.starred) {emit(['starred',doc.pubDateTS],doc._rev);} if(doc.read) {emit(['read',doc.pubDateTS],doc._rev);} if(!doc.read) {emit(['unread',doc.pubDateTS],doc._rev);} }",
  					   "reduce": "_count"
  					 },
  					 "bytag":  {
  					   "map": "function(doc) { for(var i in doc.tags) { var tag=doc.tags[i].toLowerCase(); if(doc.starred) {emit(['starred',tag, doc.pubDateTS],null);} if(doc.read) {emit(['read',tag, doc.pubDateTS],null);} if(!doc.read) {emit(['unread',tag, doc.pubDateTS],null);} } }",
  					   "reduce": "_count"
  					 },
   					 "byfeed":  {
   					   "map": "function(doc) { var tag=doc.feedName.toLowerCase(); if(doc.starred) {emit(['starred',tag, doc.pubDateTS],null);} if(doc.read) {emit(['read',tag, doc.pubDateTS],null);} if(!doc.read) {emit(['unread',tag, doc.pubDateTS],null);}  }",
   					   "reduce": "_count"
   					 }
         }
      },
      {
        "_id": "_design/search",
        "language": "javascript",
         "indexes": {
           "ft": {
             "index": "function(doc) { index('title', doc.title, {store: 'no', index: 'analyzed'}); index('description', doc.description, {store: 'no', index: 'analyzed'}); index('pubDateTS',doc.pubDateTS) }"
           }
         }
      }
  	];	
    
    console.log("Checking views");
    for(var i in views) {
      var v = views[i];
      checkView(views[i]._id, views[i], function(err, data) {
        
      });

    }
    callback();
  }
  
// compact the databases
var compact = function(callback) {

  nano.db.compact("feeds",function(err,data) {
  });
  
  nano.db.compact("articles",function(err,data) {
  });
  callback(null,{});
   
}
  
  // create some databases
  async.series( [ createFeeds, createArticles, createViews] );

  module.exports = {
    feeds: feeds,
    articles: articles,
    createViews: createViews,
    compact: compact
  }