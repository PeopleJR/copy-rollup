
//vite插件库  github 官方插件源码  vite awsome社区源码


什么是静态分析：在编译时进行处理，构建模块对象
_dependsOn 是 Rollup 依赖分析的基础，驱动模块对象的创建和优化。
导入/导出模块对象是 依赖关系的具体表现，通过 _dependsOn 关联到其他模块。

_scope（描述当前作用域内变量和引用关系的核心数据结构）
_dependsOn（表示模块 / 代码单元的依赖关系，）

import { foo } from './dep'; 对于这模块引入
在 AST 中创建 ImportDeclaration 节点
将 './dep' 添加到当前模块的 _dependsOn.static
生成导入模块对象（指向 './dep' 模块）
在当前模块的 _scope 中绑定变量 foo，标记为「导入绑定」

由生成的导入，导出模块对象 和 当前模块_dependsOn共同构建模块间的关系



处理入口文件路径（绝对路径，相对路径，还有正则匹配路径等）获取文件-- - 读取文件内容，根据文件内容生成ast树（在new moudle时 会使用acorn的parse方法）， 
在该ast的基础上 根据ast树获取模块，处理模块（在模块解析阶段是并行的，在转换阶段是有序并行的，父模块总是等待其依赖模块处理完成）
以及对 该ast树进行 变量定义，变量修改，以及作用域的收集处理，在 每个ast节点的（_modules, _defines，_modifies 以及 _scope 对象内）保存变量（在对应的标识符内存储相关的依赖项），
同时结合模块处理生成的导入模块对象和导出模块对象，以及_dependsOn 构建模块依赖关系 建立模块间的联系（）  然后就完成了一个  包含模块间关系，以及模块内的变量啊及其作用域关系的 的ast对象 
构建生成完整的ast树 然后 ast树转成源码


处理模块（通过静态分析处理？）：acorn parse 生成ast树 遍历ast树 根据生成的ast树，
使用analays方法分析处理模块（通过静态分析处理？），去处理esm规范下的各个模块的引用方式（是导入模块还是导出模块）然后根据模块的处理方式，去进行模块导入导出语句的处理（调用expandStatement 和 expandAllStatement）

怎么处理模块 和模块构建的处理：
（ast树中有可以区分模块的一个变量（type变量），根据type可以区分模块是啥模块）根据type 构建生成一个导出模块对象和导入模块对象（该对象体现了模块间具体的依赖关系）
根据这个对象进一步 去判断不同模块的不同导入导出语句的，再调用（expandStatement 和 expandAllStatement）对不同模块的不同导入导出语句j进行处理


/*比如内部模块，外部模块处理等（内部模块和外部模块的处理内部又区分对不同导出模式（ 默认导入还是 还是具名导入等其他的导入的处理），以及一些命名冲突，内部导入，外部导入的处理）*/
处理完成后 在结合生成的ast树  进行变量定义，变量修改，以及作用域的收集处理，在 每个ast节点的（_defines，_modifies 以及 _scope 对象内）
保存变量和当前模块的作用域以及作用域链（就是生成一个嵌套对象，对象内部包含上下级作用域的引用 在_scope内），
建立不同模块间的联系（在_dependsOn内）  然后就完成了一个  包含模块间关系，以及模块内的变量啊及其作用域关系的 的ast对象
statement

根据在生成完整后的ast对象 分析标识符，寻找模块依赖项,
	通过ast树中的 _scope（描述当前作用域内变量和引用关系的核心数据结构） 去作用域内找当前标识符的依赖项，
 （当解析到标识符时，遍历他所在的作用域，如果当前作用域内没有，就去父级作用域，一直找到顶层作用域）
 如果是在同一个模块内 则_scope内或其作用域链上能找到相关的属性
如果在当前模块的作用域链内找不到变量，则会结合去_dependsOn内找到对应模块，再去找到对应模块作用域内的属性（_scope和_dependsOn结合处理）








rouUp构建钩子
options 配置初始化阶段，未初始化完成（这个钩子不应该有副作用，只应用于修改选项） -
buildstart -（构建开始阶段（配置已初始化完成），用于清理副作用（清理构建目录，初始化缓存等））
resolveDynamicImport
（处理更复杂的动态导入优先使用，使用优先级高于resolveId）---
resolveID（动态导入和静态导入都可处理）--解析模块 确定模块路径
load（缓存的和非缓存的）--加载模块
transform-- - 转换模块

const fs = require('fs')
const path = require('path')
const MagicString = require('magic-string')
const { parse } = require('acorn')
//掘金参考 roullup构建最初版
https://juejin.cn/post/6898865993289105415

/**
 * rollup 主函数，用于打包模块
 * @param {string} entry - 入口文件路径
 * @param {Object} options - 配置选项
 * @returns {Promise} - 返回包含 generate 和 write 方法的 Promise
 */
