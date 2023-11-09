// 定义文本模式作为一个状态表
const TextModes = {
  DATA: 'DATA',
  RCDATA: 'RCDATA',
  RAWTEXT: 'RAWTEXT',
  CDATA: 'CDATA'
}

const namedCharacterReferences = {
  "gt": ">",
  "gt;": ">",
  "lt": "<",
  "lt;": "<",
  "ltcc;": "⪦"
}

function isEnd(context, ancestors) {
  if (!context.source) return true
  
  // 与节点栈内全部的节点比较
  for (let i = ancestors.length - 1; i >= 0; --i) {
    // 如果有结束标签相对应则返回 true
    if (context.source.startsWith(`</${ancestors[i].tag}`)) {
      return true
    }
  }
}

function parseTag(context, type = 'start') {
  const { advanceBy, advanceSpaces } = context

  // 开始标签和结束标签的正则匹配选择
  const match = type === 'start'
    ? /^<([a-z][^\t\r\n\f />]*)/i.exec(context.source)
    : /^<\/([a-z][^\t\r\n\f />]*)/i.exec(context.source)
  const tag = match[1]

  advanceBy(match[0].length)
  advanceSpaces()

  // 解析元素属性
  const props = parseAttributes(context)

  // 如果是自闭和标签则消费 </ 否则 <
  const isSelfClosing = context.source.startsWith('/>')
  advanceBy(isSelfClosing ? 2 : 1)

  return {
    type: 'Element',
    tag,
    props,
    children: [],
    isSelfClosing
  }
}

function parseChildren(context, ancestors) {
  // 存储子节点的容器
  let nodes = []

  // 获取当前模板内容和模式
  const { source, mode } = context

  // 只要满足条件则一直对字符串解析
  while(!isEnd(context, ancestors)) {
    let node

    // 支持插值节点的解析
    if (mode === TextModes.DATA || mode === TextModes.RCDATA) {
      // 标签节点的解析
      if (mode === TextModes.DATA && source[0] === '<') {
        if (source[1] === '!') {
          if (source.startsWith('<!--')) {
            // 注释
            node = parseComment(context)
          } else if (source.startsWith('<![CDATA[')) {
            // CDATA
            node = parseCDATA(context, ancestors)
          }
        } else if (source[1] === '/') {
          // 状态机遇到了闭合标签，此时应该抛出错误，因为缺少与之对应的开始标签
          console.error('Invalid closed tag')
          continue
        } else if (/[a-z]/i.test(source[1])) {
          // 标签
          node = parseElement(context, ancestors)
        }
      } else if (source.startsWith('{{')) {
        // 解析插值
        node = parseInterpolation(context)
      }
    }

    // 如若 node 不存在，则表示非 DATA 和 RCDATA 模式，一切内容作为文本处理
    if (!node) {
      node = parseText(context)
    }

    // 记录节点
    nodes.push(node)
  }

  // 返回子节点
  return nodes
}

function parseElement(context, ancestors) {
  const element = parseTag(context)
  // 如果是自闭和标签，则不会有结束标签和子元素，则可以直接返回
  if (element.isSelfClosing) return element

  ancestors.push(element)
  if (element.tag === 'textarea' || element.tag === 'title') {
    context.mode = TextModes.RCDATA
  } else if (/style|xmp|iframe|noembed|noframes|noscript/.test(element.tag)) {
    context.mode = TextModes.RAWTEXT
  } else {
    context.mode = TextModes.DATA
  }
  element.children = parseChildren(context, ancestors)
  ancestors.pop()
  
  // 表示应该解析结束标签了
  if (context.source.startsWith(`</${element.tag}`)) {
    parseTag(context, 'end')
  } else {
    console.error(`The ${element.tag} tag is missing a closed tag`)
  }

  return element
}

function parseAttributes(context) {
  const { advanceBy, advanceSpaces } = context
  const props = []

  // 如果没有遇到标签截至的符号则一直解析
  while (
    !context.source.startsWith('>') &&
    !context.source.startsWith('/>')
  ) {

    const match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source)
    const name = match[0]

    // 消费属性名
    advanceBy(name.length)
    //消费属性名和等号间的空白
    advanceSpaces()
    // 消费等号
    advanceBy(1)
    // 消费属性值和等号间空白
    advanceSpaces()

    // 属性值
    let value = ''

    const quote = context.source[0]
    // 判断属性值是否是被引号包裹
    const isQuoted = quote === '"' || quote === "'"

    if (isQuoted) {
      advanceBy(1)
      const endQuoteIndex = context.source.indexOf(quote)
      if (endQuoteIndex > -1) {
        // 获取下一个引号前的字符作为属性值
        value = context.source.slice(0, endQuoteIndex)
        // 消费属性值
        advanceBy(value.length)
        // 消费引号
        advanceBy(1)
      } else {
        console.error('Quotation marks are missing')
      }
    } else {
      // 说明属性值没有被引号包括，则获取下一个空白字符前的内容作为属性值
      const match = /^[^\t\r\n\f >]+/.exec(context.source)
      value = match[0]
      // 消费属性值
      advanceBy(value.length)
    }

    // 消费属性值后的空白字符
    advanceSpaces()

    // 使用属性名和属性值创建一个属性节点，并将其记录
    props.push({
      type: 'Attribute',
      name,
      value
    })
  }

  return props
}

