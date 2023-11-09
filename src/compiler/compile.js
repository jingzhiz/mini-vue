function compile(template) {
  // 将模板转换为模板 AST
  // const ast = parser(template)
  const ast = parse(template)

  // 将模板 AST 转换为 JSAST
  transform(ast)

  // 代码生成
  const code = generate(ast.jsNode)

  // 返回生成的代码，通过 eval 变成真正的函数
  return eval("(false || "+code+")");
}