function rollup(entry, options = {}) {
	const bundle = new Bundle({ entry, ...options })
	return bundle.build().then(() => {
		return {
			//生成代码
			generate: options => bundle.generate(options),
			//写入文件
			wirte(dest, options = {}) {
				const { code } = bundle.generate({
					dest,
					format: options.format,
				})

				return fs.writeFile(dest, code, err => {
					if (err) throw err
				})
			}
		}
	})
}

/**
 * Bundle 类，负责管理整个打包过程
 */
class Bundle {
	constructor(options = {}) {
		// 防止用户省略 .js 后缀
		this.entryPath = path.resolve(options.entry.replace(/\.js$/, '') + '.js')
		// 获取入口文件的目录
		this.base = path.dirname(this.entryPath)
		// 入口模块
		this.entryModule = null
		// 读取过的模块都缓存在此，如果重复读取则直接从缓存读取模块，提高效率
		this.modules = {}
		// 最后真正要生成的代码的 AST 节点语句，不用生成的 AST 会被省略掉
		this.statements = []
		// 外部模块，当通过路径获取不到的模块就属于外部模块，例如 const fs = require('fs') 中的 fs 模块
		this.externalModules = []
		// import * as test from './foo' 需要用到
		this.internalNamespaceModules = []
	}

	/**
	 * 构建打包流程
	 * @returns {Promise} - 构建完成的 Promise
	 */
	build() {
		return this.fetchModule(this.entryPath)
			.then(entryModule => {
				this.entryModule = entryModule
				return entryModule.expandAllStatements(true)
			})
			.then(statements => {
				this.statements = statements
				this.deconflict()
			})
	}

	/**
	 * 获取模块
	 * @param {string} importee - 被调用模块文件路径
	 * @param {string} importer - 调用模块文件路径
	 * @returns {Promise} - 返回获取到的模块
	 */
	// importee 被调用模块文件
	// importer 调用模块文件
	// 例如在入口文件 main.js 中引入了另一个文件 foo.js 中的函数
	// 此时 main.js 就是 importer，而 foo.js 是 importee
	fetchModule(importee, importer) {
		return new Promise((resolve, reject) => {
			// 如果有缓存，则直接返回
			if (this.modules[importee]) {
				resolve(this.modules[importee])
				return
			}

			let route
			// 入口文件没有 importer
			if (!importer) {
				route = importee
			} else {
				// 绝对路径
				if (path.isAbsolute(importee)) {
					route = importee
				} else if (importee[0] == '.') {
					// 相对路径
					// 获取 importer 的目录，从而找到 importee 的绝对路径
					route = path.resolve(path.dirname(importer), importee.replace(/\.js$/, '') + '.js')
				}
			}

			if (route) {
				fs.readFile(route, 'utf-8', (err, code) => {
					if (err) reject(err)
					const module = new Module({
						code,
						path: route,
						bundle: this,
					})

					this.modules[route] = module
					resolve(module)
				})
			} else {
				// 没有找到路径则是外部模块
				const module = new ExternalModule(importee)
				this.externalModules.push(module)
				this.modules[importee] = module
				resolve(module)
			}
		})
	}

	/**
	 * 生成最终代码
	 * @param {Object} options - 生成选项
	 * @returns {Object} - 包含生成代码的对象
	 */
	generate(options = {}) {
		let magicString = new MagicString.Bundle({ separator: '' })
		// Determine export mode - 'default', 'named', 'none'
		// 导出模式
		let exportMode = this.getExportMode(options.exports)
		let previousMargin = 0

		// Apply new names and add to the output bundle
		this.statements.forEach(statement => {
			let replacements = {}

			keys(statement._dependsOn)
				.concat(keys(statement._defines))
				.forEach(name => {
					const canonicalName = statement._module.getCanonicalName(name)

					if (name !== canonicalName) {
						replacements[name] = canonicalName
					}
				})

			const source = statement._source.clone().trim()

			// modify exports as necessary
			if (/^Export/.test(statement.type)) {
				// 已经引入到一起打包了，所以不需要这些语句了
				// 跳过 `export { foo, bar, baz }` 语句
				if (statement.type === 'ExportNamedDeclaration' && statement.specifiers.length) {
					return
				}

				// 因为已经打包在一起了
				// 如果引入的模块是 export var foo = 42，就移除 export，变成 var foo = 42
				if (statement.type === 'ExportNamedDeclaration' && statement.declaration.type === 'VariableDeclaration') {
					source.remove(statement.start, statement.declaration.start)
				}
				// `export class Foo {...}` 移除 export
				else if (statement.declaration.id) {
					source.remove(statement.start, statement.declaration.start)
				} else if (statement.type === 'ExportDefaultDeclaration') {
					const module = statement._module
					const canonicalName = module.getCanonicalName('default')

					if (statement.declaration.type === 'Identifier' && canonicalName === module.getCanonicalName(statement.declaration.name)) {
						return
					}

					source.overwrite(statement.start, statement.declaration.start, `var ${canonicalName} = `)
				} else {
					throw new Error('Unhandled export')
				}
			}

			// 例如 import { resolve } from path; 将 resolve 变为 path.resolve
			replaceIdentifiers(statement, source, replacements)

			// 生成空行
			// add margin
			const margin = Math.max(statement._margin[0], previousMargin)
			const newLines = new Array(margin).join('\n')

			// add the statement itself
			magicString.addSource({
				content: source,
				separator: newLines
			})

			previousMargin = statement._margin[1]
		})

		// 这个主要是针对 import * as g from './foo' 语句
		// 如果 foo 文件有默认导出的函数和 two() 函数，生成的代码如下
		// var g = {
		// 	 get default () { return g__default },
		// 	 get two () { return two }
		// }
		const indentString = magicString.getIndentString()
		const namespaceBlock = this.internalNamespaceModules.map(module => {
			const exportKeys = keys(module.exports)

			return `var ${module.getCanonicalName('*')} = {\n` +
				exportKeys.map(key => `${indentString}get ${key} () { return ${module.getCanonicalName(key)} }`).join(',\n') +
				`\n}\n\n`
		}).join('')

		magicString.prepend(namespaceBlock)

		magicString = cjs(this, magicString.trim(), exportMode, options)

		return { code: magicString.toString() }
	}

