function compile(template) {
  // 将模板转换为模板 AST
  const ast = parser(template)

  // 将模板 AST 转换为 JSAST
  transform(ast)

  // 代码生成
  const code = generate(ast.jsNode)

  // 返回生成的代码
  return code
}