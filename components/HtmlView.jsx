import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getKey } from 'taro-tools'
import Taro from '@tarojs/taro'
import { View as TaroView, Text, Image as TaroImage, Video as TaroVideo } from '@tarojs/components'
import { HTMLParser } from '../utils/htmlparser'
import tags from '../utils/tags.json'
import './HtmlView.css'

const Image = ({ style, className, src, containerLayout, onClick }) => {

  const click = useCallback(() => {
    onClick?.({
      type: 'image',
      src
    })
  }, [onClick])

  return <TaroImage
    style={[{ width: containerLayout.width + (process.env.TARO_ENV === 'rn' ? 0 : 'px') }, style]}
    className={className}
    src={src}
    mode='widthFix'
    onClick={click}
  />
}

const Video = ({ style, className, src, controls, containerLayout, children }) => {

  const [childSrc, setChildSrc] = useState('')

  useEffect(() => {
    // 查找src
    if (!src) {
      const res = children.filter(v => v.props?.src)?.[0]?.props?.src
      res && setChildSrc(res)
    }
  }, [src, children])

  const isPlay = useMemo(() => !!childSrc || !!src, [childSrc, src])

  return isPlay ?
    <TaroVideo
      style={[{
        width: containerLayout.width + (process.env.TARO_ENV === 'rn' ? 0 : 'px'),
        // height: containerLayout.width * 9 / 16 + (process.env.TARO_ENV === 'rn' ? 0 : 'px')
      }, style]}
      className={className}
      controls={!!controls}
      src={childSrc || src}
    />
    : null
}

const getTextStyle = (allStyle = {}) => {
  const textStyles = ['opacity', 'backgroundColor', 'color', 'fontSize', 'lineHeight', 'fontWeight', 'fontFamily', 'fontStyle', 'letterSpacing', 'textAlign', 'textDecorationLine', 'textTransform']
  const style = {}
  const textStyle = {}
  for (let key in allStyle) {
    if (typeof allStyle[key] == 'object') {
      for (let key1 in allStyle[key]) {
        if (textStyles.includes(key1)) {
          style[key1] = allStyle[key][key1]
        } else {
          textStyle[key1] = allStyle[key][key1]
        }
      }
    } else {
      if (textStyles.includes(key)) {
        style[key] = allStyle[key]
      } else {
        textStyle[key] = allStyle[key]
      }
    }
  }
  return [style, textStyle]
}

const View = ({
  children,
  style = {},
  className
}) => {
  const [viewStyle, textStyle] = getTextStyle(style)
  // 判断内容是否是纯文本
  const isText = children?.every?.(item => typeof item === 'string')
  // 是否是纯文本组件
  const isTextComp = !isText && children?.every?.(item => item?.props?.nodeName === 'Text')

  return isText ?
    <Text style={viewStyle} className={className}>{children.join('')}</Text> : isTextComp ?
      <Text style={textStyle} className={className}>{children}</Text> :
      <TaroView style={viewStyle} className={className}>{
        children?.map?.((item, index) => {
          return typeof item === 'string' ?
            <Text key={index} style={textStyle}>{item}</Text> :
            item
        }) || children
      }</TaroView>

}

const comps = {
  View,
  Text,
  Image,
  Video
}

const Item = ({
  nodeName,
  child,
  children,
  containerLayout,
  onClick,
  ...props
}) => {
  const Comp = useMemo(() => comps[nodeName] || comps.View, [nodeName])
  return <Comp containerLayout={containerLayout} onClick={onClick} {...props}>
    {
      child?.map(item => {
        if (typeof item === 'string') {
          return item
        }
        return <Item key={item.key} {...item} onClick={onClick} containerLayout={containerLayout} />
      })
    }
  </Comp>
}

const Create = ({ nodes, containerLayout, onClick, ...props }) => {
  return <View {...props}>
    {
      nodes?.map(item => {
        if (typeof item === 'string') {
          return item
        }
        return <Item key={item.key} {...item} onClick={onClick} containerLayout={containerLayout} />
      })
    }
  </View>
}