	/**
	 * 获取导出模式
	 * @param {string} exportMode - 指定的导出模式
	 * @returns {string} - 最终的导出模式
	 */
	getExportMode(exportMode) {
		const exportKeys = keys(this.entryModule.exports)

		if (!exportMode || exportMode === 'auto') {
			if (exportKeys.length === 0) {
				// 没有导出模块
				exportMode = 'none'
			} else if (exportKeys.length === 1 && exportKeys[0] === 'default') {
				// 只有一个导出模块，并且是 default
				exportMode = 'default'
			} else {
				exportMode = 'named'
			}
		}

		return exportMode
	}

	/**
	 * 解决命名冲突
	 */
	deconflict() {
		const definers = {}
		const conflicts = {}
		// 解决冲突，例如两个不同的模块有一个同名函数，则需要对其中一个重命名。
		this.statements.forEach(statement => {
			keys(statement._defines).forEach(name => {
				if (has(definers, name)) {
					conflicts[name] = true
				} else {
					definers[name] = []
				}

				definers[name].push(statement._module)
			})
		})

		// 为外部模块分配名称，例如引入了 path 模块的 resolve 方法，使用时直接用 resolve()
		// 打包后会变成 path.resolve
		this.externalModules.forEach(module => {
			const name = module.suggestedNames['*'] || module.suggestedNames.default || module.id

			if (has(definers, name)) {
				conflicts[name] = true
			} else {
				definers[name] = []
			}

			definers[name].push(module)
			module.name = name
		})

		// Rename conflicting identifiers so they can live in the same scope
		keys(conflicts).forEach(name => {
			const modules = definers[name]
			// 最靠近入口模块的模块可以保持原样，即不改名
			modules.pop()
			// 其他冲突的模块要改名
			// 改名就是在冲突的变量前加下划线 _
			modules.forEach(module => {
				const replacement = getSafeName(name)
				module.rename(name, replacement)
			})
		})

		/**
		 * 获取安全的变量名（避免冲突）
		 * @param {string} name - 原始变量名
		 * @returns {string} - 安全的变量名
		 */
		function getSafeName(name) {
			while (has(conflicts, name)) {
				name = `_${name}`
			}

			conflicts[name] = true
			return name
		}
	}
}

// 空数组的 Promise，用于优化性能
const emptyArrayPromise = Promise.resolve([])

/**
 * 模块类，表示一个 JavaScript 模块
 */
class Module {
	constructor({ code, path, bundle }) {
		this.code = new MagicString(code, {
			filename: path
		})

		this.path = path
		this.bundle = bundle
		this.suggestedNames = {}
		this.ast = parse(code, {
			ecmaVersion: 7,
			sourceType: 'module',
		})

		this.analyse()
	}

