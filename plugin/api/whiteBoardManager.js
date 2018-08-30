	import LC from '../libs/easydraw/src/index.js'

	class WhiteBoardManager {
		constructor(room){
			this.room = room;

			// 监听的事件列表
			this.listenedEventList = [
				'room-receiveActionCommand',
				'room-pubmsg',
				'room-delmsg',
				'room-connected',
				'room-disconnected',
				'room-msglist',
				'room-usermediastate-changed',
				'room-userfilestate-changed',
				'room-usermediaattributes-update',
				'room-userfileattributes-update',
				'room-error-notice',
			]
			this.backupid = new Date().getTime() + '_' + Math.random();

			this._batchListen(this.listenedEventList)
		}

		_batchListen(eventList){
			if(!Array.isArray(eventList))return

			eventList.forEach((eventType, index)=>{
				this._listen(eventType)
			})
		}

		_listen(eventType){
			if (typeof eventType !== 'string')return
			const eventHandlerKey = this._getEventKey(eventType)

			this.room.addEventListener(eventType, 
			this[eventHandlerKey] && this[eventHandlerKey].bind(this) || this._handlerEvent.bind(this), 
			this.backupid)
		}

		_getEventKey(eventType){
			let strArr = eventType.split('-')
			new RegExp('room').test(strArr[0]) && strArr.shift()
			return strArr.reduce((t, cv, ci, arr)=>{
				return `${t}${cv.replace(cv[0], cv[0].toUpperCase())}`
			},'_handler');
		}

		_handlerEvent(e){
			console.error(e)
		}

		_handlerConnected(){
		}

		_handlerPubmsg(e){
			const {message} = e,
				{ data: drawData } = message.data

				Object.assign(drawData,drawData.data)

			const shape1 = {
				"className": "Line",
				"data": {
					"x1": 28.09589250267216,
					"y1": 31.149793861658267,
					"x2": 28.09589250267216,
					"y2": 155.74896930829132,
					"strokeWidth": 5,
					"color": "#000000",
					"capStyle": "round",
					"dash": null,
					"endCapShapes": [
						null,
						null
					]
				},
				"id": "caf9f77b-580a-fb17-7710-858f0f463fb2",
				"x1": 28.09589250267216,
				"y1": 31.149793861658267,
				"x2": 28.09589250267216,
				"y2": 155.74896930829132,
				"strokeWidth": 5,
				"color": "#000000",
				"capStyle": "round",
				"dash": null,
				"endCapShapes": [
					null,
					null
				]
			}
			
			switch(message.name){
				case 'SharpsChange': 
					console.log(drawData)
					LC.canvasRenderer.renderShapeToContext(
						wx.createCanvasContext('main'),
						shape1
					)
					break;

				default:
					break;
			}
		}

	}

	export default WhiteBoardManager