const stringUtil = {
    jsonToCssString(jsonData){
        return Object.keys(jsonData).reduce((t, cv, ci, ca)=>{
            return `${t};${cv}:${jsonData[cv]}`
        },[])
    }, 
    cssStringToJson(cssString){
        if(typeof cssString !== 'string')return;
        let result = {}

        if(cssString.indexOf(';')>-1){
            cssString.split(';').forEach((item, index)=>{
                let tmpArr = item.split(':'),
                    key = tmpArr.shift();
                result[key]=tmpArr.join(':')
            })
        }else if(cssString.indexOf(':'>-1)){
            let tmpArr = cssString.split(':'),
                key = tmpArr.shift();
            result[key]=tmpArr.join(':')
        }

        return result;
    }
}

export default stringUtil;