	/**
	 * 分析模块，处理导入和导出
	 */
	// 分析导入和导出的模块，将引入的模块和导出的模块填入对应的数组
	analyse() {
		this.imports = {}
		this.exports = {}

		this.ast.body.forEach(node => {
			let source

			// import foo from './foo'
			// import { bar } from './bar'
			if (node.type === 'ImportDeclaration') {
				source = node.source.value
				node.specifiers.forEach(specifier => {
					// import foo from './foo'
					const isDefault = specifier.type == 'ImportDefaultSpecifier'
					// import * as foo from './foo'
					const isNamespace = specifier.type == 'ImportNamespaceSpecifier'

					const localName = specifier.local.name
					const name = isDefault ? 'default'
						: isNamespace ? '*' : specifier.imported.name

					this.imports[localName] = {
						source,
						name,
						localName
					}
				})
			} else if (/^Export/.test(node.type)) {
				// export default function foo () {}
				// export default foo
				// export default 42
				if (node.type === 'ExportDefaultDeclaration') {
					const isDeclaration = /Declaration$/.test(node.declaration.type)
					this.exports.default = {
						node,
						name: 'default',
						localName: isDeclaration ? node.declaration.id.name : 'default',
						isDeclaration
					}
				} else if (node.type === 'ExportNamedDeclaration') {
					// export { foo, bar, baz }
					// export var foo = 42
					// export function foo () {}
					// export { foo } from './foo'
					source = node.source && node.source.value

					if (node.specifiers.length) {
						// export { foo, bar, baz }
						node.specifiers.forEach(specifier => {
							const localName = specifier.local.name
							const exportedName = specifier.exported.name

							this.exports[exportedName] = {
								localName,
								exportedName
							}

							// export { foo } from './foo'
							// 这种格式还需要引入相应的模块，例如上述例子要引入 './foo' 模块
							if (source) {
								this.imports[localName] = {
									source,
									localName,
									name: exportedName
								}
							}
						})
					} else {
						const declaration = node.declaration
						let name

						if (declaration.type === 'VariableDeclaration') {
							// export var foo = 42
							name = declaration.declarations[0].id.name
						} else {
							// export function foo () {}
							name = declaration.id.name
						}

						this.exports[name] = {
							node,
							localName: name,
							expression: declaration
						}
					}
				}
			}
		})

		// 调用 ast 目录下的 analyse()
		analyse(this.ast, this.code, this)
		// 当前模块下的顶级变量（包括函数声明）
		this.definedNames = this.ast._scope.names.slice()
		this.canonicalNames = {}
		this.definitions = {}
		this.definitionPromises = {}
		this.modifications = {}

		this.ast.body.forEach(statement => {
			// 读取当前语句下的变量
			Object.keys(statement._defines).forEach(name => {
				this.definitions[name] = statement
			})

			// 再根据 _modifies 修改它们，_modifies 是在 analyse() 中改变的
			Object.keys(statement._modifies).forEach(name => {
				if (!has(this.modifications, name)) {
					this.modifications[name] = []
				}

				this.modifications[name].push(statement)
			})
		})
	}

	/**
	 * 展开所有语句
	 * @param {boolean} isEntryModule - 是否是入口模块
	 * @returns {Promise} - 包含所有语句的 Promise
	 */
	expandAllStatements(isEntryModule) {
		let allStatements = []

		return sequence(this.ast.body, statement => {
			// skip already-included statements
			if (statement._included) return

			// 不需要对导入语句作处理
			if (statement.type === 'ImportDeclaration') {
				return
			}

			// skip `export { foo, bar, baz }`
			if (statement.type === 'ExportNamedDeclaration' && statement.specifiers.length) {
				// but ensure they are defined, if this is the entry module
				// export { foo, bar, baz }
				// 遇到这样的语句，如果是从其他模块引入的函数，则会去对应的模块加载函数，
				if (isEntryModule) {
					return this.expandStatement(statement)
						.then(statements => {
							allStatements.push.apply(allStatements, statements)
						})
				}

				return
			}

			// 剩下的其他类型语句则要添加到 allStatements 中，以待在 bundle.generate() 中生成
			// include everything else
			return this.expandStatement(statement)
				.then(statements => {
					allStatements.push.apply(allStatements, statements)
				})
		}).then(() => {
			return allStatements
		})
	}

	/**
	 * 展开单个语句
	 * @param {Object} statement - AST 语句节点
	 * @returns {Promise} - 包含展开后语句的 Promise
	 */
	expandStatement(statement) {
		if (statement._included) return emptyArrayPromise
		statement._included = true

		let result = []

		// 根据 AST 节点的依赖项找到相应的模块
		// 例如依赖 path 模块，就需要去找到它
		const dependencies = Object.keys(statement._dependsOn)

		return sequence(dependencies, name => {
			// define() 将从其他模块中引入的函数加载进来
			return this.define(name).then(definition => {
				result.push.apply(result, definition)
			})
		})

			// then include the statement itself
			.then(() => {
				result.push(statement)
			})
			.then(() => {
				// then include any statements that could modify the
				// thing(s) this statement defines
				return sequence(keys(statement._defines), name => {
					const modifications = has(this.modifications, name) && this.modifications[name]

					if (modifications) {
						return sequence(modifications, statement => {
							if (!statement._included) {
								return this.expandStatement(statement)
									.then(statements => {
										result.push.apply(result, statements)
									})
							}
						})
					}
				})
			})
			.then(() => {
				// the `result` is an array of statements needed to define `name`
				return result
			})
	}

