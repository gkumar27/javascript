// Code goes here

/*global define*/
/*jshint maxcomplexity:12*/
/**
 * @module Mediator 
 * @requires Underscore.js
 * @requires core.logger
 * @description Responsible for Handling communication between modules
 *  
 */
define(function (require) {
  
    var _ = require('underscore'),
        core = require('core'),
        mediatorCount = 0;

    /**
     * @function Mediator
     * @constructs
     * @description Constructor Function
     * @param {String} name --  name to be used for identifying distinct mediator
     */
    function Mediator(name){
        var self = this; //self to use it in setInterval
        this.name = name || ('' + mediatorCount);
        this.channels = {};
        //holder of current publish channels
        this.publishStack = [];
        mediatorCount += 1;
        this.publishedQueue = [];
        this.deletedQueue = [];
        this.queueInterval = setInterval(function () {
            processPublishQueue(self);
            processDeleteQueue(self);
        }, 300);
    }

   

    /**
     * @public
     * @function end
     * @description to release all the subscribtions so that the unused objeccts are garbage collected
     */
     Mediator.prototype.end = function() {
        if (this.queueInterval) {
            clearInterval(this.queueInterval);
        }
        this.channels = {};
        this.publishedQueue = [];
        this.deletedQueue = [];
    }


    /**
     * @public
     * @function subscribe
     * @description -- Function for subscribing channels, when publish is called the subscribing functions will be
     * called
     * @param  {Object} config config object of subscribtion
     * @param  {String} config.channel channel to which to subscribe
     * @param  {Function} config.callback call back to call when the channel was published
     * @param  {Object} config.context Instance reference of the object which is interested in subscribing
     **/
     Mediator.prototype.subscribe = function(config) {
        if(!config){
          return;
        }

        var self = this,
            channels = self.channels,
            context = config.context || {},
            cb = _.isFunction(config.callback) ? config.callback : context[config.callback],
            sub, errorMessage;

        if (!config.callback || !config.channel || !_.isFunction(cb)) {
            errorMessage = 'Mediator subscribing Error Missing channel or callback' +
                '[#name: ' + self.name + ',#channel:' + config.channel + ', callback :'+  config.callback +']';
            core.logger.error('Mediator', errorMessage);
            return;
        }
        if (config.count) {
            core.logger.warn('Mediator subscribe  count is deprecated please rechange your logic');
        }
        sub = {
            context: config.context,
            callback: config.callback
        };
        if (!_.isArray(channels[config.channel])) {
            channels[config.channel] = [];
        }
        channels[config.channel].push(sub);
    }

    /**
     * @public
     * @function unsubscribe
     * @description -- Function for unsubscribing channels,
     * It marks the subscribed channel as isUnsubscribed if it matches channel and the context passed
     * to the subscribed object and also the call back functions (string) should be equal,
     * function are compared by string to  support anonymys functions
     * @param  {Object} config config object of unsubscribe
     * @param  {String} config.channel channel to which to unsubscribe
     * @param  {Function} config.callback call back to check and remove if only call back is matched
     * @param  {Object} config.context Instance reference of the object which is interested in subscribing
     *
     **/
    Mediator.prototype.unsubscribe = function (config) {
        var self = this,
            subscribed, channel, warningMessage;
        config = config || {};
        channel = config.channel;
        subscribed = self.channels[channel];
        if (!channel || !subscribed || !subscribed.length ||
            !config.callback || !config.context) {
            warningMessage = 'Mediator unsubscribe  called with Missing callback' +
                ' or no channel or channel with no subscribtions' +
                '[#name: ' + self.name + ',#channel:' + channel + ']';
            //Note: Commenting out logging as there are lot of modules
            // which are just unsubscribing without subscribing
            //core.logger.warn(warningMessage, 'unsubscribe:');
            return;
        }
        _.each(subscribed, function (item) {
            //if context is matching and the function string matches
            // then only unsubscribe
            if (item.context === config.context &&
                ('' + item.callback === '' + config.callback)) {
                item.isUnsubscribed = true;
            }
        });
    }

    /**
     * @public
     * @function publish
     * @description -- Function for calling all subscribed callback functions for a given channel ,
     * If the subscribed object is marked as isUnsubscribed it will be skipped
     * @param  {String} channel channel for which the subscribed call backs are to be called
     * @param  {Object} payload payload to pass to the subscribed functions
     **/
    Mediator.prototype.publish = function (channel, payload) {
        var self = this,
            i,len, cb,
            channels, subscribed,
            sub, errorMessage;

        if (_.contains(self.publishStack, channel)) {
            addToPublishQueue(self, channel, payload);
            return;
        }
        payload = payload || {};

        channels = self.channels;
        subscribed = channels[channel];
        //send spine channels
      
        if (!channel || !_.isArray(subscribed)) {
            return;
        }
        self.publishStack.push(channel);
        //calculating length before to ignore newly added subscribe
        // while in public loop
        len = subscribed.length;
        for (i = 0; i < len; i++) {
            sub = subscribed[i];
            if (!sub || !sub.callback) {
                errorMessage = 'Mediator publishing Error Missing callback' +
                    '[#name: ' + self.name + ',#channel:' + channel + ']';
                core.logger.error('Mediator', errorMessage, 'Subscribed Object:', sub);
                continue;
            }
            if (_.isObject(payload) && !_.isArray(payload)) {
                payload.FxChannel = channel;
            }
            if (!sub.isUnsubscribed) {
                //call the subscribed call back if it is not marked as isUnsubscribed
                cb = sub.callback;

                if(_.isString(sub.callback)){
                  cb = sub.context[sub.callback];
                  if(!_.isFunction(cb)){
                      errorMessage = 'Mediator publishing Error no callback in the context ' +
                      '[#name: ' + self.name + ',#channel:' + channel + ' ,callback:'+ sub.callback + ']';
                      core.logger.error('Mediator',errorMessage);
                    continue;
                  }
                }
                cb.apply(sub.context, [payload]);
            }

        }

        self.publishStack.pop();
        deleteUnsubscribed(self, channel);
    }

    /**
     * @public
     * @alias removeContext
     * @function unsubscribeByContext
     * @description -- Unsubscribe the subscribed channels if context is matched
     **/
     Mediator.prototype.removeContext = function(context) {
        var self = this,
            channels;

        channels = self.channels;
        _.each(channels, function (subscribed) {
            _.each(subscribed, function (sub) {
                if (sub.context === context) {
                    sub.isUnsubscribed = true;
                }
            });
        });
    }

    /**
     * @public
     * @function channelListing
     * @description -- Function for listing all the subscribed channels
     * @returns  {Array} Array of all subscribtions
     **/
     Mediator.prototype.channelListing = function() {
        var self = this,
            channels = self.channels;

        return _.map(channels, function (subs) {
            return subs;
        });
    }

     Mediator.prototype.prototype = function(context,eventMap){
        var self = this;
        function iterator(val,key){
          var opts = {
            context: context,
            channel: key
          };
          opts.callback = _.isFunction(context[val])? val : _.noop;
          self.subscribe(opts);
          return opts;
        }
        return _.map(eventMap,iterator);
    }

     Mediator.prototype.easyUnsubscribe = function(context,eventMap){
      var self = this;
      function iterator(val,key){
        var opts = {
          context: context,
          channel: key
        };
        opts.callback = _.isFunction(context[val])? val : _.noop;
        self.unsubscribe(opts);
      }
      _.each(eventMap,iterator);
    }

    /*************************************** Private Methods *****************************/

    /**
     * @private
     * @function deleteUnsubscribed
     * @description -- function to check if the channel is still in publish loop
     *  and add to the delete queue to delete later, if not call the delete channels to
     * delete 'isUnsubscribed' objects
     * @param  {@this}  self  this mediator instance
     * @param  {String} channel channel for which 'isUnsubscribed' are to be cleaned up
     **/
    function deleteUnsubscribed(self, channel) {
        if (!_.contains(self.publishStack, channel)) {
            deleteChannels(self, channel);
        } else {
            //donot delete the channels which are still processing
            addToDeleteQueue(self, channel);
        }
    }

    /**
     * @private
     * @function deleteChannels
     * @description -- function to delete the objects which are marked as 'isUnsubscribed'
     * if there are no objects left, delete the channel from self.channels
     * @param  {@this}  self  this mediator instance
     * @param  {String} channel channel for which 'isUnsubscribed' are to be cleaned up
     **/
    function deleteChannels(self, channel) {
        var channels, subscribed;
        channel = channel || '';

        //deleteChannels
        channels = self.channels;
        subscribed = channels[channel];

        if (!subscribed || !subscribed.length) {
            return;
        }
        subscribed = _.reject(subscribed, function (item) {
            return item.isUnsubscribed;
        });

        if (!subscribed.length) {
            //delete the channel object in the channels if no subscribed Objects
            delete self.channels[channel];
        } else {
            self.channels[channel] = subscribed;
        }

    }


    /*************************************** Queue Functions *****************************/

    /**
     * @private
     * @function addToPublishQueue
     * @description -- function to add the new published channel with payload to the publish Queue
     * as the channel is currently in the publish stack
     * @param  {@this}  self  this mediator instance
     * @param  {String} channel channel which is newly published which is already in the publish stack
     * @param  {Object} payload payload attached to the newly Published channel
     **/
    function addToPublishQueue(self, channel, payload) {
        self.publishedQueue.push({
            channel: channel,
            payload: payload
        });
    }

    /**
     * @private
     * @function addToDeleteQueue
     * @description -- function to add the channel to the deletedQueue Queue
     * as the channel is still in the publish stack
     * @param  {@this}  self  this mediator instance
     * @param  {String} channel channel which is is to be deleted and is still in the publish stack
     **/
    function addToDeleteQueue(self, channel) {
        self.deletedQueue.push({
            channel: channel
        });
    }

    /**
     * @private
     * @function processPublishQueue
     * @description -- function to process the published Queue and publish if the channel is not
     * in the publish stack, periodically run every 1 sec
     * for handling scenario of while in a  channel publish loop, the same channel is published again
     * @param  {@this}  self  this mediator instance
     **/
    function processPublishQueue(self) {
        if (!self.publishedQueue.length) {
            return;
        }
        _.each(self.publishedQueue, function (q) {
            if (!_.contains(self.publishStack, q.channel)) {
                self.publish(q.channel, q.payload);
                q.isCompleted = true;
            }
        });

        //remove all the completed ones from the queue
        self.publishedQueue = _.reject(self.publishedQueue, function (q) {
            return q.isCompleted;
        });

    }

    /**
     * @private
     * @function processDeleteQueue
     * @description -- function to process the deletedQueue Queue and delete if the channel is not
     * in the publish stack, periodically run every 1 sec
     * for handling scenario of while in a  channel publish loop,  unsubscribe the same channel
     * @param  {@this}  self  this mediator instance
     **/
    function processDeleteQueue(self) {
        if (!self.deletedQueue.length) {
            return;
        }
        _.each(self.deletedQueue, function (q) {
            if (!_.contains(self.publishStack, q.channel)) {
                deleteChannels(self, q.channel);
                q.isCompleted = true;
            }
        });
        self.deletedQueue = _.reject(self.deletedQueue, function (q) {
            return q.isCompleted;
        });

    }
    
    return Mediator;
});
