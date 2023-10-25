// 一个全局变量用来存储当前激活的副作用函数
let activeEffect = null
// effect 调用栈
const effectStack = []
// WeakMap 常用于存储 key 所引用的对象 value 存在时才有价值的信息
// 当 value 被回收，key 也会被回收
// 而 Map 中，value 被回收后，key 依旧作为 Map 对象的键名被引用，不会被回收
const bucket = new WeakMap()

// 
function cleanup(effectFn) {
  for (let i = 0; i < effectFn.deps.length; i++) {
    const deps = effectFn.deps[i]
    deps.delete(effectFn)
  }
  effectFn.deps.length = 0
}

function effect(fn) {
  const effectFn = () => {
    cleanup(effectFn)
    // effectFn 执行时，将其记录
    activeEffect = effectFn
    effectStack.push(effectFn)
    fn()
    effectStack.pop()
    activeEffect = effectStack.at(-1)
  }

  // deps 用来存储当前所有和该副作用函数相关联的依赖集合
  effectFn.deps = []

  // 执行副作用函数
  effectFn()
}

function reactive(data) {
  return new Proxy(data, {
    get(target, key) {
      // 追踪依赖
      track(target, key)

      return target[key]
    },
    set(target, key, value) {
      target[key] = value

      // 触发更新
      trigger(target, key)
    }
  })
}

function track(target, key) {
  if (!activeEffect) return target[key]

  /* 
    数据结构
      target: {
        key1: Set(effect1, effect2)
        key2: Set(effect3, effect4)
      }
  */

  // 将 target、key 和 effect 形成一种树状结构
  let depsMap = bucket.get(target)
  if (!depsMap) {
    bucket.set(target, (depsMap = new Map()))
  }

  // 将所有的 key 放到 map 中进行管理
  let deps = depsMap.get(key)
  if (!deps) {
    depsMap.set(key, (deps = new Set()))
  }

  // 把当前激活的副作用函数记录，effect 只和 target.key 相联系
  deps.add(activeEffect)

  // 添加当前 key 里关联的 deps
  activeEffect.deps.push(deps)
}

function trigger(target, key) {
  depsMap = bucket.get(target)
  if (!depsMap) return

  const effects = depsMap.get(key)

  // 新建一个 Set, 放置遍历同一个 Set 重复删除和追加
  const effectsToRun = new Set()

  effects && effects.forEach(effectFn => {
    // 如果正在执行的副作用函数与所需要触发的副作用函数相同，就不触发执行，避免无线递归
    if (effectFn !== activeEffect) {
      effectsToRun.add(effectFn)
    }
  })

  effectsToRun.forEach(effectFn => effectFn())
}