const getRect = (select, getAll, num = 0) => {
  const query = Taro.createSelectorQuery()
  return new Promise((resolve, reject) => {
    if (num > 10) {
      reject('请求超过10次')
      return
    }
    let isRes = false
    query[getAll ? 'selectAll' : 'select'](select).boundingClientRect(res => {
      if (isRes) {
        return
      }
      isRes = true
      if ((!Array.isArray(res) && res) || Array.isArray(res) && res.length > 0) {
        resolve(res)
      } else {
        setTimeout(() => getRect(select, getAll, num + 1).then(resolve).catch(reject), 5)
      }
    }).exec()
  })
}

let layoutKey = 1
/**
 * 获取组件的布局尺寸信息
 * @param {*} param0
 * @returns
 */
const Layout = ({ children, onLayout, className, ...props }) => {

  const currentClass = useMemo(() => process.env.TARO_ENV === 'rn' ? '' : `layout-measure-${layoutKey++}`, [])

  useEffect(() => {
    if (process.env.TARO_ENV !== 'rn') {
      getRect('.' + currentClass).then(onLayout)
    }
  }, [currentClass, onLayout])

  const layout = useCallback(({ nativeEvent: { layout } }) => {
    onLayout?.({
      ...layout,
      left: layout.x,
      top: layout.y
    })
  }, [onLayout])

  return <TaroView onLayout={layout} className={`${className} ${currentClass}`} {...props}>
    {children}
  </TaroView>
}

export default function HtmlView({
  html,
  style,
  className,
  previewImage
}) {
  const [nodes, setNodes] = useState([])

  const images = useRef([])

  const [containerLayout, setContainerLayout] = useState({
    width: 375
  })

  useEffect(() => {
    const { nodes, images: imgs } = getNodes(html)
    setNodes(nodes)
    images.current = imgs
  }, [html])

  const layout = useCallback((e) => {
    setContainerLayout(e)
  }, [])

  const click = useCallback(e => {
    if (e.type === 'image' && previewImage) {
      Taro.previewImage({
        current: e.src,
        urls: images.current
      })
    }
  }, [previewImage])

  return <Layout onLayout={layout} style={style} className={className}>
    <Create nodes={nodes} containerLayout={containerLayout} onClick={click} />
  </Layout>
}

