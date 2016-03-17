'use strict';
var SendGrid = require('sendgrid');
var promisie = require('promisie');
var request = require('superagent');

function SendGridPromisie(apiUserOrKey, apiKeyOrOptions, options) {

    if (!(this instanceof SendGridPromisie)) {
        return new SendGridPromisie(apiUserOrKey, apiKeyOrOptions, options);
    }
    SendGrid.call(this, apiUserOrKey, apiKeyOrOptions, options);
    this.send = promisie.promisify(this.send);
    this.templates;
    this.asmGroups;

}
SendGridPromisie.prototype = Object.create(SendGrid.prototype);
SendGridPromisie.prototype.constructor = SendGridPromisie;

SendGridPromisie.prototype.apiEndPoints = {
    templates: 'https://api.sendgrid.com/v3/templates',
    asmGroups: 'https://api.sendgrid.com/v3/asm/groups'
}

SendGridPromisie.prototype.getRequest = function(route) {
    
    return new Promise((resolve, reject) => {
        request
            .get(route)
            .set('Content-Type', 'application/json')
            .set('Authorization', 'Bearer ' + this.api_key)
            .end(function(err, res) {
                if (err) {
                    reject(err);
                } else {
                    resolve(res.body);
                }
            });
    });
}

SendGridPromisie.prototype.isMatch = function(a, b) {
	
    return (typeof a !== 'string' || typeof b !== 'string') ? (a === b) : (a.toLowerCase() === b.toLowerCase());
}

SendGridPromisie.prototype.itemExist = function(searchOption, searchList) {
	
    for (var i = 0; i < searchList.length; i++) {
        var foundMatch = this.isMatch(searchOption[searchOption.searchType], searchList[i][searchOption.searchType]);
        if (foundMatch) {
            return searchList[i];
        }
    }
    return false;
}

SendGridPromisie.prototype.getList = function(searchOption) {
    return new Promise((resolve, reject) => {
        this
            .getRequest(this.apiEndPoints[searchOption.routeType])
            .then(data => {            	
                var searchList = (searchOption.routeType==='templates') ? data.templates : data;                
                this.addToCache(searchList, searchOption);
                resolve(searchList);
            })
            .catch(err => reject(err));
    });
}
SendGridPromisie.prototype.getByType = function(searchOption) {

    return new Promise((resolve, reject) => {

        var cacheItem = this.getFromCache(searchOption);
        
        if (cacheItem) {
            console.log('Found a cached item:', cacheItem);
            resolve(cacheItem);
        } else {
        	console.log('Item is not cached:', searchOption);
            this.getList(searchOption)
                .then(list => {                	                    
                    var item = this.itemExist(searchOption, list);                    
                    (item) ? resolve(item) : reject(new Error(searchOption.name + ' does not exist'));                    
                })
                .catch(err => reject(new Error(err)));
        }
    });
}



SendGridPromisie.prototype.addToCache = function(candidateList, searchOption) {
    var cacheList = this[searchOption.routeType];
    if (!cacheList || cacheList.length === 0) {

        this[searchOption.routeType] = candidateList;

    } else {

        var candidateListLength = candidateList.length;
        var candidateItem;
        for (var i = 0; i < candidateListLength; i++) {

            candidateItem = candidateList[i];
            if (cacheList.every(existingItem => existingItem.id !== candidateItem.id)) {
                console.log('Caching item:', candidateItem);
                this[searchOption.routeType].push(candidateItem);
            }
        }
    }
}

SendGridPromisie.prototype.getFromCache = function(searchOption) {

    var cacheList = this[searchOption.routeType];
    var cacheItem;

    if (!cacheList || cacheList.length === 0) {
        cacheItem = null;
    } else {
        cacheItem = this.itemExist(searchOption, cacheList, searchOption);
    }

    return cacheItem;
}

SendGridPromisie.prototype.SearchOptionFactory = function(name, searchType, routeType) {
    
    var searchOption = {        
        searchType: searchType,
        routeType: routeType        
    }

    searchOption[searchType] = name;
    
    return searchOption;
}

SendGridPromisie.prototype.skipGlobalList = function(email) {
	return new Promise((resolve, reject) => {
		email.addFilter('bypass_list_management', 'enable', 1);	
		resolve(email);
	});
}
SendGridPromisie.prototype.addSuppressGroup = function(email, suppressGroup, searchType) {
    
    var item = this.SearchOptionFactory(suppressGroup, searchType, 'asmGroups');

    return new Promise((resolve, reject) => {        
        this.getByType(item)
            .then(data => {
            	console.log('Adding unsubscribe group:', data);            	
                email.setASMGroupID(data.id);
                resolve(email);                               	               
            })
            .catch(err => {
            	console.error('Error adding unsubscribe group:');
            	reject(new Error(err));
            });
    });
}

SendGridPromisie.prototype.addTemplate = function(email, template, searchType) {
    
    var item = this.SearchOptionFactory(template, searchType, 'templates');

    return new Promise((resolve, reject) => {        
        this.getByType(item)
            .then(data => {
            	console.log('Adding template:', data);            	
                email.addFilter('templates', 'enable',1)
                	.addFilter('templates', 'template_id', data.id)
                resolve(email);
            })
            .catch(err => {
            	console.error('Error adding template');
            	reject(new Error(err));
            });
    });
}

module.exports = SendGridPromisie
