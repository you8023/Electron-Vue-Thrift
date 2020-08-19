# Electron+Vue+Thrift实现PC客户端开发

本文包含部分图片github无法显示，欲查看全文请点击[链接](https://www.jianshu.com/p/9a0b56428064)

尽管web应用有着不可比拟的优势，但在一些应用场景里，考虑到某些因素（安全、客户需求、通信效率等）不得不使用客户端。然而，要达到同样的视觉效果，相比于web，客户端程序的界面设计及制作十分繁杂。因此，将web前端和客户端开发结合起来是个不错的想法。

而web前端中，作为三大主流框架之一，`vue`能大大降低开发成本，节省开发时间，并在页面渲染和交互上有着良好表现，因此本文选用`Vue`作为web前端开发框架。

`Electron`是当前一个比较成熟的将web程序打包的框架，应用广泛，其实现也方便简单。因此，本文使用`Electron`作为打包工具。

`Thrift`是Facebook公布的一款开源跨语言的RPC框架（选用RPC通信是出于安全考虑，其通信原理见[博客](https://blog.csdn.net/zkp_java/article/details/81879577)），在web程序和python之间通信表现良好。

本文参考了一篇[博客](https://blog.csdn.net/AlexTan_/article/details/96587059?utm_source=app)，对其进行了复现的同时加入了Vue框架并补充了部分细节。

## 环境配置
本文开发使用的环境：
* Windows 10
* Sublime text 3
* Python 3.7
* Pip 20.2.2
* Node 10.16.0
* Npm 6.9.0

1. 安装thrift：
```
pip install thrift
```
2. 全局安装`Electron`：
```
npm install electron -g
```
如果因网络不佳导致安装失败，可考虑换成`cnpm`进行安装，`cnpm`安装教程见[博客](https://www.jianshu.com/p/aab8c05c8959)，安装命令为：
```
cnpm install electron -g
```
3. 全局安装`vue-cli`：
```
npm install @vue/cli -g
```
4. 找一个风水好的地方新建文件夹`electronApp`
5. 进入该文件夹，执行命令`vue init simulatedgreg/electron-vue`，期间会出现一些输入项，选择打包工具时，有`builder`和`packager`两个选项，一个是打包成安装包，一个是打包成可直接运行的程序，根据需要选择即可，其他直接`enter`默认即可
6. 在该文件夹执行命令安装本地环境：
```
npm install 
```
7. 在文件夹`src`->`rederer`中新建文件夹`lib`，进入`lib`文件夹
  新建接口文件`test.thrift`，输入以下内容：
```
service userService {
    string test1(1:string name)
}
```
8. 下载[thrift.exe](http://thrift.apache.org/download)，并配置环境变量：
  重命名该文件为`thrift.exe`，在E盘（其他盘也可以）新建文件夹`thrift`，将该文件放进去
  右键单击计算机，选择`属性`，在弹框中，依次选择`高级系统设置`>`环境变量`，在`Path`中添加该文件地址
  在cmd窗口中输入`thrift -version`如能正常显示则配置成功
9. 生成各自的接口文件：
```
thrift -out 存储路径 --gen 接口语言 thrift接口文件名
```
这里以当前路径，生成nodejs：
```
thrift -out ./ --gen js:node test.thrift
```
生成完之后文件夹内会多出两个js文件
同理，生成python：
```
thrift -out ./ --gen py test.thrift
```
在根目录新建文件夹`py`，将生成的文件夹`test`和文件`_init_.py`放入其中

## 代码编写
### 客户端代码
回到`lib`目录下，引入thrift
新建文件`common.js`，输入以下内容：
```
import Vue from 'vue'
class Api {
	static importThrift = () => {
    var thrift = require('thrift');
    var userService = require('./userService.js');
    var thriftConnection = thrift.createConnection('127.0.0.1', 8000);
    var thriftClient = thrift.createClient(userService,thriftConnection);

    thriftConnection.on("error",function(e){
      console.error(e);
    });
    return thriftClient;
  }
}
export default {
  install(Vue) {
    Vue.prototype.$api = Api;
    Vue.prototype.$thrift = Api.importThrift;
  }
}
```
新建文件`index.js`，输入以下内容：
```
import Vue from 'vue'

import common from './common'

export default {
  install(Vue) {
    Vue.use(common)
  }
}
```
编辑`renderer`文件夹内的`main.js`，添加以下内容：
```
import lib from './lib'
Vue.use(lib)
```
编辑`src`->`main`目录下的文件`index.js`，在末尾添加以下内容：
```javascript
const path=require('path')

let pyProc = null
let pyPort = null

const createPyProc = () => {
  // let port = '4242'
  let script = path.join(__dirname, 'py', 'thrift_server.py')
  pyProc = require('child_process').spawn('python', [script])
  if (pyProc != null) {
    console.log('child process success')
  }
}

const exitPyProc = () => {
  pyProc.kill()
  pyProc = null
  pyPort = null
}

app.on('ready', createPyProc)
app.on('will-quit', exitPyProc)
```
### 服务端代码
进入`py`目录，新建文件`thrift_server.py`:
```python
import json
from thrift.transport import TSocket
from thrift.transport import TTransport
from thrift.protocol import TBinaryProtocol
from thrift.server import TServer

from test import userService


class Test:
    def test1(self, dic):
        print("one")
        dic = json.loads(dic)
        return f'Hello, {dic["name"]}!'


if __name__ == "__main__":
    port = 8000
    ip = "127.0.0.1"
    # 创建服务端
    handler = Test()  # 自定义类
    processor = userService.Processor(handler)  # userService为python接口文件自动生成
    # 监听端口
    transport = TSocket.TServerSocket(ip, port)  # ip与port位置不可交换
    # 选择传输层
    tfactory = TTransport.TBufferedTransportFactory()
    # 选择传输协议
    pfactory = TBinaryProtocol.TBinaryProtocolFactory()
    # 创建服务端
    server = TServer.TThreadedServer(processor, transport, tfactory, pfactory)
    print("start server in python")
    server.serve()
    print("Done")
```
## 项目启动
在`py`目录下执行命令`python thrift-server.py`
在`electronApp`目录下执行命令`npm run dev`即可运行项目：
![项目运行成功](https://upload-images.jianshu.io/upload_images/5714082-7f75025c3dd48d70.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

## 项目打包
写好之后的项目需要打包成exe文件，便于移植
### 工具安装
安装打包工具：
```
pip install pyinstaller
```
在根目录运行命令安装Electron打包模块：
```
npm install electron-packager --save-dev
```
### 环境配置
在`package.json`的`scripts`中加入`"build-python":"pyinstaller ./py/thrift_server.py --clean"`。
然后在根目录下运行`npm run build-python`编译一下。编译完了可以把根目录下生成的`build`文件夹和`thrift_server.spec`删了。
之前子进程是通过调用python命令运行的，现在我们要换成生成的可执行程序。修改`src`->`main`下的`index.js`：
```
// let script = path.join(__dirname, 'py', 'thrift_server.py')
  // pyProc = require('child_process').spawn('python', [script])
  let script = path.join(__dirname, 'py', 'dist','thrift_server')
  pyProc = require('child_process').execFile(script)
```
然后将`"pack-app": "./node_modules/.bin/electron-packager . --overwrite --ignore=py$"`写入`package.json`的`scripts`中。
### 打包程序
运行`npm run pack-app`打包程序，最后会生成可执行文件，复制到别的电脑也可以运行。
所有代码见[Github](https://github.com/you8023/Electron-Vue-Thrift)