const getNodes = (() => {
  const nodeArr = {
    span: 'Text',
    img: 'Image',
    video: 'Video'
  }
  /**
   * 定义节点支持的style
   */
  const styleNode = {
    // 布局组件通用
    View: ['width', 'height', 'maxHeight', 'maxWidth', 'minHeight', 'minWidth', 'opacity', 'backgroundColor', 'overflow', 'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'margin', 'marginLeft', 'marginRight', 'marginTop', 'marginBottom', 'borderStyle', 'borderWidth', 'borderLeftWidth', 'borderRightWidth', 'borderTopWidth', 'borderBottomWidth', 'borderColor', 'borderLeftColor', 'borderRightColor', 'borderTopColor', 'borderBottomColor', 'borderRadius', 'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius', 'position', 'left', 'right', 'top', 'bottom', 'zIndex', 'flexDirection', 'flexWrap', 'alignItems', 'justifyContent', 'alignContent', 'flex', 'flexGrow', 'flexShrink', 'alignSelf'],
    // 文本 输入框类组件通用
    Text: ['width', 'height', 'maxHeight', 'maxWidth', 'minHeight', 'minWidth', 'opacity', 'backgroundColor', 'overflow', 'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'margin', 'marginLeft', 'marginRight', 'marginTop', 'marginBottom', 'borderStyle', 'borderWidth', 'borderLeftWidth', 'borderRightWidth', 'borderTopWidth', 'borderBottomWidth', 'borderColor', 'borderLeftColor', 'borderRightColor', 'borderTopColor', 'borderBottomColor', 'position', 'left', 'right', 'top', 'bottom', 'zIndex', 'color', 'fontSize', 'lineHeight', 'fontWeight', 'fontFamily', 'fontStyle', 'letterSpacing', 'textAlign', 'textDecorationLine', 'textTransform', 'flex', 'flexGrow', 'flexShrink', 'alignSelf'],
    // 图片专用
    Image: ['width', 'height', 'maxHeight', 'maxWidth', 'minHeight', 'minWidth', 'opacity', 'backgroundColor', 'overflow', 'margin', 'marginLeft', 'marginRight', 'marginTop', 'marginBottom', 'borderStyle', 'borderWidth', 'borderLeftWidth', 'borderRightWidth', 'borderTopWidth', 'borderBottomWidth', 'borderColor', 'borderLeftColor', 'borderRightColor', 'borderTopColor', 'borderBottomColor', 'position', 'left', 'right', 'top', 'bottom', 'zIndex', 'flex', 'flexGrow', 'flexShrink', 'alignSelf'],
    Video: ['width', 'height', 'backgroundColor', 'margin', 'marginLeft', 'marginRight', 'marginTop', 'marginBottom']
  }
  // 样式名称转换
  const styleNameTransforms = [
    ['textDecoration'],
    ['textDecorationLine'],
  ]
  // 不支持的Style属性
  const noStyleValue = ['auto']

  // tag替换正则
  const tagReg = /&([a-zA-Z0-9]{1,});/g

  const getStyleValue = (name, value) => {
    if (value?.endsWith('px')) {
      return Taro.pxTransform(value.replace('px', '') * 2)
    } else if (value?.endsWith('pt')) {
      return Taro.pxTransform(value.replace('pt', '') * 2 * 1.33333)
    }
    return value
  }
  const getAttrs = (tag, attrs) => {

    const data = {
      nodeName: nodeArr[tag] || 'View',
      className: `html-${tag}`
    }
    attrs.forEach(({ name, value }) => {
      switch (name) {
        case 'style': {
          const res = value.replace(/ /g, '').split(';').map(item => {
            const arr = item.split(':')
            // 排除无效或者为空的Style
            if (!arr[0] || noStyleValue.includes(arr[1])) {
              return false
            }
            let styleName = arr[0].split('-').map((v, i) => {
              if (i === 0) {
                return v
              }
              return v[0].toUpperCase() + v.substr(1)
            }).join('')

            // 样式名称转换，支持rn
            const transformIndex = styleNameTransforms[0].indexOf(styleName)
            if (~transformIndex) {
              styleName = styleNameTransforms[1][transformIndex]
            }

            // 排除不支持的Style
            if (!styleNode[data.nodeName].includes(styleName)) {
              return false
            }
            return [
              styleName,
              getStyleValue(styleName, arr[1])
            ]
          }).filter(v => v)
          data.style = Object.fromEntries(res)
          break
        }
        default: {
          data[name] = value
          break
        }
      }
    })
    return data
  }
  return html => {

    const images = []

    const bufArray = []
    const results = {
      child: []
    }
    HTMLParser(html, {
      start(tag, attrs, unary) {
        const node = {
          ...getAttrs(tag, attrs),
          key: getKey()
        }
        if (node.nodeName === 'Image' && node.src) {
          images.push(node.src)
        }
        if (unary) {
          // if this tag dosen't have end tag
          // like <img src="hoge.png"/>
          // add to parents
          const parent = bufArray[0] || results;
          if (parent.child === undefined) {
            parent.child = [];
          }
          parent.child.push(node);
        } else {
          bufArray.unshift(node);
        }
      },
      chars(text) {
        if (text === '\n' || text === '\n\r') {
          return
        }
        text = text.replace(tagReg, (a, b) => tags[b] || a)
        if (bufArray.length === 0) {
          results.child.push(text);
        } else {
          const parent = bufArray[0];
          if (parent.child === undefined) {
            parent.child = [];
          }
          parent.child.push(text);
        }
      },
      end(tag) {
        const node = bufArray.shift();
        // if (node.tag !== tag) console.error('invalid state: mismatch end tag');

        if (bufArray.length === 0) {
          results.child.push(node);
        } else {
          var parent = bufArray[0];
          if (parent.child === undefined) {
            parent.child = [];
          }
          parent.child.push(node);
        }
      },
      comment(text) {
        console.log('comment', text)
      }
    })
    return {
      nodes: results.child,
      images
    }
  }
})();
