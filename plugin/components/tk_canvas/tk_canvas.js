import config from '../../conf/index.js'
import utils from '../../libs/utils/index.js'
import ed from '../../libs/easydraw/src/index'

// console.log(ed) 

const {canvasConf:{defaultStyle}} = config,
	  {stringUtil:{jsonToCssString, cssStringToJson}} = utils

// plugin/components/tk_canvas/tk_canvas.js
Component({
  /** 
   * 组件的属性列表
   */
  properties: {
		customStyle: {
			type: String,
			value: '',
			observer: function (newVal, oldVal, changedPath){
				const newStyle = Object.assign(defaultStyle, cssStringToJson(newVal))
				this.setData({
					style:jsonToCssString(newStyle)
				})
			}
		},
		customRatio: {
			type: Number,
			value: 16/9,
			observer: function (newVal, oldVal, changedPath){}
		}
  },

  /**
   * 组件的初始数据
   */
  data: {
		style: jsonToCssString(defaultStyle)
	},

  /**
   * 组件的方法列表
   */
  methods: {
		onBtnTap:function(jsonData){
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

			ed.canvasRenderer.renderShapeToContext(
				wx.createCanvasContext('main'),
				shape1
			)
		},
		getBoundingRect: function (selector){
			const query = wx.createSelectorQuery().in(this)
			return new Promise((resolve, reject) => {
				query.select(selector).boundingClientRect(function (rect) {
					resolve(rect)
				}).exec()
			});
		},
  },

  	/**
	 * 组件生命周期
	 */
	lifetimes: {
		// 生命周期函数，可以为函数，或一个在methods段中定义的方法名
		attached: function () { },
		ready: function () {

			// 设置宽高比
			// 规则：
			// 若同时设置了canvas的宽和高，则忽略宽高比
			// 若设置了宽或高且同时设置了宽高比，则按照宽高比去设置未设置的项
			// customRatio仅支持'1'、'1.xx'这种形式的宽高比
			this.getBoundingRect('#main').then(rect => {
				console.log('222')
				if (({}).hasOwnProperty.call(defaultStyle, 'width') && ({}).hasOwnProperty.call(defaultStyle, 'height')) {
					return console.debug('Canvas has width and height,ratio will be useless')
				} else if (({}).hasOwnProperty.call(defaultStyle, 'width') && !({}).hasOwnProperty.call(defaultStyle, 'height')) {
					const newStyle = Object.assign(defaultStyle, cssStringToJson(`height:${rect.width / this.data.customRatio}px`))
					this.setData({
						style: jsonToCssString(newStyle)
					})
				} else if (!({}).hasOwnProperty.call(defaultStyle, 'width') && ({}).hasOwnProperty.call(defaultStyle, 'height')) {
					const newStyle = Object.assign(defaultStyle, cssStringToJson(`width:${rect.height * this.data.customRatio}px`))
					this.setData({
						style: jsonToCssString(newStyle)
					})
				}
			})

			// let ctx = wx.createCanvasContext('main')
			// ctx.lineWidth = 5;
			// ctx.strokeStyle = 'red';
			// ctx.beginPath();
			// ctx.moveTo(0, 0);
			// ctx.lineTo(50, 50);
			// ctx.stroke();
			// console.log(111)
			// ctx.draw(true);
		},
		detached: function () { },
	},
})
