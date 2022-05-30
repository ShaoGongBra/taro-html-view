import { CSSProperties } from 'react'
import { Component } from 'react'

type props = Partial<{
  /** html文本 */
  html: string,
  /**
   * 组件样式 应用在最外层
   */
  style?: CSSProperties,
}>

/**
 * 用于渲染富文本内容 对于复杂的富文本内容可能无法正常渲染 支持ReactNative
 * @example
 * <RichText html='<p>文本内容</p>' />
 */
export class HtmlView extends Component<props>{

}