function parseText(context) {
  let endIndex = context.source.length
  const ltIndex = context.source.indexOf('<')
  const delimiterIndex = context.source.indexOf('{{')
  
  if (ltIndex > -1 && ltIndex < endIndex) {
    endIndex = ltIndex
  }
  if (delimiterIndex > -1 && delimiterIndex < endIndex) {
    endIndex = delimiterIndex
  }
  
  const content = context.source.slice(0, endIndex)

  context.advanceBy(content.length)

  return {
    type: 'Text',
    content: decodeHtml(content)
  }
}

function parseComment(context) {
  context.advanceBy('<!--'.length)
  closeIndex = context.source.indexOf('-->')
  const content = context.source.slice(0, closeIndex)
  context.advanceBy(content.length)
  context.advanceBy('-->'.length)

  return {
    type: 'Comment',
    content
  }
}

// 解析插值语法
function parseInterpolation(context) {
  context.advanceBy('{{'.length)
  closeIndex = context.source.indexOf('}}')
  const content = context.source.slice(0, closeIndex)
  context.advanceBy(content.length)
  context.advanceBy('}}'.length)

  return {
    type: 'Interpolation',
    content: {
      type: 'Expression',
      content: decodeHtml(content)
    }
  }
}

function decodeHtml(rawText, asAttr = false) {
  let offset = 0
  const end = rawText.length
  let decodedText = ''
  let maxCRNameLength = 0

  function advance(length) {
    offset += length
    rawText = rawText.slice(length)
  }

  while (offset < end) {
    const head = /&(?:#x?)?/i.exec(rawText)
    if (!head) {
      const remaining = end - offset
      decodedText += rawText.slice(0, remaining)
      advance(remaining)
      break
    }
    // Advance to the "&".
    decodedText += rawText.slice(0, head.index)
    advance(head.index)

    if (head[0] === '&') {
      // Named character reference.
      let name = ''
      let value
      if (/[0-9a-z]/i.test(rawText[1])) {
        if (!maxCRNameLength) {
          maxCRNameLength = Object.keys(namedCharacterReferences).reduce(
            (max, name) => Math.max(max, name.length),
            0
          )
        }
        for (let length = maxCRNameLength; !value && length > 0; --length) {
          name = rawText.substr(1, length)
          value = (namedCharacterReferences)[name]
        }
        if (value) {
          const semi = name.endsWith(';')
          if (
            asAttr &&
            !semi &&
            /[=a-z0-9]/i.test(rawText[name.length + 1] || '')
          ) {
            decodedText += '&' + name
            advance(1 + name.length)
          } else {
            decodedText += value
            advance(1 + name.length)
          }
        } else {
          decodedText += '&' + name
          advance(1 + name.length)
        }
      } else {
        decodedText += '&'
        advance(1)
      }
    } else {
      // 判断是十进制表示还是十六进制表示
      const hex = head[0] === '&#x'
      // 根据不同进制表示法，选用不同的正则
      const pattern = hex ? /^&#x([0-9a-f]+);?/i : /^&#([0-9]+);?/
      // 最终，body[1] 的值就是 Unicode 码点
      const body = pattern.exec(rawText)
      
      // 如果匹配成功，则调用 String.fromCodePoint 函数进行解码
      if (body) {
        // 将码点字符串转为十进制数字
        const cp = Number.parseInt(body[1], hex ? 16 : 10)
        // 码点的合法性检查
        if (cp === 0) {
          // 如果码点值为 0x00，替换为 0xfffd
          cp = 0xfffd
        } else if (cp > 0x10ffff) {
          // 如果码点值超过了 Unicode 的最大值，替换为 0xfffd
          cp = 0xfffd
        } else if (cp >= 0xd800 && cp <= 0xdfff) {
          // 如果码点值处于 surrogate pair 范围，替换为 0xfffd
          cp = 0xfffd
        } else if ((cp >= 0xfdd0 && cp <= 0xfdef) || (cp & 0xfffe) === 0xfffe) {
          // 如果码点值处于 `noncharacter` 范围，则什么都不做，交给平台处理
          // noop
        } else if (
          // 控制字符集的范围是：[0x01, 0x1f] 加上 [0x7f, 0x9f]
          // 却掉 ASICC 空白符：0x09(TAB)、0x0A(LF)、0x0C(FF)
          // 0x0D(CR) 虽然也是 ASICC 空白符，但需要包含
          (cp >= 0x01 && cp <= 0x08) ||
          cp === 0x0b ||
          (cp >= 0x0d && cp <= 0x1f) ||
          (cp >= 0x7f && cp <= 0x9f)
        ) {
          // 在 CCR_REPLACEMENTS 表中查找替换码点，如果找不到则使用原码点
          cp = CCR_REPLACEMENTS[cp] || cp
        }
        // 解码后追加到 decodedText 上
        decodedText += String.fromCodePoint(cp)
        // 消费掉整个数字字符引用的内容
        advance(body[0].length)
      } else {
        // 如果没有匹配，则不进行解码操作，只是把 head[0] 追加到 decodedText 并消费掉
        decodedText += head[0]
        advance(head[0].length)
      }
    }
  }
  return decodedText
}

// 解析器函数，接受模板作为参数
function parse(template) {
  const context = {
    source: template,
    // 解析器解析模式，初始为文本模式
    mode: TextModes.DATA,
    // 用来消费指定数量的字符
    advanceBy(num) {
      context.source = context.source.slice(num)
    },
    // 移除标签里的一些空白字符等
    advanceSpaces() {
      const match = /^[\t\r\n\f ]+/.exec(context.source)
      if (match) {
        context.advanceBy(match[0].length)
      }
    }
  }

  const nodes = parseChildren(context, [])

  return {
    type: 'Root',
    children: nodes
  }
}