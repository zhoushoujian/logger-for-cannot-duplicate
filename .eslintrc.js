module.exports = {
	extends: ['eslint-config-ts-base'],
	parser: "babel-eslint",
	parserOptions: {
		target:
			"es5" /* Specify ECMAScript target version: 'ES3' (default), 'ES5', 'ES2015', 'ES2016', 'ES2017', 'ES2018', 'ES2019', 'ES2020', or 'ESNEXT'. */,
		module:
			"ESNext" /* Specify module code generation: 'none', 'commonjs', 'amd', 'system', 'umd', 'es2015', 'es2020', or 'ESNext'. */,
		ecmaVersion: 6,
		sourceType: "module",
		ecmaFeatures: {
			modules: true,
		},
	},
	rules: {
		"no-mixed-spaces-and-tabs": 0,  //禁止使用 空格 和 tab 混合缩进
		"vars-on-top": 0, //要求将变量声明放在它们作用域的顶部
		"no-var": 0, //要求使用 let 或 const 而不是 var
		"object-shorthand": 0, //要求对象字面量简写语法
    'max-len': 0,
    'no-void': 0
	},
	env: {
		browser: true,
		es6: true
	},
	plugins: ["babel"],
};
