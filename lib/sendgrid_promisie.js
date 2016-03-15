'use strict';
var SendGrid = require('sendgrid');
var promisie = require('promisie');
var request = require('superagent');

function SendGridPromisie(apiUserOrKey, apiKeyOrOptions, options) {
    	
    if( !(this instanceof SendGridPromisie)) {
    	return new SendGridPromisie(apiUserOrKey, apiKeyOrOptions, options);
  	}
        
    SendGrid.call(this, apiUserOrKey, apiKeyOrOptions, options);
    this.send = promisie.promisify(this.send);            
    
}
SendGridPromisie.prototype = Object.create(SendGrid.prototype);
SendGridPromisie.prototype.constructor = SendGridPromisie;

SendGridPromisie.prototype.getTemplates = function () {
    return new Promise((resolve, reject) => {
        request
            .get('https://api.sendgrid.com/v3/templates')
            .set('Content-Type', 'application/json')
            .set('Authorization', 'Bearer ' + this.api_key)
            .end(function(err, res) {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            });
    });
}

SendGridPromisie.prototype.compareTemplateByName = function (a,b, caseSensitive) {
	return (caseSensitive) ? (a===b) : (a.toLowerCase() === b.toLowerCase());
}
SendGridPromisie.prototype.getTemplateByName = function (templateName, caseSensitive){
    return new Promise((resolve, reject) => {
        this.getTemplates()
            .then((data) =>{
                var templates = JSON.parse(data.text).templates;                              
                for (var i = 0; i < templates.length; i++) {
                	var foundMatch = this.compareTemplateByName(templateName, templates[i].name, caseSensitive) 
                	
                	if(foundMatch) {
                		resolve(templates[i]);
                		break;
                	}
                }
           		// if cannot find match, reject
                reject(new Error(templateName + ' does not exist'));
            })
            .catch((err)=>{
            	reject(new Error(err));
            })
    })
}
module.exports = SendGridPromisie
