# Taro HtmlView
支持将简单的html富文本渲染为Taro组件，支持小程序、H5、ReactNative

## 安装

```bash
yarn add taro-html-view
```

## 使用

```jsx
import { HtmlView } from 'taro-html-view'
<HtmlView html='<p>文本内容</p>' />
```

## 属性

|  属性   | 类型  | 说明 |
|  ----  | ----  | ----  |
| html  | string | 用于渲染的HTML |
| previewImage  | boolean | 开启图片预览功能 |
| style  | CSSProperties | 用于组件最外层的样式 |
| className  | string | class |

## 说明
- 支持小程序、H5、ReactNative
- 只支持在Taro3上使用
- 支持在小程序上渲染视频
- 此组件的目的是渲染后台编辑器生成的内容，复杂或者ReactNative不支持的样式将不会被渲染