	/**
	 * 定义变量或函数
	 * @param {string} name - 变量或函数名
	 * @returns {Promise} - 包含定义语句的 Promise
	 */
	define(name) {
		if (has(this.definitionPromises, name)) {
			return emptyArrayPromise
		}

		let promise

		// The definition for this name is in a different module
		if (has(this.imports, name)) {
			const importDeclaration = this.imports[name]

			promise = this.bundle.fetchModule(importDeclaration.source, this.path)
				.then(module => {
					importDeclaration.module = module

					// suggest names. TODO should this apply to non default/* imports?
					if (importDeclaration.name === 'default') {
						// TODO this seems ropey
						const localName = importDeclaration.localName
						const suggestion = has(this.suggestedNames, localName) ? this.suggestedNames[localName] : localName
						module.suggestName('default', suggestion)
					} else if (importDeclaration.name === '*') {
						const localName = importDeclaration.localName
						const suggestion = has(this.suggestedNames, localName) ? this.suggestedNames[localName] : localName
						module.suggestName('*', suggestion)
						module.suggestName('default', `${suggestion}__default`)
					}

					if (module.isExternal) {
						if (importDeclaration.name === 'default') {
							module.needsDefault = true
						} else {
							module.needsNamed = true
						}

						module.importedByBundle.push(importDeclaration)
						return emptyArrayPromise
					}

					if (importDeclaration.name === '*') {
						// we need to create an internal namespace
						if (!this.bundle.internalNamespaceModules.includes(module)) {
							this.bundle.internalNamespaceModules.push(module)
						}

						return module.expandAllStatements()
					}

					const exportDeclaration = module.exports[importDeclaration.name]

					if (!exportDeclaration) {
						throw new Error(`Module ${module.path} does not export ${importDeclaration.name} (imported by ${this.path})`)
					}

					return module.define(exportDeclaration.localName)
				})
		}
		// The definition is in this module
		else if (name === 'default' && this.exports.default.isDeclaration) {
			// We have something like `export default foo` - so we just start again,
			// searching for `foo` instead of default
			promise = this.define(this.exports.default.name)
		} else {
			let statement

			if (name === 'default') {
				// TODO can we use this.definitions[name], as below?
				statement = this.exports.default.node
			} else {
				statement = this.definitions[name]
			}

			if (statement && !statement._included) {
				promise = this.expandStatement(statement)
			}
		}

		this.definitionPromises[name] = promise || emptyArrayPromise
		return this.definitionPromises[name]
	}

	/**
	 * 获取规范化的名称
	 * @param {string} localName - 本地名称
	 * @returns {string} - 规范化后的名称
	 */
	getCanonicalName(localName) {
		if (has(this.suggestedNames, localName)) {
			localName = this.suggestedNames[localName]
		}

		if (!has(this.canonicalNames, localName)) {
			let canonicalName

			if (has(this.imports, localName)) {
				const importDeclaration = this.imports[localName]
				const module = importDeclaration.module

				if (importDeclaration.name === '*') {
					canonicalName = module.suggestedNames['*']
				} else {
					let exporterLocalName

					if (module.isExternal) {
						exporterLocalName = importDeclaration.name
					} else {
						const exportDeclaration = module.exports[importDeclaration.name]
						exporterLocalName = exportDeclaration.localName
					}

					canonicalName = module.getCanonicalName(exporterLocalName)
				}
			} else {
				canonicalName = localName
			}

			this.canonicalNames[localName] = canonicalName
		}

		return this.canonicalNames[localName]
	}

	/**
	 * 重命名变量或函数
	 * @param {string} name - 原名称
	 * @param {string} replacement - 新名称
	 */
	rename(name, replacement) {
		this.canonicalNames[name] = replacement
	}

	/**
	 * 建议名称
	 * @param {string} exportName - 导出名称
	 * @param {string} suggestion - 建议的名称
	 */
	suggestName(exportName, suggestion) {
		if (!this.suggestedNames[exportName]) {
			this.suggestedNames[exportName] = suggestion
		}
	}
}

/**
 * 外部模块类，表示非本地的模块（如 Node.js 核心模块）
 */
class ExternalModule {
	constructor(id) {
		this.id = id
		this.name = null

		this.isExternal = true
		this.importedByBundle = []

		this.canonicalNames = {}
		this.suggestedNames = {}

		this.needsDefault = false
		this.needsNamed = false
	}

	/**
	 * 获取规范化的名称
	 * @param {string} name - 名称
	 * @returns {string} - 规范化后的名称
	 */
	getCanonicalName(name) {
		if (name === 'default') {
			return this.needsNamed ? `${this.name}__default` : this.name
		}

		if (name === '*') {
			return this.name
		}

		// TODO this depends on the output format... works for CJS etc but not ES6
		return `${this.name}.${name}`
	}

