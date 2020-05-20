const OSS = require('ali-oss')
const Globby = require('globby')
const { ossPath, localPath, accessKeyId, accessKeySecret, bucket, region } = require('./config')

const client = OSS({
  accessKeyId,
  accessKeySecret,
  bucket,
  region
})

// 清空OSS目录下的文件
const deleteMulti = async (arr) => {
  return new Promise(async (resolve, rejected) => {
    try {
      const result = await client.deleteMulti(arr, {
        quiet: true
      })
      if (result.res.statusCode === 200) {
        resolve(true)
      } else {
        resolve(false)
      }
    } catch (e) {
      console.log('❌删除接口错误，请重新运行~', e)
      rejected(e)
    }
  })
}

// 获取本地文件目录树
const localFilePath = async (path) => {
  return new Promise(async (resolve) => {
    const paths = await Globby(path)
    resolve(paths)
  })
}

// 文件上传
const put = async (localFilePath) => {
  return new Promise(async (resolve, rejected) => {
    try {
      const ossFilePath = `${ossPath}${localFilePath.substring(localPath.length, localFilePath.length)}`
      const result = await client.put(ossFilePath, localFilePath)
      resolve(result.res.statusCode === 200 ? true : false)
    } catch (e) {
      console.log('❌文件上传错误，请重新运行~', e)
      rejected(e)
    }
  })
}

// 上传文件方法
const onPut = async (paths) => {
  return new Promise(async (resolve) => {
    let needPutPaths = []
    let index = 0
    for (let i of paths) {
      const status = await put(i)
      if (!status) {
        needPutPaths.push(i)
      }
      console.log(status ? `${i}【✔上传成功~】` : `${i}【❌上传失败~】`)
      index += 1
      if (index === paths.length) {
        resolve(needPutPaths)
      }
    }
  })
}

const next = async () => {
  try {
    // 不带任何参数，默认最多返回1000个文件。
    let result  = await client.list({
      prefix: ossPath,
      marker: ossPath
    })
    // 判断是否有文件
    if (result.objects !== undefined) {
      const ossFiles = result.objects.map(e => e.name)
      console.log(ossFiles)
      if (ossFiles.length) {
        const deleteResult = await deleteMulti(ossFiles)
        if (!deleteResult) {
          console.log('❌文件夹清空失败，请重新运行~')
          return
        }
      }
      console.log(ossFiles.length ? '✔文件夹清空成功~' : '✔OSS无文件目录，不执行删除~')
    } else {
      console.log('✔OSS无目录，继续执行上传~')
    }
    const paths = await localFilePath(localPath)
    if (!paths.length) {
      console.log(`${localPath}，本地无此目录或目录下无文件，请检查~`)
      return
    }
    const needPutPaths = await onPut(paths)
    console.log(`✔脚本执行完毕${needPutPaths.length ? `，请手动上传下面的文件~${needPutPaths}` : ''}`)
  } catch (e) {
    console.log('❌脚本执行错误，请重新运行~', e)
  }
}

next()