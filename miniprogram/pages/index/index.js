import tksdk from '../../libs/tksdkdebug.js'

var plugin = requirePlugin("myPlugin")

var roomOptios = {
	autoSubscribeAV: false   //是否自动订阅音视频 , 如果为true则订阅过程中会接收服务器的音视频数据,否则不接收服务器音视频数据,只有调用playStream才会取服务器的相关音视频数据 , 默认为true
};
const room = tksdk.window.TK.Room(roomOptios);
Page({
  onLoad: function() {
	room.init('82AUScqguvqXzhUh');
	room.setLogIsDebug(true);
    plugin.getData();
  },

	joinroomClick: function(){
		console.log(`${Math.floor((Math.random() + 1) * 0x10000).toString(16).substring(1)}_${new Date().getTime()}`,11111)
		room.joinroom('demo.talk-cloud.net', 443, `${Math.floor((Math.random()+1) * 0x10000).toString(16).substring(1)}_${new Date().getTime()}`, undefined, { serial: "2139056258", password: "" })
	}
})