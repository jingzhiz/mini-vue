function ref(value) {
  const wrapper = {
    value
  }

  // 添加一个不可枚举的标志属性
  Object.defineProperty(wrapper, '__v_isRef', {
    value: true
  })

  return reactive(wrapper)
}

// 响应式丢失解决办法
function toRef(reactiveObject, key) {
  const wrapper = {
    get value() {
      return reactiveObject[key]
    },
    set value(val) {
      reactiveObject[key] = val
    }
  }

  Object.defineProperty(wrapper, '__v_isRef', {
    value: true
  })

  return wrapper
}

function toRefs(reactiveObject) {
  const result = {}

  for(const key in reactiveObject) {
    result[key] = toRef(reactiveObject, key)
  }

  return result
}

// 自动脱 ref 实现
function proxyRefs(target) {
  return new Proxy(target, {
    get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver)

      return value.__v_isRef ? value.value : value
    },
    set(target, key, newVal, receiver) {
      const value = target[key]

      if (value.__v_isRef) {
        value.value = newVal
        return true
      }
      return Reflect.set(target, key, newVal, receiver)
    }
  })
}