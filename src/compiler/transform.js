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