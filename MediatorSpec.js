/* globals QUnit, sinon */
define(function (require) {
    'use strict';

    var Mediator = require('Mediator'),
        _ = require('underscore'),
        core = require('core');

    QUnit.module('Mediator', {
        beforeEach: function () {
            this.mediator = new Mediator();
        },

        afterEach: function () {
            this.mediator.end();
            this.mediator = null;
        }
    });


    /******************************* Subscribe and Publish Tests   ******************/
    QUnit.test('Mediator Basic subscribe and publish test', function (assert) {
        var context = {
            onFxUnitChannel: sinon.spy()
        };
        var config = {
            channel: 'Fx-Unit-Channel',
            callback: context.onFxUnitChannel,
            context: context
        };
        this.mediator.subscribe(config);
        this.mediator.publish('Fx-Unit-Channel');
        assert.ok(context.onFxUnitChannel.called, 'Subscribed Function is Called when published');


    });

    QUnit.test('Mediator subscribed with no channel  and no callback test', function (assert) {
        sinon.stub(core.logger, 'error');
        var context = {
            onFxUnitChannel: sinon.spy()
        };
        var config = {
            callback: context.onFxUnitChannel,
            context: context
        };
        this.mediator.subscribe(config);
        this.mediator.publish('Fx-Unit-Channel');
        assert.ok(core.logger.error.called, 'With No Channel,log message is logged as error');
        assert.notOk(context.onFxUnitChannel.called, 'With No channel Subscribed Function is not called');
        config = {
            channel: 'Fx-Unit-Channel',
            context: context
        };
        this.mediator.subscribe(config);
        this.mediator.publish('Fx-Unit-Channel');
        assert.ok(core.logger.error.called, 'With No callback,log message is logged as error');
        core.logger.error.restore();
    });

    QUnit.test('Mediator publish test with object payload', function (assert) {
        var context = {
            onFxUnitChannel: sinon.spy()
        };
        var config = {
            channel: 'Fx-Unit-Channel',
            callback: context.onFxUnitChannel,
            context: context
        };
        this.mediator.subscribe(config);
        var payload = {
            message: 'this is mediator publish payload'
        };
        this.mediator.publish('Fx-Unit-Channel', payload);
        assert.ok(context.onFxUnitChannel.called, 'Subscribed Function is Called when published');
        assert.ok(context.onFxUnitChannel.calledWith(payload), 'Subscribed Function is Called when published');
        assert.equal(payload.FxChannel, 'Fx-Unit-Channel', 'Object Payload will get FxChannel added');
    });

    QUnit.test('Mediator publish test with boolean payload', function (assert) {
        var context = {
            onFxUnitChannel: sinon.spy()
        };
        var config = {
            channel: 'Fx-Unit-Channel',
            callback: context.onFxUnitChannel,
            context: context
        };
        this.mediator.subscribe(config);
        var payload = true;
        this.mediator.publish('Fx-Unit-Channel', payload);
        assert.ok(context.onFxUnitChannel.called, 'Subscribed Function is Called when published');
        assert.ok(context.onFxUnitChannel.calledWith(payload), 'Subscribed Function is Called when published');
        assert.equal(payload, true, 'For non Object Payload it shouldnot be changed ' +
            'and FxChannel will not be added');
    });


    /******************************* Complex Scenarios with Publish and Unsubscribe Tests  ******************/

    /*Purpose: The purpose of the test is to check if unsubscribe another channel in middle of
     * a current publish.whether it is unsubscribing
     *
     *Scenario:
     * 1) subscribe first channel 'Fx-Unit-ChannelOne' with a  different cb
     * 2) subscribe second channel 'Fx-Unit-ChannelTwo' with a cb
     * 3) subscirbe again to the same channel 'Fx-Unit-ChannelTwo' with a cb
     *   which also unsubscribes 'Fx-Unit-ChannelOne'
     * 4) subscribe again to the same channel 'Fx-Unit-ChannelTwo' with a different cb
     * 5) publish now the first channel, check if first cb is called
     * 6) publish now the second channel 'Fx-Unit-ChannelTwo'
     * 7) publish now the first channel, check if first cb is not called as it
     * should be unsubscribed in the previous publish
     *
     */
    QUnit.test('Mediator  Unsubscribe Inside publish ', function (assert) {
        var self = this;
        var firstContext = {
            onFxUnitChannel: sinon.spy()
        };

        var config = {
            channel: 'Fx-Unit-ChannelOne',
            callback: firstContext.onFxUnitChannel,
            context: firstContext
        };
        this.mediator.subscribe(config);

        var secondContext = {
            onFxUnitChannel: sinon.spy()
        };
        var conf = {
            channel: 'Fx-Unit-ChannelTwo',
            callback: secondContext.onFxUnitChannel,
            context: secondContext
        };
        this.mediator.subscribe(conf);

        var thirdContext = {
            cb: sinon.spy(),
            onFxUnitChannel: function () {
                thirdContext.cb();
                var unConfig = {
                    channel: 'Fx-Unit-ChannelOne',
                    context: firstContext,
                    callback: firstContext.onFxUnitChannel
                };
                self.mediator.unsubscribe(unConfig);
            }
        };
        var confThree = {
            channel: 'Fx-Unit-ChannelTwo',
            callback: thirdContext.onFxUnitChannel,
            context: thirdContext
        };
        this.mediator.subscribe(confThree);

        var fourthContext = {
            onFxUnitChannel: sinon.spy()
        };
        var confFour = {
            channel: 'Fx-Unit-ChannelTwo',
            callback: fourthContext.onFxUnitChannel,
            context: fourthContext
        };
        this.mediator.subscribe(confFour);
        this.mediator.publish('Fx-Unit-ChannelOne');
        assert.ok(firstContext.onFxUnitChannel.calledOnce, 'first context call back should be called regularly');
        firstContext.onFxUnitChannel.reset();
        this.mediator.publish('Fx-Unit-ChannelTwo');
        assert.ok(secondContext.onFxUnitChannel.calledOnce, 'second context should be called once');
        assert.ok(thirdContext.cb.calledOnce, 'second context should be called oncee');
        assert.ok(fourthContext.onFxUnitChannel.calledOnce, 'fourth context should be called once');

        this.mediator.publish('Fx-Unit-ChannelOne');

        assert.notOk(firstContext.onFxUnitChannel.calledOnce, 'first context call back should' +
            ' not be called as it is unsubscribed');


    });

    /*Purpose: The purpose of the test is to check if another publish channel can be published
     * from with in the publish and  both the publishes call all the subscribers and the
     * inner publish is completed before the outer publish
     *Scenario:
     * 1) subscribe first channel 'Fx-Unit-ChannelOne' with a  cb
     * 2) subscribe again to the same channel 'Fx-Unit-ChannelOne' with a  different cb
     * 3) subscribe second channel 'Fx-Unit-ChannelTwo' with a cb
     * 4) subscirbe again to the same channel 'Fx-Unit-ChannelTwo' with a cb
     *   which also publishes 'Fx-Unit-ChannelOne'
     * 5) subscribe again to the same channel 'Fx-Unit-ChannelTwo' with a different cb
     * 6) publish now the second channel 'Fx-Unit-ChannelTwo'
     * 7) check if both the publish callbacks are called and the inner is completed first
     */
    QUnit.test('Mediator  publish another channel Inside publish ', function (assert) {
        var self = this;
        var firstContext = {
            onFxUnitChannel: sinon.spy()
        };

        var config = {
            channel: 'Fx-Unit-ChannelOne',
            callback: firstContext.onFxUnitChannel,
            context: firstContext
        };
        this.mediator.subscribe(config);

        var channelOneSecond = {
            onFxUnitChannel: sinon.spy()
        };

        var channelOneSecondconfig = {
            channel: 'Fx-Unit-ChannelOne',
            callback: channelOneSecond.onFxUnitChannel,
            context: channelOneSecond
        };
        this.mediator.subscribe(channelOneSecondconfig);

        var secondContext = {
            onFxUnitChannel: sinon.spy()
        };
        var conf = {
            channel: 'Fx-Unit-ChannelTwo',
            callback: secondContext.onFxUnitChannel,
            context: secondContext
        };
        this.mediator.subscribe(conf);

        var thirdContext = {
            cb: sinon.spy(),
            onFxUnitChannel: function () {
                thirdContext.cb();
                self.mediator.publish('Fx-Unit-ChannelOne');
            }
        };
        var confThree = {
            channel: 'Fx-Unit-ChannelTwo',
            callback: thirdContext.onFxUnitChannel,
            context: thirdContext
        };
        this.mediator.subscribe(confThree);

        var fourthContext = {
            onFxUnitChannel: sinon.spy()
        };
        var confFour = {
            channel: 'Fx-Unit-ChannelTwo',
            callback: fourthContext.onFxUnitChannel,
            context: fourthContext
        };
        this.mediator.subscribe(confFour);

        this.mediator.publish('Fx-Unit-ChannelTwo');

        assert.ok(firstContext.onFxUnitChannel.calledOnce, 'channel one first call back should be called ');
        assert.ok(channelOneSecond.onFxUnitChannel.calledOnce, 'channel one second call back should be called');

        assert.ok(firstContext.onFxUnitChannel.calledBefore(fourthContext.onFxUnitChannel), 'channel one first ' +
            'call back should be called before channel Two\'s call back');
        assert.ok(channelOneSecond.onFxUnitChannel.calledBefore(fourthContext.onFxUnitChannel), 'channel one second ' +
            'call back should be called before channel Two\'s call back');

        assert.ok(secondContext.onFxUnitChannel.calledOnce, 'second context should be called once');
        assert.ok(thirdContext.cb.calledOnce, 'second context should be called once');
        assert.ok(fourthContext.onFxUnitChannel.calledOnce, 'fourth context should be called once');
    });


    /*Purpose: The purpose of the test is to check if same publish channel can be published
     * from with in the publish and the inner publish (second publish) should not be called before the outer publish
     *
     *Scenario:
     * 1) subscribe first channel 'Fx-Unit-ChannelOne' with a  cb
     * 2) subscribe again to the same channel 'Fx-Unit-ChannelOne' with a  different cb
     *    which also publishes  'Fx-Unit-ChannelOne'
     * 3) subscribe again to the same channel 'Fx-Unit-ChannelOne' with a different cb
     * 4) publish now the second channel 'Fx-Unit-ChannelOne'
     * 5) check if both the publish callbacks are called and the inner is completed later than the outer
     */
    QUnit.test('Mediator  publish same channel Inside publish ', function (assert) {
        var self = this;
        var firstContext = {
            onFxUnitChannel: sinon.spy()
        };
        var done = assert.async();
        var config = {
            channel: 'Fx-Unit-ChannelOne',
            callback: firstContext.onFxUnitChannel,
            context: firstContext
        };
        this.mediator.subscribe(config);

        var channelOneSecond = {
            cb: sinon.spy(),
            onFxUnitChannel: function () {
                channelOneSecond.cb();
                self.mediator.publish('Fx-Unit-ChannelOne');
            }
        };

        var channelOneSecondconfig = {
            channel: 'Fx-Unit-ChannelOne',
            callback: channelOneSecond.onFxUnitChannel,
            context: channelOneSecond
        };
        this.mediator.subscribe(channelOneSecondconfig);

        var channelOneThird = {
            onFxUnitChannel: sinon.spy()
        };

        var channelOneThirdconfig = {
            channel: 'Fx-Unit-ChannelOne',
            callback: channelOneThird.onFxUnitChannel,
            context: channelOneThird
        };
        this.mediator.subscribe(channelOneThirdconfig);

        this.mediator.publish('Fx-Unit-ChannelOne');

        assert.equal(firstContext.onFxUnitChannel.callCount, 1, 'channel one first call back should be called once');
        assert.equal(channelOneSecond.cb.callCount, 1, 'channel one second call back should be called once');


        assert.equal(channelOneThird.onFxUnitChannel.callCount, 1, 'channel one third call back should be called once');
        firstContext.onFxUnitChannel.reset();
        channelOneSecond.cb.reset();
        setTimeout(function () {
            assert.ok(channelOneThird.onFxUnitChannel.calledBefore(firstContext.onFxUnitChannel), 'third should be ' +
                'called before the  first one is called again ');
            assert.ok(channelOneThird.onFxUnitChannel.calledBefore(channelOneSecond.cb), 'third should be ' +
                'called before the  second one is called again ');
            assert.equal(firstContext.onFxUnitChannel.callCount, 1, 'channel one first call back should be '+
                                  ' called once');
            assert.equal(channelOneSecond.cb.callCount, 1, 'channel one second call back ' +
                'should be called once');
            assert.equal(channelOneThird.onFxUnitChannel.callCount, 2, 'channel one third call back ' +
                'should be called twice');
            done();
        }, 305);

    });


    /*Purpose: The purpose of the test is to check if the same channel is unsubscribed in middle of the publish
     * the next subscribed for the same channel will not be called
     *Scenario:
     * 1) subscribe  channel 'Fx-Unit-ChannelOne' with a  cb
     * 2) subscribe again to the same channel 'Fx-Unit-ChannelOne' with a  different cb
     *   (cb in which it should unsubscribes the third subscribtion)
     * 3) subscribe again to the same channel 'Fx-Unit-ChannelOne' with a  different cb
     * 4) subscribe again to the same channel 'Fx-Unit-ChannelOne' with a  different cb
     * 5) publish now the  channel 'Fx-Unit-ChannelOne'
     * 7) check if all the subscribtions are called except third
     */
    QUnit.test('Mediator  publish another channel Inside publish ', function (assert) {
        var self = this;
        var firstContext = {
            onFxUnitChannel: sinon.spy()
        };

        var config = {
            channel: 'Fx-Unit-ChannelOne',
            callback: firstContext.onFxUnitChannel,
            context: firstContext
        };
        this.mediator.subscribe(config);

        var channelOneThird = {
            onFxUnitChannel: sinon.spy()
        };

        var channelOneThirdconfig = {
            channel: 'Fx-Unit-ChannelOne',
            callback: channelOneThird.onFxUnitChannel,
            context: channelOneThird
        };

        var channelOneSecond = {
            cb: sinon.spy(),
            onFxUnitChannel: function () {
                channelOneSecond.cb();
                var unConfig = {
                    channel: 'Fx-Unit-ChannelOne',
                    context: channelOneThird,
                    callback: channelOneThird.onFxUnitChannel
                };
                self.mediator.unsubscribe(unConfig);

            }
        };

        var channelOneSecondconfig = {
            channel: 'Fx-Unit-ChannelOne',
            callback: channelOneSecond.onFxUnitChannel,
            context: channelOneSecond
        };
        this.mediator.subscribe(channelOneSecondconfig);


        this.mediator.subscribe(channelOneThirdconfig);

        var channelOneFourth = {
            onFxUnitChannel: sinon.spy()
        };

        var channelOneFourthconfig = {
            channel: 'Fx-Unit-ChannelOne',
            callback: channelOneFourth.onFxUnitChannel,
            context: channelOneFourth
        };
        this.mediator.subscribe(channelOneFourthconfig);
        this.mediator.publish('Fx-Unit-ChannelOne');
        assert.ok(firstContext.onFxUnitChannel.calledOnce, 'channel one first sub call back should be called ');
        assert.ok(channelOneSecond.cb.calledOnce, 'channel one second sub call back should be called');
        assert.notOk(channelOneThird.onFxUnitChannel.calledOnce, 'channel one third sub call back should not'+
                      ' be called');
        assert.ok(channelOneFourth.onFxUnitChannel.calledOnce, 'channel one fourth sub call back should be called');
    });



    /******************************* Unsubscribe Tests  ******************/
    //check channel deleted from self.channels
    QUnit.test('Mediator unsubscribe basic check ', function (assert) {

        var firstContext = {
            onFxUnitChannel: sinon.spy()
        };

        var config = {
            channel: 'Fx-Unit-ChannelOne',
            callback: firstContext.onFxUnitChannel,
            context: firstContext
        };
        this.mediator.subscribe(config);

        var secondContext = {
            onFxUnitChannel: sinon.spy()
        };
        var conf = {
            channel: 'Fx-Unit-ChannelOne',
            callback: secondContext.onFxUnitChannel,
            context: secondContext
        };
        this.mediator.subscribe(conf);

        this.mediator.publish('Fx-Unit-ChannelOne');
        assert.ok(firstContext.onFxUnitChannel.calledOnce, 'first context call back should be called regularly');
        assert.ok(secondContext.onFxUnitChannel.calledOnce, 'second context call back should be called regularly');

        var unConfig = {
            channel: 'Fx-Unit-ChannelOne',
            context: firstContext,
            callback: firstContext.onFxUnitChannel
        };
        this.mediator.unsubscribe(unConfig);
        this.mediator.publish('Fx-Unit-ChannelOne');
        assert.notOk(firstContext.onFxUnitChannel.calledTwice, 'first context call back should not be called twice');
        assert.ok(secondContext.onFxUnitChannel.calledTwice, 'second context call back should be called twice');

    });

    QUnit.test('Mediator unsubscribe with no channel', function (assert) {
        sinon.stub(core.logger, 'warn');
        var firstContext = {
            onFxUnitChannel: sinon.spy()
        };

        var config = {
            channel: 'Fx-Unit-ChannelOne',
            callback: firstContext.onFxUnitChannel,
            context: firstContext
        };
        this.mediator.subscribe(config);

        var secondContext = {
            onFxUnitChannel: sinon.spy()
        };
        var conf = {
            channel: 'Fx-Unit-ChannelOne',
            callback: secondContext.onFxUnitChannel,
            context: secondContext
        };
        this.mediator.subscribe(conf);

        this.mediator.publish('Fx-Unit-ChannelOne');
        assert.ok(firstContext.onFxUnitChannel.calledOnce, 'first context call back should be called regularly');
        assert.ok(secondContext.onFxUnitChannel.calledOnce, 'second context call back should be called regularly');

        var unConfig = {
            context: firstContext,
            callback: firstContext.onFxUnitChannel
        };
        this.mediator.unsubscribe(unConfig);
        this.mediator.publish('Fx-Unit-ChannelOne');
        assert.ok(firstContext.onFxUnitChannel.calledTwice, 'first context call back should  be called twice');
        assert.ok(secondContext.onFxUnitChannel.calledTwice, 'second context call back should be called twice');
        core.logger.warn.restore();
    });

    QUnit.test('Mediator unsubscribe with no context', function (assert) {
        sinon.stub(core.logger, 'warn');
        var firstContext = {
            onFxUnitChannel: sinon.spy()
        };

        var config = {
            channel: 'Fx-Unit-ChannelOne',
            callback: firstContext.onFxUnitChannel,
            context: firstContext
        };
        this.mediator.subscribe(config);

        var secondContext = {
            onFxUnitChannel: sinon.spy()
        };
        var conf = {
            channel: 'Fx-Unit-ChannelOne',
            callback: secondContext.onFxUnitChannel,
            context: secondContext
        };
        this.mediator.subscribe(conf);

        this.mediator.publish('Fx-Unit-ChannelOne');
        assert.ok(firstContext.onFxUnitChannel.calledOnce, 'first context call back should be called regularly');
        assert.ok(secondContext.onFxUnitChannel.calledOnce, 'second context call back should be called regularly');

        var unConfig = {
            channel: 'Fx-Unit-ChannelOne',
            callback: firstContext.onFxUnitChannel
        };
        this.mediator.unsubscribe(unConfig);
        this.mediator.publish('Fx-Unit-ChannelOne');
        assert.ok(firstContext.onFxUnitChannel.calledTwice, 'first context call back should  be called twice');
        assert.ok(secondContext.onFxUnitChannel.calledTwice, 'second context call back should be called twice');
        core.logger.warn.restore();
    });


    QUnit.test('Mediator unsubscribe with no callback', function (assert) {
        sinon.stub(core.logger, 'warn');
        var firstContext = {
            onFxUnitChannel: sinon.spy()
        };

        var config = {
            channel: 'Fx-Unit-ChannelOne',
            callback: firstContext.onFxUnitChannel,
            context: firstContext
        };
        this.mediator.subscribe(config);

        var secondContext = {
            onFxUnitChannel: sinon.spy()
        };
        var conf = {
            channel: 'Fx-Unit-ChannelOne',
            callback: secondContext.onFxUnitChannel,
            context: secondContext
        };
        this.mediator.subscribe(conf);

        this.mediator.publish('Fx-Unit-ChannelOne');
        assert.ok(firstContext.onFxUnitChannel.calledOnce, 'first context call back should be called regularly');
        assert.ok(secondContext.onFxUnitChannel.calledOnce, 'second context call back should be called regularly');

        var unConfig = {
            channel: 'Fx-Unit-ChannelOne',
            context: firstContext
        };
        this.mediator.unsubscribe(unConfig);
        this.mediator.publish('Fx-Unit-ChannelOne');
        assert.ok(firstContext.onFxUnitChannel.calledTwice, 'first context call back should  be called twice');
        assert.ok(secondContext.onFxUnitChannel.calledTwice, 'second context call back should be called twice');
        core.logger.warn.restore();

    });

    QUnit.test('Mediator unsubscribe with Matching Anonymys Function Test', function (assert) {
        var firstContext = {
            onFxUnitChannel: sinon.spy()
        };

        var config = {
            channel: 'Fx-Unit-ChannelOne',
            callback: function () {
                firstContext.onFxUnitChannel();
            },
            context: firstContext
        };
        this.mediator.subscribe(config);

        var secondContext = {
            onFxUnitChannel: sinon.spy()
        };
        var conf = {
            channel: 'Fx-Unit-ChannelOne',
            callback: secondContext.onFxUnitChannel,
            context: secondContext
        };
        this.mediator.subscribe(conf);

        this.mediator.publish('Fx-Unit-ChannelOne');
        assert.ok(firstContext.onFxUnitChannel.calledOnce, 'first context call back should be called regularly');
        assert.ok(secondContext.onFxUnitChannel.calledOnce, 'second context call back should be called regularly');

        var unConfig = {
            channel: 'Fx-Unit-ChannelOne',
            context: firstContext,
            callback: function () {
                firstContext.onFxUnitChannel();
            }
        };
        this.mediator.unsubscribe(unConfig);
        this.mediator.publish('Fx-Unit-ChannelOne');
        assert.notOk(firstContext.onFxUnitChannel.calledTwice, 'first context call back should not be called twice');
        assert.ok(secondContext.onFxUnitChannel.calledTwice, 'second context call back should be called twice');
    });

    QUnit.test('Mediator unsubscribe with Non Matching Anonymys Function Test', function (assert) {
        var firstContext = {
            onFxUnitChannel: sinon.spy()
        };

        var config = {
            channel: 'Fx-Unit-ChannelOne',
            callback: function () {
                firstContext.onFxUnitChannel();
            },
            context: firstContext
        };
        this.mediator.subscribe(config);

        var secondContext = {
            onFxUnitChannel: sinon.spy()
        };
        var conf = {
            channel: 'Fx-Unit-ChannelOne',
            callback: secondContext.onFxUnitChannel,
            context: secondContext
        };
        this.mediator.subscribe(conf);

        this.mediator.publish('Fx-Unit-ChannelOne');
        assert.ok(firstContext.onFxUnitChannel.calledOnce, 'first context call back should be called regularly');
        assert.ok(secondContext.onFxUnitChannel.calledOnce, 'second context call back should be called regularly');

        var unConfig = {
            channel: 'Fx-Unit-ChannelOne',
            context: firstContext,
            callback: function () {
                //this comment is only differnce between the anonymys functions
                // subscribed and unsubscribed
                //this should not match and it should not unsubscribe
                firstContext.onFxUnitChannel();
            }
        };
        this.mediator.unsubscribe(unConfig);
        this.mediator.publish('Fx-Unit-ChannelOne');
        assert.ok(firstContext.onFxUnitChannel.calledTwice, 'first context call back should  be called twice');
        assert.ok(secondContext.onFxUnitChannel.calledTwice, 'second context call back should be called twice');
    });

    QUnit.test('Mediator if all the subscribed channels are unsubscribed' +
        ', the channels should be deleted ',
        function (assert) {
            var self = this;
            var done = assert.async();
            var firstContext = {
                onFxUnitChannel: sinon.spy()
            };

            var config = {
                channel: 'Fx-Unit-ChannelOne',
                callback: firstContext.onFxUnitChannel,
                context: firstContext
            };
            this.mediator.subscribe(config);

            var secondContext = {
                onFxUnitChannel: sinon.spy()
            };
            var conf = {
                channel: 'Fx-Unit-ChannelOne',
                callback: secondContext.onFxUnitChannel,
                context: secondContext
            };
            this.mediator.subscribe(conf);

            this.mediator.publish('Fx-Unit-ChannelOne');
            assert.ok(firstContext.onFxUnitChannel.calledOnce, 'first context call back should be called regularly');
            assert.ok(secondContext.onFxUnitChannel.calledOnce, 'second context call back should be called regularly');

            var secondChannelContext = {
                onFxUnitChannel: sinon.spy()
            };

            var secondChannelConfig = {
                channel: 'Fx-Unit-ChannelTwo',
                callback: secondChannelContext.onFxUnitChannel,
                context: secondChannelContext
            };
            this.mediator.subscribe(secondChannelConfig);



            var unConfig = {
                channel: 'Fx-Unit-ChannelOne',
                context: firstContext,
                callback: firstContext.onFxUnitChannel
            };
            this.mediator.unsubscribe(unConfig);

            var secondUnsubConfig = {
                channel: 'Fx-Unit-ChannelOne',
                context: secondContext,
                callback: secondContext.onFxUnitChannel
            };
            this.mediator.unsubscribe(secondUnsubConfig);

            this.mediator.publish('Fx-Unit-ChannelOne');
            assert.notOk(firstContext.onFxUnitChannel.calledTwice, 'first context call back should not be '+
                        ' called twice');
            assert.notOk(secondContext.onFxUnitChannel.calledTwice, 'second context call back should not be '+
                        ' called twice');

            setTimeout(function () {
                var subscribed = self.mediator.channelListing();

                var channelFound = _.find(subscribed, function (sub) {
                    return sub.channel === 'Fx-Unit-ChannelOne';
                });

                assert.notOk(!!channelFound, 'the unsubscFxed channel should not be seen in channel list');
                done();
            }, 305);


        });


    QUnit.test('Mediator removeContext check ', function (assert) {
        var self = this;
        var done = assert.async();
        var firstContext = {
            onFxUnitChannel: sinon.spy(),
            onSecondChannel: sinon.spy()
        };

        var config = {
            channel: 'Fx-Unit-ChannelOne',
            callback: firstContext.onFxUnitChannel,
            context: firstContext
        };
        this.mediator.subscribe(config);

        var secondConfig = {
            channel: 'Fx-Unit-ChannelTwo',
            callback: firstContext.onSecondChannel,
            context: firstContext
        };
        this.mediator.subscribe(secondConfig);

        var secondContext = {
            onFxUnitChannel: sinon.spy()
        };

        var secondContextconfig = {
            channel: 'Fx-Unit-ChannelOne',
            callback: secondContext.onFxUnitChannel,
            context: secondContext
        };
        this.mediator.subscribe(secondContextconfig);


        this.mediator.removeContext(firstContext);

        this.mediator.publish('Fx-Unit-ChannelOne');
        this.mediator.publish('Fx-Unit-ChannelTwo');

        assert.notOk(firstContext.onFxUnitChannel.calledOnce, 'first context first call back should not be called');
        assert.notOk(firstContext.onSecondChannel.calledOnce, 'first context second call back should not be called');
        assert.ok(secondContext.onFxUnitChannel.calledOnce, 'second context first call back should  be called');

        setTimeout(function () {
            var subscribed = self.mediator.channelListing();
            var channelFound = _.find(subscribed, function (sub) {
                return sub.context === firstContext;
            });
            assert.notOk(!!channelFound, 'the context which is removed should not be seen in channel list');
            done();
        }, 305);
    });

    /***
     * * SubscFxe and Unsubscribe with underscore helper functions test ***************
     **/

    QUnit.test('Mediator  subscribe with underscore debounce and unsubscribe test', function (assert) {
        var testSpy = sinon.spy();
        var self  = this;
        var context = {
            onFxUnitChannel: _.debounce(testSpy,100)
        };
        var done = assert.async();
        var config = {
            channel: 'Fx-Unit-Channel',
            callback: context.onFxUnitChannel,
            context: context
        };
        self.mediator.subscribe(config);
        self.mediator.publish('Fx-Unit-Channel');
        setTimeout(function(){
          assert.ok(testSpy.called, 'Subscribed Function is Called when published');
          testSpy.reset();
          var unConfig = {
              channel: 'Fx-Unit-Channel',
              context: context,
              callback:  context.onFxUnitChannel
          };
          self.mediator.unsubscribe(unConfig);
          self.mediator.publish('Fx-Unit-Channel');
            setTimeout(function(){
              assert.notOk(testSpy.called, 'Subscribed Function is Called when published');
              done();
            },105);
          },105);
    });

    QUnit.test('Mediator subscribe with underscore bind and unsubscribe test', function (assert) {
        var testSpy = sinon.spy();
        var self  = this;
        var context = {   };
        context.onFxUnitChannel = _.bind(testSpy,context);
        var config = {
            channel: 'Fx-Unit-Channel',
            callback: context.onFxUnitChannel,
            context: context
        };
        self.mediator.subscribe(config);
        self.mediator.publish('Fx-Unit-Channel');

        assert.ok(testSpy.called, 'Subscribed Function is Called when published');
        testSpy.reset();
        var unConfig = {
            channel: 'Fx-Unit-Channel',
            context: context,
            callback:  context.onFxUnitChannel
        };
        self.mediator.unsubscribe(unConfig);
        self.mediator.publish('Fx-Unit-Channel');
        assert.notOk(testSpy.called, 'Subscribed Function is Called when published');
    });

});