	/**
	 * 重命名
	 * @param {string} name - 原名称
	 * @param {string} replacement - 新名称
	 */
	rename(name, replacement) {
		this.canonicalNames[name] = replacement
	}

	/**
	 * 建议名称
	 * @param {string} exportName - 导出名称
	 * @param {string} suggestion - 建议的名称
	 */
	suggestName(exportName, suggestion) {
		if (!this.suggestedNames[exportName]) {
			this.suggestedNames[exportName] = suggestion
		}
	}
}

/**
 * 获取节点的名称
 * @param {Object} x - AST 节点
 * @returns {string} - 节点名称
 */
function getName(x) {
	return x.name
}

// 获取对象的所有键
const keys = Object.keys

// hasOwnProperty 方法的引用
const hasOwnProp = Object.prototype.hasOwnProperty

/**
 * 检查对象是否有指定属性
 * @param {Object} obj - 要检查的对象
 * @param {string} prop - 属性名
 * @returns {boolean} - 是否有该属性
 */
function has(obj, prop) {
	return hasOwnProp.call(obj, prop)
}

/**
 * 顺序执行数组中的每一项
 * @param {Array} arr - 要执行的数组
 * @param {Function} callback - 回调函数
 * @returns {Promise} - 包含结果的 Promise
 */
// 将数组每一项当成参数传给 callback 执行，最后将结果用 promise 返回
function sequence(arr, callback) {
	const len = arr.length
	const results = new Array(len)
	let promise = Promise.resolve()

	function next(i) {
		return promise
			.then(() => callback(arr[i], i))
			.then(result => results[i] = result)
	}

	let i
	for (i = 0; i < len; i += 1) {
		promise = next(i)
	}

	return promise.then(() => results)
}

/**
 * 替换标识符
 * @param {Object} statement - AST 语句节点
 * @param {Object} snippet - 代码片段
 * @param {Object} names - 名称映射
 */
// 重写 node 名称
// 例如 import { resolve } from path; 将 resolve 变为 path.resolve
function replaceIdentifiers(statement, snippet, names) {
	const replacementStack = [names]
	const keys = Object.keys(names)

	if (keys.length === 0) {
		return
	}

	walk(statement, {
		enter(node, parent) {
			const scope = node._scope

			if (scope) {
				let newNames = {}
				let hasReplacements

				keys.forEach(key => {
					if (!scope.names.includes(key)) {
						newNames[key] = names[key]
						hasReplacements = true
					}
				})

				if (!hasReplacements) {
					return this.skip()
				}

				names = newNames
				replacementStack.push(newNames)
			}

			// We want to rewrite identifiers (that aren't property names)
			if (node.type !== 'Identifier') return
			if (parent.type === 'MemberExpression' && node !== parent.object) return
			if (parent.type === 'Property' && node !== parent.value) return

			const name = has(names, node.name) && names[node.name]

			if (name && name !== node.name) {
				snippet.overwrite(node.start, node.end, name)
			}
		},

		leave(node) {
			if (node._scope) {
				replacementStack.pop()
				names = replacementStack[replacementStack.length - 1]
			}
		}
	})
}

/**
 * 生成 CommonJS 格式的代码
 * @param {Object} bundle - Bundle 实例
 * @param {Object} magicString - MagicString 实例
 * @param {string} exportMode - 导出模式
 * @returns {Object} - 处理后的 MagicString 实例
 */
function cjs(bundle, magicString, exportMode) {
	let intro = `'use strict'\n\n`

	const importBlock = bundle.externalModules
		.map(module => {
			let requireStatement = `var ${module.name} = require('${module.id}')`

			if (module.needsDefault) {
				requireStatement += '\n' + (module.needsNamed ? `var ${module.name}__default = ` : `${module.name} = `) +
					`'default' in ${module.name} ? ${module.name}['default'] : ${module.name}`
			}

			return requireStatement
		})
		.join('\n')

	if (importBlock) {
		intro += importBlock + '\n\n'
	}

	magicString.prepend(intro)

	let exportBlock
	if (exportMode === 'default' && bundle.entryModule.exports.default) {
		exportBlock = `module.exports = ${bundle.entryModule.getCanonicalName('default')}`
	} else if (exportMode === 'named') {
		exportBlock = keys(bundle.entryModule.exports)
			.map(key => {
				const specifier = bundle.entryModule.exports[key]
				const name = bundle.entryModule.getCanonicalName(specifier.localName)

				return `exports.${key} = ${name}`
			})
			.join('\n')
	}

	if (exportBlock) {
		magicString.append('\n\n' + exportBlock)
	}

	return magicString
}

// 对 AST 进行分析，按节点层级赋予对应的作用域，并找出有哪些依赖项和对依赖项作了哪些修改
/**
 * 分析 AST，处理作用域和依赖关系
 * @param {Object} ast - 抽象语法树
 * @param {Object} magicString - 用于代码操作的 MagicString 实例
 * @param {Object} module - 当前模块实例
 */
