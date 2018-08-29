/*global L*/
'use strict';
/*
 * Class EventDispatcher provides event handling to sub-classes.
 * It is inherited from Publisher, Room, etc.
 */
// getApp().window = getApp().window || {};
// window = getApp().window ;
// window.TK = window.TK || {};
// window.L = window.L || {};
// TK = window.TK;
// L = window.L ;
window = window || {};
window.TK = window.TK || {};
window.L = window.L || {};
TK = window.TK;
L = window.L;

TK.EventDispatcher = function (spec) {
    var that = {};
    spec = spec || {} ;
    var isArray = function (object){
        return  object && typeof object==='object' &&
            typeof object.length==='number' &&
            typeof object.splice==='function' &&
            //判断length属性是否是可枚举的 对于数组 将得到false
            !(object.propertyIsEnumerable('length'));
    }
    // Private vars
    spec.dispatcher = {};
    spec.dispatcher.eventListeners = {};
    spec.dispatcher.backupListerners = {};
    // Public functions

    // It adds an event listener attached to an event type.
    /*添加事件
    * @params eventType:事件类型，String
    * @params listener(recvEventData):事件处理函数  ， Function
    * @params backupid:事件的备份id，String
     * */
    that.addEventListener = function (eventType, listener , backupid ) {
        if(eventType === undefined || eventType === null){
            return;
        }
        if (spec.dispatcher.eventListeners[eventType] === undefined) {
            spec.dispatcher.eventListeners[eventType] = [];
        }
        spec.dispatcher.eventListeners[eventType].push(listener);
        if(backupid){
            if (spec.dispatcher.backupListerners[backupid] === undefined) {
                spec.dispatcher.backupListerners[backupid] = [];
            }
            spec.dispatcher.backupListerners[backupid].push({eventType:eventType ,listener:listener });
        }
    };

    // It removes an available event listener.
    /*删除事件
     * @params eventType:事件类型，String
     * @params listener(recvEventData):添加事件时的处理函数  ， Function
     * */
    that.removeEventListener = function (eventType, listener) {
        var index;
		if(!spec.dispatcher.eventListeners[eventType]){ L.Logger.info('[tk-sdk]not event type: ' +eventType);  return ;} ;
        index = spec.dispatcher.eventListeners[eventType].indexOf(listener);
        if (index !== -1) {
            spec.dispatcher.eventListeners[eventType].splice(index, 1);
        }
    };
	
    // It removes all event listener.
    that.removeAllEventListener = function (eventTypeArr) {
        if( isArray(eventTypeArr) ){
            for(var i in eventTypeArr){
                var eventType = eventTypeArr[i] ;
                delete spec.dispatcher.eventListeners[eventType] ;
            }
        }else if(typeof eventTypeArr === "string"){
			delete spec.dispatcher.eventListeners[eventTypeArr] ;  
		}else if(typeof eventTypeArr === "object"){
            for(var key in eventTypeArr){
                var eventType = key  , listener = eventTypeArr[key];
                that.removeEventListener(eventType , listener);
            }
		}		  
    };

    // It dispatch a new event to the event listeners, based on the type
    // of event. All events are intended to be TalkEvents.
    /*触发事件
    * @params event:事件数据
        event = {
            type:eventTyp , //事件类型(必须) , String
            message:data , //事件数据 ， Json
        }
    * */
    that.dispatchEvent = function (event , log ) {
        var listener;
        log = log!=undefined?log:true ;
        if(log){
            L.Logger.debug('sdk-dispatchEvent , event type: ' + event.type);
        }
        for (listener in spec.dispatcher.eventListeners[event.type]) {
            if (spec.dispatcher.eventListeners[event.type].hasOwnProperty(listener)) {
                spec.dispatcher.eventListeners[event.type][listener](event);
            }
        }
    };

    /*移除所有指定备份id的事件
    * @params backupid:事件备份id , String*/
    that.removeBackupListerner = function (backupid) {
        if(backupid){
            if( spec.dispatcher.backupListerners[backupid] ){
                for(var i=0; i<spec.dispatcher.backupListerners[backupid].length ; i++){
                    var backupListernerInfo = spec.dispatcher.backupListerners[backupid][i] ;
                    that.removeEventListener(backupListernerInfo.eventType , backupListernerInfo.listener);
                }
                spec.dispatcher.backupListerners[backupid].length = 0 ;
                delete spec.dispatcher.backupListerners[backupid] ;
            }
        }
    };

    return that;
};

// **** EVENTS ****

/*
 * Class TalkEvent represents a generic Event in the library.
 * It handles the type of event, that is important when adding
 * event listeners to EventDispatchers and dispatching new events.
 * A TalkEvent can be initialized this way:
 * var event = TalkEvent({type: "room-connected"});
 */
TK.TalkEvent = function (spec) {
    var that = {};

    // Event type. Examples are: 'room-connected', 'stream-added', etc.
    that.type = spec.type;
    that.data = spec.data;

    return that;
};

/*
 * Class RoomEvent represents an Event that happens in a Room. It is a
 * TalkEvent.
 * It is usually initialized as:
 * var roomEvent = RoomEvent({type:"room-connected", streams:[stream1, stream2]});
 * Event types:
 * 'room-connected' - points out that the user has been successfully connected to the room.
 * 'room-disconnected' - shows that the user has been already disconnected.
 */
TK.RoomEvent = function (spec , extraSpec) {
    var that = TK.TalkEvent(spec);

    // A list with the streams that are published in the room.
    that.streams = spec.streams;
    that.message = spec.message;
    that.user = spec.user;
    that.userid = spec.user ? spec.user.id : undefined ;
    if(extraSpec && typeof extraSpec === 'object'){
        for(var key in extraSpec){
            that[key] = extraSpec[key];
        }
    }
    return that;
};

/*
 * Class StreamEvent represents an event related to a stream. It is a TalkEvent.
 * It is usually initialized this way:
 * var streamEvent = StreamEvent({type:"stream-added", stream:stream1});
 * Event types:
 * 'stream-added' - indicates that there is a new stream available in the room.
 * 'stream-removed' - shows that a previous available stream has been removed from the room.
 */
TK.StreamEvent = function (spec , extraSpec) {
    var that = TK.TalkEvent(spec);
    // The stream related to this event.
    that.stream = spec.stream;
    that.message = spec.message;
    that.bandwidth = spec.bandwidth;
    that.attrs = spec.attrs ;
    that.userid = spec.stream && spec.stream.extensionId && spec.stream.getAttributes &&  spec.stream.getAttributes() &&  spec.stream.getAttributes().type ?  spec.stream.extensionId.replace( new RegExp(':'+spec.stream.getAttributes().type , 'g') , '' ) : undefined ;
    that.streamType = spec.stream && spec.stream.extensionId && spec.stream.getAttributes &&  spec.stream.getAttributes() &&  spec.stream.getAttributes().type ?  spec.stream.getAttributes().type : undefined ;
    that.streamInfo = {
        audio:spec.stream &&  spec.stream.hasAudio ? spec.stream.hasAudio() : false ,
        video:spec.stream &&  spec.stream.hasVideo ? spec.stream.hasVideo() : false ,
        attributes:spec.stream && spec.stream.getAttributes ?  spec.stream.getAttributes() : {}
    };
    if(extraSpec && typeof extraSpec === 'object'){
        for(var key in extraSpec){
            that[key] = extraSpec[key];
        }
    }
    return that;
};

/*
 * Class PublisherEvent represents an event related to a publisher. It is a TalkEvent.
 * It usually initializes as:
 * var publisherEvent = PublisherEvent({})
 * Event types:
 * 'access-accepted' - indicates that the user has accepted to share his camera and microphone
 */
TK.PublisherEvent = function (spec , extraSpec) {
    var that = TK.TalkEvent(spec);
    if(extraSpec && typeof extraSpec === 'object'){
        for(var key in extraSpec){
            that[key] = extraSpec[key];
        }
    }
    return that;
};
TK.coreEventController = TK.EventDispatcher({});/*global L, document*/
'use strict';
/*
 * Class Stream represents a local or a remote Stream in the Room. It will handle the WebRTC stream
 * and identify the stream and where it should be drawn.
 */
// getApp().window = getApp().window || {};
// window = getApp().window ;
// window.TK = window.TK || {};
// window.L = window.L || {};
// TK = window.TK;
// L = window.L ;
window = window || {};
window.TK = window.TK || {};
window.L = window.L || {};
TK = window.TK;
L = window.L;

TK.PUBLISH_STATE_NONE = 0; //下台
TK.PUBLISH_STATE_AUDIOONLY = 1; //只发布音频
TK.PUBLISH_STATE_VIDEOONLY = 2; //只发布视频
TK.PUBLISH_STATE_BOTH = 3; //音视频都发布
TK.PUBLISH_STATE_MUTEALL = 4; //音视频都关闭
TK.RoomUser = function (userinfo) {

    if (userinfo == undefined || userinfo.properties === undefined) {
        L.Logger.warning('[tk-sdk]Invalidate user info', id, properties);
        return undefined;
    }

    var id = userinfo.id;
    var properties = userinfo.properties;
    L.Logger.debug('[tk-sdk]RoomUser', id, properties);

    var that={};
    that.id = id;
    that.watchStatus = 0;//0 idel 1 sdp 2 ice 3 streaming 4 canceling  

    for (var key in properties) {
        if (key != 'id' && key != 'watchStatus')
            that[key]=properties[key];
    }

    that.publishstate = that.publishstate || TK.PUBLISH_STATE_NONE;
    return that;
};
/*global document, console*/
'use strict';
// getApp().window = getApp().window || {};
// window = getApp().window ;
// window.TK = window.TK || {};
// window.L = window.L || {};
// TK = window.TK;
// L = window.L ;
window = window || {};
window.TK = window.TK || {};
window.L = window.L || {};
TK = window.TK;
L = window.L;

/*
 * API to write logs based on traditional logging mechanisms: debug, trace, info, warning, error
 */
L.Logger = (function (L) {
    var DEBUG = 0,
        TRACE = 1,
        INFO = 2,
        WARNING = 3,
        ERROR = 4,
        NONE = 5,
        enableLogPanel,
        setLogLevel,
        setOutputFunction,
        setLogPrefix,
        outputFunction,
        logPrefix = '',
        print,
        debug,
        trace,
        info,
        log,
        warning,
        error , 
		setLogDevelopment,
		developmentEnvironment = false;

    // By calling this method we will not use console.log to print the logs anymore.
    // Instead we will use a <textarea/> element to write down future logs
    enableLogPanel = function () {
        L.Logger.panel = document.createElement('textarea');
        L.Logger.panel.setAttribute('id', 'licode-logs');
        L.Logger.panel.setAttribute('style', 'width: 100%; height: 100%; display: none');
        L.Logger.panel.setAttribute('rows', 20);
        L.Logger.panel.setAttribute('cols', 20);
        L.Logger.panel.setAttribute('readOnly', true);
        document.body.appendChild(L.Logger.panel);
    };

    // It sets the new log level. We can set it to NONE if we do not want to print logs
    setLogLevel = function (level) {
        if (level > L.Logger.NONE) {
            level = L.Logger.NONE;
        } else if (level < L.Logger.DEBUG) {
            level = L.Logger.DEBUG;
        }
        L.Logger.logLevel = level;
    };
	
	setLogDevelopment = function(isDevelopmentEnvironment){
		developmentEnvironment = isDevelopmentEnvironment ;
	};
	
    outputFunction = function (args , level) {
        try{
            switch (level){
                case L.Logger.DEBUG:
                    developmentEnvironment ? console.warn.apply(console, args) : console.debug.apply(console, args)  ;
                    break;
                case L.Logger.TRACE:
                    console.trace.apply(console, args);
                    break;
                case L.Logger.INFO:
                    developmentEnvironment ? console.warn.apply(console, args) :  console.info.apply(console, args);
                    break;
                case L.Logger.WARNING:
                    console.warn.apply(console, args);
                    break;
                case L.Logger.ERROR:
                    console.error.apply(console, args);
                    break;
                case L.Logger.NONE:
					console.warn("log level is none!");
                    break;
                default:
                    developmentEnvironment ? console.warn.apply(console, args) : console.log.apply(console, args);
                    break;
            }
        }catch (e){
            console.log.apply(console, args);
        }
    };

    setOutputFunction = function (newOutputFunction) {
        outputFunction = newOutputFunction;
    };

    setLogPrefix = function (newLogPrefix) {
        logPrefix = newLogPrefix;
    };

    // Generic function to print logs for a given level:
    //  L.Logger.[DEBUG, TRACE, INFO, WARNING, ERROR]
    print = function (level) {
        var out = logPrefix;
        if (level < L.Logger.logLevel) {
            return;
        }
        if (level === L.Logger.DEBUG) {
            out = out + 'DEBUG('+new Date().toLocaleString()+')';
        } else if (level === L.Logger.TRACE) {
            out = out + 'TRACE('+new Date().toLocaleString()+')';
        } else if (level === L.Logger.INFO) {
            out = out + 'INFO('+new Date().toLocaleString()+')';
        } else if (level === L.Logger.WARNING) {
            out = out + 'WARNING('+new Date().toLocaleString()+')';
        } else if (level === L.Logger.ERROR) {
            out = out + 'ERROR('+new Date().toLocaleString()+')';
        }
        out = out + ':';
        var args = [];
        for (var i = 0; i < arguments.length; i++) {
            args[i] = arguments[i];
        }
        var tempArgs = args.slice(1);
        args = [out].concat(tempArgs);
        if (L.Logger.panel !== undefined) {
            var tmp = '';
            for (var idx = 0; idx < args.length; idx++) {
                tmp = tmp + args[idx];
            }
            L.Logger.panel.value = L.Logger.panel.value + '\n' + tmp;
        } else {
            outputFunction.apply(L.Logger, [args , level] );
        }
    };

    // It prints debug logs
    debug = function () {
        var args = [];
        for (var i = 0; i < arguments.length; i++) {
            args[i] = arguments[i];
        }
        L.Logger.print.apply(L.Logger,[L.Logger.DEBUG].concat(args));
    };

    // It prints trace logs
    trace = function () {
        var args = [];
        for (var i = 0; i < arguments.length; i++) {
            args[i] = arguments[i];
        }
        L.Logger.print.apply(L.Logger,[L.Logger.TRACE].concat(args));
    };

    // It prints info logs
    info = function () {
        var args = [];
        for (var i = 0; i < arguments.length; i++) {
            args[i] = arguments[i];
        }
        L.Logger.print.apply(L.Logger,[L.Logger.INFO].concat(args));
    };

    // It prints warning logs
    warning = function () {
        var args = [];
        for (var i = 0; i < arguments.length; i++) {
            args[i] = arguments[i];
        }
        L.Logger.print.apply(L.Logger,[L.Logger.WARNING].concat(args));
    };

    // It prints error logs
    error = function () {
        var args = [];
        for (var i = 0; i < arguments.length; i++) {
            args[i] = arguments[i];
        }
        L.Logger.print.apply(L.Logger,[L.Logger.ERROR].concat(args));
    };

    return {
        DEBUG: DEBUG,
        TRACE: TRACE,
        INFO: INFO,
        WARNING: WARNING,
        ERROR: ERROR,
        NONE: NONE,
		setLogDevelopment:setLogDevelopment , 
        enableLogPanel: enableLogPanel,
        setLogLevel: setLogLevel,
        setOutputFunction: setOutputFunction,
        setLogPrefix: setLogPrefix,
        print:print ,
        debug: debug,
        trace: trace,
        info: info,
        warning: warning,
        error: error 
    };
}(L));

/*设置日志输出,通过配置项*/
TK.tkLogPrintConfig =  function (socketLogConfig , loggerConfig , adpConfig ) {
    loggerConfig = loggerConfig || {} ;
    socketLogConfig = socketLogConfig || {} ;
    adpConfig = adpConfig || {} ;
    var development = loggerConfig.development != undefined  ? loggerConfig.development : true;
    var logLevel =  loggerConfig.logLevel  != undefined  ? loggerConfig.logLevel  : 0;
    var debug = socketLogConfig.debug != undefined  ? socketLogConfig.debug  : true ;
    var webrtcLogDebug =  adpConfig.webrtcLogDebug!= undefined  ? adpConfig.webrtcLogDebug : true ;
    L.Logger.setLogDevelopment(development);
    L.Logger.setLogLevel(logLevel);
    if(L.Utils.localStorage){
        var debugStr =  debug ? '*' : 'none';
        L.Utils.localStorage.setItem('debug' ,debugStr );
    }
    window.webrtcLogDebug = webrtcLogDebug;
};

TK.Logger = L.Logger;
/**
 * SDK常量
 * @class L.Constant
 * @description   提供常量存储对象
 * @author QiuShao
 * @date 2017/7/29
 */
'use strict';
// getApp().window = getApp().window || {};
// window = getApp().window ;
// window.TK = window.TK || {};
// window.L = window.L || {};
// TK = window.TK;
// L = window.L ;
window = window || {};
window.TK = window.TK || {};
window.L = window.L || {};
TK = window.TK;
L = window.L;

L.Constant = (function () {
    return {
		roomError:{
			ROOMCONNECTERROR: 0, //room-error：房间连接错误（room-connect）
			GETCONFIGERROR: 1 ,  //room-error：获取配置信息错误(getconfig)
			GETFILELISTERROR: 2 ,  //room-error：获取文件列表错误(getfilelist)
			CHECKROOMERROR: 3, //room-error: checkroom error
		},
        getUserMedia:{
			SUCCESS_ONLY_VIDEO:1 , //getUserMedia 成功，只获取到video
			SUCCESS_ONLY_AUDIO:2 , //getUserMedia 成功，只获取到audio
			SUCCESS_ALL:3 , //getUserMedia 成功，audio和video都获取到了
			SUCCESS_NOT_ALL:4 , //getUserMedia 成功，audio和video都获取不到
			FAILURE_ONLY_VIDEO:-1 , //getUserMedia 失败，只获取video失败
			FAILURE_ONLY_AUDIO:-2 , //getUserMedia 失败，只获取audio失败
			FAILURE_ALL:-3 ,//getUserMedia 失败，获取audio和video失败
			FAILURE_USERMEDIA_AGAIN_ONLY_GET_AUDIO:0 ,//getUserMedia 失败，重新只获取audio而不获取video
			FAILURE_USERMEDIA_AGAIN_ONLY_GET_VIDEO:0 ,//getUserMedia 失败，重新只获取video而不获取aduio
		},
        accessDenied:{
			streamFail:0 , //获取流失败
			notAudioAndVideo:1 , //没有音视频设备
            notAudioAndVideoAndScreenOrUrlNotUndefined:2 , //video、audio、screen都不为真，或者url不是undefined
			ohterError:-1  , //未知的错误
		},
		deviceStorage:{
			audioinput:"audioinputDeviceId" , //localStorage 存储的音频输入设备id
            audiooutput:"audiooutputDeviceId" ,  //localStorage 存储的音频输出设备id
            videoinput:"videoinputDeviceId" ,  //localStorage 存储的视频输入设备id
   	 	},
		streamReconnection:{
            notOnceSuccess:1 , //流的订阅或者发布重连几次后没有一次成功
            midwayReconnectionNotSuccess:2  , //中途udp断了重新连接几次后却没有一次成功的
            midwayReconnectionChangePublishstate_0:3  , //中途重连，但是发布状态被改为0
		},
		getStats:{
			nativeFailure:1 , //是客户端显示的失败
            pcNotGetStats:2 , //pc没有getStats方法
            peerConnectionNotGetStats:3 , //peerConnection没有getStats方法
            getStatsFailure:4 , //peerConnection的getStats失败
            getStatsError:5 , //peerConnection的getStats报错
		},
		udpState:{//udpstate = 1 udp畅通 2 防火墙拦截udp不通（一次都没链接成功）
			ok:1 ,
			notOnceSuccess:2 ,
		},
		localRecord:{
			onlyRecordAudio:0 , //只录制音频
            recordAudioAndVideo:1 , //录制音频和视频
		},
        LOGLEVEL:{
            DEBUG:0, //debug 级别日志
            TRACE: 1, //trace 级别日志
            INFO: 2, //info 级别日志
            WARNING: 3, //warning 级别日志
            ERROR: 4, //error 级别日志
            NONE: 5 //不打印日志
		}
    };
}(L));
/**
 * SDK工具类
 * @class L.Utils
 * @description   提供SDK所需要的工具
 * @author QiuShao
 * @date 2017/7/29
 */
'use strict';
// getApp().window = getApp().window || {};
// window = getApp().window ;
// window.TK = window.TK || {};
// window.L = window.L || {};
// TK = window.TK;
// L = window.L ;
window = window || {};
window.TK = window.TK || {};
window.L = window.L || {};
TK = window.TK;
L = window.L;

L.aexInstance = undefined ;
;(function() {
    var Aes = {};  // Aes namespace

    /**
     * AES Cipher function: encrypt 'input' state with Rijndael algorithm
     *   applies Nr rounds (10/12/14) using key schedule w for 'add round key' stage
     *
     * @param {Number[]} input 16-byte (128-bit) input state array
     * @param {Number[][]} w   Key schedule as 2D byte-array (Nr+1 x Nb bytes)
     * @returns {Number[]}     Encrypted output state array
     */
    Aes.cipher = function(input, w) {    // main Cipher function [§5.1]
        var Nb = 4;               // block size (in words): no of columns in state (fixed at 4 for AES)
        var Nr = w.length/Nb - 1; // no of rounds: 10/12/14 for 128/192/256-bit keys

        var state = [[],[],[],[]];  // initialise 4xNb byte-array 'state' with input [§3.4]
        for (var i=0; i<4*Nb; i++) state[i%4][Math.floor(i/4)] = input[i];

        state = Aes.addRoundKey(state, w, 0, Nb);

        for (var round=1; round<Nr; round++) {
            state = Aes.subBytes(state, Nb);
            state = Aes.shiftRows(state, Nb);
            state = Aes.mixColumns(state, Nb);
            state = Aes.addRoundKey(state, w, round, Nb);
        }

        state = Aes.subBytes(state, Nb);
        state = Aes.shiftRows(state, Nb);
        state = Aes.addRoundKey(state, w, Nr, Nb);

        var output = new Array(4*Nb);  // convert state to 1-d array before returning [§3.4]
        for (var i=0; i<4*Nb; i++) output[i] = state[i%4][Math.floor(i/4)];
        return output;
    }

    /**
     * Perform Key Expansion to generate a Key Schedule
     *
     * @param {Number[]} key Key as 16/24/32-byte array
     * @returns {Number[][]} Expanded key schedule as 2D byte-array (Nr+1 x Nb bytes)
     */
    Aes.keyExpansion = function(key) {  // generate Key Schedule (byte-array Nr+1 x Nb) from Key [§5.2]
        var Nb = 4;            // block size (in words): no of columns in state (fixed at 4 for AES)
        var Nk = key.length/4  // key length (in words): 4/6/8 for 128/192/256-bit keys
        var Nr = Nk + 6;       // no of rounds: 10/12/14 for 128/192/256-bit keys

        var w = new Array(Nb*(Nr+1));
        var temp = new Array(4);

        for (var i=0; i<Nk; i++) {
            var r = [key[4*i], key[4*i+1], key[4*i+2], key[4*i+3]];
            w[i] = r;
        }

        for (var i=Nk; i<(Nb*(Nr+1)); i++) {
            w[i] = new Array(4);
            for (var t=0; t<4; t++) temp[t] = w[i-1][t];
            if (i % Nk == 0) {
                temp = Aes.subWord(Aes.rotWord(temp));
                for (var t=0; t<4; t++) temp[t] ^= Aes.rCon[i/Nk][t];
            } else if (Nk > 6 && i%Nk == 4) {
                temp = Aes.subWord(temp);
            }
            for (var t=0; t<4; t++) w[i][t] = w[i-Nk][t] ^ temp[t];
        }

        return w;
    }

    /*
     * ---- remaining routines are private, not called externally ----
     */

    Aes.subBytes = function(s, Nb) {    // apply SBox to state S [§5.1.1]
        for (var r=0; r<4; r++) {
            for (var c=0; c<Nb; c++) s[r][c] = Aes.sBox[s[r][c]];
        }
        return s;
    }

    Aes.shiftRows = function(s, Nb) {    // shift row r of state S left by r bytes [§5.1.2]
        var t = new Array(4);
        for (var r=1; r<4; r++) {
            for (var c=0; c<4; c++) t[c] = s[r][(c+r)%Nb];  // shift into temp copy
            for (var c=0; c<4; c++) s[r][c] = t[c];         // and copy back
        }          // note that this will work for Nb=4,5,6, but not 7,8 (always 4 for AES):
        return s;  // see asmaes.sourceforge.net/rijndael/rijndaelImplementation.pdf
    }

    Aes.mixColumns = function(s, Nb) {   // combine bytes of each col of state S [§5.1.3]
        for (var c=0; c<4; c++) {
            var a = new Array(4);  // 'a' is a copy of the current column from 's'
            var b = new Array(4);  // 'b' is a•{02} in GF(2^8)
            for (var i=0; i<4; i++) {
                a[i] = s[i][c];
                b[i] = s[i][c]&0x80 ? s[i][c]<<1 ^ 0x011b : s[i][c]<<1;

            }
            // a[n] ^ b[n] is a•{03} in GF(2^8)
            s[0][c] = b[0] ^ a[1] ^ b[1] ^ a[2] ^ a[3]; // 2*a0 + 3*a1 + a2 + a3
            s[1][c] = a[0] ^ b[1] ^ a[2] ^ b[2] ^ a[3]; // a0 * 2*a1 + 3*a2 + a3
            s[2][c] = a[0] ^ a[1] ^ b[2] ^ a[3] ^ b[3]; // a0 + a1 + 2*a2 + 3*a3
            s[3][c] = a[0] ^ b[0] ^ a[1] ^ a[2] ^ b[3]; // 3*a0 + a1 + a2 + 2*a3
        }
        return s;
    }

    Aes.addRoundKey = function(state, w, rnd, Nb) {  // xor Round Key into state S [§5.1.4]
        for (var r=0; r<4; r++) {
            for (var c=0; c<Nb; c++) state[r][c] ^= w[rnd*4+c][r];
        }
        return state;
    }

    Aes.subWord = function(w) {    // apply SBox to 4-byte word w
        for (var i=0; i<4; i++) w[i] = Aes.sBox[w[i]];
        return w;
    }

    Aes.rotWord = function(w) {    // rotate 4-byte word w left by one byte
        var tmp = w[0];
        for (var i=0; i<3; i++) w[i] = w[i+1];
        w[3] = tmp;
        return w;
    }

// sBox is pre-computed multiplicative inverse in GF(2^8) used in subBytes and keyExpansion [§5.1.1]
    Aes.sBox =  [0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
        0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
        0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
        0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
        0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
        0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
        0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
        0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
        0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
        0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
        0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
        0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
        0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
        0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
        0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
        0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16];

// rCon is Round Constant used for the Key Expansion [1st col is 2^(r-1) in GF(2^8)] [§5.2]
    Aes.rCon = [ [0x00, 0x00, 0x00, 0x00],
        [0x01, 0x00, 0x00, 0x00],
        [0x02, 0x00, 0x00, 0x00],
        [0x04, 0x00, 0x00, 0x00],
        [0x08, 0x00, 0x00, 0x00],
        [0x10, 0x00, 0x00, 0x00],
        [0x20, 0x00, 0x00, 0x00],
        [0x40, 0x00, 0x00, 0x00],
        [0x80, 0x00, 0x00, 0x00],
        [0x1b, 0x00, 0x00, 0x00],
        [0x36, 0x00, 0x00, 0x00] ];


    /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
    /*  AES Counter-mode implementation in JavaScript (c) Chris Veness 2005-2012                      */
    /*   - see http://csrc.nist.gov/publications/nistpubs/800-38a/sp800-38a.pdf                       */
    /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

    Aes.Ctr = {};  // Aes.Ctr namespace: a subclass or extension of Aes

    /**
     * Encrypt a text using AES encryption in Counter mode of operation
     *
     * Unicode multi-byte character safe
     *
     * @param {String} plaintext Source text to be encrypted
     * @param {String} password  The password to use to generate a key
     * @param {Number} nBits     Number of bits to be used in the key (128, 192, or 256)
     * @returns {string}         Encrypted text
     */
    Aes.Ctr.encrypt = function(plaintext, password, nBits) {
        password = password  ||  'talk_2018_@beijing_20180310_talk_2018_@beijing' ;
        nBits = nBits || 256 ;
        var blockSize = 16;  // block size fixed at 16 bytes / 128 bits (Nb=4) for AES
        if (!(nBits==128 || nBits==192 || nBits==256)) return '';  // standard allows 128/192/256 bit keys
        plaintext = Utf8.encode(plaintext);
        password = Utf8.encode(password);
        //var t = new Date();  // timer

        // use AES itself to encrypt password to get cipher key (using plain password as source for key
        // expansion) - gives us well encrypted key (though hashed key might be preferred for prod'n use)
        var nBytes = nBits/8;  // no bytes in key (16/24/32)
        var pwBytes = new Array(nBytes);
        for (var i=0; i<nBytes; i++) {  // use 1st 16/24/32 chars of password for key
            pwBytes[i] = isNaN(password.charCodeAt(i)) ? 0 : password.charCodeAt(i);
        }
        var key = Aes.cipher(pwBytes, Aes.keyExpansion(pwBytes));  // gives us 16-byte key
        key = key.concat(key.slice(0, nBytes-16));  // expand key to 16/24/32 bytes long

        // initialise 1st 8 bytes of counter block with nonce (NIST SP800-38A §B.2): [0-1] = millisec,
        // [2-3] = random, [4-7] = seconds, together giving full sub-millisec uniqueness up to Feb 2106
        var counterBlock = new Array(blockSize);

        var nonce = (new Date()).getTime();  // timestamp: milliseconds since 1-Jan-1970
        var nonceMs = nonce%1000;
        var nonceSec = Math.floor(nonce/1000);
        var nonceRnd = Math.floor(Math.random()*0xffff);

        for (var i=0; i<2; i++) counterBlock[i]   = (nonceMs  >>> i*8) & 0xff;
        for (var i=0; i<2; i++) counterBlock[i+2] = (nonceRnd >>> i*8) & 0xff;
        for (var i=0; i<4; i++) counterBlock[i+4] = (nonceSec >>> i*8) & 0xff;

        // and convert it to a string to go on the front of the ciphertext
        var ctrTxt = '';
        for (var i=0; i<8; i++) ctrTxt += String.fromCharCode(counterBlock[i]);

        // generate key schedule - an expansion of the key into distinct Key Rounds for each round
        var keySchedule = Aes.keyExpansion(key);

        var blockCount = Math.ceil(plaintext.length/blockSize);
        var ciphertxt = new Array(blockCount);  // ciphertext as array of strings

        for (var b=0; b<blockCount; b++) {
            // set counter (block #) in last 8 bytes of counter block (leaving nonce in 1st 8 bytes)
            // done in two stages for 32-bit ops: using two words allows us to go past 2^32 blocks (68GB)
            for (var c=0; c<4; c++) counterBlock[15-c] = (b >>> c*8) & 0xff;
            for (var c=0; c<4; c++) counterBlock[15-c-4] = (b/0x100000000 >>> c*8)

            var cipherCntr = Aes.cipher(counterBlock, keySchedule);  // -- encrypt counter block --

            // block size is reduced on final block
            var blockLength = b<blockCount-1 ? blockSize : (plaintext.length-1)%blockSize+1;
            var cipherChar = new Array(blockLength);

            for (var i=0; i<blockLength; i++) {  // -- xor plaintext with ciphered counter char-by-char --
                cipherChar[i] = cipherCntr[i] ^ plaintext.charCodeAt(b*blockSize+i);
                cipherChar[i] = String.fromCharCode(cipherChar[i]);
            }
            ciphertxt[b] = cipherChar.join('');
        }

        // Array.join is more efficient than repeated string concatenation in IE
        var ciphertext = ctrTxt + ciphertxt.join('');
        ciphertext = Base64.encode(ciphertext);  // encode in base64

        //alert((new Date()) - t);
        return ciphertext;
    }

    /**
     * Decrypt a text encrypted by AES in counter mode of operation
     *
     * @param {String} ciphertext Source text to be encrypted
     * @param {String} password   The password to use to generate a key
     * @param {Number} nBits      Number of bits to be used in the key (128, 192, or 256)
     * @returns {String}          Decrypted text
     */
    Aes.Ctr.decrypt = function(ciphertext, password, nBits) {
        password = password  ||  'talk_2018_@beijing_20180310_talk_2018_@beijing' ;
        nBits = nBits || 256 ;
        var blockSize = 16;  // block size fixed at 16 bytes / 128 bits (Nb=4) for AES
        if (!(nBits==128 || nBits==192 || nBits==256)) return '';  // standard allows 128/192/256 bit keys
        ciphertext = Base64.decode(ciphertext);
        password = Utf8.encode(password);
        //var t = new Date();  // timer

        // use AES to encrypt password (mirroring encrypt routine)
        var nBytes = nBits/8;  // no bytes in key
        var pwBytes = new Array(nBytes);
        for (var i=0; i<nBytes; i++) {
            pwBytes[i] = isNaN(password.charCodeAt(i)) ? 0 : password.charCodeAt(i);
        }
        var key = Aes.cipher(pwBytes, Aes.keyExpansion(pwBytes));
        key = key.concat(key.slice(0, nBytes-16));  // expand key to 16/24/32 bytes long

        // recover nonce from 1st 8 bytes of ciphertext
        var counterBlock = new Array(8);
        var ctrTxt = '';
        ctrTxt = ciphertext.slice(0, 8);
        for (var i=0; i<8; i++) counterBlock[i] = ctrTxt.charCodeAt(i);

        // generate key schedule
        var keySchedule = Aes.keyExpansion(key);

        // separate ciphertext into blocks (skipping past initial 8 bytes)
        var nBlocks = Math.ceil((ciphertext.length-8) / blockSize);
        var ct = new Array(nBlocks);
        for (var b=0; b<nBlocks; b++) ct[b] = ciphertext.slice(8+b*blockSize, 8+b*blockSize+blockSize);
        ciphertext = ct;  // ciphertext is now array of block-length strings

        // plaintext will get generated block-by-block into array of block-length strings
        var plaintxt = new Array(ciphertext.length);

        for (var b=0; b<nBlocks; b++) {
            // set counter (block #) in last 8 bytes of counter block (leaving nonce in 1st 8 bytes)
            for (var c=0; c<4; c++) counterBlock[15-c] = ((b) >>> c*8) & 0xff;
            for (var c=0; c<4; c++) counterBlock[15-c-4] = (((b+1)/0x100000000-1) >>> c*8) & 0xff;

            var cipherCntr = Aes.cipher(counterBlock, keySchedule);  // encrypt counter block

            var plaintxtByte = new Array(ciphertext[b].length);
            for (var i=0; i<ciphertext[b].length; i++) {
                // -- xor plaintxt with ciphered counter byte-by-byte --
                plaintxtByte[i] = cipherCntr[i] ^ ciphertext[b].charCodeAt(i);
                plaintxtByte[i] = String.fromCharCode(plaintxtByte[i]);
            }
            plaintxt[b] = plaintxtByte.join('');
        }

        // join array of blocks into single plaintext string
        var plaintext = plaintxt.join('');
        plaintext = Utf8.decode(plaintext);  // decode from UTF8 back to Unicode multi-byte chars

        //alert((new Date()) - t);
        return plaintext;
    }


    /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
    /*  Base64 class: Base 64 encoding / decoding (c) Chris Veness 2002-2012                          */
    /*    note: depends on Utf8 class                                                                 */
    /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

    var Base64 = {};  // Base64 namespace

    Base64.code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

    /**
     * Encode string into Base64, as defined by RFC 4648 [http://tools.ietf.org/html/rfc4648]
     * (instance method extending String object). As per RFC 4648, no newlines are added.
     *
     * @param {String} str The string to be encoded as base-64
     * @param {Boolean} [utf8encode=false] Flag to indicate whether str is Unicode string to be encoded
     *   to UTF8 before conversion to base64; otherwise string is assumed to be 8-bit characters
     * @returns {String} Base64-encoded string
     */
    Base64.encode = function(str, utf8encode) {  // http://tools.ietf.org/html/rfc4648
        utf8encode =  (typeof utf8encode == 'undefined') ? false : utf8encode;
        var o1, o2, o3, bits, h1, h2, h3, h4, e=[], pad = '', c, plain, coded;
        var b64 = Base64.code;

        plain = utf8encode ? str.encodeUTF8() : str;

        c = plain.length % 3;  // pad string to length of multiple of 3
        if (c > 0) { while (c++ < 3) { pad += '='; plain += '\0'; } }
        // note: doing padding here saves us doing special-case packing for trailing 1 or 2 chars

        for (c=0; c<plain.length; c+=3) {  // pack three octets into four hexets
            o1 = plain.charCodeAt(c);
            o2 = plain.charCodeAt(c+1);
            o3 = plain.charCodeAt(c+2);

            bits = o1<<16 | o2<<8 | o3;

            h1 = bits>>18 & 0x3f;
            h2 = bits>>12 & 0x3f;
            h3 = bits>>6 & 0x3f;
            h4 = bits & 0x3f;

            // use hextets to index into code string
            e[c/3] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
        }
        coded = e.join('');  // join() is far faster than repeated string concatenation in IE

        // replace 'A's from padded nulls with '='s
        coded = coded.slice(0, coded.length-pad.length) + pad;

        return coded;
    }

    /**
     * Decode string from Base64, as defined by RFC 4648 [http://tools.ietf.org/html/rfc4648]
     * (instance method extending String object). As per RFC 4648, newlines are not catered for.
     *
     * @param {String} str The string to be decoded from base-64
     * @param {Boolean} [utf8decode=false] Flag to indicate whether str is Unicode string to be decoded
     *   from UTF8 after conversion from base64
     * @returns {String} decoded string
     */
    Base64.decode = function(str, utf8decode) {
        utf8decode =  (typeof utf8decode == 'undefined') ? false : utf8decode;
        var o1, o2, o3, h1, h2, h3, h4, bits, d=[], plain, coded;
        var b64 = Base64.code;

        coded = utf8decode ? str.decodeUTF8() : str;


        for (var c=0; c<coded.length; c+=4) {  // unpack four hexets into three octets
            h1 = b64.indexOf(coded.charAt(c));
            h2 = b64.indexOf(coded.charAt(c+1));
            h3 = b64.indexOf(coded.charAt(c+2));
            h4 = b64.indexOf(coded.charAt(c+3));

            bits = h1<<18 | h2<<12 | h3<<6 | h4;

            o1 = bits>>>16 & 0xff;
            o2 = bits>>>8 & 0xff;
            o3 = bits & 0xff;

            d[c/4] = String.fromCharCode(o1, o2, o3);
            // check for padding
            if (h4 == 0x40) d[c/4] = String.fromCharCode(o1, o2);
            if (h3 == 0x40) d[c/4] = String.fromCharCode(o1);
        }
        plain = d.join('');  // join() is far faster than repeated string concatenation in IE

        return utf8decode ? plain.decodeUTF8() : plain;
    }


    /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
    /*  Utf8 class: encode / decode between multi-byte Unicode characters and UTF-8 multiple          */
    /*              single-byte character encoding (c) Chris Veness 2002-2012                         */
    /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

    var Utf8 = {};  // Utf8 namespace

    /**
     * Encode multi-byte Unicode string into utf-8 multiple single-byte characters
     * (BMP / basic multilingual plane only)
     *
     * Chars in range U+0080 - U+07FF are encoded in 2 chars, U+0800 - U+FFFF in 3 chars
     *
     * @param {String} strUni Unicode string to be encoded as UTF-8
     * @returns {String} encoded string
     */
    Utf8.encode = function(strUni) {
        // use regular expressions & String.replace callback function for better efficiency
        // than procedural approaches
        var strUtf = strUni.replace(
            /[\u0080-\u07ff]/g,  // U+0080 - U+07FF => 2 bytes 110yyyyy, 10zzzzzz
            function(c) {
                var cc = c.charCodeAt(0);
                return String.fromCharCode(0xc0 | cc>>6, 0x80 | cc&0x3f); }
        );
        strUtf = strUtf.replace(
            /[\u0800-\uffff]/g,  // U+0800 - U+FFFF => 3 bytes 1110xxxx, 10yyyyyy, 10zzzzzz
            function(c) {
                var cc = c.charCodeAt(0);
                return String.fromCharCode(0xe0 | cc>>12, 0x80 | cc>>6&0x3F, 0x80 | cc&0x3f); }
        );
        return strUtf;
    }

    /**
     * Decode utf-8 encoded string back into multi-byte Unicode characters
     *
     * @param {String} strUtf UTF-8 string to be decoded back to Unicode
     * @returns {String} decoded string
     */
    Utf8.decode = function(strUtf) {
        // note: decode 3-byte chars first as decoded 2-byte strings could appear to be 3-byte char!
        var strUni = strUtf.replace(
            /[\u00e0-\u00ef][\u0080-\u00bf][\u0080-\u00bf]/g,  // 3-byte chars
            function(c) {  // (note parentheses for precence)
                var cc = ((c.charCodeAt(0)&0x0f)<<12) | ((c.charCodeAt(1)&0x3f)<<6) | ( c.charCodeAt(2)&0x3f);
                return String.fromCharCode(cc); }
        );
        strUni = strUni.replace(
            /[\u00c0-\u00df][\u0080-\u00bf]/g,                 // 2-byte chars
            function(c) {  // (note parentheses for precence)
                var cc = (c.charCodeAt(0)&0x1f)<<6 | c.charCodeAt(1)&0x3f;
                return String.fromCharCode(cc); }
        );
        return strUni;
    }

    L.aexInstance = Aes.Ctr ;
})();

L.Utils = ( function () {
    var _handleFunction = undefined ;
    var loged = {
        localStorage:false ,
        sessionStorage:false ,
    };
    _handleFunction = {
        handleMediaPlayOnEvent:function ( mediaElement  , mediaElementId){
             try{
                 L.Utils.removeEvent( mediaElement , 'canplay' ,  _handleFunction.handleMediaPlayOnEvent.bind(null , mediaElement , mediaElementId ) ) ;
                 L.Utils.removeEvent( mediaElement , 'loadedmetadata' ,  _handleFunction.handleMediaPlayOnEvent.bind(null , mediaElement , mediaElementId  ) ) ;
                 L.Utils.removeEvent( mediaElement , 'loadeddata' ,  _handleFunction.handleMediaPlayOnEvent.bind(null , mediaElement , mediaElementId  ) ) ;
                 if(mediaElement && mediaElement.play && typeof mediaElement.play === 'function'){
                     var playHandler = mediaElement.play();
                     if(playHandler && playHandler.catch && typeof playHandler.catch === 'function'){
                         playHandler.catch(function (err) {
                             L.Logger.error('[tk-sdk]media play err:' , L.Utils.toJsonStringify(err)   ,  (mediaElementId ? (' , media element id is '+mediaElementId) : (' media element:')  ) , (!mediaElementId?mediaElement:''));
                         })
                     }
                 }
             }catch (error){
                 L.Logger.error('[tk-sdk]media play error:' ,  L.Utils.toJsonStringify(error)   ,  (mediaElementId ? (' , media element id is '+mediaElementId) : (' media element:')  ) , (!mediaElementId?mediaElement:''));
             }
         },
        handleMediaPauseOnEvent:function ( mediaElement, mediaElementId){
            try{
                L.Utils.removeEvent( mediaElement , 'canplay' ,  _handleFunction.handleMediaPauseOnEvent.bind(null , mediaElement , mediaElementId ) ) ;
                L.Utils.removeEvent( mediaElement , 'loadedmetadata' ,  _handleFunction.handleMediaPauseOnEvent.bind(null , mediaElement , mediaElementId  ) ) ;
                L.Utils.removeEvent( mediaElement , 'loadeddata' ,  _handleFunction.handleMediaPauseOnEvent.bind(null , mediaElement , mediaElementId  ) ) ;
                if(mediaElement && mediaElement.pause && typeof mediaElement.pause === 'function'){
                    var pauseHandler = mediaElement.pause();
                    if(pauseHandler && pauseHandler.catch && typeof pauseHandler.catch === 'function'){
                        pauseHandler.catch(function (err) {
                            L.Logger.error('[tk-sdk]media pause err:' , L.Utils.toJsonStringify(err)   ,  (mediaElementId ? (' , media element id is '+mediaElementId) : (' media element:')  ) , (!mediaElementId?mediaElement:''));
                        })
                    }
                }
            }catch (error){
                L.Logger.error('[tk-sdk]media pause error:' ,  L.Utils.toJsonStringify(error)   ,  (mediaElementId ? (' , media element id is '+mediaElementId) : (' media element:')  ) , (!mediaElementId?mediaElement:''));
            }
        }
    };
    return {
        /**绑定事件
         @method addEvent
         @param   {element} element 添加事件元素
         {string} eType 事件类型
         {Function} handle 事件处理器
         {Bollean} bol false 表示在事件第三阶段（冒泡）触发，true表示在事件第一阶段（捕获）触发。
         */
        addEvent:function(element, eType, handle, bol ){
           bol = (bol!=undefined && bol!=null)?bol:false ;
            if(element.addEventListener){           //如果支持addEventListener
                element.addEventListener(eType, handle, bol);
            }else if(element.attachEvent){          //如果支持attachEvent
                element.attachEvent("on"+eType, handle);
            }else{                                  //否则使用兼容的onclick绑定
                element["on"+eType] = handle;
            }
        },
        /**事件解绑
         @method addEvent
         @param   {element} element 添加事件元素
         {string} eType 事件类型
         {Function} handle 事件处理器
         {Bollean} bol false 表示在事件第三阶段（冒泡）触发，true表示在事件第一阶段（捕获）触发。
         */
        removeEvent:function(element, eType, handle, bol ) {
            bol = (bol!=undefined && bol!=null)?bol:false ;
            if(element.removeEventListener){
                element.removeEventListener(eType, handle, bol);
            }else if(element.detachEvent){
                element.detachEvent("on"+eType, handle);
            }else{
                element["on"+eType] = null;
            }
        },
        /*toStringify*/
        toJsonStringify:function (json , isChange) {
            isChange = isChange!=undefined?isChange:true;
            if(!isChange){
                return json ;
            }
            if(!json){
                return json ;
            }
            try{
                if( typeof  json !== 'object'){
                    // L.Logger.debug('[tk-sdk]toJsonStringify:json must is object!');
                    return json ;
                }
                var jsonString = JSON.stringify(json);
                if(jsonString){
                    json = jsonString ;
                }else{
                    L.Logger.debug('[tk-sdk]toJsonStringify:data is not json!');
                }
            }catch (e){
                L.Logger.debug('[tk-sdk]toJsonStringify:data is not json!');
            }
            return json ;
        },
        /*toParse*/
        toJsonParse:function (jsonStr , isChange) {
            isChange = isChange!=undefined?isChange:true;
            if(!isChange){
                return jsonStr ;
            }
            if(!jsonStr){
                return jsonStr ;
            }
            try{
                if( typeof  jsonStr !== 'string'){
                    // L.Logger.debug('[tk-sdk]toJsonParse:jsonStr must is string!');
                    return jsonStr ;
                }
                var json =  JSON.parse(jsonStr);
                if(json){
                    jsonStr = json;
                }else{
                    L.Logger.debug('[tk-sdk]toJsonParse:data is not json string!');
                }
            }catch (e){
                L.Logger.debug('[tk-sdk]toJsonParse:data is not json string!');
            }
            return jsonStr ;
        },
        /**
         * 加密函数
         * @param str 待加密字符串
         * @returns {string}
         */
        encrypt: function(str , encryptRandom  , encryptKey , encryptBit) {
            if(!str){return str;}
            encryptKey = encryptKey || TK.hexEncryptDecryptKey  ;
            encryptBit = encryptBit || TK.hexEncryptDecryptBit  ;
            encryptRandom = encryptRandom != undefined ? encryptRandom : 'talk_2018_@beijing' ;
            var out = L.aexInstance.encrypt(str ,encryptKey  ,encryptBit);
            out = encryptRandom + out + encryptRandom ;
            return out
        },
        /**
         * 解密函数
         * @param str 待解密字符串
         * @returns {string}*/
        decrypt: function(str , encryptRandom , encryptKey , encryptBit){
            if(!str){return str;}
            encryptKey = encryptKey || TK.hexEncryptDecryptKey  ;
            encryptBit = encryptBit || TK.hexEncryptDecryptBit  ;
            encryptRandom = encryptRandom != undefined ? encryptRandom : 'talk_2018_@beijing' ;
            var regExp = new RegExp( encryptRandom , 'gm' ) ;
            str = str.replace( regExp , '' );
            var out = L.aexInstance.decrypt(str ,encryptKey  ,encryptBit);
            return out
        },
        /*媒体文件的播放*/
        mediaPlay:function(mediaElement){
            var mediaElementId = undefined ;
            if(mediaElement && typeof mediaElement === 'string'){
                mediaElement = document.getElementById(mediaElement);
            }else if(mediaElement &&  /(audio|video)/g.test(mediaElement.nodeName.toLowerCase()) && mediaElement.getAttribute && typeof mediaElement.getAttribute === 'function'){
                mediaElementId = mediaElement.getAttribute('id');
            }
            if(mediaElement &&  /(audio|video)/g.test(mediaElement.nodeName.toLowerCase()) ){
                if(mediaElement.readyState !== 0){
                    _handleFunction.handleMediaPlayOnEvent(mediaElement , mediaElementId);
                }else{
                    L.Utils.removeEvent( mediaElement , 'canplay' ,  _handleFunction.handleMediaPlayOnEvent.bind(null , mediaElement , mediaElementId ) ) ;
                    L.Utils.removeEvent( mediaElement , 'loadedmetadata' ,  _handleFunction.handleMediaPlayOnEvent.bind(null , mediaElement , mediaElementId  ) ) ;
                    L.Utils.removeEvent( mediaElement , 'loadeddata' ,  _handleFunction.handleMediaPlayOnEvent.bind(null , mediaElement , mediaElementId  ) ) ;
                    L.Utils.addEvent(mediaElement  , 'canplay'  , _handleFunction.handleMediaPlayOnEvent.bind(null , mediaElement  , mediaElementId ) ) ;
                    L.Utils.addEvent(mediaElement  , 'loadedmetadata'  , _handleFunction.handleMediaPlayOnEvent.bind(null , mediaElement , mediaElementId  ) ) ;
                    L.Utils.addEvent(mediaElement  , 'loadeddata'  , _handleFunction.handleMediaPlayOnEvent.bind(null , mediaElement  , mediaElementId ) ) ;
                }
            }
        },
        /*媒体文件的播放*/
        mediaPause:function(mediaElement){
            var mediaElementId = undefined ;
            if(mediaElement && typeof mediaElement === 'string'){
                mediaElement = document.getElementById(mediaElement);
            }else if(mediaElement &&  /(audio|video)/g.test(mediaElement.nodeName.toLowerCase()) && mediaElement.getAttribute && typeof mediaElement.getAttribute === 'function'){
                mediaElementId = mediaElement.getAttribute('id');
            }
            if(mediaElement &&  /(audio|video)/g.test(mediaElement.nodeName.toLowerCase()) ){
                if(mediaElement.readyState !== 0){
                    _handleFunction.handleMediaPauseOnEvent(mediaElement , mediaElementId);
                }else{
                    L.Utils.removeEvent( mediaElement , 'canplay' ,  _handleFunction.handleMediaPauseOnEvent.bind(null , mediaElement , mediaElementId ) ) ;
                    L.Utils.removeEvent( mediaElement , 'loadedmetadata' ,  _handleFunction.handleMediaPauseOnEvent.bind(null , mediaElement , mediaElementId  ) ) ;
                    L.Utils.removeEvent( mediaElement , 'loadeddata' ,  _handleFunction.handleMediaPauseOnEvent.bind(null , mediaElement , mediaElementId  ) ) ;
                    L.Utils.addEvent(mediaElement  , 'canplay'  , _handleFunction.handleMediaPauseOnEvent.bind(null , mediaElement  , mediaElementId ) ) ;
                    L.Utils.addEvent(mediaElement  , 'loadedmetadata'  , _handleFunction.handleMediaPauseOnEvent.bind(null , mediaElement , mediaElementId  ) ) ;
                    L.Utils.addEvent(mediaElement  , 'loadeddata'  , _handleFunction.handleMediaPauseOnEvent.bind(null , mediaElement  , mediaElementId ) ) ;
                }
            }
        },
        /*本地存储*/
        localStorage:{
            setItem:function (key,value) {
                try{
                    if(window.localStorage){
                        if(window.localStorage.setItem){
                            window.localStorage.setItem(key , value);
                        }else{
                            L.Logger.warning('[tk-sdk]Browser does not support localStorage.setItem , key is '+key+' , value is '+value+'!');
                        }
                    }else{
                        if(!loged.localStorage){
                            loged.localStorage = true ;
                            L.Logger.warning('[tk-sdk]Browser does not support localStorage!');
                        }
                    }
                }catch (err){
                    if(!loged.localStorage){
                        loged.localStorage = true ;
                        L.Logger.warning('[tk-sdk]Browser does not support localStorage , error info:' , L.Utils.toJsonStringify(err) );
                    }
                }
            },
            getItem:function (key) {
                try{
                    if(window.localStorage){
                        if(window.localStorage.getItem){
                           return window.localStorage.getItem(key);
                        }else{
                            L.Logger.warning('[tk-sdk]Browser does not support localStorage.getItem , key is '+key+' !');
                            return "" ;
                        }
                    }else{
                        if(!loged.localStorage){
                            loged.localStorage = true ;
                            L.Logger.warning('[tk-sdk]Browser does not support localStorage!');
                        }
                        return "" ;
                    }
                }catch (err){
                    if(!loged.localStorage){
                        loged.localStorage = true ;
                        L.Logger.warning('[tk-sdk]Browser does not support localStorage , error info:' , L.Utils.toJsonStringify(err) );
                    }
                    return "" ;
                }
            },
            removeItem:function (key) {
                try{
                    if(window.localStorage){
                        if(window.localStorage.removeItem){
                            return window.localStorage.removeItem(key);
                        }else{
                            L.Logger.warning('[tk-sdk]Browser does not support localStorage.removeItem , key is '+key+' !');
                            return "" ;
                        }
                    }else{
                        if(!loged.localStorage){
                            loged.localStorage = true ;
                            L.Logger.warning('[tk-sdk]Browser does not support localStorage!');
                        }
                        return "" ;
                    }
                }catch (err){
                    if(!loged.localStorage){
                        loged.localStorage = true ;
                        L.Logger.warning('[tk-sdk]Browser does not support localStorage , error info:' , L.Utils.toJsonStringify(err) );
                    }
                    return "" ;
                }
            }
        },
        /*会话存储*/
        sessionStorage:{
            setItem:function (key,value) {
                try{
                    if(window.sessionStorage){
                        if(window.sessionStorage.setItem){
                            window.sessionStorage.setItem(key , value);
                        }else{
                            L.Logger.warning('[tk-sdk]Browser does not support sessionStorage.setItem , key is '+key+' , value is '+value+'!');
                        }
                    }else{
                        if(!loged.sessionStorage){
                            loged.sessionStorage = true ;
                            L.Logger.warning('[tk-sdk]Browser does not support sessionStorage!');
                        }
                    }
                }catch (err){
                    if(!loged.sessionStorage){
                        loged.sessionStorage = true ;
                        L.Logger.warning('[tk-sdk]Browser does not support sessionStorage , error info:' , L.Utils.toJsonStringify(err) );
                    }
                }
            },
            getItem:function (key) {
                try{
                    if(window.sessionStorage){
                        if(window.sessionStorage.getItem){
                            return window.sessionStorage.getItem(key);
                        }else{
                            L.Logger.warning('[tk-sdk]Browser does not support sessionStorage.getItem , key is '+key+' !');
                            return "" ;
                        }
                    }else{
                        if(!loged.sessionStorage){
                            loged.sessionStorage = true ;
                            L.Logger.warning('[tk-sdk]Browser does not support sessionStorage!');
                        }
                        return "" ;
                    }
                }catch (err){
                    if(!loged.sessionStorage){
                        loged.sessionStorage = true ;
                        L.Logger.warning('[tk-sdk]Browser does not support sessionStorage , error info:' , L.Utils.toJsonStringify(err) );
                    }
                    return "" ;
                }
            },
            removeItem:function (key) {
                try{
                    if(window.sessionStorage){
                        if(window.sessionStorage.removeItem){
                            return window.sessionStorage.removeItem(key);
                        }else{
                            L.Logger.warning('[tk-sdk]Browser does not support sessionStorage.removeItem , key is '+key+' !');
                            return "" ;
                        }
                    }else{
                        if(!loged.sessionStorage){
                            loged.sessionStorage = true ;
                            L.Logger.warning('[tk-sdk]Browser does not support sessionStorage!');
                        }
                        return "" ;
                    }
                }catch (err){
                    if(!loged.sessionStorage){
                        loged.sessionStorage = true ;
                        L.Logger.warning('[tk-sdk]Browser does not support sessionStorage , error info:' , L.Utils.toJsonStringify(err) );
                    }
                    return "" ;
                }
            }
        } ,
        /*获取浏览器基本信息*/
        getBrowserInfo: function(){
            var userAgent=window.navigator.userAgent ,
            rMsie=/(msie\s|trident.*rv:)([\w.]+)/,
            rEdge=/edge\/(\d+).(\d+)$/,
            rFirefox=/(firefox)\/([\w.]+)/,
            rOpera=/(opera).+version\/([\w.]+)/,
            rChrome=/(chrome)\/([\w.]+)/,
            rSafari=/version\/([\w.]+).*(safari)/;
            var uaMatch  = function(ua){
                var match=rMsie.exec(ua);
                if(match) {
                    return {browser:"IE",version:match[2] || "0"};
                }
                match=rEdge.exec(ua);
                if(match) {
                    return {browser:"Edge",version:match[2] || "0"};
                }
                match=rFirefox.exec(ua);
                if(match) {
                    return {browser:match[1] || "Firefox",version:match[2] || "0"};
                }
                match=rOpera.exec(ua);
                if(match) {
                    return {browser:match[1] || "Opera",version:match[2] || "0"};
                }
                match=rChrome.exec(ua);
                if(match) {
                    return {browser:match[1] || "Chrome",version:match[2] || "0"};
                }
                match=rSafari.exec(ua);
                if(match) {
                    return {browser:match[2] || "Safari",version:match[1] || "0"};
                }
                return {browser:"unknown",version:"unknown"};
            };
            var browserMatch=uaMatch( userAgent.toLowerCase() );
            var language = (navigator.browserLanguage || navigator.systemLanguage || navigator.userLanguage || navigator.language ) ;
            //判断访问终端
            var browser={
                versions:function(){
                    var u = navigator.userAgent, app = navigator.appVersion;
                    return {
                        edge: u.indexOf('Edge') > -1, //edge内核
                        trident: u.indexOf('Trident') > -1, //IE内核
                        presto: u.indexOf('Presto') > -1, //opera内核
                        webKit: u.indexOf('AppleWebKit') > -1, //苹果、谷歌内核
                        gecko: u.indexOf('Gecko') > -1 && u.indexOf('KHTML') == -1,//火狐内核
                        mobile: !!u.match(/AppleWebKit.*Mobile.*/), //是否为移动终端
                        ios: !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/), //ios终端
                        android: u.indexOf('Android') > -1 || u.indexOf('Linux') > -1, //android终端或者uc浏览器
                        iPhone: u.indexOf('iPhone') > -1 , //是否为iPhone或者QQHD浏览器
                        iPad: u.indexOf('iPad') > -1, //是否iPad
                        webApp: u.indexOf('Safari') == -1 //是否web应该程序，没有头部与底部
                    };
                }(),
                language:language ? language.toLowerCase() : undefined ,
                info:{
                    browserName:browserMatch.browser , //浏览器使用的版本名字
                    browserVersion:browserMatch.version ,//浏览器使用的版本号
                    appCodeName:navigator.appCodeName , //返回浏览器的代码名。
                    appMinorVersion:navigator.appMinorVersion , //返回浏览器的次级版本。
                    appName:navigator.appName , //返回浏览器的名称。
                    appVersion:navigator.appVersion ,  //	返回浏览器的平台和版本信息。
                    browserLanguage:navigator.browserLanguage , //	返回当前浏览器的语言。
                    cookieEnabled: navigator.cookieEnabled , //	返回指明浏览器中是否启用 cookie 的布尔值。
                    cpuClass:navigator.cpuClass , //	返回浏览器系统的 CPU 等级。
                    onLine:navigator.onLine , //	返回指明系统是否处于脱机模式的布尔值。
                    platform:navigator.platform , //	返回运行浏览器的操作系统平台。
                    systemLanguage:navigator.systemLanguage ,  //返回 OS 使用的默认语言。
                    userAgent:navigator.userAgent , //返回由客户机发送服务器的 user-agent 头部的值。
                    userLanguage:navigator.userLanguage , //	返回 OS 的自然语言设置。
                }
            };
            return browser ;
        },
        /*获取json的长度*/
        getJsonLength:function( json ){
            var length = 0 ;
            if( typeof json === 'object' ){
                for( var key in json ){
                    if( json.hasOwnProperty(key) ){
                        ++length ;
                    }
                }
            }
            return length ;
        } ,
        /*返回操作系统*/
        detectOS:function(){
            try{
                var sUserAgent = navigator.userAgent;
                var isWin = (navigator.platform === "Win32") || (navigator.platform === "Windows");
                var isMac = (navigator.platform === "Mac68K") || (navigator.platform === "MacPPC") || (navigator.platform === "Macintosh") || (navigator.platform === "MacIntel");
                if (isMac) return "Mac";
                var isUnix = (navigator.platform === "X11") && !isWin && !isMac;
                if (isUnix) return "Unix";
                var isLinux = (String(navigator.platform).indexOf("Linux") > -1);
                if (isLinux) return "Linux";
                if (isWin) {
                    var isWin2K = sUserAgent.indexOf("Windows NT 5.0") > -1 || sUserAgent.indexOf("Windows 2000") > -1;
                    if (isWin2K) return "Win2000";
                    var isWinXP = sUserAgent.indexOf("Windows NT 5.1") > -1 || sUserAgent.indexOf("Windows XP") > -1;
                    if (isWinXP) return "WinXP";
                    var isWin2003 = sUserAgent.indexOf("Windows NT 5.2") > -1 || sUserAgent.indexOf("Windows 2003") > -1;
                    if (isWin2003) return "Win2003";
                    var isWinVista= sUserAgent.indexOf("Windows NT 6.0") > -1 || sUserAgent.indexOf("Windows Vista") > -1;
                    if (isWinVista) return "WinVista";
                    var isWin7 = sUserAgent.indexOf("Windows NT 6.1") > -1 || sUserAgent.indexOf("Windows 7") > -1;
                    if (isWin7) return "Win7";
                    var isWin8 = sUserAgent.indexOf("Windows NT 6.2") > -1 || sUserAgent.indexOf("Windows 8") > -1;
                    if (isWin8) return "Win8";
                    var isWin10 = sUserAgent.indexOf("Windows NT 10.0") > -1 || sUserAgent.indexOf("Windows 10") > -1;
                    if (isWin10) return "Win10";
                }
                return "Other";
            }catch (err){
                 L.Logger.error('[tk-sdk]detectOS method error:' ,err);
                return "Other";
            }
        },
        isFunction:function (arg) {
            return (typeof arg === "function");
        },
        isString:function (arg) {
            return (typeof arg === 'string');
        },
        isNumber:function (arg) {
            return (typeof arg === 'number');
        },
        isBoolean:function (arg) {
            return (typeof arg === 'boolean');
        },
        isNull:function (arg) {
            return ( !arg && (arg !== 0) && typeof arg !== "boolean" );
        },
        getFileName:function(fullName) {
            if (typeof fullName !== 'string') {
                return '';
            }
            var idx1 = fullName.lastIndexOf('/');
            var idx2 = fullName.lastIndexOf('\\');
            var idx = Math.max(idx1, idx2);
            return fullName.substring(idx + 1);
        },
        cloneMediaStream:function(mediaStream, cloneAudioTrack, cloneVideoTrack){
            cloneAudioTrack = typeof cloneAudioTrack === 'boolean' ? cloneAudioTrack : true ;
            cloneVideoTrack = typeof cloneVideoTrack === 'boolean' ? cloneVideoTrack : true ;
            if(!mediaStream){
                return mediaStream ;
            }
            var _cloneMediaStreamInner = function () {
                  var tempMediaStreamClone = mediaStream && typeof mediaStream.clone === 'function' ? mediaStream.clone() : undefined;
                  if( !tempMediaStreamClone ){
                      return mediaStream ;
                  }
                if(tempMediaStreamClone && tempMediaStreamClone.getTracks().length > 0){
                    for(var i = tempMediaStreamClone.getTracks().length - 1 ; i >= 0 ; i-- ){
                        var track = tempMediaStreamClone.getTracks()[i];
                        track.stop();
                        tempMediaStreamClone.removeTrack(track);
                    }
                }
                var mediaStreamClone = tempMediaStreamClone && typeof tempMediaStreamClone.clone === 'function' ? tempMediaStreamClone.clone() : undefined;
                tempMediaStreamClone = undefined ;
                if(!mediaStreamClone){
                    return mediaStream ;
                }
                if(cloneAudioTrack){
                    if( mediaStream.getAudioTracks().length > 0){
                        for(var i = 0 , length = mediaStream.getAudioTracks().length  ; i < length ; i++ ){
                            var audioTrack = mediaStream.getAudioTracks()[i];
                            mediaStreamClone.addTrack( L.Utils.isFunction(audioTrack.clone) ? audioTrack.clone() : audioTrack  );
                        }
                    }
                }
                if(cloneVideoTrack){
                    if( mediaStream.getVideoTracks().length > 0){
                        for(var i = 0 , length = mediaStream.getVideoTracks().length  ; i < length ; i++ ){
                            var videoTrack = mediaStream.getVideoTracks()[i];
                            mediaStreamClone.addTrack( L.Utils.isFunction(videoTrack.clone) ? videoTrack.clone() : videoTrack );
                        }
                    }
                }
                return mediaStreamClone ;
            };
            if(window.MediaStream && typeof window.MediaStream === 'function'){
                try{
                    var mediaStreamClone = new window.MediaStream();
                    if(cloneAudioTrack){
                        if( mediaStream.getAudioTracks().length > 0){
                            for(var i = 0 , length = mediaStream.getAudioTracks().length  ; i < length ; i++ ){
                                var audioTrack = mediaStream.getAudioTracks()[i];
                                mediaStreamClone.addTrack( L.Utils.isFunction(audioTrack.clone) ? audioTrack.clone() : audioTrack );
                            }
                        }
                    }
                    if(cloneVideoTrack){
                        if( mediaStream.getVideoTracks().length > 0){
                            for(var i = 0 , length = mediaStream.getVideoTracks().length  ; i < length ; i++ ){
                                var videoTrack = mediaStream.getVideoTracks()[i];
                                mediaStreamClone.addTrack( L.Utils.isFunction(videoTrack.clone) ? videoTrack.clone() : videoTrack );
                            }
                        }
                    }
                    return mediaStreamClone;
                }catch (err){
                    return _cloneMediaStreamInner();
                }
            }else{
                return _cloneMediaStreamInner();
            }
        }
    };
}(L));/**
 * SDK状态码
 * @class StatusCode
 * @description   提供状态码
 * @author QiuShao
 * @date 2018/06/08
 * */
'use strict';
// getApp().window = getApp().window || {};
// window = getApp().window ;
// window.TK = window.TK || {};
// window.L = window.L || {};
// TK = window.TK;
// L = window.L ;
window = window || {};
window.TK = window.TK || {};
window.L = window.L || {};
TK = window.TK;
L = window.L;

/*错误码*/
window.TK_ERR = {
    DEVICE_ERROR_UnknownError:10000 , //设备不可用错误码
    DEVICE_ERROR_NotFoundError:10001 , //没有找到设备错误码
    DEVICE_ERROR_NotAllowedError:10002 , //设备没有授权错误码
    DEVICE_ERROR_NotReadableError:10003 , //设备占用错误码
    DEVICE_ERROR_OverconstrainedError:10004 , //设备无法满足约束配置错误码
    DEVICE_ERROR_TypeError:10005 , //设备约束对象为空或者约束都设置为false错误码
    TIMEOUT_ERROR:10006, //超时错误码
};

/*视频mode常量*/
window.TK_VIDEO_MODE = {
    ASPECT_RATIO_CONTAIN:20001 , //视频默认模式（不裁剪）
    ASPECT_RATIO_COVER:20002 , //视频裁剪模式
};

/*角色常量*/
window.TK.ROOM_ROLE = {
    TEACHER:0 , //老师（主讲）
    ASSISTANT:1 , //助教
    STUDENT:2 , //学生
    AUDIT:3 , //旁听（直播用户）
    PATROL:4 , //巡检员（巡课）
    SYSTEM_ADMIN:10 , //系统管理员
    ENTERPRISE_ADMIN:11 , //企业管理员
    ADMIN:12 , //管理员
    PLAYBACK:-1 , //回放者
};

/*房间模式*/
window.TK.ROOM_MODE = {
    NORMAL_ROOM:'normalRoom',
    BIG_ROOM:'bigRoom',
};

/*错误通知*/
window.TK.ERROR_NOTICE = {
    PUBLISH_AUDIO_VIDEO_FAILURE:40001, //发布音视频失败
    SHARE_MEDIA_FAILURE:40003, //共享媒体文件失败
    SHARE_FILE_FAILURE:40004, //共享本地媒体文件失败
    SHARE_SCREEN_FAILURE:40005, //共享屏幕失败
    SUBSCRIBE_AUDIO_VIDEO_FAILURE:40007, //订阅音视频失败
    SUBSCRIBE_MEDIA_FAILURE:40008, //订阅媒体文件失败
    SUBSCRIBE_FILE_FAILURE:40009, //订阅本地媒体文件失败
    SUBSCRIBE_SCREEN_FAILURE:40010, //订阅屏幕共享失败
    UNSUBSCRIBE_AUDIO_VIDEO_FAILURE:40013, //取消订阅音视频失败
    UNSUBSCRIBE_MEDIA_FAILURE:40014, //取消订阅媒体文件失败
    UNSUBSCRIBE_FILE_FAILURE:40015, //取消订阅本地媒体文件失败
    UNSUBSCRIBE_SCREEN_FAILURE:40016, //取消订阅屏幕共享失败
    UNPUBLISH_AUDIO_VIDEO_FAILURE:40019, //取消发布音视频失败
    STOP_MEDIA_FAILURE:40020, //停止共享媒体文件失败
    STOP_FILE_FAILURE:40021, //停止共享本地媒体文件失败
    STOP_SCREEN_FAILURE:40022, //停止共享屏幕失败
    UDP_CONNECTION_FAILED:40023, //UDP连接失败（UDP不通）
    UDP_CONNECTION_INTERRUPT:40024, //UDP连接中断（UDP之前通信正常，之后中断了）
};

/*网络状态*/
window.TK.NET_QUALITY = {
    TK_NET_QUALITY_EXCELLENT:1, //优
    TK_NET_QUALITY_GOOD:2, //良
    TK_NET_QUALITY_ACCEPTED:3, //中
    TK_NET_QUALITY_BAD:4, //差
    TK_NET_QUALITY_VERYBAD:5, //极差
}

/*媒体类型*/
    window.TK.MEDIA_TYPE = {
    DEVICE_AV:'video',
    FILE:'file',
    SCREEN:'screen',
    MEDIA:'media',
};// getApp().window = getApp().window || {};
// window = getApp().window ;
// window.TK = window.TK || {};
// window.L = window.L || {};
// var TK = window.TK;
// var L = window.L ;

!function(t,e){if("object"==typeof exports&&"object"==typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var r=e();for(var n in r)("object"==typeof exports?exports:t)[n]=r[n]}}(window,function(){return function(t){var e={};function r(n){if(e[n])return e[n].exports;var o=e[n]={i:n,l:!1,exports:{}};return t[n].call(o.exports,o,o.exports,r),o.l=!0,o.exports}return r.m=t,r.c=e,r.d=function(t,e,n){r.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:n})},r.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},r.t=function(t,e){if(1&e&&(t=r(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var n=Object.create(null);if(r.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var o in t)r.d(n,o,function(e){return t[e]}.bind(null,o));return n},r.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return r.d(e,"a",e),e},r.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},r.p="",r(r.s=24)}([function(t,e){t.exports=function(){return function(){}}},function(t,e){var r;r=function(){return this}();try{r=r||Function("return this")()||(0,eval)("this")}catch(t){"object"==typeof window&&(r=window)}t.exports=r},function(t,e){var r={}.toString;t.exports=Array.isArray||function(t){return"[object Array]"==r.call(t)}},function(t,e,r){function n(t){if(t)return function(t){for(var e in n.prototype)t[e]=n.prototype[e];return t}(t)}t.exports=n,n.prototype.on=n.prototype.addEventListener=function(t,e){return this._callbacks=this._callbacks||{},(this._callbacks["$"+t]=this._callbacks["$"+t]||[]).push(e),this},n.prototype.once=function(t,e){function r(){this.off(t,r),e.apply(this,arguments)}return r.fn=e,this.on(t,r),this},n.prototype.off=n.prototype.removeListener=n.prototype.removeAllListeners=n.prototype.removeEventListener=function(t,e){if(this._callbacks=this._callbacks||{},0==arguments.length)return this._callbacks={},this;var r,n=this._callbacks["$"+t];if(!n)return this;if(1==arguments.length)return delete this._callbacks["$"+t],this;for(var o=0;o<n.length;o++)if((r=n[o])===e||r.fn===e){n.splice(o,1);break}return this},n.prototype.emit=function(t){this._callbacks=this._callbacks||{};var e=[].slice.call(arguments,1),r=this._callbacks["$"+t];if(r)for(var n=0,o=(r=r.slice(0)).length;n<o;++n)r[n].apply(this,e);return this},n.prototype.listeners=function(t){return this._callbacks=this._callbacks||{},this._callbacks["$"+t]||[]},n.prototype.hasListeners=function(t){return!!this.listeners(t).length}},function(t,e,r){var n=r(0)("socket.io-parser"),o=r(3),i=r(20),s=r(2),a=r(9);function u(){}e.protocol=4,e.types=["CONNECT","DISCONNECT","EVENT","ACK","ERROR","BINARY_EVENT","BINARY_ACK"],e.CONNECT=0,e.DISCONNECT=1,e.EVENT=2,e.ACK=3,e.ERROR=4,e.BINARY_EVENT=5,e.BINARY_ACK=6,e.Encoder=u,e.Decoder=h;var c=e.ERROR+'"encode error"';function f(t){var r=""+t.type;if(e.BINARY_EVENT!==t.type&&e.BINARY_ACK!==t.type||(r+=t.attachments+"-"),t.nsp&&"/"!==t.nsp&&(r+=t.nsp+","),null!=t.id&&(r+=t.id),null!=t.data){var o=function(t){try{return JSON.stringify(t)}catch(t){return!1}}(t.data);if(!1===o)return c;r+=o}return n("encoded %j as %s",t,r),r}function h(){this.reconstructor=null}function p(t){this.reconPack=t,this.buffers=[]}function l(t){return{type:e.ERROR,data:"parser error: "+t}}u.prototype.encode=function(t,r){(n("encoding packet %j",t),e.BINARY_EVENT===t.type||e.BINARY_ACK===t.type)?function(t,e){i.removeBlobs(t,function(t){var r=i.deconstructPacket(t),n=f(r.packet),o=r.buffers;o.unshift(n),e(o)})}(t,r):r([f(t)])},o(h.prototype),h.prototype.add=function(t){var r;if("string"==typeof t)r=function(t){var r=0,o={type:Number(t.charAt(0))};if(null==e.types[o.type])return l("unknown packet type "+o.type);if(e.BINARY_EVENT===o.type||e.BINARY_ACK===o.type){for(var i="";"-"!==t.charAt(++r)&&(i+=t.charAt(r),r!=t.length););if(i!=Number(i)||"-"!==t.charAt(r))throw new Error("Illegal attachments");o.attachments=Number(i)}if("/"===t.charAt(r+1))for(o.nsp="";++r;){var a=t.charAt(r);if(","===a)break;if(o.nsp+=a,r===t.length)break}else o.nsp="/";var u=t.charAt(r+1);if(""!==u&&Number(u)==u){for(o.id="";++r;){var a=t.charAt(r);if(null==a||Number(a)!=a){--r;break}if(o.id+=t.charAt(r),r===t.length)break}o.id=Number(o.id)}if(t.charAt(++r)){var c=function(t){try{return JSON.parse(t)}catch(t){return!1}}(t.substr(r)),f=!1!==c&&(o.type===e.ERROR||s(c));if(!f)return l("invalid payload");o.data=c}return n("decoded %s as %j",t,o),o}(t),e.BINARY_EVENT===r.type||e.BINARY_ACK===r.type?(this.reconstructor=new p(r),0===this.reconstructor.reconPack.attachments&&this.emit("decoded",r)):this.emit("decoded",r);else{if(!a(t)&&!t.base64)throw new Error("Unknown type: "+t);if(!this.reconstructor)throw new Error("got binary data when not reconstructing a packet");(r=this.reconstructor.takeBinaryData(t))&&(this.reconstructor=null,this.emit("decoded",r))}},h.prototype.destroy=function(){this.reconstructor&&this.reconstructor.finishedReconstruction()},p.prototype.takeBinaryData=function(t){if(this.buffers.push(t),this.buffers.length===this.reconPack.attachments){var e=i.reconstructPacket(this.reconPack,this.buffers);return this.finishedReconstruction(),e}return null},p.prototype.finishedReconstruction=function(){this.reconPack=null,this.buffers=[]}},function(t,e){var r=[].slice;t.exports=function(t,e){if("string"==typeof e&&(e=t[e]),"function"!=typeof e)throw new Error("bind() requires a function");var n=r.call(arguments,2);return function(){return e.apply(t,n.concat(r.call(arguments)))}}},function(t,e){t.exports=function(t,e,r){return t.on(e,r),{destroy:function(){t.removeListener(e,r)}}}},function(t,e,r){var n=r(4),o=r(3),i=r(18),s=r(6),a=r(5),u=r(0)("socket.io-client:socket"),c=r(17),f=r(16);t.exports=l;var h={connect:1,connect_error:1,connect_timeout:1,connecting:1,disconnect:1,error:1,reconnect:1,reconnect_attempt:1,reconnect_failed:1,reconnect_error:1,reconnecting:1,ping:1,pong:1},p=o.prototype.emit;function l(t,e,r){this.io=t,this.nsp=e,this.json=this,this.ids=0,this.acks={},this.receiveBuffer=[],this.sendBuffer=[],this.connected=!1,this.disconnected=!0,this.flags={},r&&r.query&&(this.query=r.query),this.io.autoConnect&&this.open()}o(l.prototype),l.prototype.subEvents=function(){if(!this.subs){var t=this.io;this.subs=[s(t,"open",a(this,"onopen")),s(t,"packet",a(this,"onpacket")),s(t,"close",a(this,"onclose"))]}},l.prototype.open=l.prototype.connect=function(){return this.connected?this:(this.subEvents(),this.io.open(),"open"===this.io.readyState&&this.onopen(),this.emit("connecting"),this)},l.prototype.send=function(){var t=i(arguments);return t.unshift("message"),this.emit.apply(this,t),this},l.prototype.emit=function(t){if(h.hasOwnProperty(t))return p.apply(this,arguments),this;var e=i(arguments),r={type:(void 0!==this.flags.binary?this.flags.binary:f(e))?n.BINARY_EVENT:n.EVENT,data:e,options:{}};return r.options.compress=!this.flags||!1!==this.flags.compress,"function"==typeof e[e.length-1]&&(u("emitting packet with ack id %d",this.ids),this.acks[this.ids]=e.pop(),r.id=this.ids++),this.connected?this.packet(r):this.sendBuffer.push(r),this.flags={},this},l.prototype.packet=function(t){t.nsp=this.nsp,this.io.packet(t)},l.prototype.onopen=function(){if(u("transport is open - connecting"),"/"!==this.nsp)if(this.query){var t="object"==typeof this.query?c.encode(this.query):this.query;u("sending connect packet with query %s",t),this.packet({type:n.CONNECT,query:t})}else this.packet({type:n.CONNECT})},l.prototype.onclose=function(t){u("close (%s)",t),this.connected=!1,this.disconnected=!0,delete this.id,this.emit("disconnect",t)},l.prototype.onpacket=function(t){var e=t.nsp===this.nsp,r=t.type===n.ERROR&&"/"===t.nsp;if(e||r)switch(t.type){case n.CONNECT:this.onconnect();break;case n.EVENT:case n.BINARY_EVENT:this.onevent(t);break;case n.ACK:case n.BINARY_ACK:this.onack(t);break;case n.DISCONNECT:this.ondisconnect();break;case n.ERROR:this.emit("error",t.data)}},l.prototype.onevent=function(t){var e=t.data||[];u("emitting event %j",e),null!=t.id&&(u("attaching ack callback to event"),e.push(this.ack(t.id))),this.connected?p.apply(this,e):this.receiveBuffer.push(e)},l.prototype.ack=function(t){var e=this,r=!1;return function(){if(!r){r=!0;var o=i(arguments);u("sending ack %j",o),e.packet({type:f(o)?n.BINARY_ACK:n.ACK,id:t,data:o})}}},l.prototype.onack=function(t){var e=this.acks[t.id];"function"==typeof e?(u("calling ack %s with %j",t.id,t.data),e.apply(this,t.data),delete this.acks[t.id]):u("bad ack %s",t.id)},l.prototype.onconnect=function(){this.connected=!0,this.disconnected=!1,this.emit("connect"),this.emitBuffered()},l.prototype.emitBuffered=function(){var t;for(t=0;t<this.receiveBuffer.length;t++)p.apply(this,this.receiveBuffer[t]);for(this.receiveBuffer=[],t=0;t<this.sendBuffer.length;t++)this.packet(this.sendBuffer[t]);this.sendBuffer=[]},l.prototype.ondisconnect=function(){u("server disconnect (%s)",this.nsp),this.destroy(),this.onclose("io server disconnect")},l.prototype.destroy=function(){if(this.subs){for(var t=0;t<this.subs.length;t++)this.subs[t].destroy();this.subs=null}this.io.destroy(this)},l.prototype.close=l.prototype.disconnect=function(){return this.connected&&(u("performing disconnect (%s)",this.nsp),this.packet({type:n.DISCONNECT})),this.destroy(),this.connected&&this.onclose("io client disconnect"),this},l.prototype.compress=function(t){return this.flags.compress=t,this},l.prototype.binary=function(t){return this.flags.binary=t,this}},function(t,e,r){var n=r(19),o=r(7),i=r(3),s=r(4),a=r(6),u=r(5),c=r(0)("socket.io-client:manager"),f=r(11),h=r(10),p=Object.prototype.hasOwnProperty;function l(t,e){if(!(this instanceof l))return new l(t,e);t&&"object"==typeof t&&(e=t,t=void 0),(e=e||{}).path=e.path||"/socket.io",this.nsps={},this.subs=[],this.opts=e,this.reconnection(!1!==e.reconnection),this.reconnectionAttempts(e.reconnectionAttempts||1/0),this.reconnectionDelay(e.reconnectionDelay||1e3),this.reconnectionDelayMax(e.reconnectionDelayMax||5e3),this.randomizationFactor(e.randomizationFactor||.5),this.backoff=new h({min:this.reconnectionDelay(),max:this.reconnectionDelayMax(),jitter:this.randomizationFactor()}),this.timeout(null==e.timeout?2e4:e.timeout),this.readyState="closed",this.uri=t,this.connecting=[],this.lastPing=null,this.encoding=!1,this.packetBuffer=[];var r=e.parser||s;this.encoder=new r.Encoder,this.decoder=new r.Decoder,this.autoConnect=!1!==e.autoConnect,this.autoConnect&&this.open()}t.exports=l,l.prototype.emitAll=function(){for(var t in this.emit.apply(this,arguments),this.nsps)p.call(this.nsps,t)&&this.nsps[t].emit.apply(this.nsps[t],arguments)},l.prototype.updateSocketIds=function(){for(var t in this.nsps)p.call(this.nsps,t)&&(this.nsps[t].id=this.generateId(t))},l.prototype.generateId=function(t){return("/"===t?"":t+"#")+this.engine.id},i(l.prototype),l.prototype.reconnection=function(t){return arguments.length?(this._reconnection=!!t,this):this._reconnection},l.prototype.reconnectionAttempts=function(t){return arguments.length?(this._reconnectionAttempts=t,this):this._reconnectionAttempts},l.prototype.reconnectionDelay=function(t){return arguments.length?(this._reconnectionDelay=t,this.backoff&&this.backoff.setMin(t),this):this._reconnectionDelay},l.prototype.randomizationFactor=function(t){return arguments.length?(this._randomizationFactor=t,this.backoff&&this.backoff.setJitter(t),this):this._randomizationFactor},l.prototype.reconnectionDelayMax=function(t){return arguments.length?(this._reconnectionDelayMax=t,this.backoff&&this.backoff.setMax(t),this):this._reconnectionDelayMax},l.prototype.timeout=function(t){return arguments.length?(this._timeout=t,this):this._timeout},l.prototype.maybeReconnectOnOpen=function(){!this.reconnecting&&this._reconnection&&0===this.backoff.attempts&&this.reconnect()},l.prototype.open=l.prototype.connect=function(t,e){if(c("readyState %s",this.readyState),~this.readyState.indexOf("open"))return this;c("opening %s",this.uri),this.engine=n(this.uri,this.opts);var r=this.engine,o=this;this.readyState="opening",this.skipReconnect=!1;var i=a(r,"open",function(){o.onopen(),t&&t()}),s=a(r,"error",function(e){if(c("connect_error"),o.cleanup(),o.readyState="closed",o.emitAll("connect_error",e),t){var r=new Error("Connection error");r.data=e,t(r)}else o.maybeReconnectOnOpen()});if(!1!==this._timeout){var u=this._timeout;c("connect attempt will timeout after %d",u);var f=setTimeout(function(){c("connect attempt timed out after %d",u),i.destroy(),r.close(),r.emit("error","timeout"),o.emitAll("connect_timeout",u)},u);this.subs.push({destroy:function(){clearTimeout(f)}})}return this.subs.push(i),this.subs.push(s),this},l.prototype.onopen=function(){c("open"),this.cleanup(),this.readyState="open",this.emit("open");var t=this.engine;this.subs.push(a(t,"data",u(this,"ondata"))),this.subs.push(a(t,"ping",u(this,"onping"))),this.subs.push(a(t,"pong",u(this,"onpong"))),this.subs.push(a(t,"error",u(this,"onerror"))),this.subs.push(a(t,"close",u(this,"onclose"))),this.subs.push(a(this.decoder,"decoded",u(this,"ondecoded")))},l.prototype.onping=function(){this.lastPing=new Date,this.emitAll("ping")},l.prototype.onpong=function(){this.emitAll("pong",new Date-this.lastPing)},l.prototype.ondata=function(t){this.decoder.add(t)},l.prototype.ondecoded=function(t){this.emit("packet",t)},l.prototype.onerror=function(t){c("error",t),this.emitAll("error",t)},l.prototype.socket=function(t,e){var r=this.nsps[t];if(!r){r=new o(this,t,e),this.nsps[t]=r;var n=this;r.on("connecting",i),r.on("connect",function(){r.id=n.generateId(t)}),this.autoConnect&&i()}function i(){~f(n.connecting,r)||n.connecting.push(r)}return r},l.prototype.destroy=function(t){var e=f(this.connecting,t);~e&&this.connecting.splice(e,1),this.connecting.length||this.close()},l.prototype.packet=function(t){c("writing packet %j",t);var e=this;t.query&&0===t.type&&(t.nsp+="?"+t.query),e.encoding?e.packetBuffer.push(t):(e.encoding=!0,this.encoder.encode(t,function(r){for(var n=0;n<r.length;n++)e.engine.write(r[n],t.options);e.encoding=!1,e.processPacketQueue()}))},l.prototype.processPacketQueue=function(){if(this.packetBuffer.length>0&&!this.encoding){var t=this.packetBuffer.shift();this.packet(t)}},l.prototype.cleanup=function(){c("cleanup");for(var t=this.subs.length,e=0;e<t;e++){this.subs.shift().destroy()}this.packetBuffer=[],this.encoding=!1,this.lastPing=null,this.decoder.destroy()},l.prototype.close=l.prototype.disconnect=function(){c("disconnect"),this.skipReconnect=!0,this.reconnecting=!1,"opening"===this.readyState&&this.cleanup(),this.backoff.reset(),this.readyState="closed",this.engine&&this.engine.close()},l.prototype.onclose=function(t){c("onclose"),this.cleanup(),this.backoff.reset(),this.readyState="closed",this.emit("close",t),this._reconnection&&!this.skipReconnect&&this.reconnect()},l.prototype.reconnect=function(){if(this.reconnecting||this.skipReconnect)return this;var t=this;if(this.backoff.attempts>=this._reconnectionAttempts)c("reconnect failed"),this.backoff.reset(),this.emitAll("reconnect_failed"),this.reconnecting=!1;else{var e=this.backoff.duration();c("will wait %dms before reconnect attempt",e),this.reconnecting=!0;var r=setTimeout(function(){t.skipReconnect||(c("attempting reconnect"),t.emitAll("reconnect_attempt",t.backoff.attempts),t.emitAll("reconnecting",t.backoff.attempts),t.skipReconnect||t.open(function(e){e?(c("reconnect attempt error"),t.reconnecting=!1,t.reconnect(),t.emitAll("reconnect_error",e.data)):(c("reconnect success"),t.onreconnect())}))},e);this.subs.push({destroy:function(){clearTimeout(r)}})}},l.prototype.onreconnect=function(){var t=this.backoff.attempts;this.reconnecting=!1,this.backoff.reset(),this.updateSocketIds(),this.emitAll("reconnect",t)}},function(t,e,r){(function(e){t.exports=function(t){return r&&e.Buffer.isBuffer(t)||n&&(t instanceof e.ArrayBuffer||o(t))};var r="function"==typeof e.Buffer&&"function"==typeof e.Buffer.isBuffer,n="function"==typeof e.ArrayBuffer,o=n&&"function"==typeof e.ArrayBuffer.isView?e.ArrayBuffer.isView:function(t){return t.buffer instanceof e.ArrayBuffer}}).call(this,r(1))},function(t,e){function r(t){t=t||{},this.ms=t.min||100,this.max=t.max||1e4,this.factor=t.factor||2,this.jitter=t.jitter>0&&t.jitter<=1?t.jitter:0,this.attempts=0}t.exports=r,r.prototype.duration=function(){var t=this.ms*Math.pow(this.factor,this.attempts++);if(this.jitter){var e=Math.random(),r=Math.floor(e*this.jitter*t);t=0==(1&Math.floor(10*e))?t-r:t+r}return 0|Math.min(t,this.max)},r.prototype.reset=function(){this.attempts=0},r.prototype.setMin=function(t){this.ms=t},r.prototype.setMax=function(t){this.max=t},r.prototype.setJitter=function(t){this.jitter=t}},function(t,e){var r=[].indexOf;t.exports=function(t,e){if(r)return t.indexOf(e);for(var n=0;n<t.length;++n)if(t[n]===e)return n;return-1}},function(t,e){var r={}.toString;t.exports=Array.isArray||function(t){return"[object Array]"==r.call(t)}},function(t,e){e.read=function(t,e,r,n,o){var i,s,a=8*o-n-1,u=(1<<a)-1,c=u>>1,f=-7,h=r?o-1:0,p=r?-1:1,l=t[e+h];for(h+=p,i=l&(1<<-f)-1,l>>=-f,f+=a;f>0;i=256*i+t[e+h],h+=p,f-=8);for(s=i&(1<<-f)-1,i>>=-f,f+=n;f>0;s=256*s+t[e+h],h+=p,f-=8);if(0===i)i=1-c;else{if(i===u)return s?NaN:1/0*(l?-1:1);s+=Math.pow(2,n),i-=c}return(l?-1:1)*s*Math.pow(2,i-n)},e.write=function(t,e,r,n,o,i){var s,a,u,c=8*i-o-1,f=(1<<c)-1,h=f>>1,p=23===o?Math.pow(2,-24)-Math.pow(2,-77):0,l=n?0:i-1,d=n?1:-1,y=e<0||0===e&&1/e<0?1:0;for(e=Math.abs(e),isNaN(e)||e===1/0?(a=isNaN(e)?1:0,s=f):(s=Math.floor(Math.log(e)/Math.LN2),e*(u=Math.pow(2,-s))<1&&(s--,u*=2),(e+=s+h>=1?p/u:p*Math.pow(2,1-h))*u>=2&&(s++,u/=2),s+h>=f?(a=0,s=f):s+h>=1?(a=(e*u-1)*Math.pow(2,o),s+=h):(a=e*Math.pow(2,h-1)*Math.pow(2,o),s=0));o>=8;t[r+l]=255&a,l+=d,a/=256,o-=8);for(s=s<<o|a,c+=o;c>0;t[r+l]=255&s,l+=d,s/=256,c-=8);t[r+l-d]|=128*y}},function(t,e,r){"use strict";e.byteLength=function(t){var e=c(t),r=e[0],n=e[1];return 3*(r+n)/4-n},e.toByteArray=function(t){for(var e,r=c(t),n=r[0],s=r[1],a=new i(function(t,e,r){return 3*(e+r)/4-r}(0,n,s)),u=0,f=s>0?n-4:n,h=0;h<f;h+=4)e=o[t.charCodeAt(h)]<<18|o[t.charCodeAt(h+1)]<<12|o[t.charCodeAt(h+2)]<<6|o[t.charCodeAt(h+3)],a[u++]=e>>16&255,a[u++]=e>>8&255,a[u++]=255&e;2===s&&(e=o[t.charCodeAt(h)]<<2|o[t.charCodeAt(h+1)]>>4,a[u++]=255&e);1===s&&(e=o[t.charCodeAt(h)]<<10|o[t.charCodeAt(h+1)]<<4|o[t.charCodeAt(h+2)]>>2,a[u++]=e>>8&255,a[u++]=255&e);return a},e.fromByteArray=function(t){for(var e,r=t.length,o=r%3,i=[],s=0,a=r-o;s<a;s+=16383)i.push(f(t,s,s+16383>a?a:s+16383));1===o?(e=t[r-1],i.push(n[e>>2]+n[e<<4&63]+"==")):2===o&&(e=(t[r-2]<<8)+t[r-1],i.push(n[e>>10]+n[e>>4&63]+n[e<<2&63]+"="));return i.join("")};for(var n=[],o=[],i="undefined"!=typeof Uint8Array?Uint8Array:Array,s="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",a=0,u=s.length;a<u;++a)n[a]=s[a],o[s.charCodeAt(a)]=a;function c(t){var e=t.length;if(e%4>0)throw new Error("Invalid string. Length must be a multiple of 4");var r=t.indexOf("=");return-1===r&&(r=e),[r,r===e?0:4-r%4]}function f(t,e,r){for(var o,i,s=[],a=e;a<r;a+=3)o=(t[a]<<16&16711680)+(t[a+1]<<8&65280)+(255&t[a+2]),s.push(n[(i=o)>>18&63]+n[i>>12&63]+n[i>>6&63]+n[63&i]);return s.join("")}o["-".charCodeAt(0)]=62,o["_".charCodeAt(0)]=63},function(t,e,r){"use strict";(function(t){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
var n=r(14),o=r(13),i=r(12);function s(){return u.TYPED_ARRAY_SUPPORT?2147483647:1073741823}function a(t,e){if(s()<e)throw new RangeError("Invalid typed array length");return u.TYPED_ARRAY_SUPPORT?(t=new Uint8Array(e)).__proto__=u.prototype:(null===t&&(t=new u(e)),t.length=e),t}function u(t,e,r){if(!(u.TYPED_ARRAY_SUPPORT||this instanceof u))return new u(t,e,r);if("number"==typeof t){if("string"==typeof e)throw new Error("If encoding is specified then the first argument must be a string");return h(this,t)}return c(this,t,e,r)}function c(t,e,r,n){if("number"==typeof e)throw new TypeError('"value" argument must not be a number');return"undefined"!=typeof ArrayBuffer&&e instanceof ArrayBuffer?function(t,e,r,n){if(e.byteLength,r<0||e.byteLength<r)throw new RangeError("'offset' is out of bounds");if(e.byteLength<r+(n||0))throw new RangeError("'length' is out of bounds");e=void 0===r&&void 0===n?new Uint8Array(e):void 0===n?new Uint8Array(e,r):new Uint8Array(e,r,n);u.TYPED_ARRAY_SUPPORT?(t=e).__proto__=u.prototype:t=p(t,e);return t}(t,e,r,n):"string"==typeof e?function(t,e,r){"string"==typeof r&&""!==r||(r="utf8");if(!u.isEncoding(r))throw new TypeError('"encoding" must be a valid string encoding');var n=0|d(e,r),o=(t=a(t,n)).write(e,r);o!==n&&(t=t.slice(0,o));return t}(t,e,r):function(t,e){if(u.isBuffer(e)){var r=0|l(e.length);return 0===(t=a(t,r)).length?t:(e.copy(t,0,0,r),t)}if(e){if("undefined"!=typeof ArrayBuffer&&e.buffer instanceof ArrayBuffer||"length"in e)return"number"!=typeof e.length||(n=e.length)!=n?a(t,0):p(t,e);if("Buffer"===e.type&&i(e.data))return p(t,e.data)}var n;throw new TypeError("First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.")}(t,e)}function f(t){if("number"!=typeof t)throw new TypeError('"size" argument must be a number');if(t<0)throw new RangeError('"size" argument must not be negative')}function h(t,e){if(f(e),t=a(t,e<0?0:0|l(e)),!u.TYPED_ARRAY_SUPPORT)for(var r=0;r<e;++r)t[r]=0;return t}function p(t,e){var r=e.length<0?0:0|l(e.length);t=a(t,r);for(var n=0;n<r;n+=1)t[n]=255&e[n];return t}function l(t){if(t>=s())throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x"+s().toString(16)+" bytes");return 0|t}function d(t,e){if(u.isBuffer(t))return t.length;if("undefined"!=typeof ArrayBuffer&&"function"==typeof ArrayBuffer.isView&&(ArrayBuffer.isView(t)||t instanceof ArrayBuffer))return t.byteLength;"string"!=typeof t&&(t=""+t);var r=t.length;if(0===r)return 0;for(var n=!1;;)switch(e){case"ascii":case"latin1":case"binary":return r;case"utf8":case"utf-8":case void 0:return j(t).length;case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return 2*r;case"hex":return r>>>1;case"base64":return q(t).length;default:if(n)return j(t).length;e=(""+e).toLowerCase(),n=!0}}function y(t,e,r){var n=t[e];t[e]=t[r],t[r]=n}function g(t,e,r,n,o){if(0===t.length)return-1;if("string"==typeof r?(n=r,r=0):r>2147483647?r=2147483647:r<-2147483648&&(r=-2147483648),r=+r,isNaN(r)&&(r=o?0:t.length-1),r<0&&(r=t.length+r),r>=t.length){if(o)return-1;r=t.length-1}else if(r<0){if(!o)return-1;r=0}if("string"==typeof e&&(e=u.from(e,n)),u.isBuffer(e))return 0===e.length?-1:v(t,e,r,n,o);if("number"==typeof e)return e&=255,u.TYPED_ARRAY_SUPPORT&&"function"==typeof Uint8Array.prototype.indexOf?o?Uint8Array.prototype.indexOf.call(t,e,r):Uint8Array.prototype.lastIndexOf.call(t,e,r):v(t,[e],r,n,o);throw new TypeError("val must be string, number or Buffer")}function v(t,e,r,n,o){var i,s=1,a=t.length,u=e.length;if(void 0!==n&&("ucs2"===(n=String(n).toLowerCase())||"ucs-2"===n||"utf16le"===n||"utf-16le"===n)){if(t.length<2||e.length<2)return-1;s=2,a/=2,u/=2,r/=2}function c(t,e){return 1===s?t[e]:t.readUInt16BE(e*s)}if(o){var f=-1;for(i=r;i<a;i++)if(c(t,i)===c(e,-1===f?0:i-f)){if(-1===f&&(f=i),i-f+1===u)return f*s}else-1!==f&&(i-=i-f),f=-1}else for(r+u>a&&(r=a-u),i=r;i>=0;i--){for(var h=!0,p=0;p<u;p++)if(c(t,i+p)!==c(e,p)){h=!1;break}if(h)return i}return-1}function b(t,e,r,n){r=Number(r)||0;var o=t.length-r;n?(n=Number(n))>o&&(n=o):n=o;var i=e.length;if(i%2!=0)throw new TypeError("Invalid hex string");n>i/2&&(n=i/2);for(var s=0;s<n;++s){var a=parseInt(e.substr(2*s,2),16);if(isNaN(a))return s;t[r+s]=a}return s}function m(t,e,r,n){return F(j(e,t.length-r),t,r,n)}function w(t,e,r,n){return F(function(t){for(var e=[],r=0;r<t.length;++r)e.push(255&t.charCodeAt(r));return e}(e),t,r,n)}function A(t,e,r,n){return w(t,e,r,n)}function _(t,e,r,n){return F(q(e),t,r,n)}function E(t,e,r,n){return F(function(t,e){for(var r,n,o,i=[],s=0;s<t.length&&!((e-=2)<0);++s)r=t.charCodeAt(s),n=r>>8,o=r%256,i.push(o),i.push(n);return i}(e,t.length-r),t,r,n)}function k(t,e,r){return 0===e&&r===t.length?n.fromByteArray(t):n.fromByteArray(t.slice(e,r))}function B(t,e,r){r=Math.min(t.length,r);for(var n=[],o=e;o<r;){var i,s,a,u,c=t[o],f=null,h=c>239?4:c>223?3:c>191?2:1;if(o+h<=r)switch(h){case 1:c<128&&(f=c);break;case 2:128==(192&(i=t[o+1]))&&(u=(31&c)<<6|63&i)>127&&(f=u);break;case 3:i=t[o+1],s=t[o+2],128==(192&i)&&128==(192&s)&&(u=(15&c)<<12|(63&i)<<6|63&s)>2047&&(u<55296||u>57343)&&(f=u);break;case 4:i=t[o+1],s=t[o+2],a=t[o+3],128==(192&i)&&128==(192&s)&&128==(192&a)&&(u=(15&c)<<18|(63&i)<<12|(63&s)<<6|63&a)>65535&&u<1114112&&(f=u)}null===f?(f=65533,h=1):f>65535&&(f-=65536,n.push(f>>>10&1023|55296),f=56320|1023&f),n.push(f),o+=h}return function(t){var e=t.length;if(e<=R)return String.fromCharCode.apply(String,t);var r="",n=0;for(;n<e;)r+=String.fromCharCode.apply(String,t.slice(n,n+=R));return r}(n)}e.Buffer=u,e.SlowBuffer=function(t){+t!=t&&(t=0);return u.alloc(+t)},e.INSPECT_MAX_BYTES=50,u.TYPED_ARRAY_SUPPORT=void 0!==t.TYPED_ARRAY_SUPPORT?t.TYPED_ARRAY_SUPPORT:function(){try{var t=new Uint8Array(1);return t.__proto__={__proto__:Uint8Array.prototype,foo:function(){return 42}},42===t.foo()&&"function"==typeof t.subarray&&0===t.subarray(1,1).byteLength}catch(t){return!1}}(),e.kMaxLength=s(),u.poolSize=8192,u._augment=function(t){return t.__proto__=u.prototype,t},u.from=function(t,e,r){return c(null,t,e,r)},u.TYPED_ARRAY_SUPPORT&&(u.prototype.__proto__=Uint8Array.prototype,u.__proto__=Uint8Array,"undefined"!=typeof Symbol&&Symbol.species&&u[Symbol.species]===u&&Object.defineProperty(u,Symbol.species,{value:null,configurable:!0})),u.alloc=function(t,e,r){return function(t,e,r,n){return f(e),e<=0?a(t,e):void 0!==r?"string"==typeof n?a(t,e).fill(r,n):a(t,e).fill(r):a(t,e)}(null,t,e,r)},u.allocUnsafe=function(t){return h(null,t)},u.allocUnsafeSlow=function(t){return h(null,t)},u.isBuffer=function(t){return!(null==t||!t._isBuffer)},u.compare=function(t,e){if(!u.isBuffer(t)||!u.isBuffer(e))throw new TypeError("Arguments must be Buffers");if(t===e)return 0;for(var r=t.length,n=e.length,o=0,i=Math.min(r,n);o<i;++o)if(t[o]!==e[o]){r=t[o],n=e[o];break}return r<n?-1:n<r?1:0},u.isEncoding=function(t){switch(String(t).toLowerCase()){case"hex":case"utf8":case"utf-8":case"ascii":case"latin1":case"binary":case"base64":case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return!0;default:return!1}},u.concat=function(t,e){if(!i(t))throw new TypeError('"list" argument must be an Array of Buffers');if(0===t.length)return u.alloc(0);var r;if(void 0===e)for(e=0,r=0;r<t.length;++r)e+=t[r].length;var n=u.allocUnsafe(e),o=0;for(r=0;r<t.length;++r){var s=t[r];if(!u.isBuffer(s))throw new TypeError('"list" argument must be an Array of Buffers');s.copy(n,o),o+=s.length}return n},u.byteLength=d,u.prototype._isBuffer=!0,u.prototype.swap16=function(){var t=this.length;if(t%2!=0)throw new RangeError("Buffer size must be a multiple of 16-bits");for(var e=0;e<t;e+=2)y(this,e,e+1);return this},u.prototype.swap32=function(){var t=this.length;if(t%4!=0)throw new RangeError("Buffer size must be a multiple of 32-bits");for(var e=0;e<t;e+=4)y(this,e,e+3),y(this,e+1,e+2);return this},u.prototype.swap64=function(){var t=this.length;if(t%8!=0)throw new RangeError("Buffer size must be a multiple of 64-bits");for(var e=0;e<t;e+=8)y(this,e,e+7),y(this,e+1,e+6),y(this,e+2,e+5),y(this,e+3,e+4);return this},u.prototype.toString=function(){var t=0|this.length;return 0===t?"":0===arguments.length?B(this,0,t):function(t,e,r){var n=!1;if((void 0===e||e<0)&&(e=0),e>this.length)return"";if((void 0===r||r>this.length)&&(r=this.length),r<=0)return"";if((r>>>=0)<=(e>>>=0))return"";for(t||(t="utf8");;)switch(t){case"hex":return T(this,e,r);case"utf8":case"utf-8":return B(this,e,r);case"ascii":return P(this,e,r);case"latin1":case"binary":return S(this,e,r);case"base64":return k(this,e,r);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return O(this,e,r);default:if(n)throw new TypeError("Unknown encoding: "+t);t=(t+"").toLowerCase(),n=!0}}.apply(this,arguments)},u.prototype.equals=function(t){if(!u.isBuffer(t))throw new TypeError("Argument must be a Buffer");return this===t||0===u.compare(this,t)},u.prototype.inspect=function(){var t="",r=e.INSPECT_MAX_BYTES;return this.length>0&&(t=this.toString("hex",0,r).match(/.{2}/g).join(" "),this.length>r&&(t+=" ... ")),"<Buffer "+t+">"},u.prototype.compare=function(t,e,r,n,o){if(!u.isBuffer(t))throw new TypeError("Argument must be a Buffer");if(void 0===e&&(e=0),void 0===r&&(r=t?t.length:0),void 0===n&&(n=0),void 0===o&&(o=this.length),e<0||r>t.length||n<0||o>this.length)throw new RangeError("out of range index");if(n>=o&&e>=r)return 0;if(n>=o)return-1;if(e>=r)return 1;if(e>>>=0,r>>>=0,n>>>=0,o>>>=0,this===t)return 0;for(var i=o-n,s=r-e,a=Math.min(i,s),c=this.slice(n,o),f=t.slice(e,r),h=0;h<a;++h)if(c[h]!==f[h]){i=c[h],s=f[h];break}return i<s?-1:s<i?1:0},u.prototype.includes=function(t,e,r){return-1!==this.indexOf(t,e,r)},u.prototype.indexOf=function(t,e,r){return g(this,t,e,r,!0)},u.prototype.lastIndexOf=function(t,e,r){return g(this,t,e,r,!1)},u.prototype.write=function(t,e,r,n){if(void 0===e)n="utf8",r=this.length,e=0;else if(void 0===r&&"string"==typeof e)n=e,r=this.length,e=0;else{if(!isFinite(e))throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");e|=0,isFinite(r)?(r|=0,void 0===n&&(n="utf8")):(n=r,r=void 0)}var o=this.length-e;if((void 0===r||r>o)&&(r=o),t.length>0&&(r<0||e<0)||e>this.length)throw new RangeError("Attempt to write outside buffer bounds");n||(n="utf8");for(var i=!1;;)switch(n){case"hex":return b(this,t,e,r);case"utf8":case"utf-8":return m(this,t,e,r);case"ascii":return w(this,t,e,r);case"latin1":case"binary":return A(this,t,e,r);case"base64":return _(this,t,e,r);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return E(this,t,e,r);default:if(i)throw new TypeError("Unknown encoding: "+n);n=(""+n).toLowerCase(),i=!0}},u.prototype.toJSON=function(){return{type:"Buffer",data:Array.prototype.slice.call(this._arr||this,0)}};var R=4096;function P(t,e,r){var n="";r=Math.min(t.length,r);for(var o=e;o<r;++o)n+=String.fromCharCode(127&t[o]);return n}function S(t,e,r){var n="";r=Math.min(t.length,r);for(var o=e;o<r;++o)n+=String.fromCharCode(t[o]);return n}function T(t,e,r){var n=t.length;(!e||e<0)&&(e=0),(!r||r<0||r>n)&&(r=n);for(var o="",i=e;i<r;++i)o+=D(t[i]);return o}function O(t,e,r){for(var n=t.slice(e,r),o="",i=0;i<n.length;i+=2)o+=String.fromCharCode(n[i]+256*n[i+1]);return o}function x(t,e,r){if(t%1!=0||t<0)throw new RangeError("offset is not uint");if(t+e>r)throw new RangeError("Trying to access beyond buffer length")}function C(t,e,r,n,o,i){if(!u.isBuffer(t))throw new TypeError('"buffer" argument must be a Buffer instance');if(e>o||e<i)throw new RangeError('"value" argument is out of bounds');if(r+n>t.length)throw new RangeError("Index out of range")}function U(t,e,r,n){e<0&&(e=65535+e+1);for(var o=0,i=Math.min(t.length-r,2);o<i;++o)t[r+o]=(e&255<<8*(n?o:1-o))>>>8*(n?o:1-o)}function L(t,e,r,n){e<0&&(e=4294967295+e+1);for(var o=0,i=Math.min(t.length-r,4);o<i;++o)t[r+o]=e>>>8*(n?o:3-o)&255}function I(t,e,r,n,o,i){if(r+n>t.length)throw new RangeError("Index out of range");if(r<0)throw new RangeError("Index out of range")}function N(t,e,r,n,i){return i||I(t,0,r,4),o.write(t,e,r,n,23,4),r+4}function M(t,e,r,n,i){return i||I(t,0,r,8),o.write(t,e,r,n,52,8),r+8}u.prototype.slice=function(t,e){var r,n=this.length;if(t=~~t,e=void 0===e?n:~~e,t<0?(t+=n)<0&&(t=0):t>n&&(t=n),e<0?(e+=n)<0&&(e=0):e>n&&(e=n),e<t&&(e=t),u.TYPED_ARRAY_SUPPORT)(r=this.subarray(t,e)).__proto__=u.prototype;else{var o=e-t;r=new u(o,void 0);for(var i=0;i<o;++i)r[i]=this[i+t]}return r},u.prototype.readUIntLE=function(t,e,r){t|=0,e|=0,r||x(t,e,this.length);for(var n=this[t],o=1,i=0;++i<e&&(o*=256);)n+=this[t+i]*o;return n},u.prototype.readUIntBE=function(t,e,r){t|=0,e|=0,r||x(t,e,this.length);for(var n=this[t+--e],o=1;e>0&&(o*=256);)n+=this[t+--e]*o;return n},u.prototype.readUInt8=function(t,e){return e||x(t,1,this.length),this[t]},u.prototype.readUInt16LE=function(t,e){return e||x(t,2,this.length),this[t]|this[t+1]<<8},u.prototype.readUInt16BE=function(t,e){return e||x(t,2,this.length),this[t]<<8|this[t+1]},u.prototype.readUInt32LE=function(t,e){return e||x(t,4,this.length),(this[t]|this[t+1]<<8|this[t+2]<<16)+16777216*this[t+3]},u.prototype.readUInt32BE=function(t,e){return e||x(t,4,this.length),16777216*this[t]+(this[t+1]<<16|this[t+2]<<8|this[t+3])},u.prototype.readIntLE=function(t,e,r){t|=0,e|=0,r||x(t,e,this.length);for(var n=this[t],o=1,i=0;++i<e&&(o*=256);)n+=this[t+i]*o;return n>=(o*=128)&&(n-=Math.pow(2,8*e)),n},u.prototype.readIntBE=function(t,e,r){t|=0,e|=0,r||x(t,e,this.length);for(var n=e,o=1,i=this[t+--n];n>0&&(o*=256);)i+=this[t+--n]*o;return i>=(o*=128)&&(i-=Math.pow(2,8*e)),i},u.prototype.readInt8=function(t,e){return e||x(t,1,this.length),128&this[t]?-1*(255-this[t]+1):this[t]},u.prototype.readInt16LE=function(t,e){e||x(t,2,this.length);var r=this[t]|this[t+1]<<8;return 32768&r?4294901760|r:r},u.prototype.readInt16BE=function(t,e){e||x(t,2,this.length);var r=this[t+1]|this[t]<<8;return 32768&r?4294901760|r:r},u.prototype.readInt32LE=function(t,e){return e||x(t,4,this.length),this[t]|this[t+1]<<8|this[t+2]<<16|this[t+3]<<24},u.prototype.readInt32BE=function(t,e){return e||x(t,4,this.length),this[t]<<24|this[t+1]<<16|this[t+2]<<8|this[t+3]},u.prototype.readFloatLE=function(t,e){return e||x(t,4,this.length),o.read(this,t,!0,23,4)},u.prototype.readFloatBE=function(t,e){return e||x(t,4,this.length),o.read(this,t,!1,23,4)},u.prototype.readDoubleLE=function(t,e){return e||x(t,8,this.length),o.read(this,t,!0,52,8)},u.prototype.readDoubleBE=function(t,e){return e||x(t,8,this.length),o.read(this,t,!1,52,8)},u.prototype.writeUIntLE=function(t,e,r,n){(t=+t,e|=0,r|=0,n)||C(this,t,e,r,Math.pow(2,8*r)-1,0);var o=1,i=0;for(this[e]=255&t;++i<r&&(o*=256);)this[e+i]=t/o&255;return e+r},u.prototype.writeUIntBE=function(t,e,r,n){(t=+t,e|=0,r|=0,n)||C(this,t,e,r,Math.pow(2,8*r)-1,0);var o=r-1,i=1;for(this[e+o]=255&t;--o>=0&&(i*=256);)this[e+o]=t/i&255;return e+r},u.prototype.writeUInt8=function(t,e,r){return t=+t,e|=0,r||C(this,t,e,1,255,0),u.TYPED_ARRAY_SUPPORT||(t=Math.floor(t)),this[e]=255&t,e+1},u.prototype.writeUInt16LE=function(t,e,r){return t=+t,e|=0,r||C(this,t,e,2,65535,0),u.TYPED_ARRAY_SUPPORT?(this[e]=255&t,this[e+1]=t>>>8):U(this,t,e,!0),e+2},u.prototype.writeUInt16BE=function(t,e,r){return t=+t,e|=0,r||C(this,t,e,2,65535,0),u.TYPED_ARRAY_SUPPORT?(this[e]=t>>>8,this[e+1]=255&t):U(this,t,e,!1),e+2},u.prototype.writeUInt32LE=function(t,e,r){return t=+t,e|=0,r||C(this,t,e,4,4294967295,0),u.TYPED_ARRAY_SUPPORT?(this[e+3]=t>>>24,this[e+2]=t>>>16,this[e+1]=t>>>8,this[e]=255&t):L(this,t,e,!0),e+4},u.prototype.writeUInt32BE=function(t,e,r){return t=+t,e|=0,r||C(this,t,e,4,4294967295,0),u.TYPED_ARRAY_SUPPORT?(this[e]=t>>>24,this[e+1]=t>>>16,this[e+2]=t>>>8,this[e+3]=255&t):L(this,t,e,!1),e+4},u.prototype.writeIntLE=function(t,e,r,n){if(t=+t,e|=0,!n){var o=Math.pow(2,8*r-1);C(this,t,e,r,o-1,-o)}var i=0,s=1,a=0;for(this[e]=255&t;++i<r&&(s*=256);)t<0&&0===a&&0!==this[e+i-1]&&(a=1),this[e+i]=(t/s>>0)-a&255;return e+r},u.prototype.writeIntBE=function(t,e,r,n){if(t=+t,e|=0,!n){var o=Math.pow(2,8*r-1);C(this,t,e,r,o-1,-o)}var i=r-1,s=1,a=0;for(this[e+i]=255&t;--i>=0&&(s*=256);)t<0&&0===a&&0!==this[e+i+1]&&(a=1),this[e+i]=(t/s>>0)-a&255;return e+r},u.prototype.writeInt8=function(t,e,r){return t=+t,e|=0,r||C(this,t,e,1,127,-128),u.TYPED_ARRAY_SUPPORT||(t=Math.floor(t)),t<0&&(t=255+t+1),this[e]=255&t,e+1},u.prototype.writeInt16LE=function(t,e,r){return t=+t,e|=0,r||C(this,t,e,2,32767,-32768),u.TYPED_ARRAY_SUPPORT?(this[e]=255&t,this[e+1]=t>>>8):U(this,t,e,!0),e+2},u.prototype.writeInt16BE=function(t,e,r){return t=+t,e|=0,r||C(this,t,e,2,32767,-32768),u.TYPED_ARRAY_SUPPORT?(this[e]=t>>>8,this[e+1]=255&t):U(this,t,e,!1),e+2},u.prototype.writeInt32LE=function(t,e,r){return t=+t,e|=0,r||C(this,t,e,4,2147483647,-2147483648),u.TYPED_ARRAY_SUPPORT?(this[e]=255&t,this[e+1]=t>>>8,this[e+2]=t>>>16,this[e+3]=t>>>24):L(this,t,e,!0),e+4},u.prototype.writeInt32BE=function(t,e,r){return t=+t,e|=0,r||C(this,t,e,4,2147483647,-2147483648),t<0&&(t=4294967295+t+1),u.TYPED_ARRAY_SUPPORT?(this[e]=t>>>24,this[e+1]=t>>>16,this[e+2]=t>>>8,this[e+3]=255&t):L(this,t,e,!1),e+4},u.prototype.writeFloatLE=function(t,e,r){return N(this,t,e,!0,r)},u.prototype.writeFloatBE=function(t,e,r){return N(this,t,e,!1,r)},u.prototype.writeDoubleLE=function(t,e,r){return M(this,t,e,!0,r)},u.prototype.writeDoubleBE=function(t,e,r){return M(this,t,e,!1,r)},u.prototype.copy=function(t,e,r,n){if(r||(r=0),n||0===n||(n=this.length),e>=t.length&&(e=t.length),e||(e=0),n>0&&n<r&&(n=r),n===r)return 0;if(0===t.length||0===this.length)return 0;if(e<0)throw new RangeError("targetStart out of bounds");if(r<0||r>=this.length)throw new RangeError("sourceStart out of bounds");if(n<0)throw new RangeError("sourceEnd out of bounds");n>this.length&&(n=this.length),t.length-e<n-r&&(n=t.length-e+r);var o,i=n-r;if(this===t&&r<e&&e<n)for(o=i-1;o>=0;--o)t[o+e]=this[o+r];else if(i<1e3||!u.TYPED_ARRAY_SUPPORT)for(o=0;o<i;++o)t[o+e]=this[o+r];else Uint8Array.prototype.set.call(t,this.subarray(r,r+i),e);return i},u.prototype.fill=function(t,e,r,n){if("string"==typeof t){if("string"==typeof e?(n=e,e=0,r=this.length):"string"==typeof r&&(n=r,r=this.length),1===t.length){var o=t.charCodeAt(0);o<256&&(t=o)}if(void 0!==n&&"string"!=typeof n)throw new TypeError("encoding must be a string");if("string"==typeof n&&!u.isEncoding(n))throw new TypeError("Unknown encoding: "+n)}else"number"==typeof t&&(t&=255);if(e<0||this.length<e||this.length<r)throw new RangeError("Out of range index");if(r<=e)return this;var i;if(e>>>=0,r=void 0===r?this.length:r>>>0,t||(t=0),"number"==typeof t)for(i=e;i<r;++i)this[i]=t;else{var s=u.isBuffer(t)?t:j(new u(t,n).toString()),a=s.length;for(i=0;i<r-e;++i)this[i+e]=s[i%a]}return this};var Y=/[^+\/0-9A-Za-z-_]/g;function D(t){return t<16?"0"+t.toString(16):t.toString(16)}function j(t,e){var r;e=e||1/0;for(var n=t.length,o=null,i=[],s=0;s<n;++s){if((r=t.charCodeAt(s))>55295&&r<57344){if(!o){if(r>56319){(e-=3)>-1&&i.push(239,191,189);continue}if(s+1===n){(e-=3)>-1&&i.push(239,191,189);continue}o=r;continue}if(r<56320){(e-=3)>-1&&i.push(239,191,189),o=r;continue}r=65536+(o-55296<<10|r-56320)}else o&&(e-=3)>-1&&i.push(239,191,189);if(o=null,r<128){if((e-=1)<0)break;i.push(r)}else if(r<2048){if((e-=2)<0)break;i.push(r>>6|192,63&r|128)}else if(r<65536){if((e-=3)<0)break;i.push(r>>12|224,r>>6&63|128,63&r|128)}else{if(!(r<1114112))throw new Error("Invalid code point");if((e-=4)<0)break;i.push(r>>18|240,r>>12&63|128,r>>6&63|128,63&r|128)}}return i}function q(t){return n.toByteArray(function(t){if((t=function(t){return t.trim?t.trim():t.replace(/^\s+|\s+$/g,"")}(t).replace(Y,"")).length<2)return"";for(;t.length%4!=0;)t+="=";return t}(t))}function F(t,e,r,n){for(var o=0;o<n&&!(o+r>=e.length||o>=t.length);++o)e[o+r]=t[o];return o}}).call(this,r(1))},function(t,e,r){(function(e){var n=r(2),o=Object.prototype.toString,i="function"==typeof Blob||"undefined"!=typeof Blob&&"[object BlobConstructor]"===o.call(Blob),s="function"==typeof File||"undefined"!=typeof File&&"[object FileConstructor]"===o.call(File);t.exports=function t(r){if(!r||"object"!=typeof r)return!1;if(n(r)){for(var o=0,a=r.length;o<a;o++)if(t(r[o]))return!0;return!1}if("function"==typeof e&&e.isBuffer&&e.isBuffer(r)||"function"==typeof ArrayBuffer&&r instanceof ArrayBuffer||i&&r instanceof Blob||s&&r instanceof File)return!0;if(r.toJSON&&"function"==typeof r.toJSON&&1===arguments.length)return t(r.toJSON(),!0);for(var u in r)if(Object.prototype.hasOwnProperty.call(r,u)&&t(r[u]))return!0;return!1}}).call(this,r(15).Buffer)},function(t,e){e.encode=function(t){var e="";for(var r in t)t.hasOwnProperty(r)&&(e.length&&(e+="&"),e+=encodeURIComponent(r)+"="+encodeURIComponent(t[r]));return e},e.decode=function(t){for(var e={},r=t.split("&"),n=0,o=r.length;n<o;n++){var i=r[n].split("=");e[decodeURIComponent(i[0])]=decodeURIComponent(i[1])}return e}},function(t,e){t.exports=function(t,e){for(var r=[],n=(e=e||0)||0;n<t.length;n++)r[n-e]=t[n];return r}},function(t,e,r){window,t.exports=function(t){var e={};function r(n){if(e[n])return e[n].exports;var o=e[n]={i:n,l:!1,exports:{}};return t[n].call(o.exports,o,o.exports,r),o.l=!0,o.exports}return r.m=t,r.c=e,r.d=function(t,e,n){r.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:n})},r.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},r.t=function(t,e){if(1&e&&(t=r(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var n=Object.create(null);if(r.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var o in t)r.d(n,o,function(e){return t[e]}.bind(null,o));return n},r.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return r.d(e,"a",e),e},r.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},r.p="",r(r.s=29)}([function(t,e){var r;r=function(){return this}();try{r=r||Function("return this")()||(0,eval)("this")}catch(t){"object"==typeof window&&(r=window)}t.exports=r},function(t,e,r){(function(t){var n,o=r(26),i=r(25),s=r(19),a=r(18),u=r(17);t&&t.ArrayBuffer&&(n=r(15));var c="undefined"!=typeof navigator&&/Android/i.test(navigator.userAgent),f="undefined"!=typeof navigator&&/PhantomJS/i.test(navigator.userAgent),h=c||f;e.protocol=3;var p=e.packets={open:0,close:1,ping:2,pong:3,message:4,upgrade:5,noop:6},l=o(p),d={type:"error",data:"parser error"},y=r(14);function g(t,e,r){for(var n=new Array(t.length),o=a(t.length,r),i=function(t,r,o){e(r,function(e,r){n[t]=r,o(e,n)})},s=0;s<t.length;s++)i(s,t[s],o)}e.encodePacket=function(r,n,o,i){"function"==typeof n&&(i=n,n=!1),"function"==typeof o&&(i=o,o=null);var s=void 0===r.data?void 0:r.data.buffer||r.data;if(t.ArrayBuffer&&s instanceof ArrayBuffer)return function(t,r,n){if(!r)return e.encodeBase64Packet(t,n);var o=t.data,i=new Uint8Array(o),s=new Uint8Array(1+o.byteLength);s[0]=p[t.type];for(var a=0;a<i.length;a++)s[a+1]=i[a];return n(s.buffer)}(r,n,i);if(y&&s instanceof t.Blob)return function(t,r,n){if(!r)return e.encodeBase64Packet(t,n);if(h)return function(t,r,n){if(!r)return e.encodeBase64Packet(t,n);var o=new FileReader;return o.onload=function(){t.data=o.result,e.encodePacket(t,r,!0,n)},o.readAsArrayBuffer(t.data)}(t,r,n);var o=new Uint8Array(1);o[0]=p[t.type];var i=new y([o.buffer,t.data]);return n(i)}(r,n,i);if(s&&s.base64)return function(t,r){var n="b"+e.packets[t.type]+t.data.data;return r(n)}(r,i);var a=p[r.type];return void 0!==r.data&&(a+=o?u.encode(String(r.data),{strict:!1}):String(r.data)),i(""+a)},e.encodeBase64Packet=function(r,n){var o,i="b"+e.packets[r.type];if(y&&r.data instanceof t.Blob){var s=new FileReader;return s.onload=function(){var t=s.result.split(",")[1];n(i+t)},s.readAsDataURL(r.data)}try{o=String.fromCharCode.apply(null,new Uint8Array(r.data))}catch(t){for(var a=new Uint8Array(r.data),u=new Array(a.length),c=0;c<a.length;c++)u[c]=a[c];o=String.fromCharCode.apply(null,u)}return i+=t.btoa(o),n(i)},e.decodePacket=function(t,r,n){if(void 0===t)return d;if("string"==typeof t){if("b"===t.charAt(0))return e.decodeBase64Packet(t.substr(1),r);if(n&&!1===(t=function(t){try{t=u.decode(t,{strict:!1})}catch(t){return!1}return t}(t)))return d;var o=t.charAt(0);return Number(o)==o&&l[o]?t.length>1?{type:l[o],data:t.substring(1)}:{type:l[o]}:d}o=new Uint8Array(t)[0];var i=s(t,1);return y&&"blob"===r&&(i=new y([i])),{type:l[o],data:i}},e.decodeBase64Packet=function(t,e){var r=l[t.charAt(0)];if(!n)return{type:r,data:{base64:!0,data:t.substr(1)}};var o=n.decode(t.substr(1));return"blob"===e&&y&&(o=new y([o])),{type:r,data:o}},e.encodePayload=function(t,r,n){"function"==typeof r&&(n=r,r=null);var o=i(t);return r&&o?y&&!h?e.encodePayloadAsBlob(t,n):e.encodePayloadAsArrayBuffer(t,n):t.length?void g(t,function(t,n){e.encodePacket(t,!!o&&r,!1,function(t){n(null,function(t){return t.length+":"+t}(t))})},function(t,e){return n(e.join(""))}):n("0:")},e.decodePayload=function(t,r,n){if("string"!=typeof t)return e.decodePayloadAsBinary(t,r,n);var o;if("function"==typeof r&&(n=r,r=null),""===t)return n(d,0,1);for(var i,s,a="",u=0,c=t.length;u<c;u++){var f=t.charAt(u);if(":"===f){if(""===a||a!=(i=Number(a)))return n(d,0,1);if(a!=(s=t.substr(u+1,i)).length)return n(d,0,1);if(s.length){if(o=e.decodePacket(s,r,!1),d.type===o.type&&d.data===o.data)return n(d,0,1);if(!1===n(o,u+i,c))return}u+=i,a=""}else a+=f}return""!==a?n(d,0,1):void 0},e.encodePayloadAsArrayBuffer=function(t,r){if(!t.length)return r(new ArrayBuffer(0));g(t,function(t,r){e.encodePacket(t,!0,!0,function(t){return r(null,t)})},function(t,e){var n=e.reduce(function(t,e){var r;return t+(r="string"==typeof e?e.length:e.byteLength).toString().length+r+2},0),o=new Uint8Array(n),i=0;return e.forEach(function(t){var e="string"==typeof t,r=t;if(e){for(var n=new Uint8Array(t.length),s=0;s<t.length;s++)n[s]=t.charCodeAt(s);r=n.buffer}o[i++]=e?0:1;var a=r.byteLength.toString();for(s=0;s<a.length;s++)o[i++]=parseInt(a[s]);for(o[i++]=255,n=new Uint8Array(r),s=0;s<n.length;s++)o[i++]=n[s]}),r(o.buffer)})},e.encodePayloadAsBlob=function(t,r){g(t,function(t,r){e.encodePacket(t,!0,!0,function(t){var e=new Uint8Array(1);if(e[0]=1,"string"==typeof t){for(var n=new Uint8Array(t.length),o=0;o<t.length;o++)n[o]=t.charCodeAt(o);t=n.buffer,e[0]=0}var i=(t instanceof ArrayBuffer?t.byteLength:t.size).toString(),s=new Uint8Array(i.length+1);for(o=0;o<i.length;o++)s[o]=parseInt(i[o]);if(s[i.length]=255,y){var a=new y([e.buffer,s.buffer,t]);r(null,a)}})},function(t,e){return r(new y(e))})},e.decodePayloadAsBinary=function(t,r,n){"function"==typeof r&&(n=r,r=null);for(var o=t,i=[];o.byteLength>0;){for(var a=new Uint8Array(o),u=0===a[0],c="",f=1;255!==a[f];f++){if(c.length>310)return n(d,0,1);c+=a[f]}o=s(o,2+c.length),c=parseInt(c);var h=s(o,0,c);if(u)try{h=String.fromCharCode.apply(null,new Uint8Array(h))}catch(t){var p=new Uint8Array(h);for(h="",f=0;f<p.length;f++)h+=String.fromCharCode(p[f])}i.push(h),o=s(o,c)}var l=i.length;i.forEach(function(t,o){n(e.decodePacket(t,r,!0),o,l)})}}).call(this,r(0))},function(t,e){t.exports=function(){return function(){}}},function(t,e){e.encode=function(t){var e="";for(var r in t)t.hasOwnProperty(r)&&(e.length&&(e+="&"),e+=encodeURIComponent(r)+"="+encodeURIComponent(t[r]));return e},e.decode=function(t){for(var e={},r=t.split("&"),n=0,o=r.length;n<o;n++){var i=r[n].split("=");e[decodeURIComponent(i[0])]=decodeURIComponent(i[1])}return e}},function(t,e,r){function n(t){if(t)return function(t){for(var e in n.prototype)t[e]=n.prototype[e];return t}(t)}t.exports=n,n.prototype.on=n.prototype.addEventListener=function(t,e){return this._callbacks=this._callbacks||{},(this._callbacks["$"+t]=this._callbacks["$"+t]||[]).push(e),this},n.prototype.once=function(t,e){function r(){this.off(t,r),e.apply(this,arguments)}return r.fn=e,this.on(t,r),this},n.prototype.off=n.prototype.removeListener=n.prototype.removeAllListeners=n.prototype.removeEventListener=function(t,e){if(this._callbacks=this._callbacks||{},0==arguments.length)return this._callbacks={},this;var r,n=this._callbacks["$"+t];if(!n)return this;if(1==arguments.length)return delete this._callbacks["$"+t],this;for(var o=0;o<n.length;o++)if((r=n[o])===e||r.fn===e){n.splice(o,1);break}return this},n.prototype.emit=function(t){this._callbacks=this._callbacks||{};var e=[].slice.call(arguments,1),r=this._callbacks["$"+t];if(r)for(var n=0,o=(r=r.slice(0)).length;n<o;++n)r[n].apply(this,e);return this},n.prototype.listeners=function(t){return this._callbacks=this._callbacks||{},this._callbacks["$"+t]||[]},n.prototype.hasListeners=function(t){return!!this.listeners(t).length}},function(t,e,r){var n=r(1),o=r(4);function i(t){this.path=t.path,this.hostname=t.hostname,this.port=t.port,this.secure=t.secure,this.query=t.query,this.timestampParam=t.timestampParam,this.timestampRequests=t.timestampRequests,this.readyState="",this.agent=t.agent||!1,this.socket=t.socket,this.enablesXDR=t.enablesXDR,this.pfx=t.pfx,this.key=t.key,this.passphrase=t.passphrase,this.cert=t.cert,this.ca=t.ca,this.ciphers=t.ciphers,this.rejectUnauthorized=t.rejectUnauthorized,this.forceNode=t.forceNode,this.extraHeaders=t.extraHeaders,this.localAddress=t.localAddress}t.exports=i,o(i.prototype),i.prototype.onError=function(t,e){var r=new Error(t);return r.type="TransportError",r.description=e,this.emit("error",r),this},i.prototype.open=function(){return"closed"!==this.readyState&&""!==this.readyState||(this.readyState="opening",this.doOpen()),this},i.prototype.close=function(){return"opening"!==this.readyState&&"open"!==this.readyState||(this.doClose(),this.onClose()),this},i.prototype.send=function(t){if("open"!==this.readyState)throw new Error("Transport not open");this.write(t)},i.prototype.onOpen=function(){this.readyState="open",this.writable=!0,this.emit("open")},i.prototype.onData=function(t){var e=n.decodePacket(t,this.socket.binaryType);this.onPacket(e)},i.prototype.onPacket=function(t){this.emit("packet",t)},i.prototype.onClose=function(){this.readyState="closed",this.emit("close")}},function(t,e,r){var n=r(27);e.websocket=n},function(t,e){var r=/^(?:(?![^:@]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/,n=["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"];t.exports=function(t){var e=t,o=t.indexOf("["),i=t.indexOf("]");-1!=o&&-1!=i&&(t=t.substring(0,o)+t.substring(o,i).replace(/:/g,";")+t.substring(i,t.length));for(var s=r.exec(t||""),a={},u=14;u--;)a[n[u]]=s[u]||"";return-1!=o&&-1!=i&&(a.source=e,a.host=a.host.substring(1,a.host.length-1).replace(/;/g,":"),a.authority=a.authority.replace("[","").replace("]","").replace(/;/g,":"),a.ipv6uri=!0),a}},function(t,e){var r=[].indexOf;t.exports=function(t,e){if(r)return t.indexOf(e);for(var n=0;n<t.length;++n)if(t[n]===e)return n;return-1}},function(t,e,r){"use strict";class n{constructor(t,e){this.target=e,this.type=t}}class o extends n{constructor(t,e){super("message",e),this.data=t}}class i extends n{constructor(t,e,r){super("close",r),this.wasClean=r._closeFrameReceived&&r._closeFrameSent,this.reason=e,this.code=t}}class s extends n{constructor(t){super("open",t)}}class a extends n{constructor(t,e){super("error",e),this.message=t.message,this.error=t}}const u={addEventListener(t,e){function r(t){e.call(this,new o(t,this))}function n(t,r){e.call(this,new i(t,r,this))}function u(t){e.call(this,new a(t,this))}function c(){e.call(this,new s(this))}"function"==typeof e&&("message"===t?(r._listener=e,this.on(t,r)):"close"===t?(n._listener=e,this.on(t,n)):"error"===t?(u._listener=e,this.on(t,u)):"open"===t?(c._listener=e,this.on(t,c)):this.on(t,e))},removeEventListener(t,e){const r=this.listeners(t);for(var n=0;n<r.length;n++)r[n]!==e&&r[n]._listener!==e||this.removeListener(t,r[n])}};t.exports=u},function(t,e){function r(){this._events=this._events||{},this._maxListeners=this._maxListeners||void 0}function n(t){return"function"==typeof t}function o(t){return"object"==typeof t&&null!==t}function i(t){return void 0===t}t.exports=r,r.EventEmitter=r,r.prototype._events=void 0,r.prototype._maxListeners=void 0,r.defaultMaxListeners=10,r.prototype.setMaxListeners=function(t){if("number"!=typeof t||t<0||isNaN(t))throw TypeError("n must be a positive number");return this._maxListeners=t,this},r.prototype.emit=function(t){var e,r,s,a,u,c;if(this._events||(this._events={}),"error"===t&&(!this._events.error||o(this._events.error)&&!this._events.error.length)){if((e=arguments[1])instanceof Error)throw e;var f=new Error('Uncaught, unspecified "error" event. ('+e+")");throw f.context=e,f}if(i(r=this._events[t]))return!1;if(n(r))switch(arguments.length){case 1:r.call(this);break;case 2:r.call(this,arguments[1]);break;case 3:r.call(this,arguments[1],arguments[2]);break;default:a=Array.prototype.slice.call(arguments,1),r.apply(this,a)}else if(o(r))for(a=Array.prototype.slice.call(arguments,1),s=(c=r.slice()).length,u=0;u<s;u++)c[u].apply(this,a);return!0},r.prototype.addListener=function(t,e){var s;if(!n(e))throw TypeError("listener must be a function");return this._events||(this._events={}),this._events.newListener&&this.emit("newListener",t,n(e.listener)?e.listener:e),this._events[t]?o(this._events[t])?this._events[t].push(e):this._events[t]=[this._events[t],e]:this._events[t]=e,o(this._events[t])&&!this._events[t].warned&&(s=i(this._maxListeners)?r.defaultMaxListeners:this._maxListeners)&&s>0&&this._events[t].length>s&&(this._events[t].warned=!0,console.error("(node) warning: possible EventEmitter memory leak detected. %d listeners added. Use emitter.setMaxListeners() to increase limit.",this._events[t].length),"function"==typeof console.trace&&console.trace()),this},r.prototype.on=r.prototype.addListener,r.prototype.once=function(t,e){if(!n(e))throw TypeError("listener must be a function");var r=!1;function o(){this.removeListener(t,o),r||(r=!0,e.apply(this,arguments))}return o.listener=e,this.on(t,o),this},r.prototype.removeListener=function(t,e){var r,i,s,a;if(!n(e))throw TypeError("listener must be a function");if(!this._events||!this._events[t])return this;if(s=(r=this._events[t]).length,i=-1,r===e||n(r.listener)&&r.listener===e)delete this._events[t],this._events.removeListener&&this.emit("removeListener",t,e);else if(o(r)){for(a=s;a-- >0;)if(r[a]===e||r[a].listener&&r[a].listener===e){i=a;break}if(i<0)return this;1===r.length?(r.length=0,delete this._events[t]):r.splice(i,1),this._events.removeListener&&this.emit("removeListener",t,e)}return this},r.prototype.removeAllListeners=function(t){var e,r;if(!this._events)return this;if(!this._events.removeListener)return 0===arguments.length?this._events={}:this._events[t]&&delete this._events[t],this;if(0===arguments.length){for(e in this._events)"removeListener"!==e&&this.removeAllListeners(e);return this.removeAllListeners("removeListener"),this._events={},this}if(n(r=this._events[t]))this.removeListener(t,r);else if(r)for(;r.length;)this.removeListener(t,r[r.length-1]);return delete this._events[t],this},r.prototype.listeners=function(t){return this._events&&this._events[t]?n(this._events[t])?[this._events[t]]:this._events[t].slice():[]},r.prototype.listenerCount=function(t){if(this._events){var e=this._events[t];if(n(e))return 1;if(e)return e.length}return 0},r.listenerCount=function(t,e){return t.listenerCount(e)}},function(t,e,r){const n=r(10),o=r(9),i=r(2)("weapp-socket:"),s=["CONNECTING","OPEN","CLOSING","CLOSED"];class a extends n{constructor(t,e,r){super(),this.readyState=a.CONNECTING,this.protocol="",this._socket=null,null!==t&&(Array.isArray(e)?e=e.join(", "):"object"==typeof e&&null!==e&&(r=e,e=void 0),function(t,e,r){Object.assign(r,{url:t,header:{"content-type":"application/json"},protocols:e,method:"GET"}),this._socket=function(t){const e=wx.connectSocket(t);return i("socketTask: ",e),e||{onClose:wx.onSocketClose,onOpen:wx.onSocketOpen,onError:wx.onSocketError,onMessage:wx.onSocketMessage,send:wx.sendSocketMessage,close:wx.closeSocket}}(r),this.addSocketEventListeners()}.call(this,t,e,r))}get CONNECTING(){return a.CONNECTING}get CLOSING(){return a.CLOSING}get CLOSED(){return a.CLOSED}get OPEN(){return a.OPEN}addSocketEventListeners(){this._socket.onOpen(()=>{this.readyState=a.OPEN,this.onopen()}),this._socket.onClose(t=>{i("onclose: ",t),this.readyState=a.CLOSED,this.onclose(t.code,t.reason)}),this._socket.onError(t=>{i("onerror: ",t),this.onerror(t)}),this._socket.onMessage(t=>{this.onmessage(t)})}send(t){i("send data: ",t,this.readyState),this.readyState===a.OPEN&&this._socket.send({data:t})}close(t,e){i("close socket: ",t,e),this.readyState=a.CLOSING,this._socket.close({code:t,reason:e})}}s.forEach((t,e)=>{a[s[e]]=e}),["open","error","close","message"].forEach(t=>{Object.defineProperty(a.prototype,`on${t}`,{get(){const e=this.listeners(t);for(var r=0;r<e.length;r++)if(e[r]._listener)return e[r]._listener},set(e){const r=this.listeners(t);for(var n=0;n<r.length;n++)r[n]._listener&&this.removeListener(t,r[n]);this.addEventListener(t,e)}})}),a.prototype.addEventListener=o.addEventListener,a.prototype.removeEventListener=o.removeEventListener,t.exports=a},function(t,e,r){"use strict";var n,o="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_".split(""),i=64,s={},a=0,u=0;function c(t){var e="";do{e=o[t%i]+e,t=Math.floor(t/i)}while(t>0);return e}function f(){var t=c(+new Date);return t!==n?(a=0,n=t):t+"."+c(a++)}for(;u<i;u++)s[o[u]]=u;f.encode=c,f.decode=function(t){var e=0;for(u=0;u<t.length;u++)e=e*i+s[t.charAt(u)];return e},t.exports=f},function(t,e){t.exports=function(t,e){var r=function(){};r.prototype=e.prototype,t.prototype=new r,t.prototype.constructor=t}},function(t,e,r){(function(e){var r=e.BlobBuilder||e.WebKitBlobBuilder||e.MSBlobBuilder||e.MozBlobBuilder,n=function(){try{return 2===new Blob(["hi"]).size}catch(t){return!1}}(),o=n&&function(){try{return 2===new Blob([new Uint8Array([1,2])]).size}catch(t){return!1}}(),i=r&&r.prototype.append&&r.prototype.getBlob;function s(t){for(var e=0;e<t.length;e++){var r=t[e];if(r.buffer instanceof ArrayBuffer){var n=r.buffer;if(r.byteLength!==n.byteLength){var o=new Uint8Array(r.byteLength);o.set(new Uint8Array(n,r.byteOffset,r.byteLength)),n=o.buffer}t[e]=n}}}t.exports=n?o?e.Blob:function(t,e){return s(t),new Blob(t,e||{})}:i?function(t,e){e=e||{};var n=new r;s(t);for(var o=0;o<t.length;o++)n.append(t[o]);return e.type?n.getBlob(e.type):n.getBlob()}:void 0}).call(this,r(0))},function(t,e){!function(){"use strict";for(var t="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",r=new Uint8Array(256),n=0;n<t.length;n++)r[t.charCodeAt(n)]=n;e.encode=function(e){var r,n=new Uint8Array(e),o=n.length,i="";for(r=0;r<o;r+=3)i+=t[n[r]>>2],i+=t[(3&n[r])<<4|n[r+1]>>4],i+=t[(15&n[r+1])<<2|n[r+2]>>6],i+=t[63&n[r+2]];return o%3==2?i=i.substring(0,i.length-1)+"=":o%3==1&&(i=i.substring(0,i.length-2)+"=="),i},e.decode=function(t){var e,n,o,i,s,a=.75*t.length,u=t.length,c=0;"="===t[t.length-1]&&(a--,"="===t[t.length-2]&&a--);var f=new ArrayBuffer(a),h=new Uint8Array(f);for(e=0;e<u;e+=4)n=r[t.charCodeAt(e)],o=r[t.charCodeAt(e+1)],i=r[t.charCodeAt(e+2)],s=r[t.charCodeAt(e+3)],h[c++]=n<<2|o>>4,h[c++]=(15&o)<<4|i>>2,h[c++]=(3&i)<<6|63&s;return f}}()},function(t,e){t.exports=function(t){return t.webpackPolyfill||(t.deprecate=function(){},t.paths=[],t.children||(t.children=[]),Object.defineProperty(t,"loaded",{enumerable:!0,get:function(){return t.l}}),Object.defineProperty(t,"id",{enumerable:!0,get:function(){return t.i}}),t.webpackPolyfill=1),t}},function(t,e,r){(function(t,n){var o;/*! https://mths.be/utf8js v2.1.2 by @mathias */!function(i){var s=("object"==typeof t&&t&&t.exports,"object"==typeof n&&n);s.global!==s&&s.window;var a,u,c,f=String.fromCharCode;function h(t){for(var e,r,n=[],o=0,i=t.length;o<i;)(e=t.charCodeAt(o++))>=55296&&e<=56319&&o<i?56320==(64512&(r=t.charCodeAt(o++)))?n.push(((1023&e)<<10)+(1023&r)+65536):(n.push(e),o--):n.push(e);return n}function p(t,e){if(t>=55296&&t<=57343){if(e)throw Error("Lone surrogate U+"+t.toString(16).toUpperCase()+" is not a scalar value");return!1}return!0}function l(t,e){return f(t>>e&63|128)}function d(t,e){if(0==(4294967168&t))return f(t);var r="";return 0==(4294965248&t)?r=f(t>>6&31|192):0==(4294901760&t)?(p(t,e)||(t=65533),r=f(t>>12&15|224),r+=l(t,6)):0==(4292870144&t)&&(r=f(t>>18&7|240),r+=l(t,12),r+=l(t,6)),r+=f(63&t|128)}function y(){if(c>=u)throw Error("Invalid byte index");var t=255&a[c];if(c++,128==(192&t))return 63&t;throw Error("Invalid continuation byte")}function g(t){var e,r;if(c>u)throw Error("Invalid byte index");if(c==u)return!1;if(e=255&a[c],c++,0==(128&e))return e;if(192==(224&e)){if((r=(31&e)<<6|y())>=128)return r;throw Error("Invalid continuation byte")}if(224==(240&e)){if((r=(15&e)<<12|y()<<6|y())>=2048)return p(r,t)?r:65533;throw Error("Invalid continuation byte")}if(240==(248&e)&&(r=(7&e)<<18|y()<<12|y()<<6|y())>=65536&&r<=1114111)return r;throw Error("Invalid UTF-8 detected")}var v={version:"2.1.2",encode:function(t,e){for(var r=!1!==(e=e||{}).strict,n=h(t),o=n.length,i=-1,s="";++i<o;)s+=d(n[i],r);return s},decode:function(t,e){var r=!1!==(e=e||{}).strict;a=h(t),u=a.length,c=0;for(var n,o=[];!1!==(n=g(r));)o.push(n);return function(t){for(var e,r=t.length,n=-1,o="";++n<r;)(e=t[n])>65535&&(o+=f((e-=65536)>>>10&1023|55296),e=56320|1023&e),o+=f(e);return o}(o)}};void 0===(o=function(){return v}.call(e,r,e,t))||(t.exports=o)}()}).call(this,r(16)(t),r(0))},function(t,e){function r(){}t.exports=function(t,e,n){var o=!1;return n=n||r,i.count=t,0===t?e():i;function i(t,r){if(i.count<=0)throw new Error("after called too many times");--i.count,t?(o=!0,e(t),e=n):0!==i.count||o||e(null,r)}}},function(t,e){t.exports=function(t,e,r){var n=t.byteLength;if(e=e||0,r=r||n,t.slice)return t.slice(e,r);if(e<0&&(e+=n),r<0&&(r+=n),r>n&&(r=n),e>=n||e>=r||0===n)return new ArrayBuffer(0);for(var o=new Uint8Array(t),i=new Uint8Array(r-e),s=e,a=0;s<r;s++,a++)i[a]=o[s];return i.buffer}},function(t,e){var r={}.toString;t.exports=Array.isArray||function(t){return"[object Array]"==r.call(t)}},function(t,e){var r={}.toString;t.exports=Array.isArray||function(t){return"[object Array]"==r.call(t)}},function(t,e){e.read=function(t,e,r,n,o){var i,s,a=8*o-n-1,u=(1<<a)-1,c=u>>1,f=-7,h=r?o-1:0,p=r?-1:1,l=t[e+h];for(h+=p,i=l&(1<<-f)-1,l>>=-f,f+=a;f>0;i=256*i+t[e+h],h+=p,f-=8);for(s=i&(1<<-f)-1,i>>=-f,f+=n;f>0;s=256*s+t[e+h],h+=p,f-=8);if(0===i)i=1-c;else{if(i===u)return s?NaN:1/0*(l?-1:1);s+=Math.pow(2,n),i-=c}return(l?-1:1)*s*Math.pow(2,i-n)},e.write=function(t,e,r,n,o,i){var s,a,u,c=8*i-o-1,f=(1<<c)-1,h=f>>1,p=23===o?Math.pow(2,-24)-Math.pow(2,-77):0,l=n?0:i-1,d=n?1:-1,y=e<0||0===e&&1/e<0?1:0;for(e=Math.abs(e),isNaN(e)||e===1/0?(a=isNaN(e)?1:0,s=f):(s=Math.floor(Math.log(e)/Math.LN2),e*(u=Math.pow(2,-s))<1&&(s--,u*=2),(e+=s+h>=1?p/u:p*Math.pow(2,1-h))*u>=2&&(s++,u/=2),s+h>=f?(a=0,s=f):s+h>=1?(a=(e*u-1)*Math.pow(2,o),s+=h):(a=e*Math.pow(2,h-1)*Math.pow(2,o),s=0));o>=8;t[r+l]=255&a,l+=d,a/=256,o-=8);for(s=s<<o|a,c+=o;c>0;t[r+l]=255&s,l+=d,s/=256,c-=8);t[r+l-d]|=128*y}},function(t,e,r){"use strict";e.byteLength=function(t){var e=c(t),r=e[0],n=e[1];return 3*(r+n)/4-n},e.toByteArray=function(t){for(var e,r=c(t),n=r[0],s=r[1],a=new i(NaN),u=0,f=s>0?n-4:n,h=0;h<f;h+=4)e=o[t.charCodeAt(h)]<<18|o[t.charCodeAt(h+1)]<<12|o[t.charCodeAt(h+2)]<<6|o[t.charCodeAt(h+3)],a[u++]=e>>16&255,a[u++]=e>>8&255,a[u++]=255&e;return 2===s&&(e=o[t.charCodeAt(h)]<<2|o[t.charCodeAt(h+1)]>>4,a[u++]=255&e),1===s&&(e=o[t.charCodeAt(h)]<<10|o[t.charCodeAt(h+1)]<<4|o[t.charCodeAt(h+2)]>>2,a[u++]=e>>8&255,a[u++]=255&e),a},e.fromByteArray=function(t){for(var e,r=t.length,o=r%3,i=[],s=0,a=r-o;s<a;s+=16383)i.push(f(t,s,s+16383>a?a:s+16383));return 1===o?(e=t[r-1],i.push(n[e>>2]+n[e<<4&63]+"==")):2===o&&(e=(t[r-2]<<8)+t[r-1],i.push(n[e>>10]+n[e>>4&63]+n[e<<2&63]+"=")),i.join("")};for(var n=[],o=[],i="undefined"!=typeof Uint8Array?Uint8Array:Array,s="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",a=0,u=s.length;a<u;++a)n[a]=s[a],o[s.charCodeAt(a)]=a;function c(t){var e=t.length;if(e%4>0)throw new Error("Invalid string. Length must be a multiple of 4");var r=t.indexOf("=");return-1===r&&(r=e),[r,r===e?0:4-r%4]}function f(t,e,r){for(var o,i,s=[],a=e;a<r;a+=3)o=(t[a]<<16&16711680)+(t[a+1]<<8&65280)+(255&t[a+2]),s.push(n[(i=o)>>18&63]+n[i>>12&63]+n[i>>6&63]+n[63&i]);return s.join("")}o["-".charCodeAt(0)]=62,o["_".charCodeAt(0)]=63},function(t,e,r){"use strict";(function(t){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
var n=r(23),o=r(22),i=r(21);function s(){return u.TYPED_ARRAY_SUPPORT?2147483647:1073741823}function a(t,e){if(s()<e)throw new RangeError("Invalid typed array length");return u.TYPED_ARRAY_SUPPORT?(t=new Uint8Array(e)).__proto__=u.prototype:(null===t&&(t=new u(e)),t.length=e),t}function u(t,e,r){if(!(u.TYPED_ARRAY_SUPPORT||this instanceof u))return new u(t,e,r);if("number"==typeof t){if("string"==typeof e)throw new Error("If encoding is specified then the first argument must be a string");return h(this,t)}return c(this,t,e,r)}function c(t,e,r,n){if("number"==typeof e)throw new TypeError('"value" argument must not be a number');return"undefined"!=typeof ArrayBuffer&&e instanceof ArrayBuffer?function(t,e,r,n){if(e.byteLength,r<0||e.byteLength<r)throw new RangeError("'offset' is out of bounds");if(e.byteLength<r+(n||0))throw new RangeError("'length' is out of bounds");return e=void 0===r&&void 0===n?new Uint8Array(e):void 0===n?new Uint8Array(e,r):new Uint8Array(e,r,n),u.TYPED_ARRAY_SUPPORT?(t=e).__proto__=u.prototype:t=p(t,e),t}(t,e,r,n):"string"==typeof e?function(t,e,r){if("string"==typeof r&&""!==r||(r="utf8"),!u.isEncoding(r))throw new TypeError('"encoding" must be a valid string encoding');var n=0|d(e,r),o=(t=a(t,n)).write(e,r);return o!==n&&(t=t.slice(0,o)),t}(t,e,r):function(t,e){if(u.isBuffer(e)){var r=0|l(e.length);return 0===(t=a(t,r)).length?t:(e.copy(t,0,0,r),t)}if(e){if("undefined"!=typeof ArrayBuffer&&e.buffer instanceof ArrayBuffer||"length"in e)return"number"!=typeof e.length||(n=e.length)!=n?a(t,0):p(t,e);if("Buffer"===e.type&&i(e.data))return p(t,e.data)}var n;throw new TypeError("First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.")}(t,e)}function f(t){if("number"!=typeof t)throw new TypeError('"size" argument must be a number');if(t<0)throw new RangeError('"size" argument must not be negative')}function h(t,e){if(f(e),t=a(t,e<0?0:0|l(e)),!u.TYPED_ARRAY_SUPPORT)for(var r=0;r<e;++r)t[r]=0;return t}function p(t,e){var r=e.length<0?0:0|l(e.length);t=a(t,r);for(var n=0;n<r;n+=1)t[n]=255&e[n];return t}function l(t){if(t>=s())throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x"+s().toString(16)+" bytes");return 0|t}function d(t,e){if(u.isBuffer(t))return t.length;if("undefined"!=typeof ArrayBuffer&&"function"==typeof ArrayBuffer.isView&&(ArrayBuffer.isView(t)||t instanceof ArrayBuffer))return t.byteLength;"string"!=typeof t&&(t=""+t);var r=t.length;if(0===r)return 0;for(var n=!1;;)switch(e){case"ascii":case"latin1":case"binary":return r;case"utf8":case"utf-8":case void 0:return j(t).length;case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return 2*r;case"hex":return r>>>1;case"base64":return q(t).length;default:if(n)return j(t).length;e=(""+e).toLowerCase(),n=!0}}function y(t,e,r){var n=t[e];t[e]=t[r],t[r]=n}function g(t,e,r,n,o){if(0===t.length)return-1;if("string"==typeof r?(n=r,r=0):r>2147483647?r=2147483647:r<-2147483648&&(r=-2147483648),r=+r,isNaN(r)&&(r=o?0:t.length-1),r<0&&(r=t.length+r),r>=t.length){if(o)return-1;r=t.length-1}else if(r<0){if(!o)return-1;r=0}if("string"==typeof e&&(e=u.from(e,n)),u.isBuffer(e))return 0===e.length?-1:v(t,e,r,n,o);if("number"==typeof e)return e&=255,u.TYPED_ARRAY_SUPPORT&&"function"==typeof Uint8Array.prototype.indexOf?o?Uint8Array.prototype.indexOf.call(t,e,r):Uint8Array.prototype.lastIndexOf.call(t,e,r):v(t,[e],r,n,o);throw new TypeError("val must be string, number or Buffer")}function v(t,e,r,n,o){var i,s=1,a=t.length,u=e.length;if(void 0!==n&&("ucs2"===(n=String(n).toLowerCase())||"ucs-2"===n||"utf16le"===n||"utf-16le"===n)){if(t.length<2||e.length<2)return-1;s=2,a/=2,u/=2,r/=2}function c(t,e){return 1===s?t[e]:t.readUInt16BE(e*s)}if(o){var f=-1;for(i=r;i<a;i++)if(c(t,i)===c(e,-1===f?0:i-f)){if(-1===f&&(f=i),i-f+1===u)return f*s}else-1!==f&&(i-=i-f),f=-1}else for(r+u>a&&(r=a-u),i=r;i>=0;i--){for(var h=!0,p=0;p<u;p++)if(c(t,i+p)!==c(e,p)){h=!1;break}if(h)return i}return-1}function b(t,e,r,n){r=Number(r)||0;var o=t.length-r;n?(n=Number(n))>o&&(n=o):n=o;var i=e.length;if(i%2!=0)throw new TypeError("Invalid hex string");n>i/2&&(n=i/2);for(var s=0;s<n;++s){var a=parseInt(e.substr(2*s,2),16);if(isNaN(a))return s;t[r+s]=a}return s}function m(t,e,r,n){return F(j(e,t.length-r),t,r,n)}function w(t,e,r,n){return F(function(t){for(var e=[],r=0;r<t.length;++r)e.push(255&t.charCodeAt(r));return e}(e),t,r,n)}function A(t,e,r,n){return w(t,e,r,n)}function _(t,e,r,n){return F(q(e),t,r,n)}function E(t,e,r,n){return F(function(t,e){for(var r,n,o,i=[],s=0;s<t.length&&!((e-=2)<0);++s)r=t.charCodeAt(s),n=r>>8,o=r%256,i.push(o),i.push(n);return i}(e,t.length-r),t,r,n)}function k(t,e,r){return 0===e&&r===t.length?n.fromByteArray(t):n.fromByteArray(t.slice(e,r))}function B(t,e,r){r=Math.min(t.length,r);for(var n=[],o=e;o<r;){var i,s,a,u,c=t[o],f=null,h=c>239?4:c>223?3:c>191?2:1;if(o+h<=r)switch(h){case 1:c<128&&(f=c);break;case 2:128==(192&(i=t[o+1]))&&(u=(31&c)<<6|63&i)>127&&(f=u);break;case 3:i=t[o+1],s=t[o+2],128==(192&i)&&128==(192&s)&&(u=(15&c)<<12|(63&i)<<6|63&s)>2047&&(u<55296||u>57343)&&(f=u);break;case 4:i=t[o+1],s=t[o+2],a=t[o+3],128==(192&i)&&128==(192&s)&&128==(192&a)&&(u=(15&c)<<18|(63&i)<<12|(63&s)<<6|63&a)>65535&&u<1114112&&(f=u)}null===f?(f=65533,h=1):f>65535&&(f-=65536,n.push(f>>>10&1023|55296),f=56320|1023&f),n.push(f),o+=h}return function(t){var e=t.length;if(e<=R)return String.fromCharCode.apply(String,t);for(var r="",n=0;n<e;)r+=String.fromCharCode.apply(String,t.slice(n,n+=R));return r}(n)}e.Buffer=u,e.SlowBuffer=function(t){return+t!=t&&(t=0),u.alloc(+t)},e.INSPECT_MAX_BYTES=50,u.TYPED_ARRAY_SUPPORT=void 0!==t.TYPED_ARRAY_SUPPORT?t.TYPED_ARRAY_SUPPORT:function(){try{var t=new Uint8Array(1);return t.__proto__={__proto__:Uint8Array.prototype,foo:function(){return 42}},42===t.foo()&&"function"==typeof t.subarray&&0===t.subarray(1,1).byteLength}catch(t){return!1}}(),e.kMaxLength=s(),u.poolSize=8192,u._augment=function(t){return t.__proto__=u.prototype,t},u.from=function(t,e,r){return c(null,t,e,r)},u.TYPED_ARRAY_SUPPORT&&(u.prototype.__proto__=Uint8Array.prototype,u.__proto__=Uint8Array,"undefined"!=typeof Symbol&&Symbol.species&&u[Symbol.species]===u&&Object.defineProperty(u,Symbol.species,{value:null,configurable:!0})),u.alloc=function(t,e,r){return function(t,e,r,n){return f(e),e<=0?a(t,e):void 0!==r?"string"==typeof n?a(t,e).fill(r,n):a(t,e).fill(r):a(t,e)}(null,t,e,r)},u.allocUnsafe=function(t){return h(null,t)},u.allocUnsafeSlow=function(t){return h(null,t)},u.isBuffer=function(t){return!(null==t||!t._isBuffer)},u.compare=function(t,e){if(!u.isBuffer(t)||!u.isBuffer(e))throw new TypeError("Arguments must be Buffers");if(t===e)return 0;for(var r=t.length,n=e.length,o=0,i=Math.min(r,n);o<i;++o)if(t[o]!==e[o]){r=t[o],n=e[o];break}return r<n?-1:n<r?1:0},u.isEncoding=function(t){switch(String(t).toLowerCase()){case"hex":case"utf8":case"utf-8":case"ascii":case"latin1":case"binary":case"base64":case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return!0;default:return!1}},u.concat=function(t,e){if(!i(t))throw new TypeError('"list" argument must be an Array of Buffers');if(0===t.length)return u.alloc(0);var r;if(void 0===e)for(e=0,r=0;r<t.length;++r)e+=t[r].length;var n=u.allocUnsafe(e),o=0;for(r=0;r<t.length;++r){var s=t[r];if(!u.isBuffer(s))throw new TypeError('"list" argument must be an Array of Buffers');s.copy(n,o),o+=s.length}return n},u.byteLength=d,u.prototype._isBuffer=!0,u.prototype.swap16=function(){var t=this.length;if(t%2!=0)throw new RangeError("Buffer size must be a multiple of 16-bits");for(var e=0;e<t;e+=2)y(this,e,e+1);return this},u.prototype.swap32=function(){var t=this.length;if(t%4!=0)throw new RangeError("Buffer size must be a multiple of 32-bits");for(var e=0;e<t;e+=4)y(this,e,e+3),y(this,e+1,e+2);return this},u.prototype.swap64=function(){var t=this.length;if(t%8!=0)throw new RangeError("Buffer size must be a multiple of 64-bits");for(var e=0;e<t;e+=8)y(this,e,e+7),y(this,e+1,e+6),y(this,e+2,e+5),y(this,e+3,e+4);return this},u.prototype.toString=function(){var t=0|this.length;return 0===t?"":0===arguments.length?B(this,0,t):function(t,e,r){var n=!1;if((void 0===e||e<0)&&(e=0),e>this.length)return"";if((void 0===r||r>this.length)&&(r=this.length),r<=0)return"";if((r>>>=0)<=(e>>>=0))return"";for(t||(t="utf8");;)switch(t){case"hex":return T(this,e,r);case"utf8":case"utf-8":return B(this,e,r);case"ascii":return P(this,e,r);case"latin1":case"binary":return S(this,e,r);case"base64":return k(this,e,r);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return O(this,e,r);default:if(n)throw new TypeError("Unknown encoding: "+t);t=(t+"").toLowerCase(),n=!0}}.apply(this,arguments)},u.prototype.equals=function(t){if(!u.isBuffer(t))throw new TypeError("Argument must be a Buffer");return this===t||0===u.compare(this,t)},u.prototype.inspect=function(){var t="",r=e.INSPECT_MAX_BYTES;return this.length>0&&(t=this.toString("hex",0,r).match(/.{2}/g).join(" "),this.length>r&&(t+=" ... ")),"<Buffer "+t+">"},u.prototype.compare=function(t,e,r,n,o){if(!u.isBuffer(t))throw new TypeError("Argument must be a Buffer");if(void 0===e&&(e=0),void 0===r&&(r=t?t.length:0),void 0===n&&(n=0),void 0===o&&(o=this.length),e<0||r>t.length||n<0||o>this.length)throw new RangeError("out of range index");if(n>=o&&e>=r)return 0;if(n>=o)return-1;if(e>=r)return 1;if(e>>>=0,r>>>=0,n>>>=0,o>>>=0,this===t)return 0;for(var i=o-n,s=r-e,a=Math.min(i,s),c=this.slice(n,o),f=t.slice(e,r),h=0;h<a;++h)if(c[h]!==f[h]){i=c[h],s=f[h];break}return i<s?-1:s<i?1:0},u.prototype.includes=function(t,e,r){return-1!==this.indexOf(t,e,r)},u.prototype.indexOf=function(t,e,r){return g(this,t,e,r,!0)},u.prototype.lastIndexOf=function(t,e,r){return g(this,t,e,r,!1)},u.prototype.write=function(t,e,r,n){if(void 0===e)n="utf8",r=this.length,e=0;else if(void 0===r&&"string"==typeof e)n=e,r=this.length,e=0;else{if(!isFinite(e))throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");e|=0,isFinite(r)?(r|=0,void 0===n&&(n="utf8")):(n=r,r=void 0)}var o=this.length-e;if((void 0===r||r>o)&&(r=o),t.length>0&&(r<0||e<0)||e>this.length)throw new RangeError("Attempt to write outside buffer bounds");n||(n="utf8");for(var i=!1;;)switch(n){case"hex":return b(this,t,e,r);case"utf8":case"utf-8":return m(this,t,e,r);case"ascii":return w(this,t,e,r);case"latin1":case"binary":return A(this,t,e,r);case"base64":return _(this,t,e,r);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return E(this,t,e,r);default:if(i)throw new TypeError("Unknown encoding: "+n);n=(""+n).toLowerCase(),i=!0}},u.prototype.toJSON=function(){return{type:"Buffer",data:Array.prototype.slice.call(this._arr||this,0)}};var R=4096;function P(t,e,r){var n="";r=Math.min(t.length,r);for(var o=e;o<r;++o)n+=String.fromCharCode(127&t[o]);return n}function S(t,e,r){var n="";r=Math.min(t.length,r);for(var o=e;o<r;++o)n+=String.fromCharCode(t[o]);return n}function T(t,e,r){var n=t.length;(!e||e<0)&&(e=0),(!r||r<0||r>n)&&(r=n);for(var o="",i=e;i<r;++i)o+=D(t[i]);return o}function O(t,e,r){for(var n=t.slice(e,r),o="",i=0;i<n.length;i+=2)o+=String.fromCharCode(n[i]+256*n[i+1]);return o}function x(t,e,r){if(t%1!=0||t<0)throw new RangeError("offset is not uint");if(t+e>r)throw new RangeError("Trying to access beyond buffer length")}function C(t,e,r,n,o,i){if(!u.isBuffer(t))throw new TypeError('"buffer" argument must be a Buffer instance');if(e>o||e<i)throw new RangeError('"value" argument is out of bounds');if(r+n>t.length)throw new RangeError("Index out of range")}function U(t,e,r,n){e<0&&(e=65535+e+1);for(var o=0,i=Math.min(t.length-r,2);o<i;++o)t[r+o]=(e&255<<8*(n?o:1-o))>>>8*(n?o:1-o)}function L(t,e,r,n){e<0&&(e=4294967295+e+1);for(var o=0,i=Math.min(t.length-r,4);o<i;++o)t[r+o]=e>>>8*(n?o:3-o)&255}function I(t,e,r,n,o,i){if(r+n>t.length)throw new RangeError("Index out of range");if(r<0)throw new RangeError("Index out of range")}function N(t,e,r,n,i){return i||I(t,0,r,4),o.write(t,e,r,n,23,4),r+4}function M(t,e,r,n,i){return i||I(t,0,r,8),o.write(t,e,r,n,52,8),r+8}u.prototype.slice=function(t,e){var r,n=this.length;if(t=~~t,e=void 0===e?n:~~e,t<0?(t+=n)<0&&(t=0):t>n&&(t=n),e<0?(e+=n)<0&&(e=0):e>n&&(e=n),e<t&&(e=t),u.TYPED_ARRAY_SUPPORT)(r=this.subarray(t,e)).__proto__=u.prototype;else{var o=e-t;r=new u(o,void 0);for(var i=0;i<o;++i)r[i]=this[i+t]}return r},u.prototype.readUIntLE=function(t,e,r){t|=0,e|=0,r||x(t,e,this.length);for(var n=this[t],o=1,i=0;++i<e&&(o*=256);)n+=this[t+i]*o;return n},u.prototype.readUIntBE=function(t,e,r){t|=0,e|=0,r||x(t,e,this.length);for(var n=this[t+--e],o=1;e>0&&(o*=256);)n+=this[t+--e]*o;return n},u.prototype.readUInt8=function(t,e){return e||x(t,1,this.length),this[t]},u.prototype.readUInt16LE=function(t,e){return e||x(t,2,this.length),this[t]|this[t+1]<<8},u.prototype.readUInt16BE=function(t,e){return e||x(t,2,this.length),this[t]<<8|this[t+1]},u.prototype.readUInt32LE=function(t,e){return e||x(t,4,this.length),(this[t]|this[t+1]<<8|this[t+2]<<16)+16777216*this[t+3]},u.prototype.readUInt32BE=function(t,e){return e||x(t,4,this.length),16777216*this[t]+(this[t+1]<<16|this[t+2]<<8|this[t+3])},u.prototype.readIntLE=function(t,e,r){t|=0,e|=0,r||x(t,e,this.length);for(var n=this[t],o=1,i=0;++i<e&&(o*=256);)n+=this[t+i]*o;return n>=(o*=128)&&(n-=Math.pow(2,8*e)),n},u.prototype.readIntBE=function(t,e,r){t|=0,e|=0,r||x(t,e,this.length);for(var n=e,o=1,i=this[t+--n];n>0&&(o*=256);)i+=this[t+--n]*o;return i>=(o*=128)&&(i-=Math.pow(2,8*e)),i},u.prototype.readInt8=function(t,e){return e||x(t,1,this.length),128&this[t]?-1*(255-this[t]+1):this[t]},u.prototype.readInt16LE=function(t,e){e||x(t,2,this.length);var r=this[t]|this[t+1]<<8;return 32768&r?4294901760|r:r},u.prototype.readInt16BE=function(t,e){e||x(t,2,this.length);var r=this[t+1]|this[t]<<8;return 32768&r?4294901760|r:r},u.prototype.readInt32LE=function(t,e){return e||x(t,4,this.length),this[t]|this[t+1]<<8|this[t+2]<<16|this[t+3]<<24},u.prototype.readInt32BE=function(t,e){return e||x(t,4,this.length),this[t]<<24|this[t+1]<<16|this[t+2]<<8|this[t+3]},u.prototype.readFloatLE=function(t,e){return e||x(t,4,this.length),o.read(this,t,!0,23,4)},u.prototype.readFloatBE=function(t,e){return e||x(t,4,this.length),o.read(this,t,!1,23,4)},u.prototype.readDoubleLE=function(t,e){return e||x(t,8,this.length),o.read(this,t,!0,52,8)},u.prototype.readDoubleBE=function(t,e){return e||x(t,8,this.length),o.read(this,t,!1,52,8)},u.prototype.writeUIntLE=function(t,e,r,n){t=+t,e|=0,r|=0,n||C(this,t,e,r,Math.pow(2,8*r)-1,0);var o=1,i=0;for(this[e]=255&t;++i<r&&(o*=256);)this[e+i]=t/o&255;return e+r},u.prototype.writeUIntBE=function(t,e,r,n){t=+t,e|=0,r|=0,n||C(this,t,e,r,Math.pow(2,8*r)-1,0);var o=r-1,i=1;for(this[e+o]=255&t;--o>=0&&(i*=256);)this[e+o]=t/i&255;return e+r},u.prototype.writeUInt8=function(t,e,r){return t=+t,e|=0,r||C(this,t,e,1,255,0),u.TYPED_ARRAY_SUPPORT||(t=Math.floor(t)),this[e]=255&t,e+1},u.prototype.writeUInt16LE=function(t,e,r){return t=+t,e|=0,r||C(this,t,e,2,65535,0),u.TYPED_ARRAY_SUPPORT?(this[e]=255&t,this[e+1]=t>>>8):U(this,t,e,!0),e+2},u.prototype.writeUInt16BE=function(t,e,r){return t=+t,e|=0,r||C(this,t,e,2,65535,0),u.TYPED_ARRAY_SUPPORT?(this[e]=t>>>8,this[e+1]=255&t):U(this,t,e,!1),e+2},u.prototype.writeUInt32LE=function(t,e,r){return t=+t,e|=0,r||C(this,t,e,4,4294967295,0),u.TYPED_ARRAY_SUPPORT?(this[e+3]=t>>>24,this[e+2]=t>>>16,this[e+1]=t>>>8,this[e]=255&t):L(this,t,e,!0),e+4},u.prototype.writeUInt32BE=function(t,e,r){return t=+t,e|=0,r||C(this,t,e,4,4294967295,0),u.TYPED_ARRAY_SUPPORT?(this[e]=t>>>24,this[e+1]=t>>>16,this[e+2]=t>>>8,this[e+3]=255&t):L(this,t,e,!1),e+4},u.prototype.writeIntLE=function(t,e,r,n){if(t=+t,e|=0,!n){var o=Math.pow(2,8*r-1);C(this,t,e,r,o-1,-o)}var i=0,s=1,a=0;for(this[e]=255&t;++i<r&&(s*=256);)t<0&&0===a&&0!==this[e+i-1]&&(a=1),this[e+i]=(t/s>>0)-a&255;return e+r},u.prototype.writeIntBE=function(t,e,r,n){if(t=+t,e|=0,!n){var o=Math.pow(2,8*r-1);C(this,t,e,r,o-1,-o)}var i=r-1,s=1,a=0;for(this[e+i]=255&t;--i>=0&&(s*=256);)t<0&&0===a&&0!==this[e+i+1]&&(a=1),this[e+i]=(t/s>>0)-a&255;return e+r},u.prototype.writeInt8=function(t,e,r){return t=+t,e|=0,r||C(this,t,e,1,127,-128),u.TYPED_ARRAY_SUPPORT||(t=Math.floor(t)),t<0&&(t=255+t+1),this[e]=255&t,e+1},u.prototype.writeInt16LE=function(t,e,r){return t=+t,e|=0,r||C(this,t,e,2,32767,-32768),u.TYPED_ARRAY_SUPPORT?(this[e]=255&t,this[e+1]=t>>>8):U(this,t,e,!0),e+2},u.prototype.writeInt16BE=function(t,e,r){return t=+t,e|=0,r||C(this,t,e,2,32767,-32768),u.TYPED_ARRAY_SUPPORT?(this[e]=t>>>8,this[e+1]=255&t):U(this,t,e,!1),e+2},u.prototype.writeInt32LE=function(t,e,r){return t=+t,e|=0,r||C(this,t,e,4,2147483647,-2147483648),u.TYPED_ARRAY_SUPPORT?(this[e]=255&t,this[e+1]=t>>>8,this[e+2]=t>>>16,this[e+3]=t>>>24):L(this,t,e,!0),e+4},u.prototype.writeInt32BE=function(t,e,r){return t=+t,e|=0,r||C(this,t,e,4,2147483647,-2147483648),t<0&&(t=4294967295+t+1),u.TYPED_ARRAY_SUPPORT?(this[e]=t>>>24,this[e+1]=t>>>16,this[e+2]=t>>>8,this[e+3]=255&t):L(this,t,e,!1),e+4},u.prototype.writeFloatLE=function(t,e,r){return N(this,t,e,!0,r)},u.prototype.writeFloatBE=function(t,e,r){return N(this,t,e,!1,r)},u.prototype.writeDoubleLE=function(t,e,r){return M(this,t,e,!0,r)},u.prototype.writeDoubleBE=function(t,e,r){return M(this,t,e,!1,r)},u.prototype.copy=function(t,e,r,n){if(r||(r=0),n||0===n||(n=this.length),e>=t.length&&(e=t.length),e||(e=0),n>0&&n<r&&(n=r),n===r)return 0;if(0===t.length||0===this.length)return 0;if(e<0)throw new RangeError("targetStart out of bounds");if(r<0||r>=this.length)throw new RangeError("sourceStart out of bounds");if(n<0)throw new RangeError("sourceEnd out of bounds");n>this.length&&(n=this.length),t.length-e<n-r&&(n=t.length-e+r);var o,i=n-r;if(this===t&&r<e&&e<n)for(o=i-1;o>=0;--o)t[o+e]=this[o+r];else if(i<1e3||!u.TYPED_ARRAY_SUPPORT)for(o=0;o<i;++o)t[o+e]=this[o+r];else Uint8Array.prototype.set.call(t,this.subarray(r,r+i),e);return i},u.prototype.fill=function(t,e,r,n){if("string"==typeof t){if("string"==typeof e?(n=e,e=0,r=this.length):"string"==typeof r&&(n=r,r=this.length),1===t.length){var o=t.charCodeAt(0);o<256&&(t=o)}if(void 0!==n&&"string"!=typeof n)throw new TypeError("encoding must be a string");if("string"==typeof n&&!u.isEncoding(n))throw new TypeError("Unknown encoding: "+n)}else"number"==typeof t&&(t&=255);if(e<0||this.length<e||this.length<r)throw new RangeError("Out of range index");if(r<=e)return this;var i;if(e>>>=0,r=void 0===r?this.length:r>>>0,t||(t=0),"number"==typeof t)for(i=e;i<r;++i)this[i]=t;else{var s=u.isBuffer(t)?t:j(new u(t,n).toString()),a=s.length;for(i=0;i<r-e;++i)this[i+e]=s[i%a]}return this};var Y=/[^+\/0-9A-Za-z-_]/g;function D(t){return t<16?"0"+t.toString(16):t.toString(16)}function j(t,e){var r;e=e||1/0;for(var n=t.length,o=null,i=[],s=0;s<n;++s){if((r=t.charCodeAt(s))>55295&&r<57344){if(!o){if(r>56319){(e-=3)>-1&&i.push(239,191,189);continue}if(s+1===n){(e-=3)>-1&&i.push(239,191,189);continue}o=r;continue}if(r<56320){(e-=3)>-1&&i.push(239,191,189),o=r;continue}r=65536+(o-55296<<10|r-56320)}else o&&(e-=3)>-1&&i.push(239,191,189);if(o=null,r<128){if((e-=1)<0)break;i.push(r)}else if(r<2048){if((e-=2)<0)break;i.push(r>>6|192,63&r|128)}else if(r<65536){if((e-=3)<0)break;i.push(r>>12|224,r>>6&63|128,63&r|128)}else{if(!(r<1114112))throw new Error("Invalid code point");if((e-=4)<0)break;i.push(r>>18|240,r>>12&63|128,r>>6&63|128,63&r|128)}}return i}function q(t){return n.toByteArray(function(t){if((t=function(t){return t.trim?t.trim():t.replace(/^\s+|\s+$/g,"")}(t).replace(Y,"")).length<2)return"";for(;t.length%4!=0;)t+="=";return t}(t))}function F(t,e,r,n){for(var o=0;o<n&&!(o+r>=e.length||o>=t.length);++o)e[o+r]=t[o];return o}}).call(this,r(0))},function(t,e,r){(function(e){var n=r(20),o=Object.prototype.toString,i="function"==typeof Blob||"undefined"!=typeof Blob&&"[object BlobConstructor]"===o.call(Blob),s="function"==typeof File||"undefined"!=typeof File&&"[object FileConstructor]"===o.call(File);t.exports=function t(r){if(!r||"object"!=typeof r)return!1;if(n(r)){for(var o=0,a=r.length;o<a;o++)if(t(r[o]))return!0;return!1}if("function"==typeof e&&e.isBuffer&&e.isBuffer(r)||"function"==typeof ArrayBuffer&&r instanceof ArrayBuffer||i&&r instanceof Blob||s&&r instanceof File)return!0;if(r.toJSON&&"function"==typeof r.toJSON&&1===arguments.length)return t(r.toJSON(),!0);for(var u in r)if(Object.prototype.hasOwnProperty.call(r,u)&&t(r[u]))return!0;return!1}}).call(this,r(24).Buffer)},function(t,e){t.exports=Object.keys||function(t){var e=[],r=Object.prototype.hasOwnProperty;for(var n in t)r.call(t,n)&&e.push(n);return e}},function(t,e,r){(function(e){var n,o=r(5),i=r(1),s=r(3),a=r(13),u=r(12),c=r(2)("engine.io-client:websocket"),f=e.WebSocket||e.MozWebSocket;if("undefined"==typeof window)try{n=r(11)}catch(t){c("require error: ",t)}var h=f;function p(t){t&&t.forceBase64&&(this.supportsBinary=!1),this.perMessageDeflate=t.perMessageDeflate,this.usingBrowserWebSocket=f&&!t.forceNode,this.protocols=t.protocols,this.usingBrowserWebSocket||(h=n),o.call(this,t)}h||"undefined"!=typeof window||(h=n),t.exports=p,a(p,o),p.prototype.name="websocket",p.prototype.supportsBinary=!0,p.prototype.doOpen=function(){if(c("wesocket do open: ",this.protocols),this.check()){var t=this.uri(),e=this.protocols,r={agent:this.agent,perMessageDeflate:this.perMessageDeflate};r.pfx=this.pfx,r.key=this.key,r.passphrase=this.passphrase,r.cert=this.cert,r.ca=this.ca,r.ciphers=this.ciphers,r.rejectUnauthorized=this.rejectUnauthorized,this.extraHeaders&&(r.headers=this.extraHeaders),this.localAddress&&(r.localAddress=this.localAddress);try{this.ws=this.usingBrowserWebSocket?e?new h(t,e):new h(t):new h(t,e,r)}catch(t){return this.emit("error",t)}void 0===this.ws.binaryType&&(this.supportsBinary=!1),this.ws.supports&&this.ws.supports.binary?(this.supportsBinary=!0,this.ws.binaryType="nodebuffer"):this.ws.binaryType="arraybuffer",this.addEventListeners()}},p.prototype.addEventListeners=function(){var t=this;this.ws.onopen=function(){t.onOpen()},this.ws.onclose=function(){t.onClose()},this.ws.onmessage=function(e){t.onData(e.data)},this.ws.onerror=function(e){t.onError("websocket error",e)}},p.prototype.write=function(t){var e=this;this.writable=!1;for(var r,n=t.length,o=0,s=n;o<s;o++)r=t[o],i.encodePacket(r,e.supportsBinary,function(t){try{e.ws.send(t)}catch(t){}--n||(e.emit("flush"),setTimeout(function(){e.writable=!0,e.emit("drain")},0))})},p.prototype.onClose=function(){o.prototype.onClose.call(this)},p.prototype.doClose=function(){void 0!==this.ws&&this.ws.close()},p.prototype.uri=function(){var t=this.query||{},e=this.secure?"wss":"ws",r="";return this.port&&("wss"===e&&443!==Number(this.port)||"ws"===e&&80!==Number(this.port))&&(r=":"+this.port),this.timestampRequests&&(t[this.timestampParam]=u()),this.supportsBinary||(t.b64=1),(t=s.encode(t)).length&&(t="?"+t),e+"://"+(-1!==this.hostname.indexOf(":")?"["+this.hostname+"]":this.hostname)+r+this.path+t},p.prototype.check=function(){return!(!h||"__initialize"in h&&this.name===p.prototype.name)}}).call(this,r(0))},function(t,e,r){(function(e){var n=r(6),o=r(4),i=r(2)("engine.io-client:socket"),s=r(8),a=r(1),u=r(7),c=r(3);function f(t,r){if(!(this instanceof f))return new f(t,r);r=r||{},t&&"object"==typeof t&&(r=t,t=null),t?(t=u(t),r.hostname=t.host,r.secure="https"===t.protocol||"wss"===t.protocol,r.port=t.port,t.query&&(r.query=t.query)):r.host&&(r.hostname=u(r.host).host),this.secure=null!=r.secure?r.secure:e.location&&"https:"===location.protocol,r.hostname&&!r.port&&(r.port=this.secure?"443":"80"),this.agent=r.agent||!1,this.hostname=r.hostname||(e.location?location.hostname:"localhost"),this.port=r.port||(e.location&&location.port?location.port:this.secure?443:80),this.query=r.query||{},"string"==typeof this.query&&(this.query=c.decode(this.query)),this.upgrade=!1!==r.upgrade,this.path=(r.path||"/engine.io").replace(/\/$/,"")+"/",this.forceJSONP=!!r.forceJSONP,this.jsonp=!1!==r.jsonp,this.forceBase64=!!r.forceBase64,this.enablesXDR=!!r.enablesXDR,this.timestampParam=r.timestampParam||"t",this.timestampRequests=r.timestampRequests,this.transports=r.transports||["websocket"],this.transportOptions=r.transportOptions||{},this.readyState="",this.writeBuffer=[],this.prevBufferLen=0,this.policyPort=r.policyPort||843,this.rememberUpgrade=r.rememberUpgrade||!1,this.binaryType=null,this.onlyBinaryUpgrades=r.onlyBinaryUpgrades,this.perMessageDeflate=!1!==r.perMessageDeflate&&(r.perMessageDeflate||{}),!0===this.perMessageDeflate&&(this.perMessageDeflate={}),this.perMessageDeflate&&null==this.perMessageDeflate.threshold&&(this.perMessageDeflate.threshold=1024),this.pfx=r.pfx||null,this.key=r.key||null,this.passphrase=r.passphrase||null,this.cert=r.cert||null,this.ca=r.ca||null,this.ciphers=r.ciphers||null,this.rejectUnauthorized=void 0===r.rejectUnauthorized||r.rejectUnauthorized,this.forceNode=!!r.forceNode;var n="object"==typeof e&&e;n.global===n&&(r.extraHeaders&&Object.keys(r.extraHeaders).length>0&&(this.extraHeaders=r.extraHeaders),r.localAddress&&(this.localAddress=r.localAddress)),this.id=null,this.upgrades=null,this.pingInterval=null,this.pingTimeout=null,this.pingIntervalTimer=null,this.pingTimeoutTimer=null,this.open()}t.exports=f,f.priorWebsocketSuccess=!1,o(f.prototype),f.protocol=a.protocol,f.Socket=f,f.Transport=r(5),f.transports=r(6),f.parser=r(1),f.prototype.createTransport=function(t){i('creating transport "%s"',t);var e=function(t){var e={};for(var r in t)t.hasOwnProperty(r)&&(e[r]=t[r]);return e}(this.query);e.EIO=a.protocol,e.transport=t;var r=this.transportOptions[t]||{};this.id&&(e.sid=this.id);var o=new n[t]({query:e,socket:this,agent:r.agent||this.agent,hostname:r.hostname||this.hostname,port:r.port||this.port,secure:r.secure||this.secure,path:r.path||this.path,forceJSONP:r.forceJSONP||this.forceJSONP,jsonp:r.jsonp||this.jsonp,forceBase64:r.forceBase64||this.forceBase64,enablesXDR:r.enablesXDR||this.enablesXDR,timestampRequests:r.timestampRequests||this.timestampRequests,timestampParam:r.timestampParam||this.timestampParam,policyPort:r.policyPort||this.policyPort,pfx:r.pfx||this.pfx,key:r.key||this.key,passphrase:r.passphrase||this.passphrase,cert:r.cert||this.cert,ca:r.ca||this.ca,ciphers:r.ciphers||this.ciphers,rejectUnauthorized:r.rejectUnauthorized||this.rejectUnauthorized,perMessageDeflate:r.perMessageDeflate||this.perMessageDeflate,extraHeaders:r.extraHeaders||this.extraHeaders,forceNode:r.forceNode||this.forceNode,localAddress:r.localAddress||this.localAddress,requestTimeout:r.requestTimeout||this.requestTimeout,protocols:r.protocols||void 0});return i("transport: ",o),o},f.prototype.open=function(){var t;if(this.rememberUpgrade&&f.priorWebsocketSuccess&&-1!==this.transports.indexOf("websocket"))t="websocket";else{if(0===this.transports.length){var e=this;return void setTimeout(function(){e.emit("error","No transports available")},0)}t=this.transports[0]}this.readyState="opening";try{t=this.createTransport(t)}catch(t){return this.transports.shift(),void this.open()}t.open(),this.setTransport(t)},f.prototype.setTransport=function(t){i("setting transport %s",t.name);var e=this;this.transport&&(i("clearing existing transport %s",this.transport.name),this.transport.removeAllListeners()),this.transport=t,t.on("drain",function(){e.onDrain()}).on("packet",function(t){e.onPacket(t)}).on("error",function(t){e.onError(t)}).on("close",function(){e.onClose("transport close")})},f.prototype.probe=function(t){i('probing transport "%s"',t);var e=this.createTransport(t,{probe:1}),r=!1,n=this;function o(){if(n.onlyBinaryUpgrades){var o=!this.supportsBinary&&n.transport.supportsBinary;r=r||o}r||(i('probe transport "%s" opened',t),e.send([{type:"ping",data:"probe"}]),e.once("packet",function(o){if(!r)if("pong"===o.type&&"probe"===o.data){if(i('probe transport "%s" pong',t),n.upgrading=!0,n.emit("upgrading",e),!e)return;f.priorWebsocketSuccess="websocket"===e.name,i('pausing current transport "%s"',n.transport.name),n.transport.pause(function(){r||"closed"!==n.readyState&&(i("changing transport and sending upgrade packet"),p(),n.setTransport(e),e.send([{type:"upgrade"}]),n.emit("upgrade",e),e=null,n.upgrading=!1,n.flush())})}else{i('probe transport "%s" failed',t);var s=new Error("probe error");s.transport=e.name,n.emit("upgradeError",s)}}))}function s(){r||(r=!0,p(),e.close(),e=null)}function a(r){var o=new Error("probe error: "+r);o.transport=e.name,s(),i('probe transport "%s" failed because of error: %s',t,r),n.emit("upgradeError",o)}function u(){a("transport closed")}function c(){a("socket closed")}function h(t){e&&t.name!==e.name&&(i('"%s" works - aborting "%s"',t.name,e.name),s())}function p(){e.removeListener("open",o),e.removeListener("error",a),e.removeListener("close",u),n.removeListener("close",c),n.removeListener("upgrading",h)}f.priorWebsocketSuccess=!1,e.once("open",o),e.once("error",a),e.once("close",u),this.once("close",c),this.once("upgrading",h),e.open()},f.prototype.onOpen=function(){if(i("socket open"),this.readyState="open",f.priorWebsocketSuccess="websocket"===this.transport.name,this.emit("open"),this.flush(),"open"===this.readyState&&this.upgrade&&this.transport.pause){i("starting upgrade probes");for(var t=0,e=this.upgrades.length;t<e;t++)this.probe(this.upgrades[t])}},f.prototype.onPacket=function(t){if("opening"===this.readyState||"open"===this.readyState||"closing"===this.readyState)switch(i('socket receive: type "%s", data "%s"',t.type,t.data),this.emit("packet",t),this.emit("heartbeat"),t.type){case"open":this.onHandshake(JSON.parse(t.data));break;case"pong":this.setPing(),this.emit("pong");break;case"error":var e=new Error("server error");e.code=t.data,this.onError(e);break;case"message":this.emit("data",t.data),this.emit("message",t.data)}else i('packet received with socket readyState "%s"',this.readyState)},f.prototype.onHandshake=function(t){this.emit("handshake",t),this.id=t.sid,this.transport.query.sid=t.sid,this.upgrades=this.filterUpgrades(t.upgrades),this.pingInterval=t.pingInterval,this.pingTimeout=t.pingTimeout,this.onOpen(),"closed"!==this.readyState&&(this.setPing(),this.removeListener("heartbeat",this.onHeartbeat),this.on("heartbeat",this.onHeartbeat))},f.prototype.onHeartbeat=function(t){clearTimeout(this.pingTimeoutTimer);var e=this;e.pingTimeoutTimer=setTimeout(function(){"closed"!==e.readyState&&e.onClose("ping timeout")},t||e.pingInterval+e.pingTimeout)},f.prototype.setPing=function(){var t=this;clearTimeout(t.pingIntervalTimer),t.pingIntervalTimer=setTimeout(function(){i("writing ping packet - expecting pong within %sms",t.pingTimeout),t.ping(),t.onHeartbeat(t.pingTimeout)},t.pingInterval)},f.prototype.ping=function(){var t=this;this.sendPacket("ping",function(){t.emit("ping")})},f.prototype.onDrain=function(){this.writeBuffer.splice(0,this.prevBufferLen),this.prevBufferLen=0,0===this.writeBuffer.length?this.emit("drain"):this.flush()},f.prototype.flush=function(){"closed"!==this.readyState&&this.transport.writable&&!this.upgrading&&this.writeBuffer.length&&(i("flushing %d packets in socket",this.writeBuffer.length),this.transport.send(this.writeBuffer),this.prevBufferLen=this.writeBuffer.length,this.emit("flush"))},f.prototype.write=f.prototype.send=function(t,e,r){return this.sendPacket("message",t,e,r),this},f.prototype.sendPacket=function(t,e,r,n){if("function"==typeof e&&(n=e,e=void 0),"function"==typeof r&&(n=r,r=null),"closing"!==this.readyState&&"closed"!==this.readyState){(r=r||{}).compress=!1!==r.compress;var o={type:t,data:e,options:r};this.emit("packetCreate",o),this.writeBuffer.push(o),n&&this.once("flush",n),this.flush()}},f.prototype.close=function(){if("opening"===this.readyState||"open"===this.readyState){this.readyState="closing";var t=this;this.writeBuffer.length?this.once("drain",function(){this.upgrading?n():e()}):this.upgrading?n():e()}function e(){t.onClose("forced close"),i("socket closing - telling transport to close"),t.transport.close()}function r(){t.removeListener("upgrade",r),t.removeListener("upgradeError",r),e()}function n(){t.once("upgrade",r),t.once("upgradeError",r)}return this},f.prototype.onError=function(t){i("socket error %j",t),f.priorWebsocketSuccess=!1,this.emit("error",t),this.onClose("transport error",t)},f.prototype.onClose=function(t,e){"opening"!==this.readyState&&"open"!==this.readyState&&"closing"!==this.readyState||(i('socket close with reason: "%s"',t),clearTimeout(this.pingIntervalTimer),clearTimeout(this.pingTimeoutTimer),this.transport.removeAllListeners("close"),this.transport.close(),this.transport.removeAllListeners(),this.readyState="closed",this.id=null,this.emit("close",t,e),this.writeBuffer=[],this.prevBufferLen=0)},f.prototype.filterUpgrades=function(t){for(var e=[],r=0,n=t.length;r<n;r++)~s(this.transports,t[r])&&e.push(t[r]);return e}}).call(this,r(0))},function(t,e,r){t.exports=r(28),t.exports.parser=r(1)}])},function(t,e,r){(function(t){var n=r(2),o=r(9),i=Object.prototype.toString,s="function"==typeof t.Blob||"[object BlobConstructor]"===i.call(t.Blob),a="function"==typeof t.File||"[object FileConstructor]"===i.call(t.File);e.deconstructPacket=function(t){var e=[],r=t.data,i=t;return i.data=function t(e,r){if(!e)return e;if(o(e)){var i={_placeholder:!0,num:r.length};return r.push(e),i}if(n(e)){for(var s=new Array(e.length),a=0;a<e.length;a++)s[a]=t(e[a],r);return s}if("object"==typeof e&&!(e instanceof Date)){var s={};for(var u in e)s[u]=t(e[u],r);return s}return e}(r,e),i.attachments=e.length,{packet:i,buffers:e}},e.reconstructPacket=function(t,e){return t.data=function t(e,r){if(!e)return e;if(e&&e._placeholder)return r[e.num];if(n(e))for(var o=0;o<e.length;o++)e[o]=t(e[o],r);else if("object"==typeof e)for(var i in e)e[i]=t(e[i],r);return e}(t.data,e),t.attachments=void 0,t},e.removeBlobs=function(t,e){var r=0,i=t;!function t(u,c,f){if(!u)return u;if(s&&u instanceof Blob||a&&u instanceof File){r++;var h=new FileReader;h.onload=function(){f?f[c]=this.result:i=this.result,--r||e(i)},h.readAsArrayBuffer(u)}else if(n(u))for(var p=0;p<u.length;p++)t(u[p],p,u);else if("object"==typeof u&&!o(u))for(var l in u)t(u[l],l,u)}(i),r||e(i)}}).call(this,r(1))},function(t,e){var r=/^(?:(?![^:@]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/,n=["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"];t.exports=function(t){var e=t,o=t.indexOf("["),i=t.indexOf("]");-1!=o&&-1!=i&&(t=t.substring(0,o)+t.substring(o,i).replace(/:/g,";")+t.substring(i,t.length));for(var s=r.exec(t||""),a={},u=14;u--;)a[n[u]]=s[u]||"";return-1!=o&&-1!=i&&(a.source=e,a.host=a.host.substring(1,a.host.length-1).replace(/;/g,":"),a.authority=a.authority.replace("[","").replace("]","").replace(/;/g,":"),a.ipv6uri=!0),a}},function(t,e,r){(function(e){var n=r(21),o=r(0)("socket.io-client:url");t.exports=function(t,r){var i=t;r=r||e.location,null==t&&(t=r.protocol+"//"+r.host);"string"==typeof t&&("/"===t.charAt(0)&&(t="/"===t.charAt(1)?r.protocol+t:r.host+t),/^(https?|wss?):\/\//.test(t)||(o("protocol-less url %s",t),t=void 0!==r?r.protocol+"//"+t:"https://"+t),o("parse %s",t),i=n(t));i.port||(/^(http|ws)$/.test(i.protocol)?i.port="80":/^(http|ws)s$/.test(i.protocol)&&(i.port="443"));i.path=i.path||"/";var s=-1!==i.host.indexOf(":")?"["+i.host+"]":i.host;return i.id=i.protocol+"://"+s+":"+i.port,i.href=i.protocol+"://"+s+(r&&r.port===i.port?"":":"+i.port),i}}).call(this,r(1))},function(t,e,r){var n=r(22),o=r(4),i=r(8),s=r(0)("socket.io-client");t.exports=e=u;var a=e.managers={};function u(t,e){"object"==typeof t&&(e=t,t=void 0),e=e||{};var r,o=n(t),u=o.source,c=o.id,f=o.path,h=a[c]&&f in a[c].nsps;return e.forceNew||e["force new connection"]||!1===e.multiplex||h?(s("ignoring socket cache for %s",u),r=i(u,e)):(a[c]||(s("new io instance for %s",u),a[c]=i(u,e)),r=a[c]),o.query&&!e.query&&(e.query=o.query),r.socket(o.path,e)}e.protocol=o.protocol,e.connect=u,e.Manager=r(8),e.Socket=r(7)},function(t,e,r){t.exports=r(23)}])});

// window.TK.socketIO = window.TK.socketIO || window.io ;
// if(!window.TK.socketIO){
//     try{
//         window.TK.socketIO = io ;
//     }catch (err){
//         console.error('[tk-sdk]socket.io registration failed,please link socket.io,for example: window.tk.SocketIO = io (io is the socket.io that you want to associate with)!');
//     }
// }// getApp().window = getApp().window || {};
// window = getApp().window ;
// window.TK = window.TK || {};
// window.L = window.L || {};
// var TK = window.TK;
// var L = window.L ;
window = window || {};
window.TK = window.TK || {};
window.L = window.L || {};
var TK = window.TK;
var L = window.L;

TK.MSG_TO_ALLUSER = '__all';
TK.MSG_TO_ALLEXCEPTSENDER = '__allExceptSender';
TK.MSG_TO_ALLEXCEPTAUDITOR = '__allExceptAuditor';
TK.MSG_TO_NONEUSER = '__none';

TK.STREAM_VIDEO = 'video';
TK.STREAM_MEDIA = 'media';
TK.STREAM_SCREEN = 'screen';
TK.STREAM_FILE = 'file';

TK.LOG_DEBUG = 0;
TK.LOG_TRACE = 1;
TK.LOG_INFO = 2;
TK.LOG_WARNING = 3;
TK.LOG_ERROR = 4;
TK.LOG_NONE = 5;

TK.REC_TYPE_RECFILE = '0'; // 生成录制件
TK.REC_TYPE_VIDEOLIST = '1'; // 生成视频列表
TK.REC_TYPE_MP3 = '2'; // 只生成mp3
TK.REC_TYPE_MIXVIDEO = '3'; // 混屏录制，同时生成mp3和mp4

TK.nativeCallSeq = 0;
TK.waitNativeToCallbackList = {};
TK.SDKTYPE = 'pc';
TK.isInnerVersions = false ; //是否是内部版本，内部版本特权
TK.isHiFi = false ; //是否高保真音频
TK.isOnlyAudioRoom = false ; //是否是纯音频教室
TK.needOnlyAudioRoom = 0 ; //主动切换纯音频教室的状态，默认没有调用过 ， 0-没调用过 ， 1-切成纯音频 ， 2-切回音视频
TK.isRetainPublishstateOnOnlyAudioRoom = false ; //是否保持之前的发布状态
TK.APPVERSION = 'customer'; //应用版本
window.tknative = undefined; //客户端的通信对象

TK.SDKVERSIONS = '2.2.0.9';
TK.SDKVERSIONSTIME =  "2018082010";
TK.socketIO = require('./weapp.socket.io.js');

TK.getSdkVersion = function() {
    return TK.SDKVERSIONS;
};

/*房间类*/
TK.Room = function (roomOptios) {
    'use strict';
    roomOptios = roomOptios || {} ;
    if(typeof roomOptios !== 'object'){
        L.Logger.error('[tk-sdk]TK.Room roomOptios must is json!');
        roomOptios = {};
    }
    roomOptios.autoSubscribeAV = ( roomOptios.autoSubscribeAV !== undefined ? roomOptios.autoSubscribeAV : false ) ;
    L.Logger.info('[tk-sdk-version]sdk-version:'+ TK.SDKVERSIONS +' , sdk-time: '+ TK.SDKVERSIONSTIME) ;
    var spec={};
    var privateVariableJson = {};
    var that = TK.EventDispatcher(spec);
    var ERR_OK = 0;
    var ERR_INTERNAL_EXCEPTION = -1;
    var ERR_NOT_INITIALIZED = 1;
    var ERR_INVALID_STATUS = 2;
    var ERR_HTTP_REQUEST_FAILED = 3;
    var ERR_BAD_PARAMETERS = 4;
    var ERR_NO_THIS_USER = 5;
    var ERR_USER_NOT_PUBLISHING = 6;
    var ERR_USER_NOT_PLAYING = 7;
    
    var STATUS_IDLE = 0;
    var STATUS_CHECKING = 1;
    var STATUS_GETTINGCFG = 2;
    var STATUS_CONNECTING = 3;
    var STATUS_CONNECTED = 4;
    var STATUS_JOINING = 5;
    var STATUS_ALLREADY = 6;
    var STATUS_DISCONNECTING = 7;
    var STATUS_DISCONNECTED = 8;

    // var VIDEO_DEFINES = [[80,60] , [176, 144],[320, 240],[640, 480], [1280, 720], [1920, 1080] ];
    var VIDEO_DEFINES = [[80,60] , [200, 150],[320, 240],[640, 480], [1280, 720], [1920, 1080] ];

    var WEBFUNC_CHECKroom = "/ClientAPI/checkroom";
    var WEBFUNC_GETCONFIG = "/ClientAPI/getconfig";
    var WEBFUNC_GETFILELIST = "/ClientAPI/getroomfile";
    var WEBFUNC_UPLOADDOCUMENT = "/ClientAPI/uploaddocument";
    var WEBFUNC_DELROOMFILE = "/ClientAPI/delroomfile";
    var WEBFUNC_GETSERVERAREA = "/ClientAPI/getserverarea";
    var WEBFUNC_EQUIPMENT = "/ClientAPI/equipment";  //保存设备信息
    var WEBFUNC_NETWORKEQUIPMENT = "/ClientAPI/networkequipment";  //保存网络状态
    var WEBFUNC_GETROOMUSERS = "/ClientAPI/getroomusers";  //获取教室用户
    var WEBFUNC_GETROOMUSERNUM = "/ClientAPI/getroomusernum";  //获取教室用户数
    
    var DISCONNECTED = 0,
        CONNECTING = 1,
        CONNECTED = 2 ,
        JOINROOMVERSION = 3 ; //join room 版本

    
    var  _whiteboardManagerInstance = undefined ,
        _isFinshInit = false , //是否完成初始化
        _status = STATUS_IDLE,
        _handlerCallbackJson = {} ;

    /*初始化私有变量*/
    var _initPrivateVariable = function () {
        privateVariableJson._web_protocol = 'https' ; //协议默认https  TODO 目前http有问题，需要优化
        privateVariableJson._doc_protocol = 'https' ; //协议默认https TODO 目前http有问题，需要优化
        privateVariableJson._socket_protocol = 'https' ; //协议默认https TODO 目前http有问题，需要优化
        privateVariableJson._backup_doc_protocol = 'https' ; //协议默认https TODO 目前http有问题，需要优化
        privateVariableJson._web_host  = undefined ;
        privateVariableJson._temp_web_host = undefined ;
        privateVariableJson._old_web_host = undefined ;
        privateVariableJson._temp_web_port  = undefined ;
        privateVariableJson._web_port  = undefined ;
        privateVariableJson._doc_host = undefined ;
        privateVariableJson._doc_port = undefined ;
        privateVariableJson._socket_host = undefined ;
        privateVariableJson._socket_port = undefined ;
        privateVariableJson._backup_doc_host = undefined ;
        privateVariableJson._backup_doc_host_list = [] ;
        privateVariableJson._backup_doc_port = undefined ;
        privateVariableJson._room_uri  = undefined ;
        privateVariableJson._room_id  = undefined ;
        privateVariableJson._room_type=0;
        privateVariableJson._room_name  = undefined;
        privateVariableJson._room_properties = undefined;
        privateVariableJson._room_video_width = 320;
        privateVariableJson._room_video_height = 240;
        privateVariableJson._room_video_fps = 15;
        privateVariableJson._room_max_video_width = 320;
        privateVariableJson._room_max_video_height = 240;
        privateVariableJson._room_max_video_fps = 15;
        privateVariableJson._room_video_maxbps = 256;
        privateVariableJson._room_max_videocount = 6;
        privateVariableJson._configuration  = undefined;
        privateVariableJson._testIP  = undefined;
        privateVariableJson._testPort  = undefined;
        privateVariableJson._myself = {} ;
        privateVariableJson._serverList = {} ;
        privateVariableJson._ipFalsificationName = undefined;
        privateVariableJson._serverName = undefined ;
        privateVariableJson._isIpFalsification = false ;
        privateVariableJson._ipFalsification = undefined ;
        privateVariableJson._isPlayback = false ;
        privateVariableJson._isGetFileList = false ; //是否获取文件列表
        privateVariableJson._recordfilepath = undefined ;
        privateVariableJson._webInterfaceHtmlPort = 8080 ;
        privateVariableJson._connectedNumber = 0 ;
        privateVariableJson._isConnected = false  ;
        privateVariableJson._requestServerListPermission = true ;//是否请求服务器列表数据
        privateVariableJson._handlerCallbackJson = false  ;
        privateVariableJson._docServerAddr = undefined  ;
        privateVariableJson._hasDocServerAddrBackup = false  ;
        privateVariableJson._roomCheckRoomInfoString = "" ;
        privateVariableJson._roomJsonOptions = {};
        privateVariableJson._userJsonOptions = {};
        privateVariableJson._autoProcessDevChangeEvent = false;
        privateVariableJson._durationTime = {} ;//回放时间保存
        privateVariableJson._myIp = '0.0.0.0' ;//我的ip
        privateVariableJson._video_codec = 0 ; //视频编码，0：VP8 ，1：VP9 ， 2：H264
        privateVariableJson._roomMode = window.TK.ROOM_MODE.NORMAL_ROOM ; //房间模式，默认window.TK.ROOM_MODE.NORMAL_ROOM
        privateVariableJson._isSendAllPublishUserNetworkequipment = true; //是否发送所有上台人的网络状态，默认只发自己
        privateVariableJson._room_filelist = [] ;
        privateVariableJson._users={};
        privateVariableJson._userId_to_elementId_map = {};
        privateVariableJson._wait_to_publish = false;
        privateVariableJson._wait_to_play = false;
        privateVariableJson._wait_to_play_param = {};
        privateVariableJson._local_def_ext_id = '_local_default_extension_id_';
        privateVariableJson._sentAloneNetQualityBadList = {}; //在往php发送网络状态间隔期间发送过网络不好的消息的列表
        // privateVariableJson._isSwitchOnlyAudioRoom = false ; //是否正在处理纯音频和音视频教室切换
        // privateVariableJson._awitSwitchOnlyAudioRoomAction = undefined ; //等待执行的纯音频和音视频教室切换的动作
        privateVariableJson._mediaFileScale = true ; //是否降低共享的画质，Boolean类型，默认为true
        privateVariableJson._nativeStatsDelivered = {}; //客户端网络状态存储
        privateVariableJson._isLocalVideoMirror = false ; //本地视频是否启用镜像模式
        privateVariableJson._backupCourseAddrList = [] ;  //备用线路的服务器地址集合
        privateVariableJson._isLeaveRoom = true ; //是否是离开房间
        privateVariableJson._webReconnectNumList = {}; //web请求重新连接的列表
    };
    _initPrivateVariable();

    that.roomID = '';
    that.socket = {};
    that.p2p = false;
    that.state = DISCONNECTED;

    TK.isPlayback = privateVariableJson._isPlayback;

    /*初始化*/
    that.init = function(appKey, onSuccess, onFailure, options) {
        //TODO 这里需要验证appKey(需要协商加密算法)，成功，失败的相关处理
        L.Logger.debug('[tk-sdk] room-sdk initializing.');
        options = options || {};
        if ( L.Utils.isNull(appKey) ) {
            L.Logger.error('[tk-sdk] the appKey can not be empty when initializing room-sdk');
            if (L.Utils.isFunction(onFailure)) {
                onFailure('TK_ERR_INVALID_ARG');
            }
            return;
        }
        if(options.useHttpProtocol){
            privateVariableJson._web_protocol = 'http' ; //协议默认https
            privateVariableJson._doc_protocol = 'http' ; //协议默认https
            privateVariableJson._socket_protocol = 'http' ; //协议默认https
            privateVariableJson._backup_doc_protocol = 'http' ; //协议默认https
            privateVariableJson._webInterfaceHtmlPort = 81 ;
        }
        roomOptios.autoSubscribeAV = ( options.autoSubscribeAV !== undefined ? options.autoSubscribeAV : roomOptios.autoSubscribeAV ) ; //是否自动订阅音视频数据 , 如果为true则订阅过程中会接收服务器的音视频数据,否则不接收服务器音视频数据,只有调用playAudio/playVideo才会取服务器的相关音视频数据 , 默认为false
        privateVariableJson._isGetFileList = L.Utils.isBoolean(options.isGetFileList)?options.isGetFileList:false ; //是否获取文件列表，缺省为false
        TK.isInnerVersions = L.Utils.isBoolean(options.isInnerVersions)?options.isInnerVersions:false ; //是否为内部版本，缺省为false
        _isFinshInit = true ;
        if (L.Utils.isFunction(onSuccess)) {
            onSuccess();
        }
    };

    /*取消初始化*/
    that.uninit = function (onSuccess,onFailure) {
        //TODO 这里需要处理取消初始化的一些列操作，且需要处理好失败和成功的回调
        if(_status !== STATUS_DISCONNECTED){
            that.leaveroom();
        }
        _isFinshInit = false ;
        _initPrivateVariable();
        if (L.Utils.isFunction(onSuccess)) {
            onSuccess();
        }
    };

    /*检测是否初始化*/
    that.checkInit = function(onFailure){
        if(!_isFinshInit){
            if(L.Utils.isFunction(onFailure)){
                onFailure('TK_ERR_ROOM_NOT_INIT');
            }
            return false;
        }else{
            return true ;
        }
    };

    /*设置日志是否是debug级别
    * @params isDebug:是否是debug日志 ， 默认false , Boolean
    * @params logLevel:指定日志级别【
         0, //debug 级别日志
         1, //trace 级别日志
         2, //info 级别日志
         3, //warning 级别日志
         4, //error 级别日志
         5 //不打印日志
    】， logLevel的值如果不传，那么isDebug为true则logLevel=0 , 否则logLevel=2 , Number*/
    that.setLogIsDebug = function (isDebug , logLevel) {
        isDebug = isDebug || false ;
        if(logLevel !== undefined ){
            if(logLevel === 0){
                isDebug = true ;
            }else{
                isDebug = false ;
            }
        }
        var socketLogConfig = {
            debug:isDebug ,
        } , loggerConfig = {
            development:isDebug ,
            logLevel:logLevel !== undefined && typeof logLevel === 'number' ? logLevel :( isDebug ? L.Constant.LOGLEVEL.DEBUG :  L.Constant.LOGLEVEL.INFO ) ,
        }, adpConfig = {
            webrtcLogDebug:isDebug
        };
        TK.tkLogPrintConfig( socketLogConfig , loggerConfig , adpConfig );
    };

    /*获取房间文件列表
    * @return <Array>返回文件列表数组*/
    that.getFileList = function () {
        return privateVariableJson._room_filelist ;
    };

    /*获取指定文件信息*/
    that.getFileinfo = function ( fileid ) {
        var fileinfo = undefined ;
        for(var i=0 , length = privateVariableJson._room_filelist.length ; i < length ; i++ ){
            if( privateVariableJson._room_filelist[i] && privateVariableJson._room_filelist[i].fileid == fileid ){
                fileinfo = privateVariableJson._room_filelist[i];
                break;
            }
        }
        return fileinfo ;
    };

    /*获取房间属性信息*/
    that.getRoomProperties=function() {
        return privateVariableJson._room_properties;
    };

    /*获取我自己的用户信息
    * @return 返回自己的用户对象 ， Json */
    that.getMySelf=function() {
        return privateVariableJson._myself;
    };

    /*获取用户
    * @params id:用户id , String
    * @return 返回用户对象  ， Json */
    that.getUser=function(id) {
        if(id === undefined){
            return undefined;
        }else{
            return privateVariableJson._users[id];
        }
    };

    /*获取所有的用户信息
     * @return 返回所有的用户集合  ， Json */
    that.getUsers=function() {
        return privateVariableJson._users;
    };

    /*改变指定角色的用户属性
     * @params roles:roles ,Array 角色列表
     * @params toID:发送给谁( __all , __allExceptSender , userid , __none ,__allSuperUsers) , String
     * @params properties:需要改变的用户属性 , Json
     * 备注：指定角色的用户会收到事件room-userproperty-changed*/
    that.changeUserPropertyByRole = function (roles , toID , properties) {
        if(!that.checkInit()){
            L.Logger.error('[tk-sdk]The room is not initialized and cannot execute methods on the room class. Please call the init method for initialization!');
            return ;
        }
        if( !Array.isArray(roles) ){
            L.Logger.error('[tk-sdk]changeUserPropertyByRole roles params must is array!');
            return ERR_BAD_PARAMETERS;
        }
        if(typeof properties !== 'object' ){
            L.Logger.error('[tk-sdk]changeUserPropertyByRole properties params must is json !');
            return ;
        }
        var rolesJson = {
            roles:roles
        };
        that.changeUserProperty(rolesJson , toID , properties);
    };

    /*批量改变用户属性
     * @params ids:ids ,Array 用户id列表
     * @params toID:发送给谁( __all , __allExceptSender , userid , __none ,__allSuperUsers) , String
     * @params properties:需要改变的用户属性 , Json
     * 备注：指定角色的用户会收到事件room-userproperty-changed*/
    that.batchChangeUserProperty = function (ids ,  toID , properties) {
        if(!that.checkInit()){
            L.Logger.error('[tk-sdk]The room is not initialized and cannot execute methods on the room class. Please call the init method for initialization!');
            return ;
        }
        if( !Array.isArray(ids) ){
            L.Logger.error('[tk-sdk]batchChangeUserProperty ids params must is array!');
            return ERR_BAD_PARAMETERS;
        }
        if(typeof properties !== 'object' ){
            L.Logger.error('[tk-sdk]batchChangeUserProperty properties params must is json !');
            return ;
        }
        if( privateVariableJson._roomMode !== window.TK.ROOM_MODE.BIG_ROOM ){
            for(var index = ids.length-1 ; index >= 0 ; index-- ){
                if( ids[index] && !privateVariableJson._users[ids[index]] ){
                    L.Logger.warning('[tk-sdk]batchChangeUserProperty:user is not exist, user id: '+ids[index]+' !');
                    ids.splice(index,1);
                }
            }
        }
        var idsJson = {
            ids:ids
        };
        that.changeUserProperty(idsJson , toID , properties);
    };

    /*改变用户属性
    * @params id:用户id , String/Json 【注：如果id是String类型则表述某个人的id,如果id是Json类型，则{ids:[user1Id,user2Id]}表示批量改变某批人的用户属性，ids的value为数组（放要改变者的userid）,若{roles:[role1,role2]}表示改变某些角色的用户属性，roles的value为数组（放要改变用户属性的角色）】
    * @params toID:发送给谁( __all , __allExceptSender , userid , __none ,__allSuperUsers) , String
    * @params properties:需要改变的用户属性 , Json
    * 备注：指定用户会收到事件room-userproperty-changed*/
    that.changeUserProperty=function(id, toID, properties) {
        if(!that.checkInit()){
            L.Logger.error('[tk-sdk]The room is not initialized and cannot execute methods on the room class. Please call the init method for initialization!');
            return ;
        }
        if (_status != STATUS_ALLREADY){
            return ERR_INVALID_STATUS;
        }
        if ( TK.isOnlyAudioRoom && properties.publishstate !== undefined && (properties.publishstate === TK.PUBLISH_STATE_VIDEOONLY || properties.publishstate === TK.PUBLISH_STATE_BOTH) ) {
            L.Logger.warning('[tk-sdk]The publishstate of a pure audio room cannot be ' + properties.publishstate + '!');
            return;
        }

        if (properties === undefined || id === undefined){
            L.Logger.error('[tk-sdk]changeUserProperty properties or id is not exist!');
            return ERR_BAD_PARAMETERS ;
        }
        if(typeof properties !== 'object' ){
            L.Logger.error('[tk-sdk]changeUserProperty properties must is json !');
            return ;
        }
        var params = {};
        params.id = id;
        params.toID = toID || '__all';
        if(properties.hasOwnProperty('id')){
            L.Logger.warning('[tk-sdk]Method changeUserProperty cannot modify the id properties')
            delete properties['id'];
        }
        params.properties = properties;
        if(typeof id === 'object'){
            if( id.hasOwnProperty('ids') && Array.isArray(id.ids) ){
                for( var index in id.ids ){
                    if (id.ids[index] === privateVariableJson._myself.id && properties.publishstate !== undefined) {
                        privateVariableJson._myself.publishstate = properties.publishstate ;
                        // _onChangeMyPublishState(publishstate);
                    }
                }
            }
        }else{
            if( privateVariableJson._roomMode !== window.TK.ROOM_MODE.BIG_ROOM ){
                if( !privateVariableJson._users[id] ){
                    L.Logger.error('[tk-sdk]changeUserProperty:user is not exist , user id: '+id+'!');
                    return ;
                }
            }
            if (id === privateVariableJson._myself.id && properties.publishstate !== undefined) {
                privateVariableJson._myself.publishstate = properties.publishstate ;
                // _onChangeMyPublishState(publishstate);
            }
        }
        _sendMessageSocket('setProperty',params);
        return ERR_OK;
    };

    /*发送聊天信息功能函数
    * @params textMessage:发送的聊天消息文本 ,String
    * @params toID:发送给谁 , String
    * @params extendJson:扩展的发送的聊天消息数据 , Json
    * 备注：指定用户会收到事件room-text-message
    * */
    that.sendMessage=function(textMessage, toID , extendJson) {
        if(!that.checkInit()){
            L.Logger.error('[tk-sdk]The room is not initialized and cannot execute methods on the room class. Please call the init method for initialization!');
            return ;
        }
        if (_status != STATUS_ALLREADY)
            return ERR_INVALID_STATUS;

        var params={};
        toID =  toID || "__all" ;
        params.toID = toID;
        var message = {};
        if(typeof textMessage === 'string'){
            textMessage = L.Utils.toJsonParse(textMessage);
        }
        if(typeof textMessage === 'object'){ //这里兼容以前的处理，如果textMessage是json则拷贝到message里面
            for(var key in textMessage){
                message[key] = textMessage[key] ;
            }
        }else{
            message.msg = textMessage ;
        }
        if(typeof extendJson === 'string'){
            extendJson = L.Utils.toJsonParse(extendJson);
        }
        if( extendJson && typeof extendJson === 'object'){
            for(var key in extendJson){
                message[key] = extendJson[key] ;
            }
        }
        params.message =  L.Utils.toJsonStringify(message); //这里必须转为json字符串
        _sendMessageSocket('sendMessage',params);
        return  ERR_OK;
    };

    /*发送PubMsg信令
    * @allParams params:pubMsg需要的所有参数承接对象
        * @params params.name:信令名字 , String
        * @params params.id:信令ID , String
        * @params params.toID:发送给谁(默认发给所有人) , String
                         __all（所有人，包括自己） ,
                         __allExceptSender （除了自己以外的所有人）,
                         userid（指定id发给某人） ,
                         __none （谁也不发，只有服务器会收到）,
                         __allSuperUsers（只发给助教和老师）,
                         __group:groupA:groupB(发送给指定组，组id不能包含冒号),
                        __groupExceptSender:groupA（发给指定组，不包括自己）
        * @params params.data:信令携带的数据 , Json/JsonString
        * @params params.save:信令是否保存 , Boolean
        * @params params.expiresabs:暂时不用
        * @params params.associatedMsgID:绑定的父级信令id , String
        * @params params.associatedUserID:绑定的用户id , String
        * @params params.expires:暂时无效
        * @params params.type:扩展类型，目前只有count一种扩展类型，之后如需扩展可在此处进行相应变动 , String 【目前有：'count'代表累加器，'getCount'代表取累加器的数据】
        * @params params.write2DB:是否存库, Boolean
        * @params params.actions:执行的动作操作列表，用于累加器，如{A:1,B:1}，Json (直播是Array)
        * @params params.do_not_replace:老师和助教不能同时操作，后操作的服务器直接丢弃, Boolean (目前直播才有用)
        * @params params.modify:表示这个操作是否是修改操作，用于累加器上, Number
     * 备注：指定用户会收到事件room-pubmsg
    * */
    that.pubMsg=function(params) {
        if(!that.checkInit()){
            L.Logger.error('[tk-sdk]The room is not initialized and cannot execute methods on the room class. Please call the init method for initialization!');
            return ;
        }
        if(_status !== STATUS_ALLREADY){
            return ERR_INVALID_STATUS;
         }
         if(typeof params !== 'object'){
            L.Logger.error('[tk-sdk]pubMsg params must is json!');
             return ;
         }
        var _params = {};
        _params.name =  params['name'] ||  params['msgName'] ;
        _params.id = params['id'] || params['msgId'] || _params.name;
        _params.toID = params['toID'] || params['toId'] || '__all'; //  toID=> __all , __allExceptSender , userid , __none ,__allSuperUsers
        _params.data= params['data'] ;
        if(!params['save']){
            _params.do_not_save="";
        }
        if(params['associatedMsgID'] !== undefined){
            _params.associatedMsgID = params['associatedMsgID'] ;
        }
        if(params['associatedUserID'] !== undefined){
            _params.associatedUserID = params['associatedUserID'] ;
        }
        var expandParams = {};
        /*
         * @params expiresabs:暂时不用
         * @params expires:暂时无效
         * @params type:扩展类型，目前只有count一种扩展类型，之后如需扩展可在此处进行相应变动 , String (目前直播才有用)
         * @params write2DB:暂时无效, Boolean (目前直播才有用)
         * @params actions:执行的动作操作列表，目前只有0，1 (0-不操作，1-代表增加操作), Array (目前直播才有用)
         * @params do_not_replace:老师和助教不能同时操作，后操作的服务器直接丢弃, Boolean (目前直播才有用)
         * */
        for(var key in params){
            if(_params[key] === undefined && params[key] !== undefined && key !== 'save' && key !== 'name'  && key !== 'msgName' && key !== 'id' && key !== 'msgId'
                && key !== 'toID' && key !== 'toId' && key !== 'data' && key !== 'associatedMsgID' && key !== 'associatedUserID' ){
                expandParams[key] = params[key];
                // _params[key] = params[key];
            }
        }

        // _params.expandParams = expandParams;
        for(var key in expandParams){
            if(_params[key] === undefined && key !== 'save'){
                _params[key] = expandParams[key];
            }
        }
        if(_params.name === undefined || _params.name  === null){
            L.Logger.error('[tk-sdk]pubMsg name is must exist!');
            return ;
        }
        if( _params.name === 'DocumentChange' && _params.toID === '__allExceptSender' ){
            var _paramsCopy = L.Utils.toJsonParse( L.Utils.toJsonStringify(_params) ) ;
            _paramsCopy.fromID = privateVariableJson._myself.id ;
            if( _paramsCopy && _paramsCopy.data && typeof _paramsCopy.data === 'string' ){
                _paramsCopy.data =  L.Utils.toJsonParse( _paramsCopy.data );
            }
            _handleSignalling_DocumentChange( _paramsCopy );
        }
        // _params.version = 1 ;
        _sendMessageSocket('pubMsg',_params);
        return  ERR_OK;
    };

    /*发送DelMsg信令功能函数,删除之前发送的信令
     * @allParams params:delMsg需要的所有参数承接对象
         * @params name:信令名字 , String
         * @params id:信令ID , String
         * @params toID:发送给谁(默认发给所有人) , String
                         __all（所有人，包括自己） ,
                         __allExceptSender （除了自己以外的所有人）,
                         userid（指定id发给某人） ,
                         __none （谁也不发，只有服务器会收到）,
                         __allSuperUsers（只发给助教和老师）,
                         __group:groupA:groupB(发送给指定组，组id不能包含冒号),
                         __groupExceptSender:groupA（发给指定组，不包括自己）
         * @params data:信令携带的数据 , Json/JsonString
       *备注：指定用户会收到事件room-delmsg
     * */
    that.delMsg=function(params) {
        if(!that.checkInit()){
            L.Logger.error('[tk-sdk]The room is not initialized and cannot execute methods on the room class. Please call the init method for initialization!');
            return ;
        }
        if (_status !== STATUS_ALLREADY){
            return ERR_INVALID_STATUS;
        }
        if(typeof params !== 'object'){
            L.Logger.error('[tk-sdk]delMsg params must is json!');
            return ;
        }
        var name, id, toID, data ;
        if(arguments.length === 1 && params && typeof params === 'object'){
            name =  params['name'] || params['msgName'];
            id = params['id'] || params['msgId'];
            toID =   params['toID'] || params['toId'];
            data =  params['data'];
        }else{
            name =  arguments[0];
            id = arguments[1];
            toID =  arguments[2];
            data =  arguments[3];
        }
        var _params = {};
        _params.name=name;
        _params.id=id || _params.name;
        _params.toID=toID || '__all';
        _params.data=data;
        if(_params.name === undefined || _params.name  === null){
            L.Logger.error('[tk-sdk]delMsg name is must exist!');
            return ;
        }
        if(_params.id === undefined || _params.id  === null){
            L.Logger.error('[tk-sdk]delMsg id is must exist!');
            return ;
        }
        // _params.version = 1 ;
        _sendMessageSocket('delMsg',_params);
        return  ERR_OK;
    };

    /*强制踢掉用户
    * @params id:用户id , String
    * @params causeJson:踢掉的原因携带的json数据 , Json
    * 备注：被踢用户会收到事件room-participant_evicted
    * */
    that.evictUser=function(id , causeJson) {
        if(!that.checkInit()){
            L.Logger.error('[tk-sdk]The room is not initialized and cannot execute methods on the room class. Please call the init method for initialization!');
            return ;
        }
        L.Logger.debug('[tk-sdk]evictUser', id);
        if (_status != STATUS_ALLREADY)
            return ERR_INVALID_STATUS;

        var params = {};
        params.id = id;
        if(causeJson && typeof causeJson === 'object'){
            for(var key in causeJson){
                params[key] = causeJson[key];
            }
        }
        _sendMessageSocket('evictParticipant',params);
        return ERR_OK;
    };

    /*加入回放房间
     * @params host:域名或者ip , String
     * @params port:端口 , Int
     * @params params:携带的参数json , Json
     params = {
         recordfilepath: 回放录制件地址 , 必须的
         roomtype:房间类型 ,
         serial:房间号 ,
         domain:公司的企业域名标识 ,
         host:php请求域名
     }
     * */
    that.joinPlaybackRoom = function (host, port, params, onFailure, testip, testport, oldInitPlaybackInterface) {
        if(!that.checkInit(onFailure)){
            L.Logger.error('[tk-sdk]The room is not initialized and cannot execute methods on the room class. Please call the init method for initialization!');
            return ;
        }
        privateVariableJson._isLeaveRoom = false ;
        if( L.Utils.isNull(host) || L.Utils.isNull(port) || L.Utils.isNull(params) || typeof params !== 'object' ){
            L.Logger.error('[tk-sdk] startPlayback function got wrong arguments');
            if(L.Utils.isFunction(onFailure)) {
                onFailure('TK_ERR_INVALID_ARG');
            }
            return ;
        }
        privateVariableJson._roomJsonOptions = {};
        privateVariableJson._userJsonOptions = privateVariableJson._userJsonOptions || {};
        privateVariableJson._userJsonOptions.userProperties = {};
        privateVariableJson._roomJsonOptions.video = true;
        privateVariableJson._roomJsonOptions.audio = true;
        privateVariableJson._roomJsonOptions.autoServer = L.Utils.isBoolean(params.autoServer) ? params.autoServer : true;
        privateVariableJson._testIP = testip;
        privateVariableJson._testPort = testport;
        L.Logger.info('[tk-sdk]call startPlayback start!');
        var isGetFalsificationIpFinshed = false ;
        var isInitPlaybackInfoFinshed = false ;
        var isJoinroominner = false ;
        var getConfigWebHostname = privateVariableJson._web_host;
        _step2GetFalsificationIp(host, privateVariableJson._webInterfaceHtmlPort,function (ipRet) {
            isGetFalsificationIpFinshed = true ;
            if(ipRet === 0){
                getConfigWebHostname = _replaceHostname(privateVariableJson._web_host,privateVariableJson._serverName)
            }
            if(isGetFalsificationIpFinshed && isInitPlaybackInfoFinshed && !isJoinroominner){
                isJoinroominner = true;
                joinroominner(getConfigWebHostname);
            }
        });
        _initPlaybackInfo(host, port, params,function (ret, userinfo, roominfo) {
            isInitPlaybackInfoFinshed = true ;
            var checkroomEvt = TK.RoomEvent({type:'room-checkroom-playback',message:{ ret:ret, userinfo:userinfo, roominfo:roominfo }});
            that.dispatchEvent(checkroomEvt);
            if (ret === 0) {
                if(isGetFalsificationIpFinshed && isInitPlaybackInfoFinshed && !isJoinroominner){
                    isJoinroominner = true;
                    joinroominner(getConfigWebHostname);
                }
            }else {
                var Evt = TK.RoomEvent({type:'room-error',message:{source:L.Constant.roomError.CHECKROOMERROR , error:ret }});
                that.dispatchEvent(Evt);
                //TODO room-connect-fail的source和error需要完善
                var Evt = TK.RoomEvent({type:'room-connect-fail',message:{source:L.Constant.roomError.CHECKROOMERROR , error:ret }});
                that.dispatchEvent(Evt);
            }
        },oldInitPlaybackInterface, onFailure);
    };

    /*加入房间的方法
    * @params host:web服务器域名（或ip） , String
    * @params port:web服务器端口号 , String
    * @params nickName:用户在房间中的昵称 , String
    * @params userId:用户在房间中的ID，必须唯一。若为空，SDK将自动生成 , String
    * @params roomJsonOptions:加入房间所需的基本参数 , Json
        roomJsonOptions = {
            serial：房间ID，String类型；
            password：房间密码，String类型，不同用户角色对应不同密码 ,
            checkroomParamsUrl:加入房间的地址串（内部使用）
            group:所属的组 , Array
        }
    * @params userJsonOptions:自定义用户属性, Json
    * @params testip:测试的ip , String
    * @params testport:测试的ip端口号 , String
    * 备注：加入房间成功会收到事件room-connected
    * */
    that.joinroom = function (host, port, nickName, userId, roomJsonOptions, userJsonOptions, testip, testport) {
        if(!that.checkInit()){
            L.Logger.error('[tk-sdk]The room is not initialized and cannot execute methods on the room class. Please call the init method for initialization!');
            return ;
        }
        privateVariableJson._isLeaveRoom = false ;
        privateVariableJson._webReconnectNumList = {};
        _updateWebAddressInfo({
            web_host:host ,
            web_port:port ,
        } );
        privateVariableJson._roomJsonOptions = typeof roomJsonOptions === 'object' ? roomJsonOptions : {};
        privateVariableJson._userJsonOptions = privateVariableJson._userJsonOptions || {};
        privateVariableJson._userJsonOptions.userProperties = userJsonOptions || {};
        privateVariableJson._roomJsonOptions.video = true;
        privateVariableJson._roomJsonOptions.audio = true;
        privateVariableJson._roomJsonOptions.autoServer = L.Utils.isBoolean(privateVariableJson._roomJsonOptions.autoServer) ? privateVariableJson._roomJsonOptions.autoServer : true;
        privateVariableJson._testIP = testip;
        privateVariableJson._testPort = testport;
        var checkroomParams = {
            serial:privateVariableJson._roomJsonOptions.serial ,
            password:privateVariableJson._roomJsonOptions.password || '' ,
        };
        if(nickName){
            checkroomParams.nickname = nickName ;
        }
        L.Logger.info('[tk-sdk]call joinroom start!');
        var isGetFalsificationIpFinshed = false ;
        var isCheckroomFinshed = false ;
        var isJoinroominner = false ;
        var getConfigWebHostname = privateVariableJson._web_host;
        _step2GetFalsificationIp(host, privateVariableJson._webInterfaceHtmlPort,function (ipRet) {
            isGetFalsificationIpFinshed = true ;
            if(ipRet === 0){
                getConfigWebHostname = _replaceHostname(privateVariableJson._web_host,privateVariableJson._serverName)
            }
            if(isGetFalsificationIpFinshed && isCheckroomFinshed && !isJoinroominner){
                isJoinroominner = true;
                joinroominner(getConfigWebHostname);
            }
        });
        _checkroom(host, port, (privateVariableJson._roomJsonOptions.checkroomParamsUrl || checkroomParams) , function(ret, userinfo, roominfo) {
            isCheckroomFinshed = true ;
            var checkroomEvt = TK.RoomEvent({type:'room-checkroom',message:{ ret:ret, userinfo:userinfo, roominfo:roominfo }});
            that.dispatchEvent(checkroomEvt);
            if (ret === 0) {
                if(isGetFalsificationIpFinshed && isCheckroomFinshed && !isJoinroominner){
                    isJoinroominner = true;
                    joinroominner(getConfigWebHostname);
                }
            }else {
                var Evt = TK.RoomEvent({type:'room-error',message:{source:L.Constant.roomError.CHECKROOMERROR , error:ret }});
                that.dispatchEvent(Evt);
                //TODO room-connect-fail的source和error需要完善
                var Evt = TK.RoomEvent({type:'room-connect-fail',message:{source:L.Constant.roomError.CHECKROOMERROR , error:ret }});
                that.dispatchEvent(Evt);
            }
        }, userId);
    };

    /*离开房间的方法
     * @params force:是否强制离开房间 , Boolean
     * 备注：自己会收到事件room-leaveroom*/
    that.leaveroom = function (force) {
        if(!that.checkInit()){
            L.Logger.error('[tk-sdk]The room is not initialized and cannot execute methods on the room class. Please call the init method for initialization!');
            return ;
        }
        clearTimeout(privateVariableJson._webReconnectNumList.checkroomReconnectTimer);
        clearTimeout(privateVariableJson._webReconnectNumList.getFalsificationIpReconnectTimer);
        clearTimeout(privateVariableJson._webReconnectNumList.getConfigReconnectTimer);
        privateVariableJson._isLeaveRoom = true;
        // It disconnects from the room, dispatching a new RoomEvent("room-disconnected")
        force = force || false ;
        L.Logger.debug('[tk-sdk]leaveroom:Disconnection requested');
        _setStatus(STATUS_DISCONNECTED);
        // Close socket
        try {
            if(that.socket && that.socket.disconnect){
                that.socket.disconnect();
            }
        } catch (error) {
            L.Logger.warning('[tk-sdk]Socket already disconnected , disconnect errorInfo:' , error);
        }
        that.socket = undefined;
        privateVariableJson._isConnected = false ;
        if( _whiteboardManagerInstance ){
            if( _whiteboardManagerInstance.changeCommonWhiteBoardConfigration ){
                _whiteboardManagerInstance.changeCommonWhiteBoardConfigration({
                    isConnectedRoom:privateVariableJson._isConnected , //是否已经连接房间
                });
            }
        }
        var roomEvt = TK.RoomEvent({type: 'room-leaveroom' , message:force});
        that.dispatchEvent(roomEvt);
    };

    /*开始录制功能* */
    that.startServerRecord = function (spec) {
        if(!that.checkInit()){
            L.Logger.error('[tk-sdk]The room is not initialized and cannot execute methods on the room class. Please call the init method for initialization!');
            return ;
        }
        spec = spec || {};
        var recordType = L.Utils.isNull(spec.recordType) ? TK.REC_TYPE_VIDEOLIST : spec.recordType;
        if (recordType !== TK.REC_TYPE_RECFILE && recordType !== TK.REC_TYPE_VIDEOLIST && recordType !== TK.REC_TYPE_MP3 && recordType !== TK.REC_TYPE_MIXVIDEO) {
            recordType = TK.REC_TYPE_VIDEOLIST;
        }
        var isRecordchat = spec.recordChat !== undefined && typeof spec.recordChat === 'boolean' ? spec.recordChat : true;
        var convert = L.Utils.isNull(spec.convert) ? 0 : spec.convert;
        var layout = L.Utils.isNull(spec.layout) ? 0 : spec.layout;
        var pubmsgParams = {
            name: 'ClassBegin' ,
            id: 'ClassBegin' ,
            toID: '__all' ,
            data: {
                recordtype: recordType,
                convert: convert,
                layout: layout,
            } ,
            save:true ,
        };
        if( isRecordchat ){
            pubmsgParams.data.recordchat = true ;
        }
        pubmsgParams.data = L.Utils.toJsonStringify( pubmsgParams.data );
        that.pubMsg( pubmsgParams ) ;
    };

    /*停止录制功能 */
    that.stopServerRecord = function () {
        if(!that.checkInit()){
            L.Logger.error('[tk-sdk]The room is not initialized and cannot execute methods on the room class. Please call the init method for initialization!');
            return ;
        }
        var delmsgParams = {
            name: 'ClassBegin' ,
            id: 'ClassBegin' ,
            toID: '__all' ,
            data: {},
        };
        delmsgParams.data = L.Utils.toJsonStringify( delmsgParams.data );
        that.delMsg( delmsgParams ) ;
    };

    /*发送回放的seek消息给服务器
        @params positionTime：seek的位置，毫秒级
    */
    that.seekPlayback = function (positionTime,onFailure) {
        //TODO 这里需要处理positionTime为百分比以及处理失败函数
        if(!that.checkInit(onFailure)){
            L.Logger.error('[tk-sdk]The room is not initialized and cannot execute methods on the room class. Please call the init method for initialization!');
            return ;
        }
        if(!privateVariableJson._isPlayback){
            L.Logger.warning('[tk-sdk]No playback environment!');
            if(L.Utils.isFunction(onFailure)){
                onFailure('TK_ERR_NOT_PLAYBACK_ENVIRONMENT');
            }
            return ;
        }
        try{
            positionTime = Number(positionTime);
            that.socket.emit('seekPlayback' , positionTime );
        }catch (e){
            if(L.Utils.isFunction(onFailure)){
                onFailure('TK_ERR_UNKNOWN');
            }
            L.Logger.error('[tk-sdk]The seek posttion must be a number, in milliseconds !');
        }
    };

    /*发送回放的暂停消息给服务器  */
    that.pausePlayback = function (bPause , onFailure) {
        if(!that.checkInit(onFailure)){
            L.Logger.error('[tk-sdk]The room is not initialized and cannot execute methods on the room class. Please call the init method for initialization!');
            return ;
        }
        if(!privateVariableJson._isPlayback){
            L.Logger.warning('[tk-sdk]No playback environment!');
            if(L.Utils.isFunction(onFailure)){
                onFailure('TK_ERR_NOT_PLAYBACK_ENVIRONMENT');
            }
            return ;
        }
        if (!L.Utils.isBoolean(bPause)) {
            if(L.Utils.isFunction(onFailure)) {
                onFailure('TK_ERR_INVALID_ARG');
            }
            L.Logger.error('[tk-sdk] pausePlayback function got wrong arguments');
            return;
        }
        if(bPause){
            that.socket.emit('pausePlayback');
        }else{
            that.socket.emit('Playback');
        }
    };

    /*获取上传文件所必须的参数
    * @params filename:文件的名字 , String
    * @params filetype:文件的类型, String
    * @params isWritedb:是否写入数据库（默认写入）, Boolean
    * @params qRCodeId:二维码上传的唯一id, String
    * @return 返回上传文件的参数，Json
     * */
    that.getUploadFileParams = function (filename ,filetype , isWritedb , qRCodeId) {
        if(!that.checkInit()){
            L.Logger.error('[tk-sdk]The room is not initialized and cannot execute methods on the room class. Please call the init method for initialization!');
            return ;
        }
        isWritedb = isWritedb!== undefined?isWritedb:true ;
        var uploadFileParams = {
            "serial": privateVariableJson._room_properties['serial'],           //会议id
            "userid": privateVariableJson._myself.id,            //用户id
            "sender": privateVariableJson._myself.nickname,     //用户名
            "conversion": 1,               //是否进行文档转换
            "isconversiondone": 0,         //表示是否从客户端进行转换   1：客户端转换 0：否
            "writedb": isWritedb?1:0,    //是否写数据库 1：写  0：不写
            'fileoldname':filename  ,     //原文件名(如果是原文件)
            "fieltype": filetype,             //文件类型(如果是原文件)
            "alluser": 1 ,                   //是否对所有人可见
        };
        if(qRCodeId){
            uploadFileParams.codeid = qRCodeId ; //二维码ID
        }
        return uploadFileParams ;
    };

    /*上传文件的功能函数 TODO 暂时微信先不支持
    * @params formData:上传的表单数据 , FormData
    * @params callback(code , response):回调函数 , 参数code为状态码 ，response为请求的结果 ， 详情请看php文档的uploaddocument接口 , Function
    * @params progressListenCallback(evt , per):进度的回调函数  , 参数 evt 进度回调的event ， per 当前完成进度的百分比  , Function
    * */
    that.uploadFile = function (formData , callback , progressListenCallback ) {
        if(!that.checkInit()){
            L.Logger.error('[tk-sdk]The room is not initialized and cannot execute methods on the room class. Please call the init method for initialization!');
            return ;
        }
    };

    /*删除文件的功能函数
     * @params fileid:要删除的文件id , Int
     * @params callback(code , response):回调函数  , 参数code为状态码 ，response为请求的结果 ， 详情请看php文档的delroomfile接口 , Function
    * */
    that.deleteFile = function (fileid , callback ) {
        if(!that.checkInit()){
            L.Logger.error('[tk-sdk]The room is not initialized and cannot execute methods on the room class. Please call the init method for initialization!');
            return ;
        }
        _webInterfaceDeleteFile(fileid , callback );
    };

    /*请求服务器列表
    * @params web_host:域名或者ip ，String
    * @params web_port:端口号 ，Int
    * @params callback(serverList):回调函数 , 参数serverList为服务器Json列表 ，Function
    * @params options:配置项 ，Json
    * TODO 该接口参数以及名字有待优化
    * */
    that.requestServerList = function(web_host , web_port , callback ){
        if(!that.checkInit()){
            L.Logger.error('[tk-sdk]The room is not initialized and cannot execute methods on the room class. Please call the init method for initialization!');
            return ;
        }
        if(!privateVariableJson._requestServerListPermission){
            if(callback && typeof callback === 'function'){
                callback( undefined  , -2);
            }
            return undefined ;
        }
        // if(that.webInterfaceGetservering ||  that.webInterfaceGetserverNameing){
        if(that.webInterfaceGetservering){
            L.Logger.info('[tk-sdk]requestServerList  interface is being requested and cannot be executed again requestServerList');
            if(callback && typeof callback === 'function'){
                _updateSelectServer(privateVariableJson._serverList , privateVariableJson._serverName );
                callback( privateVariableJson._serverList  , -2);
            }
            return undefined;
        }
        if( L.Utils.getJsonLength(privateVariableJson._serverList) ){
            if(callback && typeof callback === 'function'){
                _updateSelectServer(privateVariableJson._serverList , privateVariableJson._serverName );
                callback( privateVariableJson._serverList  , -1);
            }
            return privateVariableJson._serverList ;
        }else{
            if( (web_host === undefined ||  web_host === null) ||(web_port === undefined ||  web_port === null)){L.Logger.error('[tk-sdk]first requestServerList web_host or web_port is not exist!');return ;} ;
            privateVariableJson._temp_web_host = web_host ;
            privateVariableJson._temp_web_port = web_port ;
            L.Logger.debug('[tk-sdk]Going to requestServerList');
            // var isWebInterfaceGetserverCallback = false , isWebInterfaceGetserverNameCallback = false ;
            var isWebInterfaceGetserverCallback = false ;
            var _handleCallback = function(){
                // if(isWebInterfaceGetserverCallback && isWebInterfaceGetserverNameCallback){
                if( isWebInterfaceGetserverCallback ){
                    _updateSelectServer(privateVariableJson._serverList , privateVariableJson._serverName );
                    L.Logger.info('[tk-sdk]requestServerList finshed , serverName is '+privateVariableJson._serverName+' , serverlist info : ' , (window.__TkSdkBuild__?L.Utils.encrypt( L.Utils.toJsonStringify(privateVariableJson._serverList)): L.Utils.toJsonStringify(privateVariableJson._serverList)) );
                    var disconnectEvt = TK.RoomEvent({type: 'room-serverlist', message:{serverList:privateVariableJson._serverList , serverName:privateVariableJson._serverName}});
                    that.dispatchEvent(disconnectEvt);
                    if( callback && typeof callback === 'function' ){
                        callback( privateVariableJson._serverList , 0 );
                    }
                }
            };
            that.webInterfaceGetservering = true ;
            // that.webInterfaceGetserverNameing = true ;
            if( !L.Utils.getJsonLength(privateVariableJson._serverList) ){
                _webInterfaceGetserver(web_host , web_port , function (nRet,responseText) {
                    that.webInterfaceGetservering = false ;
                    isWebInterfaceGetserverCallback = true ;
                    _handleCallback();
                });
            }else{
                that.webInterfaceGetservering = false ;
                isWebInterfaceGetserverCallback = true ;
                _handleCallback();
            }
        }
    };

    /*切换服务器，通过服务器名字
    * @params serverName:服务器名字 , String
    * TODO 该接口参数以及名字有待优化
    */
    that.switchServerByName = function (serverName) {
        if(!that.checkInit()){
            L.Logger.error('[tk-sdk]The room is not initialized and cannot execute methods on the room class. Please call the init method for initialization!');
            return ;
        }
        if( !L.Utils.getJsonLength(privateVariableJson._serverList) ){
            L.Logger.error('[tk-sdk]selectServerByName --> service list not request  , list is not exist!');
            return false;
        }
        if( !privateVariableJson._serverList[serverName] ){
            L.Logger.error('[tk-sdk]selectServerByName --> the service list  has no option name  ' + serverName +'!');
            return false;
        }
        if(privateVariableJson._web_host !== undefined && privateVariableJson._web_port !== undefined){
            if(privateVariableJson._connectedNumber > 0){
                privateVariableJson._serverName = serverName ;
                _updateSelectServer(privateVariableJson._serverList , privateVariableJson._serverName );
                _changeWebRequestAddress();
                if(privateVariableJson._old_web_host !== privateVariableJson._web_host){
                    var options = {source:'select service reconnect'};
                    _reGetconfigToJoinRoom(options);
                }else{
                    L.Logger.info('[tk-sdk]web request host is not change , not need reconnect service!');
                }
            }else{
                L.Logger.error('[tk-sdk]selectServerByName-->The room has no connection success and cannot perform a reswitch server! ');
            }
        }else{
            L.Logger.error('[tk-sdk]selectServerByName-->web request host and port is not exist , cannot perform a reswitch server! ');
        }
        return true ;
    };


    /*切换纯音频房间
     * @params isSwitch:是否切换纯音频房间
     * */
    that.switchOnlyAudioRoom  = function (isSwitch){
        if(!that.checkInit()){
            L.Logger.error('[tk-sdk]The room is not initialized and cannot execute methods on the room class. Please call the init method for initialization!');
            return ;
        }
        var name = 'OnlyAudioRoom',
            id = name,
            toID = '__all',
            data = {},
            save = true,
            params;
        if(isSwitch){
            TK.needOnlyAudioRoom = 1;
            params = {
                name:name,
                id:id,
                toID:toID,
                data:data,
                save:save,
            };
            that.pubMsg(params);
        }else{
            TK.needOnlyAudioRoom = 2;
            params = {
                name:name,
                id:id,
                toID:toID,
                data:data,
            };
            that.delMsg(params);
        }
    };


    /*获取房间的用户总数，该接口只有在大教室模式下起效*/
    that.getRoomUserNum = function (onSuccess, roles, onFailure, search) {
        if(!that.checkInit(onFailure)){
            L.Logger.error('[tk-sdk]The room is not initialized and cannot execute methods on the room class. Please call the init method for initialization!');
            return ;
        }
        if(privateVariableJson._isLeaveRoom){
            L.Logger.info('[tk-sdk]The room is over. Method getRoomUserNum cannot be executed!');
            return ;
        }
        if( !privateVariableJson._isConnected ){
            if (L.Utils.isFunction(onFailure)) {
                onFailure('TK_ERR_NOT_JOINED');
            }
            L.Logger.error('[tk-sdk] please call getRoomUserNum method after join room success');
            return;
        }
        if( !L.Utils.isFunction(onSuccess) ){
            if (L.Utils.isFunction(onFailure)) {
                onFailure('TK_ERR_INVALID_ARG');
            }
            L.Logger.error('[tk-sdk] The parameter onSuccess of method getRoomUserNum must be a function');
            return;
        }
        var params = {
            companyid:privateVariableJson._room_properties.companyid ,
            serial:privateVariableJson._room_properties.serial ,
        };
        if( roles !== undefined && Array.isArray(roles) ){
            params.role = roles ;
            // params.role = '['+roles.join(',')+']' ;
        }
        if(search && L.Utils.isString(search)){
            params.search = search ;
        }
        var url = privateVariableJson._web_protocol + '://' + privateVariableJson._web_host + ":" + privateVariableJson._web_port + WEBFUNC_GETROOMUSERNUM+"?ts="+new Date().getTime();
        $.ajax({
            url:url,
            dataType: "json",
            type: 'GET',
            async: true,
            data:params ,
        }).done(function (response) {
            L.Logger.debug('[tk-sdk]getroomusernum resp = ', L.Utils.toJsonStringify(response));
            if(response.result === 0){
                onSuccess( L.Utils.isNumber( Number(response.num) ) ? Number(response.num)  : 0  );
            }else{
                L.Logger.warning('[tk-sdk]getroomusernum interface request fail , code is '+response.result);
                if (L.Utils.isFunction(onFailure)) {
                    onFailure('TK_ERR_HTTP_REQUEST_FAILED');
                }
            }
        }).fail(function (jqXHR, textStatus, errorThrown) {
            L.Logger.error("[tk-sdk]getroomusernum fail[ jqXHR , textStatus , errorThrown ]:", jqXHR, textStatus, errorThrown);
            if (L.Utils.isFunction(onFailure)) {
                onFailure('TK_ERR_HTTP_REQUEST_FAILED');
            }
        });
    };

    /*获取房间的用户，该接口只有在大教室模式下起效*/
    that.getRoomUsers = function ( onSuccess, start, max, roles, onFailure, search, order ) {
        if(!that.checkInit(onFailure)){
            L.Logger.error('[tk-sdk]The room is not initialized and cannot execute methods on the room class. Please call the init method for initialization!');
            return ;
        }
        if(privateVariableJson._isLeaveRoom){
            L.Logger.info('[tk-sdk]The room is over. Method getRoomUsers cannot be executed!');
            return ;
        }
        if( !privateVariableJson._isConnected ){
            if (L.Utils.isFunction(onFailure)) {
                onFailure('TK_ERR_NOT_JOINED');
            }
            L.Logger.error('[tk-sdk] please call getRoomUsers method after join room success');
            return ;
        }
        if( !L.Utils.isFunction(onSuccess) ){
            if (L.Utils.isFunction(onFailure)) {
                onFailure('TK_ERR_INVALID_ARG');
            }
            L.Logger.error('[tk-sdk] The parameter onSuccess of method getRoomUsers must be a function');
            return ;
        }
        var params = {
            companyid:privateVariableJson._room_properties.companyid ,
            serial:privateVariableJson._room_properties.serial ,
        };
        if(start !== undefined && L.Utils.isNumber(start) ){
            params.start = start ;
        }
        if(max !== undefined && L.Utils.isNumber(max) ){
            params.max = max ;
        }
        if( roles !== undefined && Array.isArray(roles) ){
            params.role = roles ;
            // params.role = '['+roles.join(',')+']' ;
        }
        if(search && L.Utils.isString(search)){
            params.search = search ;
        }
        if(order && Array.isArray(order)){
            var searchCopy = [];
            for(var i=0 , length = order.length ; i<length; i++){
                if(typeof order[i] === 'object'){
                    searchCopy.push(order[i]);
                }
                if(searchCopy.length>=3){
                    break ;
                }
            }
            if(searchCopy.length){
                params.order = searchCopy ;
            }
        }
        var url = privateVariableJson._web_protocol + '://' + privateVariableJson._web_host + ":" + privateVariableJson._web_port + WEBFUNC_GETROOMUSERS+"?ts="+new Date().getTime();
        $.ajax({
            url:url,
            dataType: "json",
            type: 'POST',
            async: true,
            data:params ,
        }).done(function (response) {
            L.Logger.debug('[tk-sdk]getroomusers resp = ', L.Utils.toJsonStringify(response));
            if(response.result === 0){
                var userlist = [] ;
                if( response.userlist && Array.isArray(response.userlist) ){
                    for(var index=0 , length=response.userlist.length; index<length;index++){
                        userlist.push(TK.RoomUser(response.userlist[index]));
                    }
                }
                onSuccess( userlist , response.total );
            }else{
                L.Logger.warning('[tk-sdk]getroomusers interface request fail , code is '+response.result);
                if (L.Utils.isFunction(onFailure)) {
                    onFailure('TK_ERR_HTTP_REQUEST_FAILED');
                }
            }
        }).fail(function (jqXHR, textStatus, errorThrown) {
            L.Logger.error("[tk-sdk]getroomusers fail[ jqXHR , textStatus , errorThrown ]:", jqXHR, textStatus, errorThrown);
            if (L.Utils.isFunction(onFailure)) {
                onFailure('TK_ERR_HTTP_REQUEST_FAILED');
            }
        });
    };

    /*获取房间用户*/
    that.getRoomUser = function (userId , onSuccess, onFailure) {
        if(!that.checkInit(onFailure)){
            L.Logger.error('[tk-sdk]The room is not initialized and cannot execute methods on the room class. Please call the init method for initialization!');
            return ;
        }
        if( !privateVariableJson._isConnected ){
            if (L.Utils.isFunction(onFailure)) {
                onFailure('TK_ERR_NOT_JOINED');
            }
            L.Logger.error('[tk-sdk] please call getRoomUser method after join room success');
            return;
        }
        if ( !userId || !L.Utils.isFunction(onSuccess) ) {
            if (L.Utils.isFunction(onFailure)) {
                onFailure('TK_ERR_INVALID_ARG');
            }
            L.Logger.error('[tk-sdk] getRoomUser method got invalid elementId!');
            return ;
        }
        if(privateVariableJson._roomMode !== window.TK.ROOM_MODE.NORMAL_ROOM){
            if( privateVariableJson._users[userId] ){
                onSuccess(privateVariableJson._users[userId]);
            }else{
                if (L.Utils.isFunction(onFailure)) {
                    onFailure('TK_ERR_NOT_DATA');
                }
            }
        }else{
            var peerids = [];
            peerids.push(userId);
            _sendMessageSocket('getUser' , peerids , function (ret , userlist) {
                if(ret === 0){
                    if( Array.isArray( userlist ) && userlist.length && userlist[0] ){
                        onSuccess( TK.RoomUser(userlist[0]) );
                    }else{
                        if (L.Utils.isFunction(onFailure)) {
                            onFailure('TK_ERR_NOT_DATA');
                        }
                    }
                }else{
                    if (L.Utils.isFunction(onFailure)) {
                        onFailure('TK_ERR_NOT_DATA');
                    }
                }
            } );
        }
    };


    /*=============================内部专属接口 start===============================*/
    /*改变用户的发布状态【内部接口】
     * @params id:用户id , String
     * @params publishstate:需要改变的用户发布状态 , Int*/
    that.changeUserPublish=function(id, publishstate) {
        if(!that.checkInit()){
            L.Logger.error('[tk-sdk]The room is not initialized and cannot execute methods on the room class. Please call the init method for initialization!');
            return ;
        }
        if (_status != STATUS_ALLREADY)
            return ERR_INVALID_STATUS;

        if (id ===undefined)
            return ERR_BAD_PARAMETERS;

        that.changeUserProperty(id, "__all", {publishstate:publishstate});
        return ERR_OK;
    };

    /*注册白板管理器的托管服务【内部接口】
     * @params <WhiteboardManagerInstance>whiteboardManagerInstance 白板管理器
     * */
    that.registerRoomWhiteBoardDelegate = function(  whiteboardManagerInstance ){
        if( whiteboardManagerInstance && whiteboardManagerInstance.className === 'TKWhiteBoardManager' && typeof whiteboardManagerInstance.registerRoomDelegate === 'function' ){
            _whiteboardManagerInstance = whiteboardManagerInstance ;
            if( _whiteboardManagerInstance ){
                if(  _whiteboardManagerInstance.registerRoomDelegate ){
                    /* var _receiveActionCommand = function( action , cmd ){
                     //action:whiteboardSdkNotice_ShowPage(翻页消息通知给sdk)
                     L.Logger.debug( '[tk-sdk]receive whiteboard sdk action command（action,cmd）:' , action , cmd );
                     };
                     _whiteboardManagerInstance.registerRoomDelegate( that , _receiveActionCommand );*/
                    _whiteboardManagerInstance.registerRoomDelegate( that );
                }
                if( _whiteboardManagerInstance.changeCommonWhiteBoardConfigration ){
                    var updateeCommonWhiteBoardConfigration = {};
                    if( privateVariableJson._web_protocol && privateVariableJson._web_host && privateVariableJson._web_port !== undefined ){
                        updateeCommonWhiteBoardConfigration.webAddress = {
                            protocol:privateVariableJson._web_protocol,
                            hostname:privateVariableJson._web_host,
                            port: privateVariableJson._web_port,
                        }  ; //php服务器地址
                    }
                    if( privateVariableJson._doc_protocol && privateVariableJson._doc_host && privateVariableJson._doc_port !== undefined ){
                        updateeCommonWhiteBoardConfigration.docAddress = {
                            protocol:privateVariableJson._doc_protocol,
                            hostname:privateVariableJson._doc_host,
                            port: privateVariableJson._doc_port,
                        }; //文档服务器地址
                    }
                    if(privateVariableJson._backup_doc_host_list.length){
                        var backupDocAddressList = [];
                        for(var i=0,length=privateVariableJson._backup_doc_host_list.length;i<length;i++){
                            backupDocAddressList.push({
                                protocol:privateVariableJson._backup_doc_protocol,
                                hostname:privateVariableJson._backup_doc_host_list[i],
                                port: privateVariableJson._backup_doc_port,
                            });
                        }
                        updateeCommonWhiteBoardConfigration.backupDocAddressList = backupDocAddressList;
                    }
                    if( privateVariableJson._myself.id !== undefined ){
                        updateeCommonWhiteBoardConfigration.myUserId =  privateVariableJson._myself.id  ; //我的userID
                    }
                    if( privateVariableJson._myself.nickname !== undefined ){
                        updateeCommonWhiteBoardConfigration.myName =  privateVariableJson._myself.nickname  ; //我的名字
                    }
                    if( privateVariableJson._myself.role !== undefined ){
                        updateeCommonWhiteBoardConfigration.myRole =  privateVariableJson._myself.role  ; //我的角色
                    }
                    updateeCommonWhiteBoardConfigration.isPlayback = privateVariableJson._isPlayback  ; //是否是回放
                    _whiteboardManagerInstance.changeCommonWhiteBoardConfigration(updateeCommonWhiteBoardConfigration);
                }
            }
        }else{
            L.Logger.warning('[tk-sdk]register whiteboardManagerInstance not is a TKWhiteBoardManager instance class , cannot execute registerRoomWhiteBoardDelegate method.');
        }
    };
    /*=============================内部专属接口 end===============================*/

    /*=============================私有函数 start===============================*/
    /**
     * 更新地址
     *@params updateWebAddress = {
                    web_protocol ,  web_host , web_port ,
                    doc_protocol , doc_host , doc_port  ,
                    socket_protocol ,  socket_host , socket_port ,
                    backup_doc_protocol , backup_doc_host , backup_doc_port,
                    backup_doc_host_list
                }
    * */
    function _updateWebAddressInfo( updateWebAddress ) {
        privateVariableJson._web_protocol = updateWebAddress.web_protocol || privateVariableJson._web_protocol;
        privateVariableJson._web_host = updateWebAddress.web_host || privateVariableJson._web_host ;
        privateVariableJson._web_port = updateWebAddress.web_port || privateVariableJson._web_port ;
        privateVariableJson._doc_protocol = updateWebAddress.doc_protocol || privateVariableJson._doc_protocol;
        privateVariableJson._doc_host = updateWebAddress.doc_host || privateVariableJson._doc_host ;
        privateVariableJson._doc_port = updateWebAddress.doc_port || privateVariableJson._doc_port ;
        privateVariableJson._socket_protocol = updateWebAddress.socket_protocol || privateVariableJson._socket_protocol;
        privateVariableJson._socket_host = updateWebAddress.socket_host || privateVariableJson._socket_host ;
        privateVariableJson._socket_port = updateWebAddress.socket_port || privateVariableJson._socket_port ;
        privateVariableJson._backup_doc_protocol = updateWebAddress.backup_doc_protocol || privateVariableJson._backup_doc_protocol;
        privateVariableJson._backup_doc_host = updateWebAddress.backup_doc_host || privateVariableJson._backup_doc_host ;
        privateVariableJson._backup_doc_port = updateWebAddress.backup_doc_port || privateVariableJson._backup_doc_port ;
        privateVariableJson._backup_doc_host_list = updateWebAddress.backup_doc_host_list || privateVariableJson._backup_doc_host_list ;

        if(privateVariableJson._doc_host === undefined){
            privateVariableJson._doc_host = privateVariableJson._web_host ;
        }
        if(privateVariableJson._doc_port === undefined){
            privateVariableJson._doc_port = privateVariableJson._web_port ;
        }
        if(privateVariableJson._backup_doc_host === undefined){
            privateVariableJson._backup_doc_host = privateVariableJson._web_host ;
        }
        if(privateVariableJson._backup_doc_port === undefined){
            privateVariableJson._backup_doc_port = privateVariableJson._web_port ;
        }
        if(!privateVariableJson._docServerAddr){
            privateVariableJson._doc_host = privateVariableJson._web_host ;
            privateVariableJson._doc_port = privateVariableJson._web_port ;
        }
        if(!privateVariableJson._hasDocServerAddrBackup){
            privateVariableJson._backup_doc_host = privateVariableJson._web_host ;
            privateVariableJson._backup_doc_port = privateVariableJson._web_port ;
            privateVariableJson._backup_doc_host_list = [privateVariableJson._backup_doc_host];
        }else if(!privateVariableJson._backup_doc_host_list.length){
            privateVariableJson._backup_doc_host_list = [privateVariableJson._backup_doc_host];
        }
        if( _whiteboardManagerInstance && _whiteboardManagerInstance.changeCommonWhiteBoardConfigration ){
            var backupDocAddressList = [];
            for(var i=0,length=privateVariableJson._backup_doc_host_list.length;i<length;i++){
                backupDocAddressList.push({
                    protocol:privateVariableJson._backup_doc_protocol,
                    hostname:privateVariableJson._backup_doc_host_list[i],
                    port: privateVariableJson._backup_doc_port,
                });
            }
            _whiteboardManagerInstance.changeCommonWhiteBoardConfigration({
                webAddress:{
                    protocol:privateVariableJson._web_protocol,
                    hostname:privateVariableJson._web_host,
                    port: privateVariableJson._web_port,
                } , //php服务器地址
                docAddress:{
                    protocol:privateVariableJson._doc_protocol,
                    hostname:privateVariableJson._doc_host,
                    port: privateVariableJson._doc_port,
                }, //文档服务器地址
                backupDocAddressList:backupDocAddressList , //备份文档服务器地址列表
            });
        }

        var Evt = TK.RoomEvent({type: 'room-serveraddress-update', message:{
            protocol:privateVariableJson._web_protocol ,
            web_protocol:privateVariableJson._web_protocol  , web_host:privateVariableJson._web_host , web_port:privateVariableJson._web_port ,
            doc_protocol:privateVariableJson._doc_protocol , doc_host:privateVariableJson._doc_host ,doc_port:privateVariableJson._doc_port ,
            // socket_protocol:privateVariableJson._socket_protocol , socket_host:privateVariableJson._socket_host ,socket_port:privateVariableJson._socket_port ,
            backup_doc_protocol:privateVariableJson._backup_doc_protocol , backup_doc_host:privateVariableJson._backup_doc_host ,backup_doc_port:privateVariableJson._backup_doc_port ,
            backup_doc_host_list:privateVariableJson._backup_doc_host_list
        } });
        that.dispatchEvent(Evt);
    }
    function _reGetconfigToJoinRoom( options , callback , error ) {
        var oldRoomUri = privateVariableJson._room_uri ;
        options = options || {};
        options.source  = options.source || 'unknown source' ;
        var source =   options.source ;
        _step2GetConfig(privateVariableJson._web_host, privateVariableJson._web_port, function(result,responseText) {
            if(result!=0){
                L.Logger.error('[tk-sdk]'+source+':step2GetConfig failure --> result and responseText:' , result ,  responseText);
            }else{
                if(  oldRoomUri  !== privateVariableJson._room_uri  || source === 'forceReconnect room'){
                    that.needReconnectSocket = true ;
                    try {
                        if(that.socket && that.socket.disconnect){
                            that.socket.disconnect(); // Close socket
                        }
                    } catch (error) {
                        L.Logger.warning('[tk-sdk]'+source+':Socket already disconnected , disconnect errorInfo:' , error);
                    }
                    that.socket = undefined;
                    if(source === 'select service reconnect' || source === 'forceReconnect room'){
                        _resetRoomState();
                        var disconnectEvt = TK.RoomEvent({type: 'room-disconnected', message: 'select service reconnect , need socket disconnect'});
                        that.dispatchEvent(disconnectEvt);
                    }
                }
                if( source === 'forceReconnect room' ){
                    _getFileList(function () {
                        L.Logger.info('[tk-sdk]'+source+':room socket force reconnect room  ,room socket url:'+(window.__TkSdkBuild__?L.Utils.encrypt( privateVariableJson._room_uri ):privateVariableJson._room_uri )+ '! ');
                        _step3Connect();
                    });
                }else{
                    if(oldRoomUri  !== privateVariableJson._room_uri ){
                        _getFileList(function () {
                            L.Logger.info('[tk-sdk]'+source+':room socket url  changed  , old room socket url:'+(window.__TkSdkBuild__?L.Utils.encrypt( oldRoomUri ):oldRoomUri )+'  , now room socket url:'+(window.__TkSdkBuild__?L.Utils.encrypt( privateVariableJson._room_uri ):privateVariableJson._room_uri )+ '! ');
                            _step3Connect();
                        });
                    }else{
                        L.Logger.info('[tk-sdk]'+source+':room socket url not change  , room socket url:'+(window.__TkSdkBuild__?L.Utils.encrypt( privateVariableJson._room_uri ):privateVariableJson._room_uri )+'! ');
                        if(source === 'reconnected room'){
                            _getFileList(function () {
                                _step4Join(callback,error);
                            });
                        }else if (source === 'select service reconnect') {
                            L.Logger.warning('[tk-sdk]room uri is not change , no need to perform a reload server');
                            if(privateVariableJson._isConnected && privateVariableJson._myself && privateVariableJson._myself.id && privateVariableJson._users[privateVariableJson._myself.id] && privateVariableJson._serverName !== privateVariableJson._myself.servername){
                                that.changeUserProperty(privateVariableJson._myself.id, "__all", {servername:privateVariableJson._serverName});
                            }
                        }
                    }
                }
            }
        },{
            notSpeedNetwordk:true
        });

        function _getFileList(callback) {
            _step2GetFileList(privateVariableJson._web_host, privateVariableJson._web_port, function(result,message) {
                L.Logger.debug('[tk-sdk]reconnected room:step2GetFileList result = '  + result + ' , message:'+ L.Utils.toJsonStringify(message) );
                if(result === 0 ){
                    privateVariableJson._room_filelist = [];
                    if( message && Array.isArray( message ) && message.length ){
                        for( var index = 0  , length =  message.length  ; index < length ; index++ ){
                            var file = message[index];
                            if( file ){
                                privateVariableJson._room_filelist.push({
                                    "fileid":Number( file.fileid ),
                                    "companyid": file.companyid ,
                                    "filename": file.filename ,
                                    "uploaduserid": file.uploaduserid ,
                                    "uploadusername": file.uploadusername ,
                                    "downloadpath": file.downloadpath ,
                                    "swfpath": file.swfpath ,
                                    "isContentDocument": file.isContentDocument !== undefined && file.isContentDocument !== null && typeof Number(file.isContentDocument) === 'number' ?  Number(file.isContentDocument) : 0 ,
                                    "filetype":file.filetype && typeof file.filetype === 'string' ? file.filetype.toLocaleLowerCase() : file.filetype ,
                                    "pagenum":Number( file.pagenum ),
                                    "dynamicppt": Number( file.dynamicppt ) ,
                                    "filecategory": Number( file.filecategory ) , //0:课堂 ， 1：系统
                                    "fileprop":  Number( file.fileprop )  , //0：普通文档 ， 1-2：动态ppt(1-旧版，2-新版) ， 3：h5文档
                                    "type": Number( file.type ) , //0：非默认文档   1：默认文档
                                });
                            }
                        }
                    }
                    var Evt = TK.RoomEvent({type: 'room-files', message: privateVariableJson._room_filelist});
                    that.dispatchEvent(Evt);
                }else {
                    L.Logger.info('[tk-sdk]'+source+':step2GetFileList code is '+result);
                }
                if(typeof callback === 'function'){
                    callback();
                }
            });
        }
    }
    function _updateSelectServer(serverlist , serverName) {
        serverlist = serverlist || privateVariableJson._serverList ;
        serverName = serverName || privateVariableJson._serverName ;
        if( typeof serverlist === 'object' && L.Utils.getJsonLength(serverlist)  && serverName !== undefined){
            for(var key in serverlist){
                if(serverName === key){
                    serverlist[key].isUseServer = true ;
                }else{
                    serverlist[key].isUseServer = false ;
                }
            }
        }
    }

    function _changeWebRequestAddress() {
        if(  !(/(192.168.|127.0.0.1|127.17.|localhost)/g.test(privateVariableJson._web_host) ) && privateVariableJson._serverName ){
            if(privateVariableJson._web_host !== undefined ){
                var firstDotIndex = privateVariableJson._web_host.indexOf('.') ;
                if(firstDotIndex > 0 ){
                    var replaceStr = privateVariableJson._web_host.substring(0 , firstDotIndex );
                    var regExp = new RegExp(replaceStr);
                    privateVariableJson._old_web_host = privateVariableJson._web_host ;
                    var replace_web_host = privateVariableJson._web_host.replace(regExp , privateVariableJson._serverName) ;
                    if(replace_web_host !==  privateVariableJson._web_host){
                        L.Logger.info('[tk-sdk]changeWebRequest host , old host is '+  (window.__TkSdkBuild__?L.Utils.encrypt(privateVariableJson._old_web_host):privateVariableJson._old_web_host) + ', now host is '+  (window.__TkSdkBuild__?L.Utils.encrypt(replace_web_host):replace_web_host)   ) ;
                        _updateWebAddressInfo({
                            web_host:replace_web_host ,
                        } );
                    }else{
                        L.Logger.info('[tk-sdk]changeWebRequest host , host is not change ,   host is '+  (window.__TkSdkBuild__?L.Utils.encrypt(privateVariableJson._web_host):privateVariableJson._web_host)  ) ;
                    }
                }else{
                    L.Logger.error('[tk-sdk]web request host not find first dot , cannot address to replace , current host is '+  (window.__TkSdkBuild__?L.Utils.encrypt(privateVariableJson._web_host):privateVariableJson._web_host) +' ! ');
                }
            }else{
                L.Logger.error('[tk-sdk]web request host is not exist , cannot call changeWebRequestAddress ! ');
            }
        }
    };

    function _replaceHostname(hostname,prefix) {
        if(  !(/(192.168.|127.0.0.1|127.17.|localhost)/g.test(hostname) ) && prefix && hostname){
            var firstDotIndex = hostname.indexOf('.') ;
            if(firstDotIndex > 0 ){
                var replaceStr = hostname.substring(0 , firstDotIndex );
                var regExp = new RegExp(replaceStr);
                hostname = hostname.replace(regExp , prefix) ;
            }
        }
        return hostname;
    }

    function _resetRoomState( ) { //重置房间状态
        TK.isOnlyAudioRoom = false ;
        TK.needOnlyAudioRoom = 0 ;
        if(privateVariableJson._myself) {
            privateVariableJson._myself.publishstate = TK.PUBLISH_STATE_NONE;
        }
        if (privateVariableJson._users) {
            _clearUsers(privateVariableJson._users);
        }
        privateVariableJson._isConnected = false ;
        if( _whiteboardManagerInstance ){
            if( _whiteboardManagerInstance.changeCommonWhiteBoardConfigration ){
                _whiteboardManagerInstance.changeCommonWhiteBoardConfigration({
                    isConnectedRoom:privateVariableJson._isConnected , //是否已经连接房间
                });
            }
        }

    };
    function _setStatus(newStatus) {
        L.Logger.info('[tk-sdk]setStatus to: ' + newStatus);
        if (_status == newStatus)
            return;

        _status = newStatus;
        if (_status == STATUS_ALLREADY) {
            privateVariableJson._users[privateVariableJson._myself.id]=privateVariableJson._myself;
        }
        else if(_status == STATUS_DISCONNECTED){
            _resetRoomState();
        }
        else if(_status == STATUS_IDLE) {
            _resetRoomState();
        }
    };
    function _clearUsers(obj) {
        if(!privateVariableJson._isPlayback){ //回放则不清空用户列表
            for(var key in obj){
                delete obj[key];
            }
        }else{
            for(var key in obj){
                obj[key].playbackLeaved = true;
            }
        }
    };

    function _changeAddressInner(_name, _signaladdr, _signalport, _webaddr, _docaddr, _change, _updateAddress, _callback) {
        privateVariableJson._serverName = _name ;
        privateVariableJson._ipFalsification = _trim(_change) ;
        privateVariableJson._isIpFalsification = !!_change ;
        var sighost = _signaladdr;
        var sigport = Number(_signalport);
        var updateAddress = {};
        if(_updateAddress && typeof _updateAddress === 'object'){
            for(var key in _updateAddress){
                updateAddress[key] = _updateAddress[key];
            }
        }
        if(!/https/g.test(privateVariableJson._socket_protocol)){
            sigport = sigport + 1 ;
        }
        if ( privateVariableJson._testIP  && privateVariableJson._testPort ) {
            sighost = privateVariableJson._testIP;
            sigport = privateVariableJson._testPort;
        }
        updateAddress.socket_host = sighost;
        updateAddress.socket_port = sigport;
        if(_webaddr){
            updateAddress.web_host = _webaddr;
        }
        if(_docaddr && Array.isArray(_docaddr) && _docaddr.length){
            privateVariableJson._hasDocServerAddrBackup =  true ;
            updateAddress.backup_doc_host = _docaddr[0];
            updateAddress.backup_doc_host_list = _docaddr;
        }else{
            privateVariableJson._hasDocServerAddrBackup =  false ;
        }
        _updateWebAddressInfo(updateAddress);
        privateVariableJson._room_uri = privateVariableJson._socket_protocol + '://'  + privateVariableJson._socket_host + ":" + privateVariableJson._socket_port;
        L.Logger.debug("[tk-sdk]privateVariableJson._room_uri = " + privateVariableJson._room_uri);
        if(L.Utils.isFunction(_callback)){
            _callback();
        }
    };

    function _step2GetConfig(host, port, callback, options) {
        if(privateVariableJson._isLeaveRoom){
            L.Logger.info('[tk-sdk]The room is over. Method _step2GetConfig cannot be executed!');
            return ;
        }
        options = options || {};
        _setStatus(STATUS_GETTINGCFG);
        if(privateVariableJson._room_id == undefined) {
            callback(ERR_HTTP_REQUEST_FAILED, null);
            return;
        }
        privateVariableJson._backupCourseAddrList = [];
        L.Logger.debug('[tk-sdk]Going to getConfig');
        var url = privateVariableJson._web_protocol + '://'  + host + ":" + port + WEBFUNC_GETCONFIG+"?ts="+new Date().getTime();
        var xmlhttp ;
        xmlhttp = wx.request({
            method:"POST",
            url: url,
            data: {
                serial: privateVariableJson._room_id ,
                userrole: privateVariableJson._myself.role,
                selfip: privateVariableJson._myIp
            },
            header: {
                'content-type': 'application/x-www-form-urlencoded;charset=utf-8'
            },
            success: function(res) {
              var response_json = L.Utils.toJsonParse(res.data);
              L.Logger.debug('[tk-sdk]getConfig resp = ',  L.Utils.toJsonStringify(response_json) );
              privateVariableJson._configuration = response_json ;
              var sighost = host, sigport = "8889";
              var updateAddress = {};
              if (privateVariableJson._testIP  && privateVariableJson._testPort ) {
                  sighost = privateVariableJson._testIP;
                  sigport = privateVariableJson._testPort;
              } else {
                  if (response_json.courseserver!==undefined) {
                      var tmp = response_json.courseserver;
                      if (tmp !== null && tmp !== undefined && tmp.length > 0){
                          sighost = tmp;
                      }
                  }
                  if (response_json.courseserverport!==undefined){
                      sigport = Number(response_json.courseserverport);
                  }
              }
              if( response_json.ClassDocServerAddr ){
                  privateVariableJson._docServerAddr =  response_json.ClassDocServerAddr ;
                  updateAddress.doc_host = response_json.ClassDocServerAddr;
              }

              if( response_json.newcourseaddr && Array.isArray(response_json.newcourseaddr) && response_json.newcourseaddr.length){
                  privateVariableJson._backupCourseAddrList = privateVariableJson._backupCourseAddrList.concat(response_json.newcourseaddr);
                  if(response_json.newcourseaddr.length > 1){
                      if(options && options.notSpeedNetwordk){
                          var addrInfo = response_json.newcourseaddr[0] ;
                          privateVariableJson._backupCourseAddrList.splice(0,1);
                          _changeAddressInner(addrInfo.name, addrInfo.signaladdr,addrInfo.signalport ,  addrInfo.webaddr, addrInfo.docaddr, addrInfo.change, updateAddress, function () {
                              callback(response_json ? 0 : ERR_HTTP_REQUEST_FAILED, xmlhttp.responseText);
                          });
                      }else{
                          var speedNetwordkXhrJson = {};
                          var isSpeedNetwordkFinshed = false ;
                          var _checkNetInner = function(index) {
                              var addrInfo = response_json.newcourseaddr[index] ;
                              var _sppedHost = addrInfo.webaddr ;
                              speedNetwordkXhrJson[_sppedHost+'_'+index] = _speedNetwordk(addrInfo.webaddr, privateVariableJson._web_port,function (speedCode) {
                                  speedNetwordkXhrJson[_sppedHost+'_'+index] = undefined;
                                  delete speedNetwordkXhrJson[_sppedHost+'_'+index];
                                  if(speedCode === 0 && !isSpeedNetwordkFinshed){
                                      isSpeedNetwordkFinshed = true;
                                      privateVariableJson._backupCourseAddrList.splice(index,1);
                                      _changeAddressInner(addrInfo.name, addrInfo.signaladdr,  addrInfo.signalport, addrInfo.webaddr, addrInfo.docaddr, addrInfo.change, updateAddress, function () {
                                          callback(response_json ? 0 : ERR_HTTP_REQUEST_FAILED, xmlhttp.responseText);
                                      });
                                  }else{
                                      speedNetwordkXhrJson[_sppedHost+'_'+index] = undefined;
                                      delete speedNetwordkXhrJson[_sppedHost+'_'+index];
                                      if(!isSpeedNetwordkFinshed){
                                          var awitXhrNum = 0;
                                          for(var key in speedNetwordkXhrJson){
                                              awitXhrNum++;
                                          }
                                          if(!awitXhrNum){
                                              var backup_doc_host_list = [];
                                              if( response_json.ClassDocServerAddrBackup ){
                                                  backup_doc_host_list.push(response_json.ClassDocServerAddrBackup);
                                              }
                                              _step2GetFalsificationIp(sighost, privateVariableJson._webInterfaceHtmlPort,undefined,false);
                                              _changeAddressInner(privateVariableJson._serverName, sighost,sigport, undefined, backup_doc_host_list, privateVariableJson._isIpFalsification && privateVariableJson._ipFalsification ? privateVariableJson._ipFalsification : "" , updateAddress, function () {
                                                  callback(response_json ? 0 : ERR_HTTP_REQUEST_FAILED, xmlhttp.responseText);
                                              });
                                          }
                                      }
                                  }
                              });
                          }
                          for(var i=0 , len=response_json.newcourseaddr.length ; i<len ; i++){
                              _checkNetInner(i);
                          }
                      }
                  }else{
                      var addrInfo = response_json.newcourseaddr[0] ;
                      _changeAddressInner(addrInfo.name, addrInfo.signaladdr,addrInfo.signalport ,  addrInfo.webaddr, addrInfo.docaddr, addrInfo.change, updateAddress, function () {
                          callback(response_json ? 0 : ERR_HTTP_REQUEST_FAILED, xmlhttp.responseText);
                      });
                  }
              }else{
                  var backup_doc_host_list = [];
                  if( response_json.ClassDocServerAddrBackup ){
                      backup_doc_host_list.push(response_json.ClassDocServerAddrBackup);
                  }
                  _step2GetFalsificationIp(sighost, privateVariableJson._webInterfaceHtmlPort,undefined,false);
                  _changeAddressInner(privateVariableJson._serverName, sighost, sigport, undefined, backup_doc_host_list, privateVariableJson._isIpFalsification && privateVariableJson._ipFalsification ? privateVariableJson._ipFalsification : "", updateAddress, function () {
                      callback(response_json ? 0 : ERR_HTTP_REQUEST_FAILED, xmlhttp.responseText);
                  });
              }
            },
            fail: function(err){
                L.Logger.error('[tk-sdk]getConfig fail[readyState-status]:' , err ) ;
                // L.Logger.error('[tk-sdk]getConfig fail[readyState-status]:' , xmlhttp.readyState , xmlhttp.status ) ;
                if(privateVariableJson._isLeaveRoom){
                    L.Logger.info('[tk-sdk]The room is over. Method getConfig cannot be executed!');
                    return ;
                }
                if( !privateVariableJson._webReconnectNumList.hasOwnProperty('getConfigReconnectNum') ){
                    privateVariableJson._webReconnectNumList.getConfigReconnectNum = 0 ;
                }
                privateVariableJson._webReconnectNumList.getConfigReconnectNum = (++privateVariableJson._webReconnectNumList.getConfigReconnectNum) % 5 ;
                clearTimeout(privateVariableJson._webReconnectNumList.getConfigReconnectTimer);
                privateVariableJson._webReconnectNumList.getConfigReconnectTimer = setTimeout(function () {
                    if(privateVariableJson._isLeaveRoom){
                        L.Logger.info('[tk-sdk]The room is over. Method getConfig cannot be executed!');
                        return ;
                    }
                    L.Logger.info('[tk-sdk]Rerequest getConfig web interface!');
                    _step2GetConfig(host, port, callback, options);
                },privateVariableJson._webReconnectNumList.getConfigReconnectNum * 1000);
                // callback(ERR_HTTP_REQUEST_FAILED , xmlhttp.responseText);
            }
        })
    } ;
    function _step2GetFileList(host, port, callback) {
        if(privateVariableJson._isLeaveRoom){
            L.Logger.info('[tk-sdk]The room is over. Method _step2GetFileList cannot be executed!');
            return ;
        }
        if(privateVariableJson._room_id === undefined) {
            callback(ERR_HTTP_REQUEST_FAILED, undefined);
            return;
        }
        if(!privateVariableJson._isGetFileList){
            callback( -1 , undefined); //-1代表不执行web请求
            return ;
        }
        L.Logger.debug('[tk-sdk]Going to getFileList');
        var url = privateVariableJson._web_protocol + '://'  + host + ":" + port + WEBFUNC_GETFILELIST+"?ts="+new Date().getTime();
        var xmlhttp ;
        xmlhttp = wx.request({
            url: url,
            method: "POST",
            data: {
                serial: privateVariableJson._room_id,
            },
            header: {
                'content-type': 'application/x-www-form-urlencoded;charset=utf-8'
            },
            success: function(res){
                var response_json = L.Utils.toJsonParse(res.data);
                L.Logger.debug('[tk-sdk]getFileList resp = ',  L.Utils.toJsonStringify(response_json) );

                var nRet = response_json.result;
                var roomfile;
                if (nRet == 0 && response_json.roomfile!==undefined) {
                    roomfile = response_json.roomfile;
                }else{
                    L.Logger.info('[tk-sdk]getFileList resp.roomfile is not exist , nRet:'+nRet);
                }
                callback(nRet, roomfile);
            },
            fail: function(err){
                L.Logger.error('[tk-sdk]getFileList fail[readyState-status]:' , err);
                // L.Logger.error('[tk-sdk]getFileList fail[readyState-status]:' , xmlhttp.readyState , xmlhttp.status ) ;
                callback(ERR_HTTP_REQUEST_FAILED,undefined);
            }
        })
    }
    function _step2GetFalsificationIp(host , port , callback, isAsync) {
            if(privateVariableJson._isLeaveRoom){
                L.Logger.info('[tk-sdk]The room is over. Method _step2GetFalsificationIp cannot be executed!');
                return ;
            }
            isAsync = L.Utils.isBoolean(isAsync)?isAsync:true;
            var url = privateVariableJson._web_protocol + '://' +host+":"+port +"/where.html?ts=" + new Date().getTime();
            if( /(192.168.|127.0.0.1|127.17.|localhost)/g.test(host) ){
               privateVariableJson._isIpFalsification = false ;
            }else{
               privateVariableJson._isIpFalsification = true ;
            }
            wx.request({
                url: url,
                method: "GET",
                header: {
                    'content-type': 'application/x-www-form-urlencoded;charset=utf-8'
                },
                success: function(response_json) {
                    L.Logger.info('[tk-sdk]getFalsificationIp resp :',  (window.__TkSdkBuild__?L.Utils.encrypt( (typeof response_json === 'object'? L.Utils.toJsonStringify(response_json) : response_json) ): (typeof response_json === 'object'? L.Utils.toJsonStringify(response_json) : response_json ) )  );
                    if( typeof response_json === 'string' ){
                        response_json =  L.Utils.toJsonParse(response_json) ;
                    }
                    if( response_json && typeof response_json === 'object' ){
                        if(response_json.name && typeof response_json.name === 'string'){
                            privateVariableJson._ipFalsificationName = _trim(response_json.name);
                            privateVariableJson._serverName = privateVariableJson._ipFalsificationName ;
                        }
                        if(response_json.selfip && typeof response_json.selfip === 'string'){
                            privateVariableJson._myIp = _trim(response_json.selfip) ;
                        }
                        if(response_json.ip && typeof response_json.ip === 'string'){
                            privateVariableJson._ipFalsification = _trim(response_json.ip) ;
                        }
                        if( response_json.nochange ){
                            privateVariableJson._isIpFalsification = false ;
                            L.Logger.info('[tk-sdk]no strings change SDP  , ipFalsificationName is '+ privateVariableJson._ipFalsificationName );
                        }
                        if(L.Utils.isFunction(callback)){
                            callback(0,response_json);
                        }
                    }else{
                        L.Logger.error('[tk-sdk]getFalsificationIp resp not is json');
                        if(L.Utils.isFunction(callback)){
                            callback(-1,'getFalsificationIp resp not is json');
                        }
                    }
                },
                fail: function(err) {
                    L.Logger.error('[tk-sdk]getFalsificationIp fail:' ,err ) ;
                    if(privateVariableJson._isLeaveRoom){
                        L.Logger.info('[tk-sdk]The room is over. Method getFalsificationIp cannot be executed!');
                        return ;
                    }
                    if( !privateVariableJson._webReconnectNumList.hasOwnProperty('getFalsificationIpReconnectNum') ){
                        privateVariableJson._webReconnectNumList.getFalsificationIpReconnectNum = 0 ;
                    }
                    privateVariableJson._webReconnectNumList.getFalsificationIpReconnectNum = (++privateVariableJson._webReconnectNumList.getFalsificationIpReconnectNum) % 5 ;
                    clearTimeout(privateVariableJson._webReconnectNumList.getFalsificationIpReconnectTimer);
                    privateVariableJson._webReconnectNumList.getFalsificationIpReconnectTimer = setTimeout(function () {
                        if(privateVariableJson._isLeaveRoom){
                            L.Logger.info('[tk-sdk]The room is over. Method getFalsificationIp cannot be executed!');
                            return ;
                        }
                        L.Logger.info('[tk-sdk]Rerequest getFalsificationIp web interface!');
                        _step2GetFalsificationIp(host , port , callback, isAsync);
                    },privateVariableJson._webReconnectNumList.getFalsificationIpReconnectNum * 1000);
                    /*if(L.Utils.isFunction(callback)){
                        callback(-1,err);
                    }*/
                }
            })
    };
    function _step3Connect() {
        L.Logger.debug("[tk-sdk]step3Connect");
        if(privateVariableJson._isLeaveRoom){
            L.Logger.info('[tk-sdk]The room is over. Method _step3Connect cannot be executed!');
            return ;
        }
        if (_status >= STATUS_CONNECTING)
            return;
        _setStatus(STATUS_CONNECTING);
        L.Logger.info("[tk-sdk]socket connect address:"+ (window.__TkSdkBuild__?L.Utils.encrypt( privateVariableJson._room_uri ):privateVariableJson._room_uri ) );
        privateVariableJson._isConnected = false ;
        if( _whiteboardManagerInstance ){
            if( _whiteboardManagerInstance.changeCommonWhiteBoardConfigration ){
                _whiteboardManagerInstance.changeCommonWhiteBoardConfigration({
                    isConnectedRoom:privateVariableJson._isConnected , //是否已经连接房间
                });
            }
        }
        _connectSocket(_handlerCallbackJson._handler_connectSocketSuccess, _handlerCallbackJson._handler_connectSocketFail);
    };
    function _step4Join(callback,error) {
        if(privateVariableJson._isLeaveRoom){
            L.Logger.info('[tk-sdk]The room is over. Method _step4Join cannot be executed!');
            return ;
        }
        if(_status >= STATUS_JOINING)
            return;

        if (privateVariableJson._myself.id == undefined || privateVariableJson._room_id == undefined) {
            L.Logger.error('[tk-sdk]Invalid status', privateVariableJson._myself, privateVariableJson._room_id);
            return;
        }

        _setStatus(STATUS_JOINING);
        if(privateVariableJson._myself){
            if(privateVariableJson._serverName){
                privateVariableJson._myself.servername = privateVariableJson._serverName ;
            }
            privateVariableJson._myself.udpstate = L.Constant.udpState.ok ;
            privateVariableJson._myself.tk_ip = privateVariableJson._myIp ;
        }
        var properties =  {};
        for (var key in privateVariableJson._myself) {
            if (key != 'id' && key != 'watchStatus')
                properties[key]=privateVariableJson._myself[key];
        }
        var params = {
            userId:privateVariableJson._myself.id,
            roomId:privateVariableJson._room_id,
            maxVideo:privateVariableJson._room_max_videocount,
            videofps:privateVariableJson._room_video_fps,
            videowidth:privateVariableJson._room_video_width,
            videoheight:privateVariableJson._room_video_height,
            properties:properties ,
            roomtype:privateVariableJson._room_properties.roomtype ,
            version:JOINROOMVERSION ,  //join room 版本
            vcodec:typeof privateVariableJson._video_codec === 'number' ? privateVariableJson._video_codec : 0 ,
        };

        if(privateVariableJson._isPlayback){ //是回放，则添加地址
            if(!privateVariableJson._recordfilepath){L.Logger.error('[tk-sdk]The playback file address does not exist!');return ; } ;
            params.recordfilepath = privateVariableJson._recordfilepath ;
        }
        L.Logger.info('joinRoom params info:'+  (window.__TkSdkBuild__?L.Utils.encrypt( L.Utils.toJsonStringify(params)): L.Utils.toJsonStringify(params) ) );
        _sendMessageSocket('joinRoom', params, callback, error);
    } ;
    function _webInterfaceGetserver(host , port , callback ) {
        L.Logger.debug('[tk-sdk]Going to webInterfaceGetserver');
        var url = privateVariableJson._web_protocol + '://'  + host + ":" + port + WEBFUNC_GETSERVERAREA+"?ts="+new Date().getTime();
        wx.request({
            url: url,
            method: "POST",
            header: {
                'content-type': 'application/x-www-form-urlencoded;charset=utf-8'
            },
            success: function(response_json) {
                L.Logger.info('[tk-sdk]webInterfaceGetserver resp = ', (window.__TkSdkBuild__?L.Utils.encrypt( L.Utils.toJsonStringify(response_json)): L.Utils.toJsonStringify(response_json))  );
                response_json =  L.Utils.toJsonParse(response_json.data);
                var nRet = response_json.result;
                privateVariableJson._serverList = {};
                if (nRet == 0 && response_json.serverarealist!==undefined) {
                    for(var key in response_json.serverarealist){
                        var serverarea = response_json.serverarealist[key];
                        privateVariableJson._serverList[serverarea.serverareaname] = serverarea ;
                    }
                }else{
                    L.Logger.info('[tk-sdk]webInterfaceGetserver resp.serverarealist is not exist , nRet:'+nRet);
                }
                callback(nRet, L.Utils.toJsonStringify(response_json) );
            },
            fail: function(err) {
                L.Logger.error('[tk-sdk]webInterfaceGetserver fail[readyState-status]:' , err ) ;
                callback(ERR_HTTP_REQUEST_FAILED,undefined);
            }
        })
    };

    /*发送DocumentChange信令*/
    function _sendDocumentChangeSignalling( fileinfo , isDel ) {
        if( fileinfo && typeof fileinfo === 'object'){
            var fileprop = Number( fileinfo.fileprop );
            var filetype = fileinfo.filetype  && typeof fileinfo.filetype === 'string' ?fileinfo. filetype.toLocaleLowerCase() : fileinfo.filetype ;
            var isDynamicPPT = fileprop === 1 || fileprop === 2 ;
            var isH5Document = fileprop === 3 ;
            var isGeneralFile = !isDynamicPPT && !isH5Document ;
            var isMediaFile = /(mp3|mp4|webm)/g.test( filetype ) ;
            var isContentDocument  = fileinfo.isContentDocument !== undefined && fileinfo.isContentDocument !== null && typeof Number(fileinfo.isContentDocument) === 'number' ?  Number(fileinfo.isContentDocument) : 0  ;
            var params = {
                name: "DocumentChange",
                id: "DocumentChange",
                toID: isDel ? "__all" : "__allExceptSender",
                data:  L.Utils.toJsonStringify( {
                    "isDel": isDel,
                    "isGeneralFile": isGeneralFile,
                    "isMedia": isMediaFile,
                    "isDynamicPPT": isDynamicPPT,
                    "isH5Document": isH5Document ,
                    "action": "",
                    "mediaType": isMediaFile ? filetype : "",
                    "filedata": {
                        "fileid":  Number( fileinfo.fileid ) ,
                        "currpage": 1,
                        "pagenum": Number(fileinfo.pagenum) ,
                        "filetype":filetype   ,
                        "filename": fileinfo.filename  ,
                        "isContentDocument": isContentDocument,
                        "swfpath": ( isDynamicPPT||isH5Document ) ? fileinfo.downloadpath : fileinfo.swfpath ,
                        "pptslide": 1,
                        "pptstep": 0,
                        "steptotal": 0,
                        "filecategory": fileinfo.filecategory !== undefined ? Number( fileinfo.filecategory ) : 0 , //0:课堂 ， 1：系统
                    }
                } ) ,
                save:false ,
            };
            that.pubMsg( params );
        }
    }

    function _webInterfaceDeleteFile(fileid , callback) {
        if(privateVariableJson._isLeaveRoom){
            L.Logger.info('[tk-sdk]The room is over. Method _webInterfaceDeleteFile cannot be executed!');
            return ;
        }
        var url = privateVariableJson._web_protocol + '://'  + privateVariableJson._web_host + ":" + privateVariableJson._web_port + WEBFUNC_DELROOMFILE+"?ts="+new Date().getTime();
        if(fileid === undefined || fileid === null){
            L.Logger.error('[tk-sdk]deleteFile fileid is required!');
            return ;
        }
        var deleteFileParams = {
            "serial":privateVariableJson._room_properties['serial'],   //会议id
            "fileid":fileid     //文件id
        };
        wx.request({
            url: url,
            method: "POST",
            dataType:"json",
            data : deleteFileParams,
            header: {
                'content-type': 'application/x-www-form-urlencoded;charset=utf-8'
            },
            success: function(res){
                L.Logger.debug('[tk-sdk]deleteFile resp = ',  L.Utils.toJsonStringify(response));
                var code = response.result ;
                var _findFile = function( fileid ){
                    for(var index = 0 ; index < privateVariableJson._room_filelist.length ; index++ ){
                        if( privateVariableJson._room_filelist[index].fileid == fileid ){
                            return{ file:privateVariableJson._room_filelist[index] , index:index } ;
                        }
                    }
                }
                var findFileinfo = _findFile(fileid);
                if( code === 0 && findFileinfo && findFileinfo.file && typeof findFileinfo.file === 'object' ){
                    var fileinfoCopy = L.Utils.toJsonParse( L.Utils.toJsonStringify( findFileinfo.file ) ) ;
                    _sendDocumentChangeSignalling( fileinfoCopy , true );
                }
                if(callback && typeof callback === "function"){
                    callback(code , response);
                }
            },
            fail: function(err){
                L.Logger.error("[tk-sdk]deleteFile fail[ jqXHR , textStatus , errorThrown ]:", jqXHR , textStatus , errorThrown );
                callback(ERR_HTTP_REQUEST_FAILED,undefined);
            }
        })
    };

    //去左右空格;
    function _trim(s){
        return s.replace(/(^\s*)|(\s*$)/g, "");
    }

    /*回放清除所有sdk相关数据*/
    function _playbackClearAll() {
        if(!privateVariableJson._isPlayback){L.Logger.error('[tk-sdk]No playback environment, no execution playbackClearAll!');return ;} ;
        if (privateVariableJson._users) {
            _clearUsers(privateVariableJson._users);
        }
        if(privateVariableJson._myself){
            privateVariableJson._myself.publishstate = TK.PUBLISH_STATE_NONE;
            privateVariableJson._users[privateVariableJson._myself.id] = privateVariableJson._myself;
        }
    };

    /*处理checkroom的结果*/
    function _handlerCheckroom(response , callback  , userid){
        if(privateVariableJson._isLeaveRoom){
            L.Logger.info('[tk-sdk]The room is over. Method _handlerCheckroom cannot be executed!');
            return ;
        }
        var userinfo = {};
        var nRet = response.result;
        var room;
        var pullInfo  ;
        if (nRet === 0) {
            if(privateVariableJson._isPlayback){
                response.nickname = 'playback' ;
                response.roomrole = -1 ;
                response.thirdid =  _generategGuid()+":playback" ;
            }
            room = response.room;
            pullInfo = response.pullinfo ;
            room.roomtype =  Number( room.roomtype ) ;
            room.maxvideo =  parseInt( room.maxvideo ) ;
            response.roomrole =  Number( response.roomrole ) ;
            var  pullConfigureJson = {};
            var pushConfigureJson = {} ;
            if(pullInfo && pullInfo.data && pullInfo.data.pullConfigureList){
                var pullConfigureList = pullInfo.data.pullConfigureList ;
                for(var i in pullConfigureList){
                    var pullConfigure = pullConfigureList[i] ;
                    pullConfigureJson[ pullConfigure.pullProtocol ] =  pullConfigure.pullUrlList ;
                }
            }
            if(pullInfo && pullInfo.data && pullInfo.data.pushConfigureInfo){
                var pushConfigureInfo = pullInfo.data.pushConfigureInfo ;
                for(var i in pushConfigureInfo){
                    var pushConfigure = pushConfigureInfo[i] ;
                    pushConfigureJson[ pushConfigure.pushProtocol ] =  pushConfigure.pushUrl ;
                }
            }
            room.pullConfigure = pullConfigureJson ;
            room.pushConfigure = pushConfigureJson ;

            privateVariableJson._room_properties = room;

            privateVariableJson._room_name = room.roomname;
            privateVariableJson._room_type = room.roomtype ;
            privateVariableJson._room_max_videocount = room.maxvideo;
            privateVariableJson._video_codec = room.vcodec !== undefined && room.vcodec !== null && typeof Number( room.vcodec ) === 'number' ?  Number( room.vcodec ) : privateVariableJson._video_codec ;

            userinfo.properties = {};
            userinfo.properties.role =response.roomrole  ;
            userinfo.properties.nickname = response.nickname;

            var id = response.thirdid;

            if(id !== undefined && id !== null && id != "0" && id != ''){
                userinfo.id = id;
            }else if(userid){
                userinfo.id = userid ;
            }else{
                userinfo.id = _generategGuid();
            }
            if(typeof userinfo.id !== 'string'){
                userinfo.id = ''+userinfo.id+'' ;
            }
            var existingId = undefined;
            if (!L.Utils.isNull(privateVariableJson._myself.id) && (L.Utils.isNull(userid) || userid === '')) {
                existingId = privateVariableJson._myself.id;
            }
            privateVariableJson._myself = TK.RoomUser(userinfo);
            if (!L.Utils.isNull(existingId)) {
                privateVariableJson._myself.id = existingId;
            }
            privateVariableJson._myself.hasvideo = false ;
            privateVariableJson._myself.hasaudio = false ;
            if(privateVariableJson._isPlayback){
                privateVariableJson._room_id = room.serial+"_"+privateVariableJson._myself.id;
                if( privateVariableJson._room_id && privateVariableJson._room_id.indexOf(':playback') === -1 ){
                    privateVariableJson._room_id +=":playback" ;
                }
            }else{
                privateVariableJson._room_id = room.serial;
            }
            privateVariableJson._roomCheckRoomInfoString =  !response ? "" : typeof response === 'string' ?  response : L.Utils.toJsonStringify(response) ;
            var chairmancontrol = privateVariableJson._room_properties.chairmancontrol ;
            privateVariableJson._mediaFileScale = !privateVariableJson._isPlayback && chairmancontrol && typeof chairmancontrol === 'string' ? Number( chairmancontrol.substr(95, 1) ) !== 1 : true ; //企业配置项，96位表示本地电影共享是否采用原画质，0：表示压缩画质 1：表示原画质
            L.Logger.info('[tk-sdk]'+(privateVariableJson._isPlayback?'initPlaybackInfo to checkroom finshed-->':'')+'privateVariableJson._room_max_videocount:'+privateVariableJson._room_max_videocount  , 'my id:'+privateVariableJson._myself.id , 'room id:'+privateVariableJson._room_id  , 'room properties chairmancontrol is:'+ (privateVariableJson._room_properties.chairmancontrol ? (window.__TkSdkBuild__ ? L.Utils.encrypt(privateVariableJson._room_properties.chairmancontrol):privateVariableJson._room_properties.chairmancontrol)  : undefined ) );
        }else{
            L.Logger.warning('[tk-sdk]checkroom failure code is '+ nRet);
        }
        L.Logger.info('[tk-sdk]checkroom finshed!');
        callback(nRet, userinfo, response);
    };


    /*生成guid*/
    function _generategGuid() {
        function _s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return _s4() + _s4() + '-' + _s4() + '-' + _s4() + '-' +
            _s4() + '-' + _s4() + _s4() + _s4();
    };

    // It connects to the server through socket.io
    function _connectSocket(callback, error) {
        if(privateVariableJson._isLeaveRoom){
            L.Logger.info('[tk-sdk]The room is over. Method _connectSocket cannot be executed!');
            return ;
        }
        if(!window.TK.socketIO){
            L.Logger.error('[tk-sdk]socket.io is not exist,please link socket.io,for example: window.tk.SocketIO = io (io is the socket.io that you want to associate with)!');
            return ;
        }
        that.state = CONNECTING;
        that.socket = window.TK.socketIO.connect(privateVariableJson._room_uri, {secure: true, reconnection:true , transports: ['websocket']});
        var connectErrorNum = 0 ;
        var isConnectSocket = false ;

        that.socket.on('connect_error' , function (e) {
            L.Logger.error('[tk-sdk]connect_error info:' , e ) ;
            connectErrorNum++;
            if(!isConnectSocket && privateVariableJson._backupCourseAddrList.length && connectErrorNum >= 5){
                var addrInfo = privateVariableJson._backupCourseAddrList[0];
                privateVariableJson._backupCourseAddrList.splice(0,1);
                L.Logger.warning('[tk-sdk]Not Connected,change address reconnection, address info:'+L.Utils.toJsonStringify(addrInfo)+' ,error info: ' + e);
                _changeAddressInner(addrInfo.name, addrInfo.signaladdr,addrInfo.signalport ,  addrInfo.webaddr, addrInfo.docaddr, addrInfo.change,undefined,function () {
                    // Close socket
                    try {
                        if(that.socket && that.socket.disconnect){
                            that.socket.disconnect();
                        }
                    } catch (error) {
                        L.Logger.warning('[tk-sdk]Socket already disconnected , disconnect errorInfo:' , error);
                    }
                    that.socket = undefined;
                    that.needReconnectSocket = true ;
                    _connectSocket(_handlerCallbackJson._handler_connectSocketSuccess, _handlerCallbackJson._handler_connectSocketFail);
                });
            }
        });

        that.socket.on('connect', function () {
            if(privateVariableJson._isLeaveRoom){
                L.Logger.info('[tk-sdk]The room is over. socket connect!');
                if(that.socket){
                    that.leaveroom();
                }
                return ;
            }
            L.Logger.info('[tk-sdk]tk connectd');
            isConnectSocket = true ;
            connectErrorNum = 0 ;
            that.state = CONNECTED;
            _setStatus(STATUS_CONNECTED);
            if( privateVariableJson._connectedNumber === 0 || that.needReconnectSocket){
                // The socket has disconnected
                that.socket.on('disconnect', function (e) {
                    if(!that.needReconnectSocket){
                        L.Logger.debug('[tk-sdk]Socket disconnected, lost connection to TKController' ,  e );
                        if (that.state !== DISCONNECTED) {
                            _setStatus(STATUS_DISCONNECTED);
                            that.state = DISCONNECTED;
                            var disconnectEvt = TK.RoomEvent({type: 'room-disconnected',
                                message: 'unexpected-disconnection'});
                            that.dispatchEvent(disconnectEvt);
                        };
                    }
                });

                that.socket.on('reconnecting' , function (reconnectingNum) {
                    L.Logger.debug('[tk-sdk]reconnecting info:' , reconnectingNum) ;
                    var disconnectEvt = TK.RoomEvent({type: 'room-reconnecting',
                        message: {number:reconnectingNum , info:'room-reconnecting number:'+ reconnectingNum }});
                    that.dispatchEvent(disconnectEvt);
                });

                that.socket.on('participantLeft', _handlerCallbackJson._handler_participantLeft );
                that.socket.on('participantJoined', _handlerCallbackJson._handler_participantJoined );
                that.socket.on('participantPublished', _handlerCallbackJson._handler_participantPublished );
                that.socket.on('participantEvicted',function(messages){
                    messages = messages || {} ;
                    L.Logger.info('[tk-sdk]user evicted room  , user info: '+L.Utils.toJsonStringify(privateVariableJson._myself) + ' , participantEvicted  messages:'+ L.Utils.toJsonStringify(messages) );
                    that.leaveroom(true);
                    var roomEvt = TK.RoomEvent({type: 'room-participant_evicted' , message:messages , user:privateVariableJson._myself});
                    that.dispatchEvent(roomEvt);
                });
                that.socket.on('sendMessage', _handlerCallbackJson._handler_sendMessage );
                that.socket.on("msgList",function(messages) {
                    L.Logger.debug('[tk-sdk]msgList info:' , L.Utils.toJsonStringify(messages) );
                    var roomEvt = TK.RoomEvent({type: 'room-msglist', message:messages});
                    that.dispatchEvent(roomEvt);
                });
                that.socket.on("pubMsg", _handlerCallbackJson._handler_pubMsg );
                that.socket.on("delMsg", _handlerCallbackJson._handler_delMsg );
                that.socket.on("setProperty", _handlerCallbackJson._handler_setProperty );
                //qiugs:回放清除所有信令
                that.socket.on("playback_clearAll" ,  _handlerCallbackJson._handler_playback_clearAll );
                //qiugs:回放获取开始和结束时间
                that.socket.on("duration" , _handlerCallbackJson._handler_duration);
                //qiugs:服务器播放完毕，收到结束的信令
                that.socket.on("playbackEnd" , _handlerCallbackJson._handler_playbackEnd );
                //qiugs:服务器回放的播放时间更新
                that.socket.on("playback_updatetime" ,_handlerCallbackJson._handler_playback_updatetime );
                //qiugs:服务器强制重连
                that.socket.on("forceReconnect" ,function () {
                    L.Logger.info('[tk-sdk]service notice forceReconnect , call reconnected room! ');
                    var options = {source:'forceReconnect room'};
                    _reGetconfigToJoinRoom( options , callback,error );
                });

                privateVariableJson._connectedNumber++;
                L.Logger.info('[tk-sdk]connected room  , current connected number is '+privateVariableJson._connectedNumber+'! ');
                if(!that.needReconnectSocket){
                    L.Logger.info('[tk-sdk]Reconnect Socket ,  join room start! ');
                }
                that.needReconnectSocket = false ;
                _step4Join(callback,error);
            }else{
                L.Logger.info('[tk-sdk]reconnected room! ');
                var roomEvt = TK.RoomEvent({type: 'room-reconnected'});
                that.dispatchEvent(roomEvt);
                var options = {source:'reconnected room'};
                _reGetconfigToJoinRoom( options , callback,error );
            }
        });
    };

    // Function to send a message to the server using socket.io
    function _sendMessageSocket(type, msg, callback, error) {
        L.Logger.info('[tk-sdk]sendMessageSocket', type, msg);
        that.socket.emit(type, msg, function (respType, respmsg) {
            if (respType === 'success') {
                L.Logger.info('[tk-sdk]sendMessageSocket success', msg, respmsg);

                if (L.Utils.isFunction(callback)) callback(respmsg);
            } else if (respType === 'error'){
                if (L.Utils.isFunction(error)) error(respmsg);
            } else {
                if (L.Utils.isFunction(callback)) callback(respType, respmsg);
            }

        });
    };

    /*处理纯音频教室的切换
     * @params isOnlyAudioRoom:是否是纯音频*/
    function _handleSwitchOnlyAudioRoom(isOnlyAudioRoom , fromID) {
        if (TK.isOnlyAudioRoom === isOnlyAudioRoom) {
            return;
        }
        TK.isOnlyAudioRoom = isOnlyAudioRoom ;
        var connectEvt = TK.RoomEvent({type: 'room-audiovideostate-switched',  message:{fromId:fromID ,  onlyAudio:TK.isOnlyAudioRoom }});
        that.dispatchEvent(connectEvt);
    };

    /*收到DocumentChange将文件添加到文件列表或者从文件列表删除*/
    function _handleSignalling_DocumentChange( signallingData ){
        if( typeof signallingData  === 'string' ){
            signallingData = L.Utils.toJsonParse( signallingData );
        }
        if( signallingData && signallingData.data && typeof signallingData.data === 'string' ){
            signallingData.data =  L.Utils.toJsonParse( signallingData.data );
        }
        var fromID = signallingData.fromID ;
        var data = signallingData.data ;
        var _findFile = function( fileid ){
            for(var index = 0 ; index < privateVariableJson._room_filelist.length ; index++ ){
                if( privateVariableJson._room_filelist[index].fileid == fileid ){
                    return{ file:privateVariableJson._room_filelist[index] , index:index } ;
                }
            }
        }
        var findFileinfo =  _findFile( data.filedata.fileid ) ;
        if(data.isDel){ //删除文件
            if( findFileinfo && findFileinfo.file ){
                privateVariableJson._room_filelist.splice( findFileinfo.index , 1 );
                var Evt = TK.RoomEvent({type: 'room-delete-file', message:{ fileid:findFileinfo.file.fileid , fileinfo:findFileinfo.file , fromID:fromID } });
                that.dispatchEvent(Evt);
            }
        }else{ //添加文件
            var _addFileInfo =function (user) {
                var filedata = data.filedata ;
                var addFiledata = {
                    "fileid":Number( filedata.fileid ),
                    "companyid": privateVariableJson._room_properties.companyid ,
                    "filename": filedata.filename ,
                    "uploaduserid": fromID ,
                    "uploadusername": user ? user.nickname : '' ,
                    "downloadpath": filedata.swfpath,
                    "isContentDocument": filedata.isContentDocument !== undefined && filedata.isContentDocument !== null && typeof Number(filedata.isContentDocument) === 'number' ?  Number(filedata.isContentDocument) : 0,
                    "swfpath": filedata.swfpath,
                    "filetype":filedata.filetype && typeof filedata.filetype === 'string' ? filedata.filetype.toLocaleLowerCase() : filedata.filetype ,
                    "pagenum":Number( filedata.pagenum ),
                    "dynamicppt": data.isDynamicPPT ? 1 : 0 ,
                    "filecategory": Number( filedata.filecategory ) , //0:课堂 ， 1：系统
                    "fileprop": data.isDynamicPPT ? 2 : ( data.isH5Document ? 3 :  0 ) , //0：普通文档 ， 1-2：动态ppt(1-旧版，2-新版) ， 3：h5文档
                    "type": 0 , //0：非默认文档   1：默认文档
                };
                if( !findFileinfo ){ //没有文件则添加文件
                    privateVariableJson._room_filelist.push( addFiledata ) ;
                    var Evt = TK.RoomEvent({type: 'room-add-file', message: {fileid:addFiledata.fileid  , fromID:fromID } });
                    that.dispatchEvent(Evt);
                }else{ //有文件则更新文件
                    var updateFileinfo = {} ;
                    var isUpdateFileinfo = false ;
                    for( var key in  addFiledata ){
                        if( findFileinfo.file[key] !== addFiledata[key] ){
                            findFileinfo.file[key] = addFiledata[key] ;
                            updateFileinfo[key] =  addFiledata[key] ;
                            isUpdateFileinfo = true ;
                        }
                    }
                    if( isUpdateFileinfo ){
                        var Evt = TK.RoomEvent({type: 'room-update-file', message: {fileid:addFiledata.fileid , updateFileinfo:updateFileinfo , fromID:fromID } });
                        that.dispatchEvent(Evt);
                    }
                }
            };
            that.getRoomUser(fromID , function (user) {
                _addFileInfo(user);
            },function () {
                _addFileInfo();
            });
        }
    };


    /*发送设备信息给PHP*/
    function _sendDeviceInfoToPhp() {
        if(privateVariableJson._isLeaveRoom){
            L.Logger.info('[tk-sdk]The room is over. Method _sendDeviceInfoToPhp cannot be executed!');
            return ;
        }
        var url = privateVariableJson._web_protocol + '://' + privateVariableJson._web_host + ":" + privateVariableJson._web_port + WEBFUNC_EQUIPMENT+"?ts="+new Date().getTime();
        var devicetype = 'PC';
        var browserInfo = wx.getSystemInfoSync();
        var params = {
            companyid:privateVariableJson._room_properties.companyid , //企业id
            serial:privateVariableJson._room_properties.serial , //会议id
            peerId:privateVariableJson._myself.id ,  //用户id
            peerName:privateVariableJson._myself.nickname ,  //用户名称
            peerRole:privateVariableJson._myself.role, //用户角色
            devicetype:devicetype , //设备类型,有MacClient/WindowClient/MacPC/WindowPC
            systemversion: browserInfo.system , //系统版本
            // version:TK.APPVERSION , //APP的版本号
            version: browserInfo.version,   //微信版本号
            sdkVersion:TK.SDKVERSIONS , //SDK版本号
            appType:'webpageApp' , //app类型 ， webpageApp/mobileApp
            deviceName: browserInfo.model, //设备名
            OSVersion: browserInfo.system, //设备系统版本（如Win10/Win7/Mac）
            CpuArchitecture:'x86', //cpu架构（arm64 x86 ...）
            ip:privateVariableJson._myIp, //本机ip
            /*country:'', //国家
            region:'', //地区（省）
            city:'', //城市
            isp:'', //网络运营商*/
        };

        _sendEquipmentInner();
        function _sendEquipmentInner() {
            wx.request({
                url: url,
                method: "POST",
                data: params,
                header: {
                    'content-type': 'application/json' // 默认值
                },
                success: function(res) {
                    L.Logger.debug('[tk-sdk]equipment resp : '+ res);
                },
                fail: function(err){
                    L.Logger.error('[tk-sdk]equipment fail[readyState-status]:' , err ) ;
                }
            })
        }
    };

    function _joinroom(getConfigWebHostname) {
        if (that.state !== DISCONNECTED) {
            L.Logger.warning('[tk-sdk]Room already connected', that.state);
        }
        if( privateVariableJson._web_host === undefined || privateVariableJson._web_port === undefined || privateVariableJson._myself === undefined) {
            L.Logger.warning('[tk-sdk]web_host or web_port or myself is undefined , web_host is '+privateVariableJson._web_host + ' , web_port is '+privateVariableJson._web_port + ',myself is '+privateVariableJson._myself);
            return -1;
        }
        if(!privateVariableJson._room_properties){
            L.Logger.warning('[tk-sdk]No checkroom cannot joinroom , room_properties is '+privateVariableJson._room_properties );
            return -1;
        }
        that.needReconnectSocket = true ;
        if(  privateVariableJson._myself.publishstate  !== TK.PUBLISH_STATE_NONE ){
            privateVariableJson._myself.publishstate = TK.PUBLISH_STATE_NONE ;
        }

        if(privateVariableJson._userJsonOptions && privateVariableJson._userJsonOptions.userProperties && (typeof privateVariableJson._userJsonOptions.userProperties === 'object')){
            for(var key in privateVariableJson._userJsonOptions.userProperties){
                if(privateVariableJson._myself[key] === undefined){
                    privateVariableJson._myself[key] = privateVariableJson._userJsonOptions.userProperties[key] ;
                }
            }
        }
        if(privateVariableJson._roomJsonOptions && privateVariableJson._roomJsonOptions.group){
            if(  Array.isArray(privateVariableJson._roomJsonOptions.group)  ){
                privateVariableJson._myself.group = privateVariableJson._roomJsonOptions.group ;
            }else{
                L.Logger.warning('[tk-sdk]joinroomOptions.group must is a array!');
            }
        }
        L.Logger.info('[tk-sdk]joinroom:my device info  [hasvideo , hasaudio] is ['+privateVariableJson._myself.hasvideo+ ' ,' +privateVariableJson._myself.hasaudio+']') ;
        L.Logger.debug('[tk-sdk]joinroom:my room user', privateVariableJson._myself );
        privateVariableJson._users = {};
        getConfigWebHostname = getConfigWebHostname || privateVariableJson._web_host;
        _step2GetConfig(getConfigWebHostname, privateVariableJson._web_port, function(result,responseText) {
            if(result != 0){
                L.Logger.error('[tk-sdk]step2GetConfig failure --> result and responseText:' , result ,  responseText);
                var Evt = TK.RoomEvent({type:'room-error',message:{source:L.Constant.roomError.GETCONFIGERROR , error:result }});
                that.dispatchEvent(Evt);
                //TODO room-connect-fail的source和error需要完善
                var Evt = TK.RoomEvent({type:'room-connect-fail',message:{source:L.Constant.roomError.GETCONFIGERROR , error:result }});
                that.dispatchEvent(Evt);
            }else {
                _step2GetFileList(privateVariableJson._web_host, privateVariableJson._web_port, function(result,message) {
                    L.Logger.debug('[tk-sdk]step2GetFileList result = '  + result + ' , message:'+ L.Utils.toJsonStringify(message) );
                    if(result === 0 ){
                        privateVariableJson._room_filelist = [];
                        if( message && Array.isArray( message ) && message.length ){
                            for( var index = 0  , length =  message.length  ; index < length ; index++ ){
                                var file = message[index];
                                if( file ){
                                    privateVariableJson._room_filelist.push({
                                        "fileid":Number( file.fileid ),
                                        "companyid": file.companyid ,
                                        "filename": file.filename ,
                                        "uploaduserid": file.uploaduserid ,
                                        "uploadusername": file.uploadusername ,
                                        "downloadpath": file.downloadpath ,
                                        "swfpath": file.swfpath ,
                                        "isContentDocument": file.isContentDocument !== undefined && file.isContentDocument !== null && typeof Number(file.isContentDocument) === 'number' ?  Number(file.isContentDocument) : 0 ,
                                        "filetype":file.filetype && typeof file.filetype === 'string' ? file.filetype.toLocaleLowerCase() : file.filetype ,
                                        "pagenum":Number( file.pagenum ),
                                        "dynamicppt": Number( file.dynamicppt ) ,
                                        "filecategory": Number( file.filecategory ) , //0:课堂 ， 1：系统
                                        "fileprop":  Number( file.fileprop )  , //0：普通文档 ， 1-2：动态ppt(1-旧版，2-新版) ， 3：h5文档
                                        "type": Number( file.type ) , //0：非默认文档   1：默认文档
                                    });
                                }
                            }
                        }
                        var Evt = TK.RoomEvent({type: 'room-files', message: privateVariableJson._room_filelist});
                        that.dispatchEvent(Evt);
                    }else {
                        L.Logger.info('[tk-sdk]step2GetFileList code is '+result);
                    }
                    if( L.Utils.isFunction(privateVariableJson._roomJsonOptions.awitConnectRoomCallback) ){
                        var actionCallback = function () {
                            _step3Connect();
                        }
                        privateVariableJson._roomJsonOptions.awitConnectRoomCallback(actionCallback);
                        delete privateVariableJson._roomJsonOptions.awitConnectRoomCallback;
                    }else{
                        _step3Connect();
                    }
                });
            }
        },{
            notSpeedNetwordk:!privateVariableJson._roomJsonOptions.autoServer
        });
    };

    function joinroominner(getConfigWebHostname) {
        _joinroom(getConfigWebHostname);
    };

    function _removeBigRoomUsers() {
        if(privateVariableJson._roomMode === window.TK.ROOM_MODE.BIG_ROOM ){
            for(var userid in privateVariableJson._users){
                if(userid !== privateVariableJson._myself.id && privateVariableJson._users[userid].role !== window.TK.ROOM_ROLE.TEACHER && privateVariableJson._users[userid].role !== window.TK.ROOM_ROLE.ASSISTANT){ //角色不是老师和助教且下台用户且不是自己，则从列表中删除
                    if(privateVariableJson._users[userid].publishstate === TK.PUBLISH_STATE_NONE){
                        delete privateVariableJson._users[userid] ;
                    }
                }
            }
        }
    }

    /*检测房间
     * @params host:域名或者ip , String
     * @params port:端口 , Int
     * @params params:携带的参数json ， php的checkroom接口所需要的参数 , Json / 参数串String
     * @params callback(nRet, userinfo, response):回调函数 , 返回的参数【nRet状态码(成功为0，不成功有相应的具体状态码-具体状态码请看php文档对应的-checkroom接口) ， userinfo - 用户的信息  ， response - checkroom接口返回的结果 】  , Function
     * @params userid:指定用户id , String
     * @params options:配置项 , Json
     * */
    function _checkroom(host, port, params, callback , userid , options) {
        if(privateVariableJson._isLeaveRoom){
            L.Logger.info('[tk-sdk]The room is over. Method _checkroom cannot be executed!');
            return ;
        }
        _setStatus(STATUS_CHECKING);
        if(  !L.Utils.getJsonLength(privateVariableJson._serverList) && !privateVariableJson._isPlayback  ){ //没有服务器列表且不是回放，则去请求服务器列表
            var requestServerListOptions = { checkroom:true };
            that.requestServerList( privateVariableJson._web_host, privateVariableJson._web_port  , undefined , requestServerListOptions);
        }
        var url = privateVariableJson._web_protocol + '://' + privateVariableJson._web_host + ":" + privateVariableJson._web_port + WEBFUNC_CHECKroom+"?ts="+new Date().getTime();

        var first = true;
        var object = "";
        if (typeof params === 'string') {
            object = params ;
            if(privateVariableJson._isPlayback){
                object += '&playback=true';
            }
            object += '&clientType='+1 ;  //1:PC 2:Android ,3:IOS , 4:PC客户端 //TODO 这里需要和PHP协商一个微信的客户端类型
        }else{
            if(privateVariableJson._isPlayback){
                params.playback = true ;
            }
        params.clientType = 1 ;   //TODO 这里需要和PHP协商一个微信的客户端类型
            for (var key in params) {
                if (first)
                    first = false;
                else
                    object = object + "&";

                object = object + key + "=" + params[key];
            }
        }

        L.Logger.info('[tk-sdk]Going to checkroom', object);
        L.Logger.info('[tk-sdk]call checkroom start!');
        var xmlhttp ;
        xmlhttp = wx.request({
            method:"POST",
            url,
            data: object,
            header: {
                'content-type': 'application/x-www-form-urlencoded;charset=utf-8'
            },
            success: function(res){
                L.Logger.info('[tk-sdk]checkroom resp : ', res);
                var response = L.Utils.toJsonParse(res.data);//xmlhttp.responseText;
                _handlerCheckroom(response , callback , userid);
            },
            fail: function(err){
                L.Logger.error('[tk-sdk]checkroom fail[readyState-status]:' , err ) ;
                    if(privateVariableJson._isLeaveRoom){
                        L.Logger.info('[tk-sdk]The room is over. Method checkroom cannot be executed!');
                        return ;
                    }
                    if( !privateVariableJson._webReconnectNumList.hasOwnProperty('checkroomReconnectNum') ){
                        privateVariableJson._webReconnectNumList.checkroomReconnectNum = 0 ;
                    }
                    privateVariableJson._webReconnectNumList.checkroomReconnectNum = (++privateVariableJson._webReconnectNumList.checkroomReconnectNum) % 5 ;
                    clearTimeout(privateVariableJson._webReconnectNumList.checkroomReconnectTimer);
                    privateVariableJson._webReconnectNumList.checkroomReconnectTimer = setTimeout(function () {
                        if(privateVariableJson._isLeaveRoom){
                            L.Logger.info('[tk-sdk]The room is over. Method checkroom cannot be executed!');
                            return ;
                        }
                        L.Logger.info('[tk-sdk]Rerequest checkroom web interface!');
                        _checkroom(host, port, params, callback , userid , options);
                    },privateVariableJson._webReconnectNumList.checkroomReconnectNum * 1000);
                    // callback(ERR_HTTP_REQUEST_FAILED,xmlhttp.responseText);
            }
        })
    } ;

   /* 初始化回放的相关信息
     * @params host:域名或者ip , String
     * @params port:端口 , Int
     * @params params:携带的参数json , Json
     params = {
     recordfilepath: 回放录制件地址 , 必须的
     roomtype:房间类型 ,
     serial:房间号 ,
     domain:公司的企业域名标识 ,
     host:php请求域名
     }
     * @params callback(nRet, userinfo, response):回调函数  , 返回的参数【nRet状态码(成功为0) ， userinfo - 用户的信息  ， response - 录制件对应那节课的checkroom接口返回的结果】, Function
     * @params oldInitPlaybackInterface:是否走旧的回放流程 , Boolean
     * */
    function _initPlaybackInfo(host, port, params, callback , oldInitPlaybackInterface, onFailure) {
        if(privateVariableJson._isLeaveRoom){
            L.Logger.info('[tk-sdk]The room is over. Method _initPlaybackInfo cannot be executed!');
            return ;
        }
        var _oldInitPlaybackInterfaceHandler = function () {
            // 旧的回放初始化回放信息
            var userid = undefined ;
            if(params.roomtype === undefined || params.serial === undefined || params.recordfilepath === undefined ){
                L.Logger.error('[tk-sdk]The params must be included [roomtype , serial , recordfilepath] ! ');
                if(L.Utils.isFunction(onFailure)) {
                    onFailure('TK_ERR_INVALID_ARG');
                }
                return ;
            }
            _setStatus(STATUS_CHECKING);
            _updateWebAddressInfo({
                web_host:host ,
                web_port:port
            });
            var response = {
                room:{
                    roomtype:params.roomtype ,
                    maxvideo:params.maxvideo !== undefined ? params.maxvideo : 10000 , //回放不管发布个数
                    roomrole:-1 ,
                    serial:params.serial ,
                    roomname:params.roomname || 'Play Back',
                    recordfilepath:params.recordfilepath ,
                    domain:params.domain ,
                    host:params.host || host,
                    companyid:params.companyid || -1 ,
                } ,
                nickname:"playback" ,
                roomrole: -1 ,
                thirdid: userid ? userid+":playback"  : _generategGuid()+":playback"
            };
            var userinfo = {};
            var room;
            room = response.room;
            room.roomtype =  Number( room.roomtype ) ;
            room.maxvideo =  parseInt( room.maxvideo ) ;
            room.roomrole =  Number( room.roomrole ) ;
            privateVariableJson._room_properties = room;
            privateVariableJson._room_id = room.serial;
            privateVariableJson._room_name = room.roomname;
            privateVariableJson._room_type = room.roomtype ;
            privateVariableJson._room_max_videocount = room.maxvideo;
            privateVariableJson._recordfilepath = room.recordfilepath  ;

            userinfo.properties = {};
            userinfo.properties.role =response.roomrole  ;
            userinfo.properties.nickname = response.nickname;
            userinfo.properties.hasvideo = false;
            userinfo.properties.hasaudio = false;
            userinfo.id = response.thirdid;
            privateVariableJson._isPlayback = true ;
            TK.isPlayback = privateVariableJson._isPlayback ;
            privateVariableJson._myself = TK.RoomUser(userinfo);
            if(privateVariableJson._isPlayback){
                privateVariableJson._room_id = privateVariableJson._room_id+"_"+privateVariableJson._myself.id;
                if( privateVariableJson._room_id && privateVariableJson._room_id.indexOf(':playback') === -1 ){
                    privateVariableJson._room_id +=":playback" ;
                }
            }
            privateVariableJson._isGetFileList = false ;//不获取文件列表
            privateVariableJson._roomCheckRoomInfoString =  !response ? "" : typeof response === 'string' ?  response : L.Utils.toJsonStringify(response) ;
            L.Logger.info('[tk-sdk]initPlaybackInfo-->privateVariableJson._room_max_videocount:'+privateVariableJson._room_max_videocount  + ' , my id:'+privateVariableJson._myself.id + ' , room id:'+privateVariableJson._room_id , 'room properties chairmancontrol is:'+ (privateVariableJson._room_properties.chairmancontrol ? ( window.__TkSdkBuild__?L.Utils.encrypt(privateVariableJson._room_properties.chairmancontrol):privateVariableJson._room_properties.chairmancontrol )  : undefined ));
            if(callback && typeof callback === 'function'){
                callback(0 , userinfo, response);
            }
        };
        if(!oldInitPlaybackInterface){
            if(!params.recordfilepath ){
                L.Logger.error('[tk-sdk]params.recordfilepath is required !');
                if(L.Utils.isFunction(onFailure)) {
                    onFailure('TK_ERR_INVALID_ARG');
                }
                return ;
            }
            _setStatus(STATUS_CHECKING);
            _updateWebAddressInfo({
                web_host:host ,
                web_port:port ,
            } );
            privateVariableJson._isPlayback = true ;
            TK.isPlayback = privateVariableJson._isPlayback ;
            privateVariableJson._recordfilepath = params.recordfilepath  ;
            privateVariableJson._isGetFileList = false ;//不获取文件列表
            params.playback = true ;
            L.Logger.info('[tk-sdk]initPlaybackInfo to checkroom start , params is '+( window.__TkSdkBuild__ ? L.Utils.encrypt( L.Utils.toJsonStringify(params) ): L.Utils.toJsonStringify(params) )+'!');
            var url = params.recordfilepath + "room.json";
            if( /room.json/g.test(params.recordfilepath) ){
                url = params.recordfilepath ;
            }
            if( /https:/g.test(window.location.protocol) && !( /https:/g.test(url) ) ){
                url = url.replace(/http:/g , 'https:').replace(/:\d+/g , '') ;
            }
            $.ajax({
                url:url,
                dataType: "json",
                type: 'GET',
                async: true,
            }).done(function (response) {
                L.Logger.debug('[tk-sdk]getPlaybackRoomJson resp = ', L.Utils.toJsonStringify(response));
                if(response && typeof response === 'object'){
                    _handlerCheckroom(response , function (ret , userinfo, roominfo ) {
                        if(ret === 0){
                            if(callback && typeof callback === 'function'){
                                callback(ret , userinfo, roominfo);
                            }
                        }else{
                            _oldInitPlaybackInterfaceHandler();
                        }
                    });
                }else{
                    L.Logger.error('[tk-sdk]getPlaybackRoomJson resp must is json , call oldInitPlaybackInterface handler!');
                    _oldInitPlaybackInterfaceHandler();
                }
            }).fail(function (jqXHR, textStatus, errorThrown) {
                L.Logger.error("[tk-sdk]getPlaybackRoomJson fail[ jqXHR , textStatus , errorThrown ]:", jqXHR, textStatus, errorThrown);
                _oldInitPlaybackInterfaceHandler();
            });
        }else{
            _oldInitPlaybackInterfaceHandler();
        }
    } ;

    /*测试网速*/
    function _speedNetwordk(host, port, callback) {
        var startTime = new Date().getTime();
        var url = privateVariableJson._web_protocol + '://'+ host + ":" + port+ '/speed.php?ts='+startTime;
        var randomWord1024 = _randomWord(512);
        var xhr = wx.request({
            url: url,
            type: "GET",
            async: true,
            data:{
                data:randomWord1024
            },
            success: function(response_json) {
                L.Logger.info('[tk-sdk]speedNetwordk finshed,url is '+url+' ,elapsed time is '+( new Date().getTime() - startTime )+' ms' ) ;
                if(L.Utils.isFunction(callback)){
                    callback(0);
                }
            },
            fail: function(err) {
                L.Logger.error('[tk-sdk]speedNetwordk fail,url is '+url+' ,elapsed time is '+( new Date().getTime() - startTime )+' ms, error info:' ,err ) ;
                if(L.Utils.isFunction(callback)){
                    callback(-1);
                }
            }
        })
        return xhr ;
    }

    /*随机字母和数字*/
    function _randomWord(len) {
        len = len || 1024;
        var $chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678'; // 默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1
        var maxPos = $chars.length;
        var pwd = '';
        var num = '';
        for (var i = 0; i < len; i++) {
            pwd += $chars.charAt(Math.floor(Math.random() * maxPos));
            num+=Math.floor(Math.random()*10);
        }
        pwd.toLowerCase();
        return pwd;
    }
    /*=============================私有函数 end===============================*/

    /*=============================socket事件处理start=============================*/
    _handlerCallbackJson._handler_participantLeft = function (userid , leaveTs ) {
        L.Logger.debug('[tk-sdk]participantLeft userid:' + userid);
        var user = privateVariableJson._users[userid];
        if (user === undefined){
            L.Logger.error( '[tk-sdk]participantLeft user is not exist , userid is '+userid+'!'  );
            return;
        }
        L.Logger.info('[tk-sdk]user leave room  , user info: '+L.Utils.toJsonStringify(user) );
        if( privateVariableJson._isPlayback && leaveTs !== undefined){
            user.leaveTs = leaveTs ;
        }

        if(!privateVariableJson._isPlayback){
            delete privateVariableJson._users[userid];
        }else{
            if(privateVariableJson._users[userid]){
                privateVariableJson._users[userid].playbackLeaved = true ;
            }
        }
        delete privateVariableJson._userId_to_elementId_map[userid];
        if( privateVariableJson._isPlayback && typeof userid === 'object' ){
            var userinfo = userid ;
            user.leaveTs = userinfo.ts ;
        }
        
        var roomEvt = TK.RoomEvent({type: 'room-participant_leave', user: user});
        that.dispatchEvent(roomEvt);
    };
    _handlerCallbackJson._handler_participantJoined =function (userinfo) {
        L.Logger.debug('[tk-sdk]participantJoined userinfo:'+ L.Utils.toJsonStringify(userinfo) );
        var user = TK.RoomUser(userinfo);
        L.Logger.info('[tk-sdk]user join room  , user info: '+L.Utils.toJsonStringify(user) );
        privateVariableJson._users[user.id]=user;
        if(privateVariableJson._isPlayback && privateVariableJson._users[user.id]){
            delete privateVariableJson._users[user.id].playbackLeaved ;
        }
        if( privateVariableJson._isPlayback && typeof userinfo === 'object'  ){
            user.joinTs = userinfo.ts ;
        }
        var roomEvt = TK.RoomEvent({type: 'room-participant_join', user: user});
        that.dispatchEvent(roomEvt);
    };
    _handlerCallbackJson._handler_participantPublished =function (userinfo) {
        L.Logger.debug('[tk-sdk]participantPublished userinfo:'+ L.Utils.toJsonStringify(userinfo) );
        if( privateVariableJson._roomMode === window.TK.ROOM_MODE.BIG_ROOM ){
            var userCopy = TK.RoomUser(userinfo);
            var user =  privateVariableJson._users[userCopy.id] ;
            if( user ){
                for(var key in userCopy ){
                    user[key] = userCopy [key] ;
                }
            }else{
                user = userCopy ;
            }
            privateVariableJson._users[user.id]=user;
            if(privateVariableJson._isPlayback && privateVariableJson._users[user.id]){
                delete privateVariableJson._users[user.id].playbackLeaved ;
            }
            if( privateVariableJson._isPlayback && typeof userinfo === 'object'  ){
                user.joinTs = userinfo.ts ;
            }
        }
    };
    _handlerCallbackJson._handler_sendMessage = function (messages) {
        L.Logger.info('[tk-sdk]room-text-message info:' + (messages && typeof messages === 'object' ? L.Utils.toJsonStringify(messages) : messages )) ;
        if (!( messages && messages.hasOwnProperty('message') ) ){  L.Logger.error('[tk-sdk]room-text-message messages or messages.message is not exist!'); return;};
        var user = privateVariableJson._users[messages.fromID];
        if(!user){
            user = {
                id:messages.fromID,
                nickname:user ? user.nickname : messages.nickname,
                role:user ? user.role : messages.role,
            }
        }
        if(messages && messages.message && typeof  messages.message  === 'string' ){
            messages.message = L.Utils.toJsonParse(messages.message);
        }
        if( privateVariableJson._isPlayback && messages.ts !== undefined && typeof messages.message === 'object' ){
            messages.message.ts = messages.ts ; //ms
        }
        var roomEvt = TK.RoomEvent({type: 'room-text-message', user:user, message:messages.message} , {
            userid:messages.fromID,
            nickname:user ? user.nickname : messages.nickname,
            role:user ? user.role : messages.role,
        });
        that.dispatchEvent(roomEvt);
    } ;
    _handlerCallbackJson._handler_pubMsg = function (messages) {
        L.Logger.debug( '[tk-sdk]pubMsg info:' ,  L.Utils.toJsonStringify(messages) );
        if(messages && typeof messages === 'string'){
            messages = L.Utils.toJsonParse(messages);
        }
        if(messages.data && typeof messages.data === 'string'){
            messages.data = L.Utils.toJsonParse(messages.data);
        }
        if (messages.name === 'OnlyAudioRoom') {
            _handleSwitchOnlyAudioRoom(true , messages.fromID);
            return;
        }
        if(messages.name === 'DocumentChange'){
            _handleSignalling_DocumentChange( messages );
        }
        if(messages.name === 'BigRoom'){
            privateVariableJson._roomMode = window.TK.ROOM_MODE.BIG_ROOM ;
            _removeBigRoomUsers();
            L.Logger.info('[tk-sdk]room mode changed,current mode is '+privateVariableJson._roomMode);
            var roomEvt = TK.RoomEvent({type: 'room-mode-changed', message:{
                roomMode:privateVariableJson._roomMode
            }});
            that.dispatchEvent(roomEvt);
        }
        var roomEvt = TK.RoomEvent({type: 'room-pubmsg', message:messages});
        that.dispatchEvent(roomEvt);
    };
    _handlerCallbackJson._handler_delMsg = function (messages) {
        L.Logger.debug( '[tk-sdk]delMsg info:' ,  L.Utils.toJsonStringify(messages) );
        if(messages && typeof messages === 'string'){
            messages = L.Utils.toJsonParse(messages);
        }
        if(messages.data && typeof messages.data === 'string'){
            messages.data = L.Utils.toJsonParse(messages.data);
        }
        if (messages.name === 'OnlyAudioRoom') {
            _handleSwitchOnlyAudioRoom(false , messages.fromID);
            return;
        }
        if(messages.name === 'BigRoom'){
            privateVariableJson._roomMode = window.TK.ROOM_MODE.NORMAL_ROOM ;
            L.Logger.info('[tk-sdk]room mode changed,current mode is '+privateVariableJson._roomMode);
            var roomEvt = TK.RoomEvent({type: 'room-mode-changed', message:{
                roomMode:privateVariableJson._roomMode
            }});
            that.dispatchEvent(roomEvt);
        }
        var roomEvt = TK.RoomEvent({type: 'room-delmsg', message:messages});
        that.dispatchEvent(roomEvt);
    };
    _handlerCallbackJson._handler_setProperty = function  (messages) {
        L.Logger.debug('[tk-sdk]setProperty info:' , L.Utils.toJsonStringify(messages) );

        var param = messages;
        var id = param.id;

        if(param.hasOwnProperty("properties"))
        {
            var properties =  param.properties;
            var user = privateVariableJson._users[id];
            if (!user){
                if(  privateVariableJson._roomMode !== window.TK.ROOM_MODE.NORMAL_ROOM ){
                    L.Logger.info( '[tk-sdk]setProperty user is not exist , userid is '+id+', change user property inof:'+ L.Utils.toJsonStringify(messages)+'!'  );
                }
                return;
            }
            var userServername = user.servername ;
            for (var key in properties) {
                if (key != 'id' && key != 'watchStatus'){
                    user[key]=properties[key];
                }
            }
            var roomEvt = TK.RoomEvent({type: 'room-userproperty-changed', user:user, message:properties} , { fromID:param.fromID, userId:user.id} );
            that.dispatchEvent(roomEvt);
            if( privateVariableJson._myself.id === id && properties.hasOwnProperty("servername") ){
                if(privateVariableJson._myself.id !== param.fromID ){ //不是自己触发的改变服务器，则切换服务器
                    if( properties.servername  && properties.servername !==  userServername){
                        that.switchServerByName(  properties.servername );
                    }
                }else{
                    if( properties.servername  && properties.servername !==  userServername){
                        privateVariableJson._serverName =  properties.servername ;
                        _updateSelectServer(privateVariableJson._serverList , privateVariableJson._serverName );
                    }
                }
            }
        }
    };
    _handlerCallbackJson._handler_playback_clearAll = function () {
        if(!privateVariableJson._isPlayback){L.Logger.warning('[tk-sdk]No playback environment!');return ;} ;
        //TODO 回放清除所有的数据是否重置房间模式，有待商讨，这里先重置
        privateVariableJson._roomMode = window.TK.ROOM_MODE.NORMAL_ROOM ;
        L.Logger.info('[tk-sdk]room mode changed,current mode is '+privateVariableJson._roomMode);
        var roomModeEvt = TK.RoomEvent({type: 'room-mode-changed', message:{
            roomMode:privateVariableJson._roomMode
        }});
        that.dispatchEvent(roomModeEvt);
        var roomEvt = TK.RoomEvent({type: 'room-playback-clear_all'});
        that.dispatchEvent(roomEvt);
        _playbackClearAll();
    };
    _handlerCallbackJson._handler_duration = function (message) {
        if(!privateVariableJson._isPlayback){L.Logger.warning('[tk-sdk]No playback environment!');return ;} ;
        var roomEvt = TK.RoomEvent({type: 'room-playback-duration' , message:message });
        privateVariableJson._durationTime = message;
        that.dispatchEvent(roomEvt);
    };
    _handlerCallbackJson._handler_playbackEnd = function () {
        if(!privateVariableJson._isPlayback){L.Logger.warning('[tk-sdk]No playback environment!');return ;} ;
        var roomEvt = TK.RoomEvent({type: 'room-playback-playbackEnd'});
        that.dispatchEvent(roomEvt);
    } ;
    _handlerCallbackJson._handler_playback_updatetime = function  (message) {
        if(!privateVariableJson._isPlayback){L.Logger.warning('[tk-sdk]No playback environment!');return ;} ;
        var roomEvt = TK.RoomEvent({type: 'room-playback-playback_updatetime' , message:message });
        that.dispatchEvent(roomEvt);
    };
    _handlerCallbackJson._handler_connectSocketSuccess = function (code, response) {
        if(privateVariableJson._isLeaveRoom){
            L.Logger.info('[tk-sdk]The room is over. Method _handler_connectSocketSuccess cannot be executed!');
            if(that.socket){
                that.leaveroom();
            }
            return ;
        }
        var roominfo = response.roominfo;//房间信息
        var msglist = response.msglist; //各种消息列表，对应pugmsg所有信息
        var userlist = response.userlist;//用户列表，我进入教室后，服务器发送此房间列表给我

        var  roomId;
        that.p2p = roominfo.p2p;
        roomId = roominfo.id;
        that.iceServers = roominfo.iceServers;

        privateVariableJson._users = {} ;

        _setStatus(STATUS_ALLREADY);

        for (var index in userlist) {
            if (userlist.hasOwnProperty(index)) {
                var userproperties = userlist[index];
                var user = TK.RoomUser(userproperties);
                if (user !== undefined) {
                    privateVariableJson._users[user.id]=user;
                    if(privateVariableJson._isPlayback && privateVariableJson._users[user.id]){
                        delete privateVariableJson._users[user.id].playbackLeaved ;
                    }
                    L.Logger.info('[tk-sdk]room-connected --> user info: '+L.Utils.toJsonStringify(user) );
                }
            }
        }
        L.Logger.info('[tk-sdk]room-connected --> myself info: '+L.Utils.toJsonStringify(privateVariableJson._myself) );
        var msgs = new Array();
        if(msglist && typeof msglist === "string") {
            msglist = L.Utils.toJsonParse(msglist);
        }
        if ( msglist.hasOwnProperty('OnlyAudioRoom') ) {
            var messages = msglist['OnlyAudioRoom'];
            _handleSwitchOnlyAudioRoom(true ,  messages.fromID);
            if (TK.needOnlyAudioRoom === 2) {
                that.switchOnlyAudioRoom( false ) ;
            }
        }else {
            if (TK.needOnlyAudioRoom === 1) {
                that.switchOnlyAudioRoom(true) ;
            }
        }
        if(  msglist.hasOwnProperty('BigRoom') ){
            privateVariableJson._roomMode = window.TK.ROOM_MODE.BIG_ROOM ;
            _removeBigRoomUsers();
        }else{
            privateVariableJson._roomMode = window.TK.ROOM_MODE.NORMAL_ROOM ;
        }
        L.Logger.info('[tk-sdk]room mode changed,current mode is '+privateVariableJson._roomMode);
        var roomEvt = TK.RoomEvent({type: 'room-mode-changed', message:{
            roomMode:privateVariableJson._roomMode
        }});
        that.dispatchEvent(roomEvt);
        for (var key in msglist) {
            if (msglist.hasOwnProperty(key)) {
                msgs.push(msglist[key]);
            }
        }

        msgs.sort(function(obj1, obj2){
            if (obj1 === undefined || !obj1.hasOwnProperty('seq') || obj2 === undefined || !obj2.hasOwnProperty('seq'))
                return 0;

            return obj1.seq - obj2.seq;

        });

        // 3 - Update RoomID
        that.roomID = roomId;
        privateVariableJson._isConnected = true ;
        L.Logger.debug('[tk-sdk]Connected to room ' + that.roomID);
        L.Logger.debug('[tk-sdk]connected response:' , L.Utils.toJsonStringify(response));
        L.Logger.info('[tk-sdk]room-connected ' +' , signalling list length '+ msgs.length);
        if( _whiteboardManagerInstance){
            if( _whiteboardManagerInstance.changeCommonWhiteBoardConfigration ){
                var backupDocAddressList = [];
                for(var i=0,length=privateVariableJson._backup_doc_host_list.length;i<length;i++){
                    backupDocAddressList.push({
                        protocol:privateVariableJson._backup_doc_protocol,
                        hostname:privateVariableJson._backup_doc_host_list[i],
                        port: privateVariableJson._backup_doc_port,
                    });
                }
                _whiteboardManagerInstance.changeCommonWhiteBoardConfigration({
                    webAddress:{
                        protocol:privateVariableJson._web_protocol,
                        hostname:privateVariableJson._web_host,
                        port: privateVariableJson._web_port,
                    }  , //php服务器地址
                    docAddress:{
                        protocol:privateVariableJson._doc_protocol,
                        hostname:privateVariableJson._doc_host,
                        port: privateVariableJson._doc_port,
                    }, //文档服务器地址
                    backupDocAddressList:backupDocAddressList , //备份文档服务器地址列表
                    myUserId: privateVariableJson._myself.id , //我的userID
                    myName: privateVariableJson._myself.nickname ,  //我的名字
                    myRole: privateVariableJson._myself.role ,  //我的角色
                    isConnectedRoom:privateVariableJson._isConnected , //是否已经连接房间
                    isPlayback:privateVariableJson._isPlayback , //是否是回放
                });
            }
        }
        if( !privateVariableJson._isPlayback ){ //不是回放，则发送网络状态
            _sendDeviceInfoToPhp();
        }
        var connectEvt = TK.RoomEvent({type: 'room-connected', message:msgs});
        that.dispatchEvent(connectEvt);
    };

    _handlerCallbackJson._handler_connectSocketFail = function (error) {
        if(privateVariableJson._isLeaveRoom){
            L.Logger.info('[tk-sdk]The room is over. Method _handler_connectSocketFail cannot be executed!');
            return ;
        }
        if(privateVariableJson._backupCourseAddrList.length){
            var addrInfo = privateVariableJson._backupCourseAddrList[0];
            privateVariableJson._backupCourseAddrList.splice(0,1);
            L.Logger.warning('[tk-sdk]Not Connected,change address reconnection, address info:'+L.Utils.toJsonStringify(addrInfo)+' ,error info: ' + error);
            _changeAddressInner(addrInfo.name, addrInfo.signaladdr,addrInfo.signalport ,  addrInfo.webaddr, addrInfo.docaddr, addrInfo.change,undefined,function () {
                // Close socket
                try {
                    if(that.socket && that.socket.disconnect){
                        that.socket.disconnect();
                    }
                } catch (error) {
                    L.Logger.warning('[tk-sdk]Socket already disconnected , disconnect errorInfo:' , error);
                }
                that.socket = undefined;
                that.needReconnectSocket = true ;
                _connectSocket(_handlerCallbackJson._handler_connectSocketSuccess, _handlerCallbackJson._handler_connectSocketFail);
            });
        }else{
            L.Logger.error('[tk-sdk]Not Connected! Error: ' + error);
            var connectEvt = TK.RoomEvent({type: 'room-error', message:{source:L.Constant.roomError.ROOMCONNECTERROR  , error:error}});
            that.dispatchEvent(connectEvt);
            //TODO room-connect-fail的source和error需要完善
            var connectEvt = TK.RoomEvent({type: 'room-connect-fail', message:{source:L.Constant.roomError.ROOMCONNECTERROR  , error:error}});
            that.dispatchEvent(connectEvt);
        }
    };
    /*=============================socket事件处理end=============================*/


    TK.roomInstance = that ;
    return that;
};
// console.log('1111111111111',window);
module.exports = {
    window: window,
}
