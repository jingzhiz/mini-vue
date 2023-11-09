function generate(node) {
  const context = {
    // 存储最终生成的渲染函数代码
    code: '',
    // 代码拼接
    push(code) {
      context.code += code
    },
    // 当前代码的缩进，一开始没有缩进
    currentIndent: 0,
    // 换行函数
    newline() {
      context.code += '\n' + `  `.repeat(context.currentIndent)
    },
    // 增加缩进函数
    indent() {
      context.currentIndent++
      context.newline()
    },
    // 减少缩进函数
    deIndent() {
      context.currentIndent--
      context.newline()
    }
  }

  // 生成代码
  genNode(node, context)

  return context.code
}

// 根据节点的不同类型调用相应的生成函数
function genNode(node, context) {
  switch (node.type) {
    case 'FunctionDecl':
      genFunctionDecl(node, context)
      break
    case 'ReturnStatement':
      genReturnStatement(node, context)
      break
    case 'CallExpression':
      genCallExpression(node, context)
      break
    case 'StringLiteral':
      genStringLiteral(node, context)
      break
    case 'ArrayExpression':
      genArrayExpression(node, context)
      break
  }
}

// 为节点中每一项生成代码
function genNodeList(nodes, context) {
  const { push } = context
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    genNode(node, context)
    if (i < nodes.length - 1) {
      push(', ')
    }
  }
}

function genFunctionDecl(node, context) {
  // 取出工具函数
  const { push, indent, deIndent } = context

  // 生成函数头代码
  push(`function ${node.id.name} `)
  push(`(`)
  // 函数的参数部分的代码生成
  genNodeList(node.params, context)
  push(`) `)
  push(`{`)
  indent()

  // 生成函数体代码
  node.body.forEach(n => genNode(n, context))

  deIndent()
  push(`}`)
}

function genReturnStatement(node, context) {
  // 取出工具函数
  const { push } = context

  // 生成返回语句
  push(`return `)
  genNode(node.return, context)
}

function genCallExpression(node, context) {
   // 取出工具函数
  const { push } = context
  // 取出被调用函数的名称和参数列表
  const { callee, arguments: args } = node

  // 生成函数调用代码
  push(`${callee.name}(`)
  genNodeList(args, context)
  push(`)`)
}

function genStringLiteral(node, context) {
  // 取出工具函数
  const { push } = context

  // 将文本拼接一下
  push(`'${node.value}'`)
}

function genArrayExpression(node, context) {
  // 取出工具函数
  const { push } = context

  // 为数组元素生成代码
  push('[')
  genNodeList(node.elements, context)
  push(']')
}