function analyse(ast, magicString, module) {
	let scope = new Scope()
	let currentTopLevelStatement

	/**
	 * 将变量声明添加到当前作用域
	 * @param {Object} declarator - 变量声明节点
	 */
	function addToScope(declarator) {
		var name = declarator.id.name
		scope.add(name, false)

		if (!scope.parent) {
			currentTopLevelStatement._defines[name] = true
		}
	}

	/**
	 * 将变量声明添加到块级作用域
	 * @param {Object} declarator - 变量声明节点
	 */
	function addToBlockScope(declarator) {
		var name = declarator.id.name
		scope.add(name, true)

		if (!scope.parent) {
			currentTopLevelStatement._defines[name] = true
		}
	}

	// 首先需要生成全面的作用域信息
	let previousStatement = null

	// 为每个语句定义作用域，并将父子作用域关联起来
	ast.body.forEach(statement => {
		currentTopLevelStatement = statement // 用于附加作用域信息

		// 为语句添加元数据属性
		Object.defineProperties(statement, {
			_defines: { value: {} },  // 该语句定义的变量
			_modifies: { value: {} },  // 该语句修改的变量
			_dependsOn: { value: {} },  // 该语句依赖的变量
			_included: { value: false, writable: true },  // 是否包含在最终输出中
			_module: { value: module },  // 所属模块
			_source: { value: magicString.snip(statement.start, statement.end) },  // 源代码片段
			_margin: { value: [0, 0] },  // 语句前后的空行数
		})

		// 确定语句间的空行数
		const previousEnd = previousStatement ? previousStatement.end : 0
		const start = statement.start

		const gap = magicString.original.slice(previousEnd, start)
		const margin = gap.split('\n').length

		if (previousStatement) previousStatement._margin[1] = margin
		statement._margin[0] = margin

		// 遍历 AST 节点，构建作用域
		walk(statement, {
			enter(node) {
				let newScope
				switch (node.type) {
					case 'FunctionExpression':
					case 'FunctionDeclaration':
					case 'ArrowFunctionExpression':
						const names = node.params.map(getName)

						if (node.type === 'FunctionDeclaration') {
							addToScope(node)
						} else if (node.type === 'FunctionExpression' && node.id) {
							names.push(node.id.name)
						}

						// 创建新的函数作用域
						newScope = new Scope({
							parent: scope,
							params: names, // TODO: 处理剩余参数?
							block: false
						})

						break

					case 'BlockStatement':
						// 创建新的块级作用域
						newScope = new Scope({
							parent: scope,
							block: true
						})

						break

					case 'CatchClause':
						// 创建 catch 子句的作用域
						newScope = new Scope({
							parent: scope,
							params: [node.param.name],
							block: true
						})

						break

					case 'VariableDeclaration':
						// 处理变量声明，区分 let 和其他声明
						node.declarations.forEach(node.kind === 'let' ? addToBlockScope : addToScope) // TODO: 处理 const?
						break

					case 'ClassDeclaration':
						addToScope(node)
						break
				}

				// 如果创建了新作用域，将其附加到节点上
				if (newScope) {
					Object.defineProperty(node, '_scope', { value: newScope })
					scope = newScope
				}
			},
			leave(node) {
				if (node === currentTopLevelStatement) {
					currentTopLevelStatement = null
				}

				// 离开作用域时恢复父作用域
				if (node._scope) {
					scope = scope.parent
				}
			}
		})

		previousStatement = statement
	})

	// 然后，找出每个语句的顶级依赖项和可能修改的变量
	ast.body.forEach(statement => {
		/**
		 * 检查节点是否读取了变量
		 * @param {Object} node - AST 节点
		 * @param {Object} parent - 父节点
		 */
		function checkForReads(node, parent) {
			// 节点类型为 Identifier，并且不存在 statement 作用域中，说明它是顶级依赖项
			if (node.type === 'Identifier') {
				// 忽略 `foo.bar` 中的 `bar` - 这些作为 Identifier 节点出现
				if (parent.type === 'MemberExpression' && node !== parent.object) {
					return
				}

				// 忽略 { bar: foo } 中的 `bar`
				if (parent.type === 'Property' && node !== parent.value) {
					return
				}

				const definingScope = scope.findDefiningScope(node.name)

				// 如果变量不在当前作用域中定义，且不是由当前语句定义的，则它是一个依赖项
				if ((!definingScope || definingScope.depth === 0) && !statement._defines[node.name]) {
					statement._dependsOn[node.name] = true
				}
			}

		}

		/**
		 * 检查节点是否修改了变量
		 * @param {Object} node - AST 节点
		 */
		function checkForWrites(node) {
			/**
			 * 将节点添加到修改列表
			 * @param {Object} node - AST 节点
			 * @param {boolean} disallowImportReassignments - 是否禁止导入重新赋值
			 */
			function addNode(node, disallowImportReassignments) {
				while (node.type === 'MemberExpression') {
					node = node.object
				}

				if (node.type !== 'Identifier') {
					return
				}

				statement._modifies[node.name] = true
			}

			// 检查赋值表达式 a = 1 + 2 中的 a 是否被修改
			if (node.type === 'AssignmentExpression') {
				addNode(node.left, true)
			}
			// 检查自增/自减表达式 a++/a--
			else if (node.type === 'UpdateExpression') {
				addNode(node.argument, true)
			} else if (node.type === 'CallExpression') {
				// 检查函数调用的参数
				node.arguments.forEach(arg => addNode(arg, false))
			}
		}

		// 遍历语句，检查读取和修改的变量
		walk(statement, {
			enter(node, parent) {
				// 跳过导入语句
				if (/^Import/.test(node.type)) return this.skip()

				if (node._scope) scope = node._scope

				checkForReads(node, parent)
				checkForWrites(node, parent)
			},
			leave(node) {
				if (node._scope) scope = scope.parent
			}
		})
	})

	// 将顶级作用域附加到 AST 上
	ast._scope = scope
}

