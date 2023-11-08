// 定义状态机的状态
const State = {
  initial: 1,
  tagOpen: 2,
  tagName: 3,
  text: 4,
  tagEnd: 5,
  tagEndName: 6
}

function isAlpha(char) {
  return /^[A-Za-z]$/.test(char)
}

// 工具函数，用于打印 AST 信息
function dump(node, indent = 0) {
  // 获取节点类型
  const type = node.type
  // 如果是根节点则不做任何描述，如果是标签打印标签名，否则打印文本内容
  const desc = node.type === 'Root'
    ? ''
    : node.type === 'Element'
      ? node.tag
      : node.content

  console.log(`${'-'.repeat(indent)}${type}: ${desc}`)

  // 递归 children
  if (node.children) {
    node.children.forEach(n => dump(n, indent + 2))
  }
}

// 工具函数，用户创建不同类型的节点
function createStringLiteral(value) {
  return {
    type: 'StringLiteral',
    value
  }
}
function createIdentifier(name) {
  return {
    type: 'Identifier',
    name
  }
}
function createArrayExpression(elements) {
  return {
    type: 'ArrayExpression',
    elements
  }
}
function createCallExpression(callee, arguments) {
  return {
    type: 'CallExpression',
    callee: createIdentifier(callee),
    arguments
  }
}


function transformText(node) {
  if (node.type !== 'Text') {
    return
  }

  node.jsNode = createStringLiteral(node.content)
}

// 切割模板字符串为 token 并返回
function tokenize(template) {
  // 记录状态机的状态
  let currentState = State.initial
  // 缓存字符
  const chars = []
  // 接受结果并在最后返回
  const tokens = []

  while(template) {
    const char = template[0]
    switch(currentState) {
      case State.initial:
        if (char === '<') {
          // 将状态切换为开始标签状态
          currentState = State.tagOpen
          // 消费掉字符 <
          template = template.slice(1)
        } else if (isAlpha(char)) {
          // 如果是字母，则切换为文本状态
          currentState = State.text
          // 将字母缓存
          chars.push(char)
          // 消费掉当前字符
          template = template.slice(1)
        }
        break
      case State.tagOpen:
        if (isAlpha(char)) {
          // 标签打开状态时遇到字母，则切换成标签名称状态
          currentState = State.tagName
          // 缓存字母
          chars.push(char)
          // 消费字母
          template = template.slice(1)
        } else if (char === '/') {
          // 如果标签打开状态下遇到的是 / 应该切换到结束标签状态
          currentState = State.tagEnd
          // 消费掉字符 /
          template = template.slice(1)
        }
        break
      case State.tagName:
        if (isAlpha(char)) {
          // 开始标签名状态下遇到字母，表示任然是标签明状态，只需要缓存字符即可
          chars.push(char)
          // 将缓存过的字符消费掉
          template = template.slice(1)
        } else if (char === '>') {
          // 遇到 > 表示一个开始标签处理完毕，重置状态
          currentState = State.initial
          // 创建一个标签 token，并将其记录
          tokens.push({
            type: 'tag',
            name: chars.join('')
          })
          // chars 内容已经被消费，清空缓存值
          chars.length = 0
          // 消费掉当前字符 >
          template = template.slice(1)
        }
        break
      case State.text:
        if (isAlpha(char)) {
          // 文本状态下遇到字母直接记录
          chars.push(char)
          // 直接消费掉字符
          template = template.slice(1)
        } else if (char === '<') {
          // 遇到 < 切换至标签开始状态
          currentState = State.tagOpen
          // 文本这一段内容已经结束，产生一个文本 token，并将其记录
          tokens.push({
            type: 'text',
            content: chars.join('')
          })
          // 清空缓存
          chars.length = 0
          // 消费掉字符 <
          template = template.slice(1)
        }
        break
      case State.tagEnd:
        if (isAlpha(char)) {
          // 结束标签状态下遇到字母，切换至结束标签名状态
          currentState = State.tagEndName
          // 缓存字母
          chars.push(char)
          // 消费字母
          template = template.slice(1)
        }
        break
      case State.tagEndName:
        if (isAlpha(char)) {
          // 结束标签名状态下遇到字母，缓存字母
          chars.push(char)
          // 消费字母
          template = template.slice(1)
        } else if (char === '>') {
          // 遇到 > 表示一个结束标签处理完毕，重置状态
          currentState = State.initial
          // 生成结束标签 token
          tokens.push({
            type: 'tagEnd',
            name: chars.join('')
          })
          // 清空缓存
          chars.length = 0
          // 消费掉字符 >
          template = template.slice(1)
        }
        break
    }
  }
  return tokens
}

