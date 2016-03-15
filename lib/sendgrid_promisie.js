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

SendGridPromisie.prototype.getTemplates = function() {
    return new Promise((resolve, reject) => {
        request
            .get('https://api.sendgrid.com/v3/templates')
            .set('Content-Type', 'application/json')
            .set('Authorization', 'Bearer ' + this.api_key)
            .end(function(err, res) {
                if (err) {
                    reject(err);
                } else {
                    resolve(res.body.templates);
                }
            });
    });
}
SendGridPromisie.prototype.confirmTemplateExistsByName = function(templateName, templates, caseSensitive) {
    for (var i = 0; i < templates.length; i++) {
        var foundMatch = this.compareTemplate(templateName, templates[i].name, caseSensitive);
        if (foundMatch) {
            return templates[i];
        }
    }
    return false;
}

SendGridPromisie.prototype.confirmTemplateExistsById = function(templateId, templates, caseSensitive) {
    for (var i = 0; i < templates.length; i++) {
        var foundMatch = this.compareTemplate(templateId, templates[i].id, caseSensitive);
        if (foundMatch) {
            return templates[i];
        }
    }
    return false;
}
SendGridPromisie.prototype.compareTemplate = function(a, b, caseSensitive) {
    return (caseSensitive) ? (a === b) : (a.toLowerCase() === b.toLowerCase());
}

SendGridPromisie.prototype.getTemplateByName = function(templateName, caseSensitive) {
    return new Promise((resolve, reject) => {
        this
            .getTemplates()
            .then((templates) => {
                var template = this.confirmTemplateExistsByName(templateName, templates, caseSensitive);
                if (template) {
                    resolve(template);
                } else {
                    reject(new Error(templateName + ' does not exist'));
                }
            })
            .catch((err) => {
                reject(new Error(err));
            })
    })
}

SendGridPromisie.prototype.getTemplateById = function(templateId, caseSensitive) {
    return new Promise((resolve, reject) => {
        this
            .getTemplates()
            .then((templates) => {
                var template = this.confirmTemplateExistsById(templateId, templates, caseSensitive);
                if (template) {
                    resolve(template);
                } else {
                    reject(new Error(templateName + ' does not exist'));
                }
            })
            .catch((err) => {
                reject(new Error(err));
            })
    })
}

SendGridPromisie.prototype.sendTemplateByName = function(email, templateName, caseSensitive) {
    return new Promise((resolve, reject) => {
        this
            .getTemplateByName(templateName, false)
            .then((template) => {
                return email.setFilters({
                    'templates': {
                        'settings': {
                            'enable': 1,
                            'template_id': template.id
                        }
                    }
                })
            })
            .then((email) => {                        	
                resolve(this.send(email));
            }).catch((err) => {
                reject(new Error(err));
            })
    });
}

module.exports = SendGridPromisie