/**
 * 作用域类，用于管理变量的作用域
 */
class Scope {
	/**
	 * 创建作用域实例
	 * @param {Object} options - 作用域选项
	 * @param {Scope} options.parent - 父作用域
	 * @param {Array} options.params - 参数列表
	 * @param {boolean} options.block - 是否是块级作用域
	 */
	constructor(options = {}) {
		this.parent = options.parent
		this.depth = this.parent ? this.parent.depth + 1 : 0
		this.names = options.params || []
		this.isBlockScope = !!options.block
	}

	/**
	 * 添加变量到作用域
	 * @param {string} name - 变量名
	 * @param {boolean} isBlockDeclaration - 是否是块级声明
	 */
	add(name, isBlockDeclaration) {
		if (!isBlockDeclaration && this.isBlockScope) {
			// 如果是 var 或函数声明，且当前是块级作用域，需要提升到父作用域
			this.parent.add(name, isBlockDeclaration)
		} else {
			this.names.push(name)
		}
	}

	/**
	 * 检查作用域是否包含变量
	 * @param {string} name - 变量名
	 * @returns {boolean} - 是否包含变量
	 */
	contains(name) {
		return !!this.findDefiningScope(name)
	}

	/**
	 * 查找定义变量的作用域
	 * @param {string} name - 变量名
	 * @returns {Scope|null} - 定义变量的作用域，如果未找到则返回 null
	 */
	findDefiningScope(name) {
		if (this.names.includes(name)) {
			return this
		}

		if (this.parent) {
			return this.parent.findDefiningScope(name)
		}

		return null
	}
}

let shouldSkip
let shouldAbort

/**
 * 遍历 AST 节点
 * @param {Object} ast - AST 节点
 * @param {Object} callbacks - 回调函数对象
 * @param {Function} callbacks.enter - 进入节点时的回调
 * @param {Function} callbacks.leave - 离开节点时的回调
 */
function walk(ast, { enter, leave }) {
	shouldAbort = false
	visit(ast, null, enter, leave)
}

// 遍历上下文，提供控制遍历的方法
let context = {
	skip: () => shouldSkip = true,
	abort: () => shouldAbort = true
}

// 缓存节点类型的子节点键
let childKeys = {}

let toString = Object.prototype.toString

/**
 * 检查对象是否为数组
 * @param {*} thing - 要检查的对象
 * @returns {boolean} - 是否为数组
 */
function isArray(thing) {
	return toString.call(thing) === '[object Array]'
}

/**
 * 访问 AST 节点
 * @param {Object} node - 当前节点
 * @param {Object} parent - 父节点
 * @param {Function} enter - 进入节点时的回调
 * @param {Function} leave - 离开节点时的回调
 */
function visit(node, parent, enter, leave) {
	if (!node || shouldAbort) return

	if (enter) {
		shouldSkip = false
		enter.call(context, node, parent)
		if (shouldSkip || shouldAbort) return
	}

	// 获取节点的子节点键
	let keys = childKeys[node.type] || (
		childKeys[node.type] = Object.keys(node).filter(key => typeof node[key] === 'object')
	)

	let key, value, i, j

	// 遍历所有子节点
	i = keys.length
	while (i--) {
		key = keys[i]
		value = node[key]

		if (isArray(value)) {
			j = value.length
			while (j--) {
				visit(value[j], node, enter, leave)
			}
		}

		else if (value && value.type) {
			visit(value, node, enter, leave)
		}
	}

	// 调用离开回调
	if (leave && !shouldAbort) {
		leave(node, parent)
	}
}

module.exports = rollup