// 深度遍历节点
function traverseNode(ast, context = {}) {
  // 当前节点，ast 本身就是 root 节点
  context.currentNode = ast

  // 增加对于回流操作节点的支持
  const exitFns = []

  // 开放对节点的一些访问和操作
  const transforms = context.nodeTransform
  if (transforms) {
    for(let i = 0; i < transforms.length; i++) {
      const onExit = transforms[i](context.currentNode, context)

      if (onExit) {
        exitFns.push(onExit)
      }

      // 当前节点可能被移除，所以如果当前节点被移除了，不需要进行后续操作
      if (!context.currentNode) return
    }
  }

  const children = context.currentNode.children
  if (children) {
    for (let i = 0; i < children.length; i++) {
      // 递归前记录当前节点作为父节点
      context.parent = context.currentNode
      // 记录当前被遍历 children 的索引
      context.childIndex = i
      traverseNode(children[i], context)
    }
  }

  // 当所有节点正序处理完毕后，允许增加反序的处理
  let i = exitFns.length
  while(i--) {
    exitFns[i]()
  }

  return ast
}

function parser(template) {
  // 对模板进行拆分
  const tokens = tokenize(template)

  // 创建根节点
  const root = {
    type: 'Root',
    children: []
  }

  // 创建一个元素栈，初始时只有根节点
  const elementStack = [root]

  // 开始扫描 tokens
  while (tokens.length) {
    // 将栈顶的节点作为根节点
    const parent = elementStack[elementStack.length - 1]
    // 取出当前扫描的 token
    const t = tokens[0]

    switch (t.type) {
      // 如果是开始标签，则创建 Element 类型的 AST 节点
      case 'tag':
        const elementNode = {
          type: 'Element',
          tag: t.name,
          children: []
        }
        // 添加到父级节点 children 中
        parent.children.push(elementNode)
        // 压入栈顶
        elementStack.push(elementNode)
        break
      case 'text':
        // 如果是文本，创建文本 AST
        const textNode = {
          type: 'Text',
          content: t.content
        }
        // 被父节点 children 记录
        parent.children.push(textNode)
        break
      case 'tagEnd':
        // 结束标签则将栈顶节点弹出
        elementStack.pop()
        break
    }

    // 消费已经被扫描过的 token
    tokens.shift()
  }

  // 返回最终的 AST
  return root
}

// 节点转换测试函数
// function transformElement(node) {
//   if (node.type === 'Element' && node.tag === 'p') {
//     console.log('transformElement enter')
//     node.tag = 'h2'
    
//     // 返回一个函数，当退出节点时将进行回调
//     return () => {
//       // 代码运行至这里时，节点的处理是已经完成了的
//       console.log('transformElement back')
//     }
//   }

// }
// function transformText(node, context) {
//   if (node.type === 'Text') {
//     // context.replaceNode({
//     //   type: 'Element',
//     //   tag: 'span',
//     // })
//     context.removeNode()
//   }
// }

// 文本节点转换器
function transformText(node) {
  // 如果不是文本则什么都不做
  if (node.type !== 'Text') {
    return
  }

  // 创建一个对应 js 文本的节点
  node.jsNode = createStringLiteral(node.content)
}

// 标签节点转换器
function transformElement(node) {
  // 返回一个函数，则可以在退出阶段进行回调
  return () => {
    // 如果不是标签则什么都不做
    if (node.type !== 'Element') {
      return
    }

    // 创建 h 函数的调用语句，以节点的标签作为第一个参数
    const callExp = createCallExpression('h', [
      createStringLiteral(node.tag)
    ])
    node.children.length === 1
      // 如果只有一个节点，则直接使用子节点的 jsNode 作为参数
      ? callExp.arguments.push(node.children[0].jsNode)
      // 否则用数据包裹获取所有子节点的 jsNode
      : callExp.arguments.push(
        createArrayExpression(node.children.map(c => c.jsNode))
      )

    // 将当前节点的 js AST 添加到 jsNode
    node.jsNode = callExp
  }
}

// root 节点转换器
function transformRoot(node) {
  // 将逻辑放在推出阶段的回调函数中，保证所有子节点都能够处理完成
  return () => {
    // 如果不是根节点则直接返回
    if (node.type !== 'Root') {
      return
    }

    // 根节点的第一个子节点就是模板的根节点
    const vnodeJSAST = node.children[0].jsNode

    // 创建 render 函数的申明语句节点，将 vnodeJSAST 作为 render 函数的返回语句
    node.jsNode = {
      type: 'FunctionDecl',
      id: { type: 'Identifier', name: 'render' },
      params: [],
      body: [
        {
          type: 'ReturnStatement',
          return: vnodeJSAST
        }
      ]
    }
  }
}

function transform(ast) {
  // 集成一系列对节点访问和操作的上下文
  const context = {
    currentNode: null,
    childIndex: 0,
    parent: null,
    // 用于替换当前节点
    replaceNode(node) {
      // 替换当前节点
      context.parent.children[context.childIndex] = node
      // 将 currentNode 更新为新节点
      context.currentNode = node
    },
    // 用于删除当前节点
    removeNode() {
      // 删除当前节点
      context.parent.children.splice(context.childIndex, 1)
      // 将 currentNode 更新为 null
      context.currentNode = null
    },
    nodeTransform: [
      transformRoot,
      transformElement,
      transformText
    ]
  }

  traverseNode(ast, context)

  dump(ast)
}

function generate(node) {
  return node
}

function compile(template) {
  const ast = parser(template)

  transform(ast)

  const code = generate(ast.jsNode)

  return code
}