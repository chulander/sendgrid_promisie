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

}
SendGridPromisie.prototype = Object.create(SendGrid.prototype);
SendGridPromisie.prototype.constructor = SendGridPromisie;

SendGridPromisie.prototype.apiEndPoints = {
    templates: 'https://api.sendgrid.com/v3/templates',
    unsubscribeGroups: 'https://api.sendgrid.com/v3/asm/groups'
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

SendGridPromisie.prototype.isMatch = function(a, b, caseSensitive) {
    return (caseSensitive) ? (a === b) : (a.toLowerCase() === b.toLowerCase());
}

SendGridPromisie.prototype.itemExist = function(item, list, caseSensitive) {
    for (var i = 0; i < list.length; i++) {
        var foundMatch = this.isMatch(item.name, list[i][item.searchType], caseSensitive);

        if (foundMatch) {
            return list[i];
        }
    }
    return false;
}

SendGridPromisie.prototype.getList = function(route) {
    return new Promise((resolve, reject) => {
        this
            .getRequest(route)
            .then(data => {
                resolve(data);
            })
            .catch(err => {
                reject(err);
            });
    });
}
SendGridPromisie.prototype.getByType = function(searchItem, caseSensitive) {

    return new Promise((resolve, reject) => {
        this
            .getList(this.apiEndPoints[searchItem.routeType])
            .then((list) => {            	
            	
            	var searchList = (searchItem.responseSearchKey) ? list[searchItem.responseSearchKey] : list;
            		
                var item = this.itemExist(searchItem, searchList , caseSensitive);

                if (item) {
                    resolve(item);
                } else {
                    reject(new Error(searchItem.name + ' does not exist'));
                }
            })
            .catch((err) => {
                reject(new Error(err));
            });
    });
}

SendGridPromisie.prototype.sendEmailTemplateByName = function(email, templateName, caseSensitive) {
    var item = {
        name: templateName,
        searchType: 'name',
        routeType: 'templates',
        responseSearchKey: 'templates'
    }
    return new Promise((resolve, reject) => {
        this
            .getByType(item, false)
            .then(template => {
                return email.setFilters({
                    'templates': {
                        'settings': {
                            'enable': 1,
                            'template_id': template.id
                        }
                    }
                })
            })
            .then(email => { resolve(this.send(email)); })
            .catch(err => { reject(new Error(err)); });
    });
}

SendGridPromisie.prototype.getUnsubscribeGroups = function(groupName, caseSensitive) {
	var item = {
		name: groupName,
		searchType: 'name',
		routeType: 'unsubscribeGroups'
	}
    return new Promise((resolve, reject) => {
        this
            .getByType(item, false)
            .then(data => {resolve(data); })                     
            .catch(err => {reject(new Error(err)); });
    });
}

module.exports = SendGridPromisie
