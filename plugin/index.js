var data = require('./api/data.js')
import LC from './libs/easydraw/src/index.js'
import WhiteBoardManager from './api/whiteBoardManager.js'

module.exports = {
  getData: data.getData,
  setData: data.setData,
	WhiteBoardManager: WhiteBoardManager,
	LC
}