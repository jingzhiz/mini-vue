function readonly (object) {
  return createReactive(object, false, true)
}

function shallowReadonly (object) {
  return createReactive(object, true, true)
}