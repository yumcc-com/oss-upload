/**
 * Created by pc on 2018/5/11.
 * 需要的库为(co, ali-oss, glob)
 * ossConfig.json格式如下
 * {
 *   "region": "oss-cn-shanghai",     //OSS region
 *   "accessKeyId": "XXXXXXXX",     //OSS accessKeyId
 *   "accessKeySecret": "XXXXXXXX",     //OSS accessKeySecret
 *   "bucket": "ogo",     //OSS bucket
 *   "localPath": "./dist/**",    //本地需要上传的文件目录,(/**)为遍历根号后所有目录
 *   "ossPath": "/mobile/",    //oss线上文件目录(不能为根目录,避免误操作,最后加上'/')
 *   "callbackUrl": "http://nodejs.org/dist/index.json"    //预留请求服务器更新缓存的API
 * }
 * 
 */
let co = require('co')
let OSS = require('ali-oss')
let glob = require('glob')
let http = require('http')
let Config = require('../ossConfig.json')

// 配置oss信息
let client = new OSS({
  region: Config.region,
  accessKeyId: Config.accessKeyId,
  accessKeySecret: Config.accessKeySecret,
  bucket: Config.bucket
})

// 删除线上目录
function deleteFiles () {
  if (Config.ossPath !== '' && Config.ossPath !== '/') {
    co(function* () {
      let result = yield client.list({
        prefix: Config.ossPath.slice(1, -1),
        marker: Config.ossPath.slice(0, -1)
      })
      let index = 0
      if (result.objects !== undefined) {
        yield result.objects.map(i => {
          co(function* () {
            yield client.delete(i.name)
            index += 1
            if (index === result.objects.length) {
              console.log(`全部删除成功~,总共${result.objects.length}个文件`)
              uploadFiles()
            }
          })
        })
      } else {
        uploadFiles()
      }
    }).catch(function (err) {
      console.log(err)
    })
  } else {
    console.error('上传失败,线上路径为根目录~')
  }
}

function uploadFiles () {
  // 遍历目录树之后上传
  glob(Config.localPath, { nodir: true }, (er, files) => {
    let index = 0
    files.map(i => {
      co(function* () {
        let ossPath = Config.ossPath.substr(Config.ossPath.length - 1, 1) === '/' ? Config.ossPath.slice(0, -1) : Config.ossPath
        yield client.put(ossPath + i.slice(6), i)
        index += 1
        if (index === files.length) {
          consoleStr(files.length)
        }
      }).catch(function (err) {
        console.error(err.params.object)
      })
    })
  })
}

function consoleStr (length) {
  console.log(`全部上传成功~,总共${length}个文件`)
  // http.get(Config.callbackUrl, () => {
  //   console.log('更新缓存成功~')
  // }).on('error', (e) => {
  //   console.error(`错误: ${e.message}`)
  // })
}

//执行
deleteFiles()
